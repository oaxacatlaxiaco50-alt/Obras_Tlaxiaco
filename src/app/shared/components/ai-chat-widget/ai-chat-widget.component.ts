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

  // Draggable window coordinates (Chat Card)
  positionX = signal<number | null>(null);
  positionY = signal<number | null>(null);
  isDragging = signal<boolean>(false);

  // Draggable Floating Trigger Button coordinates
  btnPositionX = signal<number | null>(null);
  btnPositionY = signal<number | null>(null);
  isTriggerDragging = signal<boolean>(false);

  private dragStartX = 0;
  private dragStartY = 0;
  private initialX = 0;
  private initialY = 0;

  private triggerDragStartX = 0;
  private triggerDragStartY = 0;
  private triggerInitialX = 0;
  private triggerInitialY = 0;
  private hasMovedTrigger = false;

  messages = signal<ChatMessage[]>([]);

  canAccessAi = signal<boolean>(true);

  constructor() {
    this.checkPermission();
    this.messages.set([this.buildWelcomeMessage()]);
  }

  private getCurrentRole(): string {
    const roles = this.authService.usuario()?.roles || [];
    const r = (roles[0] || 'AUDITOR').toUpperCase();
    if (r === 'ADMIN') return 'ADMINISTRADOR';
    if (r === 'RESIDENTE') return 'SUPERVISOR';
    if (r === 'LECTOR') return 'AUDITOR';
    return r;
  }

  private getInitialFollowUps(role: string): string[] {
    if (role === 'ADMINISTRADOR') {
      return [
        '👥 ¿Cómo creo un usuario?',
        '🏛️ ¿Cómo está conformado el proyecto?',
        '📊 Resumen general de obras'
      ];
    }
    if (role === 'SUPERVISOR') {
      return [
        '🏗️ ¿Cómo crear o editar una obra?',
        '📄 ¿Cómo exportar reportes PDF/Excel?',
        '🔑 ¿Qué puedo hacer con mi rol?'
      ];
    }
    if (role === 'CONTRATISTA') {
      return [
        '📤 ¿Cómo subir evidencias y avances?',
        '📁 Carpetas y Checklist de 44 requisitos',
        '🔑 ¿Qué puedo hacer con mi rol?'
      ];
    }
    return [
      '📄 ¿Qué reportes PDF y Excel puedo exportar?',
      '📊 Resumen general de obras',
      '🔑 ¿Qué puedo hacer con mi rol?'
    ];
  }

  private buildWelcomeMessage(): ChatMessage {
    const role = this.getCurrentRole();
    const username = this.authService.usuario()?.username || 'Usuario';
    return {
      id: 'welcome',
      sender: 'ai',
      text: `¡Hola **${username}** (\`${role}\`)! 👋 Soy tu **Asistente Virtual de IA** para Obras Públicas de Tlaxiaco.\n\nConozco la estructura completa del sistema y te responderé conforme a los permisos de tu rol (**${role}**).`,
      timestamp: new Date(),
      suggestedFollowUps: this.getInitialFollowUps(role)
    };
  }

  checkPermission() {
    this.canAccessAi.set(true);
  }

  toggleChat() {
    this.isOpen.update(v => {
      const nextState = !v;
      if (nextState && this.positionX() === null && this.btnPositionX() !== null) {
        this.calculateModalPositionNearBtn();
      }
      return nextState;
    });
  }

  toggleMaximize() {
    this.isMaximized.update(v => !v);
  }

  // --- DRAGGABLE TRIGGER BUTTON FEATURE ---
  startTriggerDrag(event: MouseEvent) {
    if (event.button !== 0) return;

    this.hasMovedTrigger = false;
    this.triggerDragStartX = event.clientX;
    this.triggerDragStartY = event.clientY;

    const btn = document.getElementById('ai-widget-toggle-btn');
    if (btn) {
      const rect = btn.getBoundingClientRect();
      this.triggerInitialX = rect.left;
      this.triggerInitialY = rect.top;
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - this.triggerDragStartX;
      const deltaY = moveEvent.clientY - this.triggerDragStartY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        this.hasMovedTrigger = true;
        this.isTriggerDragging.set(true);

        let newX = this.triggerInitialX + deltaX;
        let newY = this.triggerInitialY + deltaY;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const btnWidth = btn?.offsetWidth || 160;
        const btnHeight = btn?.offsetHeight || 48;

        newX = Math.max(10, Math.min(newX, windowWidth - btnWidth - 10));
        newY = Math.max(10, Math.min(newY, windowHeight - btnHeight - 10));

        this.btnPositionX.set(newX);
        this.btnPositionY.set(newY);

        // If modal is open and hasn't been manually dragged, update its position relative to button
        if (this.isOpen() && this.positionX() === null && !this.isMaximized()) {
          this.calculateModalPositionNearBtn();
        }
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (!this.hasMovedTrigger) {
        this.toggleChat();
      }
      setTimeout(() => {
        this.isTriggerDragging.set(false);
      }, 50);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  private calculateModalPositionNearBtn() {
    const btnX = this.btnPositionX();
    const btnY = this.btnPositionY();
    if (btnX === null || btnY === null) return;

    const modalWidth = 520;
    const modalHeight = 650;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let modalX = Math.max(10, Math.min(btnX, windowWidth - modalWidth - 10));
    let modalY = btnY - modalHeight - 15;

    // If not enough space above, place below
    if (modalY < 10) {
      modalY = Math.min(btnY + 60, windowHeight - modalHeight - 10);
    }

    this.positionX.set(modalX);
    this.positionY.set(modalY);
  }

  // --- DRAGGABLE CHAT WINDOW FEATURE ---
  startDrag(event: MouseEvent) {
    if (this.isMaximized()) return;

    // Ignore drag if clicking on header action buttons
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
    this.btnPositionX.set(null);
    this.btnPositionY.set(null);
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

  // --- MARKDOWN TO HTML PARSER ---
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
    const p = prompt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const role = this.getCurrentRole();
    const isAdmin = role === 'ADMINISTRADOR';
    const isSupervisor = role === 'SUPERVISOR';
    const isContratista = role === 'CONTRATISTA';
    let responseText = '';
    const followUps = this.getInitialFollowUps(role);

    if (p.includes('hola') || p.includes('saludos') || p.includes('buenos')) {
      responseText = `¡Hola! 👋 Soy tu **Asistente Virtual de IA** (\`${role}\`).\n\nPuedes consultarme sobre los módulos y acciones permitidas para tu perfil.`;
    } else if (p.includes('usuario') || p.includes('usuarios') || p.includes('administracion')) {
      responseText = isAdmin
        ? '### 👥 Gestión de Usuarios (Administrador)\n\n1. Entra a **⚙️ Administración** (`/admin`).\n2. Haz clic en **+ Nuevo Usuario**, llena los datos y elige el rol (`ADMINISTRADOR`, `SUPERVISOR`, `CONTRATISTA` o `AUDITOR`).\n3. También puedes editar, desactivar, reactivar o eliminar permanentemente usuarios inactivos sin obras asignadas.'
        : `⛔ **Acción Restringida para tu rol (\`${role}\`)**\n\nNo puedes gestionar ni consultar la administración de usuarios; es una facultad exclusiva del **ADMINISTRADOR**.`;
    } else if (p.includes('crear obra') || p.includes('nueva obra') || p.includes('editar obra') || p.includes('como creo una obra')) {
      responseText = (isAdmin || isSupervisor)
        ? '### 🏗️ Crear o Editar Obra\n\n1. Ve a **📁 Expedientes** → **+ Nueva Obra** (o **✏️ Editar Obra** dentro de un expediente).\n2. Completa los datos técnicos, presupuesto, fechas, coordenadas GPS y metas físicas.'
        : `⛔ **Acción Restringida para tu rol (\`${role}\`)**\n\nSolo el **ADMINISTRADOR** y el **SUPERVISOR** pueden crear o editar obras públicas.`;
    } else if (p.includes('reporte') || p.includes('pdf') || p.includes('excel')) {
      responseText = !isContratista
        ? '### 📄 Reportes Oficiales\n\nPuedes exportar el listado general en **PDF / Excel** desde **📁 Expedientes**, o generar la Ficha Técnica, Expediente Unitario y Excel de Avances dentro de cada obra.'
        : '⛔ **Acción Restringida para tu rol (`CONTRATISTA`)**\n\nEl rol Contratista no tiene habilitada la exportación de reportes PDF ni Excel.';
    } else if (p.includes('conformado') || p.includes('arquitectura') || p.includes('como funciona') || p.includes('funciona el sistema')) {
      responseText = '### 🏛️ Estructura del Proyecto ResidenciaObra\n\n• **Frontend (`Obras_Tlaxiaco`):** Angular 19, Leaflet (mapas/rutas), jsPDF y XLSX.\n• **Backend (`Realizacion_Obras`):** Spring Boot 3.4, JWT, BCrypt, `@PreAuthorize` por rol y PostgreSQL/JPA.\n• **Módulos:** Dashboard, Geolocalización, Expedientes (4 Carpetas + Checklist de 44 requisitos), Avances, Notificaciones e Historial.';
    } else {
      responseText = `### 🤖 Asistente de IA (\`${role}\`)\n\nNo pude conectar con el servidor de IA en este instante. Intenta nuevamente en unos segundos cuando termine de iniciar el backend.`;
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
    const role = this.getCurrentRole();
    this.messages.set([
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: `Historial reiniciado (\`${role}\`). ¿En qué consulta te puedo asistir?`,
        timestamp: new Date(),
        suggestedFollowUps: this.getInitialFollowUps(role)
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
