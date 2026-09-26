import { Component, EventEmitter, Input, OnInit, Output, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  UTPEvent, 
  UTPCurrentInterval, 
  CourseAssignment, 
  TaskWithSyllabusContext, 
  AssignmentRubric, 
  CourseEvaluation,
  ChatMessage
} from '@domain/models/utp.model';
import { 
  getCurrentAndNextClass, 
  getEventsForDay, 
  formatTime, 
  parseEventTitle, 
  parseDate,
  getDynamicStudentEvaluations,
  getCanonicalCourseKey 
} from '@data/schedule-parser';
import { getSynchronizedStudentTasks, calculateActivityUrgency } from '@data/activity-adapter';
import { getSyllabusWeekContext } from '@data/syllabus-engine';
import { resolveEventLocation, getClassroomLocation } from '@data/classroom-helper';
import { getCachedCalendarData, saveCachedCalendarData, getCachedSyllabus, getAllCachedSyllabi } from '@data/syllabus/client-storage';
import { getAuroraStyle } from '@data/aurora.helper';
import { ScheduleService } from '@data/services/schedule.service';
import { TaskService } from '@data/services/task.service';
import { ClassDetailModalComponent } from '@features/schedule/class-detail-modal.component';
import { TodayStore } from './today.store';

export type TodayTabSection = 'todayClasses' | 'tasks' | 'evaluations';

