import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParsedSyllabus, SyllabusWeeklySession } from '@data/syllabus/types';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-syllabus-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 z-50 w-screen h-screen bg-[#0a0a0c] text-white overflow-y-auto animate-fade-in font-sans custom-scrollbar select-text"
        (click)="$event.stopPropagation()"
      >
        <!-- ───── Top Navigation Bar (Sticky Minimalist) ───── -->
        <header class="sticky top-0 z-40 bg-[#0a0a0c]/90 backdrop-blur-xl px-6 py-4 sm:px-12 flex items-center justify-between border-b border-white/[0.08]">
          <div class="flex items-center gap-3">
            <button
              type="button"
              (click)="onClose()"
              class="inline-flex items-center gap-2 rounded-[var(--r-md)] bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-3 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <lucide-icon name="arrow-left" class="h-4 w-4"></lucide-icon>
              <span>Volver</span>
              <kbd class="hidden sm:inline-block text-[10px] text-neutral-500 bg-white/5 px-1.5 py-0.5 rounded">ESC</kbd>
            </button>

            @if (syllabus) {
              <div class="hidden md:flex items-center gap-2 text-xs text-neutral-500 pl-2">
                <span class="h-1.5 w-1.5 rounded-full bg-[var(--utopik-green-yellow)]"></span>
                <span>Oficial UTP • Periodo 2026</span>
              </div>
            }
          </div>

          <div class="flex items-center gap-2">
            @if (selectedCourseSyllabusUrl) {
              <a
                [href]="selectedCourseSyllabusUrl"
                target="_blank"
                rel="noopener noreferrer"
                title="Descargar Sílabo Oficial PDF"
                class="inline-flex items-center gap-1.5 rounded-[var(--r-md)] bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white px-3.5 py-1.5 text-xs font-medium transition active:scale-95 no-underline cursor-pointer"
              >
                <lucide-icon name="download" class="h-3.5 w-3.5 text-[var(--utopik-green-yellow)]"></lucide-icon>
                <span>Descargar PDF</span>
              </a>
            }

            <button
              type="button"
              (click)="onAskAi('Analiza los criterios de evaluación de ' + (syllabus?.generalInfo?.courseName || selectedCourseName) + ' y dame un plan estratégico paso a paso para obtener nota 20.'); onClose()"
              class="inline-flex items-center gap-1.5 rounded-[var(--r-md)] bg-[var(--utopik-green-yellow)] hover:bg-[#aef036] text-black px-3.5 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <lucide-icon name="sparkles" class="h-3.5 w-3.5 text-black"></lucide-icon>
              <span>Estrategia IA</span>
            </button>

            <button
              type="button"
              (click)="onClose()"
              class="flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] text-neutral-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
              aria-label="Cerrar modal"
            >
              <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
            </button>
          </div>
        </header>

        <!-- ───── Fullscreen Main Content Container (Margen superior amplio & respiración editorial) ───── -->
        <main class="max-w-6xl mx-auto px-6 sm:px-12 pt-20 sm:pt-28 pb-32 space-y-16">

          @if (isSyncing) {
            <!-- Loading State -->
            <div class="flex flex-col items-center justify-center py-32 space-y-4 text-center">
              <div class="h-10 w-10 rounded-full border-2 border-[var(--utopik-green-yellow)] border-t-transparent animate-spin"></div>
              <div class="space-y-1">
                <p class="text-base font-bold text-white">{{ syncStep }}</p>
                <p class="text-xs text-neutral-500">Recuperando sílabo curricular y fórmulas oficiales...</p>
              </div>
            </div>
          } @else if (syllabus) {

            <!-- 1. Hero Editorial Section (Espaciado amplio para máxima legibilidad) -->
            <section class="pt-4 sm:pt-8 pb-12 border-b border-white/[0.08] space-y-6">
              <div class="flex flex-wrap items-center gap-2.5 text-xs uppercase tracking-widest text-neutral-500 font-semibold">
                <span>Sílabo Oficial</span>
                <span>•</span>
                <span>{{ syllabus.generalInfo.courseCode || 'UTP' }}</span>
                <span>•</span>
                <span>{{ syllabus.generalInfo.credits || 3 }} Créditos</span>
                <span>•</span>
                <span>{{ syllabus.generalInfo.modality || 'Presencial' }}</span>
                <span>•</span>
                <span>{{ syllabus.generalInfo.weeklyHours || 4 }}h / semana</span>
              </div>

              <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] pt-1">
                {{ syllabus.generalInfo.courseName || selectedCourseName }}
              </h1>

              @if (syllabus.learningGoal) {
                <p class="text-sm sm:text-base text-neutral-400 max-w-4xl leading-relaxed font-normal pt-2">
                  {{ syllabus.learningGoal }}
                </p>
              }
            </section>

            <!-- 2. Sistema de Evaluación (RunOnWeb Minimalist Horizontal Lines) -->
            @if (syllabus.evaluations && syllabus.evaluations.length > 0) {
              <section class="pt-12 sm:pt-16 space-y-6">
                <div class="flex items-baseline justify-between gap-4 pb-2">
                  <h2 class="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Sistema de evaluación
                  </h2>

                  <span class="text-xs text-neutral-500 hidden sm:inline-block">
                    Total: 100% de la nota final
                  </span>
                </div>

                <!-- Minimalist Horizontal Divider Lines (divide-y divide-white/[0.08]) -->
                <div class="divide-y divide-white/[0.08] border-t border-b border-white/[0.08]">
                  @for (ev of syllabus.evaluations; track ev.id || ev.type; let idx = $index) {
                    <div class="py-4 px-2 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                      
                      <!-- Col 1: Index + Dot + Code + Modality -->
                      <div class="flex items-center gap-3 min-w-[200px] shrink-0">
                        <span class="text-xs text-neutral-500 w-5 tabular-nums">{{ padZero(idx + 1) }}</span>
                        <span class="h-2 w-2 rounded-[2px] bg-[var(--utopik-green-yellow)] shrink-0 shadow-[0_0_8px_rgba(187,244,81,0.5)]"></span>
                        <span class="text-base font-bold text-white tracking-tight">{{ ev.type }}</span>
                        @if (ev.modality) {
                          <span class="text-[10px] uppercase px-2 py-0.5 rounded bg-white/5 text-neutral-400 font-semibold">
                            {{ ev.modality }}
                          </span>
                        }
                      </div>

                      <!-- Col 2: Descripción -->
                      <div class="flex-1 min-w-0 md:px-6">
                        <p class="text-sm text-neutral-300 leading-relaxed truncate" [title]="ev.description">
                          {{ ev.description }}
                        </p>
                      </div>

                      <!-- Col 3: Semana -->
                      <div class="w-28 shrink-0">
                        <span class="text-xs text-neutral-400">
                          Semana {{ ev.week }}
                        </span>
                      </div>

                      <!-- Col 4: Peso Oficial -->
                      <div class="w-20 shrink-0 text-left md:text-right">
                        <span class="text-base font-bold text-[var(--utopik-green-yellow)] tabular-nums">
                          {{ ev.weightPercent }}%
                        </span>
                      </div>

                    </div>
                  }
                </div>
              </section>
            }

            <!-- 3. Cronograma de Clases por Semanas (Evaluaciones en Blanco Platinum, Semana Actual en Carbón) -->
            @if (syllabus.weeklySchedule && syllabus.weeklySchedule.length > 0) {
              <section class="pt-16 sm:pt-20 space-y-6">
                <div class="flex items-baseline justify-between gap-4 pb-2">
                  <h2 class="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Cronograma de clases
                  </h2>

                  <div class="text-xs text-neutral-400">
                    En curso: <span class="font-bold text-white">Semana {{ currentWeek }}</span>
                  </div>
                </div>

                <!-- Minimalist Horizontal Divider Lines (divide-y divide-white/[0.08]) -->
                <div class="divide-y divide-white/[0.08] border-t border-b border-white/[0.08]">
                  @for (session of syllabus.weeklySchedule; track session.week) {
                    @let isCurrent = session.week === currentWeek;
                    @let hasEval = isEvaluationWeek(session);
                    @let evalLabel = getEvaluationLabel(session);

                    <div
                      [id]="isCurrent ? 'syllabus-current-week' : null"
                      class="py-5 px-3 sm:px-4 transition-colors"
                      [ngClass]="hasEval 
                        ? 'bg-[var(--utopik-platinum)] text-black' 
                        : (isCurrent ? 'bg-[var(--utopik-carbon-black)] text-white' : 'hover:bg-white/[0.02] text-white')"
                    >
                      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                        <div class="flex items-center gap-3">
                          <span 
                            class="text-xs w-5 tabular-nums"
                            [ngClass]="hasEval ? 'text-neutral-700 font-bold' : (isCurrent ? 'text-neutral-300 font-bold' : 'text-neutral-500')"
                          >
                            {{ padZero(session.week) }}
                          </span>
                          <span 
                            class="h-2 w-2 rounded-[2px] shrink-0" 
                            [ngClass]="hasEval ? 'bg-black' : (isCurrent ? 'bg-[var(--utopik-green-yellow)] shadow-[0_0_8px_rgba(187,244,81,0.5)]' : 'bg-neutral-600')"
                          ></span>
                          <span 
                            class="text-base tracking-tight"
                            [ngClass]="hasEval ? 'font-black text-black' : (isCurrent ? 'font-black text-white' : 'font-bold text-neutral-200')"
                          >
                            Semana {{ session.week }}
                          </span>
                          
                          @if (isCurrent) {
                            <span 
                              class="inline-flex items-center gap-1.5 rounded-[var(--r-xs)] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                              [ngClass]="hasEval ? 'bg-black text-[var(--utopik-green-yellow)]' : 'bg-[var(--utopik-green-yellow)] text-black'"
                            >
                              <span 
                                class="h-1.5 w-1.5 rounded-full animate-pulse"
                                [ngClass]="hasEval ? 'bg-[var(--utopik-green-yellow)]' : 'bg-black'"
                              ></span>
                              En Curso
                            </span>
                          }

                          <span 
                            class="text-[10px] uppercase px-2 py-0.5 rounded font-semibold"
                            [ngClass]="hasEval ? 'bg-black/10 text-neutral-800' : (isCurrent ? 'bg-white/10 text-neutral-300' : 'bg-white/5 text-neutral-500')"
                          >
                            {{ session.unit || 'Unidad ' + Math.ceil(session.week / 4) }}
                          </span>
                        </div>

                        @if (hasEval) {
                          <span 
                            class="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-[var(--r-md)] bg-black text-[var(--utopik-green-yellow)]"
                          >
                            <span class="h-1.5 w-1.5 rounded-full bg-[var(--utopik-green-yellow)]"></span>
                            Evaluación: {{ evalLabel }}
                          </span>
                        }
                      </div>

                      <!-- Temas y Actividades de la Semana -->
                      <div class="pl-8 sm:pl-10 space-y-1.5 pt-1">
                        @if (session.topics && session.topics.length > 0) {
                          @for (t of session.topics; track t) {
                            @let cleanT = cleanTopic(t);
                            @if (cleanT) {
                              <div 
                                class="flex items-start gap-2 text-xs leading-relaxed"
                                [ngClass]="hasEval ? 'text-neutral-900 font-medium' : (isCurrent ? 'text-neutral-200' : 'text-neutral-300')"
                              >
                                <span [ngClass]="hasEval ? 'text-neutral-600' : (isCurrent ? 'text-[var(--utopik-green-yellow)]' : 'text-neutral-500')" class="mt-0.5">•</span>
                                <span>{{ cleanT }}</span>
                              </div>
                            }
                          }
                        } @else if (session.topic) {
                          @let cleanT = cleanTopic(session.topic);
                          @if (cleanT) {
                            <div 
                              class="flex items-start gap-2 text-xs leading-relaxed"
                              [ngClass]="hasEval ? 'text-neutral-900 font-medium' : (isCurrent ? 'text-neutral-200' : 'text-neutral-300')"
                            >
                              <span [ngClass]="hasEval ? 'text-neutral-600' : (isCurrent ? 'text-[var(--utopik-green-yellow)]' : 'text-neutral-500')" class="mt-0.5">•</span>
                              <span>{{ cleanT }}</span>
                            </div>
                          }
                        }

                        @if (session.activities) {
                          <div 
                            class="pt-2 text-xs flex items-start gap-2"
                            [ngClass]="hasEval ? 'text-neutral-800' : (isCurrent ? 'text-neutral-300' : 'text-neutral-400')"
                          >
                            <span 
                              class="text-[10px] uppercase shrink-0 font-bold"
                              [ngClass]="hasEval ? 'text-neutral-600' : (isCurrent ? 'text-neutral-400' : 'text-neutral-500')"
                            >
                              Actividad:
                            </span>
                            <span class="leading-relaxed" [ngClass]="hasEval ? 'font-medium' : ''">
                              {{ getActivityText(session.activities) }}
                            </span>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </section>
            }

            <!-- 5. Bibliografía y Metodología (Minimalist Clean Text) -->
            @if (syllabus.methodologySummary) {
              <section class="space-y-4 pt-4 pb-8">
                <div class="flex items-baseline gap-2 pb-2">
                  <h2 class="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Bibliografía y metodología
                  </h2>
                </div>

                <div class="rounded-[var(--r-xl)] bg-[var(--utopik-carbon-black)] p-6 text-xs text-neutral-300 leading-relaxed">
                  <p class="whitespace-pre-line">{{ syllabus.methodologySummary }}</p>
                </div>
              </section>
            }

          } @else {
            <!-- Empty Error State -->
            <div class="py-32 text-center space-y-4">
              <lucide-icon name="file-question" class="h-12 w-12 mx-auto text-neutral-600"></lucide-icon>
              <div class="space-y-1">
                <p class="text-base font-bold text-white">No se encontró el sílabo oficial para este curso.</p>
                @if (syllabusErrorMessage) {
                  <p class="max-w-md mx-auto text-xs text-neutral-400">{{ syllabusErrorMessage }}</p>
                }
              </div>
              <button
                type="button"
                (click)="onRetry()"
                class="inline-flex items-center gap-2 rounded-[var(--r-md)] bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-semibold text-white transition cursor-pointer"
              >
                <lucide-icon name="rotate-ccw" class="h-3.5 w-3.5"></lucide-icon>
                <span>Reintentar descarga</span>
              </button>
            </div>
          }

        </main>
      </div>
    }
  `,
})
export class SyllabusModalComponent {
  @Input() isOpen = false;
  @Input() syllabus: ParsedSyllabus | null = null;
  @Input() isSyncing = false;
  @Input() syncStep = '';
  @Input() selectedCourseName = '';
  @Input() selectedCourseSyllabusUrl?: string;
  @Input() syllabusErrorMessage: string | null = null;
  @Input() currentWeek = 1;
  @Output() close = new EventEmitter<void>();
  @Output() askAi = new EventEmitter<string>();
  @Output() retry = new EventEmitter<void>();

  Math = Math;

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (this.isOpen) {
      this.onClose();
    }
  }

  padZero(num: number): string {
    return String(num).padStart(2, '0');
  }

  isEvaluationWeek(session: SyllabusWeeklySession): boolean {
    if (session.evaluation && session.evaluation.trim().length > 0) return true;
    if (session.isDeliverableForClassScore) return true;
    return !!this.syllabus?.evaluations?.some(e => e.week === session.week);
  }

  getEvaluationLabel(session: SyllabusWeeklySession): string {
    if (session.evaluation && session.evaluation.trim().length > 0) {
      return session.evaluation;
    }
    const matched = this.syllabus?.evaluations?.filter(e => e.week === session.week);
    if (matched && matched.length > 0) {
      return matched.map(m => `${m.type} (${m.weightPercent}%)`).join(' + ');
    }
    return 'Evaluación Calificada';
  }

  cleanTopic(raw: string): string {
    if (!raw) return '';
    let cleaned = raw.replace(/^[•.—\s]+/, '').trim();
    cleaned = cleaned.replace(/\(corresponde a la nota de [^)]*\)/gi, '').trim();
    return cleaned;
  }

  getActivityText(act: any): string {
    if (!act) return '';
    return Array.isArray(act) ? act.join(', ') : String(act);
  }

  onClose(): void {
    this.close.emit();
  }

  onAskAi(prompt: string): void {
    this.askAi.emit(prompt);
  }

  onRetry(): void {
    this.retry.emit();
  }
}
