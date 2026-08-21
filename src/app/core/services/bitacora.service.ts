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
    // Mapear acción del backend a etiqueta UI
    const accionMap: Record<string, string> = {
      'CREACION_OBRA':           'Crear',
      'MODIFICACION_OBRA':       'Editar',
      'ACTUALIZACION_MONTOS_FECHAS': 'Editar',
      'ASIGNACION_RESPONSABLES': 'Editar',
      'CAMBIO_ESTATUS':          'Editar',
      'ELIMINACION_OBRA':        'Eliminar',
      'SUBIDA_ARCHIVO':          'Subir',
      'ELIMINACION_ARCHIVO':     'Eliminar',
      'REGISTRO_AVANCE':         'Crear',
      'ELIMINACION_AVANCE':      'Eliminar',
    };

    // Determinar módulo del backend
    const moduloMap: Record<string, string> = {
      'CREACION_OBRA':           'Obras',
      'MODIFICACION_OBRA':       'Obras',
      'ACTUALIZACION_MONTOS_FECHAS': 'Obras',
      'ASIGNACION_RESPONSABLES': 'Obras',
      'CAMBIO_ESTATUS':          'Obras',
      'ELIMINACION_OBRA':        'Obras',
      'SUBIDA_ARCHIVO':          'Expedientes',
      'ELIMINACION_ARCHIVO':     'Expedientes',
      'REGISTRO_AVANCE':         'Avances',
      'ELIMINACION_AVANCE':      'Avances',
    };

    const accion  = accionMap[e.status ?? ''] ?? 'Ver';
    const modulo  = moduloMap[e.status ?? ''] ?? 'Sistema';

    return {
      id: e.id,
      fecha: new Date(e.timestamp),
      usuario: e.userId ? `Usuario #${e.userId}` : 'Sistema',
      rol: 'user',
      accion,
      modulo,
      descripcion: e.description ?? '',
      obraId: e.obraId ?? undefined,
      obraNombre: e.obraId ? `Obra #${e.obraId}` : undefined,
    };
  }
}