@Component({
  selector: 'app-today-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ClassDetailModalComponent],
  template: `
    <div class="space-y-6 text-white font-sans text-left">
      @if (isLoading) {
        <!-- Skeleton Loading State -->
        <div class="space-y-6 animate-pulse">
          <div class="rounded-3xl p-6 bg-[#141417] border border-white/5 space-y-4">
            <div class="flex items-center gap-2">
              <div class="h-5 w-24 bg-white/10 rounded-full"></div>
              <div class="h-5 w-20 bg-white/10 rounded-full"></div>
            </div>
            <div class="h-7 w-2/3 bg-white/10 rounded-xl"></div>
            <div class="h-4 w-1/3 bg-white/5 rounded-lg"></div>
          </div>

          <div class="space-y-3">
            <div class="h-6 w-48 bg-white/10 rounded-lg"></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="h-32 rounded-3xl bg-[#141417] border border-white/5 p-4 space-y-3">
                <div class="h-4 w-1/4 bg-white/10 rounded"></div>
                <div class="h-5 w-3/4 bg-white/10 rounded"></div>
              </div>
              <div class="h-32 rounded-3xl bg-[#141417] border border-white/5 p-4 space-y-3">
                <div class="h-4 w-1/4 bg-white/10 rounded"></div>
                <div class="h-5 w-3/4 bg-white/10 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <!-- 1. Hero Status Banner (Aurora Ambient Card) -->
        @if (bannerClass) {
        <div 
          class="aurora-ambient-card rounded-3xl p-5 sm:p-6 transition-all duration-300 shadow-none"
          [ngStyle]="auroraStyle"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-2 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                @if (isLiveNow) {
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] border border-white/[0.16] px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md shrink-0">
                    <span class="h-1.5 w-1.5 rounded-full bg-[var(--accent-lime)] animate-pulse"></span>
                    En vivo • Quedan {{ minutesRemainingCurrent }}m
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] border border-white/[0.16] px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md shrink-0">
                    <svg class="h-3 w-3 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                    </svg>
                    {{ minutesToNext !== null && minutesToNext <= 120 ? 'Próxima clase en ' + minutesToNext + ' min' : 'Siguiente sesión' | uppercase }}
                  </span>
                }

                @if (bannerClass.modality === 'P') {
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-white/90 shrink-0">
                    <svg class="h-3 w-3 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Presencial
                  </span>
                } @else if (bannerClass.modality === 'R') {
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-white/90 shrink-0">
                    <svg class="h-3 w-3 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m22 8-6 4 6 4V8Z"/>
                      <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
                    </svg>
                    Remoto Zoom
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.14] backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-white/90 shrink-0">
                    <svg class="h-3 w-3 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="2"/>
                      <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
                    </svg>
                    Virtual
                  </span>
                }
              </div>

              <h3 class="text-base sm:text-lg font-black text-white leading-tight">
                {{ parsedBannerTitle }}
              </h3>

              <p class="text-xs text-neutral-400 flex items-center gap-2 font-mono">
                <span class="text-neutral-300 font-medium">
                  {{ formatTime(bannerClass.startAt) }} – {{ formatTime(bannerClass.finishAt) }}
                </span>
              </p>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              @if (bannerClass.metadata?.zoomLink) {
                <a
                  [href]="bannerClass.metadata?.zoomLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-white border border-white/[0.16] backdrop-blur-md px-3.5 py-2 text-xs font-semibold shadow-none transition active:scale-95 no-underline"
                >
                  <svg class="h-3.5 w-3.5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m22 8-6 4 6 4V8Z"/>
                    <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
                  </svg>
                  <span>Unirse a Zoom</span>
                </a>
              }
              <button
                (click)="onAskAiClick('¿Qué temas tocan hoy en ' + parsedBannerTitle + ' y qué preguntas clave debería hacer en clase?')"
                class="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-white border border-white/[0.16] backdrop-blur-md px-3.5 py-2 text-xs font-semibold transition shadow-none active:scale-95 cursor-pointer"
              >
                <svg class="h-3.5 w-3.5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                </svg>
                <span>Consultar IA</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- 2. Flat Navigation Tabs -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div class="inline-flex items-center gap-1 bg-[var(--surface-card)] border border-[var(--border-subtle)] p-1 rounded-2xl overflow-x-auto no-scrollbar max-w-full text-xs shadow-none">
          <button
            (click)="activeSection = 'todayClasses'"
            class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 rounded-xl font-bold border-none"
            [ngClass]="activeSection === 'todayClasses' ? 'bg-white text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-[var(--surface-subtle)]'"
          >
            <span>Clases de Hoy</span>
            <span class="ml-0.5 text-[10px]" [ngClass]="activeSection === 'todayClasses' ? 'opacity-80' : 'opacity-60'">({{ todayEvents.length }})</span>
          </button>

          <button
            (click)="activeSection = 'tasks'"
            class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 rounded-xl font-bold border-none"
            [ngClass]="activeSection === 'tasks' ? 'bg-white text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-[var(--surface-subtle)]'"
          >
            <span>Tareas</span>
            <span class="ml-0.5 text-[10px]" [ngClass]="activeSection === 'tasks' ? 'opacity-80' : 'opacity-60'">({{ synchronizedTasks.length }})</span>
          </button>

          <button
            (click)="activeSection = 'evaluations'"
            class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 rounded-xl font-bold border-none"
            [ngClass]="activeSection === 'evaluations' ? 'bg-white text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-[var(--surface-subtle)]'"
          >
            <span>Evaluaciones</span>
          </button>
        </div>

        <div class="flex items-center gap-2 text-xs text-neutral-500 font-mono self-end sm:self-auto">
          <span>Semana {{ currentWeek }} de {{ totalWeeks }}</span>
          <span>•</span>
          <span>{{ periodName }}</span>
        </div>
      </div>

      <!-- 3. Section Content -->
      
      <!-- TAB: Clases de Hoy -->
      @if (activeSection === 'todayClasses') {
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3">
            <h3 class="text-sm sm:text-base font-bold text-white">
              Horario del Día: <span class="capitalize text-neutral-300 font-normal">{{ formattedTodayDate }}</span>
            </h3>
            <button
              (click)="navigateToWeekly.emit()"
              class="text-xs text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] font-semibold transition-colors self-start sm:self-auto bg-transparent border-none cursor-pointer"
            >
              Ver horario semanal completo →
            </button>
          </div>

          @if (todayEvents.length === 0) {
            <div class="py-16 text-center rounded-3xl bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 space-y-3 shadow-none">
              <svg class="h-10 w-10 mx-auto text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <p class="text-base font-bold text-white">¡No tienes sesiones programadas para hoy!</p>
              <p class="text-xs text-neutral-400">Aprovecha para avanzar en tus entregables y proyectos.</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (ev of todayEvents; track ev.id) {
                <div
                  (click)="selectedEventForModal = ev"
                  class="group p-3.5 sm:p-5 rounded-2xl flex items-center justify-between gap-3 transition-all duration-300 shadow-none cursor-pointer"
                  [ngClass]="isSessionActive(ev) ? 'bg-[var(--surface-card-hover)] border border-white/20' : 'bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] hover:border-white/20'"
                >
                  <div class="space-y-1 min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      @if (ev.modality === 'P') {
                        <span class="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#00e676] bg-[rgba(0,200,83,0.14)] border border-[rgba(0,200,83,0.32)] px-2.5 py-0.5 rounded-full">
                          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          Presencial
                        </span>
                      } @else if (ev.modality === 'R') {
                        <span class="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#ff7043] bg-[rgba(255,87,34,0.14)] border border-[rgba(255,87,34,0.32)] px-2.5 py-0.5 rounded-full">
                          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
                          </svg>
                          Remoto Zoom
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#a5a8ff] bg-[rgba(112,117,255,0.14)] border border-[rgba(112,117,255,0.32)] px-2.5 py-0.5 rounded-full">
                          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49"/>
                          </svg>
                          Virtual
                        </span>
                      }

                      <span class="font-mono text-[11px] sm:text-xs text-neutral-400 font-bold whitespace-nowrap">
                        {{ formatTime(ev.startAt) }} – {{ formatTime(ev.finishAt) }}
                      </span>

                      @if (ev.modality === 'P') {
                        <span class="text-[10px] sm:text-[11px] font-mono text-neutral-400 truncate">
                          • {{ getLocationForEvent(ev).aula }} ({{ getLocationForEvent(ev).pabellon }})
                        </span>
                      }

                      @if (isSessionActive(ev)) {
                        <span class="inline-flex items-center gap-1.5 text-[10px] font-bold text-white/90 bg-white/[0.08] border border-white/[0.14] px-2 py-0.5 rounded-full backdrop-blur-md">
                          <span class="h-1.5 w-1.5 rounded-full bg-[var(--accent-lime)] animate-pulse"></span>
                          Sesión Actual
                        </span>
                      }
                    </div>

                    <h4 class="text-xs sm:text-sm font-bold text-white group-hover:text-[var(--accent-lime)] transition-colors leading-snug truncate">
                      {{ getParsedTitle(ev.title) }}
                    </h4>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    @if (ev.modality === 'R' && ev.metadata?.zoomLink) {
                      <button
                        (click)="openZoomDirect($event, ev.metadata?.zoomLink)"
                        title="Unirse directo a Zoom"
                        aria-label="Unirse a Zoom"
                        class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md shadow-none transition active:scale-95 shrink-0 cursor-pointer"
                      >
                        <svg class="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
                        </svg>
                      </button>
                    }
                    <svg class="h-4 w-4 text-neutral-500 group-hover:text-white transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- TAB: Tareas -->
      @if (activeSection === 'tasks') {
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            <div class="flex items-center gap-2">
              <h3 class="text-sm sm:text-base font-bold text-white">
                Entregables y Tareas
              </h3>
              <span class="text-xs text-neutral-500 font-medium">
                ({{ filteredTasks.length }} de {{ synchronizedTasks.length }})
              </span>
            </div>

            <div class="inline-flex items-center gap-1 bg-[var(--surface-card)] border border-[var(--border-subtle)] p-1 rounded-2xl text-[11px] font-bold">
              <button
                (click)="taskFilter = 'all'"
                class="px-3 py-1 rounded-xl transition cursor-pointer border-none"
                [ngClass]="taskFilter === 'all' ? 'bg-white text-black font-extrabold' : 'text-neutral-400 hover:text-white hover:bg-[var(--surface-subtle)]'"
              >
                Todas ({{ synchronizedTasks.length }})
              </button>
              <button
                (click)="taskFilter = 'graded'"
                class="px-3 py-1 rounded-xl transition cursor-pointer border-none"
                [ngClass]="taskFilter === 'graded' ? 'bg-[rgba(255,87,34,0.15)] text-[#ff7043] font-extrabold' : 'text-neutral-400 hover:text-white hover:bg-[var(--surface-subtle)]'"
              >
                Calificadas ({{ gradedTasksCount }})
              </button>
              <button
                (click)="taskFilter = 'practice'"
                class="px-3 py-1 rounded-xl transition cursor-pointer border-none"
                [ngClass]="taskFilter === 'practice' ? 'bg-white text-black font-extrabold' : 'text-neutral-400 hover:text-white hover:bg-[var(--surface-subtle)]'"
              >
                Prácticas ({{ practiceTasksCount }})
              </button>
            </div>
          </div>

          <div class="space-y-2.5">
            @if (filteredTasks.length === 0) {
              <div class="p-8 text-center rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] text-xs text-neutral-400">
                No hay actividades en esta categoría.
              </div>
            } @else {
              @for (item of filteredTasks; track item.task.id) {
                <div class="rounded-2xl bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] hover:border-white/20 transition-colors p-4 sm:p-5 shadow-none text-white">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="space-y-1 flex-1 min-w-0">
                      <div class="flex flex-wrap items-center gap-2 text-xs">
                        <span class="font-semibold text-neutral-400">{{ item.task.courseName }}</span>
                        <span class="text-neutral-600">•</span>
                        <span class="text-neutral-400">Semana {{ item.task.week }}</span>

                        @if (item.task.status === 'submitted' || item.task.homeworkStatus === 'DELIVERED') {
                          <span class="text-neutral-600">•</span>
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 font-bold text-[11px]">
                            <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                              <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
                            </svg>
                            <span>Entregado</span>
                          </span>
                        }

                        @if (item.syllabusContext.officialEvaluation) {
                          <span class="text-neutral-600">•</span>
                          <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--badge-orange-bg)] border border-[var(--badge-orange-border)] text-[var(--badge-orange-text)] font-bold text-[11px]">
                            {{ item.syllabusContext.officialEvaluation.code }} ({{ item.syllabusContext.formulaWeight }}%)
                          </span>
                        }

                        @if (item.task.status !== 'submitted' && getTaskUrgency(item.task)) {
                          <span class="text-neutral-600">•</span>
                          <span class="text-[11px] font-medium" [ngClass]="getTaskUrgency(item.task)?.badgeVariant === 'orange' ? 'text-[var(--badge-orange-text)]' : 'text-neutral-400'">
                            {{ getTaskUrgency(item.task)?.label }}
                          </span>
                        }
                      </div>

                      <h4 class="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                        {{ item.task.title }}
                      </h4>
                    </div>

                    <div class="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                      @if (item.task.instructionsHtml) {
                        <button
                          (click)="selectedTaskForInstructions = item.task"
                          class="inline-flex items-center gap-1.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-white hover:text-black border border-[var(--border-subtle)] px-3.5 py-1.5 text-xs font-bold text-white transition active:scale-95 shadow-none cursor-pointer"
                        >
                          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
                          </svg>
                          <span>Indicaciones</span>
                        </button>
                      }

                      @if (item.task.rubric) {
                        <button
                          (click)="openRubric(item.task.rubric, item.task.title, item.task.courseName)"
                          class="inline-flex items-center gap-1.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-white hover:text-black border border-[var(--border-subtle)] px-3.5 py-1.5 text-xs font-bold text-white transition active:scale-95 shadow-none cursor-pointer"
                        >
                          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                          </svg>
                          <span>Rúbrica</span>
                        </button>
                      }

                      <button
                        (click)="onAskAiClick('¿Cómo resuelvo la actividad &quot;' + item.task.title + '&quot; del curso &quot;' + item.task.courseName + '&quot; según el sílabo y rúbrica oficial?')"
                        title="Consultar al Copiloto IA"
                        class="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-neutral-400 hover:text-white transition shadow-none cursor-pointer"
                      >
                        <svg class="h-3.5 w-3.5 text-[var(--accent-orange)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                        </svg>
                      </button>

                      <button
                        (click)="expandedTaskIds[item.task.id] = !expandedTaskIds[item.task.id]"
                        title="Ver detalles del sílabo"
                        class="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-neutral-400 hover:text-white transition shadow-none cursor-pointer"
                      >
                        @if (expandedTaskIds[item.task.id]) {
                          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
                        } @else {
                          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                        }
                      </button>
                    </div>
                  </div>

                  @if (expandedTaskIds[item.task.id]) {
                    <div class="mt-4 pt-4 border-t border-[var(--border-subtle)] text-xs space-y-2 text-neutral-300">
                      <div class="flex items-center gap-2 text-neutral-400">
                        <svg class="h-3.5 w-3.5 text-[var(--accent-blue)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 2v20"/>
                        </svg>
                        <span class="font-bold text-white">Contexto del Sílabo:</span>
                        <span>{{ item.syllabusContext.unitTitle }}</span>
                      </div>
                      @if (item.syllabusContext.sessionTopics.length > 0) {
                        <p class="text-neutral-400 pl-5">
                          • Tema de la semana: {{ item.syllabusContext.sessionTopics[0] }}
                        </p>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>
        </div>
      }

      <!-- TAB: Evaluaciones -->
      @if (activeSection === 'evaluations') {
        <div class="space-y-4">
          <div class="flex items-center justify-between pb-1">
            <h3 class="text-base sm:text-lg font-bold text-white">
              Evaluaciones Oficiales ({{ sortedEvaluations.length }})
            </h3>
          </div>

          <div class="space-y-2.5">
            @for (ev of sortedEvaluations; track ev.id) {
              <div class="p-4 sm:p-5 rounded-2xl bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] hover:border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors shadow-none">
                <div class="space-y-1">
                  <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="font-semibold text-neutral-400">{{ ev.courseName.split(' - ')[0] }}</span>
                    <span class="text-neutral-600">•</span>
                    <span class="font-semibold" [ngClass]="ev.week === currentWeek ? 'text-[var(--accent-lime)]' : ev.week - currentWeek === 1 ? 'text-[var(--accent-orange)]' : 'text-neutral-400'">
                      Semana {{ ev.week }} {{ ev.week === currentWeek ? '(Esta semana)' : '' }}
                    </span>
                    <span class="text-neutral-600">•</span>
                    <span class="font-bold text-[var(--badge-orange-text)] bg-[var(--badge-orange-bg)] border border-[var(--badge-orange-border)] px-2 py-0.5 rounded-md text-[11px]">
                      {{ ev.code }} ({{ ev.weightPercent }}%)
                    </span>
                  </div>

                  <h4 class="text-sm font-bold text-white leading-snug">{{ ev.fullName }}</h4>
                  @if (ev.description) {
                    <p class="text-xs text-neutral-400 max-w-2xl leading-relaxed">{{ ev.description }}</p>
                  }
                </div>

                <div class="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                  <button
                    (click)="selectedCourseForSyllabus = ev.courseName; isSyllabusModalOpen = true"
                    class="inline-flex items-center gap-1.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-muted)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition shadow-none cursor-pointer"
                  >
                    <svg class="h-3.5 w-3.5 text-[var(--accent-blue)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 2v20"/>
                    </svg>
                    <span>Sílabo</span>
                  </button>
                  <button
                    (click)="onAskAiClick('¿Cómo prepararme para ' + ev.code + ' (' + ev.fullName + ') de ' + ev.courseName + ' y qué rúbrica evalúa la UTP para sacar 20?')"
                    title="Consultar al Copiloto IA"
                    class="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-neutral-400 hover:text-white transition shadow-none cursor-pointer"
                  >
                    <svg class="h-3.5 w-3.5 text-[var(--accent-orange)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- MODAL: Detalle de Clase -->
      <app-class-detail-modal
        [isOpen]="!!selectedEventForModal"
        [event]="selectedEventForModal"
        [weekNumber]="currentWeek"
        [interval]="currentInterval"
        (close)="selectedEventForModal = null"
        (openGlobalAi)="onAskAiClick($event)"
      />

      <!-- MODAL: Rúbrica -->
      @if (activeRubric) {
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
          (click)="activeRubric = null"
        >
          <div 
            class="relative flex flex-col w-full max-w-3xl max-h-[85vh] rounded-3xl bg-[#111114] text-white shadow-2xl overflow-hidden border border-white/10"
            (click)="$event.stopPropagation()"
          >
            <div class="bg-[#16161a] px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-white">{{ activeRubric.taskTitle }}</h3>
                <p class="text-xs text-neutral-400">{{ activeRubric.courseName }} • Rúbrica Oficial (Total: {{ activeRubric.rubric.totalPoints }} pts)</p>
              </div>
              <button (click)="activeRubric = null" class="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white border-none cursor-pointer">✕</button>
            </div>
            <div class="flex-1 overflow-y-auto p-6 space-y-4">
              @for (crit of activeRubric.rubric.criteria; track crit.id) {
                <div class="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div class="flex justify-between items-center">
                    <h4 class="text-sm font-bold text-white">{{ crit.title }}</h4>
                    <span class="text-xs font-bold text-[var(--accent-lime)]">Max: {{ crit.maxPoints }} pts</span>
                  </div>
                  <p class="text-xs text-neutral-400">{{ crit.description }}</p>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    @for (lvl of crit.levels; track lvl.name) {
                      <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                        <div class="flex justify-between text-[11px] font-bold">
                          <span class="text-neutral-200">{{ lvl.name }}</span>
                          <span class="text-[var(--accent-lime)]">{{ lvl.points }} pts</span>
                        </div>
                        <p class="text-[10px] text-neutral-400 leading-snug">{{ lvl.description }}</p>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Indicaciones de Tarea -->
      @if (selectedTaskForInstructions) {
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
          (click)="selectedTaskForInstructions = null"
        >
          <div 
            class="relative flex flex-col w-full max-w-2xl max-h-[85vh] rounded-3xl bg-[#111114] text-white shadow-2xl overflow-hidden border border-white/10"
            (click)="$event.stopPropagation()"
          >
            <div class="bg-[#16161a] px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-white">{{ selectedTaskForInstructions.title }}</h3>
                <p class="text-xs text-neutral-400">{{ selectedTaskForInstructions.courseName }} • Semana {{ selectedTaskForInstructions.week }}</p>
              </div>
              <button (click)="selectedTaskForInstructions = null" class="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white border-none cursor-pointer">✕</button>
            </div>
            <div class="flex-1 overflow-y-auto p-6 space-y-4 utp-instructions-content" [innerHTML]="selectedTaskForInstructions.instructionsHtml">
            </div>
          </div>
        </div>
      }
    }
    </div>
  `
})
export class TodayViewComponent implements OnInit, OnDestroy {
  @Output() navigateToWeekly = new EventEmitter<void>();
  @Output() askAi = new EventEmitter<string>();

