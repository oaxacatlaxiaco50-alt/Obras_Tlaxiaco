import { Component, ElementRef, ViewChild, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-logo-cropper-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="modal-overlay animate-fade-in" (click)="onBackdropClick($event)">
      <div class="modal-box animate-scale-in">
        <div class="modal-header">
          <div class="modal-title-row">
            <span class="modal-icon" style="display:flex; align-items:center;">
              <app-icon name="crop" [size]="22" color="#c084fc"></app-icon>
            </span>
            <div>
              <h3 class="modal-title">Ajustar y Encuadrar Logotipo Municipal</h3>
              <p class="modal-desc">Arrastra la imagen o usa el zoom para centrarla y dejarla a la medida exacta.</p>
            </div>
          </div>
          <button type="button" class="btn-close" (click)="cancelar.emit()">
            <app-icon name="x" [size]="16"></app-icon>
          </button>
        </div>

        <div class="modal-body">
          <!-- Canvas de ajuste -->
          <div class="canvas-wrapper">
            <canvas #cropperCanvas width="320" height="320"
              (mousedown)="startPan($event)"
              (mousemove)="onPan($event)"
              (mouseup)="endPan()"
              (mouseleave)="endPan()"
              (wheel)="onWheel($event)"
              (touchstart)="onTouchStart($event)"
              (touchmove)="onTouchMove($event)"
              (touchend)="endPan()"
              class="cropper-canvas">
            </canvas>
            
            <!-- Marco guía -->
            <div class="crop-guide-overlay">
              <div class="crop-guide-circle"></div>
            </div>
          </div>

          <!-- Controles de manipulación -->
          <div class="controls-panel">
            <div class="control-row">
              <label class="control-label" style="display:flex; align-items:center; gap:5px;">
                <app-icon name="search" [size]="14"></app-icon> Zoom / Escala ({{ zoom.toFixed(1) }}x):
              </label>
              <div class="zoom-slider-box">
                <button type="button" class="btn-zoom-step" (click)="adjustZoom(-0.1)">-</button>
                <input type="range" [(ngModel)]="zoom" min="0.5" max="3" step="0.05" (input)="draw()" class="slider-input" />
                <button type="button" class="btn-zoom-step" (click)="adjustZoom(0.1)">+</button>
              </div>
            </div>

            <div class="control-row">
              <label class="control-label" style="display:flex; align-items:center; gap:5px;">
                <app-icon name="palette" [size]="14"></app-icon> Fondo del Logotipo:
              </label>
              <div class="bg-options">
                <button type="button" class="btn-bg-opt" [class.active]="bgColor === 'transparent'" (click)="setBg('transparent')">
                  Transparente
                </button>
                <button type="button" class="btn-bg-opt" [class.active]="bgColor === '#ffffff'" (click)="setBg('#ffffff')">
                  Fondo Blanco
                </button>
              </div>
            </div>

            <!-- Vistas previas en vivo -->
            <div class="previews-section">
              <span class="preview-title" style="display:flex; align-items:center; gap:5px;">
                <app-icon name="eye" [size]="14"></app-icon> Vista previa en el sistema:
              </span>
              <div class="preview-cards-row">
                <div class="preview-item">
                  <div class="preview-bubble sidebar-bubble">
                    <img [src]="previewDataUrl" alt="Sidebar" />
                  </div>
                  <span class="preview-caption">Menú Lateral</span>
                </div>
                <div class="preview-item">
                  <div class="preview-bubble login-bubble">
                    <img [src]="previewDataUrl" alt="Login" />
                  </div>
                  <span class="preview-caption">Pantalla Login</span>
                </div>
                <div class="preview-item">
                  <div class="preview-bubble report-bubble">
                    <img [src]="previewDataUrl" alt="Reporte" />
                  </div>
                  <span class="preview-caption">Reporte PDF</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="cancelar.emit()">
            Cancelar
          </button>
          <button type="button" class="btn btn-primary btn-save" (click)="guardarAjuste()" style="display:inline-flex; align-items:center; gap:6px;">
            <app-icon name="save" [size]="16"></app-icon> Guardar y Aplicar Logotipo
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.75);
      backdrop-filter: blur(4px); z-index: 10000;
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .modal-box {
      background: #1e293b; border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px; max-width: 680px; width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow: hidden;
      display: flex; flex-direction: column; max-height: 90vh;
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
      padding: 20px; display: grid; grid-template-columns: 320px 1fr; gap: 20px;
      overflow-y: auto; align-items: start;
    }
    @media (max-width: 680px) {
      .modal-body { grid-template-columns: 1fr; }
    }
    .canvas-wrapper {
      position: relative; width: 320px; height: 320px; border-radius: 12px;
      overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.4);
      background: #0f172a; border: 2px solid #334155; margin: 0 auto;
    }
    .cropper-canvas { cursor: grab; display: block; }
    .cropper-canvas:active { cursor: grabbing; }
    .crop-guide-overlay {
      position: absolute; inset: 0; pointer-events: none;
      display: flex; align-items: center; justify-content: center;
      box-shadow: inset 0 0 0 1000px rgba(15, 23, 42, 0.45);
    }
    .crop-guide-circle {
      width: 280px; height: 280px; border-radius: 12px;
      border: 2px dashed #38bdf8;
      box-shadow: 0 0 0 2px rgba(255,255,255,0.2);
    }
    .controls-panel { display: flex; flex-direction: column; gap: 16px; }
    .control-row { display: flex; flex-direction: column; gap: 6px; }
    .control-label { font-size: 0.8rem; font-weight: 600; color: #cbd5e1; }
    .zoom-slider-box { display: flex; align-items: center; gap: 10px; }
    .btn-zoom-step {
      width: 28px; height: 28px; border-radius: 6px; border: 1px solid #475569;
      background: #1e293b; color: #fff; font-weight: bold; cursor: pointer;
    }
    .btn-zoom-step:hover { background: #334155; }
    .slider-input { flex: 1; accent-color: #3b82f6; cursor: pointer; }
    .bg-options { display: flex; gap: 8px; }
    .btn-bg-opt {
      flex: 1; padding: 7px 10px; font-size: 0.78rem; font-weight: 600;
      border: 1px solid #475569; border-radius: 6px; background: #0f172a;
      color: #94a3b8; cursor: pointer;
    }
    .btn-bg-opt.active {
      border-color: #3b82f6; background: rgba(59,130,246,0.15); color: #60a5fa;
    }
    .previews-section {
      background: #0f172a; border: 1px solid #334155; border-radius: 10px;
      padding: 12px; display: flex; flex-direction: column; gap: 10px;
    }
    .preview-title { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
    .preview-cards-row { display: flex; justify-content: space-around; align-items: center; }
    .preview-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .preview-bubble {
      border-radius: 8px; background: #ffffff; display: flex;
      align-items: center; justify-content: center; overflow: hidden;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
    .sidebar-bubble { width: 44px; height: 44px; border-radius: 8px; padding: 3px; }
    .login-bubble { width: 56px; height: 56px; border-radius: 10px; padding: 4px; }
    .report-bubble { width: 48px; height: 48px; border-radius: 4px; padding: 3px; }
    .preview-bubble img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .preview-caption { font-size: 0.7rem; color: #64748b; }
    .modal-footer {
      padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.08);
      display: flex; justify-content: flex-end; gap: 12px; background: #0f172a;
    }
    .btn-save { background: #3b82f6; color: #fff; font-weight: 700; }
    .btn-save:hover { background: #2563eb; }
  `]
})
export class LogoCropperModalComponent implements AfterViewInit {
  @ViewChild('cropperCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() imageFile!: File;
  @Output() aplicar = new EventEmitter<File>();
  @Output() cancelar = new EventEmitter<void>();

  img: HTMLImageElement = new Image();
  zoom = 1.0;
  panX = 0;
  panY = 0;
  isDragging = false;
  startX = 0;
  startY = 0;
  bgColor: 'transparent' | '#ffffff' = 'transparent';
  previewDataUrl = '';

  ngAfterViewInit() {
    this.cargarImagen();
  }

  cargarImagen() {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.img.onload = () => {
        this.resetPosition();
        this.draw();
      };
      this.img.src = e.target?.result as string;
    };
    reader.readAsDataURL(this.imageFile);
  }

  resetPosition() {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
  }

  adjustZoom(delta: number) {
    this.zoom = Math.min(3, Math.max(0.5, this.zoom + delta));
    this.draw();
  }

  setBg(color: 'transparent' | '#ffffff') {
    this.bgColor = color;
    this.draw();
  }

  draw() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.img.complete) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.bgColor !== 'transparent') {
      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = this.img.width;
    const ih = this.img.height;

    // Escalar para ajustar respetando proporción
    const baseScale = Math.min(cw / iw, ch / ih) * 0.85;
    const scale = baseScale * this.zoom;

    const renderW = iw * scale;
    const renderH = ih * scale;

    const x = (cw - renderW) / 2 + this.panX;
    const y = (ch - renderH) / 2 + this.panY;

    ctx.drawImage(this.img, x, y, renderW, renderH);

    this.previewDataUrl = canvas.toDataURL('image/png');
  }

  startPan(e: MouseEvent) {
    this.isDragging = true;
    this.startX = e.clientX - this.panX;
    this.startY = e.clientY - this.panY;
  }

  onPan(e: MouseEvent) {
    if (!this.isDragging) return;
    this.panX = e.clientX - this.startX;
    this.panY = e.clientY - this.startY;
    this.draw();
  }

  endPan() {
    this.isDragging = false;
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    this.adjustZoom(delta);
  }

  onTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.startX = e.touches[0].clientX - this.panX;
      this.startY = e.touches[0].clientY - this.panY;
    }
  }

  onTouchMove(e: TouchEvent) {
    if (this.isDragging && e.touches.length === 1) {
      this.panX = e.touches[0].clientX - this.startX;
      this.panY = e.touches[0].clientY - this.startY;
      this.draw();
    }
  }

  guardarAjuste() {
    const canvas = this.canvasRef.nativeElement;
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'logo_institucional_ajustado.png', { type: 'image/png' });
        this.aplicar.emit(file);
      }
    }, 'image/png');
  }

  onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cancelar.emit();
    }
  }
}
