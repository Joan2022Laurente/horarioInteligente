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
import { TaskSyncItem } from '@domain/models/task.model';
import { 
  getCurrentAndNextClass, 
  getEventsForDay, 
  formatTime, 
  parseEventTitle, 
  parseDate,
  getDynamicStudentEvaluations,
  getCanonicalCourseKey 
} from '@data/schedule-parser';
import { getSynchronizedStudentTasks, calculateActivityUrgency, ActivityUrgency } from '@data/activity-adapter';
import { getSyllabusWeekContext } from '@data/syllabus-engine';
import { resolveEventLocation, getClassroomLocation } from '@data/classroom-helper';
import { getCachedCalendarData, saveCachedCalendarData, getCachedSyllabus, getAllCachedSyllabi } from '@data/syllabus/client-storage';
import { getAuroraStyle } from '@data/aurora.helper';
import { ScheduleService } from '@data/services/schedule.service';
import { TaskService } from '@data/services/task.service';
import { ClassDetailModalComponent } from '@features/schedule/class-detail-modal.component';
import { TodayStore } from './today.store';
import { LucideAngularModule } from 'lucide-angular';

export type TodayTabSection = 'todayClasses' | 'tasks' | 'evaluations';

@Component({
  selector: 'app-today-view',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ClassDetailModalComponent, 
    LucideAngularModule
  ],
  template: `
    <div class="space-y-6 text-white font-sans text-left">
      @if (isLoading) {
        <!-- Skeleton Loading State -->
        <div class="space-y-6 animate-pulse">
          <div class="rounded-[var(--r-3xl)] p-6 bg-[var(--utopik-carbon-black)] space-y-4">
            <div class="flex items-center gap-2">
              <div class="h-5 w-24 bg-white/10 rounded-full"></div>
              <div class="h-5 w-20 bg-white/10 rounded-full"></div>
            </div>
            <div class="h-7 w-2/3 bg-white/10 rounded-[var(--r-xl)]"></div>
            <div class="h-4 w-1/3 bg-white/5 rounded-[var(--r-md)]"></div>
          </div>

          <div class="space-y-3">
            <div class="h-6 w-48 bg-white/10 rounded-[var(--r-md)]"></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="h-32 rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)] p-4 space-y-3">
                <div class="h-4 w-1/4 bg-white/10 rounded-[var(--r-sm)]"></div>
                <div class="h-5 w-3/4 bg-white/10 rounded-[var(--r-sm)]"></div>
              </div>
              <div class="h-32 rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)] p-4 space-y-3">
                <div class="h-4 w-1/4 bg-white/10 rounded-[var(--r-sm)]"></div>
                <div class="h-5 w-3/4 bg-white/10 rounded-[var(--r-sm)]"></div>
              </div>
            </div>
          </div>
        </div>
      } @else {
        <!-- 1. Hero Status Banner -->
        @if (bannerClass) {
          <div 
            class="rounded-[var(--r-3xl)] p-5 sm:p-6 transition-all duration-300 shadow-none bg-[var(--utopik-carbon-black)]"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="space-y-2 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  @if (isLiveNow) {
                    <span class="inline-flex items-center gap-1.5 rounded-[var(--r-xs)] bg-white/[0.08] px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md shrink-0">
                      <span class="h-1.5 w-1.5 rounded-full bg-[var(--utopik-green-yellow)] animate-pulse"></span>
                      En vivo • Quedan {{ minutesRemainingCurrent }}m
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1.5 rounded-[var(--r-xs)] bg-white/[0.08] px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md shrink-0">
                      <lucide-icon name="flame" class="h-3 w-3 text-white/80"></lucide-icon>
                      {{ minutesToNext !== null && minutesToNext <= 120 ? 'Próxima clase en ' + minutesToNext + ' min' : ('Siguiente sesión' | uppercase) }}
                    </span>
                  }

                  @if (bannerClass.modality === 'P') {
                    <span class="inline-flex items-center gap-1.5 rounded-[var(--r-xs)] bg-white/[0.06] hover:bg-white/[0.10] backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-white/90 shrink-0">
                      <lucide-icon name="map-pin" class="h-3 w-3 text-white/80"></lucide-icon>
                      Presencial
                    </span>
                  } @else if (bannerClass.modality === 'R') {
                    <span class="inline-flex items-center gap-1.5 rounded-[var(--r-xs)] bg-white/[0.06] hover:bg-white/[0.10] backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-white/90 shrink-0">
                      <lucide-icon name="video" class="h-3 w-3 text-white/80"></lucide-icon>
                      Remoto Zoom
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1.5 rounded-[var(--r-xs)] bg-white/[0.06] hover:bg-white/[0.10] backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-white/90 shrink-0">
                      <lucide-icon name="wifi" class="h-3 w-3 text-white/80"></lucide-icon>
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
                    class="inline-flex items-center gap-2 rounded-[var(--r-xl)] bg-white/[0.08] hover:bg-white/[0.16] text-white backdrop-blur-md px-3.5 py-2 text-xs font-semibold shadow-none transition active:scale-95 no-underline"
                  >
                    <lucide-icon name="video" class="h-3.5 w-3.5 text-white/90"></lucide-icon>
                    <span>Unirse a Zoom</span>
                  </a>
                }
                <button
                  (click)="onAskAiClick('¿Qué temas tocan hoy en ' + parsedBannerTitle + ' y qué preguntas clave debería hacer en clase?')"
                  class="inline-flex items-center gap-1.5 rounded-[var(--r-xl)] bg-white/[0.08] hover:bg-white/[0.16] text-white backdrop-blur-md px-3.5 py-2 text-xs font-semibold transition shadow-none active:scale-95 cursor-pointer"
                >
                  <lucide-icon name="sparkles" class="h-3.5 w-3.5 text-white/90"></lucide-icon>
                  <span>Consultar IA</span>
                </button>
              </div>
            </div>
          </div>
        }

        <!-- 2. Flat Navigation Tabs -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div class="inline-flex items-center gap-1 bg-[var(--utopik-carbon-black)] p-1 rounded-[var(--r-sm)] overflow-x-auto no-scrollbar max-w-full text-xs shadow-none">
            <button
              (click)="activeSection = 'todayClasses'"
              class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 rounded-[var(--r-xl)] font-bold"
              [ngClass]="activeSection === 'todayClasses' ? 'bg-[var(--utopik-green-yellow)] text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-white/5'"
            >
              <span>Clases de Hoy</span>
              <span class="ml-0.5 text-[10px]" [ngClass]="activeSection === 'todayClasses' ? 'opacity-80' : 'opacity-60'">({{ todayEvents.length }})</span>
            </button>

            <button
              (click)="activeSection = 'tasks'"
              class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 rounded-[var(--r-xl)] font-bold"
              [ngClass]="activeSection === 'tasks' ? 'bg-[var(--utopik-green-yellow)] text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-white/5'"
            >
              <span>Tareas</span>
              <span class="ml-0.5 text-[10px]" [ngClass]="activeSection === 'tasks' ? 'opacity-80' : 'opacity-60'">({{ synchronizedTasks.length }})</span>
            </button>

            <button
              (click)="activeSection = 'evaluations'"
              class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 rounded-[var(--r-xl)] font-bold"
              [ngClass]="activeSection === 'evaluations' ? 'bg-[var(--utopik-green-yellow)] text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-white/5'"
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
                class="text-xs text-[var(--utopik-green-yellow)] hover:underline font-semibold transition-colors self-start sm:self-auto bg-transparent cursor-pointer"
              >
                Ver horario semanal completo →
              </button>
            </div>

            @if (todayEvents.length === 0) {
              <div class="py-16 text-center rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)] p-8 space-y-3 shadow-none">
                <lucide-icon name="calendar" class="h-10 w-10 mx-auto text-neutral-600"></lucide-icon>
                <p class="text-base font-bold text-white">¡No tienes sesiones programadas para hoy!</p>
                <p class="text-xs text-neutral-400">Aprovecha para avanzar en tus entregables y proyectos.</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (ev of todayEvents; track ev.id) {
                  <div
                    (click)="selectedEventForModal = ev"
                    class="group p-3.5 sm:p-5 rounded-[var(--r-2xl)] flex items-center justify-between gap-3 transition-all duration-300 shadow-none cursor-pointer"
                    [ngClass]="isSessionActive(ev) ? 'bg-[#25281e]' : 'bg-[var(--utopik-carbon-black)] hover:bg-[#25281e]'"
                  >
                    <div class="space-y-1 min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        @if (ev.modality === 'P') {
                          <span class="inline-flex items-center gap-1.5 rounded-[var(--r-xs)] badge-solid-presencial px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold">
                            <lucide-icon name="map-pin" class="h-3 w-3"></lucide-icon>
                            Presencial
                          </span>
                        } @else if (ev.modality === 'R') {
                          <span class="inline-flex items-center gap-1.5 rounded-[var(--r-xs)] badge-solid-zoom px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold">
                            <lucide-icon name="video" class="h-3 w-3"></lucide-icon>
                            Remoto Zoom
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1.5 rounded-[var(--r-xs)] badge-solid-virtual px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold">
                            <lucide-icon name="wifi" class="h-3 w-3"></lucide-icon>
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
                          <span class="inline-flex items-center gap-1.5 text-[10px] font-bold text-white/90 bg-white/[0.08] px-2 py-0.5 rounded-[var(--r-xs)] backdrop-blur-md">
                            <span class="h-1.5 w-1.5 rounded-full bg-[var(--utopik-green-yellow)] animate-pulse"></span>
                            Sesión Actual
                          </span>
                        }
                      </div>

                      <h4 class="text-xs sm:text-sm font-bold text-white group-hover:text-[var(--utopik-green-yellow)] transition-colors leading-snug truncate">
                        {{ getParsedTitle(ev.title) }}
                      </h4>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                      @if (ev.modality === 'R' && ev.metadata?.zoomLink) {
                        <button
                          (click)="openZoomDirect($event, ev.metadata?.zoomLink)"
                          title="Unirse directo a Zoom"
                          aria-label="Unirse a Zoom"
                          class="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-[var(--r-md)] bg-white/10 hover:bg-white/20 text-white backdrop-blur-md shadow-none transition active:scale-95 shrink-0 cursor-pointer"
                        >
                          <lucide-icon name="video" class="h-3.5 w-3.5 text-white"></lucide-icon>
                        </button>
                      }
                      <lucide-icon name="chevron-right" class="h-4 w-4 text-neutral-500 group-hover:text-white transition-colors shrink-0"></lucide-icon>
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

              <div class="inline-flex items-center gap-1 bg-[var(--utopik-carbon-black)] p-1 rounded-[var(--r-sm)] text-[11px] font-bold">
                <button
                  (click)="taskFilter = 'all'"
                  class="px-3 py-1 rounded-[var(--r-xl)] transition cursor-pointer"
                  [ngClass]="taskFilter === 'all' ? 'bg-[var(--utopik-green-yellow)] text-black font-extrabold' : 'text-neutral-400 hover:text-white hover:bg-white/5'"
                >
                  Todas ({{ synchronizedTasks.length }})
                </button>
                <button
                  (click)="taskFilter = 'homework'"
                  class="px-3 py-1 rounded-[var(--r-xl)] transition cursor-pointer"
                  [ngClass]="taskFilter === 'homework' ? 'bg-[var(--utopik-green-yellow)] text-black font-extrabold' : 'text-neutral-400 hover:text-white hover:bg-white/5'"
                >
                  Tareas ({{ homeworkTasksCount }})
                </button>
                <button
                  (click)="taskFilter = 'forum'"
                  class="px-3 py-1 rounded-[var(--r-xl)] transition cursor-pointer"
                  [ngClass]="taskFilter === 'forum' ? 'bg-[var(--utopik-green-yellow)] text-black font-extrabold' : 'text-neutral-400 hover:text-white hover:bg-white/5'"
                >
                  Foros ({{ forumTasksCount }})
                </button>
                <button
                  (click)="taskFilter = 'graded'"
                  class="px-3 py-1 rounded-[var(--r-xl)] transition cursor-pointer"
                  [ngClass]="taskFilter === 'graded' ? 'bg-[var(--utopik-sandy-brown)]/20 text-[var(--utopik-sandy-brown)] font-extrabold' : 'text-neutral-400 hover:text-white hover:bg-white/5'"
                >
                  Calificadas ({{ gradedTasksCount }})
                </button>
              </div>
            </div>

            <div class="space-y-2.5">
              @if (filteredTasks.length === 0) {
                <div class="p-8 text-center rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)] text-xs text-neutral-400">
                  No hay actividades en esta categoría.
                </div>
              } @else {
                @for (item of filteredTasks; track item.task.id) {
                  <div class="rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)] hover:bg-[#25281e] transition-colors p-4 sm:p-5 shadow-none text-white">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div class="space-y-1 flex-1 min-w-0">
                        <div class="flex flex-wrap items-center gap-2 text-xs">
                          <span class="font-semibold text-neutral-400">{{ item.task.courseName }}</span>
                          <span class="text-neutral-600">•</span>
                          <span class="text-neutral-400">Semana {{ item.task.week }}</span>

                          <!-- Badge: Tipo de Actividad (FORUM / TAREA) -->
                          @if (item.task.activityType === 'FORUM') {
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--r-sm)] bg-white/5 text-[var(--utopik-platinum)] font-bold text-[10.5px]">
                              <lucide-icon name="message-square" class="h-3 w-3"></lucide-icon>
                              <span>Foro</span>
                            </span>
                          } @else {
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--r-sm)] bg-white/5 text-[var(--utopik-platinum)] font-bold text-[10.5px]">
                              <lucide-icon name="file-text" class="h-3 w-3"></lucide-icon>
                              <span>Tarea</span>
                            </span>
                          }

                          @if (item.task.status === 'submitted' || item.task.homeworkStatus === 'DELIVERED') {
                            <span class="text-neutral-600">•</span>
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--r-xs)] bg-[var(--utopik-green-yellow)]/15 text-[var(--utopik-green-yellow)] font-bold text-[11px]">
                              <lucide-icon name="check-circle-2" class="h-3 w-3"></lucide-icon>
                              <span>Entregado</span>
                            </span>
                          }

                          @if (item.task.evaluationSystem) {
                            <span class="text-neutral-600">•</span>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-[var(--r-xs)] bg-[var(--utopik-sandy-brown)]/15 text-[var(--utopik-sandy-brown)] font-bold text-[11px]">
                              {{ item.task.evaluationSystem }}
                              @if (item.syllabusContext.formulaWeight) {
                                ({{ item.syllabusContext.formulaWeight }}%)
                              }
                            </span>
                          } @else if (item.syllabusContext.officialEvaluation && isTaskTitleMatchingEval(item.task.title, item.syllabusContext.officialEvaluation.code)) {
                            <span class="text-neutral-600">•</span>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-[var(--r-xs)] bg-[var(--utopik-sandy-brown)]/15 text-[var(--utopik-sandy-brown)] font-bold text-[11px]">
                              {{ item.syllabusContext.officialEvaluation.code }} ({{ item.syllabusContext.formulaWeight }}%)
                            </span>
                          }

                          @if (item.task.status !== 'submitted' && getTaskUrgency(item.task)) {
                            <span class="text-neutral-600">•</span>
                            <span class="text-[11px] font-medium" [ngClass]="getTaskUrgency(item.task)?.badgeVariant === 'orange' ? 'text-[var(--utopik-sandy-brown)]' : 'text-neutral-400'">
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
                            class="inline-flex items-center gap-1.5 rounded-[var(--r-md)] bg-white/5 hover:bg-white hover:text-black px-3.5 py-1.5 text-xs font-bold text-white transition active:scale-95 shadow-none cursor-pointer"
                          >
                            <lucide-icon name="file-text" class="h-3.5 w-3.5"></lucide-icon>
                            <span>Indicaciones</span>
                          </button>
                        }

                        @if (item.task.rubric) {
                          <button
                            (click)="openRubric(item.task.rubric, item.task.title, item.task.courseName)"
                            class="inline-flex items-center gap-1.5 rounded-[var(--r-md)] bg-white/5 hover:bg-white hover:text-black px-3.5 py-1.5 text-xs font-bold text-white transition active:scale-95 shadow-none cursor-pointer"
                          >
                            <lucide-icon name="award" class="h-3.5 w-3.5"></lucide-icon>
                            <span>Rúbrica</span>
                          </button>
                        }

                        <button
                          (click)="onAskAiClick('¿Cómo resuelvo la actividad &quot;' + item.task.title + '&quot; del curso &quot;' + item.task.courseName + '&quot; según el sílabo y rúbrica oficial?')"
                          title="Consultar al Copiloto IA"
                          class="flex h-8 w-8 items-center justify-center rounded-[var(--r-xl)] bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition shadow-none cursor-pointer"
                        >
                          <lucide-icon name="sparkles" class="h-3.5 w-3.5 text-[var(--utopik-sandy-brown)]"></lucide-icon>
                        </button>

                        <button
                          (click)="expandedTaskIds[item.task.id] = !expandedTaskIds[item.task.id]"
                          title="Ver detalles del sílabo"
                          class="flex h-8 w-8 items-center justify-center rounded-[var(--r-xl)] bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition shadow-none cursor-pointer"
                        >
                          @if (expandedTaskIds[item.task.id]) {
                            <lucide-icon name="chevron-up" class="h-3.5 w-3.5"></lucide-icon>
                          } @else {
                            <lucide-icon name="chevron-down" class="h-3.5 w-3.5"></lucide-icon>
                          }
                        </button>
                      </div>
                    </div>

                    @if (expandedTaskIds[item.task.id]) {
                      <div class="mt-4 pt-4 text-xs space-y-2 text-neutral-300">
                        @if (item.task.syllabusCorrelation; as sc) {
                          <div class="flex flex-wrap items-center gap-2 text-neutral-400">
                            <lucide-icon name="book-open" class="h-3.5 w-3.5 text-[var(--utopik-green-yellow)]"></lucide-icon>
                            <span class="font-bold text-white">Contexto del Sílabo:</span>
                            <span>{{ sc.syllabusUnit || item.syllabusContext.unitTitle }}</span>
                            @if (sc.weightPercent) {
                              <span class="px-2 py-0.5 rounded-[var(--r-sm)] bg-[var(--utopik-sandy-brown)]/10 text-[var(--utopik-sandy-brown)] font-bold text-[10.5px]">
                                {{ sc.evaluationType }} ({{ sc.weightPercent }}%)
                              </span>
                            }
                            @if (item.task.courseCode) {
                              <span class="text-neutral-500 font-mono text-[10.5px]">({{ item.task.courseCode }})</span>
                            }
                          </div>
                          @if (sc.syllabusTopic) {
                            <p class="text-neutral-400 pl-5">
                              • Tema del sílabo: <span class="text-neutral-200">{{ sc.syllabusTopic }}</span>
                            </p>
                          } @else if (item.syllabusContext.sessionTopics.length > 0) {
                            <p class="text-neutral-400 pl-5">
                              • Tema de la semana: <span class="text-neutral-200">{{ item.syllabusContext.sessionTopics[0] }}</span>
                            </p>
                          }
                          @if (sc.evaluationDescription) {
                            <p class="text-neutral-400 pl-5">
                              • Evaluación oficial: <span class="text-neutral-300">{{ sc.evaluationDescription }}</span>
                            </p>
                          }
                        } @else {
                          <div class="flex items-center gap-2 text-neutral-400">
                            <lucide-icon name="book-open" class="h-3.5 w-3.5 text-[var(--utopik-green-yellow)]"></lucide-icon>
                            <span class="font-bold text-white">Contexto del Sílabo:</span>
                            <span>{{ item.syllabusContext.unitTitle }}</span>
                          </div>
                          @if (item.syllabusContext.sessionTopics.length > 0) {
                            <p class="text-neutral-400 pl-5">
                              • Tema de la semana: {{ item.syllabusContext.sessionTopics[0] }}
                            </p>
                          }
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
                <div class="p-4 sm:p-5 rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)] hover:bg-[#25281e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors shadow-none">
                  <div class="space-y-1">
                    <div class="flex flex-wrap items-center gap-2 text-xs">
                      <span class="font-semibold text-neutral-400">{{ ev.courseName.split(' - ')[0] }}</span>
                      <span class="text-neutral-600">•</span>
                      <span class="font-semibold" [ngClass]="ev.week === currentWeek ? 'text-[var(--utopik-green-yellow)]' : ev.week - currentWeek === 1 ? 'text-[var(--utopik-sandy-brown)]' : 'text-neutral-400'">
                        Semana {{ ev.week }} {{ ev.week === currentWeek ? '(Esta semana)' : '' }}
                      </span>
                      <span class="text-neutral-600">•</span>
                      <span class="font-bold text-[var(--utopik-sandy-brown)] bg-[var(--utopik-sandy-brown)]/15 px-2 py-0.5 rounded-[var(--r-sm)] text-[11px]">
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
                      class="inline-flex items-center gap-1.5 rounded-[var(--r-md)] bg-white/5 hover:bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition shadow-none cursor-pointer"
                    >
                      <lucide-icon name="book-open" class="h-3.5 w-3.5 text-[var(--utopik-green-yellow)]"></lucide-icon>
                      <span>Sílabo</span>
                    </button>
                    <button
                      (click)="onAskAiClick('¿Cómo prepararme para ' + ev.code + ' (' + ev.fullName + ') de ' + ev.courseName + ' y qué rúbrica evalúa la UTP para sacar 20?')"
                      title="Consultar al Copiloto IA"
                      class="flex h-8 w-8 items-center justify-center rounded-[var(--r-xl)] bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition shadow-none cursor-pointer"
                    >
                      <lucide-icon name="sparkles" class="h-3.5 w-3.5 text-[var(--utopik-sandy-brown)]"></lucide-icon>
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
              class="relative flex flex-col w-full max-w-3xl max-h-[85vh] rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)] text-white shadow-2xl overflow-hidden"
              (click)="$event.stopPropagation()"
            >
              <div class="bg-[var(--utopik-carbon-black)] px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold text-white">{{ activeRubric.taskTitle }}</h3>
                  <p class="text-xs text-neutral-400">{{ activeRubric.courseName }} • Rúbrica Oficial (Total: {{ activeRubric.rubric.totalPoints }} pts)</p>
                </div>
                <button 
                  (click)="activeRubric = null" 
                  aria-label="Cerrar rúbrica"
                  class="flex h-8 w-8 items-center justify-center rounded-[var(--r-xl)] bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition cursor-pointer shrink-0"
                >
                  <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
                </button>
              </div>
              <div class="flex-1 overflow-y-auto p-6 space-y-4">
                @for (crit of activeRubric.rubric.criteria; track crit.id) {
                  <div class="p-4 rounded-[var(--r-2xl)] bg-white/[0.02] space-y-2">
                    <div class="flex justify-between items-center">
                      <h4 class="text-sm font-bold text-white">{{ crit.title }}</h4>
                      <span class="text-xs font-bold text-[var(--utopik-green-yellow)]">Max: {{ crit.maxPoints }} pts</span>
                    </div>
                    <p class="text-xs text-neutral-400">{{ crit.description }}</p>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      @for (lvl of crit.levels; track lvl.name) {
                        <div class="p-2.5 rounded-[var(--r-xl)] bg-white/[0.03] space-y-1">
                          <div class="flex justify-between text-[11px] font-bold">
                            <span class="text-neutral-200">{{ lvl.name }}</span>
                            <span class="text-[var(--utopik-green-yellow)]">{{ lvl.points }} pts</span>
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
              class="relative flex flex-col w-full max-w-2xl max-h-[85vh] rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)] text-white shadow-2xl overflow-hidden"
              (click)="$event.stopPropagation()"
            >
              <div class="bg-[var(--utopik-carbon-black)] px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold text-white">{{ selectedTaskForInstructions.title }}</h3>
                  <p class="text-xs text-neutral-400">{{ selectedTaskForInstructions.courseName }} • Semana {{ selectedTaskForInstructions.week }}</p>
                </div>
                <button 
                  (click)="selectedTaskForInstructions = null" 
                  aria-label="Cerrar indicaciones"
                  class="flex h-8 w-8 items-center justify-center rounded-[var(--r-xl)] bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition cursor-pointer shrink-0"
                >
                  <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
                </button>
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
  taskFilter: 'all' | 'homework' | 'forum' | 'graded' = 'all';

  /** Telemetría [TODAY-VIEW] (F12): arrancada del skeleton de horario y de la petición de tareas. */
  private scheduleSkeletonStart = 0;
  private tasksRequestStart = 0;
  private tasksArrived = true;

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
    const refreshStartedAt = performance.now();
    const cachedCalendar = getCachedCalendarData();
    const interval = cachedCalendar?.data?.current_interval || this.scheduleService.currentInterval();
    if (interval && interval.events && interval.events.length > 0) {
      this.isLoading = false;
      console.log(`[TODAY-VIEW] ⚡ Horario pintado de inmediato desde LocalStorage (${interval.events.length} evento/s, ${(performance.now() - refreshStartedAt).toFixed(1)}ms, skeleton innecesario)`);
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
      this.scheduleSkeletonStart = refreshStartedAt;
      this.isLoading = true;
      console.log('[TODAY-VIEW] ⏳ Skeletons activados. Esperando: [Horario, Tareas]');
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
    this.tasksArrived = false;
    const targetWeek = this.currentWeek || 1;
    this.tasksRequestStart = performance.now();
    this.taskService.getActivitiesByWeek(targetWeek).subscribe({
      next: (res) => {
        this.tasksArrived = true;
        console.log(`[TODAY-VIEW] 📥 Tareas/actividades recibidas en ${Math.round(performance.now() - this.tasksRequestStart)}ms (${res.data?.length ?? 0} ítems, semana ${targetWeek})`);
        if (res.success && res.data && res.data.length > 0) {
          const dynamicTasks: TaskWithSyllabusContext[] = res.data.map((u: TaskSyncItem) => {
            const isDelivered = u.isDelivered || u.studentStatus === 'DELIVERED' || u.studentStatus === 'SUBMITTED' || u.homeworkStatus === 'DELIVERED';
            const courseTitle = u.courseName || '';
            const week = u.week || u.weekNumber || targetWeek;
            const syllabusContext = getSyllabusWeekContext(courseTitle, week);
            const correlation = u.syllabusCorrelation;

            if (correlation && correlation.isSyllabusMatched) {
              if (correlation.syllabusUnit) syllabusContext.unitTitle = correlation.syllabusUnit;
              if (correlation.syllabusTopic) syllabusContext.sessionTopics = [correlation.syllabusTopic];
              if (correlation.weightPercent) syllabusContext.formulaWeight = correlation.weightPercent;
            }

            const actType = (u.type || u.activityType || '').toUpperCase().includes('FORUM') ? 'FORUM' : 'HOMEWORK';
            const evalSys = correlation?.evaluationType || u.evaluationSystem || null;
            const isGraded = Boolean(u.isQualified || evalSys || (u.classificationCategory && u.classificationCategory.includes('WEIGHTED')));

            const task: CourseAssignment = {
              id: u.id || u.homeworkId || u.activityId || `task-${Math.random()}`,
              courseId: u.courseId || u.sectionId || '',
              courseName: courseTitle,
              sectionCode: u.sectionId || '',
              title: u.title || 'Actividad Oficial',
              week: week,
              type: isGraded ? 'evaluation' : (actType === 'FORUM' ? 'practice' : 'homework'),
              dueDate: u.dueDate || u.finishAt || u.startAt || '',
              isGraded: isGraded,
              status: isDelivered ? 'submitted' : 'pending',
              homeworkStatus: u.homeworkStatus || u.studentStatus || 'PENDING',
              availableUntil: u.dueDate || u.finishAt,
              activityId: u.homeworkId || u.activityId,
              sectionId: u.sectionId,
              activityType: actType,
              evaluationSystem: evalSys,
              classificationCategory: u.classificationCategory,
              urgency: u.urgency,
              daysRemaining: u.daysRemaining,
              courseCode: u.courseCode || correlation?.courseCode,
              syllabusCorrelation: correlation
            };

            return { task, syllabusContext };
          });

          // Deduplicar por id Y por title+courseName para cubrir casos donde la API
          // retorna el mismo ítem con diferentes IDs (contentId vs activityId vs id)
          const seenIds = new Set<string>();
          const seenTitleKeys = new Set<string>();
          this.synchronizedTasks = dynamicTasks.filter(item => {
            const titleKey = `${item.task.courseName}||${item.task.title}`;
            if (seenIds.has(item.task.id) || seenTitleKeys.has(titleKey)) return false;
            seenIds.add(item.task.id);
            seenTitleKeys.add(titleKey);
            return true;
          });
        } else {
          // Fallback a /tasks (Read Model local con fallback del portal)
          console.warn(`[TODAY-VIEW] ⚠️ Actividades vacías para la semana ${targetWeek}: degradando a GET /tasks...`);
          this.taskService.getTasks().subscribe({
            next: (taskRes) => {
              console.log(`[TODAY-VIEW] 📥 Tareas (fallback /tasks) recibidas en ${Math.round(performance.now() - this.tasksRequestStart)}ms (${taskRes.data?.length ?? 0} ítems)`);
              if (taskRes.success && taskRes.data && taskRes.data.length > 0) {
                this.synchronizedTasks = taskRes.data.map((t: TaskSyncItem) => {
                  const week = t.week || this.currentWeek || 1;
                  const syllabusContext = getSyllabusWeekContext(t.courseName, week);
                  const correlation = t.syllabusCorrelation;
                  if (correlation && correlation.isSyllabusMatched) {
                    if (correlation.syllabusUnit) syllabusContext.unitTitle = correlation.syllabusUnit;
                    if (correlation.syllabusTopic) syllabusContext.sessionTopics = [correlation.syllabusTopic];
                    if (correlation.weightPercent) syllabusContext.formulaWeight = correlation.weightPercent;
                  }
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
                    homeworkStatus: t.homeworkStatus || 'PENDING',
                    courseCode: t.courseCode || correlation?.courseCode,
                    syllabusCorrelation: correlation
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
        console.warn(`[TODAY-VIEW] ⚠️ Error consultando actividades (semana ${targetWeek}) tras ${Math.round(performance.now() - this.tasksRequestStart)}ms: se sirve el fallback local`);
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
        const skeletonHeldMs = Math.round(performance.now() - this.scheduleSkeletonStart);
        this.isLoading = false;
        const stillWaiting = this.tasksArrived ? [] : ['Tareas'];
        console.log(`[TODAY-VIEW] 📥 Horario recibido en ${skeletonHeldMs}ms${stillWaiting.length ? `. Aún esperando: [${stillWaiting.join(', ')}]` : ''}`);
        console.log(`[TODAY-VIEW] ✨ Skeletons apagados tras ${skeletonHeldMs}ms totales.`);
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
                  courseId: c.courseCode,
                  courseName: c.courseName,
                  sectionCode: c.section,
                  sectionId: c.sectionId || (c.classLink ? c.classLink.match(/\/section\/([a-f0-9\-]+)/i)?.[1] : undefined),
                  classroom: c.classroom,
                  building: c.building,
                  floor: c.floor,
                  environmentType: c.environmentType,
                  teacher: c.teacher,
                  zoomLink: c.zoomLink,
                  classLink: c.classLink,
                  syllabusUrl: c.syllabusUrl
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
        console.warn(`[TODAY-VIEW] ⚠️ Horario falló tras ${Math.round(performance.now() - this.scheduleSkeletonStart)}ms: skeletons apagados sin datos`, err);
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
      if (this.taskFilter === 'homework') {
        return item.task.activityType === 'HOMEWORK';
      }
      if (this.taskFilter === 'forum') {
        return item.task.activityType === 'FORUM';
      }
      if (this.taskFilter === 'graded') {
        return item.task.isGraded || Boolean(item.task.evaluationSystem);
      }
      return true;
    });
  }

  get homeworkTasksCount(): number {
    return this.synchronizedTasks.filter(item => item.task.activityType === 'HOMEWORK').length;
  }

  get forumTasksCount(): number {
    return this.synchronizedTasks.filter(item => item.task.activityType === 'FORUM').length;
  }

  get gradedTasksCount(): number {
    return this.synchronizedTasks.filter(item => item.task.isGraded || Boolean(item.task.evaluationSystem)).length;
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

  getTaskUrgency(task: CourseAssignment): ActivityUrgency | null {
    if (task.urgency) {
      if (task.urgency === 'DUE_THIS_WEEK' || task.urgency === 'URGENT') {
        const days = task.daysRemaining ?? 1;
        return {
          status: days <= 1 ? 'today' : 'upcoming',
          label: days <= 1 ? 'Vence pronto (esta semana)' : `Vence en ${days} días`,
          badgeVariant: days <= 1 ? 'orange' : 'neutral'
        };
      }
      if (task.urgency === 'UPCOMING') {
        const days = task.daysRemaining;
        return {
          status: 'upcoming',
          label: days ? `Vence en ${days} días` : 'Programado',
          badgeVariant: 'neutral'
        };
      }
    }
    const cleanDate = task.dueDate ? task.dueDate.replace(' ', 'T') : undefined;
    return calculateActivityUrgency(cleanDate);
  }

  openRubric(rubric: AssignmentRubric, taskTitle: string, courseName: string): void {
    this.activeRubric = { rubric, taskTitle, courseName };
  }

  onAskAiClick(prompt: string): void {
    this.askAi.emit(prompt);
  }

  isTaskTitleMatchingEval(title: string, evalCode?: string): boolean {
    if (!evalCode || !title) return false;
    const cleanTitle = title.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanCode = evalCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return cleanTitle.includes(cleanCode) || cleanCode.includes(cleanTitle);
  }
}
