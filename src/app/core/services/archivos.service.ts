import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ObraArchivo, CarpetaTipo } from '../models/obra.model';

const API = 'http://localhost:8081';

@Injectable({ providedIn: 'root' })
export class ArchivosService {
  private http = inject(HttpClient);

  /** Listar archivos de una carpeta (o todas si no se especifica carpeta) */
  getArchivos(obraId: number, carpeta?: CarpetaTipo): Observable<ObraArchivo[]> {
    let params = new HttpParams();
    if (carpeta) params = params.set('carpeta', carpeta);
    return this.http.get<ObraArchivo[]>(`${API}/obras/${obraId}/archivos`, { params });
  }

  /** Conteo de archivos por carpeta: { LEGAL: 2, SOCIAL: 0, ... } */
  getConteos(obraId: number): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${API}/obras/${obraId}/archivos/conteos`);
  }

  /** Subir un archivo a una carpeta */
  subirArchivo(obraId: number, carpeta: CarpetaTipo, file: File): Observable<ObraArchivo> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('carpeta', carpeta);
    return this.http.post<ObraArchivo>(`${API}/obras/${obraId}/archivos`, formData);
  }

  /** Eliminar un archivo */
  eliminarArchivo(obraId: number, archivoId: number): Observable<void> {
    return this.http.delete<void>(`${API}/obras/${obraId}/archivos/${archivoId}`);
  }

  /** Formatea tamaño de archivo para mostrar */
  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /** Descargar archivo como Blob para visualización segura (evita error 401) */
  descargarArchivoUrl(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }
}
