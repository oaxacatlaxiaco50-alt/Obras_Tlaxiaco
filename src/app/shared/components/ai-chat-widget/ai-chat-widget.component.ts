import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AiChatService, AiChatResponse } from '../../../core/services/ai-chat.service';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  suggestedFollowUps?: string[];
}

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat-widget.component.html',
  styleUrl: './ai-chat-widget.component.css'
})
export class AiChatWidgetComponent implements AfterViewChecked {
  authService = inject(AuthService);
  private aiChatService = inject(AiChatService);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  isOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  userMessage = signal<string>('');
  conversationId = signal<string>('');

  messages = signal<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: '¡Hola! 👋 Soy tu **Asistente de IA (Gemma / Spring AI)** para la supervisión de Obras Públicas. Puedes preguntarme sobre resumen de obras, presupuestos, expedientes técnicos o geolocalización.',
      timestamp: new Date(),
      suggestedFollowUps: [
        '📊 Resumen general de obras',
        '📁 ¿Qué documentos faltan en expedientes?',
        '📸 ¿Cómo subir avances fotográficos?'
      ]
    }
  ]);

  // Restringir visibilidad exclusivamente a ADMINISTRADOR y SUPERVISOR
  canAccessAi = signal<boolean>(false);

  constructor() {
    this.checkPermission();
  }

  checkPermission() {
    const isAllowed = this.authService.hasRole('ADMINISTRADOR', 'SUPERVISOR', 'admin', 'residente');
    this.canAccessAi.set(isAllowed);
  }

  toggleChat() {
    this.isOpen.update(v => !v);
  }

  sendMessage(textToSend?: string) {
    const text = textToSend || this.userMessage().trim();
    if (!text || this.isLoading()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date()
    };

    this.messages.update(msgs => [...msgs, userMsg]);
    this.userMessage.set('');
    this.isLoading.set(true);

    this.aiChatService.sendMessage({
      message: text,
      conversationId: this.conversationId()
    }).subscribe({
      next: (res: AiChatResponse) => {
        this.conversationId.set(res.conversationId);
        const aiMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'ai',
          text: res.response,
          timestamp: new Date(res.timestamp || Date.now()),
          suggestedFollowUps: res.suggestedFollowUps
        };
        this.messages.update(msgs => [...msgs, aiMsg]);
        this.isLoading.set(false);
      },
      error: (err) => {
        const errorMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'ai',
          text: '❌ Lo siento, ocurrió un problema al conectar con el motor de IA. Por favor, verifica que el backend esté activo.',
          timestamp: new Date()
        };
        this.messages.update(msgs => [...msgs, errorMsg]);
        this.isLoading.set(false);
      }
    });
  }

  clearChat() {
    this.messages.set([
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: 'Historial reiniciado. ¿En qué más te puedo asistir?',
        timestamp: new Date(),
        suggestedFollowUps: [
          '📊 Resumen general de obras',
          '🗺️ Geolocalización de obras en el mapa'
        ]
      }
    ]);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }
}
