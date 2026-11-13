import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ObrasService } from '../../core/services/obras.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { UserResponse } from '../../core/models/user.model';
import { UserFormModalComponent } from './components/user-form-modal.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UserFormModalComponent],
  template: `
    <div class="admin-page animate-fade-in">
      <div class="admin-header">
        <div>
          <h1 class="admin-title">⚙️ Administración del Sistema</h1>
          <p class="admin-subtitle">Gestión de usuarios, roles, cierre fiscal y configuración institucional</p>
        </div>
        <button class="btn btn-primary" (click)="openUserModal()">+ Nuevo Usuario</button>
      </div>

      <!-- Stats -->
      <div class="admin-stats">
        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(59,130,246,0.12)">👥</div>
          <div><div class="kpi-value">{{ usuarios.length }}</div><div class="kpi-label">Usuarios Registrados</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(232,160,32,0.12)">🏗️</div>
          <div><div class="kpi-value">{{ totalObras }}</div><div class="kpi-label">Total Obras Activas</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(239,68,68,0.12)">🔒</div>
          <div><div class="kpi-value" style="color:var(--danger)">0</div><div class="kpi-label">Obras Bloqueadas</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(45,212,191,0.12)">🏛️</div>
          <div><div class="kpi-value" style="color:var(--accent)">{{ ejercicioCierre }}</div><div class="kpi-label">Ejercicio Fiscal Actual</div></div>
        </div>
      </div>

      <!-- Cierre de Ejercicio Fiscal -->
      <div class="card fiscal-close-card">
        <div class="fiscal-header">
          <div class="fiscal-header-info">
            <div class="fiscal-title-row">
              <span class="fiscal-badge-icon">🏛️</span>
              <h3 class="sec-title" style="margin:0;">Cierre de Ejercicio Fiscal Anual</h3>
              <span class="badge badge-warning">Exclusivo Administrador</span>
            </div>
            <p class="fiscal-desc">
              Al finalizar el año, este proceso archiva de forma segura las obras del ejercicio en curso para que el padrón del nuevo año arranque <strong>completamente limpio (0 obras)</strong>. Las obras incompletas se concluyen administrativamente y las obras eliminadas/canceladas conservan su estado en el archivo. Puedes consultar el histórico en <strong>📋 Historial General &gt; Archivo Fiscal</strong>.
            </p>
          </div>
          <div class="fiscal-controls">
            <div class="fiscal-select-box">
              <label class="fiscal-lbl">EJERCICIO A CERRAR:</label>
              <select class="fiscal-select" [(ngModel)]="ejercicioCierre" (change)="cargarResumenCierre()">
                <option [value]="anioActual">{{ anioActual }} (Año en curso)</option>
                <option [value]="anioActual - 1">{{ anioActual - 1 }}</option>
                <option [value]="anioActual + 1">{{ anioActual + 1 }}</option>
              </select>
            </div>
            <button class="btn btn-warning fiscal-btn" (click)="confirmarCierreFiscal()" [disabled]="cargandoCierre">
              🔒 Realizar Cierre Fiscal {{ ejercicioCierre }}
            </button>
          </div>
        </div>

        <div class="fiscal-stats-row">
          <div class="fiscal-stat-pill">
            <span class="f-pill-dot" style="background:var(--accent)"></span>
            <span class="f-pill-label">Obras pendientes de archivar:</span>
            <strong class="f-pill-val">{{ obrasPendientesCierre }} obras</strong>
          </div>
          <div class="fiscal-stat-pill">
            <span class="f-pill-dot" style="background:var(--success)"></span>
            <span class="f-pill-label">Obras en proceso/planificadas:</span>
            <span class="f-pill-val">Pasan a Concluidas por Cierre</span>
          </div>
          <div class="fiscal-stat-pill">
            <span class="f-pill-dot" style="background:var(--danger)"></span>
            <span class="f-pill-label">Obras eliminadas / canceladas:</span>
            <span class="f-pill-val">Se archivan intactas con su etiqueta</span>
          </div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="card">
        <h3 class="sec-title">👥 Usuarios del Sistema</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (u of usuarios; track u.id) {
                <tr>
                  <td>
                    <div class="user-cell">
                      <div class="user-ava" [style.background]="getAvaColor(u.roles[0] || '')">{{ getInitials(u.firstName, u.lastName) }}</div>
                      <span>{{ u.firstName }} {{ u.lastName }}</span>
                      <small style="color:var(--text-muted); display:block; font-size:0.75rem;">@{{ u.username }}</small>
                    </div>
                  </td>
                  <td style="color:var(--text-muted)">{{ u.email }}</td>
                  <td><span class="badge" [class]="'badge-' + (u.roles[0] || '').toLowerCase()">{{ u.roles[0] || 'Sin Rol' }}</span></td>
                  <td>
                    @if(u.active) {
                      <span style="color:var(--success)">✅ Activo</span>
                    } @else {
                      <span style="color:var(--danger)">❌ Inactivo</span>
                    }
                  </td>
                  <td>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                      <button class="btn btn-secondary btn-sm" (click)="openUserModal(u)">✏️ Editar</button>
                      @if(u.active) {
                        <button class="btn btn-warning btn-sm" (click)="deactivateUser(u.id)" [disabled]="u.roles.includes('ADMINISTRADOR') && activeAdminsCount() <= 1">⚠️ Desactivar</button>
                      } @else {
                        <button class="btn btn-primary btn-sm" (click)="reactivateUser(u.id)">🔄 Reactivar</button>
                      }
                      <button
                        class="btn btn-danger-outline btn-sm"
                        (click)="deleteUserPermanently(u)"
                        [disabled]="u.username === auth.usuario()?.username || (u.roles.includes('ADMINISTRADOR') && activeAdminsCount() <= 1)"
                        title="Eliminar usuario permanentemente">
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Config -->
      <div class="admin-config-grid">
        <div class="card">
          <h3 class="sec-title">⏱️ Reglas del Sistema</h3>
          <div class="rule-list">
            <div class="rule-item">
              <span class="rule-icon">🔒</span>
              <div>
                <div class="rule-name">Bloqueo automático de edición</div>
                <div class="rule-desc">Las obras se bloquean tras <strong>15 días</strong> sin actualización</div>
              </div>
              <span class="badge badge-warning">Activo</span>
            </div>
            <div class="rule-item">
              <span class="rule-icon">🔗</span>
              <div>
                <div class="rule-name">URLs únicas por proyecto</div>
                <div class="rule-desc">Cada obra tiene una URL permanente e irrepetible</div>
              </div>
              <span class="badge badge-success">Activo</span>
            </div>
            <div class="rule-item">
              <span class="rule-icon">📦</span>
              <div>
                <div class="rule-name">Límite de archivos</div>
                <div class="rule-desc">Máximo <strong>30 MB</strong> por archivo subido</div>
              </div>
              <span class="badge badge-success">Activo</span>
            </div>
          </div>
        </div>
        <div class="card">
          <h3 class="sec-title">🔑 Roles y Permisos del Sistema</h3>
          <div class="perms-table">
            <div class="perm-row header">
              <span>Acción / Permiso</span><span>Admin</span><span>Supervisor</span><span>Contratista</span><span>Auditor</span>
            </div>
            @for (p of permisos; track p.nombre) {
              <div class="perm-row">
                <span>{{ p.nombre }}</span>
                <span>{{ p.admin ? '✅' : '❌' }}</span>
                <span>{{ p.supervisor ? '✅' : '❌' }}</span>
                <span>{{ p.contratista ? '✅' : '❌' }}</span>
                <span>{{ p.auditor ? '✅' : '❌' }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    @if (showModal) {
      <app-user-form-modal
        [user]="selectedUser"
        [existingUsers]="usuarios"
        (save)="saveUser($event)"
        (close)="closeModal()">
      </app-user-form-modal>
    }
  `,
  styles: [`
    .admin-page { display: flex; flex-direction: column; gap: 24px; }
    .admin-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
    .admin-title { font-size: 1.4rem; font-weight: 800; margin-bottom: 4px; }
    .admin-subtitle { font-size: 0.85rem; color: var(--text-muted); }
    .admin-stats { display: flex; gap: 16px; flex-wrap: wrap; }
    .admin-stats .kpi-card { flex: 1; min-width: 160px; }
    .sec-title { font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; }
    .user-cell { display: flex; align-items: center; gap: 10px; }
    .user-ava {
      width: 34px; height: 34px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; color: white;
    }
    .badge-administrador { background: rgba(232,160,32,0.15); color: var(--accent); }
    .badge-supervisor { background: rgba(45,212,191,0.15); color: var(--success); }
    .badge-contratista { background: rgba(245,158,11,0.15); color: var(--warning); }
    .badge-auditor { background: rgba(100,116,139,0.15); color: var(--text-secondary); }
    .btn-warning { background: rgba(239, 160, 0, 0.2); border-color: rgba(239, 160, 0, 0.4); color: #fbbf24; }
    .btn-warning:hover { background: rgba(239, 160, 0, 0.3); }
    .btn-danger-outline {
      background: rgba(239, 68, 68, 0.14);
      border: 1px solid rgba(239, 68, 68, 0.38);
      color: #f87171;
    }
    .btn-danger-outline:hover:not([disabled]) {
      background: rgba(239, 68, 68, 0.28);
      color: #fca5a5;
    }
    .admin-config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .rule-list { display: flex; flex-direction: column; gap: 12px; }
    .rule-item {
      display: flex; align-items: center; gap: 14px;
      padding: 14px; background: var(--bg-dark);
      border-radius: 10px; border: 1px solid var(--border);
    }
    .rule-icon { font-size: 1.3rem; flex-shrink: 0; }
    .rule-name { font-size: 0.87rem; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
    .rule-desc { font-size: 0.78rem; color: var(--text-muted); }
    .perms-table { display: flex; flex-direction: column; gap: 2px; }

    /* Cierre Fiscal Styles */
    .fiscal-close-card {
      border: 1px solid rgba(232, 160, 32, 0.25);
      background: linear-gradient(180deg, rgba(232, 160, 32, 0.04) 0%, var(--bg-surface) 100%);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .fiscal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      flex-wrap: wrap;
    }
    .fiscal-header-info { flex: 1; min-width: 280px; }
    .fiscal-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .fiscal-badge-icon { font-size: 1.3rem; }
    .fiscal-desc { font-size: 0.84rem; color: var(--text-secondary); line-height: 1.5; margin: 0; }
    .fiscal-controls {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }
    .fiscal-select-box { display: flex; flex-direction: column; gap: 4px; }
    .fiscal-lbl { font-size: 0.72rem; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em; }
    .fiscal-select {
      background: var(--bg-dark);
      border: 1px solid var(--border);
      color: var(--text-primary);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 0.85rem;
      font-weight: 600;
      outline: none;
    }
    .fiscal-btn {
      padding: 9px 18px;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .fiscal-stats-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }
    .fiscal-stat-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-dark);
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      font-size: 0.82rem;
    }
    .f-pill-dot { width: 8px; height: 8px; border-radius: 50%; }
    .f-pill-label { color: var(--text-muted); }
    .f-pill-val { font-weight: 600; color: var(--text-primary); }
  `]
})
export class AdminComponent implements OnInit {
  usuarios: UserResponse[] = [];
  selectedUser: UserResponse | null = null;
  showModal = false;
  totalObras = 0;

