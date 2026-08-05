import { Component, AfterViewInit, ElementRef, ViewChild, OnInit, OnDestroy, inject, signal, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObrasService } from '../../core/services/obras.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ObraResponse, ESTATUS_LABEL, ESTATUS_COLOR } from '../../core/models/obra.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, SlicePipe, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('pieAvanceChart') pieAvanceRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChart') donutRef!: ElementRef<HTMLCanvasElement>;
  private pieAvanceChart?: Chart;
  private donutChart?: Chart;

  obras = signal<ObraResponse[]>([]);
  avancePromedio = signal(0);
  conteo = signal({ activas: 0, completadas: 0, bloqueadas: 0, pausadas: 0, enProceso: 0 });
  cargando = signal(true);
  hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  svc = inject(ObrasService);
  auth = inject(AuthService);
  platformId = inject(PLATFORM_ID);
  toastSvc = inject(ToastService);

  mostrarModalNuevaObra = signal(false);

  ngOnInit() {
    this.svc.getObras({ size: 100 }).subscribe({
      next: (page) => {
        const list = page.content;
        this.obras.set(list);
        // Calcular avance promedio (usando ultimo-porcentaje endpoint no disponible en lista,
        // usamos estimación basada en estatus)
        const completadas = list.filter(o => o.estatus === 'COMPLETADA').length;
        this.avancePromedio.set(list.length ? Math.round((completadas / list.length) * 100) : 0);
        this.conteo.set({
          activas:     list.filter(o => o.estatus === 'EN_PROCESO').length,
          completadas: list.filter(o => o.estatus === 'COMPLETADA').length,
          bloqueadas:  list.filter(o => this.svc.isBlocked(o)).length,
          pausadas:    list.filter(o => o.estatus === 'INACTIVA').length,
          enProceso:   list.filter(o => o.estatus === 'PLANIFICADA').length,
        });
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  getNombre(): string {
    const nombre = this.auth.usuario()?.username ?? '';
    const parts = nombre.split(' ');
    return parts[1] ?? parts[0] ?? 'Usuario';
  }

  getStatusClass(obra: ObraResponse): string {
    return ESTATUS_COLOR[obra.estatus] ?? 'badge-pendiente';
  }

  getStatusLabel(obra: ObraResponse): string {
    return ESTATUS_LABEL[obra.estatus] ?? obra.estatus;
  }

  getProgressColor(p: number): string {
    return p >= 80 ? 'var(--success)' : p >= 50 ? 'var(--accent)' : 'var(--danger)';
  }

  getProgressGradient(avance: number): string {
    const p = this.getProgressColor(avance);
    return `linear-gradient(90deg, ${p}88, ${p})`;
  }

  getFotoUnica(obra: ObraResponse, fase: string): string | null {
    return null;
  }

  crearObra(e: Event) {
    e.preventDefault();
    this.toastSvc.show('Usa el formulario en Expedientes para crear una obra.', 'info');
    this.mostrarModalNuevaObra.set(false);
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.initPieAvanceChart();
        this.initDonutChart();
      }, 50);
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      this.pieAvanceChart?.destroy();
      this.donutChart?.destroy();
    }
  }

  private initPieAvanceChart() {
    const PALETTE = [
      'rgba(45,212,191,0.85)',
      'rgba(59,130,246,0.85)',
      'rgba(232,160,32,0.85)',
      'rgba(239,68,68,0.85)',
      'rgba(99,102,241,0.85)',
      'rgba(236,72,153,0.85)',
    ];
    const obras = this.obras();
    this.pieAvanceChart = new Chart(this.pieAvanceRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: obras.map(o => o.nombre.length > 20 ? o.nombre.slice(0, 20) + '…' : o.nombre),
        datasets: [{
          label: 'Avance (%)',
          data: obras.map(() => Math.floor(Math.random() * 100)),  // placeholder hasta tener endpoint avances
          backgroundColor: obras.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 2,
          borderColor: 'rgba(0,0,0,0.25)',
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94A3B8', padding: 14, font: { size: 11 }, boxWidth: 12, boxHeight: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw}% de avance`
            }
          }
        }
      }
    });
  }

  private initDonutChart() {
    const c = this.conteo();
    this.donutChart = new Chart(this.donutRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['En Proceso', 'Completadas', 'Bloqueadas', 'Inactivas', 'Planificadas'],
        datasets: [{
          data: [ c.activas, c.completadas, c.bloqueadas, c.pausadas, c.enProceso ],
          backgroundColor: [
            'rgba(45,212,191,0.8)',
            'rgba(59,130,246,0.8)',
            'rgba(239,68,68,0.8)',
            'rgba(245,158,11,0.8)',
            'rgba(99,102,241,0.8)'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, cutout: '70%',
        plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8', padding: 12, font: { size: 12 } } } }
      }
    });
  }

  tieneFotos(_obra: ObraResponse, _fase: string): boolean { return false; }
}
