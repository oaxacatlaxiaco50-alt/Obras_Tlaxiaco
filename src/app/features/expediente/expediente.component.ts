import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { ObrasService } from '../../core/services/obras.service';
import { AvancesService } from '../../core/services/avances.service';
import { ArchivosService } from '../../core/services/archivos.service';
import { ExpedientesService, ExpedienteObraItem, EstadoDocumentoChecklist, SeccionExpedienteChecklist } from '../../core/services/expedientes.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ObraResponse, ObraAvance, ObraArchivo, ObraEstatus, ESTATUS_LABEL, ESTATUS_COLOR } from '../../core/models/obra.model';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-expediente',
  standalone: true,
  imports: [DatePipe],
  template: `
    @if (obra()) {
      <div class="expediente animate-fade-in" id="pdfContent">
        <!-- Header -->
        <div class="exp-header">
          <div class="exp-header-left">
            <div class="exp-breadcrumb">
              <a href="/dashboard">Dashboard</a> › <span>Expediente</span>
            </div>
            <h1 class="exp-title">{{ obra()!.nombre }}</h1>
            <div class="exp-badges">
              <span class="badge" [class]="statusClass()">{{ statusLabel() }}</span>
              <span class="badge badge-warning">🏷️ {{ obra()!.categoria || 'Infraestructura General' }}</span>
              @if (svc.isBlocked(obra()!)) {
                <span class="badge badge-danger">🔒 Sin actualizaciones recientes</span>
              }
              <span class="badge badge-info">ID: {{ obra()!.id }}</span>
            </div>
          </div>
          <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
            <button class="btn btn-primary" style="background:#E8A020; border-color:#E8A020; color:#fff; font-weight:700; display:inline-flex; align-items:center; gap:6px;" (click)="irAIntegracionExpediente()">
              🏛️ Integración del Expediente
            </button>
            @if (auth.hasRole('admin', 'residente')) {
              <button class="btn" style="background:linear-gradient(135deg,#10B981,#059669); color:#fff; border:none; box-shadow:0 4px 12px rgba(16,185,129,0.3); display:inline-flex; align-items:center; gap:6px;" (click)="mostrarModalIntegracionExp.set(true)">
                📂 Integración de Expedientes
              </button>
              <button class="btn" style="background:linear-gradient(135deg,#10B981,#059669); color:#fff; border:none; box-shadow:0 4px 12px rgba(16,185,129,0.3); display:inline-flex; align-items:center; gap:6px;" (click)="mostrarModalNuevoExp.set(true)">
                + Nuevo Expediente
              </button>
            }
            @if (auth.hasRole('admin', 'residente') && !svc.isBlocked(obra()!)) {
              <button class="btn btn-secondary" (click)="generarPDF()" [disabled]="generandoPDF()">
                {{ generandoPDF() ? '⏳ Procesando PDF...' : '📄 Generar Reporte PDF' }}
              </button>
              <button class="btn btn-primary" (click)="mostrarModalEdicion.set(true)">✏️ Editar Expediente</button>
            }
          </div>
        </div>

        <!-- KPI Strip -->
        @if (auth.hasRole('admin', 'residente')) {
          <div class="kpi-strip">
            <div class="strip-item">
              <span class="strip-label">💰 Monto</span>
              <span class="strip-val accent">{{ svc.formatMonto(obra()!.monto) }}</span>
            </div>
            <div class="strip-sep"></div>
            <div class="strip-item">
              <span class="strip-label">📈 Avance</span>
              <span class="strip-val" [style.color]="progressColor()">{{ ultimoPorcentaje() }}%</span>
            </div>
            <div class="strip-sep"></div>
            <div class="strip-item">
              <span class="strip-label">📅 Inicio</span>
              <span class="strip-val">{{ fmtDate(obra()!.fechaInicio) }}</span>
            </div>
            <div class="strip-sep"></div>
            <div class="strip-item">
              <span class="strip-label">🏁 Fin</span>
              <span class="strip-val">{{ fmtDate(obra()!.fechaFin) }}</span>
            </div>
            <div class="strip-sep"></div>
            <div class="strip-item">
              <span class="strip-label">👤 Responsable</span>
              <span class="strip-val">Resp. #{{ obra()!.responsableId }}</span>
            </div>
            <div class="strip-sep"></div>
            <div class="strip-item">
              <span class="strip-label">🏢 Contratista</span>
              <span class="strip-val">{{ obra()!.estatus }}</span>
            </div>
          </div>
          <!-- Progress bar -->
          <div class="exp-progress-wrap">
            <div class="progress-bar" style="height:12px">
              <div class="progress-fill" [style.width.%]="ultimoPorcentaje()"></div>
            </div>
          </div>
        }

        <!-- Description -->
        <div class="card exp-desc-card">
          <h3 class="sec-title">📝 Descripción del Proyecto</h3>
          <p>{{ obra()!.descripcion }}</p>
        </div>

        @if (auth.hasRole('admin', 'residente')) {
          <div class="exp-grid">
            <!-- Timeline de Fotos -->
            <div class="card">
              <h3 class="sec-title">📸 Línea de Tiempo</h3>
              <div class="timeline-tabs">
                @for (fase of fases; track fase.key) {
                  <button class="tab-btn" [class.active]="faseActiva() === fase.key" (click)="faseActiva.set(fase.key)">
                    {{ fase.icon }} {{ fase.label }}
                    <span class="tab-count">{{ fotosPorFase(fase.key).length }}</span>
                  </button>
                }
              </div>
              <div class="foto-grid">
                @for (foto of fotosPorFase(faseActiva()); track foto.id) {
                  <div class="foto-thumb">
                    <img [src]="foto.archivoUrl" [alt]="foto.descripcion" loading="lazy" />
                    <div class="foto-overlay">
                      <span>{{ foto.descripcion }}</span>
                      <span>{{ foto.tipo }}</span>
                    </div>
                  </div>
                }
                @if (fotosPorFase(faseActiva()).length === 0) {
                  <div class="empty-state">📷 Sin fotos en esta fase</div>
                }
              </div>
            </div>

            <!-- Areas -->
            <div class="card">
              <h3 class="sec-title">📋 Áreas del Proyecto</h3>
              <div class="areas-list">
                @if (avances().length === 0) {
                  <div class="empty-state">Sin registros de avance aun</div>
                }
                @for (avance of avances(); track avance.id) {
                  <div class="area-item">
                    <span class="area-icon">📊</span>
                    <span class="area-name">{{ avance.titulo }} — {{ avance.porcentaje }}%</span>
                    <span class="badge badge-success">{{ avance.fechaAvance }}</span>
                  </div>
                }
              </div>
              <div class="areas-summary">
                <span class="text-success">✅ {{ areasEntregadas() }} entregadas</span>
                <span class="text-warning">⏳ {{ areasPendientes() }} pendientes</span>
              </div>
            </div>
          </div>

          <!-- Upload + Camera -->
          <div class="exp-grid-2">
            <div class="card upload-card">
              <h3 class="sec-title">📂 Subir Archivos</h3>
              <div class="upload-zone" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
                <div class="upload-icon">⬆️</div>
                <p class="upload-text">Arrastra archivos aquí o haz clic para seleccionar</p>
                <p class="upload-hint">Imágenes, videos y documentos · Máximo <strong>30 MB</strong> por archivo</p>
                <input type="file" #fileInput multiple accept="image/*,video/*,.pdf,.dwg" (change)="onFileSelect($event)" style="display:none">
                <button class="btn btn-secondary btn-sm" (click)="fileInput.click()">Seleccionar archivos</button>
              </div>
              @if (uploadMsg()) {
                <p class="upload-feedback" [class.error]="uploadError()">{{ uploadMsg() }}</p>
              }
            </div>

            <div class="card docs-card">
              <h3 class="sec-title">📑 Archivos Subidos al Expediente ({{ archivosSubidos().length }})</h3>
              <div class="docs-list">
                @for (arch of archivosSubidos(); track arch.id) {
                  <div class="doc-item entregado" style="display:flex; align-items:center; gap:12px;">
                    <div class="doc-icon">{{ arch.tipoArchivo === 'IMAGEN' ? '🖼️' : '📄' }}</div>
                    <div class="doc-info" style="flex:1;">
                      <span class="doc-name">{{ arch.nombreOriginal }}</span>
                      <span class="doc-status">{{ arch.carpeta }} · {{ fmtBytes(arch.tamanioBytes) }}</span>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                      <a [href]="getFileUrl(arch.archivoUrl)" target="_blank" [download]="arch.nombreOriginal" class="btn btn-secondary btn-sm" style="text-decoration:none;">
                        👁️ Ver / Descargar
                      </a>
                      @if (canDeleteFile()) {
                        <button class="btn btn-danger btn-sm" (click)="eliminarArchivo(arch)" title="Eliminar archivo del expediente">
                          🗑️ Eliminar
                        </button>
                      } @else {
                        <span class="badge badge-warning" style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem;" title="Archivo protegido. Solo Administrador puede eliminar.">
                          🔒 Candado
                        </span>
                      }
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state" style="font-size:0.85rem; color:var(--text-muted); text-text-align:center; padding:16px;">
                    📁 Ningún archivo subido a este expediente todavía.
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- SECCIÓN DE CHECKLIST UNITARIO OFICIAL (FORMATO TLAXIACO 2026) -->
        <div class="card checklist-official-card" id="section-checklist" style="margin-top:24px; border:2px solid var(--border-light); background:var(--bg-surface);">
            <div class="checklist-header" style="background:var(--bg-dark); padding:20px 24px; border-bottom:2px solid var(--border); display:flex; flex-direction:column; gap:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div>
                  <h2 style="font-size:1.1rem; font-weight:800; color:var(--text-primary); margin:0;">
                    🏛️ INTEGRACIÓN DE EXPEDIENTE UNITARIO DE OBRA PÚBLICA EJERCICIO 2026
                  </h2>
                  <span style="font-size:0.8rem; color:var(--accent); font-weight:600;">
                    H. AYUNTAMIENTO MUNICIPAL DE HEROICA CIUDAD DE TLAXIACO · REGIDURÍA DE OBRAS PÚBLICAS
                  </span>
                </div>
                
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                  <!-- Controles Globales de Acordeón -->
                  <div style="display:flex; gap:6px;">
                    <button type="button" class="btn btn-secondary btn-sm" (click)="desplegarTodasSecciones()" style="font-size:0.78rem; padding:4px 10px;">
                      📂 Desplegar Todo
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm" (click)="colapsarTodasSecciones()" style="font-size:0.78rem; padding:4px 10px;">
                      📁 Colapsar Todo
                    </button>
                  </div>

                  <div class="simbologia-strip" style="display:flex; gap:8px; align-items:center; background:rgba(0,0,0,0.3); padding:6px 12px; border-radius:8px; border:1px solid var(--border-light);">
                    <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">SIMBOLOGÍA:</span>
                    <span class="badge" style="background:#10B98122; color:#10B981; border:1px solid #10B98144; font-weight:700;">OK (Completo)</span>
                    <span class="badge" style="background:#EF444422; color:#EF4444; border:1px solid #EF444444; font-weight:700;">F (Faltante)</span>
                    <span class="badge" style="background:#F59E0B22; color:#F59E0B; border:1px solid #F59E0B44; font-weight:700;">C (A Corregir)</span>
                    <span class="badge" style="background:#6B728022; color:#9CA3AF; border:1px solid #6B728044; font-weight:700;">N/A (No Aplica)</span>
                  </div>
                </div>
              </div>

              <div style="display:flex; gap:20px; font-size:0.82rem; color:var(--text-muted); padding-top:8px; border-top:1px dashed var(--border);">
                <span>📍 <strong>Obra:</strong> {{ obra()!.nombre }}</span>
                <span>📌 <strong>Localidad:</strong> {{ obra()!.direccion || 'Heroica Ciudad de Tlaxiaco' }}</span>
                <span>📄 <strong>Oficio Aprob.:</strong> {{ obra()!.codigo }}</span>
              </div>
            </div>

            <!-- ACORDEONES POR SECCIÓN -->
            <div class="checklist-sections" style="padding:20px 24px; display:flex; flex-direction:column; gap:16px;">
              
              <!-- I. PARTE SOCIAL -->
              <div class="seccion-block" style="border:1px solid var(--border); border-radius:10px; overflow:hidden; background:var(--bg-dark);">
                <div class="seccion-header interactive-accordion-header" (click)="toggleSeccion('PARTE_SOCIAL')" style="background:rgba(232, 160, 32, 0.1); padding:14px 18px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; border-bottom:1px solid var(--border);">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span class="accordion-icon" style="color:var(--accent); font-weight:bold; font-size:0.85rem;">{{ isSeccionAbierta('PARTE_SOCIAL') ? '▼' : '►' }}</span>
                    <h3 style="font-size:0.95rem; font-weight:800; color:var(--accent); margin:0;">I. PARTE SOCIAL</h3>
                    <span class="badge badge-secondary" style="font-size:0.72rem;">{{ getItemsPorSeccion('PARTE_SOCIAL').length }} Requisitos</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:0.8rem; font-weight:700; color:var(--text-primary);">
                      Avance: {{ getPorcentajeCompletadoSeccion('PARTE_SOCIAL') }}%
                    </span>
                    <span class="badge" [style.background]="isSeccionAbierta('PARTE_SOCIAL') ? 'rgba(232,160,32,0.25)' : 'rgba(255,255,255,0.08)'" [style.color]="isSeccionAbierta('PARTE_SOCIAL') ? 'var(--accent)' : 'var(--text-muted)'" style="font-size:0.75rem; font-weight:700;">
                      {{ isSeccionAbierta('PARTE_SOCIAL') ? '▲ Desplegado' : '▼ Minimizado' }}
                    </span>
                  </div>
                </div>

                @if (isSeccionAbierta('PARTE_SOCIAL')) {
                  <div class="table-responsive animate-fade-in">
                    <table class="table" style="margin:0; width:100%;">
                      <thead>
                        <tr style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">
                          <th style="width:35px; text-align:center;">#</th>
                          <th style="min-width:240px;">Documento / Requisito Oficial</th>
                          <th style="width:190px; text-align:center;">Estado (Simbología)</th>
                          <th style="width:240px; text-align:center;">Expediente Digital (.PDF / Imagen)</th>
                          <th style="min-width:220px;">Observaciones / Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (item of getItemsPorSeccion('PARTE_SOCIAL'); track item.id; let idx = $index) {
                          <tr class="interactive-row" style="cursor:pointer;" (click)="abrirModalGestionDoc(item)">
                            <td style="text-align:center; font-weight:700; color:var(--text-muted); font-size:0.8rem;">{{ idx + 1 }}</td>
                            <td style="font-weight:600; font-size:0.85rem; color:var(--text-primary);">
                              {{ item.documento.nombre }}
                              @if (item.fechaRevision) {
                                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:normal; margin-top:2px;">
                                  🕒 Editado: {{ item.fechaRevision | date:'short' }}
                                </div>
                              }
                            </td>
                            <td style="text-align:center;" (click)="$event.stopPropagation()">
                              <div style="display:inline-flex; gap:4px; background:rgba(0,0,0,0.3); padding:4px; border-radius:6px; border:1px solid var(--border-light);">
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'OK' ? '#10B981' : 'transparent'" [style.color]="item.estado === 'OK' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'OK')">OK</button>
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'FALTANTE' ? '#EF4444' : 'transparent'" [style.color]="item.estado === 'FALTANTE' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'FALTANTE')">F</button>
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'CORREGIR' ? '#F59E0B' : 'transparent'" [style.color]="item.estado === 'CORREGIR' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'CORREGIR')">C</button>
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'NO_APLICA' ? '#6B7280' : 'transparent'" [style.color]="item.estado === 'NO_APLICA' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'NO_APLICA')">N/A</button>
                              </div>
                            </td>
                            <td style="text-align:center;" (click)="$event.stopPropagation()">
                              <button type="button" class="btn btn-secondary btn-sm" (click)="abrirModalGestionDoc(item)" style="display:inline-flex; align-items:center; gap:6px;">
                                {{ item.archivoUrl ? '👁️ Ver Documento' : '📤 Subir / Abrir Espacio' }}
                              </button>
                            </td>
                            <td (click)="$event.stopPropagation()">
                              <input type="text" [value]="item.observaciones || ''" placeholder="Añadir nota u observación..." class="form-input" style="font-size:0.8rem; padding:4px 10px; width:100%; border-radius:6px;" (change)="guardarObservaciones(item, $event)" />
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>

              <!-- II. PARTE TÉCNICA O PROYECTO EJECUTIVO -->
              <div class="seccion-block" style="border:1px solid var(--border); border-radius:10px; overflow:hidden; background:var(--bg-dark);">
                <div class="seccion-header interactive-accordion-header" (click)="toggleSeccion('PROYECTO_EJECUTIVO')" style="background:rgba(59, 130, 246, 0.1); padding:14px 18px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; border-bottom:1px solid var(--border);">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span class="accordion-icon" style="color:#60A5FA; font-weight:bold; font-size:0.85rem;">{{ isSeccionAbierta('PROYECTO_EJECUTIVO') ? '▼' : '►' }}</span>
                    <h3 style="font-size:0.95rem; font-weight:800; color:#60A5FA; margin:0;">II. PARTE TÉCNICA O PROYECTO EJECUTIVO</h3>
                    <span class="badge badge-secondary" style="font-size:0.72rem;">{{ getItemsPorSeccion('PROYECTO_EJECUTIVO').length }} Requisitos</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:0.8rem; font-weight:700; color:var(--text-primary);">
                      Avance: {{ getPorcentajeCompletadoSeccion('PROYECTO_EJECUTIVO') }}%
                    </span>
                    <span class="badge" [style.background]="isSeccionAbierta('PROYECTO_EJECUTIVO') ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.08)'" [style.color]="isSeccionAbierta('PROYECTO_EJECUTIVO') ? '#60A5FA' : 'var(--text-muted)'" style="font-size:0.75rem; font-weight:700;">
                      {{ isSeccionAbierta('PROYECTO_EJECUTIVO') ? '▲ Desplegado' : '▼ Minimizado' }}
                    </span>
                  </div>
                </div>

                @if (isSeccionAbierta('PROYECTO_EJECUTIVO')) {
                  <div class="table-responsive animate-fade-in">
                    <table class="table" style="margin:0; width:100%;">
                      <thead>
                        <tr style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">
                          <th style="width:35px; text-align:center;">#</th>
                          <th style="min-width:240px;">Documento / Requisito Oficial</th>
                          <th style="width:190px; text-align:center;">Estado (Simbología)</th>
                          <th style="width:240px; text-align:center;">Expediente Digital (.PDF / Imagen)</th>
                          <th style="min-width:220px;">Observaciones / Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (item of getItemsPorSeccion('PROYECTO_EJECUTIVO'); track item.id; let idx = $index) {
                          <tr class="interactive-row" style="cursor:pointer;" (click)="abrirModalGestionDoc(item)">
                            <td style="text-align:center; font-weight:700; color:var(--text-muted); font-size:0.8rem;">{{ idx + 1 }}</td>
                            <td style="font-weight:600; font-size:0.85rem; color:var(--text-primary);">
                              {{ item.documento.nombre }}
                              @if (item.fechaRevision) {
                                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:normal; margin-top:2px;">
                                  🕒 Editado: {{ item.fechaRevision | date:'short' }}
                                </div>
                              }
                            </td>
                            <td style="text-align:center;" (click)="$event.stopPropagation()">
                              <div style="display:inline-flex; gap:4px; background:rgba(0,0,0,0.3); padding:4px; border-radius:6px; border:1px solid var(--border-light);">
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'OK' ? '#10B981' : 'transparent'" [style.color]="item.estado === 'OK' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'OK')">OK</button>
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'FALTANTE' ? '#EF4444' : 'transparent'" [style.color]="item.estado === 'FALTANTE' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'FALTANTE')">F</button>
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'CORREGIR' ? '#F59E0B' : 'transparent'" [style.color]="item.estado === 'CORREGIR' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'CORREGIR')">C</button>
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'NO_APLICA' ? '#6B7280' : 'transparent'" [style.color]="item.estado === 'NO_APLICA' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'NO_APLICA')">N/A</button>
                              </div>
                            </td>
                            <td style="text-align:center;" (click)="$event.stopPropagation()">
                              <button type="button" class="btn btn-secondary btn-sm" (click)="abrirModalGestionDoc(item)" style="display:inline-flex; align-items:center; gap:6px;">
                                {{ item.archivoUrl ? '👁️ Ver Documento' : '📤 Subir / Abrir Espacio' }}
                              </button>
                            </td>
                            <td (click)="$event.stopPropagation()">
                              <input type="text" [value]="item.observaciones || ''" placeholder="Añadir nota u observación..." class="form-input" style="font-size:0.8rem; padding:4px 10px; width:100%; border-radius:6px;" (change)="guardarObservaciones(item, $event)" />
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>

              <!-- III. PROCESOS DE CONTRATACIÓN -->
              <div class="seccion-block" style="border:1px solid var(--border); border-radius:10px; overflow:hidden; background:var(--bg-dark);">
                <div class="seccion-header interactive-accordion-header" (click)="toggleSeccion('PROCESOS_CONTRATACION')" style="background:rgba(168, 85, 247, 0.1); padding:14px 18px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; border-bottom:1px solid var(--border);">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span class="accordion-icon" style="color:#C084FC; font-weight:bold; font-size:0.85rem;">{{ isSeccionAbierta('PROCESOS_CONTRATACION') ? '▼' : '►' }}</span>
                    <h3 style="font-size:0.95rem; font-weight:800; color:#C084FC; margin:0;">III. PROCESOS DE CONTRATACIÓN</h3>
                    <span class="badge badge-secondary" style="font-size:0.72rem;">{{ getItemsPorSeccion('PROCESOS_CONTRATACION').length }} Requisitos</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:0.8rem; font-weight:700; color:var(--text-primary);">
                      Avance: {{ getPorcentajeCompletadoSeccion('PROCESOS_CONTRATACION') }}%
                    </span>
                    <span class="badge" [style.background]="isSeccionAbierta('PROCESOS_CONTRATACION') ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.08)'" [style.color]="isSeccionAbierta('PROCESOS_CONTRATACION') ? '#C084FC' : 'var(--text-muted)'" style="font-size:0.75rem; font-weight:700;">
                      {{ isSeccionAbierta('PROCESOS_CONTRATACION') ? '▲ Desplegado' : '▼ Minimizado' }}
                    </span>
                  </div>
                </div>

                @if (isSeccionAbierta('PROCESOS_CONTRATACION')) {
                  <div class="table-responsive animate-fade-in">
                    <table class="table" style="margin:0; width:100%;">
                      <thead>
                        <tr style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">
                          <th style="width:35px; text-align:center;">#</th>
                          <th style="min-width:240px;">Documento / Requisito Oficial</th>
                          <th style="width:190px; text-align:center;">Estado (Simbología)</th>
                          <th style="width:240px; text-align:center;">Expediente Digital (.PDF / Imagen)</th>
                          <th style="min-width:220px;">Observaciones / Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (item of getItemsPorSeccion('PROCESOS_CONTRATACION'); track item.id; let idx = $index) {
                          <tr class="interactive-row" style="cursor:pointer;" (click)="abrirModalGestionDoc(item)">
                            <td style="text-align:center; font-weight:700; color:var(--text-muted); font-size:0.8rem;">{{ idx + 1 }}</td>
                            <td style="font-weight:600; font-size:0.85rem; color:var(--text-primary);">
                              {{ item.documento.nombre }}
                              @if (item.fechaRevision) {
                                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:normal; margin-top:2px;">
                                  🕒 Editado: {{ item.fechaRevision | date:'short' }}
                                </div>
                              }
                            </td>
                            <td style="text-align:center;" (click)="$event.stopPropagation()">
                              <div style="display:inline-flex; gap:4px; background:rgba(0,0,0,0.3); padding:4px; border-radius:6px; border:1px solid var(--border-light);">
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'OK' ? '#10B981' : 'transparent'" [style.color]="item.estado === 'OK' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'OK')">OK</button>
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'FALTANTE' ? '#EF4444' : 'transparent'" [style.color]="item.estado === 'FALTANTE' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'FALTANTE')">F</button>
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'CORREGIR' ? '#F59E0B' : 'transparent'" [style.color]="item.estado === 'CORREGIR' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'CORREGIR')">C</button>
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'NO_APLICA' ? '#6B7280' : 'transparent'" [style.color]="item.estado === 'NO_APLICA' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'NO_APLICA')">N/A</button>
                              </div>
                            </td>
                            <td style="text-align:center;" (click)="$event.stopPropagation()">
                              <button type="button" class="btn btn-secondary btn-sm" (click)="abrirModalGestionDoc(item)" style="display:inline-flex; align-items:center; gap:6px;">
                                {{ item.archivoUrl ? '👁️ Ver Documento' : '📤 Subir / Abrir Espacio' }}
                              </button>
                            </td>
                            <td (click)="$event.stopPropagation()">
                              <input type="text" [value]="item.observaciones || ''" placeholder="Añadir nota u observación..." class="form-input" style="font-size:0.8rem; padding:4px 10px; width:100%; border-radius:6px;" (change)="guardarObservaciones(item, $event)" />
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>

              <!-- IV. DOCUMENTOS COMPROBATORIOS -->
              <div class="seccion-block" style="border:1px solid var(--border); border-radius:10px; overflow:hidden; background:var(--bg-dark);">
                <div class="seccion-header interactive-accordion-header" (click)="toggleSeccion('DOCUMENTOS_COMPROBATORIOS')" style="background:rgba(16, 185, 129, 0.1); padding:14px 18px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; border-bottom:1px solid var(--border);">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span class="accordion-icon" style="color:#34D399; font-weight:bold; font-size:0.85rem;">{{ isSeccionAbierta('DOCUMENTOS_COMPROBATORIOS') ? '▼' : '►' }}</span>
                    <h3 style="font-size:0.95rem; font-weight:800; color:#34D399; margin:0;">IV. DOCUMENTOS COMPROBATORIOS</h3>
                    <span class="badge badge-secondary" style="font-size:0.72rem;">{{ getItemsPorSeccion('DOCUMENTOS_COMPROBATORIOS').length }} Requisitos</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:0.8rem; font-weight:700; color:var(--text-primary);">
                      Avance: {{ getPorcentajeCompletadoSeccion('DOCUMENTOS_COMPROBATORIOS') }}%
                    </span>
                    <span class="badge" [style.background]="isSeccionAbierta('DOCUMENTOS_COMPROBATORIOS') ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'" [style.color]="isSeccionAbierta('DOCUMENTOS_COMPROBATORIOS') ? '#34D399' : 'var(--text-muted)'" style="font-size:0.75rem; font-weight:700;">
                      {{ isSeccionAbierta('DOCUMENTOS_COMPROBATORIOS') ? '▲ Desplegado' : '▼ Minimizado' }}
                    </span>
                  </div>
                </div>

                @if (isSeccionAbierta('DOCUMENTOS_COMPROBATORIOS')) {
                  <div class="table-responsive animate-fade-in">
                    <table class="table" style="margin:0; width:100%;">
                      <thead>
                        <tr style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">
                          <th style="width:35px; text-align:center;">#</th>
                          <th style="min-width:240px;">Documento / Requisito Oficial</th>
                          <th style="width:190px; text-align:center;">Estado (Simbología)</th>
                          <th style="width:240px; text-align:center;">Expediente Digital (.PDF / Imagen)</th>
                          <th style="min-width:220px;">Observaciones / Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (item of getItemsPorSeccion('DOCUMENTOS_COMPROBATORIOS'); track item.id; let idx = $index) {
                          <tr class="interactive-row" style="cursor:pointer;" (click)="abrirModalGestionDoc(item)">
                            <td style="text-align:center; font-weight:700; color:var(--text-muted); font-size:0.8rem;">{{ idx + 1 }}</td>
                            <td style="font-weight:600; font-size:0.85rem; color:var(--text-primary);">
                              {{ item.documento.nombre }}
                              @if (item.fechaRevision) {
                                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:normal; margin-top:2px;">
                                  🕒 Editado: {{ item.fechaRevision | date:'short' }}
                                </div>
                              }
                            </td>
                            <td style="text-align:center;" (click)="$event.stopPropagation()">
                              <div style="display:inline-flex; gap:4px; background:rgba(0,0,0,0.3); padding:4px; border-radius:6px; border:1px solid var(--border-light);">
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'OK' ? '#10B981' : 'transparent'" [style.color]="item.estado === 'OK' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'OK')">OK</button>
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'FALTANTE' ? '#EF4444' : 'transparent'" [style.color]="item.estado === 'FALTANTE' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'FALTANTE')">F</button>
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'CORREGIR' ? '#F59E0B' : 'transparent'" [style.color]="item.estado === 'CORREGIR' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'CORREGIR')">C</button>
                                <button type="button" class="btn-pill" [style.background]="item.estado === 'NO_APLICA' ? '#6B7280' : 'transparent'" [style.color]="item.estado === 'NO_APLICA' ? '#fff' : ''" (click)="cambiarEstadoItem(item, 'NO_APLICA')">N/A</button>
                              </div>
                            </td>
                            <td style="text-align:center;" (click)="$event.stopPropagation()">
                              <button type="button" class="btn btn-secondary btn-sm" (click)="abrirModalGestionDoc(item)" style="display:inline-flex; align-items:center; gap:6px;">
                                {{ item.archivoUrl ? '👁️ Ver Documento' : '📤 Subir / Abrir Espacio' }}
                              </button>
                            </td>
                            <td (click)="$event.stopPropagation()">
                              <input type="text" [value]="item.observaciones || ''" placeholder="Añadir nota u observación..." class="form-input" style="font-size:0.8rem; padding:4px 10px; width:100%; border-radius:6px;" (change)="guardarObservaciones(item, $event)" />
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>

            </div>
          </div>

      <!-- Modal Previsualizador de Documentos -->
      @if (mostrarModalVisor() && urlVisor()) {
        <div class="modal-overlay animate-fade-in" style="z-index: 2000;">
          <div class="modal-content animate-slide-in" style="max-width: 900px; width: 95%; height: 85vh; display: flex; flex-direction: column;">
            <div class="modal-header">
              <h3 class="modal-title">📄 Visor de Expediente Digital</h3>
              <div style="display: flex; gap: 8px; align-items: center;">
                <a [href]="urlVisor()!" target="_blank" download class="btn btn-secondary btn-sm" style="text-decoration: none;">📥 Descargar</a>
                <a [href]="urlVisor()!" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration: none;">↗️ Nueva Pestaña</a>
                <button class="btn-close" (click)="cerrarVisorDocumento()">✕</button>
              </div>
            </div>
            <div style="flex: 1; background: #1a1a1a; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 12px;">
              <iframe [src]="getSanitizedUrl(urlVisor()!)" style="width: 100%; height: 100%; border: none; border-radius: 8px; background: white;"></iframe>
            </div>
          </div>
        </div>
      }

      <!-- MODAL ESPACIO DEDICADO DE GESTIÓN Y PREVISUALIZACIÓN DE DOCUMENTO -->
      @if (mostrarModalGestionDoc() && documentoSeleccionado()) {
        <div class="modal-overlay animate-fade-in" style="z-index: 2100;">
          <div class="modal-content animate-slide-in" style="max-width: 1100px; width: 95%; height: 90vh; display: flex; flex-direction: column; background: var(--bg-surface); overflow: hidden;">
            <!-- Header -->
            <div class="modal-header" style="background: var(--bg-dark); padding: 16px 24px; border-bottom: 2px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span class="badge badge-warning" style="font-size:0.75rem; text-transform:uppercase; margin-bottom:4px; display:inline-block;">
                  {{ documentoSeleccionado()!.documento.seccion }}
                </span>
                <h2 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">
                  📄 {{ documentoSeleccionado()!.documento.nombre }}
                </h2>
              </div>
              <button class="btn-close" (click)="cerrarModalGestionDoc()">✕</button>
            </div>

            <!-- Body split: Left Controls & Comments | Right Preview Space -->
            <div style="flex: 1; display: grid; grid-template-columns: 380px 1fr; gap: 0; overflow: hidden;">
              
              <!-- Left Column: Controls & Observations -->
              <div style="padding: 20px; background: var(--bg-dark); border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 20px; overflow-y: auto;">
                
                <!-- Estado -->
                <div>
                  <label class="form-label" style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">
                    Estado del Documento (Simbología)
                  </label>
                  <div style="display:flex; gap:6px; margin-top:8px;">
                    <button type="button" class="btn-pill" style="flex:1; padding:8px;" [style.background]="documentoSeleccionado()!.estado === 'OK' ? '#10B981' : 'rgba(255,255,255,0.05)'" [style.color]="documentoSeleccionado()!.estado === 'OK' ? '#fff' : ''" (click)="cambiarEstadoEnModal('OK')">🟢 OK</button>
                    <button type="button" class="btn-pill" style="flex:1; padding:8px;" [style.background]="documentoSeleccionado()!.estado === 'FALTANTE' ? '#EF4444' : 'rgba(255,255,255,0.05)'" [style.color]="documentoSeleccionado()!.estado === 'FALTANTE' ? '#fff' : ''" (click)="cambiarEstadoEnModal('FALTANTE')">🔴 F</button>
                    <button type="button" class="btn-pill" style="flex:1; padding:8px;" [style.background]="documentoSeleccionado()!.estado === 'CORREGIR' ? '#F59E0B' : 'rgba(255,255,255,0.05)'" [style.color]="documentoSeleccionado()!.estado === 'CORREGIR' ? '#fff' : ''" (click)="cambiarEstadoEnModal('CORREGIR')">🟡 C</button>
                    <button type="button" class="btn-pill" style="flex:1; padding:8px;" [style.background]="documentoSeleccionado()!.estado === 'NO_APLICA' ? '#6B7280' : 'rgba(255,255,255,0.05)'" [style.color]="documentoSeleccionado()!.estado === 'NO_APLICA' ? '#fff' : ''" (click)="cambiarEstadoEnModal('NO_APLICA')">⚪ N/A</button>
                  </div>
                </div>

                <!-- Subir o Reemplazar Archivo -->
                <div>
                  <label class="form-label" style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">
                    Expediente Digital (.PDF / Imagen)
                  </label>
                  <div style="margin-top:8px;">
                    <label class="btn btn-primary" style="width:100%; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:8px; padding:10px;">
                      📤 {{ documentoSeleccionado()!.archivoUrl ? 'Reemplazar Archivo Digital' : 'Subir Archivo Digital' }}
                      <input type="file" accept=".pdf,image/*" style="display:none;" (change)="subirArchivoEnModal($event)">
                    </label>
                  </div>
                </div>

                <!-- Observaciones / Comentarios -->
                <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                  <label class="form-label" style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">
                    📝 Observaciones y Comentarios
                  </label>
                  <textarea rows="6" #obsModalTextarea [value]="documentoSeleccionado()!.observaciones || ''" placeholder="Escribe anotaciones, correcciones o estatus de firma para este documento..." class="form-input" style="flex:1; font-size:0.85rem; padding:10px; resize:none; border-radius:8px;"></textarea>
                  <button type="button" class="btn btn-secondary" style="margin-top:4px;" (click)="guardarObservacionesDesdeModal(obsModalTextarea.value)">
                    💾 Guardar Comentario
                  </button>
                </div>

              </div>

              <!-- Right Column: Document Viewer Space -->
              <div style="background: #111; padding: 16px; display: flex; flex-direction: column; gap: 12px; height:100%;">
                @if (documentoSeleccionado()!.archivoUrl) {
                  <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px 14px; border-radius:8px;">
                    <span style="font-size:0.82rem; color:var(--text-muted);">Visualizando: <strong>{{ documentoSeleccionado()!.archivoUrl }}</strong></span>
                    <div style="display:flex; gap:8px;">
                      <a [href]="getFileUrl(documentoSeleccionado()!.archivoUrl!)" target="_blank" download class="btn btn-secondary btn-sm" style="text-decoration:none;">📥 Descargar</a>
                      <a [href]="getFileUrl(documentoSeleccionado()!.archivoUrl!)" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;">↗️ Nueva Pestaña</a>
                    </div>
                  </div>
                  <div style="flex:1; border-radius:8px; overflow:hidden; border:1px solid var(--border);">
                    <iframe [src]="getSanitizedUrl(getFileUrl(documentoSeleccionado()!.archivoUrl!))" style="width:100%; height:100%; border:none; background:white;"></iframe>
                  </div>
                } @else {
                  <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); gap:12px;">
                    <span style="font-size:3.5rem;">📁</span>
                    <p style="font-weight:600; font-size:0.95rem;">No hay archivo digital cargado para este requisito aún.</p>
                    <span style="font-size:0.8rem;">Utiliza el botón 'Subir Archivo Digital' a la izquierda para adjuntar el PDF o imagen.</span>
                  </div>
                }
              </div>

            </div>
          </div>
        </div>
      }
      <!-- Modal Editar Expediente -->
      @if (mostrarModalEdicion()) {
        <div class="modal-overlay animate-fade-in">
          <div class="modal-content animate-slide-in">
            <div class="modal-header">
              <h2 class="modal-title">✏️ Editar Expediente: {{ obra()!.nombre }}</h2>
              <button class="btn-close" (click)="mostrarModalEdicion.set(false)">✕</button>
            </div>
            <form class="modal-form" (submit)="guardarEdicion($event)">
              <div class="form-group">
                <label class="form-label">Nombre del Proyecto</label>
                <input type="text" name="nombre" class="form-input" [value]="obra()!.nombre" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Estatus</label>
                  <select name="estatus" class="form-input" [value]="obra()!.estatus">
                    <option value="PLANIFICADA">Planificada</option>
                    <option value="EN_PROCESO">En Proceso</option>
                    <option value="COMPLETADA">Completada</option>
                    <option value="CANCELADA">Cancelada</option>
                    <option value="INACTIVA">Inactiva</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Categoría de Obra</label>
                  <select name="categoria" class="form-input" [value]="obra()!.categoria || 'Infraestructura General'">
                    <option value="Pavimentación y Vialidades">🛣️ Pavimentación y Vialidades</option>
                    <option value="Agua Potable y Drenaje">💧 Agua Potable y Drenaje</option>
                    <option value="Electrificación y Alumbrado">⚡ Electrificación y Alumbrado</option>
                    <option value="Educación y Escuelas">🏫 Educación y Escuelas</option>
                    <option value="Salud y Espacios Públicos">🏥 Salud y Espacios Públicos</option>
                    <option value="Infraestructura General">🏗️ Infraestructura General</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Porcentaje de Avance (%)</label>
                  <input type="number" name="porcentaje" class="form-input" min="0" max="100" [value]="ultimoPorcentaje()" (input)="validarMaximo100($event)" required>
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 24px;">
                <label class="form-label">Descripción o Notas</label>
                <textarea name="descripcion" class="form-input" rows="4">{{ obra()!.descripcion }}</textarea>
              </div>
              <div class="form-group" style="margin-bottom: 24px;">
                <label class="form-label">📷 Fotografía del Expediente</label>
                <div class="foto-upload-zone" (click)="fotoEdicionInput.click()" (dragover)="$event.preventDefault()" (drop)="onFotoEdicionDrop($event)">
                  @if (fotoEdicionPreview()) {
                    <div class="foto-preview-wrap">
                      <img [src]="fotoEdicionPreview()" class="foto-preview-img" alt="Preview foto" />
                      <button type="button" class="foto-remove-btn" (click)="$event.stopPropagation(); quitarFotoEdicion()">✕ Quitar</button>
                    </div>
                  } @else {
                    <div class="foto-placeholder">
                      <span class="foto-upload-icon">📷</span>
                      <span class="foto-upload-text">Haz clic o arrastra una imagen</span>
                      <span class="foto-upload-hint">JPG, PNG, WEBP · Máx. 10 MB</span>
                    </div>
                  }
                  <input type="file" #fotoEdicionInput accept="image/*" (change)="onFotoEdicionSelect($event)" style="display:none" />
                </div>
                @if (fotoEdicionNombre()) {
                  <p class="foto-nombre">&#128204; {{ fotoEdicionNombre() }}</p>
                }
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="mostrarModalEdicion.set(false)">Cancelar</button>
                <button type="submit" class="btn btn-primary">💾 Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal: Integración de Expedientes (4 Carpetas) -->
      @if (mostrarModalIntegracionExp()) {
        <div class="modal-overlay animate-fade-in">
          <div class="modal-content animate-slide-in" style="max-width:650px;">
            <div class="modal-header">
              <h2 class="modal-title">🗂️ Integración de Expedientes — {{ obra()!.nombre }}</h2>
              <button class="btn-close" (click)="mostrarModalIntegracionExp.set(false); carpetaSeleccionadaExp.set(null)">✕</button>
            </div>
            <div class="modal-body" style="padding:24px;">
              @if (!carpetaSeleccionadaExp()) {
                <p style="margin-bottom:20px; color:var(--text-muted); font-size:0.9rem;">
                  Selecciona una categoría para gestionar los documentos del expediente de esta obra.
                </p>
                <div class="folders-grid">
                  <div class="folder-card" (click)="carpetaSeleccionadaExp.set('Legal')">
                    <span class="folder-icon">⚖️</span>
                    <span class="folder-name">Legal</span>
                  </div>
                  <div class="folder-card" (click)="carpetaSeleccionadaExp.set('Social')">
                    <span class="folder-icon">👥</span>
                    <span class="folder-name">Social</span>
                  </div>
                  <div class="folder-card" (click)="carpetaSeleccionadaExp.set('Técnicos')">
                    <span class="folder-icon">📐</span>
                    <span class="folder-name">Técnicos</span>
                  </div>
                  <div class="folder-card" (click)="carpetaSeleccionadaExp.set('Anexo Fotográfico')">
                    <span class="folder-icon">📸</span>
                    <span class="folder-name">Anexo Fotográfico</span>
                  </div>
                </div>
              } @else {
                <button class="btn btn-secondary btn-sm" style="margin-bottom:16px;" (click)="carpetaSeleccionadaExp.set(null)">
                  ⬅ Volver a las categorías
                </button>
                <h3 style="margin-bottom:16px; color:var(--accent);">Carpeta: {{ carpetaSeleccionadaExp() }}</h3>
                <div class="drag-drop-zone" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
                  <div class="drop-icon">📤</div>
                  <p>Arrastra tus archivos aquí o <strong>haz clic para seleccionar</strong></p>
                  <input type="file" #expInput multiple style="display:none;" (change)="onFileSelect($event)">
                  <button class="btn btn-secondary btn-sm" style="margin-top:8px;" (click)="expInput.click()">Seleccionar archivos</button>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Modal: Nuevo Expediente -->
      @if (mostrarModalNuevoExp()) {
        <div class="modal-overlay animate-fade-in">
          <div class="modal-content animate-slide-in">
            <div class="modal-header">
              <h2 class="modal-title">📂 Crear Nuevo Expediente — {{ obra()!.nombre }}</h2>
              <button class="btn-close" (click)="mostrarModalNuevoExp.set(false)">✕</button>
            </div>
            <form class="modal-form" (submit)="$event.preventDefault(); mostrarModalNuevoExp.set(false)">
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
              <div class="form-row" style="margin-bottom:24px;">
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
                <button type="button" class="btn btn-secondary" (click)="mostrarModalNuevoExp.set(false)">Cancelar</button>
                <button type="submit" class="btn btn-primary">📁 Integrar Expediente</button>
              </div>
            </form>
          </div>
        </div>
      }

      </div>
    } @else {
      <div class="not-found">
        <span style="font-size:3rem">🔍</span>
        <h2>Obra no encontrada</h2>
        <a href="/dashboard" class="btn btn-primary">Volver al Dashboard</a>
      </div>
    }
  `,
  styles: [`
    .expediente { display: flex; flex-direction: column; gap: 24px; }
    .exp-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
    .exp-breadcrumb { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; }
    .exp-breadcrumb a { color: var(--accent); }
    .exp-title { font-size: 1.6rem; font-weight: 800; margin-bottom: 12px; }
    .exp-badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .kpi-strip {
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 20px 28px;
      display: flex; align-items: center; flex-wrap: wrap; gap: 0;
    }
    .strip-item { display: flex; flex-direction: column; gap: 4px; padding: 0 20px; }
    .strip-sep { width: 1px; height: 40px; background: var(--border); }
    .strip-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .strip-val { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
    .accent { color: var(--accent); }
    .exp-progress-wrap { padding: 0 2px; }
    .exp-desc-card p { color: var(--text-secondary); line-height: 1.8; font-size: 0.9rem; }
    .sec-title { font-size: 0.95rem; font-weight: 700; margin-bottom: 16px; color: var(--text-primary); }
    .exp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .exp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .timeline-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
    .tab-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border);
      background: transparent; color: var(--text-secondary);
      cursor: pointer; font-family: 'Inter', sans-serif; font-size: 0.85rem;
      transition: var(--transition);
    }
    .tab-btn.active { background: rgba(232,160,32,0.12); border-color: var(--accent); color: var(--accent); }
    .tab-count {
      background: var(--bg-dark); padding: 1px 6px;
      border-radius: 10px; font-size: 0.72rem; color: var(--text-muted);
    }
    .foto-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .foto-thumb { position: relative; border-radius: 10px; overflow: hidden; aspect-ratio: 4/3; cursor: pointer; }
    .foto-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
    .foto-thumb:hover img { transform: scale(1.05); }
    .foto-overlay {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.8));
      padding: 20px 10px 8px; display: flex; flex-direction: column;
      font-size: 0.72rem; color: white; opacity: 0; transition: var(--transition);
    }
    .foto-thumb:hover .foto-overlay { opacity: 1; }
    .empty-state { grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.9rem; }
    .areas-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
    .area-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; border-radius: 8px;
      background: var(--bg-dark); border: 1px solid var(--border);
    }
    .area-item.done { background: rgba(45,212,191,0.04); border-color: rgba(45,212,191,0.15); }
    .area-name { flex: 1; font-size: 0.87rem; color: var(--text-primary); }
    .areas-summary { display: flex; gap: 20px; font-size: 0.85rem; font-weight: 600; padding-top: 8px; border-top: 1px solid var(--border); }
    .upload-zone {
      border: 2px dashed var(--border-light); border-radius: 12px;
      padding: 32px; text-align: center; transition: var(--transition);
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .upload-zone:hover { border-color: var(--accent); background: rgba(232,160,32,0.03); }
    .upload-icon { font-size: 2.5rem; }
    .upload-text { font-size: 0.9rem; font-weight: 500; color: var(--text-primary); }
    .upload-hint { font-size: 0.78rem; color: var(--text-muted); }
    .upload-feedback { margin-top: 10px; font-size: 0.82rem; color: var(--success); }
    .upload-feedback.error { color: var(--danger); }
    .camera-feed {
      border-radius: 10px; overflow: hidden; background: var(--bg-dark);
      min-height: 200px; display: flex; align-items: center; justify-content: center;
    }
    .docs-list { display: flex; flex-direction: column; gap: 10px; }
    .doc-item {
      display: flex; align-items: center; gap: 14px;
      padding: 12px 16px; border-radius: 10px;
      background: var(--bg-dark); border: 1px solid var(--border);
      transition: var(--transition);
    }
    .doc-item.entregado {
      background: rgba(45, 212, 191, 0.08);
      border-color: rgba(45, 212, 191, 0.3);
    }
    .doc-icon { font-size: 1.2rem; }
    .doc-info { display: flex; flex-direction: column; }
    .doc-name { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
    .doc-status { font-size: 0.75rem; color: var(--text-muted); }
    .doc-item.entregado .doc-status { color: var(--success); font-weight: 600; }
    .not-found { text-align: center; padding: 80px; display: flex; flex-direction: column; gap: 20px; align-items: center; color: var(--text-muted); }
    /* Photo upload zone */
    .foto-upload-zone {
      border: 2px dashed var(--border-light); border-radius: 10px;
      padding: 20px; cursor: pointer; transition: all 0.2s;
      display: flex; flex-direction: column; align-items: center;
    }
    .foto-upload-zone:hover { border-color: var(--accent); background: rgba(232,160,32,0.04); }
    .foto-placeholder { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .foto-upload-icon { font-size: 2rem; }
    .foto-upload-text { font-size: 0.88rem; font-weight: 600; color: var(--text-primary); }
    .foto-upload-hint { font-size: 0.75rem; color: var(--text-muted); }
    .foto-preview-wrap { position: relative; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .foto-preview-img { max-height: 160px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); }
    .foto-remove-btn {
      background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3);
      color: #EF4444; border-radius: 6px; padding: 4px 12px;
      font-size: 0.78rem; cursor: pointer; transition: all 0.2s;
    }
    .foto-remove-btn:hover { background: rgba(239,68,68,0.25); }
    .foto-nombre { font-size: 0.78rem; color: var(--accent); margin-top: 6px; }
    /* Modal Overlay Styles */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: var(--bg-surface); width: 90%; max-width: 500px; border-radius: var(--radius-lg); border: 1px solid var(--border-light); box-shadow: var(--shadow-lg); overflow: hidden; display: flex; flex-direction: column; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); background: rgba(0,0,0,0.2); }
    .modal-title { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }
    .btn-close { background: transparent; border: none; font-size: 1.2rem; color: var(--text-muted); cursor: pointer; transition: var(--transition); }
    .btn-close:hover { color: var(--danger); transform: scale(1.1); }
    .modal-form { padding: 24px; overflow-y: auto; max-height: 75vh; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border); }
    /* Carpetas de Expedientes */
    .folders-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 20px; }
    .folder-card { background: var(--bg-dark); border: 1px solid var(--border); border-radius: 12px; padding: 24px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; cursor: pointer; transition: all 0.3s ease; }
    .folder-card:hover { transform: translateY(-4px); border-color: var(--accent); box-shadow: 0 8px 24px rgba(232,160,32,0.15); }
    .folder-icon { font-size: 2.5rem; line-height: 1; }
    .folder-name { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); text-align: center; }
    .drag-drop-zone { border: 2px dashed var(--border); border-radius: 12px; padding: 40px 20px; text-align: center; background: rgba(0,0,0,0.1); cursor: pointer; transition: all 0.3s; }
    .drag-drop-zone:hover { border-color: var(--accent); background: rgba(232,160,32,0.05); }
    .drop-icon { font-size: 3rem; margin-bottom: 12px; opacity: 0.8; }
    /* Interactive rows */
    .interactive-row:hover { background: rgba(232,160,32,0.06); transition: background 0.2s; }
    .btn-pill { padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
    .btn-pill:hover { opacity: 0.85; }
    .tab-main-btn { padding: 10px 20px; border: none; border-bottom: 3px solid transparent; background: transparent; color: var(--text-muted); font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
    .tab-main-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
    .tab-main-btn:hover { color: var(--text-primary); }
    /* Acordeón Interactivo */
    .interactive-accordion-header { transition: all 0.2s ease; }
    .interactive-accordion-header:hover { filter: brightness(1.15); background: rgba(255,255,255,0.04) !important; }
    .accordion-icon { transition: transform 0.2s ease; display: inline-block; }
  `]
})
export class ExpedienteComponent implements OnInit {
  faseActiva = signal<string>('ANTES');
  uploadMsg = signal('');
  uploadError = signal(false);
  mostrarModalEdicion = signal(false);
  generandoPDF = signal(false);
  fotoEdicionPreview = signal<string | null>(null);
  fotoEdicionNombre  = signal<string | null>(null);
  fotoEdicionFile    = signal<File | null>(null);
  fases = [
    { key: 'ANTES', icon: '🔵', label: 'Antes' },
    { key: 'DURANTE', icon: '🟡', label: 'Durante' },
    { key: 'DESPUES', icon: '🟢', label: 'Después' },
  ];

