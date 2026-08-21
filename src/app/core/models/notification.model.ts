export type NotifTipo = 'exito' | 'advertencia' | 'error' | 'info';

export interface Notificacion {
  id: number;
  usuarioId: number;
  titulo: string;
  mensaje: string;
  tipo: NotifTipo;
  leida: boolean;
  obraId?: number;
  obraNombre?: string;
  createdAt: string; // ISO string from backend
}

export interface NotificacionPage {
  content: Notificacion[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