  isLoading = false;
  activeSection: TodayTabSection = 'todayClasses';
  taskFilter: 'all' | 'graded' | 'practice' = 'all';

  readonly todayStore = inject(TodayStore);

  get now(): Date {
    return this.todayStore.now();
  }

  get bannerClass(): UTPEvent | null {
    return this.todayStore.currentClass() || this.todayStore.nextClass();
  }

  get isLiveNow(): boolean {
    return !!this.todayStore.currentClass();
  }

  get minutesRemainingCurrent(): number | null {
    return this.todayStore.minutesRemainingCurrent();
  }

  get minutesToNext(): number | null {
    return this.todayStore.minutesToNext();
  }

  get todayEvents(): UTPEvent[] {
    return this.todayStore.eventsForToday();
  }

  currentInterval: UTPCurrentInterval = {
    period_name: '2026 - Ciclo 2 Agosto',
    week_number: 6,
    total_weeks: 18,
    current_date: new Date().toISOString(),
    start_of_interval: new Date().toISOString(),
    end_of_interval: new Date().toISOString(),
    start_of_period: new Date().toISOString(),
    end_of_period: new Date().toISOString(),
    events: []
  };

  currentWeek = 6;
  totalWeeks = 18;
  periodName = '2026 - Ciclo 2 Agosto';

