import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RutaObraResponse, RutaObraCreateRequest, RutaObraUpdateRequest } from '../models/ruta.model';

const API = 'http://localhost:8081/rutas';

@Injectable({ providedIn: 'root' })
export class RutasService {
  private http = inject(HttpClient);

  getRutasPorObra(obraId: number): Observable<RutaObraResponse[]> {
    return this.http.get<RutaObraResponse[]>(`${API}/obra/${obraId}`);
  }

  getRutaById(id: number): Observable<RutaObraResponse> {
    return this.http.get<RutaObraResponse>(`${API}/${id}`);
  }

  crearRuta(request: RutaObraCreateRequest): Observable<RutaObraResponse> {
    return this.http.post<RutaObraResponse>(API, request);
  }

  actualizarRuta(id: number, request: RutaObraUpdateRequest): Observable<RutaObraResponse> {
    return this.http.put<RutaObraResponse>(`${API}/${id}`, request);
  }

  eliminarRuta(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/${id}`);
  }
}
