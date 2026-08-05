import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ObraResponse,
  ObraCreateRequest,
  ObraUpdateRequest,
  ObraEstatusRequest,
  ObraEstatus,
  ObraMapaGeoJSON,
  Page,
} from '../models/obra.model';

const API = 'http://localhost:8081';

@Injectable({ providedIn: 'root' })
export class ObrasService {
  private http = inject(HttpClient);

  /** Lista paginada con filtros opcionales */
  getObras(params?: {
    codigo?: string;
    nombre?: string;
    estatus?: ObraEstatus;
    responsableId?: number;
    startFechaInicio?: string;
    endFechaInicio?: string;
    page?: number;
    size?: number;
  }): Observable<Page<ObraResponse>> {
    let httpParams = new HttpParams()
      .set('page', params?.page ?? 0)
      .set('size', params?.size ?? 20);

    if (params?.codigo)         httpParams = httpParams.set('codigo', params.codigo);
    if (params?.nombre)         httpParams = httpParams.set('nombre', params.nombre);
    if (params?.estatus)        httpParams = httpParams.set('estatus', params.estatus);
    if (params?.responsableId)  httpParams = httpParams.set('responsableId', params.responsableId);
    if (params?.startFechaInicio) httpParams = httpParams.set('startFechaInicio', params.startFechaInicio);
    if (params?.endFechaInicio)   httpParams = httpParams.set('endFechaInicio', params.endFechaInicio);

    return this.http.get<Page<ObraResponse>>(`${API}/obras`, { params: httpParams });
  }

  /** Búsqueda global por palabra clave */
  searchObras(q: string, page = 0, size = 20): Observable<Page<ObraResponse>> {
    const params = new HttpParams().set('q', q).set('page', page).set('size', size);
    return this.http.get<Page<ObraResponse>>(`${API}/obras/search`, { params });
  }

  /** Detalle de una obra por ID */
  getObraById(id: number): Observable<ObraResponse> {
    return this.http.get<ObraResponse>(`${API}/obras/${id}`);
  }

  /** Crear nueva obra */
  createObra(request: ObraCreateRequest): Observable<ObraResponse> {
    return this.http.post<ObraResponse>(`${API}/obras`, request);
  }

  /** Actualizar obra */
  updateObra(id: number, request: ObraUpdateRequest): Observable<ObraResponse> {
    return this.http.put<ObraResponse>(`${API}/obras/${id}`, request);
  }

  /** Cambiar estatus */
  cambiarEstatus(id: number, estatus: ObraEstatus): Observable<ObraResponse> {
    const body: ObraEstatusRequest = { estatus };
    return this.http.patch<ObraResponse>(`${API}/obras/${id}/estatus`, body);
  }

  /** GeoJSON para el mapa */
  getObrasParaMapa(): Observable<ObraMapaGeoJSON> {
    return this.http.get<ObraMapaGeoJSON>(`${API}/obras/mapa`);
  }

  // ─── Helpers de presentación ─────────────────────────────────────────────

  formatMonto(monto: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(monto);
  }

  diasSinEditar(updatedAt: string): number {
    return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
  }

  isBlocked(obra: ObraResponse): boolean {
    return (
      this.diasSinEditar(obra.updatedAt) > 15 && obra.estatus !== 'COMPLETADA'
    );
  }
}
