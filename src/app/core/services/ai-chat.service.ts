import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AiChatRequest {
  message: string;
  conversationId?: string;
}

export interface AiChatResponse {
  response: string;
  conversationId: string;
  timestamp: string;
  suggestedFollowUps?: string[];
  modelName?: string;
}

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/ai/chat`;

  sendMessage(request: AiChatRequest): Observable<AiChatResponse> {
    return this.http.post<AiChatResponse>(this.API_URL, request);
  }
}
