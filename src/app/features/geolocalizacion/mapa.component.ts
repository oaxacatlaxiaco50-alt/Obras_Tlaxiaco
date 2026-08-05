import { Component, AfterViewInit, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ObrasService } from '../../core/services/obras.service';
import { ObraResponse, ESTATUS_LABEL, ESTATUS_COLOR } from '../../core/models/obra.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="mapa-page animate-fade-in">
      <div class="mapa-header">
        <div>
          <h1 class="mapa-title">🗺️ Geolocalización de Obras</h1>
          <p class="mapa-subtitle">Visualiza el trazado de rutas geográficas independientes basadas en JSON por obra</p>
        </div>
        <div class="leyenda">
          <button class="ley-item" [class.disabled]="!activeFilters().has('activa')" (click)="toggleFilter('activa')"><span class="ley-dot" style="background:#2DD4BF"></span>Activa</button>
          <button class="ley-item" [class.disabled]="!activeFilters().has('en_proceso')" (click)="toggleFilter('en_proceso')"><span class="ley-dot" style="background:#6366F1"></span>En Proceso</button>
          <button class="ley-item" [class.disabled]="!activeFilters().has('pausada')" (click)="toggleFilter('pausada')"><span class="ley-dot" style="background:#F59E0B"></span>Pausada</button>
          <button class="ley-item" [class.disabled]="!activeFilters().has('completada')" (click)="toggleFilter('completada')"><span class="ley-dot" style="background:#3B82F6"></span>Completada</button>
          <button class="ley-item" [class.disabled]="!activeFilters().has('bloqueada')" (click)="toggleFilter('bloqueada')"><span class="ley-dot" style="background:#EF4444"></span>Bloqueada</button>
        </div>
      </div>
      <div class="mapa-layout">
        <div class="mapa-list">
          <div class="list-search-info">
            <span>🔍 Selecciona una obra para ver su ruta interactiva GPS</span>
          </div>
          @for (obra of obras(); track obra.id) {
            @if (activeFilters().has(obra.estatus) || (svc.isBlocked(obra) && activeFilters().has('CANCELADA'))) {
              <div class="mapa-obra-card" [class.selected]="obraSeleccionada()?.id === obra.id" (click)="seleccionarObra(obra)">
                <div class="mapa-obra-top">
                  <span class="mapa-dot" [style.background]="getColor(obra)"></span>
                  <span class="mapa-obra-nombre">{{ obra.nombre }}</span>
                </div>
                <div class="mapa-obra-meta">
                  <span class="status-lbl">{{ getStatusText(obra) }}</span>
                  <span>{{ obra.monto | number }}</span>
                </div>
              </div>
            }
          }
        </div>
        <div class="mapa-container">
          <div id="leaflet-map" style="width:100%;height:100%;min-height:520px;border-radius:16px"></div>
          @if (obraSeleccionada()) {
            <div class="mapa-info-popup animate-slide-in">
              <div class="popup-header">
                <strong>{{ obraSeleccionada()!.nombre }}</strong>
                <button (click)="deseleccionarObra()">✕</button>
              </div>
              <p class="popup-desc">{{ truncate(obraSeleccionada()!.descripcion) }}</p>
              <!-- Info de la Obra -->
              <div class="popup-meta" style="margin-top: 12px;">
                <span>Estatus: {{ obraSeleccionada()!.estatus }}</span>
                <span>Monto: {{ obraSeleccionada()!.monto | number }}</span>
              </div>
              <a [routerLink]="['/obras', obraSeleccionada()!.id]" class="btn btn-primary btn-sm" style="margin-top:12px;display:block;text-align:center">Ver Expediente</a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mapa-page { display: flex; flex-direction: column; gap: 20px; height: calc(100vh - 120px); }
    .mapa-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .mapa-title { font-size: 1.4rem; font-weight: 800; margin-bottom: 4px; }
    .mapa-subtitle { font-size: 0.85rem; color: var(--text-muted); }
    .leyenda { display: flex; gap: 16px; }
    .ley-item { background: transparent; border: none; display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: var(--text-secondary); cursor: pointer; transition: all 0.3s; font-family: 'Inter', sans-serif; padding: 4px 8px; border-radius: 8px; }
    .ley-item:hover { background: rgba(255,255,255,0.05); }
    .ley-item.disabled { opacity: 0.3; filter: grayscale(1); }
    .ley-dot { width: 10px; height: 10px; border-radius: 50%; }
    .mapa-layout { display: flex; gap: 20px; flex: 1; overflow: hidden; }
    .mapa-list { width: 300px; flex-shrink: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
    .list-search-info { font-size: 0.8rem; color: var(--text-muted); padding: 4px 8px; border-radius: 6px; background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--border); }
    .mapa-obra-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px; cursor: pointer; transition: var(--transition); }
    .mapa-obra-card:hover, .mapa-obra-card.selected { border-color: var(--accent); background: var(--bg-surface-hover); }
    .mapa-obra-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .mapa-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .mapa-obra-nombre { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
    .mapa-obra-meta { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); align-items: center; }
    .status-lbl { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
    .mapa-container { flex: 1; position: relative; border-radius: 16px; overflow: hidden; border: 1px solid var(--border); }
    .mapa-info-popup { position: absolute; bottom: 20px; right: 20px; z-index: 1000; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 14px; padding: 18px; width: 320px; box-shadow: var(--shadow-lg); max-height: 80%; overflow-y: auto; }
    .popup-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .popup-header strong { font-size: 0.95rem; color: var(--text-primary); }
    .popup-header button { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem; }
    .popup-desc { font-size: 0.78rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 10px; }
    .popup-meta { display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 10px; }
    .route-info-box { background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px; border: 1px solid var(--border); font-size: 0.75rem; margin-top: 10px; }
    .route-info-box.empty { color: var(--text-muted); text-align: center; font-style: italic; }
    .route-list-items { display: flex; flex-direction: column; gap: 6px; max-height: 120px; overflow-y: auto; padding-right: 4px; }
    .route-item-wp { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 4px; }
    .wp-num { width: 16px; height: 16px; border-radius: 50%; background: var(--accent); color: #0F1923; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; flex-shrink: 0; }
    .wp-details { display: flex; flex-direction: column; }
    .wp-label { font-weight: 600; color: var(--text-primary); font-size: 0.72rem; }
    .wp-coords { font-size: 0.65rem; color: var(--text-muted); }
  `]
})
export class MapaComponent implements OnInit, AfterViewInit, OnDestroy {
  svc = inject(ObrasService);
  obras = signal<ObraResponse[]>([]);
  obraSeleccionada = signal<ObraResponse | null>(null);
  activeFilters = signal<Set<string>>(new Set(['EN_PROCESO', 'PLANIFICADA', 'INACTIVA', 'COMPLETADA', 'CANCELADA']));

  private map?: L.Map;
  private markersData: { marker: L.Marker; estatus: string }[] = [];
  private readonly DEFAULT_CENTER = { lat: 17.2661075, lng: -97.676773 };

  ngOnInit() {
    this.svc.getObras({ size: 100 }).subscribe({
      next: (page) => { this.obras.set(page.content); this.refreshMapMarkers(); },
      error: () => {}
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 100);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map('leaflet-map', { center: [this.DEFAULT_CENTER.lat, this.DEFAULT_CENTER.lng], zoom: 14 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19
    }).addTo(this.map);
  }

  private refreshMapMarkers(): void {
    if (!this.map) return;
    this.obras().forEach((obra, i) => {
      const lat = obra.latitud ?? (this.DEFAULT_CENTER.lat + (i * 0.002));
      const lng = obra.longitud ?? (this.DEFAULT_CENTER.lng + (i * 0.002));
      const color = this.getColor(obra);
      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 10px ${color}88;display:flex;align-items:center;justify-content:center;font-size:12px;color:white;font-weight:bold;">📍</div>`,
        className: '', iconSize: [28, 28], iconAnchor: [14, 14]
      });
      const marker = L.marker([lat, lng], { icon })
        .bindPopup(`<b style="color:#1a1a1a">${obra.nombre}</b><br>Estatus: ${this.getStatusText(obra)}<br>📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        .addTo(this.map!);
      marker.on('click', () => this.seleccionarObra(obra));
      this.markersData.push({ marker, estatus: obra.estatus });
    });
  }

  toggleFilter(status: string) {
    const next = new Set(this.activeFilters());
    if (next.has(status)) next.delete(status);
    else next.add(status);
    this.activeFilters.set(next);
    
    // Update markers on map
    this.markersData.forEach(m => {
      if (next.has(m.estatus)) {
        if (!this.map?.hasLayer(m.marker)) m.marker.addTo(this.map!);
      } else {
        if (this.map?.hasLayer(m.marker)) m.marker.remove();
      }
    });
  }

  seleccionarObra(obra: ObraResponse): void {
    this.obraSeleccionada.set(obra);
    this.clearActiveRoute();
    const lat = obra.latitud ?? this.DEFAULT_CENTER.lat;
    const lng = obra.longitud ?? this.DEFAULT_CENTER.lng;
    this.map?.flyTo([lat, lng], 16, { duration: 1 });
  }

  deseleccionarObra(): void {
    this.obraSeleccionada.set(null);
    this.clearActiveRoute();
  }

  private clearActiveRoute(): void {
    // No hay rutas activas en esta version (backend sin geolocalizacion)
  }

  truncate(text: string, len = 90): string {
    return text.length > len ? text.slice(0, len) + '...' : text;
  }

  getColor(obra: ObraResponse): string {
    if (this.svc.isBlocked(obra)) return '#EF4444';
    const colors: Record<string, string> = {
      EN_PROCESO: '#2DD4BF',
      COMPLETADA: '#3B82F6',
      CANCELADA: '#EF4444',
      INACTIVA: '#F59E0B',
      PLANIFICADA: '#6366F1'
    };
    return colors[obra.estatus] ?? '#94A3B8';
  }

  getStatusText(obra: ObraResponse): string {
    if (this.svc.isBlocked(obra)) return 'Bloqueada';
    return ESTATUS_LABEL[obra.estatus] ?? obra.estatus;
  }
}
