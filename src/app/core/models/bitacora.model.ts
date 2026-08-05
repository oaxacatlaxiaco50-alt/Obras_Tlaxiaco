// Modelo de la bitácora tal como la devuelve el backend
export interface BitacoraEntry {
  id: number;
  obraId: number | null;
  description: string;
  timestamp: string;   // ISO datetime
  userId: number | null;
  status: string;
}

// Alias compatibles con los componentes existentes
export interface EntradaBitacora {
  id: string | number;
  fecha: Date;
  usuario: string;
  rol: string;
  accion: string;
  modulo: string;
  descripcion: string;
  obraId?: string | number;
  obraNombre?: string;
}

export type AccionBitacora = 'Crear' | 'Editar' | 'Eliminar' | 'Ver' | 'Subir';
