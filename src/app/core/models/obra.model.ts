// ─── Enums que usa el backend ───────────────────────────────────────────────
export type ObraEstatus =
  | 'PLANIFICADA'
  | 'EN_PROCESO'
  | 'COMPLETADA'
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'INACTIVA';

export type FaseEvidencia = 'ANTES' | 'DURANTE' | 'DESPUES';
export type TipoEvidencia = 'FOTO' | 'VIDEO' | 'DOCUMENTO';
export type CarpetaTipo = 'LEGAL' | 'SOCIAL' | 'TECNICOS' | 'FOTOGRAFICO';
export type TipoArchivo = 'FOTO' | 'VIDEO' | 'DOCUMENTO';

// ─── Mapeo visual (backend → UI) ────────────────────────────────────────────
export const ESTATUS_LABEL: Record<ObraEstatus, string> = {
  PLANIFICADA: 'Planificada',
  EN_PROCESO: 'En Proceso',
  COMPLETADA: 'Completada',
  FINALIZADA: 'Completada',
  CANCELADA: 'Cancelada',
  INACTIVA: 'Inactiva',
};

export const ESTATUS_COLOR: Record<ObraEstatus, string> = {
  PLANIFICADA: 'status-pendiente',
  EN_PROCESO: 'status-activa',
  COMPLETADA: 'status-completada',
  FINALIZADA: 'status-completada',
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
  categoria?: string;
  porcentajeAvance?: number;
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
  categoria?: string;
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
  categoria?: string;
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
  metaId?: number;
  cantidadEjecutada?: number;
  porcentaje?: number;
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

// ─── Metas y Conceptos Dinámicos ─────────────────────────────────────────────
export type MetaEstado = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO';

export interface ObraMeta {
  id?: number;
  obraId: number;
  concepto: string;
  unidadMedida: string;
  cantidadMeta: number;
  avanceAcumulado?: number;
  porcentaje?: number;
  estado?: MetaEstado;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConceptoSugerido {
  nombre: string;
  unidadSugerida: string;
}

export const CATEGORIAS_METAS_CATALOG: Record<string, ConceptoSugerido[]> = {
  '🛣️ Pavimentación y Vialidades': [
    { nombre: 'Pavimentación', unidadSugerida: 'm²' },
    { nombre: 'Recarpeteo', unidadSugerida: 'm²' },
    { nombre: 'Bacheo', unidadSugerida: 'm²' },
    { nombre: 'Guarniciones', unidadSugerida: 'm' },
    { nombre: 'Banquetas', unidadSugerida: 'm²' },
    { nombre: 'Terracerías', unidadSugerida: 'm³' },
    { nombre: 'Señalamiento vial', unidadSugerida: 'piezas' },
    { nombre: 'Otro concepto', unidadSugerida: 'N/A' }
  ],
  '💧 Agua Potable y Drenaje': [
    { nombre: 'Tubería de agua potable', unidadSugerida: 'm' },
    { nombre: 'Red de distribución', unidadSugerida: 'm' },
    { nombre: 'Tomas domiciliarias', unidadSugerida: 'piezas' },
    { nombre: 'Pozos', unidadSugerida: 'piezas' },
    { nombre: 'Tanques de almacenamiento', unidadSugerida: 'litros' },
    { nombre: 'Drenaje sanitario', unidadSugerida: 'm' },
    { nombre: 'Drenaje pluvial', unidadSugerida: 'm' },
    { nombre: 'Colectores', unidadSugerida: 'm' },
    { nombre: 'Pozos de visita', unidadSugerida: 'piezas' },
    { nombre: 'Otro concepto', unidadSugerida: 'N/A' }
  ],
  '⚡ Electrificación y Alumbrado': [
    { nombre: 'Instalación de postes', unidadSugerida: 'piezas' },
    { nombre: 'Luminarias', unidadSugerida: 'piezas' },
    { nombre: 'Cableado eléctrico', unidadSugerida: 'm' },
    { nombre: 'Transformadores', unidadSugerida: 'piezas' },
    { nombre: 'Acometidas', unidadSugerida: 'piezas' },
    { nombre: 'Red eléctrica', unidadSugerida: 'm' },
    { nombre: 'Alumbrado público', unidadSugerida: 'm' },
    { nombre: 'Paneles solares', unidadSugerida: 'piezas' },
    { nombre: 'Otro concepto', unidadSugerida: 'N/A' }
  ],
  '🏫 Educación y Escuelas': [
    { nombre: 'Aulas', unidadSugerida: 'aulas' },
    { nombre: 'Sanitarios', unidadSugerida: 'piezas' },
    { nombre: 'Techumbres', unidadSugerida: 'm²' },
    { nombre: 'Bardas perimetrales', unidadSugerida: 'm' },
    { nombre: 'Canchas', unidadSugerida: 'm²' },
    { nombre: 'Rehabilitación de aulas', unidadSugerida: 'aulas' },
    { nombre: 'Instalaciones eléctricas', unidadSugerida: 'lotes' },
    { nombre: 'Mobiliario', unidadSugerida: 'piezas' },
    { nombre: 'Otro concepto', unidadSugerida: 'N/A' }
  ],
  '🏥 Salud y Espacios Públicos': [
    { nombre: 'Parques', unidadSugerida: 'lotes' },
    { nombre: 'Áreas verdes', unidadSugerida: 'm²' },
    { nombre: 'Juegos infantiles', unidadSugerida: 'piezas' },
    { nombre: 'Gimnasios al aire libre', unidadSugerida: 'lotes' },
    { nombre: 'Canchas deportivas', unidadSugerida: 'm²' },
    { nombre: 'Rehabilitación de espacios', unidadSugerida: 'm²' },
    { nombre: 'Consultorios', unidadSugerida: 'piezas' },
    { nombre: 'Sanitarios', unidadSugerida: 'piezas' },
    { nombre: 'Otro concepto', unidadSugerida: 'N/A' }
  ],
  '🏗️ Infraestructura General': [
    { nombre: 'Construcción', unidadSugerida: 'm²' },
    { nombre: 'Rehabilitación', unidadSugerida: 'm²' },
    { nombre: 'Obra civil', unidadSugerida: 'lotes' },
    { nombre: 'Estructuras', unidadSugerida: 'toneladas' },
    { nombre: 'Muros', unidadSugerida: 'm²' },
    { nombre: 'Techumbres', unidadSugerida: 'm²' },
    { nombre: 'Instalaciones', unidadSugerida: 'lotes' },
    { nombre: 'Equipamiento', unidadSugerida: 'lotes' },
    { nombre: 'Otro concepto personalizado', unidadSugerida: 'N/A' }
  ]
};