  synchronizedTasks: TaskWithSyllabusContext[] = [];
  sortedEvaluations: CourseEvaluation[] = [];

  expandedTaskIds: Record<string, boolean> = {};

  // Modals state
  selectedEventForModal: UTPEvent | null = null;
  activeRubric: { rubric: AssignmentRubric; taskTitle: string; courseName: string } | null = null;
  selectedTaskForInstructions: CourseAssignment | null = null;
  selectedCourseForSyllabus: string | null = null;
  isSyllabusModalOpen = false;

  auroraStyle = getAuroraStyle(42);
  private readonly taskService = inject(TaskService);

  constructor(public scheduleService: ScheduleService) {}

  ngOnInit(): void {
    this.refreshData();
  }

  ngOnDestroy(): void {
    // Ciclo de reloj gestionado por TodayStore
  }

  refreshData(): void {
    const cachedCalendar = getCachedCalendarData();
    const interval = cachedCalendar?.data?.current_interval || this.scheduleService.currentInterval();
    if (interval && interval.events && interval.events.length > 0) {
      this.isLoading = false;
      const regularEvents = interval.events.filter(e => !e.isLongLasting && e.modality !== 'VT');
      this.currentInterval = {
        ...interval,
        events: regularEvents
      };
      this.currentWeek = this.currentInterval.week_number || 1;
      this.totalWeeks = this.currentInterval.total_weeks || 18;
      this.periodName = this.currentInterval.period_name || '2026 - Ciclo 2 Agosto';
      this.calculateCurrentBanner();
    } else {
      this.isLoading = true;
      this.loadScheduleFromBackend();
    }

    this.updateStudentEvaluationsAndTasks();
    this.calculateCurrentBanner();
  }

