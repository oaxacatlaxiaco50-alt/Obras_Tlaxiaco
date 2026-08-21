import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { AuditLogService } from '../../core/services/audit-log.service';
import { AuditLog } from '../../core/models/audit-log.model';

@Component({
  selector: 'app-bitacora-cambios',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (auth.hasRole('admin')) {
      <div class="bc-wrapper animate-fade-in">
        <!-- Header -->
        <div class="bc-header">
          <div>
            <h1 class="bc-title">🔒 Bitácora de Cambios</h1>
            <p class="bc-subtitle">Acciones de Editar y Eliminar registradas esta semana · Solo Administrador</p>
          </div>
          <div class="bc-semana-badge">
            <span>📅 Semana actual: {{ rangoSemana() }}</span>
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
            <span class="bc-kpi-label">✏️ Ediciones</span>
          </div>
          <div class="bc-kpi delete">
            <span class="bc-kpi-valor">{{ totalEliminaciones() }}</span>
            <span class="bc-kpi-label">🗑️ Eliminaciones</span>
          </div>
          <div class="bc-kpi user">
            <span class="bc-kpi-valor">{{ usuariosActivos() }}</span>
            <span class="bc-kpi-label">👥 Usuarios Activos</span>
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
                <th>Descripción</th>
                <th>Obra Afectada</th>
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
                    <span class="badge-accion" [attr.data-accion]="accionLabel(e)">
                      {{ accionLabel(e) === 'Editar' ? '✏️' : '🗑️' }} {{ accionLabel(e) }}
                    </span>
                  </td>
                  <td class="bc-modulo">{{ e.module }}</td>
                  <td class="bc-desc">{{ e.newData ? 'Actualización de obra' : e.action }}</td>
                  <td class="bc-obra">
                    <span class="obra-link">{{ e.module }}</span>
                  </td>
                </tr>
              }
              @if (entradas().length === 0) {
                <tr>
                  <td colspan="7" class="bc-empty">
                    <div class="empty-icon">✅</div>
                    <div>Sin cambios críticos esta semana</div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Nota de acceso -->
        <div class="bc-nota">
          🔐 Esta vista es exclusiva para el rol <strong>Administrador</strong>.
          Se filtra automáticamente por la semana actual (lunes a domingo).
        </div>
      </div>
    } @else {
      <div class="bc-acceso-denegado">
        <span class="bc-lock">🔒</span>
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
    .bc-semana-badge {
      background: rgba(232,160,32,0.12); border: 1px solid rgba(232,160,32,0.3);
      color: var(--accent); border-radius: 10px; padding: 8px 16px;
      font-size: 0.82rem; font-weight: 600; align-self: flex-start;
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

  // Acciones del backend que corresponden a editar/eliminar
  private readonly EDIT_ACTIONS = [
    'MODIFICACION_OBRA', 'ACTUALIZACION_MONTOS_FECHAS',
    'ASIGNACION_RESPONSABLES', 'CAMBIO_ESTATUS',
    'UPDATE', 'PATCH'
  ];
  private readonly DELETE_ACTIONS = [
    'ELIMINACION_OBRA', 'ELIMINACION_ARCHIVO',
    'ELIMINACION_AVANCE', 'DELETE'
  ];

  private _todos = signal<AuditLog[]>([]);

  // Filtra acciones de editar/eliminar de la semana actual
  entradas = computed(() => {
    const inicioSemana = (() => {
      const d = new Date();
      const day = d.getDay();
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      d.setHours(0, 0, 0, 0);
      return d;
    })();
    return this._todos().filter(e => {
      const accion = e.action ?? '';
      const esCambio = [...this.EDIT_ACTIONS, ...this.DELETE_ACTIONS].includes(accion);
      const fechaLog = new Date(e.timestamp);
      return esCambio && fechaLog >= inicioSemana;
    });
  });

  ngOnInit() {
    // Usar audit-logs que tiene el campo action real
    this.auditSvc.getLogs({ page: 0, size: 500 }).subscribe({
      next: (res) => this._todos.set(res.content),
      error: (err) => console.error('Error cargando audit logs', err)
    });
  }

  esEditar(e: AuditLog)   { return this.EDIT_ACTIONS.includes(e.action ?? ''); }
  esEliminar(e: AuditLog) { return this.DELETE_ACTIONS.includes(e.action ?? ''); }
  accionLabel(e: AuditLog): string {
    if (this.DELETE_ACTIONS.includes(e.action ?? '')) return 'Eliminar';
    if (this.EDIT_ACTIONS.includes(e.action ?? ''))   return 'Editar';
    return 'Otro';
  }

  totalCambios       = computed(() => this.entradas().length);
  totalEdiciones     = computed(() => this.entradas().filter(e => this.esEditar(e)).length);
  totalEliminaciones = computed(() => this.entradas().filter(e => this.esEliminar(e)).length);
  usuariosActivos    = computed(() => new Set(this.entradas().map(e => e.username)).size);

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
