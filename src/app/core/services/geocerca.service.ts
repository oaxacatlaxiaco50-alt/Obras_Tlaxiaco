import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GeocercaPunto {
  id?: number;
  latitud: number;
  longitud: number;
  orden?: number;
}

export interface Geocerca {
  id?: number;
  obraId: number;
  nombre: string;
  descripcion?: string;
  puntos: GeocercaPunto[];
  createdAt?: string;
  updatedAt?: string;
}

const API = 'http://localhost:8081/geocercas';

@Injectable({ providedIn: 'root' })
export class GeocercaService {
  private http = inject(HttpClient);

  getByObra(obraId: number): Observable<Geocerca[]> {
    return this.http.get<Geocerca[]>(`${API}/obra/${obraId}`);
  }

  getById(id: number): Observable<Geocerca> {
    return this.http.get<Geocerca>(`${API}/${id}`);
  }

  crear(geocerca: Omit<Geocerca, 'id' | 'createdAt' | 'updatedAt'>): Observable<Geocerca> {
    return this.http.post<Geocerca>(API, geocerca);
  }

  actualizar(id: number, geocerca: Omit<Geocerca, 'id' | 'obraId' | 'createdAt' | 'updatedAt'>): Observable<Geocerca> {
    return this.http.put<Geocerca>(`${API}/${id}`, geocerca);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/${id}`);
  }
}
