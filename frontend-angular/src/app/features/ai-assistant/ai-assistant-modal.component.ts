import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage, ScheduleInterval, UTPCurrentInterval } from '@domain/models/utp.model';
import { DailyLimitStatus, getClientDailyLimitStatus, incrementClientDailyUsage } from '@data/rate-limit/daily-limiter';
import { AuthService } from '@data/services/auth.service';
import { ScheduleService } from '@data/services/schedule.service';
import { SyllabusService } from '@data/services/syllabus.service';
import { AiAssistantService } from '@data/services/ai-assistant.service';
import { MEME_STICKERS, MemeSticker } from '@data/constants/stickers.config';
import { MatrixOrbComponent } from './matrix-orb.component';
import { ChatMessageBubbleComponent } from './chat-message-bubble.component';

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `¡Hola! Soy tu **Copiloto Académico UTP**. Tengo acceso en tiempo real a tu horario, cursos matriculados, docentes y el temario de cada semana.

¿En qué te puedo ayudar hoy?`,
  timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
  suggestions: [
    '¿Qué clases tengo hoy y en qué aula?',
    '¿Qué temas tocan esta semana según el sílabo?',
    '¿Cuáles son mis próximas evaluaciones y porcentajes?',
    '¿Cómo calculo mi promedio con las fórmulas del curso?',
  ],
};