  updateStudentEvaluationsAndTasks(): void {
    const enrolledKeys = new Set<string>();
    const events = this.currentInterval?.events || [];
    for (const ev of events) {
      if (ev.metadata?.courseName) enrolledKeys.add(getCanonicalCourseKey(ev.metadata.courseName));
      if (ev.metadata?.courseId) enrolledKeys.add(getCanonicalCourseKey(ev.metadata.courseId));
      if (ev.metadata?.sectionCode) enrolledKeys.add(getCanonicalCourseKey(ev.metadata.sectionCode));
      const parsed = parseEventTitle(ev.title);
      if (parsed.cleanTitle) enrolledKeys.add(getCanonicalCourseKey(parsed.cleanTitle));
    }

    // 1. Cargar tareas oficiales en vivo desde el Backend / UTP Academic Gateway API
    this.loadTasksFromBackend(enrolledKeys);

    // 2. Filtrar evaluaciones estrictamente por los cursos matriculados del estudiante autenticado
    this.sortedEvaluations = getDynamicStudentEvaluations(enrolledKeys);
  }

  private loadTasksFromBackend(enrolledKeys: Set<string>): void {
    this.taskService.getUpcomingTasks(25).subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.length > 0) {
          const dynamicTasks: TaskWithSyllabusContext[] = res.data.map((u: any) => {
            const isGraded = u.isQualified !== false;
            const isDelivered = u.studentStatus === 'DELIVERED' || u.studentStatus === 'SUBMITTED';
            const courseTitle = u.courseName || '';
            const week = u.weekNumber || this.currentWeek || 1;
            const syllabusContext = getSyllabusWeekContext(courseTitle, week);

            const task: CourseAssignment = {
              id: u.id || u.activityId || `task-${Math.random()}`,
              courseId: u.courseId || '',
              courseName: courseTitle,
              sectionCode: u.sectionId || '',
              title: u.title || 'Evaluación Oficial',
              week: week,
              type: isGraded ? 'evaluation' : 'practice',
              dueDate: u.finishAt || u.startAt || '',
              isGraded: isGraded,
              status: isDelivered ? 'submitted' : 'pending',
              homeworkStatus: u.studentStatus || 'PENDING',
              availableUntil: u.finishAt,
              activityId: u.activityId,
              sectionId: u.sectionId
            };

            return { task, syllabusContext };
          });

          this.synchronizedTasks = dynamicTasks;
        } else {
          // Fallback a /tasks
          this.taskService.getTasks().subscribe({
            next: (taskRes) => {
              if (taskRes.success && taskRes.data && taskRes.data.length > 0) {
                this.synchronizedTasks = taskRes.data.map((t: any) => {
                  const week = t.week || this.currentWeek || 1;
                  const syllabusContext = getSyllabusWeekContext(t.courseName, week);
                  const isDelivered = t.isDelivered || t.homeworkStatus === 'DELIVERED';
                  const task: CourseAssignment = {
                    id: t.id || `task-${Math.random()}`,
                    courseId: t.sectionId || '',
                    courseName: t.courseName || '',
                    sectionCode: t.sectionId || '',
                    title: t.title || 'Tarea UTP',
                    week: week,
                    type: 'evaluation',
                    dueDate: t.dueDate,
                    isGraded: true,
                    status: isDelivered ? 'submitted' : 'pending',
                    homeworkStatus: t.homeworkStatus || 'PENDING'
                  };
                  return { task, syllabusContext };
                });
              } else {
                const fallback = getSynchronizedStudentTasks();
                this.synchronizedTasks = enrolledKeys.size > 0
                  ? fallback.filter(t => {
                      const cName = getCanonicalCourseKey(t.task.courseName || '');
                      const sCode = getCanonicalCourseKey(t.task.sectionCode || '');
                      return enrolledKeys.has(cName) || enrolledKeys.has(sCode) ||
                             Array.from(enrolledKeys).some(k => (cName && (cName.includes(k) || k.includes(cName))));
                    })
                  : [];
              }
            }
          });
        }
      },
      error: () => {
        const fallback = getSynchronizedStudentTasks();
        this.synchronizedTasks = enrolledKeys.size > 0
          ? fallback.filter(t => {
              const cName = getCanonicalCourseKey(t.task.courseName || '');
              const sCode = getCanonicalCourseKey(t.task.sectionCode || '');
              return enrolledKeys.has(cName) || enrolledKeys.has(sCode) ||
                     Array.from(enrolledKeys).some(k => (cName && (cName.includes(k) || k.includes(cName))));
            })
          : [];
      }
    });
  }

  loadScheduleFromBackend(): void {
    this.scheduleService.getSchedule().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.currentWeek = res.data.weekNumber || 1;
          this.totalWeeks = res.data.totalWeeks || 18;
          this.periodName = res.data.periodName || '2026 - Ciclo 2 Agosto';
          if (res.data.classes && res.data.classes.length > 0) {
            const todayMs = Date.now();
            const today = new Date(todayMs);
            const dayOfWeek = today.getDay();
            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() + daysToMonday);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);

            this.currentInterval = {
              period_name: this.periodName,
              week_number: this.currentWeek,
              total_weeks: this.totalWeeks,
              current_date: new Date().toISOString(),
              start_of_interval: weekStart.toISOString(),
              end_of_interval: weekEnd.toISOString(),
              start_of_period: res.data.startDate ? res.data.startDate.toString() : new Date().toISOString(),
              end_of_period: res.data.endDate ? res.data.endDate.toString() : new Date().toISOString(),
              events: res.data.classes.map(c => ({
                id: c.id,
                title: `${c.courseName.toUpperCase()}${c.section && c.section !== 'Sección Única' ? ' (' + c.section + ')' : ''} (Semana ${this.currentWeek}) - Sesión`,
                modality: c.modality || 'P',
                type: 'SESSION',
                startAt: typeof c.startAt === 'string' ? c.startAt : (c.startAt ? String(c.startAt) : ''),
                finishAt: typeof c.finishAt === 'string' ? c.finishAt : (c.finishAt ? String(c.finishAt) : ''),
                metadata: {
                  zoomLink: c.zoomLink,
                  classroom: c.classroom,
                  building: c.building,
                  floor: c.floor,
                  environmentType: c.environmentType,
                  teacher: c.teacher,
                  classLink: c.classLink,
                  sectionCode: c.section,
                  courseName: c.courseName
                }
              }))
            };
            saveCachedCalendarData({
              success: true,
              code: 200,
              message: 'Calendario sincronizado',
              idTransaction: 'sync-' + Date.now(),
              data: { current_interval: this.currentInterval }
            });
            this.updateStudentEvaluationsAndTasks();
            this.calculateCurrentBanner();
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.warn('Error al cargar horario desde backend:', err);
      }
    });
  }

  calculateCurrentBanner(): void {
    // El estado temporal y eventos del día se calculan reactivamente en TodayStore
  }

  get parsedBannerTitle(): string {
    return this.bannerClass ? parseEventTitle(this.bannerClass.title).cleanTitle : '';
  }

  get formattedTodayDate(): string {
    const raw = this.now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    return raw.replace(/de\s+([a-z])/i, (_, m) => 'De ' + m.toUpperCase());
  }

  get filteredTasks(): TaskWithSyllabusContext[] {
    return this.synchronizedTasks.filter(item => {
      if (this.taskFilter === 'graded') return item.task.isGraded || !!item.syllabusContext.officialEvaluation;
      if (this.taskFilter === 'practice') return !item.task.isGraded && !item.syllabusContext.officialEvaluation;
      return true;
    });
  }

  get gradedTasksCount(): number {
    return this.synchronizedTasks.filter(item => item.task.isGraded || !!item.syllabusContext.officialEvaluation).length;
  }

  get practiceTasksCount(): number {
    return this.synchronizedTasks.length - this.gradedTasksCount;
  }

  formatTime(dateStr: string): string {
    return formatTime(dateStr);
  }

  getParsedTitle(title: string): string {
    return parseEventTitle(title).cleanTitle;
  }

  getLocationForEvent(ev: UTPEvent) {
    return resolveEventLocation(ev);
  }

  isSessionActive(ev: UTPEvent): boolean {
    const s = parseDate(ev.startAt);
    const f = parseDate(ev.finishAt);
    const isLive = this.now >= s && this.now <= f;
    const nextOrLive = this.todayEvents.find(e => parseDate(e.finishAt) >= this.now) || this.todayEvents[0];
    const isNext = !isLive && ev.id === nextOrLive?.id && this.now < s;
    return isLive || isNext;
  }

  openZoomDirect(e: Event, link?: string): void {
    e.stopPropagation();
    if (link) window.open(link, '_blank');
  }

  getTaskUrgency(task: CourseAssignment) {
    return calculateActivityUrgency(task.dueDate);
  }

  openRubric(rubric: AssignmentRubric, taskTitle: string, courseName: string): void {
    this.activeRubric = { rubric, taskTitle, courseName };
  }

  onAskAiClick(prompt: string): void {
    this.askAi.emit(prompt);
  }
}
