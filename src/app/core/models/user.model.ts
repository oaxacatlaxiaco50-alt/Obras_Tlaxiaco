export type Rol = 'ADMINISTRADOR' | 'SUPERVISOR' | 'CONTRATISTA' | 'AUDITOR';

export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  active: boolean;
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserCreateRequest {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password?: string;
  roles: string[];
}

export interface UserUpdateRequest {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  roles?: string[];
}

export interface LoginResponse {
  token: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}