@Component({
  selector: 'app-ai-assistant-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatrixOrbComponent, ChatMessageBubbleComponent],
  template: `
    @if (isOpen) {
      <div 
        class="fixed inset-0 z-50 flex items-center justify-center font-sans transition-all duration-300 ease-out"
        [ngClass]="isExpanded ? 'p-0 bg-[#0a0a0c]' : 'p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md'"
        (click)="onBackdropClick($event)"
      >
        <div 
          class="relative flex flex-col w-full text-white overflow-hidden transition-all duration-300 ease-out"
          [ngClass]="isExpanded 
            ? 'w-full h-full rounded-none bg-[#0a0a0c] shadow-none border-none' 
            : 'w-full max-w-2xl h-[88vh] sm:h-[82vh] rounded-3xl bg-[#0e0e12] shadow-2xl border border-white/5'"
          (click)="$event.stopPropagation()"
        >
          
          <!-- Header Superior -->
          <div 
            class="border-b border-white/5 shrink-0 transition-colors duration-300"
            [ngClass]="isExpanded ? 'bg-[#121216] px-4 sm:px-8 py-3' : 'bg-[#141418] px-4 sm:px-6 py-4'"
          >
            <div [ngClass]="isExpanded ? 'max-w-4xl mx-auto w-full flex items-center justify-between' : 'flex items-center justify-between'">
              
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="relative shrink-0 flex items-center justify-center">
                  <app-matrix-orb [size]="isExpanded ? 28 : 30" [state]="isLoading ? 'thinking' : 'idle'" [colorMode]="'monochrome'"></app-matrix-orb>
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm sm:text-base font-bold text-white tracking-tight leading-tight truncate">
                      Copiloto Académico
                    </h3>
                    @if (isExpanded) {
                      <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-neutral-300">
                        Pantalla Completa
                      </span>
                    }
                  </div>
                  <p class="text-[11px] text-neutral-400 leading-tight truncate mt-0.5">
                    Semana {{ getWeekNumber() }} de {{ getTotalWeeks() }} • {{ getPeriodName() }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <!-- Badge de Cuota de Consultas -->
                @if (quota.isUnlimited) {
                  <span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                    <span class="hidden sm:inline">Ilimitado</span>
                  </span>
                } @else {
                  <span 
                    class="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    [ngClass]="quota.remaining > 0 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'"
                  >
                    @if (quota.remaining > 0) {
                      <svg class="h-3 w-3 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      <span>{{ quota.remaining }}/{{ quota.limit }} <span class="hidden sm:inline">consultas</span></span>
                    } @else {
                      <svg class="h-3 w-3 text-rose-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span>Agotada</span>
                    }
                  </span>
                }

                <!-- Botón Toggle Pantalla Completa / Reducir -->
                <button
                  type="button"
                  (click)="toggleExpanded()"
                  [title]="isExpanded ? 'Modo ventana' : 'Pantalla completa'"
                  class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer shrink-0 border-none"
                >
                  @if (isExpanded) {
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                  } @else {
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                  }
                </button>

                <!-- Botón Reiniciar Conversación -->
                <button
                  (click)="resetConversation()"
                  title="Reiniciar conversación"
                  class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer shrink-0 border-none"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                </button>

                <!-- Botón Cerrar -->
                <button
                  (click)="closeModal()"
                  class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer shrink-0 border-none"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

            </div>
          </div>

          <!-- Banner Flotante si está expandido para volver a modo ventana -->
          @if (isExpanded) {
            <div 
              (click)="restoreExpanded()"
              class="w-full bg-[#141418]/90 hover:bg-[#18181f] text-neutral-400 hover:text-neutral-200 text-[11px] py-1 text-center cursor-pointer transition flex items-center justify-center gap-1.5 border-b border-white/5 select-none"
            >
              <svg class="h-3 w-3 animate-bounce text-[var(--accent-lime)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
              <span>Modo ventana (reducir)</span>
            </div>
          }

          <!-- Mensajes Area con Scrollbar Customizada -->
          <div 
            #messagesContainer 
            (scroll)="onMessagesScroll($event)"
            class="flex-1 overflow-y-auto px-4 sm:px-6 py-5 custom-scrollbar"
          >
            <div [ngClass]="isExpanded ? 'max-w-4xl mx-auto w-full space-y-4' : 'space-y-4'">
              @for (msg of messages; track msg.id) {
                <app-chat-message-bubble
                  [msg]="msg"
                  (sendAction)="handleSend($event)"
                  (retry)="handleRetry()"
                ></app-chat-message-bubble>
              }

              <!-- Estado de Pensamiento / Razonamiento con Matrix Orb -->
              @if (isLoading) {
                <div class="flex items-center gap-3 text-xs text-neutral-300 py-3 animate-in fade-in select-none">
                  <app-matrix-orb [size]="26" [state]="'thinking'" [colorMode]="'monochrome'"></app-matrix-orb>
                  <div class="flex flex-col">
                    <span class="font-semibold text-white">Razonando y procesando acciones...</span>
                    <span class="text-[10px] text-neutral-400">Consultando sílabo oficial, rúbricas y cronograma UTP</span>
                  </div>
                </div>
              }

              <div #messagesEndRef></div>
            </div>
          </div>

          <!-- Footer Input Area -->
          <div 
            class="p-3 sm:p-3.5 border-t border-white/5 transition-colors duration-300"
            [ngClass]="isExpanded ? 'bg-[#111115] px-4 sm:px-8' : 'bg-black/20'"
          >
            <div [ngClass]="isExpanded ? 'max-w-4xl mx-auto w-full' : 'w-full'">
              <form (ngSubmit)="handleSend()" class="flex items-center gap-2">
                <input
                  type="text"
                  [(ngModel)]="input"
                  name="chatInput"
                  placeholder="Pregúntale a tu copiloto académico..."
                  [disabled]="isLoading"
                  class="flex-1 rounded-2xl bg-black/40 border-none px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none transition"
                />
                <button
                  type="submit"
                  [disabled]="isLoading || !input.trim()"
                  class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-lime)] text-[#0a0a0c] hover:bg-[#a8e63b] disabled:opacity-40 transition shadow-lg shadow-[var(--accent-lime)]/20 active:scale-95 cursor-pointer shrink-0 border-none"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  `]
})
export class AiAssistantModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() interval: UTPCurrentInterval | ScheduleInterval | null = null;
  @Input() initialPrompt = '';
  @Output() close = new EventEmitter<void>();
  @Output() openSyllabusModal = new EventEmitter<string>();

  @ViewChild('messagesEndRef') messagesEndRef?: ElementRef<HTMLDivElement>;
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  messages: ChatMessage[] = [DEFAULT_WELCOME_MESSAGE];
  input = '';
  isLoading = false;
  isExpanded = false;
  lastUserPrompt: string | null = null;
  isStickerDrawerOpen = false;
  selectedStickerCategory = 'all';

  private lastScrollTop = 0;
  private isProgrammaticScroll = false;

  readonly stickerCategories = [
    { id: 'all', label: 'Todos' },
    { id: 'hype', label: 'Flow' },
    { id: 'study', label: 'Estudio' },
    { id: 'reaction', label: 'Reacciones' },
    { id: 'discipline', label: 'Modo Bestia' },
    { id: 'funny', label: 'Memes' },
  ];

  get filteredStickers(): MemeSticker[] {
    if (this.selectedStickerCategory === 'all') {
      return MEME_STICKERS;
    }
    return MEME_STICKERS.filter(s => s.category === this.selectedStickerCategory);
  }

  toggleStickerDrawer(): void {
    this.isStickerDrawerOpen = !this.isStickerDrawerOpen;
  }

  toggleExpanded(): void {
    if (this.isExpanded) {
      this.restoreExpanded();
    } else {
      this.expandToFullScreen();
    }
  }

  expandToFullScreen(): void {
    if (this.isExpanded) return;
    this.isProgrammaticScroll = true;
    this.isExpanded = true;
    setTimeout(() => {
      this.isProgrammaticScroll = false;
      if (this.messagesContainer?.nativeElement) {
        this.lastScrollTop = this.messagesContainer.nativeElement.scrollTop;
      }
    }, 450);
  }

  restoreExpanded(): void {
    this.isProgrammaticScroll = true;
    this.isExpanded = false;
    if (this.messagesContainer?.nativeElement) {
      this.messagesContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => {
      this.isProgrammaticScroll = false;
      this.lastScrollTop = 0;
    }, 400);
  }

  selectSticker(sticker: MemeSticker): void {
    this.isStickerDrawerOpen = false;
    const promptToSend = this.input.trim() 
      ? `${this.input.trim()} [STICKER:${sticker.id}]`
      : `[STICKER:${sticker.id}]`;
    this.handleSend(promptToSend);
  }

  quota: DailyLimitStatus = {
    isUnlimited: true,
    limit: 6,
    used: 0,
    remaining: 6,
    dateKey: '',
  };

  getWeekNumber(): number {
    if (!this.interval) return 6;
    if ('week_number' in this.interval && this.interval.week_number) return this.interval.week_number;
    if ('weekNumber' in this.interval && (this.interval as any).weekNumber) return (this.interval as any).weekNumber;
    return 6;
  }

  getTotalWeeks(): number {
    if (!this.interval) return 18;
    if ('total_weeks' in this.interval && this.interval.total_weeks) return this.interval.total_weeks;
    if ('totalWeeks' in this.interval && (this.interval as any).totalWeeks) return (this.interval as any).totalWeeks;
    return 18;
  }

  getPeriodName(): string {
    if (!this.interval) return '2026 - Ciclo 1 Marzo';
    if ('period_name' in this.interval && this.interval.period_name) return this.interval.period_name;
    if ('periodName' in this.interval && (this.interval as any).periodName) return (this.interval as any).periodName;
    return '2026 - Ciclo 1 Marzo';
  }

  constructor(
    private authService: AuthService,
    private scheduleService: ScheduleService,
    private syllabusService: SyllabusService,
    private aiService: AiAssistantService
  ) {
    this.refreshQuota();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.refreshQuota();
      this.scrollToBottom('auto');

      if (this.initialPrompt) {
        this.input = this.initialPrompt;
        this.initialPrompt = '';
      }
    }
  }

  refreshQuota(): void {
    const student = this.authService.currentStudent();
    const id = student?.studentCode || student?.username || student?.email || student?.userId || 'guest-student';
    this.quota = getClientDailyLimitStatus(id);
  }

  private getFormattedTime(): string {
    return new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(behavior: 'smooth' | 'auto' = 'smooth'): void {
    this.isProgrammaticScroll = true;
    setTimeout(() => {
      if (this.messagesEndRef?.nativeElement) {
        this.messagesEndRef.nativeElement.scrollIntoView({ behavior, block: 'end' });
      } else if (this.messagesContainer?.nativeElement) {
        const container = this.messagesContainer.nativeElement;
        container.scrollTo({
          top: container.scrollHeight,
          behavior
        });
      }
      setTimeout(() => {
        this.isProgrammaticScroll = false;
        if (this.messagesContainer?.nativeElement) {
          this.lastScrollTop = this.messagesContainer.nativeElement.scrollTop;
        }
      }, 350);
    }, 60);
  }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget && !this.isExpanded) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  onMessagesScroll(e: Event): void {
    if (this.isProgrammaticScroll) return;
    const el = e.target as HTMLElement;
    if (!el) return;

    const currentScrollTop = el.scrollTop;
    const isScrollingDown = currentScrollTop > this.lastScrollTop;

    // Expandir automáticamente si el usuario scrollea intencionalmente hacia abajo en modo ventana
    if (!this.isExpanded && isScrollingDown && currentScrollTop > 35) {
      this.expandToFullScreen();
      return;
    }

    this.lastScrollTop = currentScrollTop;
  }

  resetConversation(): void {
    this.isExpanded = false;
    this.messages = [
      {
        ...DEFAULT_WELCOME_MESSAGE,
        timestamp: this.getFormattedTime(),
      }
    ];
    this.scrollToBottom('auto');
  }

  handleRetry(): void {
    if (this.lastUserPrompt) {
      this.handleSend(this.lastUserPrompt);
    }
  }

  handleSend(textToSend?: string): void {
    const query = (textToSend || this.input).trim();
    if (!query || this.isLoading) return;

    this.refreshQuota();

    // 1. Verificación de cuota diaria en cliente
    if (!this.quota.isUnlimited && this.quota.remaining <= 0) {
      const limitMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**Has alcanzado el límite diario de 6 consultas durante la fase de pruebas.**\n\nTu cuota se reiniciará automáticamente a las 00:00. Mientras tanto, puedes explorar libremente tus pestañas de **Horario**, **Cursos**, **Networking** y **Servicios**.`,
        timestamp: this.getFormattedTime(),
      };
      this.messages.push(limitMsg);
      this.scrollToBottom('smooth');
      return;
    }

    this.lastUserPrompt = query;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: this.getFormattedTime(),
    };

    this.messages.push(userMsg);
    this.input = '';
    this.isLoading = true;
    this.isExpanded = true; // Auto expand to 100% full view on send
    this.scrollToBottom('smooth');

    const student = this.authService.currentStudent();
    const userId = student?.studentCode || student?.username || student?.email || student?.userId || 'guest-student';

    // Preparar mensaje de respuesta reactivo en el chat
    const assistantMsgId = (Date.now() + 1).toString();
    const toolsUsed: string[] = [];
    let streamedContent = '';

    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: this.getFormattedTime(),
      metadata: { toolsUsed }
    };

    let msgAdded = false;

    this.aiService.streamChat(
      query,
      (word: string) => {
        if (!msgAdded) {
          this.isLoading = false;
          this.messages.push(assistantMsg);
          msgAdded = true;
        }
        streamedContent += word;
        assistantMsg.content = streamedContent;
        this.scrollToBottom('smooth');
      },
      (toolName: string) => {
        if (!toolsUsed.includes(toolName)) {
          toolsUsed.push(toolName);
          assistantMsg.metadata = { ...assistantMsg.metadata, toolsUsed: [...toolsUsed] };
        }
        if (!msgAdded) {
          this.isLoading = false;
          this.messages.push(assistantMsg);
          msgAdded = true;
        }
        this.scrollToBottom('smooth');
      }
    ).then(() => {
      this.isLoading = false;
      this.quota = incrementClientDailyUsage(userId);
      this.scrollToBottom('smooth');
    }).catch((err) => {
      console.warn('[AiAssistantModal] Stream SSE no disponible, ejecutando fallback estándar:', err);
      // Fallback a sendMessage si SSE fallara por red
      const schedule = this.scheduleService.currentSchedule() || this.interval;
      const syllabi = this.syllabusService.syllabiMap();

      this.aiService.sendMessage(query, userId, student, schedule, syllabi).subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.success && res.data) {
            this.quota = incrementClientDailyUsage(userId);
            if (msgAdded) {
              assistantMsg.content = res.data.content;
              assistantMsg.suggestions = res.data.suggestions || res.data.suggestedActions;
              assistantMsg.contextInfo = res.data.contextInfo;
            } else {
              this.messages.push({
                id: res.data.id || (Date.now() + 1).toString(),
                role: 'assistant',
                content: res.data.content,
                timestamp: this.getFormattedTime(),
                suggestions: res.data.suggestions || res.data.suggestedActions,
                suggestedActions: res.data.suggestedActions || res.data.suggestions,
                contextInfo: res.data.contextInfo,
              });
            }
            this.scrollToBottom('smooth');
          } else {
            this.handleErrorMessage(res.error || 'No se pudo procesar la respuesta');
          }
        },
        error: (fallbackErr) => {
          this.isLoading = false;
          const msg = fallbackErr?.error?.message || fallbackErr?.message || 'Error de conexión con el copiloto';
          this.handleErrorMessage(msg);
        }
      });
    });
  }

  private executeModelAction(action: { type: string; payload: Record<string, unknown> }): void {
    if (action.type === 'OPEN_SYLLABUS' && action.payload?.['courseCode']) {
      this.openSyllabusModal.emit(action.payload['courseCode'] as string);
    }
  }

  private handleErrorMessage(errorText: string): void {
    const errorMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `No pude conectar con el copiloto en este momento (${errorText}). Por favor verifica tu conexión o intenta nuevamente.`,
      timestamp: this.getFormattedTime(),
    };
    this.messages.push(errorMsg);
    this.scrollToBottom('smooth');
  }
}