  obra = signal<ObraResponse | null>(null);
  avances = signal<ObraAvance[]>([]);
  ultimoPorcentaje = signal(0);
  cargando = signal(true);

  archivosSubidos = signal<ObraArchivo[]>([]);
  expedientesSvc = inject(ExpedientesService);
  sanitizer = inject(DomSanitizer);
  toastSvc = inject(ToastService);
  checklist = signal<ExpedienteObraItem[]>([]);
  mostrarModalVisor = signal(false);
  urlVisor = signal<string | null>(null);

  tabPrincipalActiva = signal<'CHECKLIST' | 'FOTOS' | 'INFO'>('CHECKLIST');
  documentoSeleccionado = signal<ExpedienteObraItem | null>(null);
  mostrarModalGestionDoc = signal(false);
  mostrarModalIntegracionExp = signal(false);
  carpetaSeleccionadaExp = signal<string | null>(null);
  mostrarModalNuevoExp = signal(false);

  // Estado del Acordeón para las 4 Secciones
  seccionesAbiertas = signal<Set<string>>(new Set(['PARTE_SOCIAL', 'PROYECTO_EJECUTIVO', 'PROCESOS_CONTRATACION', 'DOCUMENTOS_COMPROBATORIOS']));

  toggleSeccion(seccionKey: string): void {
    const set = new Set(this.seccionesAbiertas());
    if (set.has(seccionKey)) {
      set.delete(seccionKey);
    } else {
      set.add(seccionKey);
    }
    this.seccionesAbiertas.set(set);
  }

