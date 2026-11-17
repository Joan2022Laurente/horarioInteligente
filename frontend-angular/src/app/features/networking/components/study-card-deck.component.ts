import { 
  Component, 
  EventEmitter, 
  HostListener, 
  Input, 
  OnChanges, 
  Output, 
  SimpleChanges 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { StudyBuddyMatch } from '@domain/models/matching';
import { formatCourseName } from '@data/schedule-parser';
import { StudyIntent } from './study-match-card.component';

export type SwipeDirection = 'left' | 'right';

@Component({
  selector: 'app-study-card-deck',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="w-full max-w-[430px] mx-auto flex flex-col items-center select-none py-2 font-sans">
      
      <!-- Top Deck Header: Progress Dots & Counter -->
      @if (hasCards) {
        <div class="w-full flex items-center justify-between px-3 pb-3 text-xs">
          <!-- Segmented Progress Indicator -->
          <div class="flex items-center gap-1.5 flex-1 max-w-[200px]">
            @for (match of matches; track match.id; let i = $index) {
              <div 
                class="h-1 flex-1 rounded-full transition-all duration-300"
                [ngClass]="{
                  'bg-[var(--accent-lime)]': i === currentIndex,
                  'bg-white/30': i < currentIndex,
                  'bg-white/10': i > currentIndex
                }"
              ></div>
            }
          </div>

          <!-- Counter Pill -->
          <div class="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] bg-white/5 px-2.5 py-1 r-control-sm border border-white/5">
            <span class="text-white font-bold">{{ currentIndex + 1 }}</span>
            <span>/</span>
            <span>{{ matches.length }}</span>
          </div>
        </div>
      }

      <!-- ===================================================================== -->
      <!-- THE CARD STACK CONTAINER                                              -->
      <!-- ===================================================================== -->
      <div class="relative w-full h-[510px] sm:h-[530px] flex items-center justify-center">

        <!-- DECK COMPLETED EMPTY STATE -->
        @if (!hasCards) {
          <div class="w-full h-full r-overlay bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <!-- Pulsing Concentric Radar Rings -->
            <div class="relative flex items-center justify-center h-20 w-20">
              <span class="absolute inline-flex h-full w-full circle bg-[var(--accent-lime)]/10 animate-ping"></span>
              <span class="absolute inline-flex h-14 w-14 circle bg-[var(--accent-lime)]/20 animate-pulse"></span>
              <div class="relative flex items-center justify-center h-12 w-12 circle bg-[var(--accent-lime)] text-black font-black text-xl shadow-sm">
                <lucide-icon name="check" class="h-6 w-6 stroke-[3]"></lucide-icon>
              </div>
            </div>

            <div class="space-y-1">
              <h3 class="text-lg font-black text-[var(--foreground)]">
                ¡Estás al día con tu Radar!
              </h3>
              <p class="text-xs text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
                Has evaluado a todos los compañeros compatibles con tus horarios y cursos en esta ventana.
              </p>
            </div>

            <div class="flex flex-col sm:flex-row items-center gap-2 pt-2 w-full max-w-xs">
              <button
                type="button"
                (click)="resetDeck()"
                class="w-full py-2.5 px-4 r-control-lg bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-black font-extrabold text-xs transition active:scale-95 border-none cursor-pointer shadow-sm"
              >
                Volver a barajar
              </button>
              <button
                type="button"
                (click)="viewBeacons.emit()"
                class="w-full py-2.5 px-4 r-control-lg bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs transition active:scale-95 border border-white/10 cursor-pointer shadow-sm"
              >
                Ver Mesas In-Campus
              </button>
            </div>
          </div>
        }

        <!-- 3-TIER LAYERED STACK OF CARDS -->
        @if (hasCards) {
          
          <!-- Card 2 (Bottom Depth Layer) -->
          @if (matches[currentIndex + 2]) {
            <div 
              class="absolute inset-0 r-overlay bg-[var(--surface-card)] border border-[var(--border-subtle)] opacity-40 shadow-sm pointer-events-none transform scale-[0.88] translate-y-7 transition-all duration-200"
            ></div>
          }

          <!-- Card 1 (Middle Depth Layer) -->
          @if (matches[currentIndex + 1]) {
            <div 
              class="absolute inset-0 r-overlay bg-[var(--surface-card)] border border-[var(--border-subtle)] opacity-75 shadow-sm pointer-events-none transform scale-[0.94] translate-y-3.5 transition-all duration-200"
            ></div>
          }

          <!-- Card 0 (Active Swipeable Top Card) -->
          @if (currentMatch) {
            <div
              class="absolute inset-0 r-overlay bg-[var(--surface-card)] border border-[var(--border-medium)] p-5 sm:p-6 shadow-md flex flex-col justify-between cursor-grab active:cursor-grabbing text-left overflow-hidden transition-transform will-change-transform"
              [style.transform]="activeCardTransform"
              [style.transition]="isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'"
              (mousedown)="startDrag($event)"
              (touchstart)="startTouchDrag($event)"
            >
              
              <!-- STAMP BADGE: "ME INTERESA" (Visible when swiping right) -->
              <div 
                class="absolute top-7 left-6 z-30 pointer-events-none transform -rotate-12 border-2 border-[var(--accent-lime)] text-[var(--accent-lime)] font-black text-sm px-3.5 py-1 r-control-md tracking-wider uppercase transition-opacity shadow-sm bg-black/80 backdrop-blur-sm"
                [style.opacity]="stampLikeOpacity"
              >
                ME INTERESA
              </div>

              <!-- STAMP BADGE: "PASO" (Visible when swiping left) -->
              <div 
                class="absolute top-7 right-6 z-30 pointer-events-none transform rotate-12 border-2 border-red-500 text-red-500 font-black text-sm px-3.5 py-1 r-control-md tracking-wider uppercase transition-opacity shadow-sm bg-black/80 backdrop-blur-sm"
                [style.opacity]="stampPassOpacity"
              >
                PASO
              </div>

              <!-- TOP SECTION: Sede, Modality & Student Avatar Header -->
              <div class="space-y-4">
                <div class="flex items-center justify-between gap-2">
                  <span
                    class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 r-control-sm border"
                    [ngClass]="currentMatch.modality === 'Presencial' 
                      ? 'bg-[var(--badge-solid-presencial-bg)] border-[var(--badge-solid-presencial-border)] text-[var(--badge-solid-presencial-text)]' 
                      : 'bg-[var(--badge-solid-virtual-bg)] border-[var(--badge-solid-virtual-border)] text-[var(--badge-solid-virtual-text)]'"
                  >
                    <span 
                      class="h-1.5 w-1.5 circle"
                      [ngClass]="currentMatch.modality === 'Presencial' ? 'bg-[var(--accent-lime)] animate-pulse' : 'bg-[var(--accent-cyan)]'"
                    ></span>
                    <span>{{ currentMatch.modality === 'Presencial' ? 'In-Campus UTP' : 'Virtual' }}</span>
                  </span>

                  <span class="text-[10px] font-medium text-[var(--text-muted)]">
                    {{ currentMatch.campus }}
                  </span>
                </div>

                <!-- Persona Info Header -->
                <div class="flex items-start gap-3.5">
                  <div class="h-13 w-13 r-panel bg-[var(--surface-subtle)] text-[var(--foreground)] font-black flex items-center justify-center text-base shrink-0 border border-white/10 shadow-sm">
                    {{ currentMatch.avatarLetter }}
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <h3 class="text-base font-extrabold text-[var(--foreground)] truncate">
                        {{ currentMatch.name }}
                      </h3>
                      <lucide-icon name="shield-check" class="h-4 w-4 text-[var(--accent-emerald)] shrink-0"></lucide-icon>
                    </div>
                    <p class="text-xs text-[var(--text-muted)] truncate mt-0.5 font-medium">
                      {{ currentMatch.career }} · Ciclo {{ currentMatch.cycle }}
                    </p>
                  </div>
                </div>

                <!-- FACTUAL BADGES BOX (Mismo Curso · Mismo Hueco · Misma Torre) -->
                <div class="space-y-2.5 text-xs bg-[var(--surface-subtle)] p-3.5 r-card border border-white/5">
                  <!-- Badge 1: Mismo Curso -->
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-extrabold text-[var(--accent-lime)] uppercase tracking-wider shrink-0 bg-[var(--accent-lime)]/10 px-2 py-0.5 r-control-xs border border-[var(--accent-lime)]/20">
                      Curso
                    </span>
                    <span class="truncate text-xs font-bold text-[var(--foreground)]">
                      {{ formatCourse(currentMatch.courseName) }}
                    </span>
                  </div>

                  <!-- Badge 2: Mismo Hueco Compartido -->
                  <div class="flex items-center gap-2 text-[11px] text-[var(--accent-orange)] font-semibold">
                    <lucide-icon name="clock" class="h-3.5 w-3.5 shrink-0"></lucide-icon>
                    <span class="truncate">
                      {{ currentMatch.sharedWindow.dayName }} {{ currentMatch.sharedWindow.start }} – {{ currentMatch.sharedWindow.end }}
                    </span>
                  </div>

                  <!-- Badge 3: Misma Ubicación Física -->
                  <div class="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-medium">
                    <lucide-icon name="map-pin" class="h-3.5 w-3.5 shrink-0 text-neutral-400"></lucide-icon>
                    <span class="truncate">
                      {{ currentMatch.sharedWindow.location }}
                    </span>
                  </div>
                </div>

                <!-- Intent Chips Selection -->
                <div class="space-y-1.5">
                  <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    ¿Qué objetivo prefieres?
                  </span>
                  <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      (click)="setIntent('EXAM', $event)"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 r-control-sm text-[10px] font-bold transition border cursor-pointer shrink-0"
                      [ngClass]="selectedIntent === 'EXAM' 
                        ? 'bg-[var(--accent-orange)] text-black border-[var(--accent-orange)] font-extrabold shadow-sm' 
                        : 'bg-white/[0.04] text-[var(--text-muted)] hover:text-white border-white/5'"
                    >
                      <lucide-icon name="target" class="h-3 w-3 shrink-0"></lucide-icon>
                      <span>Parciales</span>
                    </button>
                    <button
                      type="button"
                      (click)="setIntent('PROJECT', $event)"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 r-control-sm text-[10px] font-bold transition border cursor-pointer shrink-0"
                      [ngClass]="selectedIntent === 'PROJECT' 
                        ? 'bg-[var(--accent-lime)] text-black border-[var(--accent-lime)] font-extrabold shadow-sm' 
                        : 'bg-white/[0.04] text-[var(--text-muted)] hover:text-white border-white/5'"
                    >
                      <lucide-icon name="code" class="h-3 w-3 shrink-0"></lucide-icon>
                      <span>Proyecto</span>
                    </button>
                    <button
                      type="button"
                      (click)="setIntent('CHILL', $event)"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 r-control-sm text-[10px] font-bold transition border cursor-pointer shrink-0"
                      [ngClass]="selectedIntent === 'CHILL' 
                        ? 'bg-[var(--accent-purple)] text-white border-[var(--accent-purple)] font-extrabold shadow-sm' 
                        : 'bg-white/[0.04] text-[var(--text-muted)] hover:text-white border-white/5'"
                    >
                      <lucide-icon name="coffee" class="h-3 w-3 shrink-0"></lucide-icon>
                      <span>Hueco</span>
                    </button>
                  </div>
                </div>

                <!-- Skills Pills (Font Sans) -->
                @if (currentMatch.skills && currentMatch.skills.length > 0) {
                  <div class="flex flex-wrap gap-1.5 pt-0.5">
                    @for (skill of currentMatch.skills.slice(0, 4); track skill) {
                      <span class="inline-flex items-center text-[10px] font-medium bg-white/[0.05] text-neutral-300 px-2 py-0.5 r-control-xs border border-white/5">
                        #{{ skill }}
                      </span>
                    }
                  </div>
                }
              </div>

              <!-- Bottom Prompt Hint inside card -->
              <div class="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-400 font-medium">
                <span>Desliza para elegir</span>
                <span>← Paso · Estudiar →</span>
              </div>
            </div>
          }
        }
      </div>

      <!-- ===================================================================== -->
      <!-- TINDER FLOATING ACTION DOCK (4 Control Buttons)                       -->
      <!-- ===================================================================== -->
      @if (hasCards) {
        <nav 
          aria-label="Acciones de descubrimiento"
          class="flex items-center justify-center gap-4 sm:gap-6 pt-5"
        >
          <!-- 1. REWIND / UNDO BUTTON -->
          <button
            type="button"
            [disabled]="currentIndex === 0"
            (click)="undo()"
            title="Volver a la tarjeta anterior (Tecla Z)"
            class="h-11 w-11 r-circle bg-[var(--surface-elevated)] hover:bg-[var(--surface-card-hover)] disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-sm"
          >
            <lucide-icon name="rotate-ccw" class="h-4 w-4"></lucide-icon>
          </button>

          <!-- 2. PASS (SWIPE LEFT) BUTTON -->
          <button
            type="button"
            (click)="triggerSwipe('left')"
            title="Paso (Flecha Izquierda o A)"
            class="h-14 w-14 r-circle bg-red-500/10 hover:bg-red-500/20 active:scale-90 border border-red-500/30 hover:border-red-500/60 text-red-400 flex items-center justify-center transition shadow-sm cursor-pointer"
          >
            <lucide-icon name="x" class="h-6 w-6 stroke-[2.5]"></lucide-icon>
          </button>

          <!-- 3. COPILOT AI INSIGHT BUTTON -->
          <button
            type="button"
            (click)="onAskAi()"
            title="Consultar al Copiloto IA sobre este match"
            class="h-11 w-11 r-circle bg-[var(--surface-elevated)] hover:bg-[var(--surface-card-hover)] border border-white/10 text-[var(--accent-orange)] hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-sm"
          >
            <lucide-icon name="sparkles" class="h-4 w-4"></lucide-icon>
          </button>

          <!-- 4. MATCH / ESTUDIAR (SWIPE RIGHT) BUTTON -->
          <button
            type="button"
            (click)="triggerSwipe('right')"
            title="¡Me interesa estudiar! (Flecha Derecha o D)"
            class="h-14 w-14 r-circle bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] active:scale-90 border-none text-black flex items-center justify-center transition shadow-sm cursor-pointer"
          >
            <lucide-icon name="zap" class="h-6 w-6 fill-black stroke-black"></lucide-icon>
          </button>
        </nav>

        <p class="text-[10px] text-neutral-400 font-medium pt-2 text-center">
          Atajos: [←] Paso &nbsp;·&nbsp; [→] Me interesa &nbsp;·&nbsp; [Z] Rebobinar
        </p>
      }

    </div>
  `
})
export class StudyCardDeckComponent implements OnChanges {
  @Input({ required: true }) matches: StudyBuddyMatch[] = [];
  @Output() connect = new EventEmitter<{ match: StudyBuddyMatch; intent: StudyIntent }>();
  @Output() askAi = new EventEmitter<string>();
  @Output() viewBeacons = new EventEmitter<void>();

  currentIndex = 0;
  selectedIntent: StudyIntent = 'EXAM';

  // Drag physics state
  isDragging = false;
  startX = 0;
  startY = 0;
  currentX = 0;
  currentY = 0;

  // Thresholds
  private readonly SWIPE_THRESHOLD = 100;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['matches']) {
      this.currentIndex = 0;
    }
  }

  get hasCards(): boolean {
    return this.currentIndex < this.matches.length;
  }

  get currentMatch(): StudyBuddyMatch | null {
    if (!this.hasCards) return null;
    return this.matches[this.currentIndex];
  }

  get deltaX(): number {
    return this.currentX - this.startX;
  }

  get deltaY(): number {
    return this.currentY - this.startY;
  }

  get activeCardTransform(): string {
    if (!this.isDragging) {
      return 'translate3d(0, 0, 0) rotate(0deg)';
    }
    const rotation = (this.deltaX / 14);
    return `translate3d(${this.deltaX}px, ${this.deltaY}px, 0) rotate(${rotation}deg)`;
  }

  get stampLikeOpacity(): number {
    if (!this.isDragging || this.deltaX <= 25) return 0;
    return Math.min(1, (this.deltaX - 25) / 75);
  }

  get stampPassOpacity(): number {
    if (!this.isDragging || this.deltaX >= -25) return 0;
    return Math.min(1, Math.abs(this.deltaX + 25) / 75);
  }

  formatCourse(name: string): string {
    return formatCourseName(name);
  }

  setIntent(intent: StudyIntent, event: Event): void {
    event.stopPropagation();
    this.selectedIntent = intent;
  }

  // Mouse Drag Events
  startDrag(event: MouseEvent): void {
    if ((event.target as HTMLElement).tagName === 'BUTTON') return;
    this.isDragging = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.currentX = event.clientX;
    this.currentY = event.clientY;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    this.currentX = event.clientX;
    this.currentY = event.clientY;
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (!this.isDragging) return;
    this.finishDrag();
  }

  // Touch Drag Events (Mobile)
  startTouchDrag(event: TouchEvent): void {
    if ((event.target as HTMLElement).tagName === 'BUTTON') return;
    if (event.touches.length !== 1) return;
    this.isDragging = true;
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
    this.currentX = event.touches[0].clientX;
    this.currentY = event.touches[0].clientY;
  }

  @HostListener('window:touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || event.touches.length !== 1) return;
    this.currentX = event.touches[0].clientX;
    this.currentY = event.touches[0].clientY;
  }

  @HostListener('window:touchend', ['$event'])
  onTouchEnd(): void {
    if (!this.isDragging) return;
    this.finishDrag();
  }

  private finishDrag(): void {
    this.isDragging = false;
    const dx = this.deltaX;

    if (dx > this.SWIPE_THRESHOLD) {
      this.triggerSwipe('right');
    } else if (dx < -this.SWIPE_THRESHOLD) {
      this.triggerSwipe('left');
    } else {
      // Reset position
      this.startX = 0;
      this.currentX = 0;
      this.startY = 0;
      this.currentY = 0;
    }
  }

  // Swipe Action Trigger
  triggerSwipe(direction: SwipeDirection): void {
    if (!this.hasCards || !this.currentMatch) return;

    const matched = this.currentMatch;
    const intent = this.selectedIntent;

    if (direction === 'right') {
      // Connect / Match Handshake
      this.connect.emit({ match: matched, intent });
    }

    // Advance to next card in stack
    this.currentIndex++;
    this.startX = 0;
    this.currentX = 0;
    this.startY = 0;
    this.currentY = 0;
  }

  undo(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.startX = 0;
      this.currentX = 0;
      this.startY = 0;
      this.currentY = 0;
    }
  }

  resetDeck(): void {
    this.currentIndex = 0;
    this.startX = 0;
    this.currentX = 0;
    this.startY = 0;
    this.currentY = 0;
  }

  onAskAi(): void {
    if (!this.currentMatch) return;
    const prompt = `Analiza la complementariedad académica con ${this.currentMatch.name} para ${this.currentMatch.courseName} en nuestra ventana compartida ${this.currentMatch.sharedWindow.dayName} ${this.currentMatch.sharedWindow.start}-${this.currentMatch.sharedWindow.end}. ¿Qué temas nos conviene estudiar juntos?`;
    this.askAi.emit(prompt);
  }

  // Keyboard Navigation
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.hasCards) return;
    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
      this.triggerSwipe('right');
    } else if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
      this.triggerSwipe('left');
    } else if (event.key === 'z' || event.key === 'Z') {
      this.undo();
    }
  }
}
