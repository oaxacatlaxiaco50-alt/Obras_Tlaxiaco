import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AuditLogService } from '../../core/services/audit-log.service';
import { AuditLog } from '../../core/models/audit-log.model';
import { AuditLogsComponent } from '../audit/audit-logs.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

export type PeriodoFiltro = 'dia' | 'semana' | 'mes' | 'todo';

@Component({
  selector: 'app-bitacora-cambios',
  standalone: true,
  imports: [CommonModule, FormsModule, AuditLogsComponent, IconComponent],
  template: `
    @if (auth.hasRole('admin')) {
      <div class="bc-wrapper animate-fade-in">
        <!-- Header -->
        <div class="bc-header">
          <div>
            <h1 class="bc-title" style="display: flex; align-items: center; gap: 8px;">
              <app-icon name="lock" [size]="24" color="var(--accent)"></app-icon> Bitácora de Cambios
            </h1>
            <p class="bc-subtitle">Acciones registradas (filtrado por {{ getLabelPeriodo() }}) · Solo Administrador</p>
          </div>
          <div class="bc-header-controls">
            <div class="bc-period-selector">
              <label class="period-label" style="display: flex; align-items: center; gap: 4px;">
                <app-icon name="calendar" [size]="14"></app-icon> Periodo:
              </label>
              <select
                class="period-select"
                [ngModel]="filtroPeriodo()"
                (ngModelChange)="filtroPeriodo.set($event)"
              >
                <option value="dia">Hoy</option>
                <option value="semana">Esta Semana</option>
                <option value="mes">Este Mes</option>
                <option value="todo">Todo el Historial</option>
              </select>
            </div>
            <div class="bc-semana-badge">
              <span>{{ getTextoPeriodo() }}</span>
            </div>
          </div>
        </div>

        <!-- Resumen Rápido -->
        <div class="bc-kpi-row">
          <div class="bc-kpi">
            <span class="bc-kpi-valor">{{ totalCambios() }}</span>
            <span class="bc-kpi-label">Total Cambios</span>
          </div>
          <div class="bc-kpi edit">
            <span class="bc-kpi-valor">{{ totalEdiciones() }}</span>
            <span class="bc-kpi-label" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
              <app-icon name="pencil" [size]="13" color="#3B82F6"></app-icon> Ediciones
            </span>
          </div>
          <div class="bc-kpi delete">
            <span class="bc-kpi-valor">{{ totalEliminaciones() }}</span>
            <span class="bc-kpi-label" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
              <app-icon name="trash" [size]="13" color="#EF4444"></app-icon> Eliminaciones
            </span>
          </div>
          <div class="bc-kpi user">
            <span class="bc-kpi-valor">{{ usuariosActivos() }}</span>
            <span class="bc-kpi-label" style="display: flex; align-items: center; justify-content: center; gap: 4px;">
              <app-icon name="users" [size]="13" color="#10B981"></app-icon> Usuarios Activos
            </span>
          </div>
        </div>

        <!-- Tabla -->
        <div class="bc-table-wrap">
          <table class="bc-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha y Hora</th>
                <th>Administrador / Usuario</th>
                <th>Acción</th>
                <th>Módulo</th>
                <th>Obra / Registro Afectado</th>
                <th>Detalle del Cambio</th>
              </tr>
            </thead>
            <tbody>
              @for (e of entradas(); track e.id; let idx = $index) {
                <tr class="bc-row" [class.bc-eliminar]="esEliminar(e)" [class.bc-editar]="esEditar(e)">
                  <td class="bc-num">{{ idx + 1 }}</td>
                  <td class="bc-fecha">
                    <span class="fecha-dia">{{ fmtDia(e.timestamp) }}</span>
                    <span class="fecha-hora">{{ fmtHora(e.timestamp) }}</span>
                  </td>
                  <td class="bc-usuario">
                    <div class="user-chip">
                      <span class="avatar-mini">{{ e.username.charAt(0).toUpperCase() }}</span>
                      <div>
                        <div class="user-nombre">{{ e.username }}</div>
                        <div class="user-rol">{{ e.module }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge-accion" [attr.data-accion]="accionLabel(e)" style="display: inline-flex; align-items: center; gap: 4px;">
                      @if (accionLabel(e) === 'Eliminar') {
                        <app-icon name="trash" [size]="12"></app-icon>
                      } @else {
                        <app-icon name="pencil" [size]="12"></app-icon>
                      }
                      <span>{{ accionLabel(e) }}</span>
                    </span>
                  </td>
                  <td class="bc-modulo">{{ e.module }}</td>
                  <td class="bc-obra">
                    <span class="obra-link">{{ getNombreObra(e) }}</span>
                  </td>
                  <td class="bc-desc" style="max-width:300px;">
                    <span title="{{ getDetalleCompleto(e) }}">{{ getDetalleCambio(e) }}</span>
                  </td>
                </tr>
              }
              @if (entradas().length === 0) {
                <tr>
                  <td colspan="7" class="bc-empty">
                    <div class="empty-icon">
                      <app-icon name="check-circle" [size]="32" color="var(--success)"></app-icon>
                    </div>
                    <div>Sin registros en el periodo seleccionado ({{ getLabelPeriodo() }})</div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Nota de acceso -->
        <div class="bc-nota" style="display: flex; align-items: center; gap: 8px;">
          <app-icon name="shield-check" [size]="18" color="var(--accent)"></app-icon>
          <span>Esta vista es exclusiva para el rol <strong>Administrador</strong>. Puedes cambiar el periodo de consulta usando el filtro superior.</span>
        </div>

        <!-- Logs de Auditoría completas al final de la página -->
        <div style="margin-top: 24px; border-top: 1px solid var(--border); padding-top: 24px;">
          <app-audit-logs />
        </div>
      </div>
    } @else {
      <div class="bc-acceso-denegado">
        <span class="bc-lock">
          <app-icon name="lock" [size]="48" color="var(--danger)"></app-icon>
        </span>
        <h2>Acceso restringido</h2>
        <p>Esta sección es exclusiva para el rol <strong>Administrador</strong>.</p>
      </div>
    }
  `,
  styles: [`
    .bc-wrapper { display: flex; flex-direction: column; gap: 20px; }

    .bc-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
    .bc-title { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; }
    .bc-subtitle { font-size: 0.82rem; color: var(--text-muted); }
    .bc-header-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    
    .bc-period-selector {
      display: flex; align-items: center; gap: 6px;
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius: 10px; padding: 6px 12px;
    }
    .period-label { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); }
    .period-select {
      background: var(--bg-dark); border: 1px solid var(--border);
      color: var(--text-primary); border-radius: 6px; padding: 4px 8px;
      font-size: 0.82rem; font-weight: 600; cursor: pointer; outline: none;
    }
    .period-select:focus { border-color: var(--accent); }

    .bc-semana-badge {
      background: rgba(232,160,32,0.12); border: 1px solid rgba(232,160,32,0.3);
      color: var(--accent); border-radius: 10px; padding: 8px 16px;
      font-size: 0.82rem; font-weight: 600;
    }

    .bc-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .bc-kpi {
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 18px 20px;
      display: flex; flex-direction: column; gap: 6px; align-items: center;
      transition: border-color 0.2s;
    }
    .bc-kpi:hover { border-color: var(--border-light); }
    .bc-kpi.edit  { border-color: rgba(232,160,32,0.2); }
    .bc-kpi.delete { border-color: rgba(239,68,68,0.2); }
    .bc-kpi.user  { border-color: rgba(99,102,241,0.2); }
    .bc-kpi-valor { font-size: 2rem; font-weight: 900; color: var(--text-primary); }
    .bc-kpi.edit  .bc-kpi-valor  { color: #E8A020; }
    .bc-kpi.delete .bc-kpi-valor { color: #EF4444; }
    .bc-kpi.user  .bc-kpi-valor  { color: #818CF8; }
    .bc-kpi-label { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }

    .bc-table-wrap {
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); overflow: hidden;
    }
    .bc-table { width: 100%; border-collapse: collapse; }
    .bc-table thead tr { background: rgba(0,0,0,0.3); }
    .bc-table th {
      text-align: left; padding: 13px 16px;
      font-size: 0.73rem; font-weight: 700; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.06em;
      border-bottom: 1px solid var(--border);
    }
    .bc-row { border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; }
    .bc-row td { padding: 12px 16px; font-size: 0.83rem; vertical-align: middle; }
    .bc-row.bc-eliminar { border-left: 3px solid rgba(239,68,68,0.4); }
    .bc-row.bc-editar   { border-left: 3px solid rgba(232,160,32,0.4); }
    .bc-row:hover { background: rgba(255,255,255,0.025); }

    .bc-num   { color: var(--text-muted); font-size: 0.78rem; width: 40px; }
    .bc-fecha { white-space: nowrap; }
    .fecha-dia  { display: block; font-size: 0.82rem; color: var(--text-secondary); font-weight: 600; }
    .fecha-hora { display: block; font-size: 0.75rem; color: var(--text-muted); }
    .bc-modulo { font-weight: 700; color: var(--text-primary); }
    .bc-desc   { color: var(--text-secondary); max-width: 250px; }
    .bc-obra   { max-width: 180px; }
    .obra-link { color: var(--accent); font-size: 0.78rem; font-weight: 500; }
    .obra-vacia { color: var(--text-muted); }

    .user-chip { display: flex; align-items: center; gap: 10px; }
    .avatar-mini {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 50%;
      background: rgba(232,160,32,0.18); color: var(--accent);
      font-size: 0.7rem; font-weight: 700; flex-shrink: 0;
    }
    .user-nombre { font-size: 0.83rem; font-weight: 600; color: var(--text-primary); }
    .user-rol { font-size: 0.72rem; color: var(--text-muted); text-transform: capitalize; }

    .badge-accion {
      padding: 4px 11px; border-radius: 6px; font-size: 0.73rem; font-weight: 700; white-space: nowrap;
    }
    .badge-accion[data-accion="Editar"]   { background: rgba(232,160,32,0.15); color: #E8A020; }
    .badge-accion[data-accion="Eliminar"] { background: rgba(239,68,68,0.15);  color: #EF4444; }

    .bc-empty { text-align: center; padding: 50px; color: var(--text-muted); }
    .empty-icon { font-size: 2.5rem; margin-bottom: 10px; }

    .bc-nota {
      background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.2);
      border-radius: 10px; padding: 12px 18px;
      font-size: 0.8rem; color: var(--text-muted);
    }
    .bc-nota strong { color: #818CF8; }

    .bc-acceso-denegado {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 16px; padding: 80px 20px; text-align: center;
    }
    .bc-lock { font-size: 3.5rem; }
    .bc-acceso-denegado h2 { font-size: 1.4rem; font-weight: 800; color: var(--text-primary); }
    .bc-acceso-denegado p  { color: var(--text-muted); font-size: 0.9rem; }
    .bc-acceso-denegado strong { color: var(--accent); }
  `]
})
export class BitacoraCambiosComponent implements OnInit {
  private auditSvc = inject(AuditLogService);
  auth = inject(AuthService);

