import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ObraMeta } from '../models/obra.model';

const API = 'http://localhost:8081';

@Injectable({ providedIn: 'root' })
export class MetasService {
  private http = inject(HttpClient);

  listarMetas(obraId: number): Observable<ObraMeta[]> {
    return this.http.get<ObraMeta[]>(`${API}/obras/${obraId}/metas`);
  }

  crearMeta(obraId: number, meta: Partial<ObraMeta>): Observable<ObraMeta> {
    return this.http.post<ObraMeta>(`${API}/obras/${obraId}/metas`, meta);
  }

  eliminarMeta(obraId: number, metaId: number): Observable<void> {
    return this.http.delete<void>(`${API}/obras/${obraId}/metas/${metaId}`);
  }
}
