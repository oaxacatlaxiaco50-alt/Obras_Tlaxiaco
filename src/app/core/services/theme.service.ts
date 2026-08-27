import { Injectable, signal } from '@angular/core';

export type Theme = 'default' | 'emerald' | 'cyberpunk' | 'sunset' | 'silver' | 'guinda' | 'pastel-blue' | 'pastel-mint';

export interface ThemeConfig {
  theme: Theme;
  fontFamily: string;
  customAccent: string;
  isDarkMode?: boolean;
}

const AVAILABLE_FONTS = [
  { name: 'Inter', value: "'Inter', sans-serif" },
  { name: 'Roboto', value: "'Roboto', sans-serif" },
  { name: 'Outfit', value: "'Outfit', sans-serif" },
  { name: 'Poppins', value: "'Poppins', sans-serif" },
  { name: 'Nunito', value: "'Nunito', sans-serif" },
  { name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
];

const PRESET_COLORS = [
  { name: 'Guinda Institucional', value: '#9D2449' },
  { name: 'Ámbar (Default)', value: '#E8A020' },
  { name: 'Esmeralda', value: '#10B981' },
  { name: 'Zafiro', value: '#3B82F6' },
  { name: 'Rubí', value: '#EF4444' },
  { name: 'Violeta', value: '#8B5CF6' },
  { name: 'Coral', value: '#F97316' },
  { name: 'Cian', value: '#06B6D4' },
];

const STORAGE_KEY = 'residencia_theme_config';

const DEFAULT_CONFIG: ThemeConfig = {
  theme: 'default',
  fontFamily: "'Inter', sans-serif",
  customAccent: '#E8A020',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _currentTheme = signal<Theme>('default');
  private _fontFamily = signal<string>(DEFAULT_CONFIG.fontFamily);
  private _customAccent = signal<string>(DEFAULT_CONFIG.customAccent);
  private _isDarkMode = signal<boolean>(true);
  private _panelOpen = signal(false);

  currentTheme = this._currentTheme.asReadonly();
  fontFamily = this._fontFamily.asReadonly();
  customAccent = this._customAccent.asReadonly();
  isDarkMode = this._isDarkMode.asReadonly();
  panelOpen = this._panelOpen.asReadonly();

  readonly availableFonts = AVAILABLE_FONTS;
  readonly presetColors = PRESET_COLORS;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const config: ThemeConfig = JSON.parse(saved);
        this._currentTheme.set(config.theme);
        this._fontFamily.set(config.fontFamily);
        this._customAccent.set(config.customAccent);
        this._isDarkMode.set(config.isDarkMode ?? true);
        this.applyTheme(config.theme);
        this.applyFont(config.fontFamily);
        this.applyAccent(config.customAccent);
        this.applyMode(this._isDarkMode());
      } catch {
        this.applyTheme('default');
        this.applyMode(true);
      }
    } else {
      this.applyTheme('default');
      this.applyMode(true);
    }
  }

  togglePanel(): void {
    this._panelOpen.update(v => !v);
  }

  closePanel(): void {
    this._panelOpen.set(false);
  }

  setTheme(theme: Theme): void {
    this._currentTheme.set(theme);
    this.applyTheme(theme);
    // Reset accent to theme default when switching themes
    if (theme === 'default') this.setAccent('#E8A020');
    this.persist();
  }

  toggleTheme(): void {
    const themes: Theme[] = ['default', 'emerald', 'cyberpunk', 'sunset', 'silver', 'guinda', 'pastel-blue', 'pastel-mint'];
    const idx = themes.indexOf(this._currentTheme());
    const nextIdx = (idx + 1) % themes.length;
    this.setTheme(themes[nextIdx]);
  }

  toggleMode(): void {
    this._isDarkMode.update(v => !v);
    this.applyMode(this._isDarkMode());
    this.persist();
  }

  setFont(fontFamily: string): void {
    this._fontFamily.set(fontFamily);
    this.loadGoogleFont(fontFamily);
    this.applyFont(fontFamily);
    this.persist();
  }

  setAccent(color: string): void {
    this._customAccent.set(color);
    this.applyAccent(color);
    this.persist();
  }

  private applyTheme(theme: Theme): void {
    const body = document.body;
    body.classList.remove(
      'theme-default', 'theme-emerald', 'theme-cyberpunk', 'theme-sunset',
      'theme-silver', 'theme-guinda', 'theme-pastel-blue', 'theme-pastel-mint'
    );
    body.classList.add(`theme-${theme}`);
  }

  private applyMode(isDark: boolean): void {
    if (isDark) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  }

  private applyFont(fontFamily: string): void {
    document.documentElement.style.setProperty('--font-family', fontFamily);
    document.body.style.fontFamily = fontFamily;
  }

  private applyAccent(color: string): void {
    const root = document.documentElement;
    root.style.setProperty('--accent', color);
    root.style.setProperty('--accent-light', this.lighten(color, 25));
    root.style.setProperty('--accent-dark', this.darken(color, 15));
    root.style.setProperty('--shadow-glow', `0 0 20px ${color}30`);
  }

  private persist(): void {
    const config: ThemeConfig = {
      theme: this._currentTheme(),
      fontFamily: this._fontFamily(),
      customAccent: this._customAccent(),
      isDarkMode: this._isDarkMode(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  private loadGoogleFont(fontFamily: string): void {
    const fontName = fontFamily.split("'")[1];
    if (!fontName) return;
    const existing = document.querySelector(`link[data-font="${fontName}"]`);
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset['font'] = fontName;
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s/g, '+')}:wght@300;400;500;600;700;800&display=swap`;
    document.head.appendChild(link);
  }

  private lighten(hex: string, pct: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.min(255, r + Math.round((255 - r) * pct / 100));
    const ng = Math.min(255, g + Math.round((255 - g) * pct / 100));
    const nb = Math.min(255, b + Math.round((255 - b) * pct / 100));
    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  }

  private darken(hex: string, pct: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.max(0, r - Math.round(r * pct / 100));
    const ng = Math.max(0, g - Math.round(g * pct / 100));
    const nb = Math.max(0, b - Math.round(b * pct / 100));
    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  }
}
