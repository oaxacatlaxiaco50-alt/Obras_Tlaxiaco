import { Component, AfterViewInit, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObrasService } from '../../core/services/obras.service';
import { RutasService } from '../../core/services/rutas.service';
import { ObraResponse, ESTATUS_LABEL } from '../../core/models/obra.model';
import { RutaObraResponse } from '../../core/models/ruta.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [RouterLink, DecimalPipe, FormsModule],
  template: `
    <div class="mapa-page animate-fade-in">
      <div class="mapa-header">
        <div>
          <h1 class="mapa-title">🗺️ Geolocalización y Rutas Lineales de Obras</h1>
          <p class="mapa-subtitle">Visualiza la ubicación GPS y realiza trazados lineales reales (pavimentaciones, vialidades, redes de agua)</p>
        </div>
        <div class="leyenda">
          <button class="ley-item" [class.disabled]="!activeFilters().has('PLANIFICADA')" (click)="toggleFilter('PLANIFICADA')"><span class="ley-dot" style="background:#6366F1"></span>Planificada</button>
          <button class="ley-item" [class.disabled]="!activeFilters().has('EN_PROCESO')" (click)="toggleFilter('EN_PROCESO')"><span class="ley-dot" style="background:#2DD4BF"></span>En Proceso</button>
          <button class="ley-item" [class.disabled]="!activeFilters().has('COMPLETADA')" (click)="toggleFilter('COMPLETADA')"><span class="ley-dot" style="background:#3B82F6"></span>Completada</button>
          <button class="ley-item" [class.disabled]="!activeFilters().has('INACTIVA')" (click)="toggleFilter('INACTIVA')"><span class="ley-dot" style="background:#F59E0B"></span>Inactiva</button>
          <button class="ley-item" [class.disabled]="!activeFilters().has('CANCELADA')" (click)="toggleFilter('CANCELADA')"><span class="ley-dot" style="background:#EF4444"></span>Cancelada</button>
        </div>
      </div>
      <div class="mapa-layout">
        <div class="mapa-list">
          <div class="list-search-info">
            <span>🔍 Selecciona una obra para ver sus trazados lineales o registrar nuevas rutas</span>
          </div>
          @for (obra of obras(); track obra.id) {
            @if (activeFilters().has(obra.estatus)) {
              <div class="mapa-obra-card" [class.selected]="obraSeleccionada()?.id === obra.id" (click)="seleccionarObra(obra)">
                <div class="mapa-obra-top">
                  <span class="mapa-dot" [style.background]="getColor(obra)"></span>
                  <span class="mapa-obra-nombre">{{ obra.nombre }}</span>
                </div>
                <div class="mapa-obra-meta">
                  <span class="status-lbl">{{ getStatusText(obra) }}</span>
                  <span class="badge badge-warning" style="font-size:0.7rem;">🏷️ {{ obra.categoria || 'General' }}</span>
                </div>
              </div>
            }
          }
        </div>
        <div class="mapa-container">
          <div id="leaflet-map" style="width:100%;height:100%;min-height:520px;border-radius:16px"></div>
          
          <!-- Floating Draggable Banner para Trazado Lineal -->
          @if (modoTrazar()) {
            <div class="trazar-banner animate-slide-in"
                 [style.top.px]="bannerTop()"
                 [style.left.px]="bannerLeft()"
                 (mousedown)="startDrag($event)">
              <div class="trazar-header">
                <span>📐 <strong>Modo Trazado Lineal</strong></span>
                <span class="drag-handle">🖐️ Mover</span>
              </div>
              <p class="trazar-hint">Haz clic sobre la calle en el mapa para marcar los vértices.</p>
              <div class="trazar-meta">
                <span class="dist-badge">📏 {{ distanciaTotal() }} m</span>
                <span class="badge badge-info">📍 {{ puntosTrazados().length }} pts</span>
              </div>
              <input type="text" [(ngModel)]="nombreNuevaRuta" (mousedown)="$event.stopPropagation()" placeholder="Nombre de la ruta (ej. Tramo Calle Juárez)" class="form-input form-input-sm">
              <div class="trazar-actions">
                <button class="btn btn-secondary btn-sm" (click)="deshacerUltimoPunto()" (mousedown)="$event.stopPropagation()" [disabled]="puntosTrazados().length === 0">⏮️ Deshacer</button>
                <button class="btn btn-primary btn-sm" (click)="guardarRutaLineal()" (mousedown)="$event.stopPropagation()" [disabled]="puntosTrazados().length < 2 || !nombreNuevaRuta.trim()">💾 Guardar</button>
              </div>
              <button class="btn btn-danger btn-sm" (click)="cancelarTrazado()" (mousedown)="$event.stopPropagation()" style="width:100%">✕ Cancelar Trazado</button>
            </div>
          }

          @if (obraSeleccionada() && !modoTrazar()) {
            <div class="mapa-info-popup animate-slide-in">
              <div class="popup-header">
                <strong>{{ obraSeleccionada()!.nombre }}</strong>
                <button (click)="deseleccionarObra()">✕</button>
              </div>
              <p class="popup-desc">{{ truncate(obraSeleccionada()!.descripcion) }}</p>
              <div class="popup-meta" style="margin-top: 12px;">
                <span><strong>Categoría:</strong> 🏷️ {{ obraSeleccionada()!.categoria || 'Infraestructura General' }}</span>
                <span><strong>Estatus:</strong> {{ getStatusText(obraSeleccionada()!) }}</span>
                <span><strong>Monto:</strong> {{ svc.formatMonto(obraSeleccionada()!.monto) }}</span>
                <span><strong>Dirección:</strong> {{ obraSeleccionada()!.direccion || 'Sin dirección especificada' }}</span>
                <span><strong>Rutas Lineales Guardadas:</strong> {{ rutasGuardadas().length }}</span>
              </div>
              
              <!-- Rutas existentes -->
              @if (rutasGuardadas().length > 0) {
                <div class="rutas-lista-wrap">
                  <div class="rutas-lista-title">🛣️ Rutas Trazadas en la Obra:</div>
                  @for (ruta of rutasGuardadas(); track ruta.id) {
                    <div class="ruta-item">
                      <span class="ruta-name">📍 {{ ruta.nombre }} ({{ ruta.puntos.length }} pts)</span>
                      <button class="btn-del-ruta" (click)="eliminarRuta(ruta.id)" title="Eliminar ruta">🗑️</button>
                    </div>
                  }
                </div>
              }

              <div style="display:flex; gap:8px; margin-top:14px">
                <button class="btn btn-secondary btn-sm" style="flex:1" (click)="activarTrazado()">📐 Trazar Ruta Lineal</button>
                <a [routerLink]="['/obras', obraSeleccionada()!.id]" class="btn btn-primary btn-sm" style="flex:1;text-align:center">📂 Expediente</a>
              </div>
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
    .leyenda { display: flex; gap: 12px; flex-wrap: wrap; }
    .ley-item { background: transparent; border: 1px solid var(--border); display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: var(--text-secondary); cursor: pointer; transition: all 0.3s; font-family: 'Inter', sans-serif; padding: 4px 10px; border-radius: 8px; }
    .ley-item:hover { background: rgba(255,255,255,0.05); }
    .ley-item.disabled { opacity: 0.35; filter: grayscale(1); }
    .ley-dot { width: 10px; height: 10px; border-radius: 50%; }
    .mapa-layout { display: flex; gap: 20px; flex: 1; overflow: hidden; }
    .mapa-list { width: 320px; flex-shrink: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
    .list-search-info { font-size: 0.8rem; color: var(--text-muted); padding: 8px 12px; border-radius: 8px; background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--border); }
    .mapa-obra-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px; cursor: pointer; transition: var(--transition); }
    .mapa-obra-card:hover, .mapa-obra-card.selected { border-color: var(--accent); background: var(--bg-surface-hover); }
    .mapa-obra-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .mapa-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .mapa-obra-nombre { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
    .mapa-obra-meta { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); align-items: center; margin-top:4px; }
    .status-lbl { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
    .mapa-container { flex: 1; position: relative; border-radius: 16px; overflow: hidden; border: 1px solid var(--border); }
    .mapa-info-popup { position: absolute; bottom: 20px; right: 20px; z-index: 1000; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 14px; padding: 18px; width: 340px; box-shadow: var(--shadow-lg); max-height: 80%; overflow-y: auto; }
    .popup-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .popup-header strong { font-size: 0.95rem; color: var(--text-primary); }
    .popup-header button { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem; }
    .popup-desc { font-size: 0.78rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 10px; }
    .popup-meta { display: flex; flex-direction: column; gap: 6px; font-size: 0.78rem; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 10px; }
    .trazar-banner { position: absolute; z-index: 1000; background: rgba(20, 24, 33, 0.96); backdrop-filter: blur(10px); border: 1.5px solid var(--accent); border-radius: 14px; padding: 16px; width: 330px; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; gap: 10px; cursor: grab; }
    .trazar-banner:active { cursor: grabbing; }
    .trazar-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; color: var(--text-primary); user-select: none; }
    .drag-handle { font-size: 0.75rem; color: var(--accent); background: rgba(232,160,32,0.12); padding: 2px 8px; border-radius: 6px; font-weight: 600; }
    .trazar-hint { font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; }
    .trazar-meta { display: flex; gap: 8px; align-items: center; }
    .dist-badge { background: var(--accent); color: #000; font-weight: 700; padding: 3px 10px; border-radius: 6px; font-size: 0.8rem; }
    .trazar-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .rutas-lista-wrap { margin-top: 10px; border-top: 1px dashed var(--border); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
    .rutas-lista-title { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); }
    .ruta-item { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; color: var(--text-primary); }
    .btn-del-ruta { background: transparent; border: none; cursor: pointer; font-size: 0.85rem; opacity: 0.7; transition: all 0.2s; }
    .btn-del-ruta:hover { opacity: 1; transform: scale(1.1); }
  `]
})
export class MapaComponent implements OnInit, AfterViewInit, OnDestroy {
  svc = inject(ObrasService);
  rutasSvc = inject(RutasService);

