import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLogService } from '../../core/services/audit-log.service';
import { AuditLog } from '../../core/models/audit-log.model';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="al-wrapper animate-fade-in">
      <!-- Header -->
      <div class="al-header">
        <div>
          <h1 class="al-title" style="display: flex; align-items: center; gap: 8px;">
            <app-icon name="history" [size]="24" color="var(--accent)"></app-icon> Logs de Auditoría
          </h1>
          <p class="al-subtitle">Registro detallado de todas las acciones del sistema · {{ totalElementos() }} registros</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="al-filters">
        <div class="filter-group">
          <label class="filter-label" style="display: flex; align-items: center; gap: 4px;">
            <app-icon name="user" [size]="14"></app-icon> Usuario
          </label>
          <input
            class="filter-input"
            type="text"
            placeholder="Filtrar por usuario..."
            [(ngModel)]="filtroUsuario"
            (ngModelChange)="onFiltroChange()"
          />
        </div>
        <div class="filter-group">
          <label class="filter-label" style="display: flex; align-items: center; gap: 4px;">
            <app-icon name="file-text" [size]="14"></app-icon> Registros por página
          </label>
          <select class="filter-input" [(ngModel)]="tamanioPagina" (ngModelChange)="cargar(0)">
            <option [value]="10">10</option>
            <option [value]="20">20</option>
            <option [value]="50">50</option>
          </select>
        </div>
        <button class="btn-limpiar" (click)="limpiarFiltros()">✕ Limpiar</button>
      </div>

      <!-- Tabla -->
      <div class="al-table-wrap">
        @if (cargando()) {
          <div class="al-loading">
            <div class="spinner"></div>
            <span>Cargando registros...</span>
          </div>
        } @else {
          <table class="al-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Módulo</th>
                <th>Descripción</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              @for (log of logs(); track log.id) {
                <tr class="al-row">
                  <td class="al-fecha">{{ fmtFecha(log.timestamp) }}</td>
                  <td class="al-usuario">
                    <span class="avatar-mini">{{ log.username.charAt(0).toUpperCase() }}</span>
                    {{ log.username }}
                  </td>
                  <td>
                    <span class="badge-accion" [attr.data-tipo]="getAccionTipo(log.action)">
                      {{ log.action }}
                    </span>
                  </td>
                  <td class="al-modulo">{{ log.module }}</td>
                  <td class="al-desc">{{ log.description || '—' }}</td>
                  <td class="al-ip">{{ log.ip || '—' }}</td>
                </tr>
              }
              @if (logs().length === 0) {
                <tr>
                  <td colspan="6" class="al-empty">
                    <app-icon name="search" [size]="16" style="margin-right: 6px;"></app-icon>
                    No se encontraron registros de auditoría
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Paginación -->
      @if (totalPaginas() > 1) {
        <div class="al-pagination">
          <button class="pag-btn" [disabled]="paginaActual() === 0" (click)="cargar(paginaActual() - 1)">‹ Anterior</button>
          <span class="pag-info">Página {{ paginaActual() + 1 }} de {{ totalPaginas() }}</span>
          <button class="pag-btn" [disabled]="paginaActual() === totalPaginas() - 1" (click)="cargar(paginaActual() + 1)">Siguiente ›</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .al-wrapper { display: flex; flex-direction: column; gap: 20px; }
    .al-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .al-title { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; }
    .al-subtitle { font-size: 0.82rem; color: var(--text-muted); }

    .al-filters {
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

    .al-table-wrap {
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); overflow: hidden; min-height: 200px;
    }
    .al-loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 60px 20px; gap: 14px; color: var(--text-muted); font-size: 0.9rem;
    }
    .spinner {
      width: 32px; height: 32px; border: 3px solid var(--border);
      border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .al-table { width: 100%; border-collapse: collapse; }
    .al-table thead tr { background: rgba(0,0,0,0.25); }
    .al-table th {
      text-align: left; padding: 13px 16px;
      font-size: 0.75rem; font-weight: 700; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
    }
    .al-row { border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; }
    .al-row:hover { background: rgba(255,255,255,0.03); }
    .al-row td { padding: 12px 16px; font-size: 0.83rem; color: var(--text-secondary); vertical-align: middle; }
    .al-fecha { color: var(--text-muted) !important; font-size: 0.78rem !important; white-space: nowrap; }
    .al-usuario { display: flex; align-items: center; gap: 8px; color: var(--text-primary) !important; font-weight: 500; }
    .al-modulo { font-weight: 600; color: var(--text-primary) !important; }
    .al-desc { color: var(--text-secondary) !important; max-width: 380px; }
    .al-ip { font-family: monospace; font-size: 0.78rem !important; color: var(--text-muted) !important; }
    .al-empty { text-align: center; padding: 40px; color: var(--text-muted); }

    .avatar-mini {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 50%;
      background: rgba(99,102,241,0.2); color: #818CF8;
      font-size: 0.68rem; font-weight: 700; flex-shrink: 0;
    }
    .badge-accion {
      padding: 3px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;
      background: rgba(59,130,246,0.15); color: #60A5FA;
    }
    .badge-accion[data-tipo="CREATE"]  { background: rgba(45,212,191,0.15);  color: #2DD4BF; }
    .badge-accion[data-tipo="UPDATE"]  { background: rgba(232,160,32,0.15);  color: #E8A020; }
    .badge-accion[data-tipo="DELETE"]  { background: rgba(239,68,68,0.15);   color: #EF4444; }

    .al-pagination {
      display: flex; align-items: center; justify-content: center; gap: 16px; padding: 12px 0;
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
export class AuditLogsComponent implements OnInit {
  private auditSvc = inject(AuditLogService);

  logs           = signal<AuditLog[]>([]);
  cargando       = signal(true);
  paginaActual   = signal(0);
  totalPaginas   = signal(1);
  totalElementos = signal(0);
  tamanioPagina  = 20;
  filtroUsuario  = '';
  private debounceTimer: any;

  ngOnInit() {
    this.cargar(0);
  }

  cargar(page: number) {
    this.cargando.set(true);
    this.auditSvc.getLogs({ username: this.filtroUsuario || undefined, page, size: this.tamanioPagina }).subscribe({
      next: (res) => {
        this.logs.set(res.content);
        this.paginaActual.set(res.number);
        this.totalPaginas.set(res.totalPages);
        this.totalElementos.set(res.totalElements);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  getAccionTipo(action: string): string {
    const a = (action || '').toUpperCase();
    if (a.includes('ELIMINACION') || a === 'DELETE') return 'DELETE';
    if (a.includes('CREACION') || a === 'CREATE' || a === 'REGISTRO_AVANCE') return 'CREATE';
    return 'UPDATE';
  }

  onFiltroChange() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.cargar(0), 400);
  }

  limpiarFiltros() {
    this.filtroUsuario = '';
    this.cargar(0);
  }

  fmtFecha(ts: string): string {
    return new Date(ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