  isSeccionAbierta(seccionKey: string): boolean {
    return this.seccionesAbiertas().has(seccionKey);
  }

  desplegarTodasSecciones(): void {
    this.seccionesAbiertas.set(new Set(['PARTE_SOCIAL', 'PROYECTO_EJECUTIVO', 'PROCESOS_CONTRATACION', 'DOCUMENTOS_COMPROBATORIOS']));
  }

  colapsarTodasSecciones(): void {
    this.seccionesAbiertas.set(new Set());
  }

  abrirModalGestionDoc(item: ExpedienteObraItem): void {
    this.documentoSeleccionado.set(item);
    this.mostrarModalGestionDoc.set(true);
  }

  cerrarModalGestionDoc(): void {
    this.mostrarModalGestionDoc.set(false);
    this.documentoSeleccionado.set(null);
  }

  cambiarEstadoEnModal(estado: EstadoDocumentoChecklist): void {
    const item = this.documentoSeleccionado();
    if (!item) return;
    this.cambiarEstadoItem(item, estado);
    this.documentoSeleccionado.update(curr => curr ? { ...curr, estado } : null);
  }

  subirArchivoEnModal(event: Event): void {
    const item = this.documentoSeleccionado();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const currentObra = this.obra();
    if (!item || !file || !currentObra) return;

    this.expedientesSvc.subirArchivoDocumento(currentObra.id, item.id, file).subscribe({
      next: (updated) => {
        this.checklist.update(list => list.map(i => i.id === updated.id ? updated : i));
        this.documentoSeleccionado.set(updated);
        this.toastSvc.show('✅ Archivo digital subido e integrado correctamente', 'success');
      },
      error: (err) => {
        console.error('Error subiendo archivo', err);
        this.toastSvc.show('❌ Error al subir archivo digital', 'error');
      }
    });
  }

