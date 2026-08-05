import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificacion.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  collapsed = signal(false);
  auth = inject(AuthService);
  notifSvc = inject(NotificacionService);
  toggle() { this.collapsed.update(v => !v); }
  getRolClass(): string {
    const m: Record<string, string> = { ADMINISTRADOR: 'badge-admin', SUPERVISOR: 'badge-residente', AUDITOR: 'badge-lector' };
    const roles = this.auth.usuario()?.roles;
    const role = roles && roles.length > 0 ? roles[0] : 'AUDITOR';
    return m[role] ?? 'badge-lector';
  }
}
