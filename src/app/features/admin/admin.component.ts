import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ObrasService } from '../../core/services/obras.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { InstitucionService } from '../../core/services/institucion.service';
import { InstitucionConfigRequest } from '../../core/models/institucion-config.model';
import { UserResponse } from '../../core/models/user.model';
import { UserFormModalComponent } from './components/user-form-modal.component';
import { LogoCropperModalComponent } from './components/logo-cropper-modal.component';
import { MembretePreviewModalComponent } from './components/membrete-preview-modal.component';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, UserFormModalComponent, LogoCropperModalComponent, MembretePreviewModalComponent],
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

      <!-- Identidad Institucional y Hoja Membretada -->
      <div class="card institucion-card">
        <div class="fiscal-header">
          <div class="fiscal-header-info">
            <div class="fiscal-title-row">
              <span class="fiscal-badge-icon">🎨</span>
              <h3 class="sec-title" style="margin:0;">Identidad Institucional y Hoja Membretada Dinámica</h3>
              <span class="badge badge-warning">Exclusivo Administrador</span>
            </div>
            <p class="fiscal-desc">
              Personaliza el logotipo oficial con encuadre interactivo, la hoja membretada para reportes PDF y los datos de la administración municipal vigente. Los cambios se aplican de forma inmediata en todo el sistema (Login, Barra lateral, Encabezados y Descargas PDF).
            </p>
          </div>
          <div class="inst-actions-top">
            <button type="button" class="btn btn-outline-primary" (click)="generarPdfMuestra()" title="Descargar muestra del membrete">
              📄 Generar PDF de Muestra
            </button>
            <button type="button" class="btn btn-primary" (click)="guardarDatosInstitucion()" [disabled]="guardandoInstitucion">
              💾 {{ guardandoInstitucion ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </div>

        <!-- Fila Superior: Logotipo y Hoja Membretada en 2 Columnas -->
        <div class="inst-top-grid">
          <!-- Columna A: Logotipo -->
          <div class="asset-box">
            <div class="asset-title-row">
              <span class="asset-title">🏛️ Logotipo Oficial del Municipio</span>
              <span class="asset-hint">Puedes encuadrarlo, recortarlo y hacer zoom a la medida</span>
            </div>
            <div class="asset-preview-wrap">
              <div class="logo-preview-box">
                <img [src]="institucionSvc.resolveLogoUrl((institucionSvc.config$ | async)?.logoUrl)" (error)="$any($event.target).src='assets/logos/logo.png'" alt="Logotipo actual" class="preview-logo-img" />
              </div>
              <div class="asset-btns">
                <input type="file" #logoFileInput (change)="onLogoFilePicked($event)" accept="image/png,image/jpeg,image/webp,image/svg+xml" style="display:none;" />
                <button type="button" class="btn btn-sm btn-outline-warning" (click)="logoFileInput.click()" [disabled]="subiendoLogo">
                  ✂️ {{ subiendoLogo ? 'Guardando...' : 'Cargar y Encuadrar Logo' }}
                </button>
                <button type="button" class="btn btn-sm btn-danger-outline" (click)="restablecerLogo()">
                  🔄 Restablecer Predeterminado
                </button>
              </div>
            </div>
          </div>

          <!-- Columna B: Hoja Membretada con Miniatura en Vivo -->
          <div class="asset-box">
            <div class="asset-title-row">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="asset-title">📑 Hoja Membretada para Reportes (PDF)</span>
                @if ((institucionSvc.config$ | async)?.membreteUrl) {
                  <span class="badge badge-success" style="font-size:0.7rem;">🟢 Activa</span>
                } @else {
                  <span class="badge badge-info" style="font-size:0.7rem;">⚪ Estándar</span>
                }
              </div>
              <span class="asset-hint">Fondo oficial para Fichas Técnicas, Expediente Unitario y Reportes</span>
            </div>
            <div class="membrete-content-layout">
              <!-- Miniatura Hoja -->
              <div class="mini-sheet-container" (click)="verVistaPreviaMembrete()" title="Clic para ampliar hoja membretada">
                <img [src]="institucionSvc.resolveMembreteUrl((institucionSvc.config$ | async)?.membreteUrl) || 'assets/logos/hoja_membretada_oficial.png'" alt="Hoja membretada" class="mini-sheet-preview-img" (error)="$any($event.target).src='assets/logos/hoja_membretada_oficial.png'" />
                <div class="mini-sheet-zoom-overlay">
                  <span>🔍 Ver Completa</span>
                </div>
              </div>

              <!-- Acciones de Hoja Membretada -->
              <div class="asset-btns">
                <button type="button" class="btn btn-sm btn-outline-primary" (click)="verVistaPreviaMembrete()">
                  👁️ Ver Vista Previa
                </button>
                <button type="button" class="btn btn-sm btn-primary" (click)="activarMembreteOficialTlaxiaco()" [disabled]="subiendoMembrete" title="Activa la hoja membretada con los logos y palacio municipal">
                  ⭐ Activar Membrete Tlaxiaco
                </button>
                <input type="file" #membreteFileInput (change)="onMembreteSelected($event)" accept="image/png,image/jpeg,application/pdf" style="display:none;" />
                <button type="button" class="btn btn-sm btn-outline-warning" (click)="membreteFileInput.click()" [disabled]="subiendoMembrete">
                  📤 {{ subiendoMembrete ? 'Subiendo...' : 'Subir Otra Hoja' }}
                </button>
                @if ((institucionSvc.config$ | async)?.membreteUrl) {
                  <button type="button" class="btn btn-sm btn-danger-outline" (click)="restablecerMembrete()">
                    🔄 Usar Membrete Estándar
                  </button>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Fila Inferior: Formulario Completo de Datos Oficiales (Ancho Total) -->
        <div class="inst-data-form-box">
          <div class="inst-form-header">
            <h4 class="inst-form-title">🏛️ Datos Oficiales de la Administración Municipal</h4>
            <span class="inst-form-hint">Toda la información se muestra completa y se actualiza en tiempo real en los documentos</span>
          </div>

          <div class="inst-form-stack">
            <!-- 1. Nombre Municipio -->
            <div class="inst-field-row">
              <label class="inst-label">Nombre Oficial del Municipio / Ayuntamiento:</label>
              <input type="text" [(ngModel)]="institucionForm.nombreMunicipio" class="inst-full-input" placeholder="Ej. H. Ayuntamiento Constitucional de Heroica Ciudad de Tlaxiaco" />
            </div>

            <!-- 2. Dependencia -->
            <div class="inst-field-row">
              <label class="inst-label">Dependencia Encargada de las Obras:</label>
              <input type="text" [(ngModel)]="institucionForm.dependencia" class="inst-full-input" placeholder="Ej. Dirección de Obras Públicas y Desarrollo Urbano" />
            </div>

            <!-- 3. Período y Lema en 2 Columnas amplias -->
            <div class="inst-row-split">
              <div class="inst-field-row">
                <label class="inst-label">Período Constitucional de Administración:</label>
                <input type="text" [(ngModel)]="institucionForm.periodoAdministracion" class="inst-full-input" placeholder="Ej. Administración 2025 - 2027" />
              </div>
              <div class="inst-field-row">
                <label class="inst-label">Lema o Eslogan Oficial:</label>
                <input type="text" [(ngModel)]="institucionForm.lemaOficial" class="inst-full-input" placeholder="Ej. El poder de servir al pueblo" />
              </div>
            </div>

            <!-- 4. Pie de página en textarea amplio para ver todo el domicilio y teléfono -->
            <div class="inst-field-row">
              <label class="inst-label">Pie de Página Oficial en Reportes, Fichas y Oficios (Domicilio y Contacto):</label>
              <textarea [(ngModel)]="institucionForm.piePaginaReporte" rows="2" class="inst-full-textarea" placeholder="Ej. Parque Porfirio Díaz S/N, Colonia Centro, Heroica Ciudad de Tlaxiaco, Oax. C. P. 69800 | Tel: (953) 55 20 723"></textarea>
            </div>
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

    @if (showLogoCropper && tempLogoFile) {
      <app-logo-cropper-modal
        [imageFile]="tempLogoFile"
        (aplicar)="onLogoCropApplied($event)"
        (cancelar)="showLogoCropper = false; tempLogoFile = null">
      </app-logo-cropper-modal>
    }

    @if (showMembreteModal) {
      <app-membrete-preview-modal
        [imagenUrl]="institucionSvc.resolveMembreteUrl((institucionSvc.config$ | async)?.membreteUrl) || 'assets/logos/hoja_membretada_oficial.png'"
        (cerrar)="showMembreteModal = false">
      </app-membrete-preview-modal>
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

    /* Identidad Institucional Styles */
    .institucion-card {
      border: 1px solid rgba(59, 130, 246, 0.25);
      background: linear-gradient(180deg, rgba(59, 130, 246, 0.04) 0%, var(--bg-surface) 100%);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .inst-actions-top { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .inst-top-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    @media (max-width: 900px) { .inst-top-grid { grid-template-columns: 1fr; } }
    .asset-box { background: var(--bg-dark); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .asset-title-row { display: flex; flex-direction: column; gap: 2px; }
    .asset-title { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
    .asset-hint { font-size: 0.74rem; color: var(--text-muted); }
    .asset-preview-wrap { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .logo-preview-box { width: 95px; height: 95px; border-radius: 12px; background: #ffffff; display: flex; align-items: center; justify-content: center; padding: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.18); border: 1px solid rgba(0,0,0,0.08); flex-shrink: 0; }
    .preview-logo-img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .asset-btns { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 170px; }
    .membrete-content-layout { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .mini-sheet-container {
      width: 80px; height: 110px; background: #ffffff; border-radius: 6px;
      overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      position: relative; cursor: pointer; flex-shrink: 0; transition: transform 0.2s, box-shadow 0.2s;
    }
    .mini-sheet-container:hover { transform: scale(1.04); box-shadow: 0 6px 18px rgba(0,0,0,0.45); }
    .mini-sheet-preview-img { width: 100%; height: 100%; object-fit: cover; }
    .mini-sheet-zoom-overlay {
      position: absolute; inset: 0; background: rgba(15,23,42,0.65);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s;
    }
    .mini-sheet-zoom-overlay span { color: #fff; font-size: 0.65rem; font-weight: 700; text-align: center; }
    .mini-sheet-container:hover .mini-sheet-zoom-overlay { opacity: 1; }

    /* Formulario amplio */
    .inst-data-form-box {
      background: var(--bg-dark); border: 1px solid var(--border);
      border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; gap: 16px;
    }
    .inst-form-header { display: flex; flex-direction: column; gap: 2px; }
    .inst-form-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .inst-form-hint { font-size: 0.75rem; color: var(--text-muted); }
    .inst-form-stack { display: flex; flex-direction: column; gap: 14px; }
    .inst-field-row { display: flex; flex-direction: column; gap: 6px; width: 100%; }
    .inst-row-split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 680px) { .inst-row-split { grid-template-columns: 1fr; } }
    .inst-label { font-size: 0.82rem; font-weight: 700; color: var(--text-secondary); }
    .inst-full-input {
      width: 100%; padding: 10px 14px; font-size: 0.92rem; font-weight: 500;
      border-radius: 8px; border: 1px solid var(--border);
      background: rgba(255,255,255,0.03); color: var(--text-primary);
      outline: none; box-sizing: border-box; transition: all 0.2s;
    }
    .inst-full-input:focus {
      border-color: var(--primary); background: rgba(59,130,246,0.05);
      box-shadow: 0 0 0 2px rgba(59,130,246,0.25);
    }
    .inst-full-textarea {
      width: 100%; padding: 10px 14px; font-size: 0.92rem; font-weight: 500;
      border-radius: 8px; border: 1px solid var(--border);
      background: rgba(255,255,255,0.03); color: var(--text-primary);
      outline: none; box-sizing: border-box; resize: vertical; line-height: 1.4;
      transition: all 0.2s;
    }
    .inst-full-textarea:focus {
      border-color: var(--primary); background: rgba(59,130,246,0.05);
      box-shadow: 0 0 0 2px rgba(59,130,246,0.25);
    }
    .btn-outline-primary { background: transparent; border: 1px solid var(--primary); color: var(--primary); }
    .btn-outline-primary:hover { background: rgba(59,130,246,0.12); }
    .btn-outline-warning { background: transparent; border: 1px solid #f59e0b; color: #fbbf24; }
    .btn-outline-warning:hover { background: rgba(245,158,11,0.15); }
    .status-dot.online { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.6); }
  `]
})
export class AdminComponent implements OnInit {
  institucionSvc = inject(InstitucionService);

  usuarios: UserResponse[] = [];
  selectedUser: UserResponse | null = null;
  showModal = false;
  totalObras = 0;

  anioActual = new Date().getFullYear();
  ejercicioCierre = new Date().getFullYear();
  obrasPendientesCierre = 0;
  cargandoCierre = false;

  institucionForm: InstitucionConfigRequest = {
    nombreMunicipio: '',
    lemaOficial: '',
    periodoAdministracion: '',
    dependencia: '',
    piePaginaReporte: ''
  };
  subiendoLogo = false;
  subiendoMembrete = false;
  guardandoInstitucion = false;

  showLogoCropper = false;
  tempLogoFile: File | null = null;
  showMembreteModal = false;

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
    this.cargarDatosInstitucion();
  }

  cargarDatosInstitucion() {
    this.institucionSvc.config$.subscribe(cfg => {
      if (cfg) {
        this.institucionForm = {
          nombreMunicipio: cfg.nombreMunicipio || '',
          lemaOficial: cfg.lemaOficial || '',
          periodoAdministracion: cfg.periodoAdministracion || '',
          dependencia: cfg.dependencia || '',
          piePaginaReporte: cfg.piePaginaReporte || ''
        };
      }
    });
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
    const mesActual = new Date().getMonth() + 1;
    const esDiciembre = (mesActual === 12);

    if (!esDiciembre) {
      Swal.fire({
        title: '📅 Cierre Fiscal Permitido en Diciembre',
        html: `
          <div style="text-align: left; font-size: 0.9rem; line-height: 1.5; color: #cbd5e1;">
            <p>Por normativa gubernamental y contable, el <strong>Cierre de Ejercicio Fiscal</strong> únicamente puede ejecutarse formalmente durante el último mes del año (<strong>Diciembre</strong>).</p>
            <p style="color: #f59e0b; margin-top: 8px;">Actualmente el sistema se encuentra en el <strong>Mes ${mesActual}</strong>.</p>
            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 12px 0;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:#93c5fd; font-size:0.85rem;">
              <input type="checkbox" id="chkForzarAdmin" style="cursor:pointer;" />
              Habilitar Cierre Anticipado (Modo Pruebas / Demostración)
            </label>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Continuar Cierre',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d97706',
        cancelButtonColor: '#4b5563',
        background: '#1e293b',
        color: '#f8fafc',
        preConfirm: () => {
          const chk = (document.getElementById('chkForzarAdmin') as HTMLInputElement)?.checked;
          if (!chk) {
            Swal.showValidationMessage('El cierre está reservado para Diciembre. Marca la casilla si deseas realizar una prueba anticipada.');
            return false;
          }
          return true;
        }
      }).then((result) => {
        if (result.isConfirmed) {
          this.pedirConfirmacionTexto(true);
        }
      });
    } else {
      this.pedirConfirmacionTexto(false);
    }
  }

  private pedirConfirmacionTexto(forzar: boolean) {
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
        this.ejecutarCierre(forzar);
      }
    });
  }

  ejecutarCierre(forzar = false) {
    this.cargandoCierre = true;
    this.svc.ejecutarCierreFiscal(this.ejercicioCierre, forzar).subscribe({
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

  guardarDatosInstitucion() {
    if (!this.institucionForm.nombreMunicipio?.trim()) {
      this.toastSvc.show('El nombre del municipio es obligatorio', 'warning');
      return;
    }
    this.guardandoInstitucion = true;
    this.institucionSvc.actualizarDatos(this.institucionForm).subscribe({
      next: () => {
        this.guardandoInstitucion = false;
        this.toastSvc.show('✅ Datos institucionales actualizados correctamente.', 'success');
      },
      error: (err) => {
        this.guardandoInstitucion = false;
        this.toastSvc.show(err.error?.message || 'Error al actualizar los datos institucionales.', 'error');
      }
    });
  }

  onLogoFilePicked(event: any) {
    const file: File = event.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toastSvc.show('El archivo debe ser una imagen (PNG, JPG, SVG, WebP)', 'warning');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      this.toastSvc.show('La imagen no debe superar los 15 MB', 'warning');
      return;
    }
    this.tempLogoFile = file;
    this.showLogoCropper = true;
    event.target.value = '';
  }

  onLogoCropApplied(adjustedFile: File) {
    this.showLogoCropper = false;
    this.tempLogoFile = null;
    this.subiendoLogo = true;
    this.institucionSvc.subirLogo(adjustedFile).subscribe({
      next: () => {
        this.subiendoLogo = false;
        this.toastSvc.show('✅ Logotipo ajustado y guardado correctamente.', 'success');
      },
      error: (err) => {
        this.subiendoLogo = false;
        this.toastSvc.show(err.error?.message || 'Error al subir el logotipo.', 'error');
      }
    });
  }

  verVistaPreviaMembrete() {
    this.showMembreteModal = true;
  }

  activarMembreteOficialTlaxiaco() {
    this.subiendoMembrete = true;
    fetch('assets/logos/hoja_membretada_oficial.png')
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'hoja_membretada_tlaxiaco_2025_2027.png', { type: 'image/png' });
        this.institucionSvc.subirMembrete(file).subscribe({
          next: () => {
            this.subiendoMembrete = false;
            this.toastSvc.show('✅ Hoja membretada oficial de Tlaxiaco activada con éxito.', 'success');
          },
          error: (err) => {
            this.subiendoMembrete = false;
            this.toastSvc.show('Error activando la hoja oficial: ' + (err.error?.message || err.message), 'error');
          }
        });
      })
      .catch(() => {
        this.subiendoMembrete = false;
        this.toastSvc.show('No se pudo cargar el archivo local de la hoja oficial.', 'error');
      });
  }

  onMembreteSelected(event: any) {
    const file: File = event.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      this.toastSvc.show('El archivo debe ser una imagen (PNG, JPG) o PDF', 'warning');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      this.toastSvc.show('El membrete no debe superar los 20 MB', 'warning');
      return;
    }
    this.subiendoMembrete = true;
    this.institucionSvc.subirMembrete(file).subscribe({
      next: () => {
        this.subiendoMembrete = false;
        this.toastSvc.show('✅ Hoja membretada oficial actualizada con éxito.', 'success');
        event.target.value = '';
      },
      error: (err) => {
        this.subiendoMembrete = false;
        this.toastSvc.show(err.error?.message || 'Error al subir la hoja membretada.', 'error');
        event.target.value = '';
      }
    });
  }

  restablecerLogo() {
    Swal.fire({
      title: '🔄 ¿Restablecer logotipo?',
      text: 'Se volverá a mostrar el logotipo predeterminado del sistema.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, restablecer',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#4B5563',
      background: '#1F2937',
      color: '#F9FAFB'
    }).then((r) => {
      if (r.isConfirmed) {
        this.institucionSvc.restablecerLogo().subscribe({
          next: () => this.toastSvc.show('Logotipo restablecido al predeterminado.', 'info'),
          error: (err) => this.toastSvc.show(err.error?.message || 'Error al restablecer.', 'error')
        });
      }
    });
  }

  restablecerMembrete() {
    Swal.fire({
      title: '🔄 ¿Usar membrete estándar?',
      text: 'Se eliminará la plantilla personalizada y los reportes usarán el encabezado institucional estándar.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, usar estándar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#4B5563',
      background: '#1F2937',
      color: '#F9FAFB'
    }).then((r) => {
      if (r.isConfirmed) {
        this.institucionSvc.restablecerMembrete().subscribe({
          next: () => this.toastSvc.show('Membrete restablecido al estándar.', 'info'),
          error: (err) => this.toastSvc.show(err.error?.message || 'Error al restablecer.', 'error')
        });
      }
    });
  }

  generarPdfMuestra() {
    const doc = new jsPDF('p', 'pt', 'letter');
    const pageWidth = 612;
    const pageHeight = 792;
    const cfg = this.institucionSvc.currentConfig;

    const membreteUrl = this.institucionSvc.resolveMembreteUrl(cfg.membreteUrl);
    if (membreteUrl) {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          doc.addImage(img, 'PNG', 0, 0, pageWidth, pageHeight);
        } catch (e) {
          console.warn('No se pudo incrustar imagen de membrete completa, dibujando encabezado vectorial.', e);
        }
        this.dibujarCuerpoPdfMuestra(doc, cfg, pageWidth, pageHeight);
        doc.save(`muestra_membrete_${(cfg.periodoAdministracion || 'oficial').replace(/\s+/g, '_')}.pdf`);
      };
      img.onerror = () => {
        this.dibujarEncabezadoVectorial(doc, cfg, pageWidth);
        this.dibujarCuerpoPdfMuestra(doc, cfg, pageWidth, pageHeight);
        doc.save(`muestra_membrete_${(cfg.periodoAdministracion || 'oficial').replace(/\s+/g, '_')}.pdf`);
      };
      img.src = membreteUrl;
    } else {
      this.dibujarEncabezadoVectorial(doc, cfg, pageWidth);
      this.dibujarCuerpoPdfMuestra(doc, cfg, pageWidth, pageHeight);
      doc.save(`muestra_membrete_${(cfg.periodoAdministracion || 'oficial').replace(/\s+/g, '_')}.pdf`);
    }
  }

  private dibujarEncabezadoVectorial(doc: jsPDF, cfg: any, pageWidth: number) {
    doc.setFillColor(30, 45, 61);
    doc.rect(0, 0, pageWidth, 55, 'F');

    doc.setFillColor(232, 160, 32);
    doc.rect(0, 55, pageWidth, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text((cfg.nombreMunicipio || 'H. AYUNTAMIENTO CONSTITUCIONAL').toUpperCase(), pageWidth / 2, 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(240, 240, 240);
    doc.text((cfg.dependencia || 'DIRECCIÓN DE OBRAS PÚBLICAS').toUpperCase(), pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(232, 160, 32);
    doc.text((cfg.periodoAdministracion || 'ADMINISTRACIÓN MUNICIPAL').toUpperCase(), pageWidth / 2, 47, { align: 'center' });
  }

  private dibujarCuerpoPdfMuestra(doc: jsPDF, cfg: any, pageWidth: number, pageHeight: number) {
    doc.setTextColor(220, 225, 230);
    doc.setFontSize(40);
    doc.setFont('helvetica', 'bold');
    doc.text('DOCUMENTO DE MUESTRA', pageWidth / 2, 420, { align: 'center', angle: 35 });

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('HOJA DE MUESTRA DE IDENTIDAD INSTITUCIONAL', pageWidth / 2, 110, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    if (cfg.lemaOficial) {
      doc.text(`"${cfg.lemaOficial}"`, pageWidth / 2, 126, { align: 'center' });
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(1);
    doc.line(50, 140, pageWidth - 50, 140);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(50, 160, pageWidth - 100, 130, 6, 6, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('PARAMETROS VIGENTES DE LA ADMINISTRACIÓN', 65, 182);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    doc.text(`• Municipio / Gobierno:`, 65, 204);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cfg.nombreMunicipio || 'No definido'}`, 190, 204);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Período Constitucional:`, 65, 222);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cfg.periodoAdministracion || 'No definido'}`, 190, 222);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Dependencia Operativa:`, 65, 240);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cfg.dependencia || 'No definido'}`, 190, 240);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Lema Oficial:`, 65, 258);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cfg.lemaOficial || 'No definido'}`, 190, 258);

    doc.setFont('helvetica', 'normal');
    doc.text(`• Tipo de Membrete:`, 65, 276);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cfg.membreteUrl ? 'Personalizado (Plantilla cargada)' : 'Predeterminado (Vectorial automático)'}`, 190, 276);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const explicacion = 'Esta página es una demostración en vivo de la configuración institucional vigente. Todos los reportes generados en el sistema (Fichas Técnicas de Obra, Padrón General de Obras, Integración de Expediente Unitario y Oficios Oficiales) utilizarán automáticamente estos encabezados, logotipos y lemas sin requerir modificaciones técnicas.';
    const lines = doc.splitTextToSize(explicacion, pageWidth - 100);
    doc.text(lines, 50, 320);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.8);
    doc.line(50, pageHeight - 55, pageWidth - 50, pageHeight - 55);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(cfg.piePaginaReporte || 'Palacio Municipal s/n, Centro.', pageWidth / 2, pageHeight - 40, { align: 'center' });
    doc.text(`Fecha de impresión: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth / 2, pageHeight - 28, { align: 'center' });
  }
}
