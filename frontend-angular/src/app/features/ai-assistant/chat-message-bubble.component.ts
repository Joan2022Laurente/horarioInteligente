import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage, AgentActivity } from '@domain/models/utp.model';
import { MatrixOrbComponent } from './matrix-orb.component';
import { MarkdownRendererComponent } from './markdown-renderer.component';
import { getStickerById, MemeSticker } from '@data/constants/stickers.config';

interface ToolBadge { label: string; icon: 'calendar' | 'book' | 'list' | 'check' | 'tool'; }

const TOOL_MAP: Record<string, ToolBadge> = {
  get_today_schedule:       { label: 'Horario',       icon: 'calendar' },
  get_syllabus_details:     { label: 'Sílabo',        icon: 'book'     },
  get_enrolled_courses:     { label: 'Cursos',        icon: 'list'     },
  get_upcoming_evaluations: { label: 'Evaluaciones',  icon: 'check'    },
};

@Component({
  selector: 'app-chat-message-bubble',
  standalone: true,
  imports: [CommonModule, MatrixOrbComponent, MarkdownRendererComponent],
  template: `
    @if (msg.role === 'user') {
      <!-- Mensaje del Usuario -->
      <div class="flex flex-col items-end gap-1.5 my-3">
        @if (userSticker) {
          <div class="animate-in zoom-in-95 duration-150 select-none my-1">
            <img [src]="userSticker.src" [alt]="userSticker.name" class="h-auto w-28 sm:w-36 max-w-[150px] rounded-2xl object-cover shadow-md block" />
          </div>
        }
        @if (userTextClean) {
          <div class="rounded-3xl bg-[#1e1e24] text-white px-4 py-2.5 max-w-[85%] text-xs sm:text-sm font-medium shadow-sm border-none">
            {{ userTextClean }}
          </div>
        }
        <div class="flex items-center gap-2 pr-2 text-neutral-500 text-[10px]">
          <button
            (click)="handleCopy()"
            title="Copiar texto"
            class="hover:text-white transition flex items-center gap-1 bg-transparent border-none cursor-pointer text-neutral-500"
          >
            @if (copied) {
              <svg class="h-3 w-3 text-[#bbf451]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            } @else {
              <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            }
          </button>
          <span>{{ msg.timestamp }}</span>
        </div>
      </div>
    } @else {
      <!-- Mensaje del Asistente -->
      <div class="flex flex-col gap-2.5 my-4 text-neutral-200 animate-in fade-in duration-150 text-left">

        <!-- Cabecera sutil del Asistente -->
        <div class="flex items-center gap-2 select-none">
          <app-matrix-orb [size]="26" [state]="msg.currentActivity ? 'thinking' : 'idle'" [colorMode]="'monochrome'"></app-matrix-orb>
          <span class="text-[11px] font-bold text-neutral-400">Copiloto UTP</span>
        </div>

        <!-- Indicador en tiempo real de actividad del agente (Píldora brillante dinámica) -->
        @if (msg.currentActivity) {
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25 backdrop-blur-sm animate-pulse w-fit my-0.5">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span class="tracking-wide">{{ msg.currentActivity.label }}</span>
          </div>
        }

        <!-- Resumen colapsable de acciones completadas (Drawer moderno estilo Gemini/ChatGPT) -->
        @if (completedActivities.length > 0) {
          <div class="my-0.5">
            <button
              type="button"
              (click)="toggleActivities()"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-neutral-400 hover:text-neutral-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 transition cursor-pointer select-none"
            >
              <svg class="h-3 w-3 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>{{ completedActivities.length }} {{ completedActivities.length === 1 ? 'acción completada' : 'acciones completadas' }}</span>
              <svg class="h-3 w-3 opacity-60 transition-transform duration-200" [class.rotate-180]="activitiesOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            @if (activitiesOpen) {
              <div class="mt-2 pl-2.5 border-l border-neutral-700/60 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                @for (act of completedActivities; track act.id) {
                  <div class="flex items-center gap-2 text-[11px] text-neutral-300 py-0.5">
                    @if (act.phase === 'done') {
                      <svg class="h-2.5 w-2.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    } @else if (act.phase === 'error') {
                      <span class="text-rose-400 font-bold text-[10px]">✕</span>
                    } @else {
                      <span class="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>
                    }
                    <span>{{ act.label }}</span>
                    @if (act.durationMs) {
                      <span class="text-[10px] text-neutral-500 font-mono">({{ act.durationMs }}ms)</span>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Contenido conversacional del Asistente -->
        @if (assistantContent) {
          <div class="w-full text-neutral-200 block pt-0.5">
            <app-markdown-renderer [content]="assistantContent"></app-markdown-renderer>
          </div>
        }

        <!-- Badges de herramientas fallback si no hay drawer de actividades -->
        @if (toolBadges().length > 0) {
          <div class="flex flex-wrap gap-1.5 mt-0.5">
            @for (badge of toolBadges(); track badge.label) {
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-800/50 text-neutral-500 border border-neutral-700/40 select-none tracking-wide">
                {{ badge.label }}
              </span>
            }
          </div>
        }

        <!-- Enlace a Zoom si aplica -->
        @if (msg.contextInfo?.zoomLink) {
          <div class="mt-2">
            <a
              [href]="msg.contextInfo?.zoomLink"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-neutral-200 text-black px-4 py-2 text-xs font-bold transition shadow no-underline cursor-pointer"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
              <span>Unirse a Zoom</span>
            </a>
          </div>
        }

        <!-- Chips sugeridos de inicio o acción rápida -->
        @if (chips.length > 0) {
          <div class="flex flex-wrap gap-2 pt-2">
            @for (action of chips; track action) {
              <button
                (click)="sendAction.emit(action)"
                class="inline-flex items-center gap-1.5 rounded-full bg-[#18181f] hover:bg-white hover:text-black px-3.5 py-1.5 text-xs font-medium text-neutral-300 transition-all shadow-sm active:scale-95 border-none cursor-pointer"
              >
                <span>{{ action }}</span>
                <svg class="h-3 w-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            }
          </div>
        }

        <!-- Barra de acciones: Copiar, Reintentar -->
        @if (!isWelcome) {
          <div class="flex items-center gap-3 pt-0.5 text-neutral-500 text-xs">
            <button
              (click)="handleCopy()"
              title="Copiar respuesta"
              class="hover:text-white transition flex items-center gap-1 text-[11px] bg-transparent border-none cursor-pointer text-neutral-500"
            >
              @if (copied) {
                <svg class="h-3.5 w-3.5 text-[#bbf451]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span class="text-[#bbf451]">Copiado</span>
              } @else {
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                <span>Copiar</span>
              }
            </button>

            <button
              (click)="retry.emit()"
              title="Reintentar respuesta"
              class="hover:text-white transition flex items-center gap-1 text-[11px] bg-transparent border-none cursor-pointer text-neutral-500"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              <span>Reintentar</span>
            </button>

            <span class="text-[10px] text-neutral-600 font-mono ml-auto">
              {{ msg.timestamp }}
            </span>
          </div>
        }

      </div>
    }
  `
})
export class ChatMessageBubbleComponent {
  @Input({ required: true }) msg!: ChatMessage;
  @Output() sendAction = new EventEmitter<string>();
  @Output() retry = new EventEmitter<void>();

