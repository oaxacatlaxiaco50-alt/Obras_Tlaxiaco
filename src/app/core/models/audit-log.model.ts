export interface AuditLog {
  id: number;
  username: string;
  action: string;
  module: string;
  timestamp: string;
  ip: string;
  previousData?: string;
  newData?: string;
}

export interface AuditLogPage {
  content: AuditLog[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
