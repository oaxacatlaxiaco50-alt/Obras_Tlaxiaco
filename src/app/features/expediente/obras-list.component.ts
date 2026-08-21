import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObrasService } from '../../core/services/obras.service';
import { AuthService } from '../../core/services/auth.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { ToastService } from '../../core/services/toast.service';
import { ObraResponse, ObraEstatus, ESTATUS_LABEL, ESTATUS_COLOR } from '../../core/models/obra.model';
import { UserResponse } from '../../core/models/user.model';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import * as L from 'leaflet';

@Component({
  selector: 'app-obras-list',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <div class="list-page animate-fade-in">
      <div class="list-header">
        <div>
          <h1 class="list-title">📁 Expedientes de Obra</h1>
          <p class="list-subtitle">Consulta y gestiona la información detallada de cada proyecto municipal</p>
        </div>
        @if (auth.hasRole('admin', 'residente')) {
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn" style="background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; box-shadow: 0 4px 12px rgba(16,185,129,0.3);" (click)="abrirModal('obra')">+ Nueva Obra</button>
          </div>
        }
      </div>

      <!-- Buscador y Filtros Servidor -->
      <div class="card filter-card">
        <div class="filter-row" style="display:flex; gap:16px; flex-wrap:wrap; align-items:center;">
          <div class="search-box" style="flex:1; min-width:280px;">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar por código, nombre o descripción en servidor..." 
              class="form-input search-input"
              [value]="filtroTexto()"
              (input)="updateFiltroTexto($event)"
            />
          </div>
          <select [value]="filtroCategoria()" (change)="cambiarCategoria($event)" class="form-input" style="width:240px; border-color:var(--border-light);">
            <option value="todas">🏷️ Todas las Categorías</option>
            <option value="Pavimentación y Vialidades">🛣️ Pavimentación y Vialidades</option>
            <option value="Agua Potable y Drenaje">💧 Agua Potable y Drenaje</option>
            <option value="Electrificación y Alumbrado">⚡ Electrificación y Alumbrado</option>
            <option value="Educación y Escuelas">🏫 Educación y Escuelas</option>
            <option value="Salud y Espacios Públicos">🏥 Salud y Espacios Públicos</option>
            <option value="Infraestructura General">🏗️ Infraestructura General</option>
          </select>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary" (click)="exportarPDF()">📄 Exportar PDF</button>
            <button class="btn btn-secondary" style="border-color: #10B981; color: #10B981;" (click)="exportarExcel()">📊 Exportar Excel</button>
          </div>
        </div>
        <div class="filter-row" style="margin-top: 16px;">
          <div class="status-tabs">
            <button class="tab-btn" [class.active]="filtroStatus() === 'todas'" (click)="cambiarEstatusTab('todas')">Todas</button>
            <button class="tab-btn" [class.active]="filtroStatus() === 'PLANIFICADA'" (click)="cambiarEstatusTab('PLANIFICADA')">📋 Planificadas</button>
            <button class="tab-btn" [class.active]="filtroStatus() === 'EN_PROCESO'" (click)="cambiarEstatusTab('EN_PROCESO')">🟢 En Proceso</button>
            <button class="tab-btn" [class.active]="filtroStatus() === 'COMPLETADA'" (click)="cambiarEstatusTab('COMPLETADA')">🔵 Completadas</button>
            <button class="tab-btn" [class.active]="filtroStatus() === 'INACTIVA'" (click)="cambiarEstatusTab('INACTIVA')">🟠 Inactivas</button>
            <button class="tab-btn" [class.active]="filtroStatus() === 'CANCELADA'" (click)="cambiarEstatusTab('CANCELADA')">🔴 Canceladas</button>
          </div>
        </div>
      </div>

      <!-- Tabla de Expedientes -->
      <div class="card table-card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código / Nombre del Proyecto</th>
                <th>Inversión Autorizada</th>
                <th>Responsable / Contratista</th>
                <th>Porcentaje de Avance</th>
                <th>Estado del Proyecto</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (obra of obrasFiltradas(); track obra.id) {
                <tr class="interactive-row" (click)="abrirExpediente(obra.id)">
                  <td>
                    <div class="obra-name-cell">
                      <span class="obra-code">{{ obra.codigo ?? obra.id }}</span>
                      <span class="obra-name">{{ obra.nombre }}</span>
                      <span class="obra-location">🏷️ {{ obra.categoria || 'Infraestructura General' }} · {{ obra.direccion || 'Tlaxiaco' }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="investment-val">{{ svc.formatMonto(obra.monto) }}</span>
                  </td>
                  <td>
                    <div class="resp-cell">
                      <span class="resp-name">Resp. #{{ obra.responsableId }}</span>
                      <span class="contratista-name">{{ obra.estatus }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="progress-cell">
                      <div class="progress-meta">
                        <span class="progress-val">{{ obra.porcentajeAvance ?? (obra.estatus === 'COMPLETADA' || obra.estatus === 'FINALIZADA' ? 100 : 0) }}% avance</span>
                        <span class="progress-dates">Fin: {{ obra.fechaFin }}</span>
                      </div>
                      <div class="progress-bar">
                        <div class="progress-fill" [style.width.%]="obra.porcentajeAvance ?? (obra.estatus === 'COMPLETADA' || obra.estatus === 'FINALIZADA' ? 100 : 0)" [style.background]="getProgressGradient(obra.porcentajeAvance ?? (obra.estatus === 'COMPLETADA' || obra.estatus === 'FINALIZADA' ? 100 : 0))"></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [class]="getStatusBadgeClass(obra)">
                      {{ getStatusText(obra) }}
                    </span>
                  </td>
                  <td style="text-align: right;" (click)="$event.stopPropagation()">
                    <div class="actions-cell" style="display:inline-flex; gap:6px;">
                      <a [routerLink]="['/obras', obra.id]" class="btn btn-primary btn-sm table-btn" style="background:#E8A020; border-color:#E8A020; color:#fff; font-weight:700;">
                        🏛️ Expediente (4 Cat.)
                      </a>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="empty-table-cell">
                    <div class="empty-state">
                      <span class="empty-icon">📁</span>
                      <p class="empty-text">No se encontraron expedientes con los criterios seleccionados.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <!-- Paginador Servidor -->
        <div class="pagination-footer" style="display:flex; justify-content:space-between; align-items:center; padding:16px 24px; border-top:1px solid var(--border); flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px; font-size:0.85rem; color:var(--text-muted);">
            <span>Mostrando <strong>{{ todasLasObras().length }}</strong> de <strong>{{ totalElementos() }}</strong> obras registradas</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <span>Filas:</span>
              <select [value]="tamanioPagina()" (change)="cambiarTamanioPagina($event)" class="form-input" style="padding:2px 8px; width:75px; font-size:0.8rem;">
                <option [value]="5">5</option>
                <option [value]="10">10</option>
                <option [value]="25">25</option>
                <option [value]="50">50</option>
              </select>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-secondary btn-sm" (click)="irAPagina(0)" [disabled]="paginaActual() === 0">⏮️ Primera</button>
            <button class="btn btn-secondary btn-sm" (click)="irAPagina(paginaActual() - 1)" [disabled]="paginaActual() === 0">◀️ Anterior</button>
            <span style="font-size:0.85rem; padding:0 8px; font-weight:600; color:var(--text-primary);">
              Página {{ paginaActual() + 1 }} de {{ totalPaginas() }}
            </span>
            <button class="btn btn-secondary btn-sm" (click)="irAPagina(paginaActual() + 1)" [disabled]="paginaActual() >= totalPaginas() - 1">Siguiente ▶️</button>
            <button class="btn btn-secondary btn-sm" (click)="irAPagina(totalPaginas() - 1)" [disabled]="paginaActual() >= totalPaginas() - 1">Última ⏭️</button>
          </div>
        </div>
      </div>

      <!-- Modal Nueva Obra -->
      @if (mostrarModalNuevaObra()) {
      <div class="modal-overlay animate-fade-in">
        <div class="modal-content animate-slide-in" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header">
            <h2 class="modal-title">🏗️ Crear Nueva Obra</h2>
            <button class="btn-close" (click)="cerrarModalNuevaObra()">✕</button>
          </div>
          <form class="modal-form" (submit)="crearObra($event)">
            <div class="form-group">
              <label class="form-label">Nombre del Proyecto *</label>
              <input type="text" name="nombre" class="form-input" placeholder="Ej. Pavimentación Calle Juárez" required (input)="valNombreTexto.set($any($event.target).value)">
              @if (valNombreTexto() && valNombreTexto().trim().length < 5) {
                <span style="font-size:0.75rem; color:#EF4444; font-weight:600; margin-top:4px; display:block;">
                  ⚠️ Mínimo 5 caracteres (Actual: {{ valNombreTexto().trim().length }})
                </span>
              }
            </div>

            <!-- Mapa para seleccionar ubicación con cursor -->
            <div class="form-group">
              <label class="form-label">📍 Seleccionar Ubicación en el Mapa (Haz clic o arrastra el marcador)</label>
              <div id="modal-map" style="width: 100%; height: 220px; border-radius: 10px; margin-top: 6px; border: 1px solid var(--border); overflow: hidden; background: #0b131e;"></div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--accent); margin-top: 6px; background: rgba(0,0,0,0.25); padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border);">
                <span>Latitud: <strong>{{ latitudSeleccionada() ?? 17.266108 }}</strong></span>
                <span>Longitud: <strong>{{ longitudSeleccionada() ?? -97.676773 }}</strong></span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Ubicación / Dirección</label>
              <input type="text" name="direccion" class="form-input" placeholder="Ej. Sector Sur, Tlaxiaco">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Fecha Inicio *</label>
                <input type="date" name="fechaInicio" class="form-input" required (change)="valFechaInicio.set($any($event.target).value)">
              </div>
              <div class="form-group">
                <label class="form-label">Fecha Fin *</label>
                <input type="date" name="fechaFin" class="form-input" [min]="valFechaInicio()" required (change)="valFechaFin.set($any($event.target).value)">
                @if (valFechaFin() && valFechaInicio() && valFechaFin() < valFechaInicio()) {
                  <span style="font-size:0.75rem; color:#EF4444; font-weight:600; margin-top:4px; display:block;">
                    ⚠️ La fecha fin no puede ser anterior al inicio
                  </span>
                }
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Presupuesto Asignado ($) *</label>
                <input type="number" name="monto" class="form-input" placeholder="0.00" min="1" step="0.01" required>
              </div>
              <div class="form-group">
                <label class="form-label">Categoría de Obra *</label>
                <select class="form-input" name="categoria" required>
                  <option value="Pavimentación y Vialidades">🛣️ Pavimentación y Vialidades</option>
                  <option value="Agua Potable y Drenaje">💧 Agua Potable y Drenaje</option>
                  <option value="Electrificación y Alumbrado">⚡ Electrificación y Alumbrado</option>
                  <option value="Educación y Escuelas">🏫 Educación y Escuelas</option>
                  <option value="Salud y Espacios Públicos">🏥 Salud y Espacios Públicos</option>
                  <option value="Infraestructura General" selected>🏗️ Infraestructura General</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Responsable a Cargo *</label>
              <select class="form-input" name="responsableId" required>
                <option value="" disabled selected>— Selecciona un responsable —</option>
                @for (u of responsables(); track u.id) {
                  <option [value]="u.id">{{ u.firstName }} {{ u.lastName }} (ID: {{ u.id }})</option>
                }
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 24px;">
              <label class="form-label">Descripción Breve (mín. 10, máx. 500 caracteres)</label>
              <textarea name="descripcion" class="form-input" rows="3" placeholder="Detalles de la obra..." maxlength="500" (input)="valDescripcionTexto.set($any($event.target).value)"></textarea>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; margin-top:4px;">
                @if (valDescripcionTexto().trim().length > 0 && valDescripcionTexto().trim().length < 10) {
                  <span style="color:#F59E0B; font-weight:600;">⚠️ Mínimo 10 caracteres (faltan {{ 10 - valDescripcionTexto().trim().length }})</span>
                } @else if (valDescripcionTexto().trim().length > 500) {
                  <span style="color:#EF4444; font-weight:600;">⚠️ Excede el máximo de 500 caracteres</span>
                } @else {
                  <span></span>
                }
                <span [style.color]="valDescripcionTexto().trim().length > 500 ? '#EF4444' : 'var(--text-muted)'">
                  {{ valDescripcionTexto().trim().length }}/500
                </span>
              </div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="cerrarModalNuevaObra()">Cancelar</button>
              <button type="submit" class="btn btn-primary">💾 Guardar Proyecto</button>
            </div>
          </form>
        </div>
      </div>
      }
      <!-- Modal Nuevo Expediente -->
      @if (mostrarModalNuevoExpediente()) {
      <div class="modal-overlay animate-fade-in">
        <div class="modal-content animate-slide-in">
          <div class="modal-header">
            <h2 class="modal-title">📂 Crear Nuevo Expediente</h2>
            <button class="btn-close" (click)="mostrarModalNuevoExpediente.set(false)">✕</button>
          </div>
          <form class="modal-form" (submit)="crearExpediente($event)">
            <div class="form-group">
              <label class="form-label">Obra Asociada *</label>
              <select class="form-input" required>
                <option value="" disabled selected>— Selecciona una Obra —</option>
                @for (o of todasLasObras(); track o.id) {
                  <option [value]="o.id">{{ o.nombre }} ({{ o.id }})</option>
                }
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Número de Licitación / Expediente</label>
                <input type="text" class="form-input" placeholder="Ej. LIC-2026-001" required>
              </div>
              <div class="form-group">
                <label class="form-label">Empresa Contratista</label>
                <input type="text" class="form-input" placeholder="Ej. Constructora del Sur SA" required>
              </div>
            </div>
            <div class="form-row" style="margin-bottom: 24px;">
              <div class="form-group">
                <label class="form-label">Fecha de Firma (Contrato)</label>
                <input type="date" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">Fecha Estimada de Término</label>
                <input type="date" class="form-input" required>
              </div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="mostrarModalNuevoExpediente.set(false)">Cancelar</button>
              <button type="submit" class="btn btn-primary">📁 Integrar Expediente</button>
            </div>
          </form>
        </div>
      </div>
      }
      <!-- Modal Integracion de Expedientes -->
      @if (mostrarModalIntegracion()) {
      <div class="modal-overlay animate-fade-in">
        <div class="modal-content animate-slide-in" style="max-width: 650px;">
          <div class="modal-header">
            <h2 class="modal-title">🗂️ Integración de Expedientes</h2>
            <button class="btn-close" (click)="mostrarModalIntegracion.set(false)">✕</button>
          </div>
          <div class="modal-body" style="padding: 24px;">
            @if (!carpetaSeleccionada()) {
              <p style="margin-bottom: 20px; color: var(--text-muted); font-size: 0.9rem;">
                Selecciona una categoría para gestionar los documentos del expediente.
              </p>
              <div class="folders-grid">
                <div class="folder-card" (click)="abrirCarpeta('Legal')">
                  <span class="folder-icon">⚖️</span>
                  <span class="folder-name">Legal</span>
                  <span class="folder-count">{{ archivosSubidos()['Legal'].length }} archivos</span>
                </div>
                <div class="folder-card" (click)="abrirCarpeta('Social')">
                  <span class="folder-icon">👥</span>
                  <span class="folder-name">Social</span>
                  <span class="folder-count">{{ archivosSubidos()['Social'].length }} archivos</span>
                </div>
                <div class="folder-card" (click)="abrirCarpeta('Técnicos')">
                  <span class="folder-icon">📐</span>
                  <span class="folder-name">Técnicos</span>
                  <span class="folder-count">{{ archivosSubidos()['Técnicos'].length }} archivos</span>
                </div>
                <div class="folder-card" (click)="abrirCarpeta('Anexo Fotográfico')">
                  <span class="folder-icon">📸</span>
                  <span class="folder-name">Anexo Fotográfico</span>
                  <span class="folder-count">{{ archivosSubidos()['Anexo Fotográfico'].length }} archivos</span>
                </div>
              </div>
            } @else {
              <!-- Vista interna de carpeta con Drag & Drop -->
              <button class="btn btn-secondary btn-sm" style="margin-bottom: 16px;" (click)="carpetaSeleccionada.set(null)">
                ⬅ Volver a las categorías
              </button>
              <h3 style="margin-bottom: 16px; color: var(--accent);">Carpeta: {{ carpetaSeleccionada() }}</h3>
              
              <div 
                class="drag-drop-zone" 
                [class.dragover]="isDragOver()"
                (dragover)="onDragOver($event)" 
                (dragleave)="onDragLeave($event)" 
                (drop)="onDrop($event)">
                <div class="drop-icon">📤</div>
                <p>Arrastra tus archivos aquí o <strong>haz clic para seleccionar</strong></p>
                <input type="file" multiple class="file-input-hidden" (change)="onFileSelect($event)">
              </div>

              <div class="file-list">
                @for (file of archivosSubidos()[carpetaSeleccionada()!]; track file.name) {
                  <div class="file-item">
                    <span class="file-icon">📄</span>
                    <span class="file-name">{{ file.name }}</span>
                    <span class="file-size">{{ (file.size / 1024).toFixed(1) }} KB</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
      }
    </div>
  `,
  styles: [`
    .list-page { display: flex; flex-direction: column; gap: 24px; }
    .list-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
    .list-title { font-size: 1.4rem; font-weight: 800; margin-bottom: 4px; }
    .list-subtitle { font-size: 0.85rem; color: var(--text-muted); }
    
    .filter-card { padding: 18px 24px; }
    .filter-row { display: flex; flex-direction: column; gap: 16px; }
    
    @media (min-width: 1024px) {
      .filter-row { flex-direction: row; align-items: center; justify-content: space-between; }
    }

    .search-box { position: relative; flex: 1; min-width: 280px; }
    .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 1.1rem; color: var(--text-muted); }
    .search-input { padding-left: 48px; width: 100%; }
    
    .status-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
    .tab-btn {
      background: var(--bg-dark); border: 1px solid var(--border);
      color: var(--text-secondary); padding: 8px 16px; border-radius: 8px;
      font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: var(--transition);
    }
    .tab-btn:hover { border-color: var(--accent); color: var(--text-primary); }
    .tab-btn.active { background: rgba(232, 160, 32, 0.12); color: var(--accent); border-color: var(--accent); }

    .table-card { padding: 0; overflow: hidden; border-color: var(--border-light); }
    .interactive-row { cursor: pointer; transition: var(--transition); }
    .interactive-row:hover td { background: rgba(255, 255, 255, 0.03) !important; }
    
    .obra-name-cell { display: flex; flex-direction: column; gap: 2px; }
    .obra-code { font-size: 0.72rem; font-weight: 700; color: var(--accent); letter-spacing: 0.05em; text-transform: uppercase; }
    .obra-name { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
    .obra-location { font-size: 0.76rem; color: var(--text-muted); }
    
    .investment-val { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }
    
    .resp-cell { display: flex; flex-direction: column; gap: 2px; }
    .resp-name { font-size: 0.82rem; font-weight: 500; color: var(--text-primary); }
    .contratista-name { font-size: 0.76rem; color: var(--text-muted); }
    
    .progress-cell { display: flex; flex-direction: column; gap: 6px; min-width: 140px; }
    .progress-meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; }
    .progress-val { font-weight: 700; }
    .progress-dates { color: var(--text-muted); }
    
    .badge-activa { background: var(--success-bg); color: var(--success); }
    .badge-en_proceso { background: rgba(99, 102, 241, 0.12); color: #818CF8; }
    .badge-pausada { background: var(--warning-bg); color: var(--warning); }
    .badge-completada { background: var(--info-bg); color: var(--info); }
    .badge-bloqueada { background: var(--danger-bg); color: var(--danger); }
    
    .actions-cell { display: flex; justify-content: flex-end; }
    .table-btn { font-size: 0.78rem; font-weight: 600; padding: 6px 14px; }
    
    .empty-table-cell { padding: 48px 0; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
    .empty-icon { font-size: 2.5rem; filter: grayscale(1); }
    .empty-text { font-size: 0.88rem; color: var(--text-muted); }
    
    .folders-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 20px; }
    .folder-card { 
      background: var(--bg-dark); border: 1px solid var(--border); border-radius: 12px; 
      padding: 24px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; 
      cursor: pointer; transition: all 0.3s ease; 
    }
    .folder-card:hover { 
      transform: translateY(-4px); border-color: var(--accent); 
      box-shadow: 0 8px 24px rgba(232, 160, 32, 0.15); 
    }
    .folder-icon { font-size: 2.5rem; line-height: 1; }
    .folder-name { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); text-align: center; }
    .folder-count { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }

    /* Drag and Drop Styles */
    .drag-drop-zone { border: 2px dashed var(--border); border-radius: 12px; padding: 40px 20px; text-align: center; background: rgba(0,0,0,0.1); cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden; }
    .drag-drop-zone:hover { border-color: var(--accent); background: rgba(232, 160, 32, 0.05); }
    .drag-drop-zone.dragover { border-color: var(--success); background: rgba(45, 212, 191, 0.1); transform: scale(1.02); }
    .drop-icon { font-size: 3rem; margin-bottom: 12px; opacity: 0.8; }
    .file-input-hidden { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
    .file-list { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; }
    .file-item { display: flex; align-items: center; gap: 12px; background: var(--bg-surface); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-light); }
    .file-name { flex: 1; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .file-size { font-size: 0.75rem; color: var(--text-muted); }

    /* Modal Overlay Styles */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); display: flex; align-items: flex-start; justify-content: center; z-index: 10000; overflow-y: auto; padding-top: 60px; padding-bottom: 60px; }
    .modal-content { background: var(--bg-surface); width: 90%; max-width: 500px; border-radius: var(--radius-lg); border: 1px solid var(--border-light); box-shadow: var(--shadow-lg); overflow: hidden; display: flex; flex-direction: column; margin: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); background: rgba(0,0,0,0.2); }
    .modal-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
    .btn-close { background: transparent; border: none; font-size: 1.2rem; color: var(--text-muted); cursor: pointer; transition: var(--transition); }
    .btn-close:hover { color: var(--danger); transform: scale(1.1); }
    .modal-form { padding: 24px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border); }
  `]
})
export class ObrasListComponent implements OnInit {
  svc = inject(ObrasService);
  auth = inject(AuthService);
  router = inject(Router);
  usuariosSvc = inject(UsuariosService);
  toastSvc = inject(ToastService);

  mostrarModalNuevaObra = signal(false);
  mostrarModalNuevoExpediente = signal(false);
  mostrarModalIntegracion = signal(false);

  // Señales de validación en vivo de formulario
  valNombreTexto = signal('');
  valFechaInicio = signal('');
  valFechaFin = signal('');
  valDescripcionTexto = signal('');

  responsableSeleccionado = signal('');
  responsables = signal<UserResponse[]>([]);
  todasLasObras = signal<ObraResponse[]>([]);
  cargando = signal(true);

  carpetaSeleccionada = signal<string | null>(null);
  isDragOver = signal(false);
  archivosSubidos = signal<Record<string, any[]>>({
    'Legal': [], 'Social': [], 'Técnicos': [], 'Anexo Fotográfico': []
  });

  filtroTexto = signal('');
  filtroStatus = signal<string>('todas');
  filtroCategoria = signal<string>('todas');

  paginaActual = signal(0);
  tamanioPagina = signal(10);
  totalPaginas = signal(1);
  totalElementos = signal(0);

  ngOnInit() {
    this.cargarObrasPaginadas();
    this.usuariosSvc.getUsuarios().subscribe({
      next: (users) => this.responsables.set(users),
      error: () => {}
    });
  }

  cargarObrasPaginadas(): void {
    this.cargando.set(true);
    const search = this.filtroTexto().trim();
    const statusVal = this.filtroStatus();
    const catVal = this.filtroCategoria();

    if (search) {
      this.svc.searchObras(search, this.paginaActual(), this.tamanioPagina()).subscribe({
        next: (page) => {
          this.todasLasObras.set(page.content || []);
          this.totalPaginas.set(page.totalPages || 1);
          this.totalElementos.set(page.totalElements || 0);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false)
      });
    } else {
      const estatusParam = statusVal !== 'todas' ? (statusVal as ObraEstatus) : undefined;
      const categoriaParam = catVal !== 'todas' ? catVal : undefined;

      this.svc.getObras({
        page: this.paginaActual(),
        size: this.tamanioPagina(),
        estatus: estatusParam,
        categoria: categoriaParam
      }).subscribe({
        next: (page) => {
          if (statusVal === 'COMPLETADA' && (!page.content || page.content.length === 0)) {
            this.svc.getObras({
              page: this.paginaActual(),
              size: this.tamanioPagina(),
              estatus: 'FINALIZADA' as ObraEstatus,
              categoria: categoriaParam
            }).subscribe({
              next: (fPage) => {
                this.todasLasObras.set(fPage.content || []);
                this.totalPaginas.set(fPage.totalPages || 1);
                this.totalElementos.set(fPage.totalElements || 0);
                this.cargando.set(false);
              },
              error: () => this.cargando.set(false)
            });
          } else {
            this.todasLasObras.set(page.content || []);
            this.totalPaginas.set(page.totalPages || 1);
            this.totalElementos.set(page.totalElements || 0);
            this.cargando.set(false);
          }
        },
        error: () => this.cargando.set(false)
      });
    }
  }

  obrasFiltradas = computed(() => this.todasLasObras());

  updateFiltroTexto(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filtroTexto.set(value);
    this.paginaActual.set(0);
    this.cargarObrasPaginadas();
  }

  cambiarEstatusTab(status: string): void {
    this.filtroStatus.set(status);
    this.paginaActual.set(0);
    this.cargarObrasPaginadas();
  }

  cambiarCategoria(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filtroCategoria.set(value);
    this.paginaActual.set(0);
    this.cargarObrasPaginadas();
  }

  irAPagina(page: number): void {
    if (page >= 0 && page < this.totalPaginas()) {
      this.paginaActual.set(page);
      this.cargarObrasPaginadas();
    }
  }

  cambiarTamanioPagina(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    this.tamanioPagina.set(size);
    this.paginaActual.set(0);
    this.cargarObrasPaginadas();
  }

  abrirExpediente(id: number): void {
    this.router.navigate(['/obras', id]);
  }

  latitudSeleccionada = signal<number | null>(17.266108);
  longitudSeleccionada = signal<number | null>(-97.676773);
  private modalMap?: L.Map;
  private modalMarker?: L.Marker;

  abrirModal(tipo: 'obra' | 'expediente'): void {
    if (tipo === 'obra') {
      this.mostrarModalNuevaObra.set(true);
      this.initModalMap();
    } else {
      this.mostrarModalNuevoExpediente.set(true);
    }
  }

  cerrarModalNuevaObra(): void {
    if (this.modalMap) {
      this.modalMap.remove();
      this.modalMap = undefined;
    }
    this.valNombreTexto.set('');
    this.valFechaInicio.set('');
    this.valFechaFin.set('');
    this.valDescripcionTexto.set('');
    this.mostrarModalNuevaObra.set(false);
  }

  initModalMap(): void {
    setTimeout(() => {
      const container = document.getElementById('modal-map');
      if (!container) return;
      if (this.modalMap) {
        this.modalMap.remove();
        this.modalMap = undefined;
      }
      const initialLat = 17.266108;
      const initialLng = -97.676773;
      this.latitudSeleccionada.set(initialLat);
      this.longitudSeleccionada.set(initialLng);

      this.modalMap = L.map('modal-map', { center: [initialLat, initialLng], zoom: 14 });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19
      }).addTo(this.modalMap);

      const icon = L.divIcon({
        html: `<div style="width:30px;height:30px;background:#10B981;border:2px solid #fff;border-radius:50%;box-shadow:0 0 12px rgba(16,185,129,0.8);display:flex;align-items:center;justify-content:center;font-size:14px;color:white;font-weight:bold;">📍</div>`,
        className: '', iconSize: [30, 30], iconAnchor: [15, 15]
      });

      this.modalMarker = L.marker([initialLat, initialLng], { icon, draggable: true }).addTo(this.modalMap);

      this.modalMap.on('click', (e: L.LeafletMouseEvent) => {
        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));
        this.latitudSeleccionada.set(lat);
        this.longitudSeleccionada.set(lng);
        if (this.modalMarker) {
          this.modalMarker.setLatLng([lat, lng]);
        }
      });

      this.modalMarker.on('dragend', () => {
        if (this.modalMarker) {
          const pos = this.modalMarker.getLatLng();
          this.latitudSeleccionada.set(Number(pos.lat.toFixed(6)));
          this.longitudSeleccionada.set(Number(pos.lng.toFixed(6)));
        }
      });
    }, 150);
  }

  crearObra(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const nombre = (formData.get('nombre') as string)?.trim() || '';
    const direccion = (formData.get('direccion') as string)?.trim() || '';
    const fechaInicio = (formData.get('fechaInicio') as string) || '';
    const fechaFin = (formData.get('fechaFin') as string) || '';
    const rawMonto = formData.get('monto') as string;
    const monto = parseFloat(rawMonto) || 0;
    const responsableId = Number(formData.get('responsableId')) || 0;
    const descripcion = (formData.get('descripcion') as string)?.trim() || '';
    const categoria = (formData.get('categoria') as string) || 'Infraestructura General';
    const latitud = this.latitudSeleccionada() ?? 17.266108;
    const longitud = this.longitudSeleccionada() ?? -97.676773;

    // --- VALIDACIONES DE CAMPOS ---
    if (!nombre || nombre.length < 5) {
      this.toastSvc.show('⚠️ El nombre de la obra debe contener al menos 5 caracteres.', 'warning');
      return;
    }

    if (nombre.length > 150) {
      this.toastSvc.show('⚠️ El nombre de la obra no debe superar los 150 caracteres.', 'warning');
      return;
    }

    if (!fechaInicio) {
      this.toastSvc.show('⚠️ Debes seleccionar una Fecha de Inicio válida.', 'warning');
      return;
    }

    if (!fechaFin) {
      this.toastSvc.show('⚠️ Debes seleccionar una Fecha de Término válida.', 'warning');
      return;
    }

    if (fechaFin < fechaInicio) {
      this.toastSvc.show('⚠️ La fecha de término no puede ser anterior a la fecha de inicio de la obra.', 'warning');
      return;
    }

    if (!rawMonto || monto <= 0) {
      this.toastSvc.show('⚠️ El presupuesto asignado debe ser mayor a $0.00.', 'warning');
      return;
    }

    if (!responsableId) {
      this.toastSvc.show('⚠️ Debes seleccionar un Responsable a cargo para la obra.', 'warning');
      return;
    }

    if (descripcion && descripcion.length < 10) {
      this.toastSvc.show('⚠️ La descripción breve debe contener al menos 10 caracteres.', 'warning');
      return;
    }

    if (descripcion && descripcion.length > 500) {
      this.toastSvc.show(`⚠️ La descripción breve supera el máximo permitido de 500 caracteres (Actual: ${descripcion.length}).`, 'warning');
      return;
    }

    // Generar código único válido
    const codigo = 'OBR-' + Date.now().toString().slice(-6);

    this.svc.createObra({
      codigo,
      nombre,
      descripcion,
      monto,
      fechaInicio,
      fechaFin,
      estatus: 'PLANIFICADA',
      responsableId,
      direccion,
      categoria,
      latitud,
      longitud
    }).subscribe({
      next: (nueva) => {
        this.todasLasObras.update(list => [nueva, ...list]);
        this.toastSvc.show('¡Obra creada exitosamente con su ubicación GPS!', 'success');
        this.cerrarModalNuevaObra();
      },
      error: (err) => {
        console.error('Error al crear obra:', err);
        const detail = err.error?.message || err.error?.detail || err.statusText || 'Error inesperado';
        this.toastSvc.show(`Error al crear obra: ${detail}`, 'error');
      }
    });
  }

  crearExpediente(e: Event) {
    e.preventDefault();
    this.toastSvc.show('¡Expediente integrado exitosamente!', 'success');
    this.mostrarModalNuevoExpediente.set(false);
  }

  abrirCarpeta(nombre: string): void {
    this.carpetaSeleccionada.set(nombre);
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
    if (e.dataTransfer?.files) {
      this.handleFiles(Array.from(e.dataTransfer.files));
    }
  }

  onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  private handleFiles(files: File[]) {
    const carpeta = this.carpetaSeleccionada();
    if (!carpeta) return;
    
    const actuales = this.archivosSubidos();
    const nuevos = files.map(f => ({ name: f.name, size: f.size }));
    this.archivosSubidos.set({
      ...actuales,
      [carpeta]: [...actuales[carpeta], ...nuevos]
    });
    this.toastSvc.show(`Se subieron ${files.length} archivo(s) a ${carpeta}`, 'success');
  }

  exportarPDF() {
    this.toastSvc.show('📄 Generando PDF Ejecutivo, por favor espera...', 'info');
    const list = this.todasLasObras();
    if (list.length === 0) {
      this.toastSvc.show('No hay obras para generar reporte PDF', 'warning');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4'); // Horizontal landscape
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Banner institucional superior
    doc.setFillColor(30, 45, 61); // #1E2D3D dark header
    doc.rect(0, 0, pageWidth, 26, 'F');

    // Título institucional
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('H. AYUNTAMIENTO CONSTITUCIONAL DE HEROICA CIUDAD DE TLAXIACO', pageWidth / 2, 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(232, 160, 32); // #E8A020 accent
    doc.text('DIRECCIÓN DE OBRAS PÚBLICAS Y DESARROLLO URBANO · EXPEDIENTES TÉCNICOS', pageWidth / 2, 17, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(`Emisión: ${new Date().toLocaleDateString('es-MX')}`, pageWidth - 14, 22, { align: 'right' });

    // Tarjetas de Resumen
    const totalInversion = list.reduce((a, b) => a + (b.monto || 0), 0);
    const avgAvance = Math.round(list.reduce((a, b) => a + (b.porcentajeAvance ?? (b.estatus === 'COMPLETADA' || b.estatus === 'FINALIZADA' ? 100 : 0)), 0) / list.length);

    doc.setLineWidth(0.5);
    doc.setDrawColor(220, 220, 220);

    // Box 1: Total Obras
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 30, 80, 15, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('TOTAL OBRAS REGISTRADAS', 18, 36);
    doc.setFontSize(11);
    doc.setTextColor(30, 45, 61);
    doc.text(`${list.length} Proyectos`, 18, 42);

    // Box 2: Total Inversión
    doc.roundedRect(100, 30, 90, 15, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('INVERSIÓN TOTAL ACUMULADA', 104, 36);
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129); // #10B981 green
    doc.text(this.svc.formatMonto(totalInversion), 104, 42);

    // Box 3: Promedio Avance
    doc.roundedRect(196, 30, 86, 15, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('AVANCE FÍSICO PROMEDIO', 200, 36);
    doc.setFontSize(11);
    doc.setTextColor(232, 160, 32);
    doc.text(`${avgAvance}% General`, 200, 42);

    // Encabezado de Tabla
    let y = 52;
    doc.setFillColor(30, 45, 61);
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', 17, y + 5.5);
    doc.text('CÓDIGO', 26, y + 5.5);
    doc.text('NOMBRE DE LA OBRA', 60, y + 5.5);
    doc.text('CATEGORÍA', 145, y + 5.5);
    doc.text('INVERSIÓN ($)', 205, y + 5.5, { align: 'right' });
    doc.text('ESTATUS', 235, y + 5.5);
    doc.text('% AVANCE', 275, y + 5.5, { align: 'right' });

    y += 8;
    doc.setFont('helvetica', 'normal');

    list.forEach((o, i) => {
      if (y > pageHeight - 35) {
        doc.addPage();
        y = 20;
        doc.setFillColor(30, 45, 61);
        doc.rect(14, y, pageWidth - 28, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('#', 17, y + 5.5);
        doc.text('CÓDIGO', 26, y + 5.5);
        doc.text('NOMBRE DE LA OBRA', 60, y + 5.5);
        doc.text('CATEGORÍA', 145, y + 5.5);
        doc.text('INVERSIÓN ($)', 205, y + 5.5, { align: 'right' });
        doc.text('ESTATUS', 235, y + 5.5);
        doc.text('% AVANCE', 275, y + 5.5, { align: 'right' });
        y += 8;
        doc.setFont('helvetica', 'normal');
      }

      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, pageWidth - 28, 7, 'F');
      }

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8);
      doc.text(String(i + 1), 17, y + 4.8);
      doc.text(o.codigo || `OBR-${o.id}`, 26, y + 4.8);

      const nombreTrunc = o.nombre.length > 45 ? o.nombre.slice(0, 42) + '...' : o.nombre;
      doc.text(nombreTrunc, 60, y + 4.8);

      const catTrunc = (o.categoria || 'Infraestructura General').length > 28
        ? (o.categoria || 'Infraestructura General').slice(0, 25) + '...'
        : (o.categoria || 'Infraestructura General');
      doc.text(catTrunc, 145, y + 4.8);

      doc.text(this.svc.formatMonto(o.monto), 205, y + 4.8, { align: 'right' });
      doc.text(ESTATUS_LABEL[o.estatus] || o.estatus, 235, y + 4.8);

      const pct = o.porcentajeAvance ?? (o.estatus === 'COMPLETADA' || o.estatus === 'FINALIZADA' ? 100 : 0);
      doc.text(`${pct}%`, 275, y + 4.8, { align: 'right' });

      y += 7;
    });

    if (y > pageHeight - 35) {
      doc.addPage();
      y = 20;
    } else {
      y += 10;
    }

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);

    doc.line(25, y + 12, 95, y + 12);
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text('ELABORÓ', 60, y + 16, { align: 'center' });
    doc.text('DIRECCIÓN DE OBRAS PÚBLICAS', 60, y + 19, { align: 'center' });

    doc.line(113, y + 12, 183, y + 12);
    doc.text('REVISÓ', 148, y + 16, { align: 'center' });
    doc.text('CONTRALORÍA MUNICIPAL', 148, y + 19, { align: 'center' });

    doc.line(201, y + 12, 271, y + 12);
    doc.text('AUTORIZÓ', 236, y + 16, { align: 'center' });
    doc.text('PRESIDENCIA MUNICIPAL', 236, y + 19, { align: 'center' });

    doc.save(`Reporte_Ejecutivo_Obras_${new Date().toISOString().slice(0, 10)}.pdf`);
    this.toastSvc.show('📄 Reporte PDF Ejecutivo descargado correctamente', 'success');
  }

  exportarExcel() {
    const list = this.todasLasObras();
    if (list.length === 0) {
      this.toastSvc.show('No hay obras para exportar en Excel', 'warning');
      return;
    }

    const data: any[] = list.map((o, index) => ({
      'No.': index + 1,
      'Código': o.codigo || `OBR-${o.id}`,
      'Nombre de la Obra': o.nombre,
      'Categoría': o.categoria || 'Infraestructura General',
      'Ubicación / Dirección': o.direccion || 'Heroica Ciudad de Tlaxiaco',
      'Inversión ($ MXN)': o.monto,
      'Monto Formateado': this.svc.formatMonto(o.monto),
      'Estatus': ESTATUS_LABEL[o.estatus] || o.estatus,
      'Avance Físico (%)': o.porcentajeAvance ?? (o.estatus === 'COMPLETADA' || o.estatus === 'FINALIZADA' ? 100 : 0),
      'Fecha Inicio': o.fechaInicio,
      'Fecha Fin': o.fechaFin,
    }));

    const totalInversion = list.reduce((acc, curr) => acc + (curr.monto || 0), 0);
    const promedioAvance = Math.round(
      list.reduce((acc, curr) => acc + (curr.porcentajeAvance ?? (curr.estatus === 'COMPLETADA' || curr.estatus === 'FINALIZADA' ? 100 : 0)), 0) / list.length
    );

    data.push({
      'No.': 0,
      'Código': 'TOTALES',
      'Nombre de la Obra': `TOTAL: ${list.length} OBRAS`,
      'Categoría': '-',
      'Ubicación / Dirección': '-',
      'Inversión ($ MXN)': totalInversion,
      'Monto Formateado': this.svc.formatMonto(totalInversion),
      'Estatus': '-',
      'Avance Físico (%)': promedioAvance,
      'Fecha Inicio': '-',
      'Fecha Fin': '-',
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 5 },  // No
      { wch: 15 }, // Código
      { wch: 45 }, // Nombre
      { wch: 28 }, // Categoría
      { wch: 30 }, // Dirección
      { wch: 18 }, // Inversión
      { wch: 20 }, // Formateado
      { wch: 15 }, // Estatus
      { wch: 18 }, // Avance
      { wch: 14 }, // Fecha inicio
      { wch: 14 }, // Fecha fin
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expedientes_Obra_Publica');
    XLSX.writeFile(wb, `Reporte_Ejecutivo_Obras_${new Date().toISOString().slice(0, 10)}.xlsx`);
    this.toastSvc.show('📊 Reporte Excel (.xlsx) ejecutivo generado con éxito', 'success');
  }

  getProgressColor(p: number): string {
    return p >= 80 ? 'var(--success)' : p >= 50 ? 'var(--accent)' : 'var(--danger)';
  }
  getProgressGradient(avance: number): string {
    const p = this.getProgressColor(avance);
    return `linear-gradient(90deg, ${p}88, ${p})`;
  }

  getStatusBadgeClass(obra: ObraResponse): string {
    return ESTATUS_COLOR[obra.estatus] ?? 'badge-pendiente';
  }

  getStatusText(obra: ObraResponse): string {
    if (this.svc.isBlocked(obra)) return '🚫 Bloqueada (15 días)';
    return ESTATUS_LABEL[obra.estatus] ?? obra.estatus;
  }
}

