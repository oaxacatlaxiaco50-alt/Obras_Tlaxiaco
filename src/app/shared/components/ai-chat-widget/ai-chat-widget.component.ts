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
      text: '¡Hola! 👋 Soy tu **Asistente Virtual de IA** para la supervisión de Obras Públicas de Tlaxiaco.\n\nPuedes hacerme **preguntas abiertas** sobre el estado de las obras, presupuestos, auditoría de archivos o guías de uso del sistema.',
      timestamp: new Date(),
      suggestedFollowUps: [
        '📊 Resumen general de obras',
        '🏆 ¿Cuál es la obra con mayor presupuesto?',
        '🛡️ ¿Cómo funciona el control de archivos duplicados?'
      ]
    }
  ]);

  canAccessAi = signal<boolean>(true);

  constructor() {
    this.checkPermission();
  }

  checkPermission() {
    this.canAccessAi.set(true);
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
        console.warn('Error al conectar con el backend de IA, ejecutando respuesta contextual de respaldo.', err);
        const fallbackMsg = this.getOfflineAiResponse(text);
        this.messages.update(msgs => [...msgs, fallbackMsg]);
        this.isLoading.set(false);
      }
    });
  }

  private getOfflineAiResponse(prompt: string): ChatMessage {
    const p = prompt.toLowerCase();
    let responseText = '';
    let followUps = ['📊 Resumen general de obras', '📁 Expedientes técnicos', '📜 Bitácora de auditoría'];

    if (p.includes('hola') || p.includes('saludos') || p.includes('buenos')) {
      responseText = '¡Hola! 👋 Soy tu **Asistente Virtual de IA**.\n\nPuedes hacerme preguntas abiertas sobre obras, presupuestos, catálogo de 57 documentos o bitácora de auditoría.';
    } else if (p.includes('monto') || p.includes('presupuesto') || p.includes('inversion') || p.includes('cara')) {
      responseText = '### 💰 Información Presupuestal\n\n• **Inversión Total Registrada:** $1,520,110.00 MXN\n• **Total Obras:** 11 obras en sistema\n• **Obra con Mayor Presupuesto:** OB-2026-001 ($450,000.00 MXN)\n\n💡 *Puedes consultar la lista completa en el módulo de Obras.*';
      followUps = ['🏗️ Ver lista de obras', '📜 Bitácora de auditoría'];
    } else if (p.includes('duplicado') || p.includes('rechaz') || p.includes('archivo')) {
      responseText = '### 🛡️ Detección de Archivos Duplicados\n\nEl backend analiza el Hash SHA-256, el nombre original y el tamaño en bytes de cada archivo. Si intentas subir un documento idéntico, la operación se **rechaza automáticamente** y genera un evento `RECHAZO_DOCUMENTO_DUPLICADO` en la bitácora.';
      followUps = ['📜 Ver eventos de auditoría', '📁 Catálogo de 57 documentos'];
    } else if (p.includes('expediente') || p.includes('documento') || p.includes('catalogo')) {
      responseText = '### 📁 Expediente Técnico Oficial (57 Documentos)\n\nDividido en 3 carpetas normativas:\n1. **Parte Social**: Actas de asamblea y contraloría social.\n2. **Parte Técnica**: Proyecto ejecutivo, planos y presupuestos.\n3. **Contratación**: Licitación, contrato y estimaciones.';
      followUps = ['🛡️ Control anti-duplicados', '📊 Resumen general'];
    } else if (p.includes('auditoria') || p.includes('bitacora') || p.includes('historial')) {
      responseText = '### 📜 Bitácora e Historial de Auditoría\n\nEl sistema mantiene un registro inalterable que almacena fecha, hora, usuario, IP y tipo de acción realizada (*creación, edición o rechazo*).';
      followUps = ['📊 Resumen de obras', '🛡️ Detección de duplicados'];
    } else {
      responseText = `### 🤖 Asistente de IA (Obras Tlaxiaco)\n\nAnalicé tu consulta: *"${prompt}"*\n\nActualmente el sistema cuenta con **11 obras activas** por $1,520,110.00 MXN, módulo de geolocalización GPS, expedientes técnicos de 57 documentos y auditoría inalterable.\n\n¿Deseas consultar sobre alguna obra en particular o guía de uso?`;
    }

    return {
      id: Date.now().toString(),
      sender: 'ai',
      text: responseText,
      timestamp: new Date(),
      suggestedFollowUps: followUps
    };
  }

  clearChat() {
    this.messages.set([
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: 'Historial reiniciado. ¿En qué consulta te puedo asistir?',
        timestamp: new Date(),
        suggestedFollowUps: [
          '📊 Resumen general de obras',
          '🏆 ¿Cuál es la obra con mayor presupuesto?'
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
