import { Component, inject } from '@angular/core';
import { ThemeService, Theme } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-panel',
  standalone: true,
  template: `
    @if (themeSvc.panelOpen()) {
      <div class="panel-overlay animate-fade-in" (click)="themeSvc.closePanel()"></div>
      <div class="theme-panel animate-slide-in">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <span class="panel-icon">🎨</span>
            <h3>Personalización Premium</h3>
          </div>
          <button class="close-panel-btn" (click)="themeSvc.closePanel()">✕</button>
        </div>

        <div class="panel-body">
          <p class="panel-intro">Personaliza la tipografía, colores de acento y presets visuales del sistema en tiempo real.</p>
          
          <!-- Presets de Tema Completo -->
          <div class="section-title">🎭 Presets de Tema</div>
          <div class="theme-presets-grid">
            <button class="preset-btn theme-default" [class.active]="themeSvc.currentTheme() === 'default'" (click)="themeSvc.setTheme('default')">
              <span class="preset-indicator"></span> Default Oscuro
            </button>
            <button class="preset-btn theme-emerald" [class.active]="themeSvc.currentTheme() === 'emerald'" (click)="themeSvc.setTheme('emerald')">
              <span class="preset-indicator"></span> Esmeralda
            </button>
            <button class="preset-btn theme-cyberpunk" [class.active]="themeSvc.currentTheme() === 'cyberpunk'" (click)="themeSvc.setTheme('cyberpunk')">
              <span class="preset-indicator"></span> Cyberpunk
            </button>
            <button class="preset-btn theme-sunset" [class.active]="themeSvc.currentTheme() === 'sunset'" (click)="themeSvc.setTheme('sunset')">
              <span class="preset-indicator"></span> Sunset
            </button>
            <button class="preset-btn theme-silver" [class.active]="themeSvc.currentTheme() === 'silver'" (click)="themeSvc.setTheme('silver')">
              <span class="preset-indicator"></span> Plata (Claro)
            </button>
            <button class="preset-btn theme-guinda" [class.active]="themeSvc.currentTheme() === 'guinda'" (click)="themeSvc.setTheme('guinda')">
              <span class="preset-indicator"></span> Guinda Institucional
            </button>
            <button class="preset-btn theme-pastel-blue" [class.active]="themeSvc.currentTheme() === 'pastel-blue'" (click)="themeSvc.setTheme('pastel-blue')">
              <span class="preset-indicator"></span> Azul Pastel
            </button>
            <button class="preset-btn theme-pastel-mint" [class.active]="themeSvc.currentTheme() === 'pastel-mint'" (click)="themeSvc.setTheme('pastel-mint')">
              <span class="preset-indicator"></span> Menta Pastel
            </button>
          </div>

          <!-- Color de Acento -->
          <div class="section-title">⚡ Color de Acento Primario</div>
          <div class="accent-presets-grid">
            @for (color of themeSvc.presetColors; track color.value) {
              <button 
                class="accent-dot" 
                [style.background]="color.value"
                [class.active]="themeSvc.customAccent() === color.value"
                [title]="color.name"
                (click)="themeSvc.setAccent(color.value)">
                @if (themeSvc.customAccent() === color.value) {
                  <span class="check-mark">✓</span>
                }
              </button>
            }
          </div>

          <!-- Selector de color personalizado -->
          <div class="custom-color-picker-wrap">
            <span class="picker-label">🎨 Color Personalizado:</span>
            <div class="picker-input-container">
              <input 
                type="color" 
                class="color-picker-input"
                [value]="themeSvc.customAccent()" 
                (input)="onCustomColorChange($event)"
              />
              <span class="color-hex-code">{{ themeSvc.customAccent() }}</span>
            </div>
          </div>

          <!-- Selección de Tipografía -->
          <div class="section-title">🔠 Tipografía de la Suite</div>
          <div class="font-list">
            @for (font of themeSvc.availableFonts; track font.value) {
              <button 
                class="font-item-btn" 
                [class.active]="themeSvc.fontFamily() === font.value"
                [style.font-family]="font.value"
                (click)="themeSvc.setFont(font.value)">
                <span class="font-name-lbl">{{ font.name }}</span>
                <span class="font-preview-lbl">Abc 123</span>
              </button>
            }
          </div>
        </div>

        <div class="panel-footer">
          <button class="btn btn-primary btn-sm full-width" (click)="themeSvc.closePanel()">
            Guardar y Aplicar
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .panel-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.5); z-index: 999; backdrop-filter: blur(4px);
    }
    .theme-panel {
      position: fixed; top: 0; right: 0; width: 360px; height: 100vh;
      background: var(--bg-surface); border-left: 1px solid var(--border-light);
      z-index: 1000; display: flex; flex-direction: column; box-shadow: var(--shadow-lg);
    }
    .panel-header {
      padding: 20px 24px; border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center;
    }
    .panel-title-wrap { display: flex; align-items: center; gap: 10px; }
    .panel-title-wrap h3 { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }
    .panel-icon { font-size: 1.3rem; }
    .close-panel-btn {
      background: none; border: none; color: var(--text-muted);
      font-size: 1.2rem; cursor: pointer; transition: var(--transition);
    }
    .close-panel-btn:hover { color: var(--danger); }
    
    .panel-body { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
    .panel-intro { font-size: 0.78rem; color: var(--text-muted); line-height: 1.6; }
    
    .section-title { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
    
    .theme-presets-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .preset-btn {
      padding: 10px; border-radius: 8px; border: 1px solid var(--border);
      background: var(--bg-dark); color: var(--text-secondary);
      font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: var(--transition);
      display: flex; align-items: center; gap: 6px; text-align: left;
    }
    .preset-btn:hover { border-color: var(--accent); color: var(--text-primary); }
    .preset-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(232, 160, 32, 0.05); }
    
    .preset-indicator { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .theme-default .preset-indicator { background: #E8A020; }
    .theme-emerald .preset-indicator { background: #10B981; }
    .theme-cyberpunk .preset-indicator { background: #00FFCC; }
    .theme-sunset .preset-indicator { background: #F97316; }
    .theme-silver .preset-indicator { background: #64748B; }
    .theme-guinda .preset-indicator { background: #9D2449; }
    .theme-pastel-blue .preset-indicator { background: #60A5FA; }
    .theme-pastel-mint .preset-indicator { background: #34D399; }

    .accent-presets-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
    .accent-dot {
      aspect-ratio: 1; border-radius: 50%; border: 2px solid transparent;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: var(--transition); padding: 0; box-shadow: var(--shadow-sm);
    }
    .accent-dot:hover { transform: scale(1.15); }
    .accent-dot.active { border-color: #ffffff; transform: scale(1.1); }
    .check-mark { font-size: 0.65rem; font-weight: 800; color: #000000; text-shadow: 0 0 2px #ffffff; }

    .custom-color-picker-wrap {
      display: flex; align-items: center; justify-content: space-between;
      background: var(--bg-dark); padding: 10px 14px; border-radius: 8px;
      border: 1px solid var(--border);
    }
    .picker-label { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); }
    .picker-input-container { display: flex; align-items: center; gap: 8px; }
    .color-picker-input {
      width: 26px; height: 26px; border: none; border-radius: 4px;
      background: none; cursor: pointer; padding: 0;
    }
    .color-hex-code { font-size: 0.76rem; font-weight: 700; color: var(--text-primary); font-family: monospace; }

    .font-list { display: flex; flex-direction: column; gap: 6px; }
    .font-item-btn {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border);
      background: var(--bg-dark); color: var(--text-primary); cursor: pointer;
      transition: var(--transition); text-align: left;
    }
    .font-item-btn:hover { border-color: var(--accent); background: var(--bg-surface-hover); }
    .font-item-btn.active { border-color: var(--accent); background: rgba(232, 160, 32, 0.05); }
    
    .font-name-lbl { font-size: 0.8rem; font-weight: 600; }
    .font-preview-lbl { font-size: 0.72rem; color: var(--text-muted); }

    .panel-footer { padding: 20px 24px; border-top: 1px solid var(--border); }
    .full-width { width: 100%; display: block; text-align: center; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  `]
})
export class ThemePanelComponent {
  themeSvc = inject(ThemeService);

  onCustomColorChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.themeSvc.setAccent(value);
  }
}
