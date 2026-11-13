import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InstitucionConfig, InstitucionConfigRequest } from '../models/institucion-config.model';

const DEFAULT_CONFIG: InstitucionConfig = {
  id: 1,
  nombreMunicipio: 'H. Ayuntamiento Constitucional de Heroica Ciudad de Tlaxiaco',
  lemaOficial: 'El poder de servir al pueblo',
  periodoAdministracion: 'Administración 2025 - 2027',
  dependencia: 'Dirección de Obras Públicas y Desarrollo Urbano',
  logoUrl: 'assets/logos/logo.png',
  membreteUrl: null,
  piePaginaReporte: 'Palacio Municipal s/n, Centro, Heroica Ciudad de Tlaxiaco, Oaxaca.'
};

@Injectable({
  providedIn: 'root'
})
export class InstitucionService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/configuracion/identidad`;

  private configSubject = new BehaviorSubject<InstitucionConfig>(DEFAULT_CONFIG);
  public config$ = this.configSubject.asObservable();

  constructor() {
    this.cargarConfiguracion();
  }

  public get currentConfig(): InstitucionConfig {
    return this.configSubject.getValue();
  }

  cargarConfiguracion(): Observable<InstitucionConfig> {
    return this.http.get<InstitucionConfig>(this.baseUrl).pipe(
      tap(cfg => {
        if (cfg) {
          this.configSubject.next(cfg);
        }
      }),
      catchError(err => {
        console.warn('No se pudo cargar la configuración de identidad, usando predeterminada.', err);
        return of(this.configSubject.getValue());
      })
    );
  }

  actualizarDatos(datos: InstitucionConfigRequest): Observable<InstitucionConfig> {
    return this.http.put<InstitucionConfig>(this.baseUrl, datos).pipe(
      tap(cfg => {
        if (cfg) {
          this.configSubject.next(cfg);
        }
      })
    );
  }

  subirLogo(archivo: File): Observable<InstitucionConfig> {
    const formData = new FormData();
    formData.append('file', archivo);
    return this.http.post<InstitucionConfig>(`${this.baseUrl}/logo`, formData).pipe(
      tap(cfg => {
        if (cfg) {
          this.configSubject.next(cfg);
        }
      })
    );
  }

  subirMembrete(archivo: File): Observable<InstitucionConfig> {
    const formData = new FormData();
    formData.append('file', archivo);
    return this.http.post<InstitucionConfig>(`${this.baseUrl}/membrete`, formData).pipe(
      tap(cfg => {
        if (cfg) {
          this.configSubject.next(cfg);
        }
      })
    );
  }

  restablecerLogo(): Observable<InstitucionConfig> {
    return this.http.delete<InstitucionConfig>(`${this.baseUrl}/logo`).pipe(
      tap(cfg => {
        if (cfg) {
          this.configSubject.next(cfg);
        }
      })
    );
  }

  restablecerMembrete(): Observable<InstitucionConfig> {
    return this.http.delete<InstitucionConfig>(`${this.baseUrl}/membrete`).pipe(
      tap(cfg => {
        if (cfg) {
          this.configSubject.next(cfg);
        }
      })
    );
  }

  resolveLogoUrl(url?: string | null): string {
    const target = url || this.currentConfig.logoUrl;
    if (!target) return 'assets/logos/logo.png';
    if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('data:')) {
      return target;
    }
    if (target.startsWith('/assets/')) return target.substring(1);
    if (target.startsWith('assets/')) return target;
    const clean = target.startsWith('/') ? target : '/' + target;
    return `${environment.apiUrl}${clean}`;
  }

  resolveMembreteUrl(url?: string | null): string | null {
    const target = url !== undefined ? url : this.currentConfig.membreteUrl;
    if (!target) return null;
    if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('data:')) {
      return target;
    }
    if (target.startsWith('/assets/')) return target.substring(1);
    if (target.startsWith('assets/')) return target;
    const clean = target.startsWith('/') ? target : '/' + target;
    return `${environment.apiUrl}${clean}`;
  }
}
