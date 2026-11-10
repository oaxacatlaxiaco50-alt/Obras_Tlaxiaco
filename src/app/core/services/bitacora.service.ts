import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError } from 'rxjs';
import { Page } from '../models/obra.model';
import { EntradaBitacora, BitacoraEntry } from '../models/bitacora.model';
import { AuditLog, AuditLogPage } from '../models/audit-log.model';

const API = environment.apiUrl;

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
   * Historial general del sistema (Obras, Usuarios/Admin, Expedientes, Avances, Mapa).
   * Consulta /audit-logs para incluir tanto eventos de obras como creación/edición/eliminación de usuarios.
   */
  getHistorialGeneral(page = 0, size = 200): Observable<EntradaBitacora[]> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'timestamp,desc');

    return this.http.get<AuditLogPage>(`${API}/audit-logs`, { params }).pipe(
      map(p => p.content.map(log => this.mapAuditToEntrada(log))),
      catchError(() =>
        this.getBitacoras(undefined, page, size).pipe(
          map(p => p.content.map(e => this.mapToEntrada(e)))
        )
      )
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

  // ─── Mapeo AuditLog → EntradaBitacora (Historial General completo) ───────
  private mapAuditToEntrada(log: AuditLog): EntradaBitacora {
    const rawAction = (log.action ?? '').toUpperCase();
    const rawDesc = log.description ?? '';
    const descLower = rawDesc.toLowerCase();

    // 1. Determinar Acción UI ('Crear' | 'Editar' | 'Eliminar' | 'Subir' | 'Ver')
    let accion = 'Editar';
    if (
      rawAction.includes('ELIMINACION') ||
      rawAction === 'DELETE' ||
      descLower.includes('eliminó') ||
      descLower.includes('a eliminada')
    ) {
      accion = 'Eliminar';
    } else if (
      rawAction.includes('CREACION') ||
      rawAction === 'CREATE' ||
      rawAction === 'REGISTRO_AVANCE' ||
      descLower.startsWith('se creó') ||
      descLower.includes('] se creó')
    ) {
      accion = 'Crear';
    } else if (
      rawAction.includes('SUBIDA') ||
      descLower.includes('subió')
    ) {
      accion = 'Subir';
    } else if (
      rawAction.includes('MODIFICACION') ||
      rawAction.includes('ACTUALIZACION') ||
      rawAction.includes('ASIGNACION') ||
      rawAction.includes('CAMBIO_ESTATUS') ||
      rawAction.includes('DESACTIVACION') ||
      rawAction.includes('REACTIVACION') ||
      rawAction === 'UPDATE'
    ) {
      accion = 'Editar';
    }

    // 2. Determinar Módulo UI ('Obras' | 'Admin' | 'Expediente' | 'Mapa' | 'Dashboard')
    let modulo = 'Obras';
    if (log.module === 'USUARIOS' || rawAction.includes('USUARIO')) {
      modulo = 'Admin';
    } else if (
      rawAction.includes('ARCHIVO') ||
      rawAction.includes('CHECKLIST') ||
      rawAction.includes('EVIDENCIA') ||
      rawAction.includes('AVANCE') ||
      descLower.includes('expediente') ||
      descLower.includes('checklist') ||
      descLower.includes('evidencia') ||
      descLower.includes('avance')
    ) {
      modulo = 'Expediente';
    } else if (rawAction.includes('GEOCERCA') || descLower.includes('geocerca')) {
      modulo = 'Mapa';
    }

    // 3. Extraer nombre de Obra o Usuario afectado y limpiar descripción
    let obraNombre: string | undefined = undefined;
    let cleanDesc = rawDesc;

    const matchPrefix = rawDesc.match(/^\[(.+?)\]\s*(.*)$/);
    if (matchPrefix) {
      obraNombre = matchPrefix[1];
      cleanDesc = matchPrefix[2] || rawDesc;
    } else if (modulo === 'Admin') {
      const userMatch = rawDesc.match(/\(@([^)]+)\)/);
      obraNombre = userMatch ? `👤 @${userMatch[1]}` : 'Gestión de Usuarios';
    } else if (log.obraId) {
      obraNombre = `Obra #${log.obraId}`;
    }

    if (!cleanDesc) {
      cleanDesc = this.buildFallbackDescription(log);
    }

    const username = log.username || 'Sistema';
    const rol = username.toLowerCase().includes('admin') ? 'admin' : 'residente';

    return {
      id: log.id,
      fecha: new Date(log.timestamp),
      usuario: username,
      rol,
      accion,
      modulo,
      descripcion: cleanDesc,
      obraId: log.obraId ?? undefined,
      obraNombre,
    };
  }

  private buildFallbackDescription(log: AuditLog): string {
    try {
      const nd = log.newData ? JSON.parse(log.newData) : null;
      const pd = log.previousData ? JSON.parse(log.previousData) : null;
      if (log.action === 'ELIMINACION_USUARIO') {
        return pd?.username ? `Se eliminó permanentemente al usuario @${pd.username}` : 'Se eliminó un usuario';
      }
      if (log.action === 'CREACION_OBRA') {
        return nd?.nombre ? `Se creó la obra "${nd.nombre}"` : 'Se creó una nueva obra';
      }
      if (log.action === 'ELIMINACION_OBRA') {
        return pd?.nombre ? `Se eliminó la obra "${pd.nombre}"` : 'Se eliminó una obra';
      }
    } catch {}
    return log.action || 'Acción registrada en el sistema';
  }

  // ─── Mapeo BitacoraEntry → EntradaBitacora (Bitácora por obra) ───────────
  private mapToEntrada(e: BitacoraEntry): EntradaBitacora {
    const desc = e.description ?? '';
    const descLower = desc.toLowerCase();
    const status = (e.status ?? '').toUpperCase();

    let accion = 'Editar';
    if (
      status.includes('ELIMINAD') ||
      descLower.includes('eliminó') ||
      descLower.includes('a eliminada')
    ) {
      accion = 'Eliminar';
    } else if (
      status === 'CREACION_OBRA' ||
      descLower.startsWith('se creó') ||
      descLower.includes('registró un nuevo avance')
    ) {
      accion = 'Crear';
    } else if (
      status === 'SUBIDA_ARCHIVO' ||
      descLower.includes('subió')
    ) {
      accion = 'Subir';
    }

    let modulo = 'Obras';
    if (
      descLower.includes('archivo') ||
      descLower.includes('documento') ||
      descLower.includes('checklist') ||
      descLower.includes('evidencia') ||
      descLower.includes('avance')
    ) {
      modulo = 'Expediente';
    } else if (descLower.includes('geocerca')) {
      modulo = 'Mapa';
    }

    return {
      id: e.id,
      fecha: new Date(e.timestamp),
      usuario: e.userId === 1 ? 'admin' : (e.userId ? `Usuario #${e.userId}` : 'Sistema'),
      rol: e.userId === 1 ? 'admin' : 'residente',
      accion,
      modulo,
      descripcion: desc,
      obraId: e.obraId ?? undefined,
      obraNombre: e.obraId ? `Obra #${e.obraId}` : undefined,
    };
  }
}