  filtroPeriodo = signal<PeriodoFiltro>('semana');

  // Acciones del backend que corresponden a editar/crear
  private readonly EDIT_ACTIONS = [
    'CREACION_OBRA', 'MODIFICACION_OBRA', 'ACTUALIZACION_MONTOS_FECHAS',
    'ASIGNACION_RESPONSABLES', 'CAMBIO_ESTATUS',
    'CREATE', 'UPDATE', 'PATCH',
    'SUBIDA_ARCHIVO', 'ACTUALIZACION_CHECKLIST', 'SUBIDA_DOCUMENTO_CHECKLIST',
    'CREACION_GEOCERCA', 'MODIFICACION_GEOCERCA',
    'SUBIDA_EVIDENCIA', 'REGISTRO_AVANCE',
    'CREACION_USUARIO', 'MODIFICACION_USUARIO', 'DESACTIVACION_USUARIO', 'REACTIVACION_USUARIO'
  ];
  private readonly DELETE_ACTIONS = [
    'ELIMINACION_OBRA', 'ELIMINACION_ARCHIVO',
    'ELIMINACION_AVANCE', 'DELETE',
    'ELIMINACION_GEOCERCA', 'ELIMINACION_USUARIO'
  ];

  private _todos = signal<AuditLog[]>([]);

