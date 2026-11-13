export interface InstitucionConfig {
  id: number;
  nombreMunicipio: string;
  lemaOficial?: string;
  periodoAdministracion?: string;
  dependencia?: string;
  logoUrl: string;
  membreteUrl?: string | null;
  piePaginaReporte?: string;
  updatedAt?: string;
}

export interface InstitucionConfigRequest {
  nombreMunicipio: string;
  lemaOficial?: string;
  periodoAdministracion?: string;
  dependencia?: string;
  piePaginaReporte?: string;
}
