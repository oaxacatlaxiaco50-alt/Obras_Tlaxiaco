import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-membrete-preview-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay animate-fade-in" (click)="onBackdropClick($event)">
      <div class="modal-box animate-scale-in">
        <div class="modal-header">
          <div class="modal-title-row">
            <span class="modal-icon">📑</span>
            <div>
              <h3 class="modal-title">
                {{ modoConfirmar ? 'Confirmar Nueva Hoja Membretada' : 'Vista Previa de la Hoja Membretada Oficial' }}
              </h3>
              <p class="modal-desc">
                {{ modoConfirmar 
                  ? 'Verifica los encabezados y pie de página antes de guardar esta plantilla oficial.' 
                  : 'Plantilla de fondo oficial para Fichas Técnicas, Expediente Unitario y Reportes.' }}
              </p>
            </div>
          </div>
          <button type="button" class="btn-close" (click)="cerrar.emit()">✕</button>
        </div>

        <div class="modal-body">
          <!-- Visualizador de la Hoja Carta -->
          <div class="sheet-viewport">
            <div class="paper-sheet">
              <img [src]="imagenUrl" alt="Hoja Membretada" class="sheet-image" (error)="onImgError($event)" />
              
              <!-- Zona guía de impresión segura -->
              <div class="safe-zone-overlay">
                <div class="safe-zone-box">
                  <span>Área Segura para Información de Obras (Sin Empalmes)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Explicación y Márgenes -->
          <div class="doc-usage-info">
            <div class="alert-info-box">
              <span class="info-box-icon">ℹ️</span>
              <p style="margin:0; font-size:0.8rem; line-height:1.45; color:#cbd5e1;">
                <strong>Márgenes Automáticos:</strong> El sistema detecta los arcos superiores y el dibujo del palacio municipal inferior, colocando las tablas, firmas y textos <strong>exclusivamente en la zona central limpia</strong> para evitar cualquier texto encimado.
              </p>
            </div>

            <h4 class="usage-title">🏛️ Documentos Oficiales que Utilizan esta Plantilla:</h4>
            <div class="usage-list">
              <div class="usage-item">
                <span class="usage-icon">📄</span>
                <div>
                  <strong>Ficha Técnica Oficial de Entrega de Obra:</strong>
                  <p>Incrusta esta plantilla con las fotos del Antes, Durante y Después, metas físicas, inversión autorizada y firmas de entrega.</p>
                </div>
              </div>
              <div class="usage-item">
                <span class="usage-icon">🗂️</span>
                <div>
                  <strong>Carátula del Expediente Unitario (44 Requisitos):</strong>
                  <p>Genera la portada auditada para entrega a la Auditoría Superior (OSFE) con folios y sellos institucionales.</p>
                </div>
              </div>
              <div class="usage-item">
                <span class="usage-icon">📊</span>
                <div>
                  <strong>Reportes Ejecutivos de Supervisión y Estimaciones:</strong>
                  <p>Encabeza los reportes financieros periódicos para la Comisión de Hacienda y Cabildo Municipal.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="cerrar.emit()">
            {{ modoConfirmar ? 'Cancelar' : 'Cerrar' }}
          </button>
          @if (modoConfirmar) {
            <button type="button" class="btn btn-primary" (click)="confirmar.emit()">
              💾 Confirmar y Guardar Hoja Oficial
            </button>
          } @else {
            <a [href]="imagenUrl" download="hoja_membretada_oficial.png" class="btn btn-primary">
              📥 Descargar Plantilla
            </a>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.85);
      backdrop-filter: blur(5px); z-index: 10000;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .modal-box {
      background: #1e293b; border: 1px solid rgba(255,255,255,0.14);
      border-radius: 14px; max-width: 860px; width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); overflow: hidden;
      display: flex; flex-direction: column; max-height: 92vh;
    }
    .modal-header {
      padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex; justify-content: space-between; align-items: center;
      background: #0f172a;
    }
    .modal-title-row { display: flex; align-items: center; gap: 12px; }
    .modal-icon { font-size: 1.4rem; }
    .modal-title { font-size: 1.05rem; font-weight: 700; color: #f8fafc; margin: 0; }
    .modal-desc { font-size: 0.78rem; color: #94a3b8; margin: 2px 0 0 0; }
    .btn-close {
      background: none; border: none; color: #94a3b8; font-size: 1.2rem;
      cursor: pointer; padding: 4px 8px; border-radius: 6px;
    }
    .btn-close:hover { color: #fff; background: rgba(255,255,255,0.1); }
    .modal-body {
      padding: 20px; display: grid; grid-template-columns: 320px 1fr; gap: 24px;
      overflow-y: auto; align-items: center;
    }
    @media (max-width: 768px) {
      .modal-body { grid-template-columns: 1fr; }
    }
    .sheet-viewport {
      display: flex; justify-content: center; align-items: center;
      background: #0f172a; border-radius: 12px; padding: 14px;
      border: 1px solid #334155;
    }
    .paper-sheet {
      width: 250px; height: 340px; background: #ffffff;
      border-radius: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      position: relative; overflow: hidden; display: flex;
    }
    .sheet-image { width: 100%; height: 100%; object-fit: contain; }
    .safe-zone-overlay {
      position: absolute; top: 55px; bottom: 85px; left: 20px; right: 20px;
      border: 1.5px dashed rgba(59, 130, 246, 0.45);
      background: rgba(59, 130, 246, 0.05);
      border-radius: 4px; pointer-events: none;
      display: flex; align-items: center; justify-content: center;
    }
    .safe-zone-box span {
      font-size: 0.62rem; color: #1d4ed8; font-weight: 700;
      text-align: center; display: block; padding: 4px;
      background: rgba(255,255,255,0.85); border-radius: 3px;
    }
    .doc-usage-info { display: flex; flex-direction: column; gap: 14px; }
    .alert-info-box {
      display: flex; gap: 10px; align-items: flex-start;
      background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 10px 14px; border-radius: 8px;
    }
    .info-box-icon { font-size: 1.1rem; }
    .usage-title { font-size: 0.88rem; font-weight: 700; color: #f8fafc; margin: 0; }
    .usage-list { display: flex; flex-direction: column; gap: 10px; }
    .usage-item {
      display: flex; gap: 12px; align-items: flex-start;
      background: rgba(255,255,255,0.03); border: 1px solid #334155;
      padding: 10px 12px; border-radius: 8px;
    }
    .usage-icon { font-size: 1.2rem; }
    .usage-item strong { display: block; font-size: 0.82rem; color: #e2e8f0; margin-bottom: 2px; }
    .usage-item p { margin: 0; font-size: 0.74rem; color: #94a3b8; line-height: 1.4; }
    .modal-footer {
      padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.08);
      display: flex; justify-content: flex-end; gap: 12px; background: #0f172a;
    }
  `]
})
export class MembretePreviewModalComponent {
  @Input() imagenUrl!: string;
  @Input() modoConfirmar = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmar = new EventEmitter<void>();

  onImgError(e: any) {
    e.target.src = 'assets/logos/hoja_membretada_oficial.png';
  }

  onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrar.emit();
    }
  }
}
