import {
 Component,
 ElementRef,
 EventEmitter,
 Input,
 OnChanges,
 Output,
 SimpleChanges,
 ViewChild,
 inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UTPEvent, UTPCurrentInterval, ChatMessage } from '@domain/models/utp.model';
import { parseEventTitle, formatTime, parseDate, DAYS_OF_WEEK } from '@data/schedule-parser';
import { getCachedSyllabus } from '@data/syllabus/client-storage';
import { resolveEventLocation } from '@data/classroom-helper';
import { AiAssistantService } from '@data/services/ai-assistant.service';
import { AuthService } from '@data/services/auth.service';
import { ScheduleService } from '@data/services/schedule.service';
import { SyllabusService } from '@data/services/syllabus.service';
import { ChatMessageBubbleComponent } from '@features/ai-assistant/chat-message-bubble.component';
import { MatrixOrbComponent } from '@features/ai-assistant/matrix-orb.component';
import { LucideAngularModule } from 'lucide-angular';
import { MEME_STICKERS, MemeSticker } from '@data/constants/stickers.config';

interface SyllabusSession {
 week: number;
 topic?: string;
 topics?: string[];
 unit?: string;
}

interface SyllabusEvaluation {
 week: number;
 type?: string;
 description?: string;
 weightPercent?: number;
}