  guardarObservacionesDesdeModal(texto: string): void {
    const item = this.documentoSeleccionado();
    const currentObra = this.obra();
    if (!item || !currentObra) return;

    this.expedientesSvc.actualizarEstado(currentObra.id, item.id, item.estado, texto).subscribe({
      next: (updated) => {
        this.checklist.update(list => list.map(i => i.id === updated.id ? updated : i));
        this.documentoSeleccionado.set(updated);
        this.toastSvc.show('📝 Comentario guardado correctamente', 'success');
      },
      error: (err) => {
        console.error('Error guardando comentario', err);
        this.toastSvc.show('❌ Error al guardar comentario', 'error');
      }
    });
  }

  irAIntegracionExpediente(): void {
    const el = document.getElementById('section-checklist');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  svc = inject(ObrasService);
  avancesSvc = inject(AvancesService);
  archivosSvc = inject(ArchivosService);
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  getSanitizedUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  abrirVisorDocumento(archivoUrl: string): void {
    this.urlVisor.set(this.getFileUrl(archivoUrl));
    this.mostrarModalVisor.set(true);
  }

  cerrarVisorDocumento(): void {
    this.mostrarModalVisor.set(false);
    this.urlVisor.set(null);
  }

  guardarObservaciones(item: ExpedienteObraItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const obs = input.value.trim();
    const currentObra = this.obra();
    if (!currentObra) return;

    this.expedientesSvc.actualizarEstado(currentObra.id, item.id, item.estado, obs).subscribe({
      next: (updated) => {
        this.checklist.update(list => list.map(i => i.id === updated.id ? updated : i));
        this.toastSvc.show('📝 Observación guardada correctamente', 'success');
      },
      error: () => this.toastSvc.show('Error al guardar observación', 'error')
    });
  }

  ngOnInit() {
    this.route.params.subscribe(p => {
      const id = Number(p['id']);
      if (!isNaN(id)) {
        this.svc.getObraById(id).subscribe({
          next: (obra) => { this.obra.set(obra); this.cargando.set(false); },
          error: () => this.cargando.set(false)
        });
        this.avancesSvc.getAvances(id).subscribe({
          next: (list) => this.avances.set(list),
          error: () => {}
        });
        this.avancesSvc.getUltimoPorcentaje(id).subscribe({
          next: (p) => this.ultimoPorcentaje.set(p),
          error: () => {}
        });
        this.archivosSvc.getArchivos(id).subscribe({
          next: (files) => this.archivosSubidos.set(files),
          error: () => {}
        });
        this.expedientesSvc.getExpedientePorObra(id).subscribe({
          next: (items) => this.checklist.set(items),
          error: (err) => console.error('Error cargando checklist:', err)
        });
      }
    });
  }

  getItemsPorSeccion(seccion: SeccionExpedienteChecklist): ExpedienteObraItem[] {
    return this.checklist().filter(i => i.documento.seccion === seccion);
  }

  getPorcentajeCompletadoSeccion(seccion: SeccionExpedienteChecklist): number {
    const items = this.getItemsPorSeccion(seccion);
    if (items.length === 0) return 0;
    const completados = items.filter(i => i.estado === 'OK').length;
    return Math.round((completados / items.length) * 100);
  }

  cambiarEstadoItem(item: ExpedienteObraItem, estado: EstadoDocumentoChecklist): void {
    const currentObra = this.obra();
    if (!currentObra) return;
    this.expedientesSvc.actualizarEstado(currentObra.id, item.id, estado, item.observaciones).subscribe({
      next: (updated) => {
        this.checklist.update(list => list.map(i => i.id === updated.id ? updated : i));
      },
      error: (err) => console.error('Error al cambiar estado de documento', err)
    });
  }

  subirArchivoItem(item: ExpedienteObraItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const currentObra = this.obra();
    if (!file || !currentObra) return;

    this.expedientesSvc.subirArchivoDocumento(currentObra.id, item.id, file).subscribe({
      next: (updated) => {
        this.checklist.update(list => list.map(i => i.id === updated.id ? updated : i));
        alert('✅ Documento subido y registrado correctamente en el expediente');
      },
      error: (err) => alert('❌ Error al subir archivo de documento')
    });
  }

  async generarPDF() {
    this.generandoPDF.set(true);
    await new Promise(r => setTimeout(r, 100));
    const element = document.getElementById('pdfContent');
    if (!element) { this.generandoPDF.set(false); return; }
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#111827' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Reporte_Obra_${this.obra()?.id}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF', error);
    } finally {
      this.generandoPDF.set(false);
    }
  }

