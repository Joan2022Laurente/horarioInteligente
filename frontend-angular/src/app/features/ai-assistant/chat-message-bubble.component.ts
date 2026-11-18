import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage, AgentActivity } from '@domain/models/utp.model';
import { MatrixOrbComponent } from './matrix-orb.component';
import { MarkdownRendererComponent } from './markdown-renderer.component';
import { getStickerById, MemeSticker } from '@data/constants/stickers.config';
import { LucideAngularModule } from 'lucide-angular';

interface ToolBadge { label: string; icon: 'calendar' | 'book' | 'list' | 'check' | 'tool'; }

const TOOL_MAP: Record<string, ToolBadge> = {
 get_today_schedule: { label: 'Horario', icon: 'calendar' },
 get_remaining_classes_today: { label: 'Clases restantes', icon: 'calendar' },
 get_syllabus_details: { label: 'Sílabo', icon: 'book' },
 get_enrolled_courses: { label: 'Cursos', icon: 'list' },
 get_upcoming_evaluations: { label: 'Evaluaciones', icon: 'check' },
 get_course_tasks_and_activities: { label: 'Tareas y Actividades', icon: 'check' },
 search_marketplace: { label: 'Marketplace', icon: 'tool' },
};

@Component({
 selector: 'app-chat-message-bubble',
 standalone: true,
 imports: [CommonModule, MatrixOrbComponent, MarkdownRendererComponent, LucideAngularModule],
 template: `
 @if (msg.role === 'user') {
 <!-- Mensaje del Usuario -->
 <div class="flex flex-col items-end gap-1.5 my-3">
 @if (userSticker) {
 <div class="animate-in zoom-in-95 duration-150 select-none my-1">
 <img [src]="userSticker.src" [alt]="userSticker.name" class="h-auto w-28 sm:w-36 max-w-[150px] r-card object-cover shadow-md block" />
 </div>
 }
 @if (userTextClean) {
 <div class="r-card bg-[var(--utopik-carbon-black)] text-white px-4 py-2.5 max-w-[85%] text-xs sm:text-sm font-medium shadow-sm ">
 {{ userTextClean }}
 </div>
 }
 <div class="flex items-center gap-2 pr-2 text-neutral-500 text-[10px]">
 <button
 (click)="handleCopy()"
 title="Copiar texto"
 class="hover:text-white transition flex items-center gap-1 bg-transparent cursor-pointer text-neutral-500"
 >
 @if (copied) {
 <lucide-icon name="check" class="h-3 w-3 text-[var(--utopik-green-yellow)]"></lucide-icon>
 } @else {
 <lucide-icon name="copy" class="h-3 w-3"></lucide-icon>
 }
 </button>
 <span>{{ msg.timestamp }}</span>
 </div>
 </div>
 } @else {
 <!-- Mensaje del Asistente -->
 <div class="flex flex-col gap-2 my-4 text-neutral-200 animate-in fade-in duration-150 text-left">

 <!-- Cabecera sutil del Asistente con estado dinámico de pensamiento -->
 <div class="flex items-center gap-2 select-none">
 <app-matrix-orb [size]="24" [state]="isThinkingState ? 'thinking' : 'idle'" [colorMode]="'monochrome'"></app-matrix-orb>
 <span class="text-[11px] font-semibold text-neutral-400">Copiloto UTP</span>
 @if (isThinkingState && assistantContent) {
 <span class="inline-flex items-center gap-1.5 text-[10px] text-neutral-400/80 font-normal">
 <span class="h-1 w-1 rounded-full bg-[var(--utopik-green-yellow)] animate-ping"></span>
 <span class="animate-pulse">Escribiendo...</span>
 </span>
 }
 </div>

 <!-- Indicador en tiempo real de actividad del agente (Evolutivo, semi-opaco y fluido) -->
 @if (activeStatusText) {
 <div class="inline-flex items-center gap-2 py-0.5 text-xs select-none animate-in fade-in duration-200">
 <span class="relative flex h-1.5 w-1.5 shrink-0">
 <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--utopik-green-yellow)] opacity-75"></span>
 <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--utopik-green-yellow)]"></span>
 </span>
 <span class="text-neutral-400/90 font-normal tracking-wide animate-pulse">
 {{ activeStatusText }}
 </span>
 </div>
 }

 <!-- Resumen colapsable de acciones completadas (Drawer sutil y elegante, no tosco) -->
 @if (completedActivities.length > 0) {
 <div class="my-0.5">
 <button
 type="button"
 (click)="toggleActivities()"
 class="group inline-flex items-center gap-1.5 py-0.5 text-[11px] text-neutral-400/80 hover:text-neutral-200 transition-colors cursor-pointer select-none"
 >
 <lucide-icon name="check" class="h-3 w-3 text-[var(--utopik-green-yellow)] shrink-0"></lucide-icon>
 <span class="hover:underline underline-offset-2 decoration-neutral-600">
 {{ completedSummary }}
 </span>
 <lucide-icon name="chevron-down" class="h-2.5 w-2.5 opacity-50 transition-transform duration-200" [class.rotate-180]="activitiesOpen"></lucide-icon>
 </button>

 @if (activitiesOpen) {
 <div class="mt-1.5 pl-3 border-l border-white/10 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
 @for (act of completedActivities; track act.id) {
 <div class="flex items-center gap-2 text-[11px] text-neutral-400 py-0.5">
 @if (act.phase === 'done') {
 <lucide-icon name="check" class="h-2.5 w-2.5 text-[var(--utopik-green-yellow)] shrink-0"></lucide-icon>
 } @else if (act.phase === 'error') {
 <lucide-icon name="x" class="h-2.5 w-2.5 text-rose-400 shrink-0"></lucide-icon>
 }
 <span class="text-neutral-300 font-medium">{{ act.label }}</span>
 @if (act.durationMs) {
 <span class="text-[10px] text-neutral-500 font-sans font-medium">({{ act.durationMs }}ms)</span>
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
 @if (msg.isStreaming) {
 <span class="inline-block w-1.5 h-3.5 bg-[var(--utopik-green-yellow)] ml-1 animate-pulse align-middle rounded-[1px]"></span>
 }
 </div>
 }

 <!-- Badges de herramientas fallback si no hay drawer de actividades -->
 @if (toolBadges().length > 0) {
 <div class="flex items-center flex-wrap gap-2 text-[10px] text-neutral-500 pt-1 select-none">
 <span class="text-neutral-600">Fuentes consultadas:</span>
 @for (badge of toolBadges(); track badge.label) {
 <span class="inline-flex items-center gap-1 text-neutral-400/80">
 <span>•</span>
 <span>{{ badge.label }}</span>
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
 class="inline-flex items-center gap-2 r-control-md bg-white hover:bg-neutral-200 text-black px-4 py-2 text-xs font-bold transition shadow no-underline cursor-pointer"
 >
 <lucide-icon name="video" class="h-4 w-4"></lucide-icon>
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
 class="inline-flex items-center gap-1.5 r-control-md bg-[var(--utopik-carbon-black)] hover:bg-white hover:text-black px-3.5 py-1.5 text-xs font-medium text-neutral-300 transition-all shadow-sm active:scale-95 cursor-pointer"
 >
 <span>{{ action }}</span>
 <lucide-icon name="chevron-left" class="h-3 w-3 opacity-60"></lucide-icon>
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
 class="hover:text-white transition flex items-center gap-1 text-[11px] bg-transparent cursor-pointer text-neutral-500"
 >
 @if (copied) {
 <lucide-icon name="check" class="h-3.5 w-3.5 text-[var(--utopik-green-yellow)]"></lucide-icon>
 <span class="text-[var(--utopik-green-yellow)]">Copiado</span>
 } @else {
 <lucide-icon name="copy" class="h-3.5 w-3.5"></lucide-icon>
 <span>Copiar</span>
 }
 </button>

 <button
 (click)="retry.emit()"
 title="Reintentar respuesta"
 class="hover:text-white transition flex items-center gap-1 text-[11px] bg-transparent cursor-pointer text-neutral-500"
 >
 <lucide-icon name="refresh-cw" class="h-3.5 w-3.5"></lucide-icon>
 <span>Reintentar</span>
 </button>

 <span class="text-[10px] text-neutral-600 font-sans font-medium ml-auto">
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

 get isThinkingState(): boolean {
 return !!this.msg.isStreaming || !!this.msg.currentActivity;
 }

 get activeStatusText(): string | null {
 if (this.msg.currentActivity?.label) {
 return this.msg.currentActivity.label;
 }
 if (this.msg.isStreaming && !this.assistantContent) {
 return this.completedActivities.length > 0
 ? 'Sintetizando respuesta con los datos obtenidos...'
 : 'Consultando y razonando...';
 }
 return null;
 }

 get completedSummary(): string {
 const count = this.completedActivities.length;
 if (count === 1) {
 return this.completedActivities[0].label || '1 consulta académica realizada';
 }
 return `${count} consultas académicas realizadas`;
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

