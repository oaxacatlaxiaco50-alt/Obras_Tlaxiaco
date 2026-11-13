import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserResponse } from '../../../core/models/user.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    <div class="modal-backdrop" (click)="onClose()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 style="display: flex; align-items: center; gap: 8px;">
            @if (user) {
              <app-icon name="pencil" [size]="18" color="var(--accent)"></app-icon>
              <span>Editar Usuario</span>
            } @else {
              <app-icon name="user-plus" [size]="18" color="var(--accent)"></app-icon>
              <span>Nuevo Usuario</span>
            }
          </h2>
          <button class="close-btn" (click)="onClose()">×</button>
        </div>
        
        <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="user-form" novalidate>
          <div class="form-grid">
            <div class="form-group">
              <label>Nombre(s) <span class="req">*</span></label>
              <input
                type="text"
                formControlName="firstName"
                class="form-control"
                placeholder="Ej. Juan Carlos"
                [class.is-invalid]="invalidField('firstName')"
              >
              @if (invalidField('firstName')) {
                <small class="error-msg">El nombre es obligatorio.</small>
              }
            </div>
            <div class="form-group">
              <label>Apellidos <span class="req">*</span></label>
              <input
                type="text"
                formControlName="lastName"
                class="form-control"
                placeholder="Ej. Pérez López"
                [class.is-invalid]="invalidField('lastName')"
              >
              @if (invalidField('lastName')) {
                <small class="error-msg">Los apellidos son obligatorios.</small>
              }
            </div>
          </div>
          
          <div class="form-group">
            <label>Correo Electrónico <span class="req">*</span></label>
            <input
              type="email"
              formControlName="email"
              class="form-control"
              placeholder="ejemplo@tlaxiaco.gob.mx"
              [class.is-invalid]="invalidField('email') || isEmailTaken()"
            >
            @if (invalidField('email')) {
              @if (userForm.get('email')?.errors?.['required']) {
                <small class="error-msg">El correo electrónico es obligatorio.</small>
              } @else if (userForm.get('email')?.errors?.['email']) {
                <small class="error-msg">Ingresa un formato de correo válido (ej. usuario&#64;dominio.com).</small>
              }
            } @else if (isEmailTaken()) {
              <small class="error-msg">Este correo electrónico ya está registrado. Usa otro diferente.</small>
            }
          </div>
          
          <div class="form-grid">
            <div class="form-group">
              <label>Nombre de Usuario <span class="req">*</span></label>
              <input
                type="text"
                formControlName="username"
                class="form-control"
                placeholder="Mínimo 3 caracteres"
                [class.is-invalid]="invalidField('username') || isUsernameTaken()"
                [readonly]="!!user"
              >
              @if (user) {
                <small class="hint" style="display: flex; align-items: center; gap: 4px;">
                  <app-icon name="lock" [size]="12"></app-icon> El nombre de usuario no se puede modificar
                </small>
              } @else if (isUsernameTaken()) {
                <small class="error-msg">El usuario "&#64;{{ userForm.get('username')?.value?.trim() }}" ya está ocupado. Usa otro.</small>
              } @else if (invalidField('username')) {
                @if (userForm.get('username')?.errors?.['required']) {
                  <small class="error-msg">El nombre de usuario es obligatorio.</small>
                } @else if (userForm.get('username')?.errors?.['minlength']) {
                  <small class="error-msg">Debe tener al menos 3 caracteres.</small>
                }
              } @else if (userForm.get('username')?.value?.trim()?.length >= 3) {
                <small class="ok-msg" style="display: flex; align-items: center; gap: 4px;">
                  <app-icon name="check-circle" [size]="12" color="#10b981"></app-icon> Nombre de usuario disponible
                </small>
              }
            </div>
            <div class="form-group">
              <label>Contraseña @if (!user) { <span class="req">*</span> }</label>
              <input
                type="password"
                formControlName="password"
                class="form-control"
                [class.is-invalid]="invalidField('password')"
                placeholder="Mínimo 8 caracteres"
              >
              @if (user && !invalidField('password')) {
                <small class="hint">Dejar en blanco para mantener la actual</small>
              }
              @if (invalidField('password')) {
                @if (userForm.get('password')?.errors?.['required']) {
                  <small class="error-msg">La contraseña es obligatoria.</small>
                } @else if (userForm.get('password')?.errors?.['minlength']) {
                  <small class="error-msg">
                    Mínimo 8 caracteres (actual: {{ userForm.get('password')?.value?.length || 0 }}/8).
                  </small>
                }
              }
            </div>
          </div>
          
          <div class="form-group">
            <label>Rol del Sistema <span class="req">*</span></label>
            <select formControlName="role" class="form-control" [class.is-invalid]="invalidField('role')">
              <option value="">Seleccione un rol...</option>
              <option value="ADMINISTRADOR">Administrador (Acceso Total)</option>
              <option value="SUPERVISOR">Supervisor / Residente</option>
              <option value="CONTRATISTA">Contratista (Empresa)</option>
              <option value="AUDITOR">Auditor (Lectura)</option>
            </select>
            @if (invalidField('role')) {
              <small class="error-msg">Debes seleccionar un rol para el usuario.</small>
            }
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="onClose()">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px;">
              @if (user) {
                <app-icon name="save" [size]="15"></app-icon>
                <span>Guardar Cambios</span>
              } @else {
                <app-icon name="user-plus" [size]="15"></app-icon>
                <span>Crear Usuario</span>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center;
      z-index: 1000; backdrop-filter: blur(4px);
    }
    .modal-content {
      background: var(--bg-card, #1e293b); width: 100%; max-width: 520px;
      border-radius: 12px; border: 1px solid var(--border);
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    .modal-header {
      padding: 20px 24px; border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center;
    }
    .modal-header h2 { font-size: 1.2rem; font-weight: 700; margin: 0; color: white; }
    .close-btn { background: transparent; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; }
    .close-btn:hover { color: white; }
    .user-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 0.85rem; font-weight: 600; color: #cbd5e1; }
    .req { color: #f87171; }
    .form-control {
      background: rgba(15, 23, 42, 0.6); border: 1px solid #334155;
      padding: 10px 12px; border-radius: 6px; color: white; font-family: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .form-control:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
    .form-control.is-invalid { border-color: #ef4444; box-shadow: 0 0 0 2px rgba(239,68,68,0.18); }
    .form-control[readonly] { opacity: 0.7; cursor: not-allowed; }
    .hint { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
    .error-msg { font-size: 0.76rem; color: #f87171; font-weight: 500; margin-top: 2px; line-height: 1.3; }
    .ok-msg { font-size: 0.75rem; color: #34d399; font-weight: 500; margin-top: 2px; }
    .modal-footer {
      margin-top: 8px; display: flex; justify-content: flex-end; gap: 12px;
      padding-top: 16px; border-top: 1px solid var(--border);
    }
  `]
})
export class UserFormModalComponent implements OnInit {
  @Input() user: UserResponse | null = null;
  @Input() existingUsers: UserResponse[] = [];
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();
  
  userForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      password: [''],
      role: ['', Validators.required]
    });
  }

  ngOnInit() {
    if (this.user) {
      this.userForm.patchValue({
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        email: this.user.email,
        username: this.user.username,
        role: this.user.roles[0] || ''
      });
      this.userForm.get('username')?.disable();
      // Al editar, si escribe contraseña debe tener mínimo 8 caracteres
      this.userForm.get('password')?.setValidators([Validators.minLength(8)]);
      this.userForm.get('password')?.updateValueAndValidity();
    } else {
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  invalidField(field: string): boolean {
    const ctrl = this.userForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  }

  isUsernameTaken(): boolean {
    if (this.user) return false;
    const raw = (this.userForm.get('username')?.value || '').trim().toLowerCase();
    if (!raw) return false;
    return this.existingUsers.some(u => u.username.toLowerCase() === raw);
  }

  isEmailTaken(): boolean {
    const raw = (this.userForm.get('email')?.value || '').trim().toLowerCase();
    if (!raw) return false;
    return this.existingUsers.some(u =>
      u.email.toLowerCase() === raw && (!this.user || u.id !== this.user.id)
    );
  }

  onSubmit() {
    this.userForm.markAllAsTouched();

    // 1. Verificar primero si el nombre de usuario ya está ocupado
    if (this.isUsernameTaken()) {
      const uname = (this.userForm.get('username')?.value || '').trim();
      Swal.fire({
        title: '🚫 Nombre de usuario ocupado',
        html: `El nombre de usuario <strong>&#64;${uname}</strong> ya está registrado en el sistema.<br><br>Por favor ingresa un nombre de usuario diferente.`,
        icon: 'warning',
        confirmButtonColor: '#E8A020',
        confirmButtonText: 'Elegir otro usuario',
        background: '#1F2937',
        color: '#F9FAFB'
      });
      return;
    }

    // 2. Verificar si el correo electrónico ya está ocupado
    if (this.isEmailTaken()) {
      const email = (this.userForm.get('email')?.value || '').trim();
      Swal.fire({
        title: '🚫 Correo electrónico ya registrado',
        html: `El correo <strong>${email}</strong> ya pertenece a otro usuario.<br><br>Por favor ingresa un correo electrónico diferente.`,
        icon: 'warning',
        confirmButtonColor: '#E8A020',
        confirmButtonText: 'Cambiar correo',
        background: '#1F2937',
        color: '#F9FAFB'
      });
      return;
    }

    // 3. Verificar si faltan campos o hay errores de formato
    if (this.userForm.invalid) {
      const errores: string[] = [];
      if (this.userForm.get('firstName')?.invalid) {
        errores.push('• <strong>Nombre(s):</strong> Es obligatorio.');
      }
      if (this.userForm.get('lastName')?.invalid) {
        errores.push('• <strong>Apellidos:</strong> Son obligatorios.');
      }
      if (this.userForm.get('email')?.errors?.['required']) {
        errores.push('• <strong>Correo electrónico:</strong> Es obligatorio.');
      } else if (this.userForm.get('email')?.errors?.['email']) {
        errores.push('• <strong>Correo electrónico:</strong> El formato no es válido (ej. usuario@correo.com).');
      }
      if (!this.user && this.userForm.get('username')?.errors?.['required']) {
        errores.push('• <strong>Nombre de usuario:</strong> Es obligatorio.');
      } else if (!this.user && this.userForm.get('username')?.errors?.['minlength']) {
        errores.push('• <strong>Nombre de usuario:</strong> Debe tener al menos 3 caracteres.');
      }
      if (this.userForm.get('password')?.errors?.['required']) {
        errores.push('• <strong>Contraseña:</strong> Es obligatoria.');
      } else if (this.userForm.get('password')?.errors?.['minlength']) {
        errores.push('• <strong>Contraseña:</strong> Debe tener al menos 8 caracteres.');
      }
      if (this.userForm.get('role')?.invalid) {
        errores.push('• <strong>Rol del Sistema:</strong> Debes seleccionar un rol.');
      }

      Swal.fire({
        title: '⚠️ Faltan datos o hay errores en el formulario',
        html: `<div style="text-align:left; font-size:0.9rem; line-height:1.6;">Por favor corrige los siguientes campos antes de continuar:<br><br>${errores.join('<br>')}</div>`,
        icon: 'warning',
        confirmButtonColor: '#3B82F6',
        confirmButtonText: 'Revisar campos',
        background: '#1F2937',
        color: '#F9FAFB'
      });
      return;
    }

    const val = this.userForm.getRawValue();
    const data = {
      ...val,
      firstName: val.firstName.trim(),
      lastName: val.lastName.trim(),
      email: val.email.trim(),
      username: val.username.trim(),
      roles: [val.role]
    };
    if (!data.password) {
      delete data.password;
    }
    this.save.emit(data);
  }

  onClose() {
    this.close.emit();
  }
}
