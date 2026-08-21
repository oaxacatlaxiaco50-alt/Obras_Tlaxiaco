import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditLog, AuditLogPage } from '../models/audit-log.model';

const API = 'http://localhost:8081/audit-logs';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private http = inject(HttpClient);

  getLogs(params: { username?: string; page?: number; size?: number } = {}): Observable<AuditLogPage> {
    let httpParams = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 20)
      .set('sort', 'timestamp,desc');
    if (params.username) httpParams = httpParams.set('username', params.username);
    return this.http.get<AuditLogPage>(API, { params: httpParams });
  }
}