  anioActual = new Date().getFullYear();
  ejercicioCierre = new Date().getFullYear();
  obrasPendientesCierre = 0;
  cargandoCierre = false;

  permisos = [
    { nombre: 'Crear obras públicas', admin: true, supervisor: true, contratista: false, auditor: false },
    { nombre: 'Editar datos de obra y avance', admin: true, supervisor: true, contratista: true, auditor: false },
    { nombre: 'Subir documentos y evidencias', admin: true, supervisor: true, contratista: true, auditor: false },
    { nombre: 'Descargar reportes y expedientes', admin: true, supervisor: true, contratista: true, auditor: true },
    { nombre: 'Consultar bitácora y auditoría', admin: true, supervisor: false, contratista: false, auditor: true },
    { nombre: 'Ejecutar Cierre Fiscal Anual', admin: true, supervisor: false, contratista: false, auditor: false },
    { nombre: 'Gestión de usuarios y accesos', admin: true, supervisor: false, contratista: false, auditor: false },
  ];

  constructor(
    public auth: AuthService, 
    public svc: ObrasService,
    private userService: UserService,
    private toastSvc: ToastService
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.cargarResumenCierre();
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (res) => this.usuarios = res,
      error: (err) => console.error('Error cargando usuarios', err)
    });
  }

  cargarResumenCierre() {
    this.svc.getResumenCierreFiscal(this.ejercicioCierre).subscribe({
      next: (res) => {
        this.obrasPendientesCierre = res.obrasPendientesCierre;
        this.totalObras = res.obrasPendientesCierre;
      },
      error: () => {
        this.svc.getObras({ size: 1 }).subscribe({
          next: (page) => {
            this.totalObras = page.totalElements;
            this.obrasPendientesCierre = page.totalElements;
          }
        });
      }
    });
  }

  confirmarCierreFiscal() {
    Swal.fire({
      title: `🏛️ Cierre Fiscal Ejercicio ${this.ejercicioCierre}`,
      html: `
        <div style="text-align: left; font-size: 0.88rem; line-height: 1.5; color: #cbd5e1;">
          <p style="margin-bottom: 10px;">⚠️ <strong>Atención Administrador:</strong> Esta acción archivará formalmente las obras del ejercicio fiscal <strong>${this.ejercicioCierre}</strong>.</p>
          <ul style="padding-left: 18px; margin: 8px 0; display: flex; flex-direction: column; gap: 6px;">
            <li>Las obras en proceso o planificadas se marcarán como <strong>COMPLETADAS</strong> por cierre administrativo.</li>
            <li>Las obras eliminadas y canceladas <strong>conservarán su estado</strong> y se guardarán en el archivo histórico.</li>
            <li>El padrón del nuevo año iniciará <strong>completamente limpio (0 obras activas)</strong>.</li>
            <li>Podrás consultar y buscar estas obras en cualquier momento desde <strong>📋 Historial General &gt; Archivo Fiscal</strong>.</li>
          </ul>
          <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 8px; padding: 10px; margin-top: 12px; color: #fbbf24;">
            Para autorizar el cierre, escribe exactamente: <strong style="letter-spacing:1px; color:#ffffff;">CONFIRMAR-${this.ejercicioCierre}</strong>
          </div>
        </div>
      `,
      input: 'text',
      inputPlaceholder: `CONFIRMAR-${this.ejercicioCierre}`,
      showCancelButton: true,
      confirmButtonText: '🔒 Ejecutar Cierre Fiscal',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#4b5563',
      background: '#1e293b',
      color: '#f8fafc',
      preConfirm: (value) => {
        if (value !== `CONFIRMAR-${this.ejercicioCierre}`) {
          Swal.showValidationMessage(`Debes escribir exactamente CONFIRMAR-${this.ejercicioCierre}`);
          return false;
        }
        return true;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarCierre();
      }
    });
  }

  ejecutarCierre() {
    this.cargandoCierre = true;
    this.svc.ejecutarCierreFiscal(this.ejercicioCierre).subscribe({
      next: (res) => {
        this.cargandoCierre = false;
        this.toastSvc.show(`🏛️ Cierre Fiscal ${this.ejercicioCierre} concluido: ${res.obrasArchivadas} obras archivadas.`, 'success');
        Swal.fire({
          title: '✅ Cierre Fiscal Concluido',
          html: `El ejercicio fiscal <strong>${this.ejercicioCierre}</strong> ha sido cerrado exitosamente.<br><br>Se han archivado <strong>${res.obrasArchivadas} obras</strong>.<br>El padrón activo para el nuevo año ahora está listo y limpio.<br><br><small style="color:#94a3b8">Puedes consultar todas las obras archivadas desde el módulo de <strong>Historial General &gt; Archivo Fiscal</strong>.</small>`,
          icon: 'success',
          confirmButtonColor: '#10b981',
          confirmButtonText: 'Entendido',
          background: '#1e293b',
          color: '#f8fafc'
        });
        this.cargarResumenCierre();
      },
      error: (err) => {
        this.cargandoCierre = false;
        const msg = err?.error?.message || 'Error al ejecutar el cierre fiscal.';
        this.toastSvc.show(msg, 'error');
      }
    });
  }

  getInitials(first: string, last: string): string {
    return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();
  }

  getAvaColor(rol: string): string {
    return {
      ADMINISTRADOR: '#1A3C5E',
      SUPERVISOR: '#0D5C4A',
      CONTRATISTA: '#D97706',
      AUDITOR: '#3B4A5A'
    }[rol] ?? '#1A3C5E';
  }

  openUserModal(user?: UserResponse) {
    this.selectedUser = user || null;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedUser = null;
  }

  saveUser(data: any) {
    if (this.selectedUser) {
      this.userService.updateUser(this.selectedUser.id, data).subscribe({
        next: () => {
          this.toastSvc.show('Usuario actualizado con éxito.', 'success');
          this.loadUsers();
          this.closeModal();
        },
        error: (err) => this.mostrarErrorGuardarUsuario(err, 'actualizar')
      });
    } else {
      this.userService.createUser(data).subscribe({
        next: () => {
          this.toastSvc.show(`✅ Usuario @${data.username} creado con éxito.`, 'success');
          this.loadUsers();
          this.closeModal();
        },
        error: (err) => this.mostrarErrorGuardarUsuario(err, 'crear')
      });
    }
  }

  private mostrarErrorGuardarUsuario(err: any, accion: 'crear' | 'actualizar') {
    const rawMsg: string = err?.error?.message || '';

    if (rawMsg.toLowerCase().includes('nombre de usuario')) {
      Swal.fire({
        title: '🚫 Nombre de usuario ocupado',
        html: `${rawMsg}.<br><br>Por favor elige un nombre de usuario diferente.`,
        icon: 'warning',
        confirmButtonColor: '#E8A020',
        confirmButtonText: 'Elegir otro usuario',
        background: '#1F2937',
        color: '#F9FAFB'
      });
      return;
    }

    if (rawMsg.toLowerCase().includes('correo electrónico') || rawMsg.toLowerCase().includes('email')) {
      Swal.fire({
        title: '🚫 Correo ya registrado',
        html: `${rawMsg}.<br><br>Verifica el correo ingresado o utiliza otro diferente.`,
        icon: 'warning',
        confirmButtonColor: '#E8A020',
        confirmButtonText: 'Corregir correo',
        background: '#1F2937',
        color: '#F9FAFB'
      });
      return;
    }

    this.toastSvc.show(rawMsg || `Error al ${accion} el usuario.`, 'error');
  }

  activeAdminsCount(): number {
    return this.usuarios.filter(u => u.active && u.roles.includes('ADMINISTRADOR')).length;
  }

  deactivateUser(id: number) {
    Swal.fire({
      title: '⚠️ ¿Desactivar usuario?',
      text: 'Su cuenta quedará inhabilitada para ingresar al sistema, pero sus obras asignadas e historial de bitácora se conservarán.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F59E0B',
      cancelButtonColor: '#4B5563',
      confirmButtonText: '⚠️ Sí, desactivar',
      cancelButtonText: 'Cancelar',
      background: '#1F2937',
      color: '#F9FAFB'
    }).then((res) => {
      if (res.isConfirmed) {
        this.userService.deactivateUser(id).subscribe({
          next: () => {
            this.toastSvc.show('Acceso de usuario desactivado.', 'info');
            this.loadUsers();
          },
          error: (err) => this.toastSvc.show(err.error?.message || 'Error desactivando el usuario.', 'error')
        });
      }
    });
  }

  reactivateUser(id: number) {
    this.userService.reactivateUser(id).subscribe({
      next: () => {
        this.toastSvc.show('Cuenta de usuario reactivada.', 'success');
        this.loadUsers();
      },
      error: (err) => this.toastSvc.show(err.error?.message || 'Error reactivando el usuario.', 'error')
    });
  }

  deleteUserPermanently(user: UserResponse) {
    Swal.fire({
      title: '🗑️ ¿Eliminar usuario definitivamente?',
      html: `Estás por eliminar permanentemente la cuenta de <strong>${user.firstName} ${user.lastName}</strong> (<code>@${user.username}</code>).<br><br>Esta acción borrará al usuario de la base de datos y <strong>no se puede deshacer</strong>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#4B5563',
      confirmButtonText: '🗑️ Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#1F2937',
      color: '#F9FAFB'
    }).then((res) => {
      if (res.isConfirmed) {
        this.userService.deleteUserPermanently(user.id).subscribe({
          next: () => {
            this.toastSvc.show(`🗑️ Usuario @${user.username} eliminado permanentemente.`, 'success');
            this.loadUsers();
          },
          error: (err) => {
            const msg = err?.error?.message || 'No fue posible eliminar al usuario.';
            Swal.fire({
              title: '🔒 No se puede eliminar este usuario',
              text: msg,
              icon: 'error',
              confirmButtonColor: '#3B82F6',
              confirmButtonText: 'Entendido',
              background: '#1F2937',
              color: '#F9FAFB'
            });
          }
        });
      }
    });
  }
}
