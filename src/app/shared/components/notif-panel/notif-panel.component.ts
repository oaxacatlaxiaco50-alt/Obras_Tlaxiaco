import { Component, output, inject } from '@angular/core';
import { NotificacionService } from '../../../core/services/notificacion.service';

@Component({
  selector: 'app-notif-panel',
  standalone: true,
  imports: [],
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
          <div class="notif-item" [class.unread]="!n.leida" (click)="svc.marcarLeida(n.id)">
            <span class="notif-ico">{{ svc.getIcono(n.tipo) }}</span>
            <div class="notif-body">
              <p class="notif-titulo">{{ n.titulo }}</p>
              <p class="notif-msg">{{ n.mensaje }}</p>
              <div class="notif-meta">
                @if (n.obraNombre) { <span class="obra-tag">{{ n.obraNombre }}</span> }
                <span class="notif-time">{{ svc.tiempoRelativo(n.fecha) }}</span>
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
}
