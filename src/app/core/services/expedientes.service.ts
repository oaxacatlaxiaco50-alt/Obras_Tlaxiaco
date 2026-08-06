import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = 'http://localhost:8081';

export type EstadoDocumentoChecklist = 'OK' | 'FALTANTE' | 'CORREGIR' | 'NO_APLICA';
export type SeccionExpedienteChecklist = 'PARTE_SOCIAL' | 'PROYECTO_EJECUTIVO' | 'PROCESOS_CONTRATACION' | 'DOCUMENTOS_COMPROBATORIOS';

export interface CatalogoDocumentoItem {
  id: number;
  seccion: SeccionExpedienteChecklist;
  nombre: string;
  requerido: boolean;
  activo: boolean;
}

export interface ExpedienteObraItem {
  id: number;
  obraId: number;
  documento: CatalogoDocumentoItem;
  estado: EstadoDocumentoChecklist;
  archivoUrl?: string;
  observaciones?: string;
  fechaRevision?: string;
  revisadoPorId?: number;
}

@Injectable({ providedIn: 'root' })
export class ExpedientesService {
  private http = inject(HttpClient);

  getExpedientePorObra(obraId: number): Observable<ExpedienteObraItem[]> {
    return this.http.get<ExpedienteObraItem[]>(`${API}/obras/${obraId}/expediente`);
  }

  actualizarEstado(obraId: number, expedienteId: number, estado: EstadoDocumentoChecklist, observaciones?: string): Observable<ExpedienteObraItem> {
    return this.http.put<ExpedienteObraItem>(`${API}/obras/${obraId}/expediente/${expedienteId}`, {
      estado,
      observaciones
    });
  }

  subirArchivoDocumento(obraId: number, expedienteId: number, file: File): Observable<ExpedienteObraItem> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ExpedienteObraItem>(`${API}/obras/${obraId}/expediente/${expedienteId}/archivo`, formData);
  }
}
