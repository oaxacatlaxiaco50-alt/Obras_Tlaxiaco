export type ObraStatus = 'activa' | 'completada' | 'bloqueada' | 'pendiente' | 'pausada' | 'en_proceso';
export type FaseFoto = 'antes' | 'durante' | 'despues';
export type TipoArchivo = 'imagen' | 'video' | 'documento';

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface Waypoint {
  lat: number;
  lng: number;
  label?: string;
  timestamp?: string;
}

export interface Archivo {
  id: string;
  nombre: string;
  tipo: TipoArchivo;
  url: string;
  tamanoBytes: number;
  fase: FaseFoto;
  fechaSubida: Date;
  subidoPor: string;
}

export interface Area {
  nombre: string;
  entregada: boolean;
}

export interface Obra {
  id: string;
  urlUnica: string;
  nombre: string;
  descripcion: string;
  monto: number;
  avance: number;
  status: ObraStatus;
  ubicacion: string;
  coordenadas: Coordenadas;
  fechaInicio: Date;
  fechaFin: Date;
  fechaUltimaEdicion: Date;
  responsable: string;
  contratista: string;
  archivos: Archivo[];
  areas: Area[];
  camaraUrl?: string;
  waypoints?: Waypoint[];
}
