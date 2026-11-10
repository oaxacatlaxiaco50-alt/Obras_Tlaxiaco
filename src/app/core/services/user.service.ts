import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserResponse, UserCreateRequest, UserUpdateRequest } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly API_URL = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.API_URL);
  }

  getUserById(id: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.API_URL}/${id}`);
  }

  createUser(data: UserCreateRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.API_URL, data);
  }

  updateUser(id: number, data: UserUpdateRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.API_URL}/${id}`, data);
  }

  deactivateUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  reactivateUser(id: number): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${this.API_URL}/${id}/reactivar`, {});
  }

  deleteUserPermanently(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}/permanente`);
  }
}
