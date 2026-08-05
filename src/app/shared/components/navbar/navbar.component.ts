import { Component, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotifPanelComponent } from '../notif-panel/notif-panel.component';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard de Control',
  '/mapa': 'Geolocalización de Obras',
  '/admin': 'Administración del Sistema',
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [NotifPanelComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  showNotif = signal(false);
  pageTitle = signal('Dashboard de Control');
  auth = inject(AuthService);
  notifSvc = inject(NotificacionService);
  themeSvc = inject(ThemeService);

  constructor(router: Router) {
    router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      const base = '/' + e.urlAfterRedirects.split('/')[1];
      this.pageTitle.set(PAGE_TITLES[base] ?? 'Expediente de Obra');
    });
  }

  toggleNotif(): void { this.showNotif.update(v => !v); }

  rolLabel(): string {
    const labels: Record<string, string> = { ADMINISTRADOR: 'Administrador', SUPERVISOR: 'Residente', AUDITOR: 'Lector' };
    const roles = this.auth.usuario()?.roles;
    const role = roles && roles.length > 0 ? roles[0] : 'AUDITOR';
    return labels[role] ?? 'Lector';
  }
}
