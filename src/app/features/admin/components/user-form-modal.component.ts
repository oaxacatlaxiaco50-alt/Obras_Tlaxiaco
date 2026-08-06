import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserResponse, Rol } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="modal-backdrop" (click)="onClose()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ user ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
          <button class="close-btn" (click)="onClose()">×</button>
        </div>
        
        <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="user-form">
          <div class="form-grid">
            <div class="form-group">
              <label>Nombre(s)</label>
              <input type="text" formControlName="firstName" class="form-control" [class.is-invalid]="invalidField('firstName')">
            </div>
            <div class="form-group">
              <label>Apellidos</label>
              <input type="text" formControlName="lastName" class="form-control" [class.is-invalid]="invalidField('lastName')">
            </div>
          </div>
          
          <div class="form-group">
            <label>Correo Electrónico</label>
            <input type="email" formControlName="email" class="form-control" [class.is-invalid]="invalidField('email')">
          </div>
          
          <div class="form-grid">
            <div class="form-group">
              <label>Nombre de Usuario</label>
              <input type="text" formControlName="username" class="form-control" [class.is-invalid]="invalidField('username')" [readonly]="!!user">
              @if (user) { <small class="hint">El nombre de usuario no se puede cambiar</small> }
            </div>
            <div class="form-group">
              <label>Contraseña</label>
              <input type="password" formControlName="password" class="form-control" [class.is-invalid]="invalidField('password')" placeholder="••••••••">
              @if (user) { <small class="hint">Dejar en blanco para mantener la actual</small> }
            </div>
          </div>
          
          <div class="form-group">
            <label>Rol del Sistema</label>
            <select formControlName="role" class="form-control" [class.is-invalid]="invalidField('role')">
              <option value="">Seleccione un rol...</option>
              <option value="ADMINISTRADOR">Administrador (Acceso Total)</option>
              <option value="SUPERVISOR">Supervisor / Residente</option>
              <option value="CONTRATISTA">Contratista (Empresa)</option>
              <option value="AUDITOR">Auditor (Lectura)</option>
            </select>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="onClose()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="userForm.invalid">Guardar Usuario</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
      z-index: 1000; backdrop-filter: blur(4px);
    }
    .modal-content {
      background: var(--bg-card, #1e293b); width: 100%; max-width: 500px;
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
    .form-control {
      background: rgba(15, 23, 42, 0.6); border: 1px solid #334155;
      padding: 10px 12px; border-radius: 6px; color: white; font-family: inherit;
    }
    .form-control:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
    .form-control.is-invalid { border-color: #ef4444; }
    .form-control[readonly] { opacity: 0.7; cursor: not-allowed; }
    .hint { font-size: 0.75rem; color: #94a3b8; margin-top: 4px; }
    .modal-footer {
      margin-top: 8px; display: flex; justify-content: flex-end; gap: 12px;
      padding-top: 16px; border-top: 1px solid var(--border);
    }
  `]
})
export class UserFormModalComponent implements OnInit {
  @Input() user: UserResponse | null = null;
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();
  
  userForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.userForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
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
    } else {
      this.userForm.get('password')?.setValidators(Validators.required);
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  invalidField(field: string): boolean {
    const ctrl = this.userForm.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  onSubmit() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    const val = this.userForm.getRawValue(); // gets disabled fields too
    const data = {
      ...val,
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
