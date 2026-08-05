import { Component, AfterViewInit, ElementRef, ViewChild, OnDestroy, inject, signal, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObrasService } from '../../core/services/obras.service';
import { AuthService } from '../../core/services/auth.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { ToastService } from '../../core/services/toast.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, SlicePipe, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('pieAvanceChart') pieAvanceRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChart') donutRef!: ElementRef<HTMLCanvasElement>;
  private pieAvanceChart?: Chart;
  private donutChart?: Chart;

  obras: any[];
  avancePromedio!: number;
  conteo: any;
  hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  svc = inject(ObrasService);
  auth = inject(AuthService);
  usuariosSvc = inject(UsuariosService);
  platformId = inject(PLATFORM_ID);
  toastSvc = inject(ToastService);

  mostrarModalNuevaObra = signal(false);
  responsableSeleccionado = signal('');
  responsables = this.usuariosSvc.getResponsables();

  constructor() {
    this.obras = this.svc.getObras();
    this.avancePromedio = this.svc.getAvancePromedio();
    this.conteo = this.svc.getConteoByStatus();
  }

  getNombre(): string {
    const nombre = this.auth.usuario()?.username ?? '';
    const parts = nombre.split(' ');
    return parts[1] ?? parts[0] ?? 'Usuario';
  }

  crearObra(e: Event) {
    e.preventDefault();
    this.toastSvc.show('Obra guardada correctamente (Simulado)', 'success');
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
    this.pieAvanceChart = new Chart(this.pieAvanceRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.obras.map(o => o.nombre.length > 20 ? o.nombre.slice(0, 20) + '…' : o.nombre),
        datasets: [{
          label: 'Avance (%)',
          data: this.obras.map(o => o.avance),
          backgroundColor: this.obras.map((_, i) => PALETTE[i % PALETTE.length]),
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
    this.donutChart = new Chart(this.donutRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Activas', 'Completadas', 'Bloqueadas', 'Pausadas', 'En Proceso'],
        datasets: [{
          data: [
            this.conteo.activas,
            this.conteo.completadas,
            this.conteo.bloqueadas,
            this.conteo.pausadas,
            this.conteo.enProceso
          ],
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

  getStatusClass(obra: any): string {
    return `badge-${obra.status}`;
  }
  getStatusLabel(obra: any): string {
    return {
      activa: '🟢 Activa',
      completada: '🔵 Completada',
      bloqueada: '🔴 Bloqueada',
      pendiente: '⚪ Pendiente',
      pausada: '🟠 Pausada',
      en_proceso: '⚙️ En Proceso'
    }[obra.status as string] ?? obra.status;
  }
  getProgressColor(p: number): string {
    return p >= 80 ? 'var(--success)' : p >= 50 ? 'var(--accent)' : 'var(--danger)';
  }
  getProgressGradient(avance: number): string {
    const p = this.getProgressColor(avance);
    return `linear-gradient(90deg, ${p}88, ${p})`;
  }

  tieneFotos(obra: any, fase: string): boolean {
    if (!obra || !obra.archivos) return false;
    return obra.archivos.some((a: any) => a.fase === fase && a.tipo === 'imagen');
  }

  getFotoUnica(obra: any, fase: string): string | null {
    if (!obra || !obra.archivos) return null;
    const foto = obra.archivos.find((a: any) => a.fase === fase && a.tipo === 'imagen');
    return foto ? foto.url : null;
  }
}