  guardarEdicion(e: Event) {
    e.preventDefault();
    const current = this.obra();
    if (!current) return;

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const nombre = (formData.get('nombre') as string)?.trim() || current.nombre;
    const estatus = (formData.get('estatus') as ObraEstatus) || current.estatus;
    const categoria = (formData.get('categoria') as string) || current.categoria || 'Infraestructura General';
    const descripcion = (formData.get('descripcion') as string)?.trim() || current.descripcion;
    const rawPorcentaje = Number(formData.get('porcentaje')) || 0;
    const porcentaje = Math.max(0, Math.min(100, rawPorcentaje));

    this.svc.updateObra(current.id, {
      nombre,
      descripcion,
      categoria,
      monto: current.monto,
      fechaInicio: current.fechaInicio,
      fechaFin: current.fechaFin,
      responsableId: current.responsableId
    }).subscribe({
      next: (updated) => {
        this.obra.set(updated);
        if (estatus !== current.estatus) {
          this.svc.cambiarEstatus(current.id, estatus).subscribe({
            next: (ob) => this.obra.set(ob),
            error: (err) => console.error('Error al cambiar estatus', err)
          });
        }
        if (porcentaje > 0 && porcentaje !== this.ultimoPorcentaje()) {
          this.avancesSvc.registrarAvance(current.id, {
            titulo: `Actualización a ${porcentaje}%`,
            fechaAvance: new Date().toISOString().slice(0, 10),
            porcentaje,
            observaciones: descripcion
          }).subscribe({
            next: () => this.ultimoPorcentaje.set(porcentaje),
            error: () => {}
          });
        }
        alert('✅ Cambios guardados correctamente');
        this.quitarFotoEdicion();
        this.mostrarModalEdicion.set(false);
      },
      error: (err) => {
        console.error('Error actualizando obra:', err);
        alert('❌ Error al actualizar la obra.');
      }
    });
  }