  entradas = computed(() => {
    const ahora = new Date();
    const periodo = this.filtroPeriodo();

    let fechaLimite: Date | null = null;
    if (periodo === 'dia') {
      fechaLimite = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
    } else if (periodo === 'semana') {
      const day = ahora.getDay();
      fechaLimite = new Date(ahora);
      fechaLimite.setDate(ahora.getDate() - (day === 0 ? 6 : day - 1));
      fechaLimite.setHours(0, 0, 0, 0);
    } else if (periodo === 'mes') {
      fechaLimite = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
    }

    return this._todos().filter(e => {
      const accion = e.action ?? '';
      const esCambio = [...this.EDIT_ACTIONS, ...this.DELETE_ACTIONS].includes(accion);
      if (!esCambio) return false;
      if (!fechaLimite) return true;
      return new Date(e.timestamp) >= fechaLimite;
    });
  });

  ngOnInit() {
    this.auditSvc.getLogs({ page: 0, size: 500 }).subscribe({
      next: (res) => this._todos.set(res.content),
      error: (err) => console.error('Error cargando audit logs', err)
    });
  }

  esEditar(e: AuditLog) {
    return !this.esEliminar(e) && this.EDIT_ACTIONS.includes(e.action ?? '');
  }
  esEliminar(e: AuditLog) {
    if (this.DELETE_ACTIONS.includes(e.action ?? '')) return true;
    const desc = (e.description ?? '').toLowerCase();
    return desc.includes('a eliminada') || desc.includes('se eliminó');
  }
  accionLabel(e: AuditLog): string {
    if (this.esEliminar(e)) return 'Eliminar';
    if (this.esEditar(e))   return 'Editar';
    return 'Otro';
  }

