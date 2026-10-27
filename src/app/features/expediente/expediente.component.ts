import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObrasService } from '../../core/services/obras.service';
import { AvancesService } from '../../core/services/avances.service';
import { ArchivosService } from '../../core/services/archivos.service';
import { ExpedientesService, ExpedienteObraItem, EstadoDocumentoChecklist, SeccionExpedienteChecklist } from '../../core/services/expedientes.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ObraResponse, ObraAvance, ObraArchivo, ObraEstatus, ESTATUS_LABEL, ESTATUS_COLOR, ObraMeta, ConceptoSugerido, CATEGORIAS_METAS_CATALOG } from '../../core/models/obra.model';
import { MetasService } from '../../core/services/metas.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { fichaTecnicaBgBase64 } from './ficha-bg';

@Component({
  selector: 'app-expediente',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule],
  template: `
    @if (obra()) {
      <div class="expediente" id="pdfContent">
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
            
            
            @if (tabActiva() !== 'editar') {
              @if (auth.hasRole('admin')) {
                <button class="btn" style="background:var(--danger); color:white; border:none; box-shadow:0 4px 12px rgba(239, 68, 68, 0.3); display:inline-flex; align-items:center; gap:6px;" (click)="tabActiva.set('editar')">
                  ✏️ Editar Obra
                </button>
              }
              @if (auth.hasRole('admin', 'residente')) {
                <button class="btn" style="background:linear-gradient(135deg,#10B981,#059669); color:#fff; border:none; box-shadow:0 4px 12px rgba(16,185,129,0.3); display:inline-flex; align-items:center; gap:6px;" (click)="mostrarModalIntegracionExp.set(true)">
                  📂 Integración de Expedientes
                </button>
              }
              @if (auth.hasRole('admin') || (auth.hasRole('residente') && !svc.isBlocked(obra()!))) {
                <button class="btn btn-secondary" (click)="mostrarModalReportes.set(true)">📄 Generar Reporte</button>
              }
            } @else {
              <button class="btn btn-secondary" (click)="tabActiva.set('resumen')">Cancelar</button>
              <button class="btn btn-primary" type="button" (click)="guardarEdicionObra($event)">💾 Guardar Cambios</button>
            }

          </div>
        </div>

        
        <!-- TABS NAV -->
        <div class="exp-tabs-nav" style="display:flex; gap:8px; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:12px; overflow-x:auto;">
          <button class="tab-pill" [class.active]="tabActiva() === 'resumen'" (click)="tabActiva.set('resumen')">📊 Resumen General</button>
          @if (auth.hasRole('admin', 'residente')) {
            <button class="tab-pill" [class.active]="tabActiva() === 'archivos'" (click)="tabActiva.set('archivos')">📁 Archivos y Evidencias</button>
            <button class="tab-pill" [class.active]="tabActiva() === 'avances'" (click)="tabActiva.set('avances')" style="color:var(--accent);">🎯 Actualizar Avances</button>
          }
          
        </div>

        <!-- KPI Strip -->
        @if (auth.hasRole('admin', 'residente')) {
          <div class="kpi-strip" [style.display]="tabActiva() === 'resumen' ? '' : 'none'">
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
          <div class="exp-progress-wrap" [style.display]="tabActiva() === 'resumen' ? '' : 'none'">
            <div class="progress-bar" style="height:12px">
              <div class="progress-fill" [style.width.%]="ultimoPorcentaje()"></div>
            </div>
          </div>
        }

        <!-- Description -->
        <div class="card exp-desc-card" [style.display]="tabActiva() === 'resumen' ? '' : 'none'">
          <h3 class="sec-title">📝 Descripción del Proyecto</h3>
          <p>{{ obra()!.descripcion }}</p>
        </div>

        @if (auth.hasRole('admin', 'residente')) {
          <div class="exp-grid" [style.display]="(tabActiva() === 'resumen' || tabActiva() === 'archivos') ? '' : 'none'">
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
                  <div class="foto-thumb" (click)="fotoVisorActiva.set(foto)">
                    <img [src]="getFileUrl(foto.archivoUrl)" [alt]="foto.descripcion" loading="lazy" />
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
            <div class="card" style="padding:0; overflow:hidden;">
              <div class="seccion-header interactive-accordion-header" (click)="areasAbiertas.set(!areasAbiertas())" style="padding:14px 18px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; border-bottom:1px solid var(--border);">
                <div style="display:flex; align-items:center; gap:10px;">
                  <span class="accordion-icon" style="color:var(--accent); font-weight:bold; font-size:0.85rem;">{{ areasAbiertas() ? '▼' : '►' }}</span>
                  <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-primary); margin:0;">📋 Áreas del Proyecto</h3>
                  <span class="badge badge-secondary" style="font-size:0.72rem;">{{ avances().length }} Avances</span>
                </div>
              </div>
              
              @if (areasAbiertas()) {
                <div class="areas-list" style="padding: 24px; animation: fadeIn 0.3s ease;">
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
              }
            </div>
          </div>

          <!-- Upload + Camera -->
          <div class="exp-grid-2" [style.display]="tabActiva() === 'archivos' ? '' : 'none'">
            <div class="card upload-card">
              <h3 class="sec-title">📁 Subir Archivos</h3>

                <div style="margin-bottom: 16px;">
                  <label class="form-label" style="display:block; margin-bottom:8px; font-weight:600;">Destino / Clasificacion del Archivo</label>
                  <select class="form-input" #faseUpload (change)="faseSubida.set(faseUpload.value)">
                    <option value="GENERAL">Documento del Expediente (General)</option>
                    <option value="ANTES">Evidencia Fotografica (Antes)</option>
                    <option value="DURANTE">Evidencia Fotografica (Durante)</option>
                    <option value="DESPUES">Evidencia Fotografica (Despues)</option>
                  </select>
                </div>
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

            <div class="card docs-card" style="padding:0; overflow:hidden;">
              <div class="seccion-header interactive-accordion-header" (click)="archivosAbiertos.set(!archivosAbiertos())" style="padding:14px 18px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; border-bottom:1px solid var(--border);">
                <div style="display:flex; align-items:center; gap:10px;">
                  <span class="accordion-icon" style="color:var(--accent); font-weight:bold; font-size:0.85rem;">{{ archivosAbiertos() ? '▼' : '►' }}</span>
                  <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-primary); margin:0;">📁 Archivos Subidos al Expediente</h3>
                  <span class="badge badge-secondary" style="font-size:0.72rem;">{{ archivosSubidos().length }} Documentos</span>
                </div>
              </div>
              
              @if (archivosAbiertos()) {
                <div class="docs-list" style="padding: 24px; animation: fadeIn 0.3s ease;">
                @for (arch of archivosSubidos(); track arch.id) {
                  <div class="doc-item entregado" style="display:flex; align-items:center; gap:12px;">
                    <div class="doc-icon">{{ arch.tipoArchivo === 'FOTO' ? '🖼️' : '📄' }}</div>
                    <div class="doc-info" style="flex:1;">
                      <span class="doc-name">{{ arch.nombreOriginal }}</span>
                      <span class="doc-status">{{ arch.carpeta }} · {{ fmtBytes(arch.tamanioBytes) }}</span>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                      <button class="btn btn-secondary btn-sm" (click)="descargarArchivoSeguro(arch.archivoUrl, arch.nombreOriginal)">
                        👁️ Ver / Descargar
                      </button>
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
              }
            </div>
          </div>
        }

        <!-- SECCIÓN DE CHECKLIST UNITARIO OFICIAL (FORMATO TLAXIACO 2026) -->
        <div [style.display]="tabActiva() === 'archivos' ? '' : 'none'">
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

              </div>

              <div class="card" [style.display]="tabActiva() === 'avances' ? '' : 'none'" style="margin-top:20px;">
          <h3 class="sec-title">🎯 Actualización de Avances o Metas</h3>
          <div class="metas-list" style="display:flex; flex-direction:column; gap:12px;">
            @for (meta of metas(); track meta.id) {
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:16px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                  <strong style="font-size:1.05rem;">{{ meta.concepto }}</strong>
                  <span style="font-size:0.85rem; font-weight:700; color:var(--accent); background:rgba(var(--accent-rgb), 0.1); padding:4px 10px; border-radius:20px;">
                    {{ meta.avanceAcumulado }} / {{ meta.cantidadMeta }} {{ meta.unidadMedida }} ({{ meta.porcentaje }}%)
                  </span>
                </div>
                <div style="height:6px; background:rgba(0,0,0,0.1); border-radius:3px; overflow:hidden; margin-bottom:16px;">
                  <div style="height:100%; background:var(--accent); border-radius:3px; transition:width 0.3s;" [style.width.%]="meta.porcentaje"></div>
                </div>
                
                @if (meta.estado === 'COMPLETADO') {
                  <div style="margin-bottom:16px; padding:8px; background:rgba(var(--success-rgb), 0.1); color:var(--success); border-radius:6px; font-weight:600; text-align:center;">
                    ✅ Meta Completada
                  </div>
                } @else {
                  <div style="display:flex; gap:8px; align-items:center; margin-bottom: 16px;">
                    <input type="date" #inputFecha class="form-input" style="width: 140px;" [min]="obra()?.fechaInicio" [max]="obra()?.fechaFin">
                    <input type="number" #inputAvance class="form-input" style="flex:1;" [placeholder]="'Ingresa el avance (ej. ' + meta.cantidadMeta + ' ' + meta.unidadMedida + ')'">
                    <button class="btn btn-primary btn-sm" (click)="reportarAvanceMeta(meta, inputAvance.value, inputFecha.value); inputAvance.value=''; inputFecha.value=''">Guardar</button>
                  </div>
                }

                <details style="background: rgba(255,255,255,0.02); border-radius: 6px; padding: 8px;">
                  <summary style="cursor: pointer; font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Ver Historial de Avances</summary>
                  <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
                    @for (avance of getAvancesPorMeta(meta.id!); track avance.id) {
                      <div style="display:flex; justify-content:space-between; font-size:0.8rem; padding:8px; background:rgba(0,0,0,0.2); border-radius:4px; align-items:center;">
                        <div style="display:flex; gap: 8px;">
                          <span>📅 {{ avance.fechaAvance | date:'dd/MM/yyyy' }}</span>
                          <span style="color:var(--success);">+{{ avance.cantidadEjecutada }} {{ meta.unidadMedida }}</span>
                          <span style="color:var(--text-muted);">Acumulado: {{ avance.acumuladoActual }}</span>
                        </div>
                        <button class="btn btn-sm" style="font-size:0.7rem; padding: 4px 8px; background:var(--accent); color:white; border:none; border-radius:4px; cursor:pointer;" (click)="auditarAvanceConIA(avance.id)">
                          🤖 Auditar con IA
                        </button>
                      </div>
                    } @empty {
                      <div style="font-size:0.8rem; color:var(--text-muted); padding:4px;">No hay reportes de avance aún.</div>
                    }
                  </div>
                </details>

              </div>
            } @empty {
              <div class="empty-state">No hay metas asignadas a esta obra.</div>
            }
          </div>
        </div>
        
        <div class="card" [style.display]="tabActiva() === 'editar' ? '' : 'none'" style="margin-top:20px;">
          <h3 class="sec-title">⚙️ Editar Obra y Gestor de Metas</h3>
          
          <form class="modal-form" (submit)="guardarEdicionObra($event)" id="editarObraForm">
            <div class="form-group"><label class="form-label">Nombre del Proyecto</label><input type="text" name="nombre" class="form-input" [value]="obra()!.nombre" required></div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Estatus</label>
                <select name="estatus" class="form-input">
                  <option value="PLANIFICADA" [selected]="obra()!.estatus === 'PLANIFICADA'">Planificada</option><option value="EN_PROCESO" [selected]="obra()!.estatus === 'EN_PROCESO'">En Proceso</option><option value="COMPLETADA" [selected]="obra()!.estatus === 'COMPLETADA'">Completada</option><option value="CANCELADA" [selected]="obra()!.estatus === 'CANCELADA'">Cancelada</option><option value="INACTIVA" [selected]="obra()!.estatus === 'INACTIVA'">Inactiva</option>
                </select>
              </div>
              <div class="form-group"><label class="form-label">Categoría de Obra</label><input type="text" name="categoria" class="form-input" [value]="obra()!.categoria || ''"></div>
            </div>
            <div class="form-group" style="margin-bottom: 24px;"><label class="form-label">Descripción</label><textarea name="descripcion" class="form-input" rows="4">{{ obra()!.descripcion }}</textarea></div>
            <h4 style="margin:8px 0 12px; color:var(--text-primary);">📄 Datos para Ficha Técnica y Expediente</h4>
            <div class="form-group"><label class="form-label">Contratista (Razón Social)</label><input type="text" name="contratista" class="form-input" placeholder="Ej. INGENIERÍA EN INFRAESTRUCTURA BARICHARA S.A. DE C.V. (Opcional si aún no se asigna)" [value]="obra()!.contratista || ''"></div>
            <div class="form-group"><label class="form-label">Fuente de Financiamiento</label><textarea name="fuenteFinanciamiento" class="form-input" rows="2" placeholder="Ej. RAMO 33, FAISMUN">{{ obra()!.fuenteFinanciamiento || '' }}</textarea></div>
            <div class="form-group"><label class="form-label">Beneficiarios</label><textarea name="beneficiarios" class="form-input" rows="2" placeholder="Ej. 40 HOGARES, 120 MUJERES Y 100 HOMBRES">{{ obra()!.beneficiarios || '' }}</textarea></div>
            <div class="form-group" style="margin-bottom: 24px;"><label class="form-label">Impacto Social</label><textarea name="impactoSocial" class="form-input" rows="3" placeholder="Describe el impacto social de la obra">{{ obra()!.impactoSocial || '' }}</textarea></div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              
              <button type="button" class="btn btn-danger" (click)="eliminarObraAdmin()">🗑️ Eliminar Obra</button>
            </div>
          </form>

          <hr style="margin:24px 0; border-color:var(--border);">
          <h3 class="sec-title">🎯 Gestor de Metas</h3>
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:16px;">
            <input type="text" #nmConcepto class="form-input" placeholder="Concepto (Ej. Muros)" style="flex:1;">
            <input type="number" #nmCant class="form-input" placeholder="Cant" style="width:100px;">
            <select #nmUni class="form-input" style="width:150px;">
                <option value="" disabled selected>Unidad...</option>
                <option value="piezas">piezas</option>
                <option value="m">m (lineales)</option>
                <option value="m2">m² (cuadrados)</option>
                <option value="m3">m³ (cúbicos)</option>
                <option value="km">km</option>
                <option value="kg">kg</option>
                <option value="ton">toneladas</option>
                <option value="litros">litros</option>
                <option value="lotes">lotes</option>
                <option value="salidas">salidas</option>
                <option value="tomas">tomas</option>
                <option value="servicios">servicios</option>
                <option value="viajes">viajes</option>
                <option value="global">global</option>
              </select>
            <button class="btn btn-secondary" (click)="agregarMetaNueva(nmConcepto.value, nmCant.value, nmUni.value); nmConcepto.value=''; nmCant.value=''; nmUni.value=''">➕ Agregar</button>
          </div>
          <ul style="list-style:none; padding:0; margin:0;">
            @for (meta of metas(); track meta.id) {
              <li style="display:flex; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.05); margin-bottom:8px; border-radius:6px; align-items:center;">
                <span>{{ meta.concepto }} ({{ meta.cantidadMeta }} {{ meta.unidadMedida }})</span>
                <button class="btn btn-danger btn-sm" (click)="eliminarMetaAdmin(meta.id!)">🗑️ Eliminar</button>
              </li>
            }
          </ul>
        </div>


  
  <!-- Modal Visor de Fotos -->
        @if (fotoVisorActiva()) {
          <div class="modal-overlay animate-fade-in" style="z-index: 3000; padding:20px; display:flex; justify-content:center; align-items:center;" (click)="fotoVisorActiva.set(null)" (window:keydown.escape)="fotoVisorActiva.set(null)">
            <div style="position:relative; max-width:90vw; max-height:90vh; display:flex; flex-direction:column;" (click)="$event.stopPropagation()">
              
              <img [src]="getFileUrl(fotoVisorActiva().archivoUrl)" style="max-width:100%; max-height:70vh; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.5); object-fit:contain;" />
              
              <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface); padding:16px 20px; border-radius:8px; box-shadow: var(--shadow-lg);">
                <div style="text-align:left;">
                  <h4 style="margin:0; color:var(--text-primary); font-size:1.1rem;">{{ fotoVisorActiva().descripcion }}</h4>
                  <span style="font-size:0.85rem; color:var(--text-muted); padding:2px 8px; background:rgba(255,255,255,0.05); border-radius:12px; display:inline-block; margin-top:4px;">{{ fotoVisorActiva().tipo }}</span>
                </div>
                <div style="display:flex; gap:12px;">
                  @if (canDeleteFile()) {
                    <button class="btn btn-danger" (click)="eliminarFotoVisor()">
                      🗑️ Eliminar Foto
                    </button>
                  }
                  <button class="btn btn-primary" (click)="descargarArchivoSeguro(fotoVisorActiva().archivoUrl, 'Evidencia_' + fotoVisorActiva().tipo + '_' + fotoVisorActiva().id)">
                    ⬇️ Descargar
                  </button>
                  <button class="btn btn-secondary" (click)="fotoVisorActiva.set(null)">
                    ✖️ Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        }


  
  <!-- Modal Reportes -->
        @if (mostrarModalReportes()) {
          <div class="modal-overlay animate-fade-in" style="z-index: 4000; padding:20px; display:flex; justify-content:center; align-items:center;" (click)="mostrarModalReportes.set(false)" (window:keydown.escape)="mostrarModalReportes.set(false)">
            <div class="modal-content animate-slide-in" style="max-width:550px;" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h2 class="modal-title">📑 Seleccionar Tipo de Reporte</h2>
                <button class="btn-close" (click)="mostrarModalReportes.set(false)">✖</button>
              </div>
              <div class="modal-body" style="padding:24px; display:flex; flex-direction:column; gap:16px;">
                
                <button class="btn btn-secondary" style="justify-content:flex-start; text-align:left; padding:16px; border:1px solid var(--border); box-shadow:var(--shadow-sm);" (click)="generarReporteChecklistPDF()" [disabled]="generandoPDF()">
                  <div style="font-size:1.1rem; font-weight:bold; color:var(--text-primary); margin-bottom:4px;">📄 1. Integración de Expediente Unitario</div>
                  <div style="font-size:0.85rem; color:var(--text-muted); white-space:normal;">Lista de verificación de documentos (Proyecto, Contratación, etc.)</div>
                </button>

                <button class="btn btn-secondary" style="justify-content:flex-start; text-align:left; padding:16px; border:1px solid var(--border); box-shadow:var(--shadow-sm);" (click)="generarFichaTecnicaPDF()" [disabled]="generandoPDF()">
                  <div style="font-size:1.1rem; font-weight:bold; color:var(--text-primary); margin-bottom:4px;">📄 2. Ficha Técnica de la Obra</div>
                  <div style="font-size:0.85rem; color:var(--text-muted); white-space:normal;">Reporte en PDF con la información general y lista de metas.</div>
                </button>

                <button class="btn btn-primary" style="justify-content:flex-start; text-align:left; padding:16px; border:1px solid transparent; box-shadow:var(--shadow-md);" (click)="generarExcelAvances()">
                  <div style="font-size:1.1rem; font-weight:bold; color:#fff; margin-bottom:4px;">📊 3. Reporte Completo de Avances (Excel)</div>
                  <div style="font-size:0.85rem; color:rgba(255,255,255,0.8); white-space:normal;">Hoja de cálculo con todos los datos, metas e historial de reportes.</div>
                </button>
                
              </div>
            </div>
          </div>
        }


  <!-- Modal Previsualizador de Documentos -->
      @if (mostrarModalVisor() && urlVisor()) {
        <div class="modal-overlay animate-fade-in" style="z-index: 2000;">
          <div class="modal-content animate-slide-in" style="max-width: 900px; width: 95%; height: 85vh; display: flex; flex-direction: column;">
            <div class="modal-header">
              <h3 class="modal-title">📄 Visor de Expediente Digital</h3>
              <div style="display: flex; gap: 8px; align-items: center;">
                <a [href]="urlVisorSafeUrl()!" download="documento" class="btn btn-secondary btn-sm" style="text-decoration: none;">📥 Descargar</a>
                <a [href]="urlVisorSafeUrl()!" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration: none;">↗️ Nueva Pestaña</a>
                <button class="btn-close" (click)="cerrarVisorDocumento()">✕</button>
              </div>
            </div>
            <div style="flex: 1; background: #1a1a1a; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 12px;">
              <iframe [src]="urlVisorSafeUrl()!" style="width: 100%; height: 100%; border: none; border-radius: 8px; background: white;"></iframe>
            </div>
          </div>
        </div>
      }

      <!-- MODAL ESPACIO DEDICADO DE GESTIÓN Y PREVISUALIZACIÓN DE DOCUMENTO -->
      @if (mostrarModalGestionDoc() && documentoSeleccionado()) {
        <div class="modal-overlay animate-fade-in" style="z-index: 2100; padding: 24px;" (click)="cerrarModalGestionDoc()">
          <div class="modal-content animate-slide-in" style="max-width: 1050px; width: 92%; height: 82vh; margin: auto; display: flex; flex-direction: column; background: var(--bg-surface); overflow: hidden; border-radius: 16px;" (click)="$event.stopPropagation()">
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
                      @if (vistaPreviaBlobUrl()) {
                        <a [href]="vistaPreviaSafeUrl()!" download="documento" class="btn btn-secondary btn-sm" style="text-decoration:none;">📥 Descargar</a>
                        <a [href]="vistaPreviaSafeUrl()!" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;">↗️ Nueva Pestaña</a>
                      }
                    </div>
                  </div>
                  <div style="flex:1; border-radius:8px; overflow:hidden; border:1px solid var(--border); position:relative;">
                    @if (vistaPreviaSafeUrl()) {
                      <iframe [src]="vistaPreviaSafeUrl()!" style="width:100%; height:100%; border:none; background:white;"></iframe>
                    } @else {
                      <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#666;">Cargando documento seguro...</div>
                    }
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

      <!-- Modal: Integración de Expedientes (Gestor de Carpetas) -->
      @if (mostrarModalIntegracionExp()) {
        <div class="modal-overlay animate-fade-in">
          <div class="modal-content animate-slide-in" style="max-width:750px;">
            <div class="modal-header">
              <h2 class="modal-title">🗂️ Integración de Expedientes — {{ obra()!.nombre }}</h2>
              <button class="btn-close" (click)="mostrarModalIntegracionExp.set(false); carpetaSeleccionadaExp.set(null)">✕</button>
            </div>
            <div class="modal-body" style="padding:24px;">
              @if (!carpetaSeleccionadaExp()) {
                <p style="margin-bottom:20px; color:var(--text-muted); font-size:0.9rem;">
                  Selecciona una categoría para gestionar los documentos o agrega un nuevo expediente completo.
                </p>
                <div class="folders-grid" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));">
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
                  <div class="folder-card" style="border-style:dashed; border-color:var(--accent); background:rgba(16,185,129,0.05);" (click)="carpetaSeleccionadaExp.set('NUEVO')">
                    <span class="folder-icon">➕</span>
                    <span class="folder-name" style="color:var(--accent);">Nuevo Expediente</span>
                  </div>
                </div>
              } @else if (carpetaSeleccionadaExp() === 'NUEVO') {
                <button class="btn btn-secondary btn-sm" style="margin-bottom:16px;" (click)="carpetaSeleccionadaExp.set(null)">
                  ⬅ Volver a las categorías
                </button>
                <h3 style="margin-bottom:16px; color:var(--accent);">📂 Crear Nuevo Expediente</h3>
                <form class="modal-form" (submit)="crearNuevoExpediente($event)">
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
                      <input type="date" name="fechaFirma" class="form-input" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Fecha Estimada de Término</label>
                      <input type="date" name="fechaFin" class="form-input" required>
                    </div>
                  </div>
                  <div class="modal-actions" style="margin-top:20px; text-align:right;">
                    <button type="button" class="btn btn-secondary" (click)="carpetaSeleccionadaExp.set(null)">Cancelar</button>
                    <button type="submit" class="btn btn-primary" style="margin-left:10px;">📁 Integrar Expediente</button>
                  </div>
                </form>
              } @else {
                <button class="btn btn-secondary btn-sm" style="margin-bottom:16px;" (click)="carpetaSeleccionadaExp.set(null)">
                  ⬅ Volver a las categorías
                </button>
                <h3 style="margin-bottom:16px; color:var(--accent);">Carpeta: {{ carpetaSeleccionadaExp() }}</h3>
                
                <div class="docs-list" style="margin-bottom:24px; max-height:300px; overflow-y:auto;">
                  @for (arch of getArchivosPorCarpeta(carpetaSeleccionadaExp()); track arch.id) {
                    <div class="doc-item entregado" style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                      <div class="doc-icon">{{ arch.tipoArchivo === 'FOTO' ? '🖼️' : '📄' }}</div>
                      <div class="doc-info" style="flex:1;">
                        <span class="doc-name">{{ arch.nombreOriginal }}</span>
                        <span class="doc-status">{{ fmtBytes(arch.tamanioBytes) }}</span>
                      </div>
                      <div style="display:flex; gap:8px; align-items:center;">
                        <button class="btn btn-secondary btn-sm" (click)="descargarArchivoSeguro(arch.archivoUrl, arch.nombreOriginal)">
                          👁️ Ver / Descargar
                        </button>
                        @if (canDeleteFile()) {
                          <button class="btn btn-danger btn-sm" (click)="eliminarArchivo(arch)" title="Eliminar archivo del expediente">
                            🗑️ Eliminar
                          </button>
                        }
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-state" style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:16px;">
                      📁 Ningún archivo subido a la carpeta "{{ carpetaSeleccionadaExp() }}" todavía.
                    </div>
                  }
                </div>

                <div class="drag-drop-zone" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
                  <div class="drop-icon">📤</div>
                  <p>Arrastra tus archivos aquí o <strong>haz clic para seleccionar</strong></p>
                  <input type="file" #expInput multiple style="display:none;" (change)="onFileSelect($event)">
                  <button class="btn btn-secondary btn-sm" style="margin-top:8px;" (click)="expInput.click()">Seleccionar archivos</button>
                </div>
                @if (uploadMsg()) {
                  <p class="upload-feedback" [class.error]="uploadError()" style="margin-top: 10px; text-align: center; font-size: 0.9rem;">
                    {{ uploadMsg() }}
                  </p>
                }
              }
            </div>
          </div>
        </div>
      }

      </div>
      <!-- Modal de Auditoría IA -->
      @if (auditandoId()) {
        <div class="modal-overlay animate-fade-in" style="z-index: 5000;">
          <div class="modal-content animate-slide-in" style="max-width: 400px; text-align: center; padding: 40px;">
            <style>
              @keyframes spin-ai { 100% { transform: rotate(360deg); } }
            </style>
            <div style="font-size: 3rem; margin-bottom: 20px; animation: spin-ai 2s linear infinite;">⚙️</div>
            <h3 style="color: var(--accent); margin-bottom: 10px;">Auditando Avance con IA</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Analizando evidencia y correlacionando datos del avance. Por favor espera...</p>
          </div>
        </div>
      }

      @if (mostrarModalAuditoria() && resultadoAuditoria()) {
        <div class="modal-overlay animate-fade-in" style="z-index: 5000;">
          <div class="modal-content animate-slide-in" style="max-width: 600px;">
            <div class="modal-header">
              <h2 class="modal-title">🤖 Resultado de Auditoría IA</h2>
              <button class="btn-close" (click)="mostrarModalAuditoria.set(false)">✕</button>
            </div>
            <div class="modal-body" style="padding: 24px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; background: var(--bg-dark); padding: 16px; border-radius: 8px;">
                <span style="font-size: 1.1rem; font-weight: bold;">Score de Confianza:</span>
                <span style="font-size: 1.5rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; border: 2px solid" [style.borderColor]="resultadoAuditoria()!.score < 100 ? 'var(--danger)' : 'var(--success)'" [style.color]="resultadoAuditoria()!.score < 100 ? 'var(--danger)' : 'var(--success)'">
                  {{ resultadoAuditoria()!.score }}%
                </span>
              </div>
              
              <h4 style="margin-bottom: 10px; color: var(--text-primary);">Observaciones de la IA:</h4>
              <ul style="padding-left: 20px; margin-bottom: 24px; color: var(--text-secondary); font-size: 0.95rem;">
                @for (obs of resultadoAuditoria()!.observaciones; track $index) {
                  <li style="margin-bottom: 8px;">{{ obs }}</li>
                }
              </ul>

              <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border); padding-top: 16px;">
                <button class="btn btn-secondary" (click)="mostrarModalAuditoria.set(false)">Cerrar</button>
                @if (resultadoAuditoria()!.score < 100 && avanceSeleccionadoParaAuditoria()) {
                  <button class="btn btn-danger" (click)="rechazarAvance(avanceSeleccionadoParaAuditoria()!)">Rechazar Avance</button>
                }
              </div>
            </div>
          </div>
        </div>
      }
    } @else {
      <div class="not-found">
        <span style="font-size:3rem">🔍</span>
        <h2>Obra no encontrada</h2>
        <a href="/dashboard" class="btn btn-primary">Volver al Dashboard</a>
      </div>
    }
  `,
  styles: [`
      .exp-tabs-nav {
        display: flex; gap: 12px; margin-bottom: 24px; border-bottom: 2px solid var(--border); padding-bottom: 16px; overflow-x: auto;
      }
      .tab-pill {
        padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer;
        border: 1px solid transparent; background: transparent; color: var(--text-secondary);
        transition: all 0.2s ease; display: flex; align-items: center; gap: 8px; white-space: nowrap;
      }
      .tab-pill:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
      .tab-pill.active {
        background: var(--bg-surface); border-color: var(--border); color: var(--text-primary);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-2px);
      }
      .tab-pill.active[style*="color:var(--accent)"] { border-color: var(--accent); color: var(--accent) !important; }
      .tab-pill.active[style*="background:var(--danger)"] { background: var(--danger) !important; color: white !important; }

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
  tabActiva = signal<'resumen'|'fotos'|'archivos'|'checklist'|'avances'|'editar'>('resumen');
  faseSubida = signal<string>('GENERAL');
  faseActiva = signal<string>('ANTES');
  areasAbiertas = signal(true);
  archivosAbiertos = signal(true);
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

  private metasService = inject(MetasService);

  // --- State Signals ---
  obra = signal<ObraResponse | null>(null);
  
  // Metas State
  metas = signal<ObraMeta[]>([]);
  metasAbiertas = signal<boolean>(true);
  mostrarModalMeta = signal<boolean>(false);
  mostrarModalAvanceMeta = signal<boolean>(false);
  conceptosSugeridos = signal<ConceptoSugerido[]>([]);
  
  nuevaMeta: Partial<ObraMeta> = { concepto: '', unidadMedida: '', cantidadMeta: 0 };
  metaSeleccionada = signal<ObraMeta | null>(null);
  nuevoAvanceMeta = { cantidad: null as number|null, fecha: new Date().toISOString().split('T')[0], observaciones: '' };

  avances = signal<ObraAvance[]>([]);
  ultimoPorcentaje = signal(0);
  cargando = signal(true);

  // AI Audit State
  auditandoId = signal<number | null>(null);
  mostrarModalAuditoria = signal(false);
  resultadoAuditoria = signal<{score: number, observaciones: string[]} | null>(null);
  avanceSeleccionadoParaAuditoria = signal<number | null>(null);
  http = inject(HttpClient);

  auditarAvanceConIA(avanceId: number) {
    this.auditandoId.set(avanceId);
    this.avanceSeleccionadoParaAuditoria.set(avanceId);
    
    this.http.post<any>(`${environment.apiUrl}/ai/audit/avance/${avanceId}`, {}).subscribe({
      next: (res) => {
        this.auditandoId.set(null);
        this.resultadoAuditoria.set({
          score: res.score,
          observaciones: res.observaciones
        });
        this.mostrarModalAuditoria.set(true);
      },
      error: (err) => {
        this.auditandoId.set(null);
        this.toastSvc.show('Error al auditar el avance con IA', 'error');
      }
    });
  }

  rechazarAvance(avanceId: number) {
    const currentObra = this.obra();
    if (!currentObra) return;
    
    this.http.post(`${environment.apiUrl}/avances/${avanceId}/rechazar`, {}).subscribe({
      next: () => {
        this.toastSvc.show('Avance rechazado y revertido exitosamente', 'success');
        this.mostrarModalAuditoria.set(false);
        this.avanceSeleccionadoParaAuditoria.set(null);
        this.resultadoAuditoria.set(null);
        this.cargarMetas();
        this.avancesSvc.getAvances(currentObra.id).subscribe(list => {
          this.avances.set(list);
        });
        this.avancesSvc.getUltimoPorcentaje(currentObra.id).subscribe(p => this.ultimoPorcentaje.set(p));
      },
      error: () => this.toastSvc.show('Error al rechazar el avance', 'error')
    });
  }

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

  vistaPreviaBlobUrl = signal<string | null>(null);
  vistaPreviaSafeUrl = signal<SafeResourceUrl | null>(null);

  abrirModalGestionDoc(item: ExpedienteObraItem): void {
    this.documentoSeleccionado.set(item);
    this.mostrarModalGestionDoc.set(true);
    this.vistaPreviaBlobUrl.set(null);
    this.vistaPreviaSafeUrl.set(null);
    if (item.archivoUrl) {
      const urlCompleta = this.getFileUrl(item.archivoUrl);
      this.archivosSvc.descargarArchivoUrl(urlCompleta).subscribe({
        next: (blob) => {
          let mimeType = blob.type;
          if (!mimeType || mimeType === 'application/octet-stream') {
            mimeType = item.archivoUrl!.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
          }
          const safeBlob = new Blob([blob], { type: mimeType });
          const blobUrl = window.URL.createObjectURL(safeBlob);
          this.vistaPreviaBlobUrl.set(blobUrl);
          this.vistaPreviaSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl));
        },
        error: () => this.toastSvc.show('Error al cargar la vista previa', 'error')
      });
    }
  }

  cerrarModalGestionDoc(): void {
    const currentUrl = this.vistaPreviaBlobUrl();
    if (currentUrl && currentUrl.startsWith('blob:')) window.URL.revokeObjectURL(currentUrl);
    this.vistaPreviaBlobUrl.set(null);
    this.vistaPreviaSafeUrl.set(null);
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

    if (file.size > 20 * 1024 * 1024) {
      this.toastSvc.show('El archivo es muy pesado. El límite máximo es de 20 MB.', 'warning');
      input.value = '';
      return;
    }

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
  private router = inject(Router);

  getSanitizedUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  urlVisorSafeUrl = signal<SafeResourceUrl | null>(null);
  mostrarModalReportes = signal<boolean>(false);
  fotoVisorActiva = signal<any>(null);

  descargarArchivoSeguro(urlRuta: string, nombreArchivo: string): void {
    if (!urlRuta) return;
    const urlCompleta = this.getFileUrl(urlRuta);
    this.toastSvc.show('Descargando archivo...', 'info');
    this.archivosSvc.descargarArchivoUrl(urlCompleta).subscribe({
      next: (blob) => {
        let mimeType = blob.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
          mimeType = urlRuta.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
        }
        const safeBlob = new Blob([blob], { type: mimeType });
        const url = window.URL.createObjectURL(safeBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo || 'documento';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => this.toastSvc.show('Error al descargar. El token puede haber expirado.', 'error')
    });
  }

  abrirVisorDocumento(archivoUrl: string): void {
    if (!archivoUrl) return;
    const urlCompleta = this.getFileUrl(archivoUrl);
    this.toastSvc.show('Cargando documento...', 'info');
    this.archivosSvc.descargarArchivoUrl(urlCompleta).subscribe({
      next: (blob) => {
        let mimeType = blob.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
          mimeType = archivoUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
        }
        const safeBlob = new Blob([blob], { type: mimeType });
        const objectUrl = window.URL.createObjectURL(safeBlob);
        this.urlVisor.set(objectUrl);
        this.urlVisorSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
        this.mostrarModalVisor.set(true);
      },
      error: () => this.toastSvc.show('Error al cargar el documento para visualizar', 'error')
    });
  }

  cerrarVisorDocumento(): void {
    const currentUrl = this.urlVisor();
    if (currentUrl && currentUrl.startsWith('blob:')) window.URL.revokeObjectURL(currentUrl);
    this.mostrarModalVisor.set(false);
    this.urlVisor.set(null);
    this.urlVisorSafeUrl.set(null);
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


  eliminarFotoVisor() {
    const foto = this.fotoVisorActiva();
    if (!foto) return;
    
    if (confirm('¿Estás seguro de que deseas eliminar esta fotografía de la línea de tiempo? Esta acción no se puede deshacer.')) {
      this.archivosSvc.eliminarArchivo(this.obra()!.id, foto.id).subscribe({
        next: () => {
          this.archivosSubidos.update(list => list.filter(a => a.id !== foto.id));
          this.toastSvc.show('Foto eliminada con éxito', 'info');
          this.fotoVisorActiva.set(null);
        },
        error: (err) => {
          this.toastSvc.show(err.error?.message || 'Error al eliminar la foto.', 'error');
        }
      });
    }
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
          next: (list) => {
             this.avances.set(list);
             if (this.fotosPorFase('DESPUES').length > 0) this.faseActiva.set('DESPUES');
             else if (this.fotosPorFase('DURANTE').length > 0) this.faseActiva.set('DURANTE');
             else if (this.fotosPorFase('ANTES').length > 0) this.faseActiva.set('ANTES');
          },
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
        this.cargarMetas();
      }
    });
  }

  cargarMetas() {
    const id = this.obra()?.id || Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;
    this.metasService.listarMetas(id).subscribe({
      next: (m) => this.metas.set(m),
      error: () => this.toastSvc.show('Error al cargar metas', 'error')
    });
  }

  getMetaColor(porcentaje: number): string {
    if (porcentaje >= 100) return '#10B981';
    if (porcentaje >= 50) return '#F59E0B';
    return '#3B82F6';
  }

  getMetaEstadoClass(estado?: string): string {
    switch(estado) {
      case 'COMPLETADO': return 'badge-success';
      case 'EN_PROCESO': return 'badge-warning';
      default: return 'badge-secondary';
    }
  }

  abrirModalMeta(event: Event) {
    event.stopPropagation();
    const cat = this.obra()?.categoria || '🏗️ Infraestructura General';
    let conceptos = CATEGORIAS_METAS_CATALOG[cat];
    if (!conceptos) conceptos = CATEGORIAS_METAS_CATALOG['🏗️ Infraestructura General'];
    this.conceptosSugeridos.set(conceptos);
    this.nuevaMeta = { concepto: '', unidadMedida: '', cantidadMeta: null as any };
    this.mostrarModalMeta.set(true);
  }

  onConceptoChange() {
    const seleccionado = this.conceptosSugeridos().find(c => c.nombre === this.nuevaMeta.concepto);
    if (seleccionado && seleccionado.unidadSugerida !== 'N/A') {
      this.nuevaMeta.unidadMedida = seleccionado.unidadSugerida;
    }
  }

  guardarMeta() {
    const id = this.obra()?.id;
    if (!id || !this.nuevaMeta.concepto || !this.nuevaMeta.unidadMedida || !this.nuevaMeta.cantidadMeta) return;
    this.metasService.crearMeta(id, this.nuevaMeta).subscribe({
      next: () => {
        this.toastSvc.show('Meta agregada correctamente', 'success');
        this.mostrarModalMeta.set(false);
        this.cargarMetas();
      },
      error: () => this.toastSvc.show('No se pudo guardar la meta', 'error')
    });
  }

  abrirModalAvanceMeta(meta: ObraMeta) {
    this.metaSeleccionada.set(meta);
    this.nuevoAvanceMeta = { cantidad: null, fecha: new Date().toISOString().split('T')[0], observaciones: '' };
    this.mostrarModalAvanceMeta.set(true);
  }

  guardarAvanceMeta() {
    const id = this.obra()?.id;
    const meta = this.metaSeleccionada();
    if (!id || !meta || !this.nuevoAvanceMeta.cantidad) return;
    
    const req = {
      titulo: 'Avance: ' + meta.concepto,
      fechaAvance: this.nuevoAvanceMeta.fecha,
      metaId: meta.id,
      cantidadEjecutada: this.nuevoAvanceMeta.cantidad,
      observaciones: this.nuevoAvanceMeta.observaciones
    };
    
    this.avancesSvc.registrarAvance(id, req).subscribe({
      next: () => {
        this.toastSvc.show('Avance de meta registrado', 'success');
        this.mostrarModalAvanceMeta.set(false);
        this.cargarMetas();
        
        // Recargar el porcentaje global
        this.avancesSvc.getUltimoPorcentaje(id).subscribe(p => this.ultimoPorcentaje.set(p));
      },
      error: (e) => this.toastSvc.show(e.error?.message || 'Error al registrar avance', 'error')
    });
  }

  getItemsPorSeccion(seccion: SeccionExpedienteChecklist): ExpedienteObraItem[] {
    const camposInformativos = ['contratista (razón social)', 'no. de contrato', 'monto del contrato'];
    return this.checklist().filter(i =>
      i.documento.seccion === seccion &&
      !camposInformativos.includes(i.documento.nombre.toLowerCase().trim())
    );
  }

  getPorcentajeCompletadoSeccion(seccion: SeccionExpedienteChecklist): number {
    const items = this.getItemsPorSeccion(seccion);
    if (items.length === 0) return 0;
    const completados = items.filter(i => i.estado === 'OK' || i.estado === 'NO_APLICA').length;
    return Math.round((completados / items.length) * 100);
  }

  cambiarEstadoItem(item: ExpedienteObraItem, estado: EstadoDocumentoChecklist): void {
    const currentObra = this.obra();
    if (!currentObra) return;
    this.expedientesSvc.actualizarEstado(currentObra.id, item.id, estado, item.observaciones).subscribe({
      next: (updated) => {
        this.checklist.update(list => list.map(i => i.id === updated.id ? updated : i));
        this.toastSvc.show(`Estado de "${item.documento.nombre}" actualizado a ${estado}`, 'info');
      },
      error: (err) => this.toastSvc.show('Error al cambiar estado de documento', 'error')
    });
  }

  subirArchivoItem(item: ExpedienteObraItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const currentObra = this.obra();
    if (!file || !currentObra) return;

    if (file.size > 20 * 1024 * 1024) {
      this.toastSvc.show('El archivo es muy pesado. El límite máximo es de 20 MB.', 'warning');
      input.value = '';
      return;
    }

    this.expedientesSvc.subirArchivoDocumento(currentObra.id, item.id, file).subscribe({
      next: (updated) => {
        this.checklist.update(list => list.map(i => i.id === updated.id ? updated : i));
        this.toastSvc.show('Documento subido y registrado correctamente en el expediente', 'success');
      },
      error: (err) => this.toastSvc.show('Error al subir archivo de documento', 'error')
    });
  }


  async generarFichaTecnicaPDF() {
    const currentObra = this.obra();
    if (!currentObra) return;
    
    this.generandoPDF.set(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF('p', 'pt', 'letter');
        
        // Agregar fondo base64 (Logos y borde)
        doc.addImage(fichaTecnicaBgBase64, 'PNG', 0, 0, 612, 792);
        
        // Titulo de la Obra
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const tituloTexto = `ENTREGA DE OBRA ${currentObra.nombre?.toUpperCase() || ''} EN LA LOCALIDAD ${currentObra.direccion?.toUpperCase() || ''}`;
        
        const titleLines = doc.splitTextToSize(tituloTexto, 450);
        let currentY = 140; 
        
        titleLines.forEach((line: string) => {
           const textWidth = doc.getTextWidth(line);
           doc.text(line, (612 - textWidth) / 2, currentY);
           doc.setLineWidth(1);
           doc.line((612 - textWidth) / 2, currentY + 2, (612 + textWidth) / 2, currentY + 2);
           currentY += 20;
        });

        // Calcular dias
        let diasEjecucion = '0';
        if (currentObra.fechaInicio && currentObra.fechaFin) {
            const fIni = new Date(currentObra.fechaInicio);
            const fFin = new Date(currentObra.fechaFin);
            const diffTime = Math.abs(fFin.getTime() - fIni.getTime());
            diasEjecucion = Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString();
        }

        let descripcionMetas = '';
        const metasArray = this.metas();
        if (metasArray && metasArray.length > 0) {
            descripcionMetas = metasArray.map(m => `- ${m.cantidadMeta} ${m.unidadMedida} ${m.concepto}`).join('\n');
        }
        const descObra = (currentObra.descripcion || '').trim();
        const descripcionFicha = [descObra, descripcionMetas].filter(t => t).join('\n\n') || 'Sin descripcion.';

        // Tabla
        // @ts-ignore
        const tableBody: any[] = [
          [{ content: 'LOCALIDAD:', styles: { halign: 'right', fontStyle: 'bold' } }, { content: (currentObra.direccion || '').toUpperCase(), styles: { fontStyle: 'bold' } }],
          [{ content: 'META DEL PROYECTO:', styles: { halign: 'right', fontStyle: 'bold' } }, { content: (currentObra.nombre || '').toUpperCase(), styles: { fontStyle: 'bold' } }],
          [{ content: 'PERIODO DE EJECUCION:', styles: { halign: 'right', fontStyle: 'bold' } }, { content: `${diasEjecucion} DIAS NATURALES`, styles: { fontStyle: 'bold' } }],
          [{ content: 'FUENTE DE FINANCIAMIENTO:', styles: { halign: 'right', fontStyle: 'bold' } }, { content: (currentObra.fuenteFinanciamiento || '').toUpperCase(), styles: { fontStyle: 'bold' } }],
          [{ content: 'BENEFICIARIOS:', styles: { halign: 'right', fontStyle: 'bold' } }, { content: (currentObra.beneficiarios || '').toUpperCase(), styles: { fontStyle: 'bold' } }], 
          [{ content: 'DESCRIPCION:', styles: { halign: 'right', fontStyle: 'bold' } }, { content: descripcionFicha }],
          [{ content: 'IMPACTO SOCIAL:', styles: { halign: 'right', fontStyle: 'bold' } }, { content: (currentObra.impactoSocial || '').toUpperCase() }]
        ];

        // @ts-ignore
        autoTable(doc, {
          startY: currentY + 10,
          body: tableBody,
          theme: 'grid',
          styles: { 
            textColor: [0, 0, 0], 
            lineColor: [0, 0, 0], 
            lineWidth: 0.5, 
            fontSize: 10, 
            cellPadding: 8,
            fillColor: false 
          },
          columnStyles: { 
            0: { cellWidth: 150, halign: 'right', valign: 'middle' }, 
            1: { halign: 'left', valign: 'middle' } 
          },
          margin: { top: 120, bottom: 80, left: 40, right: 40 }
        });
        
        doc.save(`Ficha_Tecnica_${currentObra.id}.pdf`);
        this.toastSvc.show('Ficha Tecnica descargada', 'success');
      } catch (error) {
        console.error('Error al generar PDF', error);
        this.toastSvc.show('Error al generar Ficha', 'error');
      } finally {
        this.generandoPDF.set(false);
        this.mostrarModalReportes.set(false);
      }
    }, 150);
  }

  generarExcelAvances() {
    const currentObra = this.obra();
    if (!currentObra) return;

    try {
      const wb = XLSX.utils.book_new();

      // Helpers
      const fmtFecha = (f: string | undefined) =>
        f ? new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
      const fmtMonto = (m: number | undefined) =>
        m != null ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(m) : '—';

      const metas   = this.metas();
      const avances = this.avances();
      const pct     = currentObra.porcentajeAvance ?? 0;
      const metasOK = metas.filter(m => m.estado === 'COMPLETADO').length;

      // HOJA 1: Informacion General
      const info = [
        ['FICHA TECNICA Y REPORTE DE AVANCES', '', '', ''],
        ['', '', '', ''],
        ['DATOS GENERALES', '', '', ''],
        ['Nombre del Proyecto', currentObra.nombre, '', ''],
        ['Código',             currentObra.codigo ?? '—', '', ''],
        ['Estatus',            currentObra.estatus, '', ''],
        ['Categoria',          (currentObra.categoria ?? '—').replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27FF}]/gu, '').trim(), '', ''],
        ['Descripción',        currentObra.descripcion ?? '—', '', ''],
        ['', '', '', ''],
        ['FECHAS Y PRESUPUESTO', '', '', ''],
        ['Fecha de Inicio',    fmtFecha(currentObra.fechaInicio), 'Fecha de Término', fmtFecha(currentObra.fechaFin)],
        ['Presupuesto',        fmtMonto(currentObra.monto), '', ''],
        ['', '', '', ''],
        ['LOCALIZACIÓN', '', '', ''],
        ['Dirección / Localidad', currentObra.direccion ?? '—', '', ''],
        ['', '', '', ''],
        ['DATOS DE FICHA TÉCNICA', '', '', ''],
        ['Fuente de Financiamiento', currentObra.fuenteFinanciamiento ?? '—', '', ''],
        ['Beneficiarios',      currentObra.beneficiarios ?? '—', '', ''],
        ['Impacto Social',     currentObra.impactoSocial ?? '—', '', ''],
        ['', '', '', ''],
        ['AVANCE GLOBAL', '', '', ''],
        ['Porcentaje de Avance', pct + '%', 'Metas Completadas', metasOK + ' de ' + metas.length],
        ['Total de Avances Reportados', avances.length.toString(), '', ''],
      ];
      const wsInfoNew = XLSX.utils.aoa_to_sheet(info);
      wsInfoNew['!cols'] = [{ wch: 32 }, { wch: 38 }, { wch: 22 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, wsInfoNew, '1. Información General');

      // HOJA 2: Metas
      const metaRows = [['#', 'Concepto', 'Unidad', 'Cantidad Meta', 'Avance Acumulado', '% Avance', 'Estado']];
      metas.forEach((m, i) => {
        metaRows.push([
          (i + 1).toString(), m.concepto, m.unidadMedida,
          (m.cantidadMeta ?? 0).toString(), (m.avanceAcumulado ?? 0).toString(),
          (m.porcentaje ?? 0) + '%', m.estado ?? '—',
        ]);
      });
      if (metas.length === 0) metaRows.push(['Sin metas registradas', '', '', '', '', '', '']);
      const wsMetasNew = XLSX.utils.aoa_to_sheet(metaRows);
      wsMetasNew['!cols'] = [{ wch: 5 }, { wch: 38 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsMetasNew, '2. Metas del Proyecto');

      // HOJA 3: Historial de Avances
      const avRows = [['#', 'Fecha', 'Meta Asociada', 'Título del Avance', 'Cantidad Reportada', 'Acumulado', '% Avance', 'Observaciones']];
      avances.forEach((a, i) => {
        const metaAsoc = metas.find(m => m.id === a.metaId);
        avRows.push([
          (i + 1).toString(), fmtFecha(a.fechaAvance),
          metaAsoc ? metaAsoc.concepto : '—',
          a.titulo,
          (a.cantidadEjecutada ?? '—').toString(),
          (a.acumuladoActual ?? '—').toString(),
          (a.porcentaje ?? 0) + '%',
          a.observaciones ?? '',
        ]);
      });
      if (avances.length === 0) avRows.push(['Sin avances registrados', '', '', '', '', '', '', '']);
      const wsAvNew = XLSX.utils.aoa_to_sheet(avRows);
      wsAvNew['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 42 }];
      XLSX.utils.book_append_sheet(wb, wsAvNew, '3. Historial de Avances');

      // HOJA 4: Resumen por Meta
      const resRows = [['Meta', 'Unidad', 'Cantidad Meta', 'Avance Acumulado', '% Logrado', 'Avances Reportados', 'Estado']];
      metas.forEach(m => {
        const avsMeta = avances.filter(a => a.metaId === m.id);
        resRows.push([
          m.concepto, m.unidadMedida,
          (m.cantidadMeta ?? 0).toString(), (m.avanceAcumulado ?? 0).toString(),
          (m.porcentaje ?? 0) + '%', avsMeta.length.toString(), m.estado ?? '—',
        ]);
      });
      if (metas.length === 0) resRows.push(['Sin metas', '', '', '', '', '', '']);
      const wsResNew = XLSX.utils.aoa_to_sheet(resRows);
      wsResNew['!cols'] = [{ wch: 38 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsResNew, '4. Resumen por Meta');

      XLSX.writeFile(wb, 'Reporte_Avances_' + (currentObra.codigo || currentObra.id) + '.xlsx');
      this.toastSvc.show('Excel generado con éxito', 'success');
      this.mostrarModalReportes.set(false);
    } catch (e) {
      console.error(e);
      this.toastSvc.show('Error al generar el Excel', 'error');
    }
  }

    

  async generarReporteChecklistPDF() {
    const currentObra = this.obra();
    if (!currentObra) return;

    this.generandoPDF.set(true);
    this.toastSvc.show('Generando reporte PDF del Expediente Unitario...', 'info');

    setTimeout(() => {
      try {
        const doc = new jsPDF('p', 'pt', 'letter'); // 612 x 792 pt

        const items = this.checklist();
        const findItem = (keyword: string) =>
          items.find(i => i.documento.nombre.toLowerCase().includes(keyword.toLowerCase()));

        const getStatusMark = (keyword: string): string => {
          const it = findItem(keyword);
          if (!it) return '';
          if (it.estado === 'OK') return 'OK';
          if (it.estado === 'NO_APLICA') return 'N/A';
          if (it.estado === 'CORREGIR') return 'C';
          if (it.estado === 'FALTANTE') return 'X';
          return '';
        };

        const getObs = (keyword: string, fallback = ''): string => {
          const it = findItem(keyword);
          if (it && it.observaciones && it.observaciones.trim()) return it.observaciones.trim();
          return fallback;
        };

        // Helper para dibujar celda con borde y texto
        const drawBox = (
          x: number, y: number, w: number, h: number,
          text = '',
          opts?: {
            bold?: boolean;
            fontSize?: number;
            align?: 'left' | 'center' | 'right';
            fill?: [number, number, number];
            lineWidth?: number;
            paddingX?: number;
          }
        ) => {
          const lw = opts?.lineWidth ?? 0.5;
          doc.setLineWidth(lw);
          doc.setDrawColor(0, 0, 0);
          if (opts?.fill) {
            doc.setFillColor(opts.fill[0], opts.fill[1], opts.fill[2]);
            doc.rect(x, y, w, h, 'FD');
          } else {
            doc.rect(x, y, w, h, 'S');
          }
          if (text) {
            const fs = opts?.fontSize ?? 5.5;
            doc.setFontSize(fs);
            doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
            doc.setTextColor(0, 0, 0);
            const padX = opts?.paddingX ?? 3;
            const maxW = w - padX * 2;
            const lines: string[] = doc.splitTextToSize(text, maxW);
            const lineH = fs * 1.15;
            const totalTextH = lines.length * lineH;
            let ty = y + (h - totalTextH) / 2 + fs * 0.82;
            lines.forEach((ln: string) => {
              let tx = x + padX;
              if (opts?.align === 'center') tx = x + w / 2;
              else if (opts?.align === 'right') tx = x + w - padX;
              doc.text(ln, tx, ty, { align: opts?.align || 'left' });
              ty += lineH;
            });
          }
        };

        // ==================== ENCABEZADO ====================
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text('INTEGRACIÓN DE EXPEDIENTE UNITARIO DE OBRA PÚBLICA EJERCICIO 2026', 306, 26, { align: 'center' });

        // Nombre de la obra
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text('NOMBRE DE LA', 20, 38);
        doc.text('OBRA:', 20, 45);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text((currentObra.nombre || '').toUpperCase(), 72, 42, { maxWidth: 520 });
        doc.setLineWidth(0.7);
        doc.line(70, 45, 592, 45);

        // Localidad y No. de Ofic. de Aprob.
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text('LOCALIDAD:', 20, 56);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text((currentObra.direccion || 'HEROICA CIUDAD DE TLAXIACO').toUpperCase(), 72, 55);
        doc.line(70, 57, 290, 57);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text('No. DE OFIC. DE APROB.:', 310, 56);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        const oficAprob = getObs('Oficio de Notificación de Aprobación', currentObra.codigo || '');
        doc.text(oficAprob.toUpperCase(), 390, 55);
        doc.line(385, 57, 592, 57);

        // ==================== COLUMNA IZQUIERDA ====================
        const leftX = 20;
        const leftW = 280;
        const leftStatusW = 36;
        const leftLabelW = leftW - leftStatusW;
        let ly = 64;

        // --- SECCIÓN I: PARTE SOCIAL ---
        drawBox(leftX, ly, leftW, 13, 'PARTE SOCIAL', {
          bold: true, fontSize: 6.5, align: 'center', fill: [217, 217, 217], lineWidth: 1
        });
        ly += 13;

        const parteSocialRows: { label: string; key: string }[] = [
          { label: 'ACTA DE INTEGRACIÓN DEL CONSEJO DE DESARROLLO SOCIAL MUNICIPAL', key: 'Consejo de Desarrollo Social' },
          { label: 'ACTA DE SELECCIÓN DE OBRA', key: 'Selección de Obra' },
          { label: 'ACTA DE PRIORIZACIÓN DE OBRAS', key: 'Priorización de Obras' },
          { label: 'ACTA DE INTEGRACIÓN DEL COMITÉ DE OBRAS', key: 'Integración del Comité' },
          { label: 'CONVENIO CELEBRADO CON EL COMITÉ DE OBRAS', key: 'Convenio Celebrado' },
          { label: 'ACTA DE CABILDO DE APROBACIÓN DE LA OBRA', key: 'Acta de Cabildo' },
          { label: 'PROGRAMA ANUAL DE OBRAS (PAO)', key: 'Programa Anual de Obras' },
          { label: 'ACTA DE EXCEPCIÓN A LA LICITACIÓN PÚBLICA', key: 'Excepción a la Licitación' },
          { label: 'COMITÉ DE PARTICIPACION SOCIAL', key: 'Participación Social' }
        ];

        const psStart = ly;
        parteSocialRows.forEach(r => {
          const rh = 13;
          drawBox(leftX, ly, leftLabelW, rh, r.label, { fontSize: 5.5 });
          drawBox(leftX + leftLabelW, ly, leftStatusW, rh, getStatusMark(r.key), { bold: true, fontSize: 6.5, align: 'center' });
          ly += rh;
        });
        doc.setLineWidth(1);
        doc.rect(leftX, psStart - 13, leftW, ly - (psStart - 13), 'S');

        ly += 10;

        // --- SECCIÓN II: PARTE TÉCNICA O PROYECTO EJECUTIVO ---
        const ptStart = ly;
        drawBox(leftX, ly, leftW, 13, 'PARTE TECNICA O PROYECTO EJECUTIVO', {
          bold: true, fontSize: 6.5, align: 'center', fill: [217, 217, 217], lineWidth: 1
        });
        ly += 13;

        const parteTecnicaRows: { label: string; key: string; h?: number }[] = [
          { label: 'ESTUDIO DE FACTIBILIDAD TÉCNICA, ECONÓMICA Y ECOLÓGICA DE LA REALIZACIÓN DE LA OBRA', key: 'Estudio de Factibilidad', h: 19 },
          { label: 'OFICIO DE NOTIFICACIÓN DE APROBACIÓN DE RECURSOS', key: 'Notificación de Aprobación' },
          { label: 'ANEXO DEL OFICIO DE NOTIFICACIÓN', key: 'Anexo del Oficio' },
          { label: 'CEDULA DE INFORMACIÓN BASICA', key: 'Cédula de Información' },
          { label: 'GENERALIDADES DE LA INVERSIÓN', key: 'Generalidades de la Inversión' },
          { label: 'ACTA DE ACEPTACIÓN DE BENEFICIARIOS', key: 'Aceptación de Beneficiarios' },
          { label: 'PRESUPUESTO DE CONCEPTOS DE LA OBRA', key: 'Presupuesto de Conceptos' },
          { label: 'GENERADORES DE OBRA PROGRAMADA', key: 'Generadores de Obra' },
          { label: 'CALENDARIO DE EJECUCIÓN', key: 'Calendario de Ejecución' },
          { label: 'CROQUIS DE MACRO Y MICRO LOCALIZACIÓN', key: 'Croquis de Macro' },
          { label: 'DOC. DEL DIRECTOR RESPONSABLE DE OBRA PÚBLICA', key: 'Director Responsable' },
          { label: 'DOC. DE ACREDITACIÓN DE LA TENENCIA DE LA TIERRA', key: 'Tenencia de la Tierra' },
          { label: 'PERMISOS, LICENCIAS, DICTAMENES, USO DE SUELO, ETC.', key: 'Permisos, Licencias' },
          { label: 'RESOLUTIVO EN MATERIA DE IMPACTO AMBIENTAL (ART.5 FRAC.XI Y 16,17 Y 18 DE LA L.E.E.P.A.)', key: 'Impacto Ambiental', h: 19 },
          { label: 'MEMORIA DE CALCULO', key: 'Memoria de Cálculo' },
          { label: 'MEMORIA DESCRIPTIVA', key: 'Memoria Descriptiva' },
          { label: 'VALIDACIÓN DE OBRA POR LA DEPENDENCIA NORMATIVA UNICAMENTE PARA OBRAS DE ELECTRIFICACIÓN', key: 'Validación de Obra', h: 19 },
          { label: 'ESTUDIOS DE INGENIERÍA', key: 'Estudios de Ingeniería' },
          { label: 'PLANOS DEL PROYECTO IMPRESOS', key: 'Planos del Proyecto' },
          { label: 'ESPECIFICACIONES GENERALES Y PARTICULARES', key: 'Especificaciones Generales' },
          { label: 'OTROS (ESPECIFICAR)', key: 'Otros (Especificar)' }
        ];

        parteTecnicaRows.forEach(r => {
          const rh = r.h ?? 13.5;
          drawBox(leftX, ly, leftLabelW, rh, r.label, { fontSize: 5.5 });
          drawBox(leftX + leftLabelW, ly, leftStatusW, rh, getStatusMark(r.key), { bold: true, fontSize: 6.5, align: 'center' });
          ly += rh;
        });
        doc.setLineWidth(1);
        doc.rect(leftX, ptStart, leftW, ly - ptStart, 'S');

        // --- TABLA DE LEYENDA / SIMBOLOGÍA (abajo a la izquierda) ---
        let legY = 678;
        const legX = 20;
        const legCol1 = 30;
        const legCol2 = 135;
        const legRows = [
          ['OK', 'Doc. Completo'],
          ['X', 'Doc. Faltante o no Integrado'],
          ['C', 'Doc. A Corregir o Complementar'],
          ['N/A', 'Doc. No Aplicable']
        ];
        const legStart = legY;
        legRows.forEach(lr => {
          drawBox(legX, legY, legCol1, 13, lr[0], { bold: true, fontSize: 6, align: 'center' });
          drawBox(legX + legCol1, legY, legCol2, 13, lr[1], { bold: true, fontSize: 6, align: 'center' });
          legY += 13;
        });
        doc.setLineWidth(0.8);
        doc.rect(legX, legStart, legCol1 + legCol2, legY - legStart, 'S');

        // ==================== COLUMNA DERECHA ====================
        const rightX = 312;
        const rightW = 280;
        const rightStatusW = 54;
        const rightLabelW = rightW - rightStatusW;
        let ry = 64;

        // --- SECCIÓN III: PROCESOS DE CONTRATACIÓN ---
        const pcStart = ry;
        drawBox(rightX, ry, rightW, 13, 'PROCESOS DE CONTRATACIÓN', {
          bold: true, fontSize: 6.5, align: 'center', fill: [217, 217, 217], lineWidth: 1
        });
        ry += 13;

        // 1. Padrón de contratistas
        drawBox(rightX, ry, rightLabelW, 13, 'PADRON DE CONTRATISTAS DE LA OBRA', { fontSize: 5.5 });
        drawBox(rightX + rightLabelW, ry, rightStatusW, 13, getStatusMark('Padrón de Contratistas'), { bold: true, fontSize: 6.5, align: 'center' });
        ry += 13;

        // 2. Oficios de invitación y aceptación de concurso (con 2 sub-columnas)
        const invW1 = 172;
        const invSubW = (rightW - invW1) / 2; // 54 cada una
        const mInv = getStatusMark('Oficios de Invitación');
        drawBox(rightX, ry, invW1, 22, 'OFICIOS DE INVITACIÓN Y ACEPTACIÓN DE CONCURSO', { fontSize: 5.5 });
        drawBox(rightX + invW1, ry, invSubW, 11, 'DEL MUN A LOS CONTRATISTAS', { fontSize: 4.2, align: 'center' });
        drawBox(rightX + invW1 + invSubW, ry, invSubW, 11, 'ACEPTACION CONTRATISTAS', { fontSize: 4.2, align: 'center' });
        drawBox(rightX + invW1, ry + 11, invSubW, 11, mInv, { bold: true, fontSize: 6, align: 'center' });
        drawBox(rightX + invW1 + invSubW, ry + 11, invSubW, 11, mInv, { bold: true, fontSize: 6, align: 'center' });
        ry += 22;

        // 3. Bases a Oficio de Notificación de Fallo
        const pcMidRows: { label: string; key: string; h?: number }[] = [
          { label: 'BASES (ADJUDICACION DIRECTA / INVITACIÓN RESTRINGIDA A CUANDO MENOS TRES CONTRATISTAS)', key: 'Bases (Adjudicación', h: 18 },
          { label: 'ACTA DE VISITA AL SITIO DE LA OBRA', key: 'Visita al Sitio' },
          { label: 'ACTA DE JUNTA DE ACLARACIONES', key: 'Junta de Aclaraciones' },
          { label: 'PRESENTACIÓN Y APERTURA DE PROPOSICIONES', key: 'Presentación y Apertura' },
          { label: 'DICTAMEN DE EVALUACIÓN', key: 'Dictamen de Evaluación' },
          { label: 'ACTA DE FALLO', key: 'Acta de Fallo' },
          { label: 'OFICIO DE NOTIFICACIÓN DE FALLO MUNICIPIO-EMPRESA', key: 'Notificación de Fallo' }
        ];
        pcMidRows.forEach(r => {
          const rh = r.h ?? 13;
          drawBox(rightX, ry, rightLabelW, rh, r.label, { fontSize: 5.5 });
          drawBox(rightX + rightLabelW, ry, rightStatusW, rh, getStatusMark(r.key), { bold: true, fontSize: 6.5, align: 'center' });
          ry += rh;
        });

        // 4. Propuesta (Técnica / Económica)
        const propLabelW = 160;
        const propSubW = (rightW - propLabelW) / 2; // 60 cada una
        const mProp = getStatusMark('Propuesta');
        drawBox(rightX, ry, propLabelW, 20, 'PROPUESTA', { fontSize: 5.5 });
        drawBox(rightX + propLabelW, ry, propSubW, 9, 'TÉCNICA', { fontSize: 4.8, align: 'center' });
        drawBox(rightX + propLabelW + propSubW, ry, propSubW, 9, 'ECONÓMICA', { fontSize: 4.8, align: 'center' });
        drawBox(rightX + propLabelW, ry + 9, propSubW, 11, mProp, { bold: true, fontSize: 6, align: 'center' });
        drawBox(rightX + propLabelW + propSubW, ry + 9, propSubW, 11, mProp, { bold: true, fontSize: 6, align: 'center' });
        ry += 20;

        // 5. Contrato (Precios U.V. / Precios Alz.)
        const mCont = getStatusMark('Contrato');
        drawBox(rightX, ry, propLabelW, 20, 'CONTRATO', { fontSize: 5.5 });
        drawBox(rightX + propLabelW, ry, propSubW, 9, 'PRECIOS U.V.', { fontSize: 4.8, align: 'center' });
        drawBox(rightX + propLabelW + propSubW, ry, propSubW, 9, 'PRECIOS ALZ.', { fontSize: 4.8, align: 'center' });
        drawBox(rightX + propLabelW, ry + 9, propSubW, 11, mCont, { bold: true, fontSize: 6, align: 'center' });
        drawBox(rightX + propLabelW + propSubW, ry + 9, propSubW, 11, mCont, { bold: true, fontSize: 6, align: 'center' });
        ry += 20;

        // 6. Contratista, No. de Contrato, Monto del Contrato
        const infoLabelW = 92;
        const infoValW = rightW - infoLabelW;
        const contratistaTxt = (currentObra.contratista || getObs('Contratista', '')).trim();
        drawBox(rightX, ry, infoLabelW, 18, 'CONTRATISTA:', { fontSize: 5.5 });
        drawBox(rightX + infoLabelW, ry, infoValW, 18, contratistaTxt.toUpperCase(), { bold: true, fontSize: 5.5, align: 'center' });
        ry += 18;

        const noContratoTxt = getObs('No. de Contrato', currentObra.codigo || '');
        drawBox(rightX, ry, infoLabelW, 16, 'No. DE CONTRATO:', { fontSize: 5.5 });
        drawBox(rightX + infoLabelW, ry, infoValW, 16, noContratoTxt.toUpperCase(), { bold: true, fontSize: 6, align: 'center' });
        ry += 16;

        const montoFormatted = currentObra.monto != null
          ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(currentObra.monto)
          : '';
        drawBox(rightX, ry, infoLabelW, 14, 'MONTO DEL CONTRATO:', { fontSize: 5.5 });
        drawBox(rightX + infoLabelW, ry, infoValW, 14, montoFormatted, { bold: true, fontSize: 6.5, align: 'center' });
        ry += 14;

        // 7. Convenios Modificatorios (En Tiempo / En Monto / En T. y Monto)
        const convLabelW = 112;
        const convSubW = (rightW - convLabelW) / 3; // 56 cada una
        const mConv = getStatusMark('Convenios Modificatorios');
        drawBox(rightX, ry, convLabelW, 20, 'CONVENIOS MODIFICATORIOS', { fontSize: 5.3 });
        drawBox(rightX + convLabelW, ry, convSubW, 9, 'EN TIEMPO', { fontSize: 4.5, align: 'center' });
        drawBox(rightX + convLabelW + convSubW, ry, convSubW, 9, 'EN MONTO', { fontSize: 4.5, align: 'center' });
        drawBox(rightX + convLabelW + convSubW * 2, ry, convSubW, 9, 'EN T. Y MONTO', { fontSize: 4.5, align: 'center' });
        drawBox(rightX + convLabelW, ry + 9, convSubW, 11, mConv, { bold: true, fontSize: 6, align: 'center' });
        drawBox(rightX + convLabelW + convSubW, ry + 9, convSubW, 11, mConv, { bold: true, fontSize: 6, align: 'center' });
        drawBox(rightX + convLabelW + convSubW * 2, ry + 9, convSubW, 11, mConv, { bold: true, fontSize: 6, align: 'center' });
        ry += 20;

        // 8. Anexos del Contrato (cuadrícula 2x2)
        const anexLabelW = 160;
        const anexSubW = (rightW - anexLabelW) / 2; // 60 cada una
        const mAnex = getStatusMark('Anexos del Contrato');
        drawBox(rightX, ry, anexLabelW, 38, 'ANEXOS DEL CONTRATO', { fontSize: 5.5 });
        drawBox(rightX + anexLabelW, ry, anexSubW, 9, 'CATALOGO DE CONCEPTOS', { fontSize: 4.2, align: 'center' });
        drawBox(rightX + anexLabelW + anexSubW, ry, anexSubW, 9, 'ANALISIS P.U.', { fontSize: 4.2, align: 'center' });
        drawBox(rightX + anexLabelW, ry + 9, anexSubW, 10, mAnex, { bold: true, fontSize: 6, align: 'center' });
        drawBox(rightX + anexLabelW + anexSubW, ry + 9, anexSubW, 10, mAnex, { bold: true, fontSize: 6, align: 'center' });
        drawBox(rightX + anexLabelW, ry + 19, anexSubW, 9, 'CALEND. EJEC. TRABAJOS', { fontSize: 4.2, align: 'center' });
        drawBox(rightX + anexLabelW + anexSubW, ry + 19, anexSubW, 9, 'OTROS', { fontSize: 4.2, align: 'center' });
        drawBox(rightX + anexLabelW, ry + 28, anexSubW, 10, mAnex, { bold: true, fontSize: 6, align: 'center' });
        drawBox(rightX + anexLabelW + anexSubW, ry + 28, anexSubW, 10, mAnex, { bold: true, fontSize: 6, align: 'center' });
        ry += 38;

        doc.setLineWidth(1);
        doc.rect(rightX, pcStart, rightW, ry - pcStart, 'S');

        ry += 8;

        // --- SECCIÓN IV: DOCUMENTOS COMPROBATORIOS ---
        const dcStart = ry;
        drawBox(rightX, ry, rightW, 13, 'DOCUMENTOS COMPROBATORIOS', {
          bold: true, fontSize: 6.5, align: 'center', fill: [217, 217, 217], lineWidth: 1
        });
        ry += 13;

        // 1. Oficios de Inicio de Obra (4 sub-columnas)
        const ofLabelW = 64;
        const ofSubW = (rightW - ofLabelW) / 4; // 54 cada una
        const mOfIni = getStatusMark('Oficios de Inicio de Obra');
        drawBox(rightX, ry, ofLabelW, 24, 'OFICIOS DE INICIO DE OBRA', { fontSize: 5.2 });
        const ofHeaders = ['ASIGNACIÓN DE RESIDENTE', 'ASIGNACIÓN DE SUPERINTENDENTE', 'DISPOSICIÓN DEL INMUEBLE', 'INICIO DE LOS TRABAJOS'];
        ofHeaders.forEach((h, idx) => {
          drawBox(rightX + ofLabelW + ofSubW * idx, ry, ofSubW, 12, h, { fontSize: 4, align: 'center' });
          drawBox(rightX + ofLabelW + ofSubW * idx, ry + 12, ofSubW, 12, mOfIni, { bold: true, fontSize: 6, align: 'center' });
        });
        ry += 24;

        // 2. Factura Global (3 sub-columnas)
        const facLabelW = 118;
        const facSubW = (rightW - facLabelW) / 3; // 54 cada una
        const mFacGlob = getStatusMark('Factura Global');
        drawBox(rightX, ry, facLabelW, 20, 'FACTURA GLOBAL', { fontSize: 5.5 });
        ['VERIFICACIÓN', '.XML', 'SPEI'].forEach((h, idx) => {
          drawBox(rightX + facLabelW + facSubW * idx, ry, facSubW, 9, h, { fontSize: 4.5, align: 'center' });
          drawBox(rightX + facLabelW + facSubW * idx, ry + 9, facSubW, 11, mFacGlob, { bold: true, fontSize: 6, align: 'center' });
        });
        ry += 20;

        // 3. Factura del Anticipo (3 sub-columnas)
        const mFacAnt = getStatusMark('Factura del Anticipo');
        drawBox(rightX, ry, facLabelW, 20, 'FACTURA DEL ANTICIPO', { fontSize: 5.5 });
        ['VERIFICACIÓN', '.XML', 'SPEI'].forEach((h, idx) => {
          drawBox(rightX + facLabelW + facSubW * idx, ry, facSubW, 9, h, { fontSize: 4.5, align: 'center' });
          drawBox(rightX + facLabelW + facSubW * idx, ry + 9, facSubW, 11, mFacAnt, { bold: true, fontSize: 6, align: 'center' });
        });
        ry += 20;

        // 4. Pruebas de Control y Calidad
        drawBox(rightX, ry, rightLabelW, 14, 'PRUEBAS DE CONTROL Y CALIDAD POR ESTIMACIÓN SI LA OBRA LO REQUIERE', { fontSize: 5 });
        drawBox(rightX + rightLabelW, ry, rightStatusW, 14, getStatusMark('Pruebas de Control'), { bold: true, fontSize: 6.5, align: 'center' });
        ry += 14;

        // 5. Estimaciones de Obra (4x2 sub-columnas)
        const estLabelW = 64;
        const estSubW = (rightW - estLabelW) / 4; // 54 cada una
        const mEst = getStatusMark('Estimaciones de Obra');
        drawBox(rightX, ry, estLabelW, 44, 'ESTIMACIONES DE OBRA', { fontSize: 5.5 });
        const estRow1 = ['CARATULA', 'FACTURA, VERIFICACIÓN, XML', 'ESTADO DE CUENTA', 'CUERPO EST.'];
        const estRow2 = ['NUM. GENERADORES', 'CROQUIS DE LOC.', 'SOPORTE FOTOGRAFICO', 'NOTAS DE BITÁCORA'];
        estRow1.forEach((h, idx) => {
          drawBox(rightX + estLabelW + estSubW * idx, ry, estSubW, 11, h, { fontSize: 4, align: 'center' });
          drawBox(rightX + estLabelW + estSubW * idx, ry + 11, estSubW, 11, mEst, { bold: true, fontSize: 6, align: 'center' });
        });
        estRow2.forEach((h, idx) => {
          drawBox(rightX + estLabelW + estSubW * idx, ry + 22, estSubW, 11, h, { fontSize: 4, align: 'center' });
          drawBox(rightX + estLabelW + estSubW * idx, ry + 33, estSubW, 11, mEst, { bold: true, fontSize: 6, align: 'center' });
        });
        ry += 44;

        // 6. Otros (Autorización de P.U. extraordinarios...)
        drawBox(rightX, ry, rightLabelW, 20, 'OTROS (AUTORIZACIÓN DE P.U. EXTRAORDINARIOS, SUSPENSIÓN TEMPORAL, ACTAS CIRCUNSTANCIADAS, MINUTAS, SOLICITUDES, AJUSTES DE COSTO, ETC.', { fontSize: 4.8 });
        drawBox(rightX + rightLabelW, ry, rightStatusW, 20, getStatusMark('Autorización P.U.'), { bold: true, fontSize: 6.5, align: 'center' });
        ry += 20;

        // 7. Garantías (Anticipo / Cumplimiento / Vicios Ocultos)
        const mGar = getStatusMark('Garantías');
        drawBox(rightX, ry, facLabelW, 20, 'GARANTÍAS', { fontSize: 5.5 });
        ['ANTICIPO', 'CUMPLIMIENTO', 'VICIOS OCULTOS'].forEach((h, idx) => {
          drawBox(rightX + facLabelW + facSubW * idx, ry, facSubW, 9, h, { fontSize: 4.3, align: 'center' });
          drawBox(rightX + facLabelW + facSubW * idx, ry + 9, facSubW, 11, mGar, { bold: true, fontSize: 6, align: 'center' });
        });
        ry += 20;

        // 8. Finiquito, Aviso de Terminación, Libranza CFE
        drawBox(rightX, ry, rightLabelW, 13, 'FINIQUITO DE OBRA', { fontSize: 5.5 });
        drawBox(rightX + rightLabelW, ry, rightStatusW, 13, getStatusMark('Finiquito de Obra'), { bold: true, fontSize: 6.5, align: 'center' });
        ry += 13;

        drawBox(rightX, ry, rightLabelW, 13, 'AVISO DE TERMINACIÓN DE LA OBRA', { fontSize: 5.5 });
        drawBox(rightX + rightLabelW, ry, rightStatusW, 13, getStatusMark('Aviso de Terminación'), { bold: true, fontSize: 6.5, align: 'center' });
        ry += 13;

        drawBox(rightX, ry, rightLabelW, 13, 'LIBRANZA POR PARTE DE CFE PARA EL CASO DE LAS OBRAS DE ELECTRIFICACIÓN', { fontSize: 4.6 });
        drawBox(rightX + rightLabelW, ry, rightStatusW, 13, getStatusMark('Libranza por Parte de CFE'), { bold: true, fontSize: 6.5, align: 'center' });
        ry += 13;

        // 9. Actas de Entrega Recepción (Contratista-Municipio / Municipio-Comité / CFE)
        const mActEnt = getStatusMark('Actas de Entrega Recepción');
        drawBox(rightX, ry, facLabelW, 22, 'ACTAS DE ENTREGA RECEPCIÓN', { fontSize: 5.5 });
        ['CONTRATISTA-MUNICIPIO', 'MUNICIPIO-COMITÉ', 'CFE'].forEach((h, idx) => {
          drawBox(rightX + facLabelW + facSubW * idx, ry, facSubW, 11, h, { fontSize: 4.3, align: 'center', bold: true });
          drawBox(rightX + facLabelW + facSubW * idx, ry + 11, facSubW, 11, mActEnt, { bold: true, fontSize: 6, align: 'center' });
        });
        ry += 22;

        doc.setLineWidth(1);
        doc.rect(rightX, dcStart, rightW, ry - dcStart, 'S');

        doc.save(`Integracion_Expediente_Unitario_${currentObra.codigo || currentObra.id}.pdf`);
        this.toastSvc.show('Reporte de Expediente Unitario descargado con éxito', 'success');
      } catch (error) {
        console.error('Error al generar PDF', error);
        this.toastSvc.show('Error al generar el reporte PDF', 'error');
      } finally {
        this.generandoPDF.set(false);
        this.mostrarModalReportes.set(false);
      }
    }, 150);
  }

  getArchivosPorCarpeta(carpetaUI: string | null) {
    if (!carpetaUI) return [];
    
    const mapaCarpetas: Record<string, string> = {
      'Legal': 'LEGAL',
      'Social': 'SOCIAL',
      'Técnicos': 'TECNICOS',
      'Anexo Fotográfico': 'FOTOGRAFICO'
    };
    const backendCarpeta = mapaCarpetas[carpetaUI];
    
    return this.archivosSubidos().filter(a => a.carpeta === backendCarpeta);
  }

  crearNuevoExpediente(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const fechaFirma = formData.get('fechaFirma') as string;
    const fechaFin = formData.get('fechaFin') as string;

    if (fechaFirma && fechaFin) {
      if (new Date(fechaFin) < new Date(fechaFirma)) {
        this.toastSvc.show('La fecha de término no puede ser anterior a la fecha de firma.', 'error');
        return;
      }
    }

    this.toastSvc.show('Nuevo expediente integrado exitosamente', 'success');
    this.mostrarModalIntegracionExp.set(false);
    this.carpetaSeleccionadaExp.set(null);
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

    if (porcentaje < this.ultimoPorcentaje()) {
      this.toastSvc.show(`El avance físico (${porcentaje}%) no puede ser menor al avance actual (${this.ultimoPorcentaje()}%).`, 'error');
      return;
    }

    const file = this.fotoEdicionFile();
    if (porcentaje === 100 && !file && this.ultimoPorcentaje() !== 100) {
      this.toastSvc.show('Para reportar el 100% de avance es OBLIGATORIO adjuntar una evidencia fotográfica terminada.', 'error');
      return;
    }

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
        
        // Registrar avance si el porcentaje cambió o si hay foto
        if ((porcentaje > 0 && porcentaje !== this.ultimoPorcentaje()) || file) {
          this.avancesSvc.registrarAvance(current.id, {
            titulo: `Actualización a ${porcentaje}%`,
            fechaAvance: new Date().toISOString().slice(0, 10),
            porcentaje,
            observaciones: descripcion
          }).subscribe({
            next: (avance) => {
              this.ultimoPorcentaje.set(porcentaje);
              if (file) {
                const fase = porcentaje === 100 ? 'DESPUES' : 'DURANTE';
                this.avancesSvc.subirEvidencia(current.id, avance.id, file, fase as any, descripcion).subscribe({
                  next: () => {
                    this.avancesSvc.getAvances(current.id).subscribe(list => {
                       this.avances.set(list);
                       this.faseActiva.set(fase);
                    });
                    this.toastSvc.show('Avance y fotografía guardados con éxito', 'success');
                  },
                  error: () => this.toastSvc.show('Error al subir la fotografía del avance', 'error')
                });
              } else {
                this.avancesSvc.getAvances(current.id).subscribe(list => this.avances.set(list));
              }
            },
            error: () => {}
          });
        }
        
        if (!file) this.toastSvc.show('Cambios guardados correctamente', 'success');
        this.quitarFotoEdicion();
        this.mostrarModalEdicion.set(false);
      },
      error: (err) => {
        console.error('Error actualizando obra:', err);
        this.toastSvc.show('Error al actualizar la obra.', 'error');
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
      this.toastSvc.show('La imagen no puede superar 10 MB', 'warning');
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

  calcularPorcentajeAuto(): void {
    const items = this.checklist();
    if (items.length === 0) return;
    const completados = items.filter(i => i.estado === 'OK' || i.estado === 'NO_APLICA').length;
    const porcentaje = Math.round((completados / items.length) * 100);
    const form = document.querySelector('form') as HTMLFormElement;
    if (form) {
      const input = form.querySelector('input[name="porcentaje"]') as HTMLInputElement;
      if (input) input.value = porcentaje.toString();
    }
    this.toastSvc.show(`Calculado: ${porcentaje}% basado en los documentos del expediente.`, 'info');
  }

  getFileUrl(url: string): string {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    
    let cleanPath = url;
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }
    if (!cleanPath.startsWith('/uploads/')) {
      cleanPath = '/uploads' + cleanPath;
    }
    
    return 'http://localhost:8081' + cleanPath;
  }

  canDeleteFile(): boolean {
    const currentObra = this.obra();
    if (!currentObra) return false;
    return this.auth.hasRole('admin');
  }

  eliminarArchivo(arch: ObraArchivo): void {
    const currentObra = this.obra();
    if (!currentObra) return;

    if (confirm(`¿Estás seguro de que deseas eliminar el archivo "${arch.nombreOriginal}"?`)) {
      this.archivosSvc.eliminarArchivo(currentObra.id, arch.id).subscribe({
        next: () => {
          this.archivosSubidos.update(list => list.filter(a => a.id !== arch.id));
          this.toastSvc.show(`Archivo "${arch.nombreOriginal}" eliminado con éxito`, 'info');
          this.uploadMsg.set(`🗑️ Archivo "${arch.nombreOriginal}" eliminado.`);
          this.uploadError.set(false);
        },
        error: (err) => {
          this.toastSvc.show(err.error?.message || 'Error al eliminar el archivo.', 'error');
        }
      });
    }
  }

  fotosPorFase(fase: string) {
    return this.avances()
      .flatMap(a => a.evidencias)
      .filter(e => e.fase === fase.toUpperCase() && e.tipo === 'FOTO');
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

    const faseDestino = this.faseSubida();
    let uploadedCount = 0;

    Array.from(files).forEach(file => {
      if (faseDestino === 'GENERAL') {
        let carpetaBackend = 'TECNICOS';
        if (this.carpetaSeleccionadaExp()) {
          const mapaCarpetas = {
            'Legal': 'LEGAL',
            'Social': 'SOCIAL',
            'Técnicos': 'TECNICOS',
            'Fotográfico': 'FOTOGRAFICO'
          };
          carpetaBackend = (mapaCarpetas as any)[this.carpetaSeleccionadaExp()!] || 'TECNICOS';
        }
        if (file.type.startsWith('image/')) carpetaBackend = 'FOTOGRAFICO';

        this.archivosSvc.subirArchivo(currentObra.id, carpetaBackend as any, file).subscribe({
          next: (nuevoArchivo) => {
            uploadedCount++;
            this.archivosSubidos.update(prev => [nuevoArchivo, ...prev]);
            if (uploadedCount === files.length) {
              this.uploadMsg.set('✅ Todos los archivos subidos exitosamente.');
              setTimeout(() => this.uploadMsg.set(''), 3000);
            }
          },
          error: (err) => {
            this.uploadError.set(true);
            this.uploadMsg.set(err.error?.message || '❌ Ocurrió un error al subir un archivo.');
          }
        });
      } else {
        this.avancesSvc.registrarAvance(currentObra.id, {
          titulo: `Evidencia Fotográfica (${faseDestino})`,
          fechaAvance: new Date().toISOString().slice(0, 10),
          porcentaje: this.ultimoPorcentaje(),
          observaciones: 'Subido desde el panel general de archivos'
        }).subscribe({
          next: (avance) => {
            this.avancesSvc.subirEvidencia(currentObra.id, avance.id, file, faseDestino as any, '').subscribe({
              next: () => {
                uploadedCount++;
                if (uploadedCount === files.length) {
                  this.uploadMsg.set('✅ Evidencias fotográficas subidas correctamente.');
                  setTimeout(() => this.uploadMsg.set(''), 3000);
                  this.avancesSvc.getAvances(currentObra.id).subscribe(list => {
                    this.avances.set(list);
                  });
                }
              },
              error: () => {
                this.uploadError.set(true);
                this.uploadMsg.set('❌ Error al subir el archivo de evidencia.');
              }
            });
          },
          error: () => {
            this.uploadError.set(true);
            this.uploadMsg.set('❌ Error al crear el registro para la evidencia.');
          }
        });
      }
    });
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (dt?.files) this.onFileSelect({ target: { files: dt.files } } as any);
  }

  reportarAvanceMeta(meta: any, cantidad: string, fecha: string) {
    const val = parseFloat(cantidad);
    if (isNaN(val) || val <= 0) { this.toastSvc.show('Cantidad inválida', 'warning'); return; }
    if (!fecha) { this.toastSvc.show('Selecciona la fecha del avance', 'warning'); return; }

    const fechaAvance = new Date(fecha);
    const fechaInicio = new Date(this.obra()!.fechaInicio);
    const fechaFin = new Date(this.obra()!.fechaFin);

    // Ignorar horas para la validación
    fechaAvance.setUTCHours(0,0,0,0);
    fechaInicio.setUTCHours(0,0,0,0);
    fechaFin.setUTCHours(0,0,0,0);

    if (fechaAvance < fechaInicio || fechaAvance > fechaFin) {
      this.toastSvc.show(`La fecha debe estar entre el inicio (${this.obra()!.fechaInicio}) y término (${this.obra()!.fechaFin}) de la obra.`, 'warning');
      return;
    }

    this.avancesSvc.registrarAvance(this.obra()!.id, {
      titulo: `Avance: ${meta.concepto}`,
      fechaAvance: fecha,
      metaId: meta.id,
      cantidadEjecutada: val,
      porcentaje: 0 // Prevents NullPointerException if backend needs it, although 0 is handled. Wait, backend checks if it's null.
    }).subscribe({
      next: () => { 
        this.toastSvc.show('Avance guardado', 'success'); 
        this.cargarMetas(); 
        this.svc.getObraById(this.obra()!.id).subscribe(o => { this.obra.set(o); });
        this.avancesSvc.getAvances(this.obra()!.id).subscribe(list => { this.avances.set(list); });
      },
      error: (err) => this.toastSvc.show(err.error?.message || 'Error al guardar avance', 'error')
    });
  }

  getAvancesPorMeta(metaId: number) {
    return this.avances().filter(a => a.metaId === metaId);
  }

  agregarMetaNueva(concepto: string, cant: string, unidad: string) {
    const c = parseFloat(cant);
    if (!concepto || isNaN(c) || c <= 0 || !unidad) { this.toastSvc.show('Datos incompletos', 'warning'); return; }
    const newMeta = { concepto, cantidadMeta: c, unidadMedida: unidad };
    this.metasService.crearMeta(this.obra()!.id, newMeta as any).subscribe({
      next: () => { this.toastSvc.show('Meta agregada', 'success'); this.cargarMetas(); },
      error: () => this.toastSvc.show('Error al agregar', 'error')
    });
  }

  eliminarMetaAdmin(metaId: number) {
    if (this.obra()?.estatus === 'INACTIVA') { this.toastSvc.show('Obra inactiva, no se puede modificar.', 'error'); return; }
    if(confirm('¿Eliminar esta meta?')) {
      this.metasService.eliminarMeta(this.obra()!.id, metaId).subscribe({
        next: () => { this.toastSvc.show('Meta eliminada', 'success'); this.cargarMetas(); },
        error: () => this.toastSvc.show('Error', 'error')
      });
    }
  }

  guardarEdicionObra(event: Event) {
    event.preventDefault();
    if (this.obra()?.estatus === 'INACTIVA') { this.toastSvc.show('Esta obra fue eliminada, no se puede modificar.', 'error'); return; }
    const form = document.getElementById('editarObraForm') as HTMLFormElement | null;
    if (!form) return;
    const estatusVal = (form.elements.namedItem('estatus') as HTMLSelectElement).value;
    const updateReq = {
      nombre: (form.elements.namedItem('nombre') as HTMLInputElement).value,
      categoria: (form.elements.namedItem('categoria') as HTMLInputElement).value,
        descripcion: (form.elements.namedItem('descripcion') as HTMLTextAreaElement).value,
        direccion: (form.elements.namedItem('direccion') as HTMLInputElement)?.value || this.obra()!.direccion || '',
        fuenteFinanciamiento: (form.elements.namedItem('fuenteFinanciamiento') as HTMLTextAreaElement).value.trim(),
        beneficiarios: (form.elements.namedItem('beneficiarios') as HTMLTextAreaElement).value.trim(),
        impactoSocial: (form.elements.namedItem('impactoSocial') as HTMLTextAreaElement).value.trim(),
        contratista: (form.elements.namedItem('contratista') as HTMLInputElement)?.value.trim() || ''
    };
    
    // 1. Update basic info
    this.svc.updateObra(this.obra()!.id, updateReq).subscribe({
      next: (res) => {
        // 2. Update estatus
        this.svc.cambiarEstatus(this.obra()!.id, estatusVal as any).subscribe({
          next: (res2) => {
            this.obra.set({ ...res, ...res2 });
            this.toastSvc.show('Obra actualizada correctamente', 'success');
            this.tabActiva.set('resumen');
          },
          error: () => this.toastSvc.show('Error al actualizar estatus', 'error')
        });
      },
      error: () => this.toastSvc.show('Error al actualizar', 'error')
    });
  }

  eliminarObraAdmin() {
    Swal.fire({
      title: '¿Estás seguro?',
      text: '🚨 ADVERTENCIA: Estás a punto de eliminar permanentemente esta obra y todo su expediente. Esta acción NO se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#4B5563',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#1F2937',
      color: '#F9FAFB'
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.svc.cambiarEstatus(this.obra()!.id, 'INACTIVA' as any).subscribe({
          next: () => {
            this.toastSvc.show('Obra eliminada exitosamente.', 'success');
            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            console.error('Error al eliminar obra:', err);
            this.toastSvc.show('Error al eliminar la obra.', 'error');
          }
        });
      }
    });
  }
}





