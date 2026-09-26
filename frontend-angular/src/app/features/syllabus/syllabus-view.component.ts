import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcessedCourse, CourseEvaluation } from '@domain/models/utp.model';
import { ParsedSyllabus } from '@data/syllabus/types';
import { ScheduleService } from '@data/services/schedule.service';
import { SyllabusService } from '@data/services/syllabus.service';

@Component({
  selector: 'app-syllabus-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 text-white font-sans text-left">
      
      <!-- Header Info -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
        <div>
          <h2 class="text-xl sm:text-2xl font-black tracking-tight text-white">
            Asignaturas Matriculadas ({{ courses.length }})
          </h2>
          <p class="text-xs text-neutral-400 mt-1">
            Periodo {{ periodName }} • Sílabos oficiales, rúbricas y fórmulas de evaluación descargadas en tiempo real.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            (click)="onAskAi('Haz un resumen comparativo de todos mis cursos, sus exigencias y fechas de exámenes clave')"
            class="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] px-4 py-2 text-xs font-black text-black transition active:scale-95 shadow-none border-none cursor-pointer"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
            <span>Resumen IA</span>
          </button>
        </div>
      </div>

      <!-- Grid de Cursos -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (course of courses; track course.courseId) {
          <div class="flex flex-col justify-between rounded-3xl bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all p-5 space-y-4 group shadow-none">
            
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-1.5">
                  @for (m of course.modalities; track m) {
                    @if (m === 'P') {
                      <span class="inline-flex items-center gap-1 text-[10px] font-bold text-[#00e676] bg-[rgba(0,200,83,0.14)] border border-[rgba(0,200,83,0.32)] px-2.5 py-0.5 rounded-full">
                        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        Presencial
                      </span>
                    } @else if (m === 'R') {
                      <span class="inline-flex items-center gap-1 text-[10px] font-bold text-[#ff7043] bg-[rgba(255,87,34,0.14)] border border-[rgba(255,87,34,0.32)] px-2.5 py-0.5 rounded-full">
                        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                        Remoto Zoom
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1 text-[10px] font-bold text-[#a5a8ff] bg-[rgba(112,117,255,0.14)] border border-[rgba(112,117,255,0.32)] px-2.5 py-0.5 rounded-full">
                        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49"/></svg>
                        Virtual
                      </span>
                    }
                  }
                </div>

                <span class="flex items-center gap-1 text-[11px] font-medium text-neutral-400 bg-[var(--surface-subtle)] px-2.5 py-1 rounded-full">
                  <svg class="h-3 w-3 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>
                  {{ course.totalSessions }} {{ course.totalSessions === 1 ? 'sesión' : 'sesiones' }}
                </span>
              </div>

              <h3 class="text-base font-black text-white leading-snug tracking-tight group-hover:text-[var(--accent-yellow)] transition-colors">
                {{ course.name }}
              </h3>
            </div>

            <!-- Fila Unificada de Acciones -->
            <div class="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                (click)="openSyllabus(course.name)"
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-yellow)] hover:bg-[var(--accent-yellow-hover)] py-2.5 px-3 text-xs font-black text-black transition active:scale-95 shadow-none border-none cursor-pointer"
              >
                <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                <span>Sílabo & Rúbricas</span>
              </button>

              @if (course.zoomLink) {
                <a
                  [href]="course.zoomLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Entrar a sala Zoom de la clase"
                  class="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-white transition active:scale-95 shrink-0 shadow-none no-underline"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                </a>
              }

              <button
                (click)="onAskAi('Analiza el curso ' + course.name + ', su fórmula de evaluación y qué tips necesito para aprobar con 20')"
                title="Consultar al Agente sobre este curso"
                class="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-muted)] text-neutral-300 hover:text-white transition active:scale-95 shrink-0 shadow-none border-none cursor-pointer"
              >
                <svg class="h-4 w-4 text-[var(--accent-orange)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              </button>
            </div>

          </div>
        }
      </div>

      <!-- MODAL: Sílabo Completo & Rúbricas (Supabase Database - Pinned Header & Strict Scroll) -->
      @if (isSyllabusModalOpen) {
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-fade-in text-white font-sans"
          (click)="isSyllabusModalOpen = false"
        >
          <div 
            class="relative flex flex-col w-full max-w-3xl h-[88vh] max-h-[88vh] rounded-2xl bg-[#0a0a0e] text-white shadow-[0_24px_70px_rgba(0,0,0,0.95)] overflow-hidden border border-white/[0.09]"
            (click)="$event.stopPropagation()"
          >
            <!-- Header Fijo Pinned Siempre Visible -->
            <div class="px-5 py-3.5 bg-[#0e0f14] border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.08] text-[var(--accent-orange)] shrink-0">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                      {{ currentModalSyllabus?.generalInfo?.courseName || selectedCourseName }}
                    </h3>
                    @if (currentModalSyllabus) {
                      <span class="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-[var(--accent-lime)] bg-[var(--accent-lime)]/10 px-2 py-0.5 rounded-full shrink-0">
                        Oficial UTP
                      </span>
                    }
                  </div>
                  <p class="text-[11px] text-neutral-400 truncate">
                    {{ currentModalSyllabus?.generalInfo?.courseCode || 'UTP' }} • {{ currentModalSyllabus?.generalInfo?.credits || 3 }} Créditos • {{ currentModalSyllabus?.generalInfo?.modality || 'Presencial' }} • {{ currentModalSyllabus?.generalInfo?.weeklyHours || 4 }}h/sem
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                @if (selectedCourseSyllabusUrl) {
                  <a
                    [href]="selectedCourseSyllabusUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Descargar PDF Oficial"
                    class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-neutral-300 hover:text-white text-xs font-medium transition active:scale-95 no-underline"
                  >
                    <svg class="h-3.5 w-3.5 text-[var(--accent-lime)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>PDF</span>
                  </a>
                }

                <button 
                  (click)="isSyllabusModalOpen = false" 
                  class="rounded-xl p-2 text-neutral-400 hover:bg-white/[0.06] hover:text-white transition border-none bg-transparent cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <!-- Contenedor con Scroll Estrictamente Interno -->
            <div id="syllabus-scroll-container" class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
              
              @if (isSyncing) {
                <!-- Loading State -->
                <div class="flex flex-col items-center justify-center py-16 space-y-4 text-center">
                  <div class="h-10 w-10 border-3 border-[var(--accent-lime)] border-t-transparent rounded-full animate-spin"></div>
                  <div class="space-y-1">
                    <p class="text-sm font-bold text-white">{{ syncStep }}</p>
                    <p class="text-xs text-neutral-400">Cargando información del sílabo oficial...</p>
                  </div>
                </div>
              } @else if (currentModalSyllabus) {
                
                <!-- 1. Resumen Ejecutivo: Fórmula Matemática + Logro -->
                <div class="rounded-xl bg-white/[0.025] border border-white/[0.06] p-3.5 space-y-2.5">
                  <div class="flex items-center justify-between gap-3 flex-wrap">
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Fórmula de Evaluación
                      </span>
                      @if (currentModalSyllabus.formula) {
                        <button
                          (click)="copyFormula(currentModalSyllabus.formula)"
                          class="inline-flex items-center gap-1 text-[11px] text-[var(--accent-lime)] hover:underline border-none bg-transparent cursor-pointer p-0"
                        >
                          <span>{{ copiedFormula ? '✓ Copiada' : 'Copiar' }}</span>
                        </button>
                      }
                    </div>

                    <div class="text-xs sm:text-sm font-bold text-[var(--accent-lime)] tracking-wide select-all">
                      {{ currentModalSyllabus.formula || 'Fórmula no disponible' }}
                    </div>
                  </div>

                  @if (currentModalSyllabus.learningGoal) {
                    <div class="border-l-2 border-[var(--accent-orange)]/70 pl-3 py-0.5">
                      <p class="text-xs text-neutral-300 leading-relaxed font-normal">
                        {{ currentModalSyllabus.learningGoal }}
                      </p>
                    </div>
                  }
                </div>

                <!-- 2. Hitos de Evaluación (Pills Limpios) -->
                @if (currentModalSyllabus.evaluations && currentModalSyllabus.evaluations.length > 0) {
                  <div class="space-y-2">
                    <div class="flex items-center justify-between px-0.5">
                      <h4 class="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                        Sistema de Evaluación ({{ currentModalSyllabus.evaluations.length }} Hitos)
                      </h4>

                      <button
                        (click)="onAskAi('Analiza los criterios de evaluación de ' + (currentModalSyllabus.generalInfo.courseName || selectedCourseName) + ' y dame un plan estratégico para obtener la nota máxima.'); isSyllabusModalOpen = false;"
                        class="inline-flex items-center gap-1.5 text-xs text-[var(--accent-lime)] hover:text-white font-semibold transition active:scale-95 border-none bg-transparent cursor-pointer"
                      >
                        <svg class="h-3.5 w-3.5 text-[var(--accent-orange)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                        <span>Estrategia IA</span>
                      </button>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      @for (ev of currentModalSyllabus.evaluations; track ev.id || ev.type) {
                        <div class="rounded-lg bg-white/[0.025] hover:bg-white/[0.045] border border-white/[0.05] p-2.5 flex flex-col justify-between gap-1.5 transition-colors">
                          <div class="flex items-center justify-between gap-1">
                            <span class="text-xs font-bold text-white bg-white/[0.06] px-1.5 py-0.5 rounded">
                              {{ ev.type }}
                            </span>
                            <span class="text-[11px] font-bold text-[var(--accent-lime)] bg-[var(--accent-lime)]/10 px-1.5 py-0.5 rounded">
                              {{ ev.weightPercent }}%
                            </span>
                          </div>

                          <div class="text-[11px] font-medium text-neutral-200 truncate" [title]="ev.description">
                            {{ ev.description }}
                          </div>

                          <div class="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-white/[0.04]">
                            <span>Semana {{ ev.week }}</span>
                            <span>{{ ev.modality || 'Individual' }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- 3. Cronograma y Temario Semanal (Timeline Limpio y Elegante) -->
                @if (currentModalSyllabus.weeklySchedule && currentModalSyllabus.weeklySchedule.length > 0) {
                  <div class="space-y-2 pt-2">
                    <div class="flex items-center justify-between px-0.5">
                      <h4 class="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                        Cronograma Académico ({{ currentModalSyllabus.weeklySchedule.length }} Semanas)
                      </h4>
                      <span class="text-[11px] text-neutral-400">
                        En curso: <strong class="text-[var(--accent-lime)]">Semana {{ currentWeek }}</strong>
                      </span>
                    </div>

                    <div class="space-y-1.5">
                      @for (session of currentModalSyllabus.weeklySchedule; track session.week) {
                        @let isCurrent = session.week === currentWeek;
                        <div
                          [id]="isCurrent ? 'syllabus-current-week' : null"
                          class="rounded-xl p-3 transition-all text-xs border"
                          [ngClass]="isCurrent 
                            ? 'bg-[#121318] border-[var(--accent-lime)]/40 shadow-[0_0_16px_rgba(202,255,0,0.06)]' 
                            : 'bg-white/[0.015] hover:bg-white/[0.035] border-white/[0.04]'"
                        >
                          <!-- Cabecera de la Semana -->
                          <div class="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-white/[0.04]">
                            <div class="flex items-center gap-2">
                              <span class="text-xs font-bold" [ngClass]="isCurrent ? 'text-[var(--accent-lime)] font-black' : 'text-neutral-200'">
                                Semana {{ session.week }}
                              </span>
                              
                              @if (isCurrent) {
                                <span class="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-black bg-[var(--accent-lime)] px-2 py-0.5 rounded-full">
                                  ● En Curso
                                </span>
                              }

                              <span class="text-[10px] text-neutral-400 bg-white/[0.03] px-1.5 py-0.5 rounded">
                                {{ session.unit || 'Unidad ' + Math.ceil(session.week / 4) }}
                              </span>
                            </div>

                            @if (session.evaluation) {
                              <span class="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--accent-orange)] bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30 px-2 py-0.5 rounded-full">
                                Entrega: {{ session.evaluation }}
                              </span>
                            }
                          </div>

                          <!-- Lista de Temas Limpia -->
                          <div class="pt-1.5 space-y-1">
                            @if (session.topics && session.topics.length > 0) {
                              @for (t of session.topics; track t) {
                                @let cleanT = cleanTopic(t);
                                @if (cleanT) {
                                  <div class="flex items-start gap-1.5 text-neutral-200 leading-snug">
                                    <span class="text-[10px] mt-0.5 shrink-0" [ngClass]="isCurrent ? 'text-[var(--accent-lime)]' : 'text-neutral-500'">•</span>
                                    <span>{{ cleanT }}</span>
                                  </div>
                                }
                              }
                            } @else if (session.topic) {
                              @let cleanT = cleanTopic(session.topic);
                              @if (cleanT) {
                                <div class="flex items-start gap-1.5 text-neutral-200 leading-snug">
                                  <span class="text-[10px] mt-0.5 shrink-0" [ngClass]="isCurrent ? 'text-[var(--accent-lime)]' : 'text-neutral-500'">•</span>
                                  <span>{{ cleanT }}</span>
                                </div>
                              }
                            } @else {
                              <p class="text-neutral-400 italic text-[11px]">
                                Desarrollo temático y actividades de la sesión.
                              </p>
                            }
                          </div>

                          <!-- Actividad si es no-genérica -->
                          @if (session.activities && isMeaningfulActivity(session.activities)) {
                            <div class="mt-1.5 pt-1.5 border-t border-white/[0.03] flex items-start gap-1.5 text-[10px] text-neutral-400">
                              <span class="font-semibold text-neutral-300 shrink-0">Actividad:</span>
                              <span class="leading-relaxed">{{ getActivityText(session.activities) }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }

              } @else {
                <div class="py-12 text-center text-neutral-400 space-y-2">
                  <p class="text-sm font-semibold text-white">No se encontró el sílabo oficial para este curso.</p>
                  <button
                    (click)="openSyllabus(selectedCourseName)"
                    class="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-white cursor-pointer"
                  >
                    Reintentar
                  </button>
                </div>
              }

            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class SyllabusViewComponent implements OnInit {
  @Output() askAi = new EventEmitter<string>();

  isSyllabusModalOpen = false;
  selectedCourseName = '';
  selectedCourseSyllabusUrl?: string;
  currentModalSyllabus: ParsedSyllabus | null = null;
  isSyncing = false;
  syncStep = '';
  copiedFormula = false;

  Math = Math;

  constructor(
    public scheduleService: ScheduleService,
    private syllabusService: SyllabusService
  ) {}

  get periodName(): string {
    return this.scheduleService.currentInterval()?.period_name || '2026 - Ciclo 2 Agosto';
  }

  get currentWeek(): number {
    return this.scheduleService.currentSchedule()?.weekNumber || this.scheduleService.currentInterval()?.week_number || 1;
  }

  get courses(): ProcessedCourse[] {
    return this.scheduleService.processedCourses();
  }

  ngOnInit(): void {
    if (!this.scheduleService.currentInterval() || this.scheduleService.processedCourses().length === 0) {
      this.scheduleService.getSchedule().subscribe();
    }
  }

  cleanTopic(raw: string): string {
    if (!raw) return '';
    let cleaned = raw.replace(/^[•\.\-\s]+/, '').trim();
    cleaned = cleaned.replace(/\(?corresponde a la nota de[^\)]*\)?/gi, '').trim();
    return cleaned;
  }

  isMeaningfulActivity(act: any): boolean {
    if (!act) return false;
    const str = Array.isArray(act) ? act.join(' ') : String(act);
    const generic = 'Desarrollo de competencias formativas, ejercicios prácticos y retroalimentación.';
    return str.trim().toLowerCase() !== generic.toLowerCase();
  }

  getActivityText(act: any): string {
    if (!act) return '';
    return Array.isArray(act) ? act.join(', ') : String(act);
  }

  openSyllabus(courseName: string): void {
    this.selectedCourseName = courseName;
    this.isSyllabusModalOpen = true;

    const course = this.courses.find(c => c.name === courseName || c.courseId === courseName);
    this.selectedCourseSyllabusUrl = course?.syllabusUrl;

    this.isSyncing = true;
    this.syncStep = `Cargando sílabo oficial de ${courseName}...`;

    this.syllabusService.getSyllabus(
      courseName,
      course?.sectionCode,
      course?.syllabusUrl
    ).subscribe({
      next: (res) => {
        this.isSyncing = false;
        if (res.success && res.data) {
          this.currentModalSyllabus = res.data;
          this.scrollToCurrentWeek();
        }
      },
      error: () => {
        this.isSyncing = false;
      }
    });
  }

  copyFormula(formula: string): void {
    if (!formula) return;
    navigator.clipboard.writeText(formula);
    this.copiedFormula = true;
    setTimeout(() => {
      this.copiedFormula = false;
    }, 2000);
  }

  scrollToCurrentWeek(): void {
    setTimeout(() => {
      const container = document.getElementById('syllabus-scroll-container');
      const el = document.getElementById('syllabus-current-week');
      if (container && el) {
        // Scroll exclusivamente dentro del contenedor interno del modal, NUNCA sobre la ventana
        const top = el.offsetTop - container.offsetTop - 80;
        container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    }, 150);
  }

  onAskAi(prompt: string): void {
    this.askAi.emit(prompt);
  }
}
