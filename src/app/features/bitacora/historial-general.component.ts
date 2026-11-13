import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BitacoraService } from '../../core/services/bitacora.service';
import { ObrasService } from '../../core/services/obras.service';
import { AuthService } from '../../core/services/auth.service';
import { EntradaBitacora, AccionBitacora } from '../../core/models/bitacora.model';
import { ObraResponse } from '../../core/models/obra.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-historial-general',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="hg-wrapper animate-fade-in">
      <!-- Header con Tabs -->
      <div class="hg-header">
        <div>
          <h1 class="hg-title">📋 Historial y Archivo General</h1>
          <p class="hg-subtitle">Trazabilidad de auditoría de acciones y consulta histórica de ejercicios fiscales</p>
        </div>

        @if (isAdminOrAuditor()) {
          <div class="hg-tabs">
            <button
              class="tab-btn"
              [class.active]="tabActiva() === 'bitacora'"
              (click)="cambiarTab('bitacora')">
              📋 Bitácora de Acciones
            </button>
            <button
              class="tab-btn"
              [class.active]="tabActiva() === 'archivoFiscal'"
              (click)="cambiarTab('archivoFiscal')">
              🏛️ Archivo de Ejercicios Fiscales
            </button>
          </div>
        }
      </div>

      <!-- ========================================== -->
      <!-- TAB 1: BITÁCORA GENERAL DE ACCIONES       -->
      <!-- ========================================== -->
      @if (tabActiva() === 'bitacora') {
        <!-- Filtros Bitácora -->
        <div class="hg-filters">
          <div class="filter-group">
            <label class="filter-label">🔍 Buscar en Bitácora</label>
            <input
              class="filter-input"
              type="text"
              placeholder="Usuario, módulo o descripción..."
              [ngModel]="filtroTexto()"
              (ngModelChange)="filtroTexto.set($event); paginaActual.set(1)"
            />
          </div>
          <div class="filter-group">
            <label class="filter-label">🎯 Acción</label>
            <select
              class="filter-input"
              [ngModel]="filtroAccion()"
              (ngModelChange)="filtroAccion.set($event); paginaActual.set(1)"
            >
              <option value="">Todas</option>
              <option value="Crear">Crear</option>
              <option value="Editar">Editar</option>
              <option value="Eliminar">Eliminar</option>
              <option value="Ver">Ver</option>
              <option value="Subir">Subir</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">🏢 Módulo</label>
            <select
              class="filter-input"
              [ngModel]="filtroModulo()"
              (ngModelChange)="filtroModulo.set($event); paginaActual.set(1)"
            >
              <option value="">Todos</option>
              @for (mod of modulos; track mod) {
                <option [value]="mod">{{ mod }}</option>
              }
            </select>
          </div>
          <button class="btn-limpiar" (click)="limpiarFiltrosBitacora()">✕ Limpiar</button>
        </div>

        <!-- Tabla Bitácora -->
        <div class="hg-table-wrap">
          <table class="hg-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Acción</th>
                <th>Módulo</th>
                <th>Descripción</th>
                <th>Obra</th>
              </tr>
            </thead>
            <tbody>
              @for (e of entradasPagina(); track e.id) {
                <tr class="hg-row">
                  <td class="hg-fecha">{{ fmtFecha(e.fecha) }}</td>
                  <td class="hg-usuario">
                    <span class="avatar-mini">{{ e.usuario.split(' ').map(p => p[0]).join('').slice(0,2) }}</span>
                    {{ e.usuario }}
                  </td>
                  <td><span class="badge-rol" [attr.data-rol]="e.rol">{{ e.rol }}</span></td>
                  <td><span class="badge-accion" [attr.data-accion]="e.accion">{{ e.accion }}</span></td>
                  <td class="hg-modulo">{{ e.modulo }}</td>
                  <td class="hg-desc">{{ e.descripcion }}</td>
                  <td class="hg-obra">{{ e.obraNombre ?? '—' }}</td>
                </tr>
              }
              @if (entradasPagina().length === 0) {
                <tr>
                  <td colspan="7" class="hg-empty">🔍 No se encontraron registros con los filtros actuales</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Paginación Bitácora -->
        @if (totalPaginas() > 1) {
          <div class="hg-pagination">
            <button class="pag-btn" [disabled]="paginaActual() === 1" (click)="paginaActual.set(paginaActual() - 1)">‹ Anterior</button>
            <span class="pag-info">Página {{ paginaActual() }} de {{ totalPaginas() }}</span>
            <button class="pag-btn" [disabled]="paginaActual() === totalPaginas()" (click)="paginaActual.set(paginaActual() + 1)">Siguiente ›</button>
          </div>
        }
      }

      <!-- ========================================== -->
      <!-- TAB 2: ARCHIVO DE EJERCICIOS FISCALES     -->
      <!-- ========================================== -->
      @if (tabActiva() === 'archivoFiscal') {
        <div class="archivo-banner">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0 0 4px 0; color: var(--text-primary); display:flex; align-items:center; gap:8px;">
              🏛️ Archivo Histórico de Cierres Fiscales
              <span class="badge badge-warning" style="font-size:0.7rem;">Auditoría y Consulta</span>
            </h3>
            <p style="font-size: 0.83rem; color: var(--text-muted); margin: 0;">
              Consulta histórica permanente de obras concluidas, canceladas o eliminadas de años anteriores. Toda la información y expedientes se conservan intactos para auditoría gubernamental.
            </p>
          </div>
          <div class="archivo-count-badge">
            <span class="count-num">{{ obrasArchivadas().length }}</span>
            <span class="count-lbl">Obras en Archivo</span>
          </div>
        </div>

        <!-- Filtros Archivo Fiscal -->
        <div class="hg-filters">
          <div class="filter-group">
            <label class="filter-label">📅 Ejercicio Fiscal</label>
            <select
              class="filter-input"
              [ngModel]="filtroEjercicio()"
              (ngModelChange)="filtroEjercicio.set($event); filtrarArchivo()">
              <option [ngValue]="null">Todos los ejercicios</option>
              @for (anio of ejerciciosDisponibles(); track anio) {
                <option [ngValue]="anio">Año {{ anio }}</option>
              }
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">📂 Categoría</label>
            <select
              class="filter-input"
              [ngModel]="filtroCategoria()"
              (ngModelChange)="filtroCategoria.set($event); filtrarArchivo()">
              <option value="">Todas las categorías</option>
              <option value="Pavimentación">Pavimentación</option>
              <option value="Agua Potable">Agua Potable</option>
              <option value="Drenaje">Drenaje</option>
              <option value="Electrificación">Electrificación</option>
              <option value="Educación">Educación</option>
              <option value="Salud">Salud</option>
              <option value="Infraestructura">Infraestructura</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">📅 Mes de Registro</label>
            <select
              class="filter-input"
              [ngModel]="filtroMes()"
              (ngModelChange)="filtroMes.set($event); filtrarArchivo()">
              <option [ngValue]="null">Todos los meses</option>
              <option [ngValue]="1">Enero</option>
              <option [ngValue]="2">Febrero</option>
              <option [ngValue]="3">Marzo</option>
              <option [ngValue]="4">Abril</option>
              <option [ngValue]="5">Mayo</option>
              <option [ngValue]="6">Junio</option>
              <option [ngValue]="7">Julio</option>
              <option [ngValue]="8">Agosto</option>
              <option [ngValue]="9">Septiembre</option>
              <option [ngValue]="10">Octubre</option>
              <option [ngValue]="11">Noviembre</option>
              <option [ngValue]="12">Diciembre</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label">🏷️ Estatus al Cierre</label>
            <select
              class="filter-input"
              [ngModel]="filtroEstatus()"
              (ngModelChange)="filtroEstatus.set($event); filtrarArchivo()">
              <option value="">Todos los estatus</option>
              <option value="COMPLETADA">Completadas / Cierre Fiscal</option>
              <option value="CANCELADA">Canceladas</option>
              <option value="ELIMINADA">Eliminadas</option>
            </select>
          </div>

          <div class="filter-group" style="flex: 1; min-width: 200px;">
            <label class="filter-label">🔍 Buscar texto (Opcional)</label>
            <input
              class="filter-input"
              type="text"
              style="width: 100%;"
              placeholder="Opcional: escribir código, nombre o contratista..."
              [ngModel]="filtroBusqueda()"
              (ngModelChange)="filtroBusqueda.set($event); filtrarArchivo()"
            />
          </div>

          <button class="btn-limpiar" (click)="limpiarFiltrosArchivo()">✕ Limpiar</button>
        </div>

        <!-- Tabla Archivo Fiscal -->
        <div class="hg-table-wrap">
          <table class="hg-table">
            <thead>
              <tr>
                <th>Código / Ejercicio</th>
                <th>Nombre de la Obra</th>
                <th>Categoría</th>
                <th>Monto Contratado</th>
                <th>Contratista</th>
                <th>Estatus al Cierre</th>
                <th>Nota Fiscal</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (ob of obrasArchivadas(); track ob.id) {
                <tr class="hg-row">
                  <td>
                    <div style="display:flex; flex-direction:column; gap:2px;">
                      <strong style="color:var(--text-primary); font-family:monospace; font-size:0.85rem;">{{ ob.codigo }}</strong>
                      <span class="badge badge-ejercicio">Año {{ ob.ejercicioFiscal || '—' }}</span>
                    </div>
                  </td>
                  <td>
                    <div style="font-weight:600; color:var(--text-primary); max-width:240px; line-height:1.3;">
                      {{ ob.nombre }}
                    </div>
                    <small style="color:var(--text-muted); font-size:0.75rem;">
                      Inicio: {{ ob.fechaInicio | date:'dd/MM/yyyy' }} · Fin: {{ ob.fechaFin | date:'dd/MM/yyyy' }}
                    </small>
                  </td>
                  <td>
                    <span class="badge" style="background:rgba(59,130,246,0.12); color:#60a5fa;">
                      {{ ob.categoria || 'Sin categoría' }}
                    </span>
                  </td>
                  <td style="font-weight:700; color:var(--accent);">
                    {{ ob.monto | currency:'MXN':'symbol-narrow':'1.0-2' }}
                  </td>
                  <td style="color:var(--text-secondary); font-size:0.82rem;">
                    {{ ob.contratista || 'No especificado' }}
                  </td>
                  <td>
                    @if (ob.estatus === 'COMPLETADA' || ob.estatus === 'FINALIZADA') {
                      <span class="badge badge-completada">✅ Completada</span>
                    } @else if (ob.estatus === 'CANCELADA') {
                      <span class="badge badge-cancelada">⛔ Cancelada</span>
                    } @else if (ob.estatus === 'ELIMINADA') {
                      <span class="badge badge-eliminada">🗑️ Eliminada</span>
                    } @else {
                      <span class="badge badge-ejercicio">{{ ob.estatus }}</span>
                    }
                  </td>
                  <td>
                    <small style="color:var(--text-muted); font-style:italic; font-size:0.75rem; max-width:200px; display:block;">
                      {{ ob.notaCierreFiscal || 'Cierre fiscal de ejercicio' }}
                    </small>
                  </td>
                  <td>
                    <button class="btn-ver-obra" (click)="verDetalleHistorico(ob)">
                      👁️ Ficha Histórica
                    </button>
                  </td>
                </tr>
              }
              @if (obrasArchivadas().length === 0) {
                <tr>
                  <td colspan="8" class="hg-empty">
                    🏛️ No hay obras archivadas que coincidan con los filtros seleccionados.<br>
                    <small style="color:var(--text-muted)">Realiza un Cierre Fiscal desde <strong>⚙️ Administración</strong> para archivar obras de un año específico.</small>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Modal de Consulta Histórica (Solo Lectura) -->
      @if (obraSeleccionadaModal) {
        <div class="modal-backdrop animate-fade-in" (click)="cerrarModalHistorico()">
          <div class="modal-card animate-scale-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <span class="badge badge-ejercicio" style="margin-bottom:6px; display:inline-block;">
                  🏛️ EXPEDIENTE FISCAL ARCHIVADO · EJERCICIO {{ obraSeleccionadaModal.ejercicioFiscal }}
                </span>
                <h2 style="font-size:1.25rem; font-weight:800; color:var(--text-primary); margin:0;">
                  {{ obraSeleccionadaModal.nombre }}
                </h2>
                <small style="color:var(--accent); font-family:monospace; font-size:0.85rem;">
                  Código: {{ obraSeleccionadaModal.codigo }}
                </small>
              </div>
              <button class="modal-close-btn" (click)="cerrarModalHistorico()">✕</button>
            </div>

            <div class="modal-body">
              <div class="info-grid">
                <div class="info-cell">
                  <span class="info-lbl">Monto Contratado</span>
                  <span class="info-val" style="color:var(--accent); font-size:1.1rem;">
                    {{ obraSeleccionadaModal.monto | currency:'MXN':'symbol-narrow':'1.0-2' }}
                  </span>
                </div>
                <div class="info-cell">
                  <span class="info-lbl">Categoría</span>
                  <span class="info-val">{{ obraSeleccionadaModal.categoria || 'No asignada' }}</span>
                </div>
                <div class="info-cell">
                  <span class="info-lbl">Contratista Asignado</span>
                  <span class="info-val">{{ obraSeleccionadaModal.contratista || 'No registrado' }}</span>
                </div>
                <div class="info-cell">
                  <span class="info-lbl">Estatus al Cierre</span>
                  <span class="info-val">
                    <strong>{{ obraSeleccionadaModal.estatus }}</strong>
                  </span>
                </div>
                <div class="info-cell">
                  <span class="info-lbl">Período de Ejecución</span>
                  <span class="info-val">
                    {{ obraSeleccionadaModal.fechaInicio | date:'dd/MM/yyyy' }} — {{ obraSeleccionadaModal.fechaFin | date:'dd/MM/yyyy' }}
                  </span>
                </div>
                <div class="info-cell">
                  <span class="info-lbl">Ubicación / Dirección</span>
                  <span class="info-val">{{ obraSeleccionadaModal.direccion || 'Sin dirección' }}</span>
                </div>
              </div>

              @if (obraSeleccionadaModal.descripcion) {
                <div class="info-section">
                  <h4 class="sec-subtitle">Descripción de la Obra</h4>
                  <p class="sec-text">{{ obraSeleccionadaModal.descripcion }}</p>
                </div>
              }

              @if (obraSeleccionadaModal.beneficiarios || obraSeleccionadaModal.impactoSocial) {
                <div class="info-section">
                  <h4 class="sec-subtitle">Impacto Social y Beneficiarios</h4>
                  <p class="sec-text"><strong>Beneficiarios:</strong> {{ obraSeleccionadaModal.beneficiarios || 'No especificados' }}</p>
                  <p class="sec-text"><strong>Impacto:</strong> {{ obraSeleccionadaModal.impactoSocial || 'No especificado' }}</p>
                </div>
              }

              <div class="info-section" style="background:rgba(232,160,32,0.06); border-left:3px solid var(--accent); padding:12px; border-radius:6px;">
                <h4 class="sec-subtitle" style="color:var(--accent); margin-bottom:4px;">Nota de Cierre Fiscal</h4>
                <p class="sec-text" style="margin:0;">{{ obraSeleccionadaModal.notaCierreFiscal || 'Obra archivada formalmente en Cierre de Ejercicio Fiscal.' }}</p>
              </div>
            </div>

            <div class="modal-footer">
              <span style="font-size:0.78rem; color:var(--text-muted);">
                🔒 Registro histórico de sólo lectura. Los expedientes no pueden ser alterados.
              </span>
              <button class="btn-modal-close" (click)="cerrarModalHistorico()">Cerrar Ficha</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .hg-wrapper { display: flex; flex-direction: column; gap: 20px; }
    .hg-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
    .hg-title { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; }
    .hg-subtitle { font-size: 0.82rem; color: var(--text-muted); }

    /* Tabs */
    .hg-tabs { display: flex; gap: 8px; background: var(--bg-surface); padding: 4px; border-radius: 10px; border: 1px solid var(--border); }
    .tab-btn {
      background: transparent; border: none; color: var(--text-muted);
      padding: 8px 16px; border-radius: 8px; font-size: 0.84rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s ease;
    }
    .tab-btn:hover { color: var(--text-primary); }
    .tab-btn.active { background: var(--bg-card); color: var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }

    /* Archivo Banner */
    .archivo-banner {
      display: flex; justify-content: space-between; align-items: center;
      background: linear-gradient(135deg, rgba(232,160,32,0.08) 0%, var(--bg-surface) 100%);
      border: 1px solid rgba(232,160,32,0.25); border-radius: var(--radius-lg);
      padding: 16px 20px; gap: 16px; flex-wrap: wrap;
    }
    .archivo-count-badge {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: var(--bg-dark); border: 1px solid var(--border);
      border-radius: 10px; padding: 10px 18px; min-width: 110px;
    }
    .count-num { font-size: 1.3rem; font-weight: 800; color: var(--accent); line-height: 1; }
    .count-lbl { font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; font-weight: 600; text-transform: uppercase; }

    /* Filters */
    .hg-filters {
      display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap;
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 16px 20px;
    }
    .filter-group { display: flex; flex-direction: column; gap: 6px; }
    .filter-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; letter-spacing: 0.04em; }
    .filter-input {
      background: var(--bg-dark); border: 1px solid var(--border);
      color: var(--text-primary); border-radius: 8px;
      padding: 8px 12px; font-size: 0.85rem; min-width: 170px;
      font-family: inherit; transition: border-color 0.2s;
    }
    .filter-input:focus { outline: none; border-color: var(--accent); }
    .btn-limpiar {
      background: transparent; border: 1px solid var(--border);
      color: var(--text-muted); border-radius: 8px; padding: 8px 14px;
      font-size: 0.82rem; cursor: pointer; transition: all 0.2s; align-self: flex-end;
    }
    .btn-limpiar:hover { border-color: var(--danger); color: var(--danger); }

    /* Table */
    .hg-table-wrap {
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); overflow: hidden;
    }
    .hg-table { width: 100%; border-collapse: collapse; }
    .hg-table thead tr { background: rgba(0,0,0,0.25); }
    .hg-table th {
      text-align: left; padding: 13px 16px;
      font-size: 0.75rem; font-weight: 700; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
    }
    .hg-row { border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; }
    .hg-row:hover { background: rgba(255,255,255,0.03); }
    .hg-row td { padding: 12px 16px; font-size: 0.83rem; color: var(--text-secondary); vertical-align: middle; }
    .hg-fecha { color: var(--text-muted) !important; font-size: 0.78rem !important; white-space: nowrap; }
    .hg-usuario { display: flex; align-items: center; gap: 8px; color: var(--text-primary) !important; font-weight: 500; }
    .hg-desc { max-width: 260px; }
    .hg-obra { color: var(--accent) !important; font-size: 0.78rem !important; max-width: 180px; }
    .hg-modulo { font-weight: 600; color: var(--text-primary) !important; }
    .hg-empty { text-align: center; padding: 40px; color: var(--text-muted); line-height: 1.6; }

    .avatar-mini {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 50%;
      background: rgba(232,160,32,0.2); color: var(--accent);
      font-size: 0.68rem; font-weight: 700; flex-shrink: 0;
    }
    .badge-rol {
      padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; text-transform: capitalize;
    }
    .badge-rol[data-rol="admin"]     { background: rgba(99,102,241,0.15); color: #818CF8; }
    .badge-rol[data-rol="residente"] { background: rgba(45,212,191,0.12); color: #2DD4BF; }
    .badge-rol[data-rol="lector"]    { background: rgba(148,163,184,0.12); color: #94A3B8; }

    .badge-accion {
      padding: 3px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;
    }
    .badge-accion[data-accion="Crear"]    { background: rgba(45,212,191,0.15);  color: #2DD4BF; }
    .badge-accion[data-accion="Editar"]   { background: rgba(232,160,32,0.15);  color: #E8A020; }
    .badge-accion[data-accion="Eliminar"] { background: rgba(239,68,68,0.15);   color: #EF4444; }
    .badge-accion[data-accion="Ver"]      { background: rgba(59,130,246,0.15);  color: #60A5FA; }
    .badge-accion[data-accion="Subir"]    { background: rgba(99,102,241,0.15);  color: #818CF8; }

    /* Fiscal Badges */
    .badge-ejercicio {
      background: rgba(232, 160, 32, 0.15); color: var(--accent);
      padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; width: fit-content;
    }
    .badge-completada { background: rgba(45,212,191,0.15); color: #2dd4bf; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
    .badge-cancelada { background: rgba(239,68,68,0.15); color: #ef4444; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
    .badge-eliminada { background: rgba(100,116,139,0.2); color: #94a3b8; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }

    .btn-ver-obra {
      background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.3);
      color: #60a5fa; border-radius: 6px; padding: 6px 12px; font-size: 0.8rem;
      font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap;
    }
    .btn-ver-obra:hover { background: rgba(59,130,246,0.25); color: #93c5fd; }

    .btn-cierre-action {
      background: linear-gradient(135deg, #d97706, #b45309);
      border: none;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }
    .btn-cierre-action:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(217, 119, 6, 0.45);
    }

    /* Pagination */
    .hg-pagination {
      display: flex; align-items: center; justify-content: center; gap: 16px;
      padding: 12px 0;
    }
    .pag-btn {
      background: var(--bg-surface); border: 1px solid var(--border);
      color: var(--text-primary); border-radius: 8px;
      padding: 7px 16px; font-size: 0.83rem; cursor: pointer; transition: all 0.2s;
    }
    .pag-btn:hover:not([disabled]) { border-color: var(--accent); color: var(--accent); }
    .pag-btn[disabled] { opacity: 0.35; cursor: not-allowed; }
    .pag-info { font-size: 0.83rem; color: var(--text-muted); }

    /* Modal Ficha Histórica */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
      z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .modal-card {
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius: var(--radius-xl, 20px); width: 100%; max-width: 680px;
      max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 20px 24px; border-bottom: 1px solid var(--border);
    }
    .modal-close-btn {
      background: none; border: none; font-size: 1.2rem; color: var(--text-muted);
      cursor: pointer; padding: 4px 8px; border-radius: 6px;
    }
    .modal-close-btn:hover { color: var(--text-primary); }
    .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
    .info-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
    }
    .info-cell {
      background: var(--bg-dark); padding: 12px 14px; border-radius: 8px;
      border: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px;
    }
    .info-lbl { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
    .info-val { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); }
    .info-section { display: flex; flex-direction: column; gap: 6px; }
    .sec-subtitle { font-size: 0.88rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .sec-text { font-size: 0.84rem; color: var(--text-secondary); line-height: 1.5; margin: 0; }
    .modal-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 24px; border-top: 1px solid var(--border); background: var(--bg-dark);
      border-bottom-left-radius: var(--radius-xl, 20px); border-bottom-right-radius: var(--radius-xl, 20px);
    }
    .btn-modal-close {
      background: var(--bg-surface); border: 1px solid var(--border);
      color: var(--text-primary); padding: 8px 18px; border-radius: 8px;
      font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .btn-modal-close:hover { border-color: var(--accent); color: var(--accent); }
  `]
})
export class HistorialGeneralComponent implements OnInit {
  private bitacoraService = inject(BitacoraService);
  private obrasService = inject(ObrasService);
  public auth = inject(AuthService);

  tabActiva = signal<'bitacora' | 'archivoFiscal'>('bitacora');

  // Bitácora state
  filtroTexto  = signal('');
  filtroAccion = signal('');
  filtroModulo = signal('');
  paginaActual = signal(1);
  cargando     = signal(true);
  porPagina    = 10;
  modulos = ['Dashboard', 'Expediente', 'Obras', 'Mapa', 'Admin'];
  private _todas = signal<EntradaBitacora[]>([]);

  // Archivo Fiscal state
  filtroEjercicio = signal<number | null>(null);
  filtroCategoria = signal<string>('');
  filtroMes = signal<number | null>(null);
  filtroEstatus = signal<string>('');
  filtroBusqueda = signal<string>('');
  ejerciciosDisponibles = signal<number[]>([]);
  obrasArchivadas = signal<ObraResponse[]>([]);
  obraSeleccionadaModal: ObraResponse | null = null;

  isAdminOrAuditor = computed(() => {
    return this.auth.hasRole('admin', 'lector') ||
      this.auth.usuario()?.roles.includes('ADMINISTRADOR') ||
      this.auth.usuario()?.roles.includes('AUDITOR');
  });

  esAdmin = computed(() => {
    return this.auth.hasRole('admin') || this.auth.usuario()?.roles.includes('ADMINISTRADOR');
  });

  iniciarCierreFiscalDesdeHistorial() {
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();
    const esDiciembre = (mesActual === 12);

    if (!esDiciembre) {
      Swal.fire({
        title: '📅 Cierre Fiscal Permitido en Diciembre',
        html: `
          <div style="text-align: left; font-size: 0.9rem; line-height: 1.5; color: #cbd5e1;">
            <p>Por normativa de la administración pública y contabilidad gubernamental, el <strong>Cierre de Ejercicio Fiscal</strong> únicamente está autorizado a ejecutarse en el último mes del año (<strong>Diciembre</strong>).</p>
            <p style="color: #f59e0b; margin-top: 8px;">Actualmente nos encontramos en el <strong>Mes ${mesActual}</strong>.</p>
            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 12px 0;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:#93c5fd; font-size:0.85rem;">
              <input type="checkbox" id="chkForzarHistorial" style="cursor:pointer;" />
              Habilitar Cierre Anticipado (Modo Pruebas / Demostración)
            </label>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Continuar Cierre',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d97706',
        cancelButtonColor: '#4b5563',
        background: '#1e293b',
        color: '#f8fafc',
        preConfirm: () => {
          const chk = (document.getElementById('chkForzarHistorial') as HTMLInputElement)?.checked;
          if (!chk) {
            Swal.showValidationMessage('El cierre está bloqueado hasta Diciembre. Marca la casilla si deseas realizar una prueba anticipada.');
            return false;
          }
          return true;
        }
      }).then((result) => {
        if (result.isConfirmed) {
          this.solicitarConfirmacionCierre(anioActual, true);
        }
      });
    } else {
      this.solicitarConfirmacionCierre(anioActual, false);
    }
  }

  private solicitarConfirmacionCierre(ejercicio: number, forzar: boolean) {
    Swal.fire({
      title: `🏛️ Cierre Fiscal Ejercicio ${ejercicio}`,
      html: `
        <div style="text-align: left; font-size: 0.88rem; line-height: 1.5; color: #cbd5e1;">
          <p>⚠️ <strong>Atención Administrador:</strong> Esta acción archivará todas las obras del ejercicio <strong>${ejercicio}</strong>.</p>
          <ul style="padding-left: 18px; margin: 8px 0; display:flex; flex-direction:column; gap:4px;">
            <li>Obras en proceso o planificadas se marcarán como <strong>COMPLETADAS</strong> por cierre administrativo.</li>
            <li>Obras eliminadas y canceladas <strong>conservarán su estatus</strong> en el archivo histórico.</li>
            <li>El padrón del nuevo año quedará <strong>100% en blanco (0 obras activas)</strong>.</li>
          </ul>
          <p style="margin-top: 10px; color: #f59e0b;">Escribe la palabra de seguridad: <strong style="color:#fff;">CONFIRMAR-${ejercicio}</strong></p>
        </div>
      `,
      input: 'text',
      inputPlaceholder: `CONFIRMAR-${ejercicio}`,
      showCancelButton: true,
      confirmButtonText: '🔒 Ejecutar Cierre Ahora',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#4b5563',
      background: '#1e293b',
      color: '#f8fafc',
      preConfirm: (val) => {
        if (val !== `CONFIRMAR-${ejercicio}`) {
          Swal.showValidationMessage(`Debes escribir exactamente CONFIRMAR-${ejercicio}`);
          return false;
        }
        return true;
      }
    }).then((res) => {
      if (res.isConfirmed) {
        this.ejecutarCierreConfirmado(ejercicio, forzar);
      }
    });
  }

  private ejecutarCierreConfirmado(ejercicio: number, forzar: boolean) {
    this.obrasService.ejecutarCierreFiscal(ejercicio, forzar).subscribe({
      next: (res) => {
        Swal.fire({
          title: '✅ Cierre Fiscal Concluido',
          html: `El ejercicio fiscal <strong>${ejercicio}</strong> ha sido cerrado exitosamente.<br><br>Se han archivado <strong>${res.obrasArchivadas} obras</strong>.<br>El padrón activo para el nuevo año está listo y limpio.<br><br>Ya puedes consultar todas las obras archivadas aquí mismo en esta pestaña.`,
          icon: 'success',
          confirmButtonColor: '#10b981',
          background: '#1e293b',
          color: '#f8fafc'
        });
        this.cargarEjerciciosDisponibles();
        this.filtrarArchivo();
      },
      error: (err) => {
        Swal.fire({
          title: 'Error en Cierre',
          text: err.error?.message || 'No fue posible ejecutar el cierre fiscal.',
          icon: 'error',
          confirmButtonColor: '#ef4444',
          background: '#1e293b',
          color: '#f8fafc'
        });
      }
    });
  }

  ngOnInit() {
    this.cargarBitacora();
    if (this.isAdminOrAuditor()) {
      this.cargarEjerciciosDisponibles();
    }
  }

  cambiarTab(tab: 'bitacora' | 'archivoFiscal') {
    this.tabActiva.set(tab);
    if (tab === 'archivoFiscal') {
      this.filtrarArchivo();
    }
  }

  cargarBitacora() {
    this.bitacoraService.getHistorialGeneral().subscribe({
      next: (data) => { this._todas.set(data); this.cargando.set(false); },
      error: () => this.cargando.set(false)
    });
  }

  cargarEjerciciosDisponibles() {
    this.obrasService.getEjerciciosFiscales().subscribe({
      next: (ejercicios) => {
        this.ejerciciosDisponibles.set(ejercicios);
      },
      error: () => {}
    });
  }

  filtrarArchivo() {
    this.obrasService.getArchivoFiscal({
      ejercicio: this.filtroEjercicio() ?? undefined,
      categoria: this.filtroCategoria() || undefined,
      mes: this.filtroMes() ?? undefined,
      estatus: this.filtroEstatus() || undefined,
      query: this.filtroBusqueda() || undefined
    }).subscribe({
      next: (obras) => this.obrasArchivadas.set(obras),
      error: (err) => console.error('Error cargando archivo fiscal', err)
    });
  }

  limpiarFiltrosArchivo() {
    this.filtroEjercicio.set(null);
    this.filtroCategoria.set('');
    this.filtroMes.set(null);
    this.filtroEstatus.set('');
    this.filtroBusqueda.set('');
    this.filtrarArchivo();
  }

  verDetalleHistorico(obra: ObraResponse) {
    this.obraSeleccionadaModal = obra;
  }

  cerrarModalHistorico() {
    this.obraSeleccionadaModal = null;
  }

  entradasFiltradas = computed(() => {
    const txt = this.filtroTexto().toLowerCase().trim();
    const acc = this.filtroAccion() as AccionBitacora | '';
    const mod = this.filtroModulo();
    return this._todas().filter(e =>
      (!txt || e.usuario.toLowerCase().includes(txt) || e.descripcion.toLowerCase().includes(txt) || e.modulo.toLowerCase().includes(txt)) &&
      (!acc || e.accion === acc) &&
      (!mod || e.modulo === mod)
    );
  });

  totalEntradas  = computed(() => this.entradasFiltradas().length);
  totalPaginas   = computed(() => Math.max(1, Math.ceil(this.totalEntradas() / this.porPagina)));
  entradasPagina = computed(() => {
    const ini = (this.paginaActual() - 1) * this.porPagina;
    return this.entradasFiltradas().slice(ini, ini + this.porPagina);
  });

  limpiarFiltrosBitacora() {
    this.filtroTexto.set('');
    this.filtroAccion.set('');
    this.filtroModulo.set('');
    this.paginaActual.set(1);
  }

  fmtFecha(d: Date): string {
    return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
