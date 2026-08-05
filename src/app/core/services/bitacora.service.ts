import { Injectable, signal } from '@angular/core';
import { EntradaBitacora, AccionBitacora } from '../models/bitacora.model';

const hoy = new Date();
const hace = (h: number, m = 0) => new Date(hoy.getTime() - h * 3600000 - m * 60000);

// Semana actual: inicio lunes
const inicioSemana = (() => {
  const d = new Date(hoy);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
})();

const MOCK_BITACORA: EntradaBitacora[] = [
  { id: 'b01', fecha: hace(1, 10),  usuario: 'Ing. Carlos Mendoza', rol: 'admin',     accion: 'Editar',   modulo: 'Expediente', descripcion: 'Actualizó avance al 72%',          obraId: 'obra-001', obraNombre: 'Pavimentación Av. Central' },
  { id: 'b02', fecha: hace(2, 30),  usuario: 'Arq. Laura Sánchez',  rol: 'residente', accion: 'Subir',    modulo: 'Expediente', descripcion: 'Subió 2 imágenes fase "durante"',  obraId: 'obra-001', obraNombre: 'Pavimentación Av. Central' },
  { id: 'b03', fecha: hace(3),      usuario: 'Juan Pérez',           rol: 'lector',    accion: 'Ver',      modulo: 'Dashboard',  descripcion: 'Consultó el panel principal' },
  { id: 'b04', fecha: hace(5, 45),  usuario: 'Ing. Carlos Mendoza', rol: 'admin',     accion: 'Eliminar', modulo: 'Expediente', descripcion: 'Eliminó archivo duplicado',         obraId: 'obra-003', obraNombre: 'Rehabilitación Red Hidráulica' },
  { id: 'b05', fecha: hace(8),      usuario: 'Ing. Roberto Torres',  rol: 'residente', accion: 'Crear',    modulo: 'Obras',      descripcion: 'Registró nueva obra',              obraId: 'obra-002', obraNombre: 'Construcción Escuela Primaria' },
  { id: 'b06', fecha: hace(10),     usuario: 'Arq. Laura Sánchez',  rol: 'residente', accion: 'Ver',      modulo: 'Mapa',       descripcion: 'Consultó geolocalización de obra', obraId: 'obra-004', obraNombre: 'Parque Urbano "El Mirador"' },
  { id: 'b07', fecha: hace(14),     usuario: 'Ing. Carlos Mendoza', rol: 'admin',     accion: 'Editar',   modulo: 'Expediente', descripcion: 'Cambió estatus a "En Proceso"',    obraId: 'obra-003', obraNombre: 'Rehabilitación Red Hidráulica' },
  { id: 'b08', fecha: hace(20),     usuario: 'Juan Pérez',           rol: 'lector',    accion: 'Ver',      modulo: 'Expediente', descripcion: 'Consultó expediente de obra',      obraId: 'obra-005', obraNombre: 'Modernización Mercado Municipal' },
  { id: 'b09', fecha: hace(24),     usuario: 'Arq. María González',  rol: 'residente', accion: 'Subir',    modulo: 'Expediente', descripcion: 'Subió planos estructurales PDF',   obraId: 'obra-002', obraNombre: 'Construcción Escuela Primaria' },
  { id: 'b10', fecha: hace(28),     usuario: 'Ing. Carlos Mendoza', rol: 'admin',     accion: 'Editar',   modulo: 'Admin',      descripcion: 'Modificó permisos de usuario' },
  { id: 'b11', fecha: hace(36),     usuario: 'Ing. Roberto Torres',  rol: 'residente', accion: 'Ver',      modulo: 'Obras',      descripcion: 'Revisó listado de expedientes' },
  { id: 'b12', fecha: hace(48),     usuario: 'Ing. Carlos Mendoza', rol: 'admin',     accion: 'Eliminar', modulo: 'Obras',      descripcion: 'Eliminó obra duplicada',           obraId: 'obra-001', obraNombre: 'Pavimentación Av. Central' },
  { id: 'b13', fecha: hace(52),     usuario: 'Arq. Laura Sánchez',  rol: 'residente', accion: 'Editar',   modulo: 'Expediente', descripcion: 'Actualizó descripción del proyecto', obraId: 'obra-004', obraNombre: 'Parque Urbano "El Mirador"' },
  { id: 'b14', fecha: hace(72),     usuario: 'Lic. Ana Flores',      rol: 'residente', accion: 'Crear',    modulo: 'Obras',      descripcion: 'Creó nuevo expediente de obra',    obraId: 'obra-004', obraNombre: 'Parque Urbano "El Mirador"' },
  { id: 'b15', fecha: hace(96),     usuario: 'Juan Pérez',           rol: 'lector',    accion: 'Ver',      modulo: 'Dashboard',  descripcion: 'Accedió al panel de control' },
  { id: 'b16', fecha: hace(120),    usuario: 'Ing. Carlos Mendoza', rol: 'admin',     accion: 'Editar',   modulo: 'Expediente', descripcion: 'Ajustó porcentaje de avance al 30%', obraId: 'obra-004', obraNombre: 'Parque Urbano "El Mirador"' },
  { id: 'b17', fecha: hace(144),    usuario: 'Arq. María González',  rol: 'residente', accion: 'Ver',      modulo: 'Mapa',       descripcion: 'Consultó waypoints de obra' },
  { id: 'b18', fecha: hace(168),    usuario: 'Ing. Carlos Mendoza', rol: 'admin',     accion: 'Eliminar', modulo: 'Expediente', descripcion: 'Eliminó foto de fase "antes"',     obraId: 'obra-002', obraNombre: 'Construcción Escuela Primaria' },
];

const ACCIONES_CAMBIO: AccionBitacora[] = ['Editar', 'Eliminar'];

@Injectable({ providedIn: 'root' })
export class BitacoraService {
  private _entradas = signal<EntradaBitacora[]>(MOCK_BITACORA);

  /** Todas las entradas de bitácora ordenadas por fecha descendente */
  getHistorialGeneral(): EntradaBitacora[] {
    return [...this._entradas()].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  /**
   * Bitácora de cambios: sólo acciones de Editar/Eliminar dentro de la semana actual.
   * Pensada para uso exclusivo del rol 'admin'.
   */
  getBitacoraCambiosSemana(): EntradaBitacora[] {
    return this._entradas()
      .filter(e =>
        ACCIONES_CAMBIO.includes(e.accion) &&
        e.fecha >= inicioSemana
      )
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  /** Registra una nueva entrada (uso programático futuro) */
  registrar(entrada: Omit<EntradaBitacora, 'id' | 'fecha'>): void {
    const nueva: EntradaBitacora = {
      ...entrada,
      id: 'b' + Date.now(),
      fecha: new Date(),
    };
    this._entradas.update(list => [nueva, ...list]);
  }
}
