import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BitacoraService } from '../../core/services/bitacora.service';
import { EntradaBitacora, AccionBitacora } from '../../core/models/bitacora.model';

@Component({
  selector: 'app-historial-general',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="hg-wrapper animate-fade-in">
      <!-- Header -->
      <div class="hg-header">
        <div>
          <h1 class="hg-title">📋 Historial General</h1>
          <p class="hg-subtitle">Registro completo de todas las acciones del sistema · {{ totalEntradas() }} entradas</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="hg-filters">
        <div class="filter-group">
          <label class="filter-label">🔍 Buscar</label>
          <input
            class="filter-input"
            type="text"
            placeholder="Usuario, módulo o descripción..."
            [ngModel]="filtroTexto()"
            (ngModelChange)="filtroTexto.set($event); paginaActual.set(1)"
          />
        </div>
        <div class="filter-group">
          <label class="filter-label">🎯 Acción</label>
          <select
            class="filter-input"
            [ngModel]="filtroAccion()"
            (ngModelChange)="filtroAccion.set($event); paginaActual.set(1)"
          >
            <option value="">Todas</option>
            <option value="Crear">Crear</option>
            <option value="Editar">Editar</option>
            <option value="Eliminar">Eliminar</option>
            <option value="Ver">Ver</option>
            <option value="Subir">Subir</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">🏢 Módulo</label>
          <select
            class="filter-input"
            [ngModel]="filtroModulo()"
            (ngModelChange)="filtroModulo.set($event); paginaActual.set(1)"
          >
            <option value="">Todos</option>
            @for (mod of modulos; track mod) {
              <option [value]="mod">{{ mod }}</option>
            }
          </select>
        </div>
        <button class="btn-limpiar" (click)="limpiarFiltros()">✕ Limpiar</button>
      </div>

      <!-- Tabla -->
      <div class="hg-table-wrap">
        <table class="hg-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Acción</th>
              <th>Módulo</th>
              <th>Descripción</th>
              <th>Obra</th>
            </tr>
          </thead>
          <tbody>
            @for (e of entradasPagina(); track e.id) {
              <tr class="hg-row">
                <td class="hg-fecha">{{ fmtFecha(e.fecha) }}</td>
                <td class="hg-usuario">
                  <span class="avatar-mini">{{ e.usuario.split(' ').map(p => p[0]).join('').slice(0,2) }}</span>
                  {{ e.usuario }}
                </td>
                <td><span class="badge-rol" [attr.data-rol]="e.rol">{{ e.rol }}</span></td>
                <td><span class="badge-accion" [attr.data-accion]="e.accion">{{ e.accion }}</span></td>
                <td class="hg-modulo">{{ e.modulo }}</td>
                <td class="hg-desc">{{ e.descripcion }}</td>
                <td class="hg-obra">{{ e.obraNombre ?? '—' }}</td>
              </tr>
            }
            @if (entradasPagina().length === 0) {
              <tr>
                <td colspan="7" class="hg-empty">🔍 No se encontraron registros con los filtros actuales</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      @if (totalPaginas() > 1) {
        <div class="hg-pagination">
          <button class="pag-btn" [disabled]="paginaActual() === 1" (click)="paginaActual.set(paginaActual() - 1)">‹ Anterior</button>
          <span class="pag-info">Página {{ paginaActual() }} de {{ totalPaginas() }}</span>
          <button class="pag-btn" [disabled]="paginaActual() === totalPaginas()" (click)="paginaActual.set(paginaActual() + 1)">Siguiente ›</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .hg-wrapper { display: flex; flex-direction: column; gap: 20px; }
    .hg-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .hg-title { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; }
    .hg-subtitle { font-size: 0.82rem; color: var(--text-muted); }

    .hg-filters {
      display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap;
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 16px 20px;
    }
    .filter-group { display: flex; flex-direction: column; gap: 6px; }
    .filter-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; letter-spacing: 0.04em; }
    .filter-input {
      background: var(--bg-dark); border: 1px solid var(--border);
      color: var(--text-primary); border-radius: 8px;
      padding: 8px 12px; font-size: 0.85rem; min-width: 180px;
      font-family: 'Inter', sans-serif; transition: border-color 0.2s;
    }
    .filter-input:focus { outline: none; border-color: var(--accent); }
    .btn-limpiar {
      background: transparent; border: 1px solid var(--border);
      color: var(--text-muted); border-radius: 8px; padding: 8px 14px;
      font-size: 0.82rem; cursor: pointer; transition: all 0.2s; align-self: flex-end;
    }
    .btn-limpiar:hover { border-color: var(--danger); color: var(--danger); }

    .hg-table-wrap {
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); overflow: hidden;
    }
    .hg-table { width: 100%; border-collapse: collapse; }
    .hg-table thead tr { background: rgba(0,0,0,0.25); }
    .hg-table th {
      text-align: left; padding: 13px 16px;
      font-size: 0.75rem; font-weight: 700; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
    }
    .hg-row { border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; }
    .hg-row:hover { background: rgba(255,255,255,0.03); }
    .hg-row td { padding: 12px 16px; font-size: 0.83rem; color: var(--text-secondary); vertical-align: middle; }
    .hg-fecha { color: var(--text-muted) !important; font-size: 0.78rem !important; white-space: nowrap; }
    .hg-usuario { display: flex; align-items: center; gap: 8px; color: var(--text-primary) !important; font-weight: 500; }
    .hg-desc { max-width: 260px; }
    .hg-obra { color: var(--accent) !important; font-size: 0.78rem !important; max-width: 180px; }
    .hg-modulo { font-weight: 600; color: var(--text-primary) !important; }
    .hg-empty { text-align: center; padding: 40px; color: var(--text-muted); }

    .avatar-mini {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 50%;
      background: rgba(232,160,32,0.2); color: var(--accent);
      font-size: 0.68rem; font-weight: 700; flex-shrink: 0;
    }
    .badge-rol {
      padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; text-transform: capitalize;
    }
    .badge-rol[data-rol="admin"]     { background: rgba(99,102,241,0.15); color: #818CF8; }
    .badge-rol[data-rol="residente"] { background: rgba(45,212,191,0.12); color: #2DD4BF; }
    .badge-rol[data-rol="lector"]    { background: rgba(148,163,184,0.12); color: #94A3B8; }

    .badge-accion {
      padding: 3px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;
    }
    .badge-accion[data-accion="Crear"]    { background: rgba(45,212,191,0.15);  color: #2DD4BF; }
    .badge-accion[data-accion="Editar"]   { background: rgba(232,160,32,0.15);  color: #E8A020; }
    .badge-accion[data-accion="Eliminar"] { background: rgba(239,68,68,0.15);   color: #EF4444; }
    .badge-accion[data-accion="Ver"]      { background: rgba(59,130,246,0.15);  color: #60A5FA; }
    .badge-accion[data-accion="Subir"]    { background: rgba(99,102,241,0.15);  color: #818CF8; }

    .hg-pagination {
      display: flex; align-items: center; justify-content: center; gap: 16px;
      padding: 12px 0;
    }
    .pag-btn {
      background: var(--bg-surface); border: 1px solid var(--border);
      color: var(--text-primary); border-radius: 8px;
      padding: 7px 16px; font-size: 0.83rem; cursor: pointer; transition: all 0.2s;
    }
    .pag-btn:hover:not([disabled]) { border-color: var(--accent); color: var(--accent); }
    .pag-btn[disabled] { opacity: 0.35; cursor: not-allowed; }
    .pag-info { font-size: 0.83rem; color: var(--text-muted); }
  `]
})
export class HistorialGeneralComponent implements OnInit {
  private bitacoraService = inject(BitacoraService);

  filtroTexto  = signal('');
  filtroAccion = signal('');
  filtroModulo = signal('');
  paginaActual = signal(1);
  cargando     = signal(true);
  porPagina    = 10;

  modulos = ['Dashboard', 'Expediente', 'Obras', 'Mapa', 'Admin'];

  private _todas = signal<EntradaBitacora[]>([]);

  ngOnInit() {
    this.bitacoraService.getHistorialGeneral().subscribe({
      next: (data) => { this._todas.set(data); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  entradasFiltradas = computed(() => {
    const txt = this.filtroTexto().toLowerCase().trim();
    const acc = this.filtroAccion() as AccionBitacora | '';
    const mod = this.filtroModulo();
    return this._todas().filter(e =>
      (!txt || e.usuario.toLowerCase().includes(txt) || e.descripcion.toLowerCase().includes(txt) || e.modulo.toLowerCase().includes(txt)) &&
      (!acc || e.accion === acc) &&
      (!mod || e.modulo === mod)
    );
  });

  totalEntradas  = computed(() => this.entradasFiltradas().length);
  totalPaginas   = computed(() => Math.max(1, Math.ceil(this.totalEntradas() / this.porPagina)));
  entradasPagina = computed(() => {
    const ini = (this.paginaActual() - 1) * this.porPagina;
    return this.entradasFiltradas().slice(ini, ini + this.porPagina);
  });

  limpiarFiltros() {
    this.filtroTexto.set('');
    this.filtroAccion.set('');
    this.filtroModulo.set('');
    this.paginaActual.set(1);
  }

  fmtFecha(d: Date): string {
    return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
