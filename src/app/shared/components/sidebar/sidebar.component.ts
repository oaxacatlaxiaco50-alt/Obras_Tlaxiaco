import { Component, signal, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { InstitucionService } from '../../../core/services/institucion.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AsyncPipe, IconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  collapsed = signal(false);
  auth = inject(AuthService);
  notifSvc = inject(NotificacionService);
  institucionSvc = inject(InstitucionService);

  toggle() { this.collapsed.update(v => !v); }
  getRolClass(): string {
    const m: Record<string, string> = { ADMINISTRADOR: 'badge-admin', SUPERVISOR: 'badge-residente', AUDITOR: 'badge-lector' };
    const roles = this.auth.usuario()?.roles;
    const role = roles && roles.length > 0 ? roles[0] : 'AUDITOR';
    return m[role] ?? 'badge-lector';
  }
}
