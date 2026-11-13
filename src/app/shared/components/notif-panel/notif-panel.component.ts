import { Component, output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { ObrasService } from '../../../core/services/obras.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Notificacion } from '../../../core/models/notification.model';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-notif-panel',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="notif-panel animate-fade-in-up">
      <div class="notif-head">
        <span class="notif-title">Notificaciones</span>
        <div class="notif-actions">
          @if (svc.noLeidas() > 0) {
            <button class="btn-ghost-sm" (click)="svc.marcarTodasLeidas()">Marcar todas</button>
          }
          <button class="close-btn" (click)="close.emit()">✕</button>
        </div>
      </div>
      <div class="notif-list">
        @for (n of svc.notifs(); track n.id) {
          <div class="notif-item" [class.unread]="!n.leida" (click)="abrirNotificacion(n)">
            <span class="notif-ico">
              <app-icon [name]="svc.getIconName(n.tipo)" [color]="svc.getIconColor(n.tipo)" [size]="18"></app-icon>
            </span>
            <div class="notif-body">
              <p class="notif-titulo">{{ n.titulo }}</p>
              <p class="notif-msg">{{ n.mensaje }}</p>
              <div class="notif-meta">
                @if (n.obraNombre) { <span class="obra-tag">{{ n.obraNombre }}</span> }
                <span class="notif-time">{{ svc.tiempoRelativo(n.createdAt) }}</span>
              </div>
            </div>
            @if (!n.leida) { <div class="unread-dot"></div> }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .notif-panel {
      position: absolute; top: calc(100% + 8px); right: 0;
      width: 380px; max-height: 520px;
      background: var(--bg-surface); border: 1px solid var(--border-light);
      border-radius: 16px; box-shadow: var(--shadow-lg);
      display: flex; flex-direction: column; overflow: hidden; z-index: 200;
    }
    .notif-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border);
    }
    .notif-title { font-weight: 700; font-size: 0.95rem; }
    .notif-actions { display: flex; align-items: center; gap: 8px; }
    .btn-ghost-sm {
      background: none; border: none; color: var(--accent);
      font-size: 0.78rem; cursor: pointer; font-family: 'Inter', sans-serif;
    }
    .close-btn {
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; font-size: 0.9rem; padding: 4px 6px;
    }
    .notif-list { overflow-y: auto; flex: 1; }
    .notif-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 14px 20px; cursor: pointer; transition: var(--transition);
      position: relative; border-bottom: 1px solid var(--border);
    }
    .notif-item:hover { background: rgba(255,255,255,0.03); }
    .notif-item.unread { background: rgba(232,160,32,0.04); }
    .notif-ico { font-size: 1.2rem; flex-shrink: 0; margin-top: 2px; }
    .notif-titulo { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
    .notif-msg { font-size: 0.78rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 6px; }
    .notif-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .obra-tag {
      font-size: 0.7rem; background: rgba(59,130,246,0.12); color: var(--info);
      padding: 2px 8px; border-radius: 10px;
    }
    .notif-time { font-size: 0.7rem; color: var(--text-muted); }
    .unread-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--accent); flex-shrink: 0; margin-top: 6px;
    }
  `]
})
export class NotifPanelComponent {
  close = output<void>();
  svc = inject(NotificacionService);
  private router = inject(Router);
  private obrasSvc = inject(ObrasService);
  private auth = inject(AuthService);
  private toastSvc = inject(ToastService);

  abrirNotificacion(n: Notificacion): void {
    if (!n.leida) {
      this.svc.marcarLeida(n.id);
    }
    this.close.emit();

    if (n.obraId) {
      if (!this.auth.isAuthenticated()) {
        return;
      }
      this.obrasSvc.getObraById(n.obraId).subscribe({
        next: (obra) => {
          if (!obra) {
            this.toastSvc.show('La obra asociada a esta notificación no fue encontrada.', 'warning');
            return;
          }
          if (obra.estatus === 'ELIMINADA') {
            this.toastSvc.show('🗑️ Esta obra está en la Papelera y no puede consultarse.', 'warning');
            return;
          }
          this.router.navigate(['/obras', n.obraId]).catch(() => {
            this.toastSvc.show('No fue posible navegar al expediente de la obra.', 'error');
          });
        },
        error: (err) => {
          if (err?.status === 403 || err?.status === 401) {
            this.toastSvc.show('No tienes permisos para consultar esta obra.', 'error');
          } else {
            this.toastSvc.show('No se pudo abrir el expediente de la obra.', 'warning');
          }
        }
      });
    }
  }
}
