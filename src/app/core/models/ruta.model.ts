export interface PuntoRutaRequest {
  latitud: number;
  longitud: number;
}

export interface PuntoRutaResponse {
  id: number;
  latitud: number;
  longitud: number;
  orden: number;
}

export interface RutaObraCreateRequest {
  obraId: number;
  nombre: string;
  descripcion?: string;
  puntos: PuntoRutaRequest[];
}

export interface RutaObraUpdateRequest {
  nombre: string;
  descripcion?: string;
  puntos: PuntoRutaRequest[];
}

export interface RutaObraResponse {
  id: number;
  obraId: number;
  nombre: string;
  descripcion?: string;
  puntos: PuntoRutaResponse[];
  createdAt?: string;
  updatedAt?: string;
}
