import { Injectable } from '@angular/core';

export interface UsuarioMock {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  iniciales: string;
}
export const USUARIOS_MOCK: UsuarioMock[] = [
  { id: '1', nombre: 'Ing. Carlos Mendoza',  email: 'admin@residencia.mx',      rol: 'admin',     iniciales: 'CM' },
  { id: '2', nombre: 'Arq. Laura Sánchez',   email: 'laura@residencia.mx',      rol: 'residente', iniciales: 'LS' },
  { id: '3', nombre: 'Juan Pérez',           email: 'jperez@residencia.mx',     rol: 'lector',    iniciales: 'JP' },
  { id: '4', nombre: 'Ing. Roberto Torres',  email: 'rtorres@residencia.mx',    rol: 'residente', iniciales: 'RT' },
  { id: '5', nombre: 'Arq. María González',  email: 'mgonzalez@residencia.mx',  rol: 'residente', iniciales: 'MG' },
  { id: '6', nombre: 'Lic. Ana Flores',      email: 'aflores@residencia.mx',    rol: 'residente', iniciales: 'AF' },
];

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  /** Todos los usuarios registrados */
  getUsuarios(): UsuarioMock[] {
    return USUARIOS_MOCK;
  }

  /** Solo administradores y residentes (aptos para ser responsables de obra) */
  getResponsables(): UsuarioMock[] {
    return USUARIOS_MOCK.filter(u => u.rol === 'admin' || u.rol === 'residente');
  }
}
