import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LoginResponse, Rol } from '../models/user.model';
import { tap, catchError } from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _usuario = signal<LoginResponse | null>(null);

  usuario = this._usuario.asReadonly();
  isAuthenticated = computed(() => !!this._usuario());

  private readonly API_URL = 'http://localhost:8081/auth';
  private readonly TOKEN_KEY = 'jwt_token';
  private readonly USER_KEY = 'user_data';

  constructor(private router: Router, private http: HttpClient) {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userData = localStorage.getItem(this.USER_KEY);
    if (token && userData) {
      try {
        this._usuario.set(JSON.parse(userData));
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
          this.router.navigate(['/dashboard']);
        }
      }),
      catchError(err => {
        return throwError(() => new Error('Credenciales inválidas o error de conexión'));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._usuario.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  hasRole(...roles: string[]): boolean {
    const user = this._usuario();
    // Convertir roles a mayúsculas porque el backend usa ADMINISTRADOR, SUPERVISOR, etc.
    const upperRoles = roles.map(r => {
      if (r === 'admin') return 'ADMINISTRADOR';
      if (r === 'residente') return 'SUPERVISOR';
      if (r === 'lector') return 'AUDITOR';
      return r.toUpperCase();
    });
    return user ? upperRoles.some(r => user.roles.includes(r)) : false;
  }
}
