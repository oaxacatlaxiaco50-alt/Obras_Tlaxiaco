import { Injectable, signal, computed } from '@angular/core';
import { Notificacion } from '../models/notification.model';

const NOTIF_MOCK: Notificacion[] = [
  { id: 'n1', titulo: 'Tramo Norte entregado', mensaje: 'Se confirmó la entrega del Tramo Norte en Pavimentación Av. Central.', tipo: 'exito', fecha: new Date(Date.now() - 3600000), leida: false, obraId: 'obra-001', obraNombre: 'Pavimentación Av. Central' },
  { id: 'n2', titulo: '⚠️ Obra bloqueada automáticamente', mensaje: 'Escuela Primaria lleva 16 días sin actualización. El sistema bloqueó la edición.', tipo: 'error', fecha: new Date(Date.now() - 86400000), leida: false, obraId: 'obra-002', obraNombre: 'Construcción Escuela Primaria' },
  { id: 'n3', titulo: 'Te falta entregar: Tramo Sur', mensaje: 'El Tramo Sur (km 2-4) en Pavimentación Av. Central sigue pendiente.', tipo: 'advertencia', fecha: new Date(Date.now() - 7200000), leida: false, obraId: 'obra-001', obraNombre: 'Pavimentación Av. Central' },
  { id: 'n4', titulo: 'Red Hidráulica al 90%', mensaje: 'La obra alcanzó 90% de avance. Solo faltan las pruebas de presión finales.', tipo: 'info', fecha: new Date(Date.now() - 172800000), leida: true, obraId: 'obra-003', obraNombre: 'Rehabilitación Red Hidráulica' },
  { id: 'n5', titulo: '✅ Mercado Municipal completado', mensaje: 'La modernización del Mercado Municipal fue finalizada y entregada exitosamente.', tipo: 'exito', fecha: new Date('2026-01-31'), leida: true, obraId: 'obra-005', obraNombre: 'Modernización Mercado Municipal' },
  { id: 'n6', titulo: 'Te falta entregar: Juegos infantiles', mensaje: 'El módulo de juegos infantiles en Parque El Mirador está pendiente de entrega.', tipo: 'advertencia', fecha: new Date(Date.now() - 10800000), leida: false, obraId: 'obra-004', obraNombre: 'Parque Urbano "El Mirador"' },
];

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private _notifs = signal<Notificacion[]>(NOTIF_MOCK);
  notifs = this._notifs.asReadonly();
  noLeidas = computed(() => this._notifs().filter(n => !n.leida).length);

  marcarLeida(id: string): void {
    this._notifs.update(ns => ns.map(n => n.id === id ? { ...n, leida: true } : n));
  }

  marcarTodasLeidas(): void {
    this._notifs.update(ns => ns.map(n => ({ ...n, leida: true })));
  }

  getIcono(tipo: string): string {
    const iconos: Record<string, string> = { exito: '✅', advertencia: '⚠️', error: '🔴', info: 'ℹ️' };
    return iconos[tipo] || 'ℹ️';
  }

  tiempoRelativo(fecha: Date): string {
    const diff = (Date.now() - fecha.getTime()) / 60000;
    if (diff < 60) return `hace ${Math.round(diff)} min`;
    if (diff < 1440) return `hace ${Math.round(diff / 60)} h`;
    return `hace ${Math.round(diff / 1440)} días`;
  }
}
