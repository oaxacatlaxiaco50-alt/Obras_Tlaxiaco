import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Notificacion, NotificacionPage } from '../models/notification.model';
import { tap } from 'rxjs/operators';
import { interval, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

const API = `${environment.apiUrl}/notificaciones`;

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private http = inject(HttpClient);
  private pollingSub: Subscription | null = null;

  private _notifs = signal<Notificacion[]>([]);
  private _conteoRemoto = signal<number | null>(null);

  notifs = this._notifs.asReadonly();
  noLeidas = computed(() => {
    const remoto = this._conteoRemoto();
    const localCount = this._notifs().filter(n => !n.leida).length;
    return remoto !== null ? remoto : localCount;
  });

  /** Carga las notificaciones del usuario autenticado desde el backend */
  cargar(page = 0, size = 30): void {
    const params = new HttpParams().set('page', page).set('size', size);
    this.http.get<NotificacionPage>(API, { params }).subscribe({
      next: (res) => {
        const lista = res?.content ?? [];
        this._notifs.set(lista);
        this._conteoRemoto.set(lista.filter(n => !n.leida).length);
      },
      error: () => {} // silencioso si no hay permisos
    });
  }

  /** Obtiene el conteo de no leídas (usado para el badge) */
  cargarConteo(): void {
    this.http.get<{ noLeidas: number }>(`${API}/no-leidas/count`).subscribe({
      next: (res) => {
        const count = typeof res?.noLeidas === 'number' ? res.noLeidas : 0;
        const prevCount = this.noLeidas();
        this._conteoRemoto.set(count);
        if (count !== prevCount) {
          this.cargar();
        }
      },
      error: () => {}
    });
  }

  /** Inicia el polling cada 30 segundos evitando suscripciones duplicadas */
  iniciarPolling(): void {
    if (this.pollingSub && !this.pollingSub.closed) {
      return;
    }
    this.cargar();
    this.pollingSub = interval(30000).subscribe(() => {
      this.cargar();
    });
  }

  /** Detiene el polling activo y limpia el estado al cerrar sesión */
  detenerPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
    }
    this._notifs.set([]);
    this._conteoRemoto.set(0);
  }

  marcarLeida(id: number): void {
    this.http.patch<Notificacion>(`${API}/${id}/leer`, {}).pipe(
      tap(updated => {
        this._notifs.update(ns => {
          const nuevas = ns.map(n => n.id === id ? updated : n);
          this._conteoRemoto.set(nuevas.filter(n => !n.leida).length);
          return nuevas;
        });
      })
    ).subscribe({ error: () => {} });
  }

  marcarTodasLeidas(): void {
    this.http.patch<void>(`${API}/leer-todas`, {}).pipe(
      tap(() => {
        this._notifs.update(ns => ns.map(n => ({ ...n, leida: true })));
        this._conteoRemoto.set(0);
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
