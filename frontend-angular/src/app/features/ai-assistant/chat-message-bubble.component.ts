import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '@domain/models/utp.model';
import { MatrixOrbComponent } from './matrix-orb.component';
import { MarkdownRendererComponent } from './markdown-renderer.component';
import { getStickerById, MemeSticker } from '@data/constants/stickers.config';

@Component({
  selector: 'app-chat-message-bubble',
  standalone: true,
  imports: [CommonModule, MatrixOrbComponent, MarkdownRendererComponent],
  template: `
    @if (msg.role === 'user') {
      <!-- Mensaje del Usuario: Burbuja en el lado derecho estilo Claude/Gemini con soporte para stickers memes -->
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
      <!-- Mensaje del Asistente: Abierto en el canvas con MarkdownRenderer completo y avatar orbital -->
      <div class="flex flex-col gap-2.5 my-4 text-neutral-200 animate-in fade-in duration-150 text-left">
        
        <!-- Cabecera sutil del Asistente -->
        <div class="flex items-center gap-2 select-none">
          <app-matrix-orb [size]="26" [state]="'idle'" [colorMode]="'monochrome'"></app-matrix-orb>
          <span class="text-[11px] font-bold text-neutral-400">Copiloto UTP</span>
        </div>

        @if (toolsUsedList.length > 0) {
          <div class="flex items-center gap-1.5 mb-1 text-[10px] text-cyan-400 font-mono bg-cyan-950/40 px-2 py-1 rounded-md border border-cyan-800/30 w-fit">
            <span>🛠️ Herramienta ejecutada:</span>
            <span class="font-bold">{{ toolsUsedList.join(', ') }}</span>
          </div>
        }

        <!-- Contenido sin card envolvente con Markdown y Stickers -->
        <app-markdown-renderer [content]="msg.content"></app-markdown-renderer>

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

        <!-- Barra de herramientas: Copiar, Reintentar -->
        @if (!isWelcome) {
          <div class="flex items-center gap-3 pt-1 text-neutral-500 text-xs">
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

  get isWelcome(): boolean {
    return this.msg.id === 'welcome' || this.msg.id === 'init-class-ai' || this.msg.id.startsWith('init-');
  }

  get chips(): string[] {
    return this.msg.suggestedActions || this.msg.suggestions || [];
  }

  get toolsUsedList(): string[] {
    const raw = this.msg.metadata?.['toolsUsed'];
    if (Array.isArray(raw)) {
      return raw.map(t => String(t));
    }
    return [];
  }

  get userSticker(): MemeSticker | undefined {
    if (this.msg.role !== 'user') return undefined;
    const match = this.msg.content.match(/\[STICKER:([a-zA-Z0-9_-]+)\]/i);
    if (match) {
      return getStickerById(match[1]);
    }
    return undefined;
  }

  get userTextClean(): string {
    if (this.msg.role !== 'user') return this.msg.content;
    const cleaned = this.msg.content.replace(/\[STICKER:([a-zA-Z0-9_-]+)\]/gi, '').trim();
    return cleaned || (this.userSticker ? '' : this.msg.content);
  }

  handleCopy(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.msg.content).then(() => {
        this.copied = true;
        setTimeout(() => this.copied = false, 2000);
      }).catch(() => {});
    }
  }
}