@Component({
 selector: 'app-class-detail-modal',
 standalone: true,
 imports: [CommonModule, FormsModule, ChatMessageBubbleComponent, MatrixOrbComponent, LucideAngularModule],
 template: `
 @if (isOpen && event) {
 <div
 class="fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 font-sans"
 [ngClass]="isChatExpanded ? 'p-0 bg-[var(--utopik-onyx)]' : 'p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md'"
 (click)="onBackdropClick($event)"
 >
 <div
 class="relative flex flex-col transition-all duration-300 ease-out overflow-hidden"
 [ngClass]="isChatExpanded ? 'w-full h-full rounded-none bg-[var(--utopik-onyx)] shadow-none' : 'w-full max-w-3xl h-[82vh] sm:h-[85vh] rounded-[var(--r-3xl)] bg-[var(--utopik-carbon-black)] text-white shadow-2xl '"
 (click)="$event.stopPropagation()"
 >

 <!-- ───── Header Superior Dinámico ───── -->
 <div 
 class="transition-all duration-300 shrink-0"
 [ngClass]="isChatExpanded ? 'bg-[var(--utopik-carbon-black)] px-3 sm:px-8 py-2.5 sm:py-3' : 'bg-[var(--utopik-carbon-black)] px-4 sm:px-6 py-3.5 sm:py-4'"
 >
 <div class="max-w-4xl mx-auto w-full flex items-center justify-between gap-2 sm:gap-3">
 <div class="space-y-0.5 min-w-0 flex-1">
 <div class="flex items-center gap-2">
 @if (isPresencial) {
 <span class="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold badge-solid-presencial px-2.5 py-0.5 rounded-[var(--r-xs)] shrink-0">
 <lucide-icon name="map-pin" class="h-2.5 w-2.5 sm:h-3 sm:w-3"></lucide-icon>
 Presencial
 </span>
 } @else if (isRemoteZoom) {
 <span class="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold badge-solid-zoom px-2.5 py-0.5 rounded-[var(--r-xs)] shrink-0">
 <lucide-icon name="video" class="h-2.5 w-2.5 sm:h-3 sm:w-3"></lucide-icon>
 Zoom
 </span>
 } @else {
 <span class="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold badge-solid-virtual px-2.5 py-0.5 rounded-[var(--r-xs)] shrink-0">
 <lucide-icon name="wifi" class="h-2.5 w-2.5 sm:h-3 sm:w-3"></lucide-icon>
 Virtual
 </span>
 }
 <span class="text-xs font-medium text-neutral-400 whitespace-nowrap">
 Semana {{ effectiveWeek }}
 </span>
 </div>
 <h2 
 class="font-bold text-white truncate transition-all"
 [ngClass]="isChatExpanded ? 'text-xs sm:text-sm text-neutral-300 max-w-[240px] sm:max-w-[500px]' : 'text-sm sm:text-base'"
 >
 {{ cleanTitle }}
 </h2>
 </div>

 <!-- Controles: Ver datos de clase / Minimizar / Cerrar -->
 <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
 @if (isChatExpanded) {
 <button
 type="button"
 (click)="restoreToModal()"
 title="Volver a modo modal y ver datos de clase"
 class="inline-flex items-center gap-1 rounded-[var(--r-md)] bg-white/10 hover:bg-white hover:text-black px-2.5 sm:px-3 py-1 text-xs font-bold text-white transition active:scale-95 shadow-sm cursor-pointer"
 >
 <lucide-icon name="chevron-down" class="h-3.5 w-3.5"></lucide-icon>
 <span class="text-[11px] sm:text-xs">Ver aula</span>
 </button>
 } @else if (messages.length > 1) {
 <button
 type="button"
 (click)="expandChat()"
 title="Expandir a pantalla completa"
 class="inline-flex items-center gap-1 rounded-[var(--r-md)] bg-white/5 hover:bg-white/15 px-2.5 sm:px-3 py-1 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
 >
 <lucide-icon name="maximize-2" class="h-3.5 w-3.5"></lucide-icon>
 <span class="hidden sm:inline">Pantalla completa</span>
 </button>
 }

 <button
 (click)="close.emit()"
 aria-label="Cerrar modal"
 class="flex h-8 w-8 items-center justify-center rounded-[var(--r-xl)] bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition cursor-pointer shrink-0"
 >
 <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
 </button>
 </div>
 </div>
 </div>

 <!-- Barra Flotante de Retorno en Modo Pantalla Completa -->
 @if (isChatExpanded) {
 <div 
 (click)="restoreToModal()"
 class="w-full bg-[var(--utopik-carbon-black)]/90 hover:bg-[var(--utopik-carbon-black)] text-neutral-400 hover:text-neutral-200 text-[11px] py-1 text-center cursor-pointer transition flex items-center justify-center gap-1.5 select-none"
 >
 <lucide-icon name="arrow-up" class="h-3 w-3 animate-bounce text-[var(--utopik-green-yellow)]"></lucide-icon>
 <span>Desliza para ver aula y horario</span>
 </div>
 }

 <!-- ───── Contenido Scrollable con Detección Inteligente ───── -->
 <div 
 #scrollContainer
 (scroll)="handleScroll($event)"
 class="flex-1 overflow-y-auto custom-scrollbar transition-all"
 [ngClass]="isChatExpanded ? 'px-4 sm:px-8 py-4 sm:py-6' : 'px-4 sm:px-6 py-4'"
 >
 <div class="max-w-4xl mx-auto w-full space-y-4">

 <!-- Ficha de Ubicación y Horario -->
 <div 
 class="transition-all duration-300 ease-in-out"
 [ngClass]="isChatExpanded ? '-translate-y-4 opacity-0 max-h-0 overflow-hidden pointer-events-none -my-2' : 'translate-y-0 opacity-100 max-h-[500px]'"
 >
 <div class="space-y-3 pb-3">
 <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">

 <!-- Horario -->
 <div class="p-3 sm:p-3.5 rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)] space-y-0.5">
 <span class="text-[10px] text-neutral-500 uppercase font-semibold">Horario</span>
 <p class="font-bold text-white">{{ dayName }}</p>
 <p class="font-mono text-[11px] text-neutral-400">{{ startTime }} – {{ finishTime }}</p>
 </div>

 <!-- Aula / Plataforma -->
 <div class="p-3 sm:p-3.5 rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)] space-y-0.5">
 <span class="text-[10px] text-neutral-500 uppercase font-semibold">
 {{ isPresencial ? 'Aula y Piso' : 'Plataforma' }}
 </span>
 <p class="font-bold text-white">
 {{ isPresencial ? location.aula : isRemoteZoom ? 'Zoom UTP' : 'Canvas LMS' }}
 </p>
 <p class="text-[11px] text-neutral-400">
 {{ isPresencial ? ('Piso ' + location.piso) : 'Sesión Virtual' }}
 </p>
 </div>

 <!-- Pabellón / Modalidad -->
 <div class="p-3 sm:p-3.5 rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)] space-y-0.5">
 <span class="text-[10px] text-neutral-500 uppercase font-semibold">
 {{ isPresencial ? 'Pabellón' : 'Modalidad' }}
 </span>
 <p class="font-bold text-white">
 {{ isPresencial ? location.pabellon : isRemoteZoom ? 'Remota en Vivo' : 'Asíncrono' }}
 </p>
 <p class="text-[11px] text-neutral-400 truncate" [title]="location.tipo">
 {{ isPresencial ? location.tipo : 'Digital' }}
 </p>
 </div>

 <!-- Campus & Sección -->
 <div class="p-3 sm:p-3.5 rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)] space-y-0.5">
 <span class="text-[10px] text-neutral-500 uppercase font-semibold">Campus & Sección</span>
 <p class="font-bold text-white">{{ location.campus }}</p>
 <p class="text-[11px] text-neutral-400 font-mono">
 {{ sectionCode ? ('Sec. ' + sectionCode) : 'Oficial' }}
 </p>
 </div>
 </div>

 <!-- Barra Zoom Directo -->
 @if (isRemoteZoom && event.metadata?.zoomLink) {
 <div class="flex items-center justify-between p-3.5 rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)]">
 <div class="flex items-center gap-2 text-xs">
 <lucide-icon name="video" class="h-4 w-4 text-[var(--utopik-platinum)]"></lucide-icon>
 <span class="text-neutral-300 font-medium">Clase remota en vivo programada por Zoom</span>
 </div>
 <a
 [href]="event.metadata?.zoomLink"
 target="_blank"
 rel="noopener noreferrer"
 class="inline-flex items-center gap-1.5 rounded-[var(--r-md)] bg-white hover:bg-neutral-200 px-4 py-2 text-xs font-bold text-black shadow transition active:scale-95 no-underline cursor-pointer"
 >
 <span>Entrar a Zoom</span>
 <lucide-icon name="external-link" class="h-3 w-3"></lucide-icon>
 </a>
 </div>
 }
 </div>
 </div>

 <!-- ───── Chat IA Embebido ───── -->
 <div [ngClass]="!isChatExpanded ? 'pt-2 ' : ''">
 @if (!isChatExpanded) {
 <div class="flex items-center justify-between mb-3">
 <span class="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
 <lucide-icon name="sparkles" class="h-3.5 w-3.5 text-[var(--utopik-green-yellow)]"></lucide-icon>
 Copiloto de Clase & Sílabo
 </span>
 <span class="text-[11px] text-neutral-500">
 Semana {{ effectiveWeek }} • Sílabo Oficial
 </span>
 </div>
 }

 <!-- Mensajes -->
 <div class="space-y-4">
 @for (m of messages; track m.id) {
 <app-chat-message-bubble
 [msg]="m"
 (sendAction)="handleSendMessage($event)"
 (retry)="handleRetry()"
 />
 }

 @if (isLoading) {
 <div class="flex items-center gap-3 text-xs text-neutral-300 py-3 select-none">
 <app-matrix-orb [size]="26" [state]="'thinking'" [colorMode]="'monochrome'" />
 <div class="flex flex-col">
 <span class="font-semibold text-white">Consultando sílabo oficial y razonando...</span>
 <span class="text-[10px] text-neutral-400">Analizando rúbricas, fórmulas y temario de clase</span>
 </div>
 </div>
 }

 <div #chatBottom></div>
 </div>
 </div>

 </div>
 </div>

 <!-- ───── Input Bar Inferior Integrado ───── -->
 <div 
 class=" shrink-0"
 [ngClass]="isChatExpanded ? 'bg-[var(--utopik-carbon-black)] px-4 sm:px-8 py-3 sm:py-3.5' : 'bg-[var(--utopik-carbon-black)] p-3 sm:p-4'"
 >
 <div class="max-w-4xl mx-auto w-full">
 <form
 (submit)="onSubmit($event)"
 class="flex items-center gap-2 bg-[var(--utopik-carbon-black)] rounded-[var(--r-md)] px-2.5 sm:px-3 py-1.5 sm:py-2 "
 >

 <input
 #inputRef
 type="text"
 [(ngModel)]="inputMessage"
 name="msg"
 [placeholder]="'Pregunta sobre la clase de ' + cleanTitle + '...'"
 class="flex-1 bg-transparent py-1.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none "
 />
 <button
 type="submit"
 [disabled]="!inputMessage.trim() || isLoading"
 aria-label="Enviar mensaje"
 class="flex h-8 w-8 items-center justify-center rounded-[var(--r-xl)] bg-[var(--utopik-carbon-black)] hover:bg-[var(--utopik-carbon-black)] text-white transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0 cursor-pointer"
 >
 <lucide-icon name="send" class="h-3.5 w-3.5"></lucide-icon>
 </button>
 </form>
 </div>
 </div>

 </div>
 </div>
 }
 `,
})
export class ClassDetailModalComponent implements OnChanges {
 @Input() isOpen = false;
 @Input() event: UTPEvent | null = null;
 @Input() weekNumber = 5;
 @Input() interval: UTPCurrentInterval | null = null;
 @Output() close = new EventEmitter<void>();
 @Output() openGlobalAi = new EventEmitter<string>();

