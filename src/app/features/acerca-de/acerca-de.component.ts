import { Component } from '@angular/core';

interface Desarrollador {
  iniciales: string;
  nombre: string;
  rol: string;
  correo: string;
}

@Component({
  selector: 'app-acerca-de',
  standalone: true,
  template: `
    <div class="about-page animate-fade-in">
      <!-- Encabezado con Logo Municipal -->
      <div class="card hero-card">
        <div class="hero-logo-wrap">
          <img src="assets/logos/logo.png" alt="Logo H. Ayuntamiento de Tlaxiaco" class="hero-logo" />
        </div>
        <div class="hero-info">
          <span class="badge badge-warning" style="margin-bottom: 10px; display: inline-block;">
            🏛️ H. Ayuntamiento de la Heroica Ciudad de Tlaxiaco · 2025–2027
          </span>
          <h1 class="hero-title">Sistema de Gestión y Control de Obras Públicas</h1>
          <p class="hero-desc">
            Plataforma integral desarrollada para la administración, supervisión física y financiera,
            control georreferenciado e integración de expedientes unitarios de las obras públicas municipales.
            Facilita el seguimiento transparente de metas, evidencias fotográficas por etapas, bitácoras de
            cambios, auditoría automatizada y generación de reportes oficiales (Ficha Técnica, Integración de
            Expediente Unitario y Reportes Ejecutivos en Excel).
          </p>
        </div>
      </div>

      <!-- Módulos Principales -->
      <div class="features-grid">
        <div class="card feature-item">
          <span class="feature-icon">📁</span>
          <div>
            <h3>Expediente Unitario Digital</h3>
            <p>Control de requisitos técnicos, sociales, de contratación y comprobatorios con visor y descarga oficial.</p>
          </div>
        </div>
        <div class="card feature-item">
          <span class="feature-icon">🎯</span>
          <div>
            <h3>Seguimiento de Metas y Avances</h3>
            <p>Registro cuantitativo de avances físicos con evidencia fotográfica (Antes, Durante y Después).</p>
          </div>
        </div>
        <div class="card feature-item">
          <span class="feature-icon">🗺️</span>
          <div>
            <h3>Geolocalización y Trazabilidad</h3>
            <p>Ubicación en mapa interactivo, bitácora inmutable de modificaciones y logs de auditoría.</p>
          </div>
        </div>
      </div>

      <!-- Equipo de Desarrollo -->
      <div class="card team-section">
        <div class="section-header">
          <div>
            <h2 class="sec-title">👩‍💻👨‍💻 Equipo de Desarrolladores</h2>
            <p class="sec-subtitle">Ingeniería y desarrollo del sistema · Formas de contacto</p>
          </div>
        </div>

        <div class="dev-grid">
          @for (dev of desarrolladores; track dev.nombre) {
            <div class="dev-card">
              <div class="dev-avatar">{{ dev.iniciales }}</div>
              <div class="dev-details">
                <h3 class="dev-name">{{ dev.nombre }}</h3>
                <span class="dev-role">{{ dev.rol }}</span>
                <div class="dev-contact">
                  <span class="contact-icon">✉️</span>
                  <div class="contact-text">
                    <span class="contact-label">Correo electrónico:</span>
                    @if (dev.correo) {
                      <a [href]="'mailto:' + dev.correo" class="contact-email">{{ dev.correo }}</a>
                    } @else {
                      <span class="contact-pending">Pendiente por asignar</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .about-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1100px;
      margin: 0 auto;
    }
    .hero-card {
      display: flex;
      align-items: center;
      gap: 28px;
      padding: 28px 32px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .hero-logo-wrap {
      background: #ffffff;
      padding: 16px 20px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: var(--shadow-md);
    }
    .hero-logo {
      width: 150px;
      height: auto;
      object-fit: contain;
    }
    .hero-info {
      flex: 1;
    }
    .hero-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--text-primary);
      margin: 0 0 10px 0;
    }
    .hero-desc {
      font-size: 0.94rem;
      line-height: 1.7;
      color: var(--text-secondary);
      margin: 0;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 18px;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 20px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .feature-icon {
      font-size: 1.8rem;
      background: rgba(232, 160, 32, 0.12);
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .feature-item h3 {
      font-size: 0.98rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 6px 0;
    }
    .feature-item p {
      font-size: 0.84rem;
      color: var(--text-secondary);
      line-height: 1.5;
      margin: 0;
    }
    .team-section {
      padding: 28px 32px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .section-header {
      margin-bottom: 22px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 14px;
    }
    .sec-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--text-primary);
      margin: 0 0 4px 0;
    }
    .sec-subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin: 0;
    }
    .dev-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
    }
    .dev-card {
      background: var(--bg-dark);
      border: 1px solid var(--border-light);
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: all 0.25s ease;
    }
    .dev-card:hover {
      border-color: var(--accent);
      transform: translateY(-3px);
      box-shadow: var(--shadow-md);
    }
    .dev-avatar {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #fff;
      font-weight: 800;
      font-size: 1.05rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .dev-name {
      font-size: 1.02rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 4px 0;
    }
    .dev-role {
      display: inline-block;
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--accent);
      background: rgba(232, 160, 32, 0.12);
      padding: 3px 10px;
      border-radius: 20px;
      margin-bottom: 12px;
    }
    .dev-contact {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border);
      font-size: 0.82rem;
    }
    .contact-icon {
      font-size: 1.1rem;
    }
    .contact-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }
    .contact-label {
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .contact-email {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
      word-break: break-all;
    }
    .contact-pending {
      color: var(--text-secondary);
      font-style: italic;
    }
    @media (max-width: 768px) {
      .hero-card {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class AcercaDeComponent {
  desarrolladores: Desarrollador[] = [
    {
      iniciales: 'NM',
      nombre: 'Nayeli Morales López',
      rol: 'Desarrolladora de Software',
      correo: ''
    },
    {
      iniciales: 'NO',
      nombre: 'Nancy Olivera Santiago',
      rol: 'Desarrolladora de Software',
      correo: ''
    },
    {
      iniciales: 'KO',
      nombre: 'Kevin Andrew Osorio Aparicio',
      rol: 'Desarrollador de Software',
      correo: ''
    },
    {
      iniciales: 'JH',
      nombre: 'Jorge Luis Hernández Matra',
      rol: 'Desarrollador de Software',
      correo: ''
    }
  ];
}
