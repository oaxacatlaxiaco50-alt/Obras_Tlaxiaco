// ─── Enums que usa el backend ───────────────────────────────────────────────
export type ObraEstatus =
  | 'PLANIFICADA'
  | 'EN_PROCESO'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'INACTIVA';

export type FaseEvidencia = 'ANTES' | 'DURANTE' | 'DESPUES';
export type TipoEvidencia = 'IMAGEN' | 'VIDEO' | 'DOCUMENTO';
export type CarpetaTipo = 'LEGAL' | 'SOCIAL' | 'TECNICOS' | 'FOTOGRAFICO';
export type TipoArchivo = 'IMAGEN' | 'VIDEO' | 'DOCUMENTO';

// ─── Mapeo visual (backend → UI) ────────────────────────────────────────────
export const ESTATUS_LABEL: Record<ObraEstatus, string> = {
  PLANIFICADA: 'Planificada',
  EN_PROCESO: 'En Proceso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
  INACTIVA: 'Inactiva',
};

export const ESTATUS_COLOR: Record<ObraEstatus, string> = {
  PLANIFICADA: 'status-pendiente',
  EN_PROCESO: 'status-activa',
  COMPLETADA: 'status-completada',
  CANCELADA: 'status-bloqueada',
  INACTIVA: 'status-pausada',
};

// ─── Response de Obra (lo que devuelve el backend) ───────────────────────────
export interface ObraResponse {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  monto: number;
  fechaInicio: string;   // LocalDate → string ISO "2026-01-15"
  fechaFin: string;
  estatus: ObraEstatus;
  responsableId: number;
  latitud?: number;
  longitud?: number;
  direccion?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Requests para crear/actualizar obra ────────────────────────────────────
export interface ObraCreateRequest {
  codigo: string;
  nombre: string;
  descripcion?: string;
  monto: number;
  fechaInicio: string;
  fechaFin: string;
  estatus: ObraEstatus;
  responsableId: number;
  latitud?: number;
  longitud?: number;
  direccion?: string;
}

export interface ObraUpdateRequest {
  nombre?: string;
  descripcion?: string;
  monto?: number;
  fechaInicio?: string;
  fechaFin?: string;
  responsableId?: number;
  latitud?: number;
  longitud?: number;
  direccion?: string;
}

export interface ObraEstatusRequest {
  estatus: ObraEstatus;
}

// ─── Paginación genérica ─────────────────────────────────────────────────────
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;   // página actual (0-indexed)
  size: number;
}

// ─── Avances ─────────────────────────────────────────────────────────────────
export interface AvanceEvidencia {
  id: number;
  avanceId: number;
  archivoUrl: string;
  tipo: TipoEvidencia;
  fase: FaseEvidencia;
  descripcion?: string;
  createdAt: string;
}

export interface ObraAvance {
  id: number;
  obraId: number;
  titulo: string;
  fechaAvance: string;
  porcentaje: number;
  observaciones?: string;
  registradoPor?: number;
  createdAt: string;
  evidencias: AvanceEvidencia[];
}

export interface ObraAvanceRequest {
  titulo: string;
  fechaAvance: string;
  porcentaje: number;
  observaciones?: string;
}

// ─── Archivos / Carpetas ─────────────────────────────────────────────────────
export interface ObraArchivo {
  id: number;
  obraId: number;
  carpeta: CarpetaTipo;
  nombreOriginal: string;
  archivoUrl: string;
  tipoArchivo: TipoArchivo;
  tamanioBytes: number;
  subidoPor?: number;
  createdAt: string;
}

// ─── GeoJSON (endpoint /obras/mapa) ─────────────────────────────────────────
export interface ObraMapaFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { id: number; codigo: string; nombre: string; estatus: ObraEstatus; direccion: string };
}

export interface ObraMapaGeoJSON {
  type: 'FeatureCollection';
  features: ObraMapaFeature[];
}