 @ViewChild('chatBottom') chatBottom?: ElementRef<HTMLDivElement>;
 @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

 private aiService = inject(AiAssistantService);
 private authService = inject(AuthService);
 private scheduleService = inject(ScheduleService);
 private syllabusService = inject(SyllabusService);

 // ── Derived display state ──
 cleanTitle = '';
 sectionCode = '';
 effectiveWeek = 5;
 isPresencial = false;
 isRemoteZoom = false;
 location: Record<string, string> = { aula: '', piso: '', pabellon: '', tipo: '', campus: '' };
 dayName = '';
 startTime = '';
 finishTime = '';

 // ── Chat & Immersion Scroll Dynamics ──
 messages: ChatMessage[] = [];
 inputMessage = '';
 isLoading = false;
 isChatExpanded = false;
 isStickerDrawerOpen = false;
 selectedStickerCategory = 'all';
 private lastUserPrompt = '';
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

 selectSticker(sticker: MemeSticker): void {
 this.isStickerDrawerOpen = false;
 const promptToSend = this.inputMessage.trim()
 ? `${this.inputMessage.trim()} [STICKER:${sticker.id}]`
 : `[STICKER:${sticker.id}]`;
 this.handleSendMessage(promptToSend);
 }

 expandChat(): void {
 this.isChatExpanded = true;
 }

