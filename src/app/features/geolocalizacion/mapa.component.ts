import { Component, AfterViewInit, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
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
    <div class="mapa-page animate-fade-in" [class.fullscreen-page]="modoPantallaCompleta()">
      @if (!modoPantallaCompleta()) {
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
      }
      
      <div class="mapa-layout">
        <!-- Panel Izquierdo: Buscador, Lista y Filtro Exclusivo -->
        @if (!modoPantallaCompleta()) {
          <div class="mapa-list">
          <!-- Buscador e interactivo de obras -->
          <div class="search-panel-box card">
            <div class="search-input-wrap">
              <span class="search-ico">🔍</span>
              <input 
                type="text" 
                placeholder="Buscar por nombre, código o categoría..." 
                class="form-input search-input-mapa"
                [value]="textoBusqueda()"
                (input)="actualizarBusqueda($event)"
              />
              @if (textoBusqueda() || obraFiltroExclusivo()) {
                <button class="btn-clear-search" (click)="limpiarFiltroExclusivo()" title="Limpiar filtro y mostrar todas">✕</button>
              }
            </div>

            <!-- Desplegable selector directo de Obra -->
            <div style="margin-top: 10px;">
              <select class="form-input select-obra-mapa" (change)="seleccionarObraDesdeSelect($event)" [value]="obraFiltroExclusivo()?.id || ''">
                <option value="">-- 📍 Seleccionar Obra Específica --</option>
                @for (ob of obras(); track ob.id) {
                  <option [value]="ob.id">{{ ob.nombre }} ({{ ob.codigo || 'OBR-' + ob.id }})</option>
                }
              </select>
            </div>

            @if (obraFiltroExclusivo()) {
              <div class="enfoque-badge" style="margin-top: 10px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.75rem; font-weight:700; color:var(--accent);">🎯 Mostrando solo: {{ obraFiltroExclusivo()!.nombre }}</span>
                <button class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size:0.7rem;" (click)="limpiarFiltroExclusivo()">Ver todas</button>
              </div>
            }
          </div>

          <div class="list-search-info">
            <span>💡 {{ obrasVisibles().length }} obra(s) encontrada(s). Haz clic en una para aislarla en el mapa.</span>
          </div>

          @for (obra of obrasVisibles(); track obra.id) {
            <div class="mapa-obra-card" [class.selected]="obraSeleccionada()?.id === obra.id" (click)="seleccionarYEnfocarObra(obra)">
              <div class="mapa-obra-top">
                <span class="mapa-dot" [style.background]="getColor(obra)"></span>
                <span class="mapa-obra-nombre">{{ obra.nombre }}</span>
              </div>
              <div class="mapa-obra-meta">
                <span class="status-lbl">{{ getStatusText(obra) }}</span>
                <span class="badge badge-warning" style="font-size:0.7rem;">🏷️ {{ obra.categoria || 'General' }}</span>
              </div>
            </div>
          } @empty {
            <div class="empty-state" style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
              🔍 No se encontraron obras con ese criterio de búsqueda.
            </div>
          }
        </div>
      }

        <!-- Contenedor Principal del Mapa -->
        <div class="mapa-container" [class.fullscreen-container]="modoPantallaCompleta()">
          
          <!-- Toolbar Superior de Controles del Mapa: Capas y Fullscreen -->
          <div class="mapa-toolbar">
            <div class="capas-switcher">
              <span class="switcher-title">🛰️ Vistas del Mapa:</span>
              <button class="capa-btn" [class.active]="capaMapaActual() === 'dark'" (click)="cambiarCapaMapa('dark')">🌙 Oscuro</button>
              <button class="capa-btn" [class.active]="capaMapaActual() === 'satellite'" (click)="cambiarCapaMapa('satellite')">🛰️ Satélite Real</button>
              <button class="capa-btn" [class.active]="capaMapaActual() === 'osm'" (click)="cambiarCapaMapa('osm')">🗺️ Callejero OSM</button>
            </div>
            <div class="toolbar-actions">
              <button class="btn btn-secondary btn-sm" (click)="togglePantallaCompleta()">
                {{ modoPantallaCompleta() ? '🗗 Salir de Pantalla Completa' : '⛶ Pantalla Completa' }}
              </button>
            </div>
          </div>

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

          <!-- Tarjeta de Información flotante al seleccionar una Obra -->
          @if (obraSeleccionada() && !modoTrazar()) {
            <div class="mapa-info-popup animate-slide-in"
                 [style.top.px]="popupTop()"
                 [style.left.px]="popupLeft()"
                 (mousedown)="startPopupDrag($event)">
              <div class="popup-header">
                <strong>{{ obraSeleccionada()!.nombre }}</strong>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="drag-handle" style="font-size:0.7rem;">🖐️ Mover</span>
                  <button (click)="deseleccionarObra()" (mousedown)="$event.stopPropagation()">✕</button>
                </div>
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

              <!-- Botones de Acción -->
              <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px">
                <div style="display:flex; gap:8px;">
                  <button class="btn btn-secondary btn-sm" style="flex:1" (click)="activarTrazado()">📐 Trazar Ruta Lineal</button>
                  <a [routerLink]="['/obras', obraSeleccionada()!.id]" class="btn btn-primary btn-sm" style="flex:1;text-align:center">📂 Expediente</a>
                </div>
                <!-- Botón Navegación GPS directo a Google Maps -->
                <a [href]="getGoogleMapsUrl(obraSeleccionada()!)" target="_blank" class="btn btn-secondary btn-sm" style="width:100%; text-align:center; background: rgba(59, 130, 246, 0.1); border-color: #3B82F6; color: #60A5FA;">
                  🚘 Abrir Navegación GPS (Google Maps) ↗
                </a>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mapa-page { display: flex; flex-direction: column; gap: 20px; height: calc(100vh - 120px); transition: all 0.3s ease; }
    .mapa-page.fullscreen-page { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999; background: var(--bg-dark); padding: 0; margin: 0; }
    .mapa-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .mapa-title { font-size: 1.4rem; font-weight: 800; margin-bottom: 4px; }
    .mapa-subtitle { font-size: 0.85rem; color: var(--text-muted); }
    .leyenda { display: flex; gap: 12px; flex-wrap: wrap; }
    .ley-item { background: transparent; border: 1px solid var(--border); display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: var(--text-secondary); cursor: pointer; transition: all 0.3s; font-family: 'Inter', sans-serif; padding: 4px 10px; border-radius: 8px; }
    .ley-item:hover { background: rgba(255,255,255,0.05); }
    .ley-item.disabled { opacity: 0.35; filter: grayscale(1); }
    .ley-dot { width: 10px; height: 10px; border-radius: 50%; }
    .mapa-layout { display: flex; gap: 20px; flex: 1; overflow: hidden; }
    .mapa-list { width: 330px; flex-shrink: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
    .search-panel-box { padding: 12px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; }
    .search-input-wrap { position: relative; display: flex; align-items: center; }
    .search-ico { position: absolute; left: 10px; font-size: 0.85rem; opacity: 0.7; }
    .search-input-mapa { padding-left: 32px; padding-right: 28px; font-size: 0.8rem; width: 100%; border-radius: 8px; }
    .btn-clear-search { position: absolute; right: 8px; background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.85rem; }
    .select-obra-mapa { font-size: 0.8rem; padding: 6px 10px; border-radius: 8px; background: var(--bg-dark); border: 1px solid var(--border-light); width: 100%; color: var(--text-primary); }
    .list-search-info { font-size: 0.75rem; color: var(--text-muted); padding: 8px 12px; border-radius: 8px; background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--border); }
    .mapa-obra-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px; cursor: pointer; transition: var(--transition); }
    .mapa-obra-card:hover, .mapa-obra-card.selected { border-color: var(--accent); background: var(--bg-surface-hover); }
    .mapa-obra-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .mapa-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .mapa-obra-nombre { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
    .mapa-obra-meta { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); align-items: center; margin-top:4px; }
    .status-lbl { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
    .mapa-container { flex: 1; position: relative; border-radius: 16px; overflow: hidden; border: 1px solid var(--border); }
    .mapa-container.fullscreen-container { border-radius: 0; border: none; }
    
    /* Toolbar de Capas y Pantalla Completa */
    .mapa-toolbar { position: absolute; top: 12px; right: 12px; z-index: 1000; display: flex; gap: 12px; align-items: center; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(8px); padding: 6px 14px; border-radius: 12px; border: 1px solid var(--border-light); }
    .capas-switcher { display: flex; gap: 6px; align-items: center; }
    .switcher-title { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-right: 4px; }
    .capa-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-secondary); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .capa-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
    .capa-btn.active { background: var(--accent); color: #000; border-color: var(--accent); font-weight: 700; }
    
    .mapa-info-popup { position: absolute; z-index: 1000; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 14px; padding: 18px; width: 340px; box-shadow: var(--shadow-lg); max-height: 80%; overflow-y: auto; cursor: grab; }
    .mapa-info-popup:active { cursor: grabbing; }
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
  obraFiltroExclusivo = signal<ObraResponse | null>(null);
  textoBusqueda = signal('');
  activeFilters = signal<Set<string>>(new Set(['EN_PROCESO', 'PLANIFICADA', 'INACTIVA', 'COMPLETADA', 'CANCELADA']));

  capaMapaActual = signal<'dark' | 'osm' | 'satellite'>('dark');
  modoPantallaCompleta = signal(false);

  modoTrazar = signal(false);
  puntosTrazados = signal<{ lat: number, lng: number }[]>([]);
  distanciaTotal = signal(0);
  nombreNuevaRuta = '';
  rutasGuardadas = signal<RutaObraResponse[]>([]);

  bannerTop = signal(16);
  bannerLeft = signal(16);
  popupTop = signal(160);
  popupLeft = signal(16);
  private isDragging = false;
  private isPopupDragging = false;
  private dragOffset = { x: 0, y: 0 };
  private popupDragOffset = { x: 0, y: 0 };

  // Obras computadas según búsqueda y filtro exclusivo
  obrasVisibles = computed(() => {
    if (this.obraFiltroExclusivo()) {
      return [this.obraFiltroExclusivo()!];
    }
    const q = this.textoBusqueda().toLowerCase().trim();
    return this.obras().filter(obra => {
      if (!this.activeFilters().has(obra.estatus)) return false;
      if (!q) return true;
      const nombreMatch = obra.nombre.toLowerCase().includes(q);
      const codigoMatch = (obra.codigo || '').toLowerCase().includes(q);
      const catMatch = (obra.categoria || '').toLowerCase().includes(q);
      const dirMatch = (obra.direccion || '').toLowerCase().includes(q);
      return nombreMatch || codigoMatch || catMatch || dirMatch;
    });
  });

  startPopupDrag(e: MouseEvent) {
    this.isPopupDragging = true;
    this.popupDragOffset = {
      x: e.clientX - this.popupLeft(),
      y: e.clientY - this.popupTop()
    };
    const onMouseMove = (ev: MouseEvent) => {
      if (!this.isPopupDragging) return;
      this.popupLeft.set(Math.max(10, ev.clientX - this.popupDragOffset.x));
      this.popupTop.set(Math.max(10, ev.clientY - this.popupDragOffset.y));
    };
    const onMouseUp = () => {
      this.isPopupDragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

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
  private currentTileLayer?: L.TileLayer;
  private markersData: { marker: L.Marker; estatus: string; obraId: number }[] = [];
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
    this.aplicarCapaMapa('dark');

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.modoTrazar()) {
        const p = { lat: e.latlng.lat, lng: e.latlng.lng };
        this.puntosTrazados.update(prev => [...prev, p]);
        this.actualizarBorradorRuta();
      }
    });

    this.refreshMapMarkers();
  }

  cambiarCapaMapa(tipo: 'dark' | 'osm' | 'satellite') {
    this.capaMapaActual.set(tipo);
    this.aplicarCapaMapa(tipo);
  }

  private aplicarCapaMapa(tipo: 'dark' | 'osm' | 'satellite') {
    if (!this.map) return;
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }

    let url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    let attrib = '&copy; OpenStreetMap &copy; CARTO';

    if (tipo === 'osm') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attrib = '&copy; OpenStreetMap contributors';
    } else if (tipo === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attrib = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    }

    this.currentTileLayer = L.tileLayer(url, { attribution: attrib, maxZoom: 19 }).addTo(this.map);
  }

  togglePantallaCompleta() {
    this.modoPantallaCompleta.set(!this.modoPantallaCompleta());
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  actualizarBusqueda(ev: Event) {
    const val = (ev.target as HTMLInputElement).value;
    this.textoBusqueda.set(val);
    this.refreshMapMarkers();
  }

  seleccionarObraDesdeSelect(ev: Event) {
    const val = (ev.target as HTMLSelectElement).value;
    if (!val) {
      this.limpiarFiltroExclusivo();
      return;
    }
    const id = Number(val);
    const ob = this.obras().find(o => o.id === id);
    if (ob) {
      this.seleccionarYEnfocarObra(ob);
    }
  }

  seleccionarYEnfocarObra(obra: ObraResponse) {
    this.obraFiltroExclusivo.set(obra);
    this.seleccionarObra(obra);
    this.refreshMapMarkers();
  }

  limpiarFiltroExclusivo() {
    this.obraFiltroExclusivo.set(null);
    this.textoBusqueda.set('');
    this.deseleccionarObra();
    this.refreshMapMarkers();
  }

  private refreshMapMarkers(): void {
    if (!this.map) return;

    this.markersData.forEach(m => m.marker.remove());
    this.markersData = [];

    const bounds: L.LatLngExpression[] = [];
    const lista = this.obrasVisibles();

    lista.forEach((obra, i) => {
      const lat = obra.latitud ?? (this.DEFAULT_CENTER.lat + (i * 0.002));
      const lng = obra.longitud ?? (this.DEFAULT_CENTER.lng + (i * 0.002));
      bounds.push([lat, lng]);

      const color = this.getColor(obra);
      const icon = L.divIcon({
        html: `<div style="width:32px;height:32px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 14px ${color}aa;display:flex;align-items:center;justify-content:center;font-size:15px;color:white;font-weight:bold;">📍</div>`,
        className: '', iconSize: [32, 32], iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(`<b style="color:#1a1a1a">${obra.nombre}</b><br>🏷️ ${obra.categoria || 'General'}<br>Estatus: ${this.getStatusText(obra)}`)
        .addTo(this.map!);

      marker.on('click', () => this.seleccionarYEnfocarObra(obra));
      this.markersData.push({ marker, estatus: obra.estatus, obraId: obra.id });
    });

    if (bounds.length === 1) {
      this.map.flyTo(bounds[0], 17, { duration: 1.2 });
    } else if (bounds.length > 1) {
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
    this.refreshMapMarkers();
  }

  seleccionarObra(obra: ObraResponse): void {
    this.obraSeleccionada.set(obra);
    this.rutasSvc.getRutasPorObra(obra.id).subscribe({
      next: (list) => this.rutasGuardadas.set(list),
      error: () => this.rutasGuardadas.set([])
    });

    const lat = obra.latitud ?? this.DEFAULT_CENTER.lat;
    const lng = obra.longitud ?? this.DEFAULT_CENTER.lng;
    this.map?.flyTo([lat, lng], 17, { duration: 1.2 });
  }

  deseleccionarObra(): void {
    this.obraSeleccionada.set(null);
    this.rutasGuardadas.set([]);
  }

  getGoogleMapsUrl(obra: ObraResponse): string {
    const lat = obra.latitud ?? this.DEFAULT_CENTER.lat;
    const lng = obra.longitud ?? this.DEFAULT_CENTER.lng;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
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

