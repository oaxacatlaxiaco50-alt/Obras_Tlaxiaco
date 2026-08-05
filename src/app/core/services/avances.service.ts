import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ObraAvance, ObraAvanceRequest, AvanceEvidencia, FaseEvidencia } from '../models/obra.model';

const API = 'http://localhost:8081';

@Injectable({ providedIn: 'root' })
export class AvancesService {
  private http = inject(HttpClient);

  /** Lista cronológica de avances con sus evidencias */
  getAvances(obraId: number): Observable<ObraAvance[]> {
    return this.http.get<ObraAvance[]>(`${API}/obras/${obraId}/avances`);
  }

  /** Último porcentaje de avance de la obra */
  getUltimoPorcentaje(obraId: number): Observable<number> {
    return this.http.get<number>(`${API}/obras/${obraId}/avances/ultimo-porcentaje`);
  }

  /** Registrar nuevo avance */
  registrarAvance(obraId: number, request: ObraAvanceRequest): Observable<ObraAvance> {
    const body = { ...request, obraId };
    return this.http.post<ObraAvance>(`${API}/obras/${obraId}/avances`, body);
  }

  /** Subir evidencia (foto/video) a un avance */
  subirEvidencia(
    obraId: number,
    avanceId: number,
    file: File,
    fase: FaseEvidencia,
    descripcion?: string
  ): Observable<AvanceEvidencia> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fase', fase);
    if (descripcion) formData.append('descripcion', descripcion);
    return this.http.post<AvanceEvidencia>(
      `${API}/obras/${obraId}/avances/${avanceId}/evidencias`,
      formData
    );
  }

  /** Eliminar un avance completo */
  eliminarAvance(obraId: number, avanceId: number): Observable<void> {
    return this.http.delete<void>(`${API}/obras/${obraId}/avances/${avanceId}`);
  }

  /** Eliminar una evidencia */
  eliminarEvidencia(obraId: number, evidenciaId: number): Observable<void> {
    return this.http.delete<void>(`${API}/obras/${obraId}/avances/evidencias/${evidenciaId}`);
  }
}
