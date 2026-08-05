import { Injectable, signal } from '@angular/core';
import { Obra, Waypoint } from '../models/obra.model';

const hoy = new Date();
const diasAtras = (d: number) => new Date(hoy.getTime() - d * 86400000);

const OBRAS_MOCK: Obra[] = [
  {
    id: 'obra-001', urlUnica: 'pavimentacion-av-central',
    nombre: 'Pavimentación Av. Central',
    descripcion: 'Rehabilitación y pavimentación de la avenida principal del municipio, incluyendo banquetas, guarniciones y modernización del alumbrado público LED.',
    monto: 4500000, avance: 72, status: 'activa',
    ubicacion: 'Av. Central #100, Centro', coordenadas: { lat: 17.2661075, lng: -97.676773 },
    fechaInicio: new Date('2026-01-15'), fechaFin: new Date('2026-06-30'),
    fechaUltimaEdicion: diasAtras(2),
    responsable: 'Arq. Laura Sánchez', contratista: 'Constructora Noreste SA',
    archivos: [
      { id: 'a1', nombre: 'antes-001.jpg', tipo: 'imagen', url: 'https://picsum.photos/seed/antes1/800/600', tamanoBytes: 2400000, fase: 'antes', fechaSubida: new Date('2026-01-20'), subidoPor: 'Arq. Laura Sánchez' },
      { id: 'a2', nombre: 'durante-001.jpg', tipo: 'imagen', url: 'https://picsum.photos/seed/durante1/800/600', tamanoBytes: 3100000, fase: 'durante', fechaSubida: new Date('2026-03-10'), subidoPor: 'Arq. Laura Sánchez' },
      { id: 'a3', nombre: 'durante-002.jpg', tipo: 'imagen', url: 'https://picsum.photos/seed/durante2/800/600', tamanoBytes: 2800000, fase: 'durante', fechaSubida: new Date('2026-04-05'), subidoPor: 'Arq. Laura Sánchez' },
    ],
    areas: [
      { nombre: 'Tramo Norte (km 0-2)', entregada: true },
      { nombre: 'Banquetas Este', entregada: true },
      { nombre: 'Tramo Sur (km 2-4)', entregada: false },
      { nombre: 'Alumbrado LED', entregada: false },
    ],
    camaraUrl: '',
    waypoints: [
      { lat: 17.2661, lng: -97.6768, label: 'Inicio Tramo Norte', timestamp: '2026-01-20T08:00:00' },
      { lat: 17.2665, lng: -97.6760, label: 'Cruce Av. Juárez', timestamp: '2026-02-15T10:30:00' },
      { lat: 17.2670, lng: -97.6752, label: 'Punto Medio', timestamp: '2026-03-10T09:00:00' },
      { lat: 17.2675, lng: -97.6745, label: 'Tramo Sur Inicio', timestamp: '2026-04-05T14:00:00' },
    ],
  },
  {
    id: 'obra-002', urlUnica: 'escuela-primaria-las-flores',
    nombre: 'Construcción Escuela Primaria',
    descripcion: 'Edificación de nueva primaria con capacidad para 500 alumnos. Incluye 15 aulas didácticas, dirección, sala de cómputo y canchas deportivas multifuncionales.',
    monto: 8200000, avance: 45, status: 'pausada',
    ubicacion: 'Col. Las Flores, Calle Jazmín #55', coordenadas: { lat: 17.2750, lng: -97.6750 },
    fechaInicio: new Date('2025-11-01'), fechaFin: new Date('2026-08-31'),
    fechaUltimaEdicion: diasAtras(16),
    responsable: 'Ing. Roberto Torres', contratista: 'Edificaciones del Bajío SC',
    archivos: [
      { id: 'b1', nombre: 'terreno-inicial.jpg', tipo: 'imagen', url: 'https://picsum.photos/seed/escuela1/800/600', tamanoBytes: 1900000, fase: 'antes', fechaSubida: new Date('2025-11-05'), subidoPor: 'Ing. Roberto Torres' },
      { id: 'b2', nombre: 'cimentacion.jpg', tipo: 'imagen', url: 'https://picsum.photos/seed/escuela2/800/600', tamanoBytes: 3500000, fase: 'durante', fechaSubida: new Date('2025-12-15'), subidoPor: 'Ing. Roberto Torres' },
    ],
    areas: [
      { nombre: 'Cimentación', entregada: true },
      { nombre: 'Estructura planta baja', entregada: true },
      { nombre: 'Aulas planta alta', entregada: false },
      { nombre: 'Canchas deportivas', entregada: false },
      { nombre: 'Instalaciones eléctricas', entregada: false },
    ],
    waypoints: [
      { lat: 17.2750, lng: -97.6750, label: 'Acceso Principal', timestamp: '2025-11-05T08:00:00' },
      { lat: 17.2753, lng: -97.6745, label: 'Zona Cimentación', timestamp: '2025-12-15T09:00:00' },
      { lat: 17.2757, lng: -97.6740, label: 'Estructura PB', timestamp: '2026-01-20T11:00:00' },
    ],
  },
  {
    id: 'obra-003', urlUnica: 'red-hidraulica-norte',
    nombre: 'Rehabilitación Red Hidráulica',
    descripcion: 'Sustitución de tuberías de agua potable en sector norte, mejorando la presión y calidad del servicio para 2,000 familias del municipio.',
    monto: 3100000, avance: 90, status: 'en_proceso',
    ubicacion: 'Sector Norte, Zona Industrial', coordenadas: { lat: 17.2580, lng: -97.6900 },
    fechaInicio: new Date('2025-09-01'), fechaFin: new Date('2026-05-31'),
    fechaUltimaEdicion: diasAtras(1),
    responsable: 'Ing. Carlos Mendoza', contratista: 'Hidráulica Jalisco SA',
    archivos: [
      { id: 'c1', nombre: 'red-antigua.jpg', tipo: 'imagen', url: 'https://picsum.photos/seed/hidro1/800/600', tamanoBytes: 2100000, fase: 'antes', fechaSubida: new Date('2025-09-05'), subidoPor: 'Ing. Carlos Mendoza' },
      { id: 'c2', nombre: 'instalacion-tramo-a.jpg', tipo: 'imagen', url: 'https://picsum.photos/seed/hidro2/800/600', tamanoBytes: 2900000, fase: 'durante', fechaSubida: new Date('2025-11-20'), subidoPor: 'Ing. Carlos Mendoza' },
      { id: 'c3', nombre: 'conexiones-dom.jpg', tipo: 'imagen', url: 'https://picsum.photos/seed/hidro3/800/600', tamanoBytes: 3200000, fase: 'durante', fechaSubida: new Date('2026-02-10'), subidoPor: 'Ing. Carlos Mendoza' },
    ],
    areas: [
      { nombre: 'Tramo A - Av. Industrial', entregada: true },
      { nombre: 'Tramo B - Calle 5', entregada: true },
      { nombre: 'Tramo C - Periférico', entregada: true },
      { nombre: 'Conexiones domiciliarias', entregada: true },
      { nombre: 'Pruebas de presión finales', entregada: false },
    ],
    waypoints: [
      { lat: 17.2580, lng: -97.6900, label: 'Planta de bombeo', timestamp: '2025-09-10T08:00:00' },
      { lat: 17.2585, lng: -97.6890, label: 'Tramo A - Industrial', timestamp: '2025-10-20T10:00:00' },
      { lat: 17.2590, lng: -97.6882, label: 'Tramo B - Calle 5', timestamp: '2025-12-05T09:30:00' },
      { lat: 17.2595, lng: -97.6875, label: 'Tramo C - Periférico', timestamp: '2026-02-10T14:00:00' },
      { lat: 17.2600, lng: -97.6868, label: 'Conexiones domiciliarias', timestamp: '2026-04-01T11:00:00' },
    ],
  },
  {
    id: 'obra-004', urlUnica: 'parque-urbano-el-mirador',
    nombre: 'Parque Urbano "El Mirador"',
    descripcion: 'Creación de parque ecológico con áreas verdes, juegos infantiles, pista de atletismo de 400m, zona de descanso y sistema de iluminación solar.',
    monto: 2750000, avance: 30, status: 'activa',
    ubicacion: 'Loma Alta, Sector Poniente', coordenadas: { lat: 17.2600, lng: -97.6700 },
    fechaInicio: new Date('2026-02-01'), fechaFin: new Date('2026-09-30'),
    fechaUltimaEdicion: diasAtras(5),
    responsable: 'Arq. Laura Sánchez', contratista: 'Verde Urbano MX SA',
    archivos: [
      { id: 'd1', nombre: 'terreno-parque.jpg', tipo: 'imagen', url: 'https://picsum.photos/seed/parque1/800/600', tamanoBytes: 1800000, fase: 'antes', fechaSubida: new Date('2026-02-03'), subidoPor: 'Arq. Laura Sánchez' },
      { id: 'd2', nombre: 'nivelacion.jpg', tipo: 'imagen', url: 'https://picsum.photos/seed/parque2/800/600', tamanoBytes: 2600000, fase: 'durante', fechaSubida: new Date('2026-03-20'), subidoPor: 'Arq. Laura Sánchez' },
    ],
    areas: [
      { nombre: 'Nivelación del terreno', entregada: true },
      { nombre: 'Jardines y áreas verdes', entregada: false },
      { nombre: 'Juegos infantiles', entregada: false },
      { nombre: 'Pista de atletismo', entregada: false },
      { nombre: 'Iluminación solar', entregada: false },
      { nombre: 'Barda perimetral', entregada: false },
    ],
    waypoints: [
      { lat: 17.2600, lng: -97.6700, label: 'Entrada principal', timestamp: '2026-02-05T08:00:00' },
      { lat: 17.2603, lng: -97.6695, label: 'Zona jardines', timestamp: '2026-03-20T10:00:00' },
    ],
  },
  {
    id: 'obra-005', urlUnica: 'mercado-municipal-centro',
    nombre: 'Modernización Mercado Municipal',
    descripcion: 'Remodelación integral del mercado central con nuevos 120 locales comerciales, sistema eléctrico trifásico, mejoras sanitarias y fachada moderna.',
    monto: 5900000, avance: 100, status: 'completada',
    ubicacion: 'Centro Histórico, Plaza Principal', coordenadas: { lat: 17.2700, lng: -97.6800 },
    fechaInicio: new Date('2025-06-01'), fechaFin: new Date('2026-01-31'),
    fechaUltimaEdicion: new Date('2026-01-31'),
    responsable: 'Ing. Carlos Mendoza', contratista: 'Remodelaciones del Centro SA',
    archivos: [
      { id: 'e1', nombre: 'mercado-antes.jpg', tipo: 'imagen', url: 'https://picsum.photos/seed/mercado1/800/600', tamanoBytes: 2200000, fase: 'antes', fechaSubida: new Date('2025-06-05'), subidoPor: 'Ing. Carlos Mendoza' },
      { id: 'e2', nombre: 'demolicion.jpg', tipo: 'imagen', url: 'https://picsum.photos/seed/mercado2/800/600', tamanoBytes: 3400000, fase: 'durante', fechaSubida: new Date('2025-08-15'), subidoPor: 'Ing. Carlos Mendoza' },
      { id: 'e3', nombre: 'mercado-terminado.jpg', tipo: 'imagen', url: 'https://picsum.photos/seed/mercado3/800/600', tamanoBytes: 4100000, fase: 'despues', fechaSubida: new Date('2026-01-28'), subidoPor: 'Ing. Carlos Mendoza' },
    ],
    areas: [
      { nombre: 'Locales comerciales', entregada: true },
      { nombre: 'Sistema eléctrico', entregada: true },
      { nombre: 'Baños y sanitarios', entregada: true },
      { nombre: 'Fachada exterior', entregada: true },
      { nombre: 'Estacionamiento', entregada: true },
    ],
    waypoints: [
      { lat: 17.2700, lng: -97.6800, label: 'Entrada mercado', timestamp: '2025-06-10T08:00:00' },
      { lat: 17.2703, lng: -97.6795, label: 'Nave central', timestamp: '2025-09-15T09:00:00' },
      { lat: 17.2706, lng: -97.6790, label: 'Fachada exterior', timestamp: '2025-12-20T11:00:00' },
      { lat: 17.2700, lng: -97.6800, label: 'Entrega final', timestamp: '2026-01-28T16:00:00' },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class ObrasService {
  private _obras = signal<Obra[]>(OBRAS_MOCK);
  obras = this._obras.asReadonly();

  getObras(): Obra[] { return this._obras(); }

  getObraById(id: string): Obra | undefined {
    return this._obras().find(o => o.id === id || o.urlUnica === id);
  }

  addObra(obraDto: Partial<Obra>) {
    const id = `obra-00${this._obras().length + 1}`;
    const urlUnica = obraDto.nombre?.toLowerCase().replace(/ /g, '-') ?? id;
    const nuevaObra: Obra = {
      id, urlUnica,
      nombre: obraDto.nombre || 'Nuevo Proyecto',
      descripcion: obraDto.descripcion || '',
      monto: obraDto.monto || 0,
      avance: 0,
      status: 'activa',
      ubicacion: obraDto.ubicacion || 'Sin especificar',
      coordenadas: { lat: 17.2600, lng: -97.6700 },
      fechaInicio: new Date(),
      fechaFin: new Date(),
      fechaUltimaEdicion: new Date(),
      responsable: obraDto.responsable || 'Sin asignar',
      contratista: 'Contratista No Asignado',
      archivos: [],
      areas: [],
      waypoints: []
    };
    this._obras.update(obras => [nuevaObra, ...obras]);
  }

  isBlocked(obra: Obra): boolean {
    const diff = (new Date().getTime() - obra.fechaUltimaEdicion.getTime()) / 86400000;
    return diff > 15 && obra.status !== 'completada';
  }

  diasSinEditar(obra: Obra): number {
    return Math.floor((new Date().getTime() - obra.fechaUltimaEdicion.getTime()) / 86400000);
  }

  getTotalMonto(): number {
    return this._obras().reduce((s, o) => s + o.monto, 0);
  }

  getAvancePromedio(): number {
    const obras = this._obras();
    return Math.round(obras.reduce((s, o) => s + o.avance, 0) / obras.length);
  }

  getConteoByStatus() {
    const obras = this._obras();
    return {
      activas: obras.filter(o => o.status === 'activa').length,
      completadas: obras.filter(o => o.status === 'completada').length,
      bloqueadas: obras.filter(o => this.isBlocked(o)).length,
      pausadas: obras.filter(o => o.status === 'pausada').length,
      enProceso: obras.filter(o => o.status === 'en_proceso').length,
    };
  }

  getWaypointsByObraId(id: string): Waypoint[] {
    const obra = this.getObraById(id);
    return obra?.waypoints ?? [];
  }

  formatMonto(monto: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(monto);
  }
}