  copied = false;
  activitiesOpen = false;

  toggleActivities(): void {
    this.activitiesOpen = !this.activitiesOpen;
  }

  get completedActivities(): AgentActivity[] {
    return (this.msg.activities || []).filter(a => a.phase === 'done' || a.phase === 'error');
  }

  get isWelcome(): boolean {
    return this.msg.id === 'welcome' || this.msg.id === 'init-class-ai' || this.msg.id.startsWith('init-');
  }

  get chips(): string[] {
    return this.msg.suggestedActions || this.msg.suggestions || [];
  }

  get toolsUsedList(): string[] {
    const raw = this.msg.metadata?.['toolsUsed'];
    if (Array.isArray(raw)) {
      return raw
        .map(t => String(t))
        .filter(t => !t.startsWith('{') && !t.includes('"phase"'));
    }
    return [];
  }

  /** Mapea los nombres de funciones a badges con icono y etiqueta legible solo si no hay drawer de actividades */
  toolBadges(): ToolBadge[] {
    if (this.completedActivities.length > 0) return [];
    return this.toolsUsedList
      .filter(name => !name.startsWith('{') && !name.includes('"phase"'))
      .map(name => TOOL_MAP[name] ?? { label: name, icon: 'tool' as const });
  }

  get userSticker(): MemeSticker | undefined {
    if (this.msg.role !== 'user') return undefined;
    const match = this.msg.content.match(/\[STICKER:([a-zA-Z0-9_-]+)\]/i);
    if (match) return getStickerById(match[1]);
    return undefined;
  }

  get userTextClean(): string {
    if (this.msg.role !== 'user') return this.msg.content;
    const cleaned = this.msg.content.replace(/\[STICKER:([a-zA-Z0-9_-]+)\]/gi, '').trim();
    return cleaned || (this.userSticker ? '' : this.msg.content);
  }

  get assistantContent(): string {
    if (!this.msg.content) return '';
    // Colapsar cualquier bucle degenerativo de repetición infinita del LLM
    return this.msg.content.replace(/(.)\1{10,}/g, '$1$1$1');
  }

  handleCopy(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const textToCopy = this.msg.role === 'user' ? this.userTextClean : this.assistantContent;
      navigator.clipboard.writeText(textToCopy).then(() => {
        this.copied = true;
        setTimeout(() => this.copied = false, 2000);
      }).catch(() => {});
    }
  }
}

