import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Notificacion, NotificacionPage } from '../models/notification.model';
import { tap } from 'rxjs/operators';

const API = 'http://localhost:8081/notificaciones';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private http = inject(HttpClient);

  private _notifs = signal<Notificacion[]>([]);
  notifs = this._notifs.asReadonly();
  noLeidas = computed(() => this._notifs().filter(n => !n.leida).length);

  /** Carga las notificaciones del usuario autenticado desde el backend */
  cargar(page = 0, size = 30): void {
    const params = new HttpParams().set('page', page).set('size', size);
    this.http.get<NotificacionPage>(API, { params }).subscribe({
      next: (res) => this._notifs.set(res.content),
      error: () => {} // silencioso si no hay permisos
    });
  }

  /** Obtiene el conteo de no leídas (usado para el badge) */
  cargarConteo(): void {
    this.http.get<number>(`${API}/no-leidas/count`).subscribe({
      next: (count) => {
        // sincroniza badge sin sobreescribir la lista local
      },
      error: () => {}
    });
  }

  marcarLeida(id: number): void {
    this.http.patch<Notificacion>(`${API}/${id}/leer`, {}).pipe(
      tap(updated => {
        this._notifs.update(ns => ns.map(n => n.id === id ? updated : n));
      })
    ).subscribe({ error: () => {} });
  }

  marcarTodasLeidas(): void {
    this.http.patch<void>(`${API}/leer-todas`, {}).pipe(
      tap(() => {
        this._notifs.update(ns => ns.map(n => ({ ...n, leida: true })));
      })
    ).subscribe({ error: () => {} });
  }

  getIcono(tipo: string): string {
    const iconos: Record<string, string> = { exito: '✅', advertencia: '⚠️', error: '🔴', info: 'ℹ️' };
    return iconos[tipo] || 'ℹ️';
  }

  tiempoRelativo(fechaStr: string): string {
    const fecha = new Date(fechaStr);
    const diff = (Date.now() - fecha.getTime()) / 60000;
    if (diff < 60) return `hace ${Math.round(diff)} min`;
    if (diff < 1440) return `hace ${Math.round(diff / 60)} h`;
    return `hace ${Math.round(diff / 1440)} días`;
  }
}