  obras = signal<ObraResponse[]>([]);
  obraSeleccionada = signal<ObraResponse | null>(null);
  activeFilters = signal<Set<string>>(new Set(['EN_PROCESO', 'PLANIFICADA', 'INACTIVA', 'COMPLETADA', 'CANCELADA']));

  modoTrazar = signal(false);
  puntosTrazados = signal<{ lat: number, lng: number }[]>([]);
  distanciaTotal = signal(0);
  nombreNuevaRuta = '';
  rutasGuardadas = signal<RutaObraResponse[]>([]);

  bannerTop = signal(16);
  bannerLeft = signal(16);
  private isDragging = false;
  private dragOffset = { x: 0, y: 0 };

  startDrag(e: MouseEvent) {
    this.isDragging = true;
    this.dragOffset = {
      x: e.clientX - this.bannerLeft(),
      y: e.clientY - this.bannerTop()
    };
    const onMouseMove = (ev: MouseEvent) => {
      if (!this.isDragging) return;
      this.bannerLeft.set(Math.max(10, ev.clientX - this.dragOffset.x));
      this.bannerTop.set(Math.max(10, ev.clientY - this.dragOffset.y));
    };
    const onMouseUp = () => {
      this.isDragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  private map?: L.Map;
  private markersData: { marker: L.Marker; estatus: string }[] = [];
  private draftPolyline?: L.Polyline;
  private draftMarkers: L.CircleMarker[] = [];
  private savedPolylines: L.Polyline[] = [];

  readonly DEFAULT_CENTER = { lat: 17.2661075, lng: -97.676773 };

  ngOnInit() {
    this.svc.getObras({ size: 100 }).subscribe({
      next: (page) => {
        this.obras.set(page.content);
        this.refreshMapMarkers();
        this.cargarTodasLasRutas();
      },
      error: (err) => console.error('Error al cargar obras en mapa:', err)
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 150);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    const container = document.getElementById('leaflet-map');
    if (!container) return;
    if (this.map) return;

    this.map = L.map('leaflet-map', { center: [this.DEFAULT_CENTER.lat, this.DEFAULT_CENTER.lng], zoom: 14 });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.modoTrazar()) {
        const p = { lat: e.latlng.lat, lng: e.latlng.lng };
        this.puntosTrazados.update(prev => [...prev, p]);
        this.actualizarBorradorRuta();
      }
    });

    this.refreshMapMarkers();
  }

