import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ObrasService } from '../../core/services/obras.service';
import { AvancesService } from '../../core/services/avances.service';
import { ArchivosService } from '../../core/services/archivos.service';
import { AuthService } from '../../core/services/auth.service';
import { ObraResponse, ObraAvance, ObraArchivo, ObraEstatus, ESTATUS_LABEL, ESTATUS_COLOR } from '../../core/models/obra.model';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-expediente',
  standalone: true,
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
          <div style="display:flex; gap:12px">
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
          <p style="margin-top:10px;color:var(--text-muted);font-size:0.82rem">{{ obra()!.descripcion }}</p>
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
                    <a [href]="getFileUrl(arch.archivoUrl)" target="_blank" [download]="arch.nombreOriginal" class="btn btn-secondary btn-sm" style="text-decoration:none;">
                      👁️ Ver / Descargar
                    </a>
                  </div>
                } @empty {
                  <div class="empty-state" style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:16px;">
                    📁 Ningún archivo subido a este expediente todavía.
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
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
                  <input type="number" name="porcentaje" class="form-input" min="0" max="100" [value]="ultimoPorcentaje()" required>
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

  svc = inject(ObrasService);
  avancesSvc = inject(AvancesService);
  archivosSvc = inject(ArchivosService);
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);

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
      }
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
    const porcentaje = Number(formData.get('porcentaje')) || 0;

    this.svc.updateObra(current.id, { nombre, descripcion, categoria }).subscribe({
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
