import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ObrasService } from '../../core/services/obras.service';
import { UserService } from '../../core/services/user.service';
import { UserResponse } from '../../core/models/user.model';
import { UserFormModalComponent } from './components/user-form-modal.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [UserFormModalComponent],
  template: `
    <div class="admin-page animate-fade-in">
      <div class="admin-header">
        <div>
          <h1 class="admin-title">⚙️ Administración del Sistema</h1>
          <p class="admin-subtitle">Gestión de usuarios, roles y configuración global</p>
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
          <div><div class="kpi-value">{{ totalObras }}</div><div class="kpi-label">Total Obras</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(239,68,68,0.12)">🔒</div>
          <div><div class="kpi-value" style="color:var(--danger)">0</div><div class="kpi-label">Obras Bloqueadas</div></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(45,212,191,0.12)">📈</div>
          <div><div class="kpi-value" style="color:var(--success)">100%</div><div class="kpi-label">Avance Global</div></div>
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
                    <div style="display:flex;gap:8px">
                      <button class="btn btn-secondary btn-sm" (click)="openUserModal(u)">✏️ Editar</button>
                      @if(u.active) {
                        <button class="btn btn-warning btn-sm" (click)="deactivateUser(u.id)" [disabled]="u.roles.includes('ADMINISTRADOR') && usuarios.length === 1">⚠️ Desactivar</button>
                      } @else {
                        <button class="btn btn-primary btn-sm" (click)="reactivateUser(u.id)">🔄 Reactivar</button>
                      }
                      <button class="btn btn-danger btn-sm" (click)="hardDeleteUser(u.id)" [disabled]="u.roles.includes('ADMINISTRADOR') && usuarios.length === 1">🗑 Eliminar Permanente</button>
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
          <h3 class="sec-title">🔑 Roles y Permisos</h3>
          <div class="perms-table">
            <div class="perm-row header">
              <span>Permiso</span><span>Admin</span><span>Supervisor</span><span>Auditor</span>
            </div>
            @for (p of permisos; track p.nombre) {
              <div class="perm-row">
                <span>{{ p.nombre }}</span>
                <span>{{ p.admin ? '✅' : '❌' }}</span>
                <span>{{ p.residente ? '✅' : '❌' }}</span>
                <span>{{ p.lector ? '✅' : '❌' }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    @if (showModal) {
      <app-user-form-modal
        [user]="selectedUser"
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
    .badge-auditor { background: rgba(100,116,139,0.15); color: var(--text-secondary); }
    .btn-warning { background: rgba(239, 160, 0, 0.2); border-color: rgba(239, 160, 0, 0.4); color: #fbbf24; }
    .btn-warning:hover { background: rgba(239, 160, 0, 0.3); }
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
    .perm-row {
      display: grid; grid-template-columns: 2fr 1fr 1fr 1fr;
      padding: 10px 12px; border-radius: 8px; font-size: 0.83rem;
      align-items: center;
    }
    .perm-row.header {
      background: var(--bg-dark); font-weight: 700;
      font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;
    }
    .perm-row:not(.header):hover { background: rgba(255,255,255,0.02); }
    button[disabled] { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class AdminComponent implements OnInit {
  usuarios: UserResponse[] = [];
  totalObras = 0;
  showModal = false;
  selectedUser: UserResponse | null = null;

  permisos = [
    { nombre: 'Ver Dashboard completo', admin: true, residente: true, lector: false },
    { nombre: 'Ver nombre y descripción', admin: true, residente: true, lector: true },
    { nombre: 'Editar expediente', admin: true, residente: true, lector: false },
    { nombre: 'Subir archivos', admin: true, residente: true, lector: false },
    { nombre: 'Gestionar usuarios', admin: true, residente: false, lector: false },
  ];

  constructor(
    public auth: AuthService, 
    public svc: ObrasService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.svc.getObras({ size: 1 }).subscribe({
      next: (page) => this.totalObras = page.totalElements,
      error: () => {}
    });
  }

  loadUsers() {
    this.userService.getUsers().subscribe({
      next: (res) => this.usuarios = res,
      error: (err) => console.error('Error cargando usuarios', err)
    });
  }

  getInitials(first: string, last: string): string {
    return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();
  }

  getAvaColor(rol: string): string {
    return { ADMINISTRADOR: '#1A3C5E', SUPERVISOR: '#0D5C4A', AUDITOR: '#3B4A5A' }[rol] ?? '#1A3C5E';
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
          this.loadUsers();
          this.closeModal();
        },
        error: (err) => console.error('Error actualizando usuario', err)
      });
    } else {
      this.userService.createUser(data).subscribe({
        next: () => {
          this.loadUsers();
          this.closeModal();
        },
        error: (err) => console.error('Error creando usuario', err)
      });
    }
  }

  deactivateUser(id: number) {
    if (confirm('¿Estás seguro de que deseas desactivar este usuario? (No se borrará del historial)')) {
      this.userService.deactivateUser(id).subscribe({
        next: () => this.loadUsers(),
        error: (err) => console.error('Error desactivando', err)
      });
    }
  }

  hardDeleteUser(id: number) {
    if (confirm('¡PELIGRO! ¿Estás completamente seguro de que deseas eliminar a este usuario de forma permanente? Esta acción borrará el registro físico de la base de datos y podría afectar el historial.')) {
      this.userService.hardDeleteUser(id).subscribe({
        next: () => this.loadUsers(),
        error: (err) => alert('Error eliminando permanentemente al usuario (puede que tenga registros relacionados en la bitácora).')
      });
    }
  }

  reactivateUser(id: number) {
    this.userService.reactivateUser(id).subscribe({
      next: () => this.loadUsers(),
      error: (err) => console.error('Error reactivando', err)
    });
  }
}