 restoreToModal(): void {
 this.isProgrammaticScroll = true;
 this.isChatExpanded = false;
 if (this.scrollContainer?.nativeElement) {
 this.scrollContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
 }
 setTimeout(() => {
 this.isProgrammaticScroll = false;
 this.lastScrollTop = 0;
 }, 500);
 }

 handleScroll(e: Event): void {
 if (this.isProgrammaticScroll) return;
 const el = e.target as HTMLElement;
 if (!el) return;

 const currentScrollTop = el.scrollTop;
 const isScrollingDown = currentScrollTop > this.lastScrollTop;
 const isScrollingUp = currentScrollTop < this.lastScrollTop;

 // Scroll hacia abajo con mensajes activos -> expande a pantalla completa (deja de verse como modal pequeño)
 if (!this.isChatExpanded && isScrollingDown && currentScrollTop > 30 && this.messages.length > 1) {
 this.isChatExpanded = true;
 }

 // Scroll hacia arriba al tope -> regresa suavemente al modo modal con la ficha de clase
 if (this.isChatExpanded && isScrollingUp && currentScrollTop <= 15) {
 this.isChatExpanded = false;
 }

 this.lastScrollTop = currentScrollTop;
 }

 ngOnChanges(changes: SimpleChanges): void {
 const eventChanged = changes['event'];
 const openChanged = changes['isOpen'];
 if ((openChanged || eventChanged) && this.isOpen && this.event) {
 this.deriveState();
 // Only reset chat when event changes (not just toggling open)
 if (eventChanged) {
 this.isChatExpanded = false;
 this.lastScrollTop = 0;
 this.isProgrammaticScroll = false;
 this.initChat();
 }
 }
 }

 private deriveState(): void {
 if (!this.event) return;
 const parsed = parseEventTitle(this.event.title);
 this.cleanTitle = parsed.cleanTitle;
 this.sectionCode = parsed.sectionCode || (this.event.metadata?.['sectionCode'] as string) || '';
 this.effectiveWeek = parsed.weekInTitle || this.weekNumber;
 this.isPresencial = this.event.modality === 'P';
 this.isRemoteZoom = this.event.modality === 'R';
 const loc = resolveEventLocation(this.event);
 this.location = {
 aula: loc.aula ? String(loc.aula) : '',
 piso: loc.piso !== undefined && loc.piso !== null ? String(loc.piso) : '',
 pabellon: loc.pabellon ? String(loc.pabellon) : '',
 tipo: loc.tipo ? String(loc.tipo) : '',
 campus: loc.campus ? String(loc.campus) : '',
 };
 const eventDate = parseDate(this.event.startAt);
 this.dayName = DAYS_OF_WEEK[eventDate.getDay()] || 'Lunes';
 this.startTime = formatTime(this.event.startAt);
 this.finishTime = formatTime(this.event.finishAt);
 }

