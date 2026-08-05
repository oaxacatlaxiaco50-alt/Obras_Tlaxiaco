export type AccionBitacora = 'Crear' | 'Editar' | 'Eliminar' | 'Ver' | 'Subir';

export interface EntradaBitacora {
  id: string;
  fecha: Date;
  usuario: string;
  rol: string;
  accion: AccionBitacora;
  modulo: string;
  descripcion: string;
  obraId?: string;
  obraNombre?: string;
}
