import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserResponse, UserCreateRequest, UserUpdateRequest } from '../models/user.model';

const API = 'http://localhost:8081';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);

  /** Lista todos los usuarios del sistema (requiere USER_VIEW) */
  getUsuarios(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${API}/users`);
  }

  /** Obtiene un usuario por ID */
  getUsuarioById(id: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${API}/users/${id}`);
  }

  /** Crea un nuevo usuario (requiere USER_CREATE — solo ADMINISTRADOR) */
  createUsuario(request: UserCreateRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${API}/users`, request);
  }

  /** Actualiza datos de un usuario (requiere USER_UPDATE — solo ADMINISTRADOR) */
  updateUsuario(id: number, request: UserUpdateRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${API}/users/${id}`, request);
  }

  /** Desactiva (soft delete) un usuario (requiere USER_DELETE — solo ADMINISTRADOR) */
  deactivateUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/users/${id}`);
  }

  /** Reactiva un usuario desactivado (requiere USER_UPDATE — solo ADMINISTRADOR) */
  reactivateUsuario(id: number): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${API}/users/${id}/reactivar`, {});
  }

  /** Nombre completo formateado */
  getNombreCompleto(user: UserResponse): string {
    return `${user.firstName} ${user.lastName}`;
  }

  /** Iniciales para avatar */
  getIniciales(user: UserResponse): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }
}
