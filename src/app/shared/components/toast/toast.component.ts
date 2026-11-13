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
    .toast {
      display: flex; align-items: center; gap: 12px; padding: 14px 20px;
      border-radius: 8px; color: #fff; font-weight: 500; font-size: 0.9rem;
      pointer-events: auto; min-width: 320px; max-width: 480px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.35);
    }
    .toast.success {
      background: #064e3b;
      border: 1px solid #10b981;
      border-left: 6px solid #34d399;
      box-shadow: 0 10px 25px rgba(6, 78, 59, 0.45);
      color: #ecfdf5;
    }
    .toast.error {
      background: #7f1d1d;
      border: 1px solid #ef4444;
      border-left: 6px solid #f87171;
      box-shadow: 0 10px 25px rgba(127, 29, 29, 0.45);
      color: #fef2f2;
    }
    .toast.info {
      background: #1e3a8a;
      border: 1px solid #3b82f6;
      border-left: 6px solid #60a5fa;
      box-shadow: 0 10px 25px rgba(30, 58, 138, 0.45);
      color: #eff6ff;
    }
    .toast.warning {
      background: #78350f;
      border: 1px solid #f59e0b;
      border-left: 6px solid #fbbf24;
      box-shadow: 0 10px 25px rgba(120, 53, 15, 0.45);
      color: #fffbeb;
    }
    .toast-icon { font-size: 1.25rem; }
    .toast-message { flex: 1; line-height: 1.4; font-weight: 600; }
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
