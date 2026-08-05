export type NotifTipo = 'exito' | 'advertencia' | 'error' | 'info';

export interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: NotifTipo;
  fecha: Date;
  leida: boolean;
  obraId?: string;
  obraNombre?: string;
}