  validarMaximo100(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = Number(input.value);
    if (val > 100) input.value = '100';
    if (val < 0) input.value = '0';
  }

  onFotoEdicionSelect(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('❌ La imagen no puede superar 10 MB');
      return;
    }
    this.fotoEdicionFile.set(file);
    this.fotoEdicionNombre.set(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => this.fotoEdicionPreview.set(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  onFotoEdicionDrop(e: DragEvent): void {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) this.onFotoEdicionSelect({ target: { files: [file] } } as any);
  }

  quitarFotoEdicion(): void {
    this.fotoEdicionPreview.set(null);
    this.fotoEdicionNombre.set(null);
    this.fotoEdicionFile.set(null);
  }

  getFileUrl(url: string): string {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const cleanPath = url.startsWith('/') ? url : '/' + url;
    return 'http://localhost:8081' + cleanPath;
  }

  canDeleteFile(): boolean {
    const currentObra = this.obra();
    if (!currentObra) return false;
    return this.auth.hasRole('admin') && !this.svc.isBlocked(currentObra);
  }

  eliminarArchivo(arch: ObraArchivo): void {
    const currentObra = this.obra();
    if (!currentObra) return;

    if (confirm(`¿Estás seguro de que deseas eliminar el archivo "${arch.nombreOriginal}"?`)) {
      this.archivosSvc.eliminarArchivo(currentObra.id, arch.id).subscribe({
        next: () => {
          this.archivosSubidos.update(list => list.filter(a => a.id !== arch.id));
          this.uploadMsg.set(`🗑️ Archivo "${arch.nombreOriginal}" eliminado.`);
          this.uploadError.set(false);
        },
        error: (err) => {
          alert(err.error?.message || 'Error al eliminar el archivo.');
        }
      });
    }
  }

  fotosPorFase(fase: string) {
    return this.avances()
      .flatMap(a => a.evidencias)
      .filter(e => e.fase === fase.toUpperCase() && e.tipo === 'IMAGEN');
  }

  areasEntregadas = computed(() => 0);
  areasPendientes = computed(() => 0);

  statusClass(): string {
    const obra = this.obra();
    return obra ? (ESTATUS_COLOR[obra.estatus] ?? 'badge-pendiente') : '';
  }
  statusLabel(): string {
    const obra = this.obra();
    return obra ? (ESTATUS_LABEL[obra.estatus] ?? obra.estatus) : '';
  }
  progressColor(): string {
    const p = this.ultimoPorcentaje();
    return p >= 80 ? 'var(--success)' : p >= 50 ? 'var(--accent)' : 'var(--danger)';
  }
  fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  fmtBytes(b: number): string {
    return (b / 1048576).toFixed(1) + ' MB';
  }
  onFileSelect(e: Event): void {
    const files = (e.target as HTMLInputElement).files;
    if (!files?.length) return;
    const currentObra = this.obra();
    if (!currentObra) return;

    const MAX = 30 * 1024 * 1024;
    const oversized = Array.from(files).filter(f => f.size > MAX);
    if (oversized.length) {
      this.uploadError.set(true);
      this.uploadMsg.set(`❌ Archivos muy grandes: ${oversized.map(f => f.name).join(', ')} (máx. 30MB)`);
      return;
    }

    this.uploadError.set(false);
    this.uploadMsg.set(`⏳ Subiendo ${files.length} archivo(s) al servidor...`);

    let uploadedCount = 0;
    Array.from(files).forEach(file => {
      let carpeta: 'LEGAL' | 'SOCIAL' | 'TECNICOS' | 'FOTOGRAFICO' = 'TECNICOS';
      if (file.type.startsWith('image/')) carpeta = 'FOTOGRAFICO';
      else if (file.name.toLowerCase().includes('acta') || file.name.toLowerCase().includes('contrato')) carpeta = 'LEGAL';

      this.archivosSvc.subirArchivo(currentObra.id, carpeta, file).subscribe({
        next: (nuevoArchivo) => {
          uploadedCount++;
          this.archivosSubidos.update(prev => [nuevoArchivo, ...prev]);
          if (uploadedCount === files.length) {
            this.uploadMsg.set(`✅ ¡${uploadedCount} archivo(s) subido(s) exitosamente al servidor!`);
          }
        },
        error: (err) => {
          this.uploadError.set(true);
          this.uploadMsg.set(`❌ Error subiendo ${file.name}: ${err.error?.message || 'Error de servidor'}`);
        }
      });
    });
  }
  onDrop(e: DragEvent): void {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (dt?.files) this.onFileSelect({ target: { files: dt.files } } as any);
  }
}