  private refreshMapMarkers(): void {
    if (!this.map) return;

    this.markersData.forEach(m => m.marker.remove());
    this.markersData = [];

    const bounds: L.LatLngExpression[] = [];

    this.obras().forEach((obra, i) => {
      const lat = obra.latitud ?? (this.DEFAULT_CENTER.lat + (i * 0.002));
      const lng = obra.longitud ?? (this.DEFAULT_CENTER.lng + (i * 0.002));
      bounds.push([lat, lng]);

      const color = this.getColor(obra);
      const icon = L.divIcon({
        html: `<div style="width:30px;height:30px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 12px ${color}88;display:flex;align-items:center;justify-content:center;font-size:14px;color:white;font-weight:bold;">📍</div>`,
        className: '', iconSize: [30, 30], iconAnchor: [15, 15]
      });

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(`<b style="color:#1a1a1a">${obra.nombre}</b><br>🏷️ ${obra.categoria || 'General'}<br>Estatus: ${this.getStatusText(obra)}`)
        .addTo(this.map!);

      marker.on('click', () => this.seleccionarObra(obra));
      this.markersData.push({ marker, estatus: obra.estatus });
    });

    if (bounds.length > 0) {
      this.map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 16 });
    }
  }

  private cargarTodasLasRutas(): void {
    this.savedPolylines.forEach(p => p.remove());
    this.savedPolylines = [];

    this.obras().forEach(obra => {
      this.rutasSvc.getRutasPorObra(obra.id).subscribe({
        next: (rutas) => {
          if (this.obraSeleccionada()?.id === obra.id) {
            this.rutasGuardadas.set(rutas);
          }
          const color = this.getColor(obra);
          rutas.forEach(r => {
            if (r.puntos && r.puntos.length >= 2) {
              const latlngs: [number, number][] = r.puntos
                .sort((a, b) => a.orden - b.orden)
                .map(pt => [pt.latitud, pt.longitud]);
              
              const polyline = L.polyline(latlngs, {
                color: color,
                weight: 5,
                opacity: 0.85,
                dashArray: '8, 8'
              }).bindPopup(`<b>🛣️ Ruta: ${r.nombre}</b><br>Obra: ${obra.nombre}`);
              
              if (this.map) polyline.addTo(this.map);
              this.savedPolylines.push(polyline);
            }
          });
        },
        error: () => {}
      });
    });
  }

  activarTrazado(): void {
    if (!this.obraSeleccionada()) return;
    this.modoTrazar.set(true);
    this.puntosTrazados.set([]);
    this.distanciaTotal.set(0);
    this.nombreNuevaRuta = `Tramo ${this.obraSeleccionada()!.nombre}`;
  }

  cancelarTrazado(): void {
    this.modoTrazar.set(false);
    this.puntosTrazados.set([]);
    this.limpiarBorradorRuta();
  }

  deshacerUltimoPunto(): void {
    this.puntosTrazados.update(prev => prev.slice(0, -1));
    this.actualizarBorradorRuta();
  }

  private actualizarBorradorRuta(): void {
    if (!this.map) return;
    this.limpiarBorradorRuta();

    const puntos = this.puntosTrazados();
    const latlngs: [number, number][] = puntos.map(p => [p.lat, p.lng]);

    if (latlngs.length > 0) {
      this.draftPolyline = L.polyline(latlngs, { color: '#E8A020', weight: 6, opacity: 0.9 }).addTo(this.map);

      puntos.forEach(pt => {
        const circle = L.circleMarker([pt.lat, pt.lng], { radius: 6, color: '#FFFFFF', fillColor: '#E8A020', fillOpacity: 1 }).addTo(this.map!);
        this.draftMarkers.push(circle);
      });
    }

    // Calcular distancia
    let total = 0;
    for (let i = 0; i < puntos.length - 1; i++) {
      const p1 = L.latLng(puntos[i].lat, puntos[i].lng);
      const p2 = L.latLng(puntos[i + 1].lat, puntos[i + 1].lng);
      total += p1.distanceTo(p2);
    }
    this.distanciaTotal.set(Math.round(total));
  }

  private limpiarBorradorRuta(): void {
    this.draftPolyline?.remove();
    this.draftMarkers.forEach(m => m.remove());
    this.draftMarkers = [];
  }

  guardarRutaLineal(): void {
    const currentObra = this.obraSeleccionada();
    const puntos = this.puntosTrazados();
    if (!currentObra || puntos.length < 2 || !this.nombreNuevaRuta.trim()) return;

    this.rutasSvc.crearRuta({
      obraId: currentObra.id,
      nombre: this.nombreNuevaRuta.trim(),
      descripcion: `Distancia aproximada: ${this.distanciaTotal()} m`,
      puntos: puntos.map(p => ({ latitud: p.lat, longitud: p.lng }))
    }).subscribe({
      next: (nuevaRuta) => {
        alert(`✅ Ruta lineal "${nuevaRuta.nombre}" guardada con éxito (${this.distanciaTotal()} metros).`);
        this.cancelarTrazado();
        this.cargarTodasLasRutas();
      },
      error: (err) => {
        console.error('Error al guardar ruta lineal:', err);
        alert('❌ Error al guardar la ruta lineal.');
      }
    });
  }

  eliminarRuta(rutaId: number): void {
    if (confirm('¿Deseas eliminar esta ruta lineal?')) {
      this.rutasSvc.eliminarRuta(rutaId).subscribe({
        next: () => {
          this.rutasGuardadas.update(list => list.filter(r => r.id !== rutaId));
          this.cargarTodasLasRutas();
        },
        error: (err) => alert('Error al eliminar la ruta.')
      });
    }
  }

  toggleFilter(status: string) {
    const next = new Set(this.activeFilters());
    if (next.has(status)) next.delete(status);
    else next.add(status);
    this.activeFilters.set(next);

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
    this.rutasSvc.getRutasPorObra(obra.id).subscribe({
      next: (list) => this.rutasGuardadas.set(list),
      error: () => this.rutasGuardadas.set([])
    });

    const lat = obra.latitud ?? this.DEFAULT_CENTER.lat;
    const lng = obra.longitud ?? this.DEFAULT_CENTER.lng;
    this.map?.flyTo([lat, lng], 16, { duration: 1 });
  }

  deseleccionarObra(): void {
    this.obraSeleccionada.set(null);
    this.rutasGuardadas.set([]);
  }

  truncate(text: string, len = 90): string {
    if (!text) return '';
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