 private initChat(): void {
 const syllabus = getCachedSyllabus(this.cleanTitle);
 const weekSession = (syllabus?.weeklySchedule as SyllabusSession[] | null | undefined)?.find(
 (s) => s.week === this.effectiveWeek,
 ) ?? null;
 const evaluation = (syllabus?.evaluations as SyllabusEvaluation[] | null | undefined)?.find(
 (e) => e.week === this.effectiveWeek,
 ) ?? null;

 const topicText =
 weekSession?.topic ||
 weekSession?.topics?.join(', ') ||
 `Avance académico correspondiente a la Semana ${this.effectiveWeek}`;

 const evalText = evaluation
 ? `**Evaluación Programada:** ${evaluation.type} - ${evaluation.description} (${evaluation.weightPercent}%)\n`
 : '';

 const initMsg: ChatMessage = {
 id: `init-class-${this.event!.id}`,
 role: 'assistant',
 content: `¡Hola! Soy tu asistente para **${this.cleanTitle}** en la **Semana ${this.effectiveWeek}**.\n\n**Tema del Sílabo:** ${topicText}\n${evalText}\n¿En qué te ayudo para esta sesión?`,
 timestamp: 'Ahora',
 suggestedActions: [
 '¿Qué temas específicos tocan en esta clase?',
 'Dame un resumen de los conceptos clave',
 evaluation ? `¿Cómo prepararme para ${evaluation.type}?` : '¿Qué tareas o prácticas vienen?',
 '¿Qué ejercicios o preguntas típicas vendrán?',
 ],
 };

 this.messages = [initMsg];
 this.inputMessage = '';
 this.isLoading = false;
 this.lastUserPrompt = '';
 this.isChatExpanded = false;
 this.isStickerDrawerOpen = false;
 setTimeout(() => this.scrollToBottom(), 80);
 }

 onBackdropClick(e: MouseEvent): void {
 if (e.target === e.currentTarget && !this.isChatExpanded) {
 this.close.emit();
 }
 }

 onSubmit(e: Event): void {
 e.preventDefault();
 this.handleSendMessage();
 }

 handleSendMessage(textToSend?: string): void {
 const text = (textToSend || this.inputMessage).trim();
 if (!text || this.isLoading) return;

 this.lastUserPrompt = text;

 const userMsg: ChatMessage = {
 id: Date.now().toString(),
 role: 'user',
 content: text,
 timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
 };

 this.messages = [...this.messages, userMsg];
 this.inputMessage = '';
 this.isLoading = true;
 this.isChatExpanded = true; // Expansión total automática al enviar para foco inmersivo
 this.scrollToBottom();

 const student = this.authService.currentStudent();
 const userId =
 student?.studentCode || student?.username || student?.email || student?.userId || 'guest-student';
 const schedule = this.scheduleService.currentSchedule() || this.interval;
 const syllabi = this.syllabusService.syllabiMap();

 const enrichedPrompt = `Para el curso "${this.cleanTitle}" en la Semana ${this.effectiveWeek}: ${text}`;

 this.aiService.sendMessage(enrichedPrompt, userId, student, schedule, syllabi).subscribe({
 next: (res) => {
 this.isLoading = false;
 if (res.success && res.data) {
 const aiMsg: ChatMessage = {
 id: res.data.id || (Date.now() + 1).toString(),
 role: 'assistant',
 content: res.data.content,
 timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
 suggestions: res.data.suggestions || res.data.suggestedActions,
 suggestedActions: res.data.suggestedActions || res.data.suggestions,
 };
 this.messages = [...this.messages, aiMsg];
 } else {
 this.addFallback();
 }
 this.scrollToBottom();
 },
 error: () => {
 this.isLoading = false;
 this.addFallback();
 this.scrollToBottom();
 },
 });
 }

 handleRetry(): void {
 if (this.lastUserPrompt) this.handleSendMessage(this.lastUserPrompt);
 }

 private addFallback(): void {
 const syllabus = getCachedSyllabus(this.cleanTitle);
 const sessionTopic = (syllabus?.weeklySchedule as SyllabusSession[] | null | undefined)?.find(
 (s) => s.week === this.effectiveWeek,
 );
 const topic = sessionTopic?.topic || 'los temas oficiales del sílabo';
 const fallback: ChatMessage = {
 id: (Date.now() + 1).toString(),
 role: 'assistant',
 content: `Para **${this.cleanTitle}** en la **Semana ${this.effectiveWeek}**, el temario se centra en: **${topic}**.\n\nTe recomiendo repasar las lecturas y guías de laboratorio disponibles en Canvas.`,
 timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
 };
 this.messages = [...this.messages, fallback];
 }

 private scrollToBottom(): void {
 setTimeout(() => {
 if (this.chatBottom?.nativeElement && this.isChatExpanded) {
 this.chatBottom.nativeElement.scrollIntoView({ behavior: 'smooth' });
 }
 }, 60);
 }
}