  /** Extrae el nombre de la obra o usuario afectado */
  getNombreObra(e: AuditLog): string {
    if (e.description) {
      const match = e.description.match(/^\[(.+?)\]/);
      if (match) return match[1];
      const userMatch = e.description.match(/\(@([^)]+)\)/);
      if (userMatch) return `👤 @${userMatch[1]}`;
    }
    try {
      const data = e.newData ? JSON.parse(e.newData) : e.previousData ? JSON.parse(e.previousData) : null;
      if (data?.nombre) return data.nombre;
      if (data?.username) return `👤 @${data.username}`;
      if (data?.obraId) return `Obra #${data.obraId}`;
    } catch {}
    return e.module || '—';
  }

  getDetalleCambio(e: AuditLog): string {
    const full = this.getDetalleCompleto(e);
    return full.length > 85 ? full.substring(0, 82) + '...' : full;
  }

  getDetalleCompleto(e: AuditLog): string {
    if (e.description) {
      return e.description.replace(/^\[.+?\] /, '');
    }
    try {
      if (e.action === 'CREACION_OBRA') {
        const nd = e.newData ? JSON.parse(e.newData) : null;
        return nd?.nombre ? `Se creó la obra "${nd.nombre}"` : 'Se registró una nueva obra';
      }
      if (e.action === 'ELIMINACION_OBRA') {
        const pd = e.previousData ? JSON.parse(e.previousData) : null;
        return pd?.nombre ? `Se eliminó la obra "${pd.nombre}"` : 'Se eliminó una obra';
      }
      if (e.action === 'ELIMINACION_USUARIO') {
        const pd = e.previousData ? JSON.parse(e.previousData) : null;
        return pd?.username ? `Se eliminó permanentemente al usuario @${pd.username}` : 'Se eliminó un usuario';
      }
      return e.action || 'Acción registrada';
    } catch {
      return e.action || 'Acción registrada';
    }
  }

  totalCambios       = computed(() => this.entradas().length);
  totalEdiciones     = computed(() => this.entradas().filter(e => this.esEditar(e)).length);
  totalEliminaciones = computed(() => this.entradas().filter(e => this.esEliminar(e)).length);
  usuariosActivos    = computed(() => new Set(this.entradas().map(e => e.username)).size);

  getLabelPeriodo(): string {
    const labels: Record<PeriodoFiltro, string> = {
      dia: 'hoy',
      semana: 'esta semana',
      mes: 'este mes',
      todo: 'historial completo'
    };
    return labels[this.filtroPeriodo()];
  }

  getTextoPeriodo(): string {
    const p = this.filtroPeriodo();
    if (p === 'dia') return '📅 Hoy: ' + new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    if (p === 'semana') return '📅 Semana: ' + this.rangoSemana();
    if (p === 'mes') return '📅 Mes: ' + new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return '📅 Todo el Historial';
  }

  rangoSemana(): string {
    const hoy = new Date();
    const dia = hoy.getDay();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    return `${fmt(lunes)} – ${fmt(domingo)}`;
  }

  fmtDia(ts: string): string {
    return new Date(ts).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
  }
  fmtHora(ts: string): string {
    return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
}
