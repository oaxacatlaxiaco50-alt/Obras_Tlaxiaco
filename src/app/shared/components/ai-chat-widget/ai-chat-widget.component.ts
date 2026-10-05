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
  isMaximized = signal<boolean>(false);
  userMessage = signal<string>('');
  conversationId = signal<string>('');

  // Draggable window coordinates
  positionX = signal<number | null>(null);
  positionY = signal<number | null>(null);
  isDragging = signal<boolean>(false);

  private dragStartX = 0;
  private dragStartY = 0;
  private initialX = 0;
  private initialY = 0;

  messages = signal<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: '¡Hola! 👋 Soy tu **Asistente Virtual de IA** para Obras Públicas de Tlaxiaco.\n\nPuedes hacerme preguntas sobre el estado de las obras, presupuestos, expedientes normativos o la bitácora de auditoría.',
      timestamp: new Date(),
      suggestedFollowUps: [
        '⚙️ ¿Cómo funciona el sistema?',
        '🏆 ¿Cuál es la obra con mayor presupuesto?',
        '🛡️ ¿Cómo funciona el control de duplicados?'
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

  toggleMaximize() {
    this.isMaximized.update(v => !v);
  }

  // --- DRAGGABLE FEATURE ---
  startDrag(event: MouseEvent) {
    if (this.isMaximized()) return;

    // Ignore drag if clicking on buttons in header
    const target = event.target as HTMLElement;
    if (target.closest('.header-actions') || target.closest('button')) return;

    this.isDragging.set(true);
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;

    const modal = document.getElementById('ai-chat-modal');
    if (modal) {
      const rect = modal.getBoundingClientRect();
      this.initialX = rect.left;
      this.initialY = rect.top;
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isDragging()) return;
      const deltaX = moveEvent.clientX - this.dragStartX;
      const deltaY = moveEvent.clientY - this.dragStartY;

      let newX = this.initialX + deltaX;
      let newY = this.initialY + deltaY;

      // Restrain within viewport
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const modalWidth = modal?.offsetWidth || 520;
      const modalHeight = modal?.offsetHeight || 650;

      newX = Math.max(10, Math.min(newX, windowWidth - modalWidth - 10));
      newY = Math.max(10, Math.min(newY, windowHeight - modalHeight - 10));

      this.positionX.set(newX);
      this.positionY.set(newY);
    };

    const onMouseUp = () => {
      this.isDragging.set(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  resetPosition() {
    this.positionX.set(null);
    this.positionY.set(null);
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
        console.warn('Error al conectar con el backend de IA, ejecutando respuesta de respaldo.', err);
        const fallbackMsg = this.getOfflineAiResponse(text);
        this.messages.update(msgs => [...msgs, fallbackMsg]);
        this.isLoading.set(false);
      }
    });
  }

  // --- MARKDOWN TO HTML PARSER (Elimina asteriscos y da formato limpio) ---
  formatMessageText(rawText: string): string {
    if (!rawText) return '';

    let formatted = rawText;

    // Convert Headers (### -> <h4>)
    formatted = formatted.replace(/^### (.*$)/gim, '<h4 class="ai-msg-h4">$1</h4>');
    formatted = formatted.replace(/^## (.*$)/gim, '<h3 class="ai-msg-h3">$1</h3>');

    // Convert Bold (**bold** -> <strong>)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="ai-msg-bold">$1</strong>');

    // Convert Italics (*italic* -> <em>)
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="ai-msg-italic">$1</em>');

    // Convert Code (`code` -> <code class="ai-msg-code">)
    formatted = formatted.replace(/`(.*?)`/g, '<code class="ai-msg-code">$1</code>');

    // Convert Bullet points (• or -)
    formatted = formatted.replace(/^[•\-]\s+(.*$)/gim, '<li class="ai-msg-li">$1</li>');

    // Convert Numbered list (1. item)
    formatted = formatted.replace(/^(\d+)\.\s+(.*$)/gim, '<li class="ai-msg-li-num"><span class="num-badge">$1</span> $2</li>');

    // Wrap consecutive list items
    formatted = formatted.replace(/(<li class="ai-msg-li">.*<\/li>\n?)+/g, (match) => {
      return `<ul class="ai-msg-ul">${match}</ul>`;
    });

    formatted = formatted.replace(/(<li class="ai-msg-li-num">.*<\/li>\n?)+/g, (match) => {
      return `<ol class="ai-msg-ol">${match}</ol>`;
    });

    // Convert double line breaks into paragraphs
    const lines = formatted.split(/\n{2,}/);
    formatted = lines.map(p => {
      if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol')) {
        return p;
      }
      return `<div class="ai-msg-p">${p.replace(/\n/g, '<br>')}</div>`;
    }).join('');

    return formatted;
  }

  // --- FRIENDLY DATE FORMATTING WITH DAY NAMES ---
  getFriendlyDate(d: Date | string): string {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return '';

    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const dayName = days[dateObj.getDay()];
    const dayNum = dateObj.getDate();
    const monthName = months[dateObj.getMonth()];
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');

    return `${dayName} ${dayNum} de ${monthName}, ${hours}:${minutes} hs`;
  }

  private getOfflineAiResponse(prompt: string): ChatMessage {
    const p = prompt.toLowerCase();
    let responseText = '';
    let followUps = ['⚙️ ¿Cómo funciona el sistema?', '📊 Resumen de obras', '📜 Bitácora de auditoría'];

    if (p.includes('hola') || p.includes('saludos') || p.includes('buenos')) {
      responseText = '¡Hola! 👋 Soy tu **Asistente Virtual de IA**.\n\nPuedes hacerme preguntas sobre obras, presupuestos, expedientes o auditoría.';
    } else if (p.includes('como funciona') || p.includes('funciona el sistema') || p.includes('que hace')) {
      responseText = '### ⚙️ ¿Cómo funciona el Sistema de Obras Públicas?\n\n1. **Obras**: Registro con código, presupuesto, fechas y ubicación GPS.\n2. **Expedientes**: Control de 57 documentos clasificados.\n3. **Anti-Duplicados**: Algoritmo por firma Hash (SHA-256) que rechaza archivos repetidos.\n4. **Avances**: Carga de fotos por fases (*Antes, Durante, Después*).\n5. **Geolocalización**: Mapa interactivo de Tlaxiaco.\n6. **Auditoría**: Bitácora inalterable de acciones de usuarios con fecha y hora.';
      followUps = ['📊 Resumen de obras', '🛡️ Detección de duplicados', '📁 Catálogo de expedientes'];
    } else if (p.includes('duplicado') || p.includes('rechaz') || p.includes('archivo')) {
      responseText = '### 🛡️ Detección de Archivos Duplicados\n\nEl sistema analiza el Hash SHA-256, el nombre original y el tamaño en bytes. Si intentas subir un documento idéntico, la operación se **rechaza automáticamente** y genera un evento en la bitácora (`RECHAZO_DOCUMENTO_DUPLICADO`).';
      followUps = ['📜 Ver eventos de auditoría', '📁 Catálogo de 57 documentos'];
    } else if (p.includes('monto') || p.includes('presupuesto') || p.includes('inversion') || p.includes('cara')) {
      responseText = '### 💰 Información Presupuestal\n\n• **Obra con Mayor Presupuesto:** OB-2026-001 ($450,000.00 MXN)\n• **Obra con Menor Presupuesto:** OB-2026-003 ($85,000.00 MXN)\n\n💡 *Para ver el resumen completo de inversión, solicita "resumen ejecutivo".*';
      followUps = ['🏗️ Ver lista de obras', '📊 Resumen de inversión'];
    } else if (p.includes('expediente') || p.includes('documento') || p.includes('catalogo')) {
      responseText = '### 📁 Expediente Técnico Oficial (57 Documentos)\n\nDividido en 3 carpetas normativas:\n1. **Parte Social**: Actas de asamblea y contraloría social.\n2. **Parte Técnica**: Proyecto ejecutivo y presupuestos.\n3. **Contratación**: Licitación, contrato y estimaciones.';
      followUps = ['🛡️ Control anti-duplicados', '📊 Resumen general'];
    } else if (p.includes('auditoria') || p.includes('bitacora') || p.includes('historial')) {
      responseText = '### 📜 Bitácora e Historial de Auditoría\n\nEl sistema mantiene un registro inalterable que almacena fecha, hora, usuario, IP y tipo de acción realizada (*creación, edición o rechazo*).';
      followUps = ['📊 Resumen de obras', '🛡️ Detección de duplicados'];
    } else {
      responseText = `### 🤖 Asistente de IA\n\nRespecto a: *"${prompt}"*\n\nPuedes consultarme sobre:\n• **Obras**: Lista, montos, fechas y geolocalización.\n• **Expedientes**: Estructura de documentos y control de duplicados.\n• **Auditoría**: Bitácora inalterable e historial de eventos con fechas.`;
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
          '⚙️ ¿Cómo funciona el sistema?',
          '📊 Resumen general de obras'
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
