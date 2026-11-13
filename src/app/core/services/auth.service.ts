import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LoginResponse } from '../models/user.model';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { throwError, Observable, Subscription, interval, EMPTY } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _usuario = signal<LoginResponse | null>(null);

  usuario = this._usuario.asReadonly();
  isAuthenticated = computed(() => !!this._usuario());

  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'jwt_token';
  private readonly USER_KEY = 'user_data';

  private heartbeatSubscription?: Subscription;
  private toastSvc = inject(ToastService);

  constructor(private router: Router, private http: HttpClient) {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userData = localStorage.getItem(this.USER_KEY);
    if (token && userData) {
      try {
        this._usuario.set(JSON.parse(userData));
        this.startHeartbeat();
      } catch (e) {
        this.logout();
      }
    }
  }

  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response));
          this._usuario.set(response);
          this.startHeartbeat();
          this.router.navigate(['/dashboard']);
        }
      }),
      catchError(err => {
        return throwError(() => new Error('Credenciales inválidas o error de conexión'));
      })
    );
  }

  logout(): void {
    this.stopHeartbeat();
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._usuario.set(null);
    this.router.navigate(['/login']);
  }

  handleSessionSuperseded(): void {
    this.stopHeartbeat();
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._usuario.set(null);
    this.toastSvc.show('Tu sesión se ha cerrado porque se inició sesión en otro dispositivo.', 'warning');
    this.router.navigate(['/login'], {
      queryParams: { reason: 'session_superseded' }
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    if (!this.getToken()) return;

    // Verificar cada 15 segundos si esta sesión sigue siendo la activa en el servidor
    this.heartbeatSubscription = interval(15000).pipe(
      switchMap(() => {
        if (!this.getToken()) return EMPTY;
        return this.http.get<{ status: string }>(`${this.API_URL}/check-session`).pipe(
          catchError(err => {
            if (err.status === 401) {
              const errorBody = err.error;
              if (errorBody && (errorBody.error === 'SESSION_SUPERSEDED' || errorBody.message?.includes('otro dispositivo'))) {
                this.handleSessionSuperseded();
              }
            }
            return EMPTY;
          })
        );
      })
    ).subscribe();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatSubscription) {
      this.heartbeatSubscription.unsubscribe();
      this.heartbeatSubscription = undefined;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  hasRole(...roles: string[]): boolean {
    const user = this._usuario();
    const upperRoles = roles.map(r => {
      if (r === 'admin') return 'ADMINISTRADOR';
      if (r === 'residente') return 'SUPERVISOR';
      if (r === 'lector') return 'AUDITOR';
      return r.toUpperCase();
    });
    return user ? upperRoles.some(r => user.roles.includes(r)) : false;
  }
}
