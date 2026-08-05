import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Page } from '../models/obra.model';
import { EntradaBitacora, BitacoraEntry } from '../models/bitacora.model';

const API = 'http://localhost:8081';

@Injectable({ providedIn: 'root' })
export class BitacoraService {
  private http = inject(HttpClient);

  /**
   * Consulta paginada — devuelve el Page<BitacoraEntry> tal cual del backend.
   */
  getBitacoras(obraId?: number, page = 0, size = 20): Observable<Page<BitacoraEntry>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'timestamp,desc');
    if (obraId != null) params = params.set('obraId', obraId);
    return this.http.get<Page<BitacoraEntry>>(`${API}/bitacoras`, { params });
  }

  /**
   * Historial general mapeado al formato que usan los componentes de UI.
   * Devuelve Observable<EntradaBitacora[]> con la primera página (50 items).
   */
  getHistorialGeneral(page = 0, size = 50): Observable<EntradaBitacora[]> {
    return this.getBitacoras(undefined, page, size).pipe(
      map(p => p.content.map(e => this.mapToEntrada(e)))
    );
  }

  /**
   * Bitácora de una obra específica mapeada al formato UI.
   */
  getBitacoraDeObra(obraId: number, page = 0, size = 50): Observable<EntradaBitacora[]> {
    return this.getBitacoras(obraId, page, size).pipe(
      map(p => p.content.map(e => this.mapToEntrada(e)))
    );
  }

  // ─── Mapeo backend → UI ──────────────────────────────────────────────────
  private mapToEntrada(e: BitacoraEntry): EntradaBitacora {
    // El campo description del backend tiene formato "ACCION | MODULO | Detalle"
    // o simplemente la descripción libre. Intentamos parsearlo.
    const parts = e.description?.split(' | ') ?? [];
    const accion  = parts.length >= 1 ? parts[0] : 'Ver';
    const modulo  = parts.length >= 2 ? parts[1] : 'Sistema';
    const detalle = parts.length >= 3 ? parts.slice(2).join(' | ') : (e.description ?? '');

    return {
      id: e.id,
      fecha: new Date(e.timestamp),
      usuario: e.userId ? `Usuario #${e.userId}` : 'Sistema',
      rol: e.status ?? 'user',
      accion,
      modulo,
      descripcion: detalle || e.description,
      obraId: e.obraId ?? undefined,
    };
  }
}
