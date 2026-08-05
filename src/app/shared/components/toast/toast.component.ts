import { Component, inject } from '@angular/core';
import { ToastService, Toast } from '../../../core/services/toast.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="toast-container">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div class="toast animate-slide-in-right" [ngClass]="toast.type">
          <span class="toast-icon">{{ getIcon(toast.type) }}</span>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" (click)="toastSvc.remove(toast.id)">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container { position: fixed; top: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 12px; pointer-events: none; }
    .toast { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-radius: 8px; color: #fff; font-weight: 500; font-size: 0.9rem; box-shadow: 0 10px 25px rgba(0,0,0,0.3); pointer-events: auto; min-width: 300px; max-width: 450px; border-left: 4px solid rgba(255,255,255,0.3); }
    .toast.success { background: var(--success); }
    .toast.error { background: var(--danger); }
    .toast.info { background: var(--info); }
    .toast.warning { background: var(--warning); }
    .toast-icon { font-size: 1.2rem; }
    .toast-message { flex: 1; }
    .toast-close { background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 1rem; transition: 0.3s; padding: 0 4px; }
    .toast-close:hover { color: #fff; transform: scale(1.1); }
    @keyframes slideInRight { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .animate-slide-in-right { animation: slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  `]
})
export class ToastComponent {
  toastSvc = inject(ToastService);

  getIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  }
}
