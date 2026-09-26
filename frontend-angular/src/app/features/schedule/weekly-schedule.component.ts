import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UTPEvent, UTPCurrentInterval, ProcessedCourse } from '@domain/models/utp.model';
import { ClassDetailModalComponent } from './class-detail-modal.component';
import { 
  getEventsByWeek, 
  getEventsByDateRange,
  formatScheduleTimeRange, 
  parseEventTitle, 
  formatCourseName, 
  DAYS_OF_WEEK, 
  parseDate, 
  getProcessedCourses 
} from '@data/schedule-parser';
import { resolveEventLocation, getClassroomLocation } from '@data/classroom-helper';
import { getCachedCalendarData } from '@data/syllabus/client-storage';
import { getAuroraStyle } from '@data/aurora.helper';
import { ScheduleService } from '@data/services/schedule.service';
import { normalizeKey } from '../../core/utils/string.utils';

@Component({
  selector: 'app-weekly-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, ClassDetailModalComponent],
  template: `
    <div class="space-y-6 text-white font-sans text-left">
      
      <!-- Barra de Control de Semana & Filtros -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        
        <!-- Selector de Semana -->
        <div class="flex items-center gap-2">
          <div class="flex items-center bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-1 shadow-none">
            <button
              (click)="changeWeek(selectedWeek - 1)"
              [disabled]="selectedWeek <= 1"
              aria-label="Semana anterior"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-[var(--surface-subtle)] transition disabled:opacity-20 border-none bg-transparent cursor-pointer"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
            </button>

            <div class="flex items-center gap-2 px-3">
              <svg class="h-4 w-4 text-[var(--accent-orange)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <select
                [(ngModel)]="selectedWeek"
                (ngModelChange)="onWeekChange()"
                aria-label="Seleccionar semana académica"
                class="bg-transparent border-0 text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                @for (w of totalWeeksArray; track w) {
                  <option [value]="w" class="bg-[var(--surface-card)] text-white">
                    Semana {{ w }} {{ w === currentWeek ? '(Actual)' : '' }}
                  </option>
                }
              </select>
            </div>

            <button
              (click)="changeWeek(selectedWeek + 1)"
              [disabled]="selectedWeek >= totalWeeks"
              aria-label="Semana siguiente"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-[var(--surface-subtle)] transition disabled:opacity-20 border-none bg-transparent cursor-pointer"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>

          @if (selectedWeek === currentWeek) {
            <span class="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-lime)] text-black font-extrabold px-3 py-1 text-[11px] shadow-none">
              <span class="h-1.5 w-1.5 rounded-full bg-black animate-pulse"></span>
              En curso
            </span>
          }
        </div>

        <!-- Filtros de Modalidad con Segmented Pills -->
        <div class="inline-flex items-center gap-1 bg-[var(--surface-card)] border border-[var(--border-subtle)] p-1 rounded-2xl overflow-x-auto no-scrollbar max-w-full text-xs shadow-none">
          <button
            (click)="selectedModality = 'ALL'"
            class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 rounded-xl font-bold border-none"
            [ngClass]="selectedModality === 'ALL' ? 'bg-white text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-[var(--surface-subtle)]'"
          >
            Todas
          </button>
          <button
            (click)="selectedModality = 'P'"
            class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 rounded-xl font-bold border-none"
            [ngClass]="selectedModality === 'P' ? 'bg-[var(--accent-emerald)] text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-[var(--surface-subtle)]'"
          >
            Presenciales
          </button>
          <button
            (click)="selectedModality = 'R'"
            class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 rounded-xl font-bold border-none"
            [ngClass]="selectedModality === 'R' ? 'bg-[var(--accent-orange)] text-white font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-[var(--surface-subtle)]'"
          >
            Zoom
          </button>
          <button
            (click)="selectedModality = 'VT'"
            class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 rounded-xl font-bold border-none"
            [ngClass]="selectedModality === 'VT' ? 'bg-[var(--accent-purple)] text-white font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-[var(--surface-subtle)]'"
          >
            Virtuales
          </button>
        </div>

      </div>

      <!-- Grid Semanal (Lunes a Domingo - 7 Días) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3 sm:gap-4">
        @for (dayNum of daysToDisplay; track dayNum) {
          <div class="flex flex-col space-y-2.5">
            <!-- Header Minimalista del Día -->
            <div class="pb-2 flex items-center justify-between border-b border-[var(--border-subtle)]">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold tracking-tight" [ngClass]="isToday(dayNum) ? 'text-white' : 'text-neutral-400'">
                  {{ getDayName(dayNum) }}
                </span>
                @if (isToday(dayNum)) {
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-white text-black leading-none">
                    Hoy
                  </span>
                }
              </div>
            </div>

            <!-- Lista de Sesiones -->
            <div class="space-y-2.5 flex-1">
              @if (getEventsForDayNumber(dayNum).length === 0) {
                <div class="h-28 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] flex items-center justify-center text-center text-xs text-neutral-600 font-medium select-none">
                  Sin clases
                </div>
              } @else {
                @for (evt of getEventsForDayNumber(dayNum); track evt.id) {
                  <div
                    (click)="selectedEventForModal = evt"
                    class="group relative rounded-2xl border p-3.5 transition-all duration-300 space-y-2.5 shadow-none cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
                    [ngClass]="isSessionActive(evt, dayNum) ? 'aurora-ambient-card' : 'bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border-[var(--border-subtle)] hover:border-neutral-500'"
                    [ngStyle]="isSessionActive(evt, dayNum) ? getCardAuroraStyle(evt.id) : null"
                  >
                    <div class="flex items-center justify-between gap-1">
                      @if (evt.modality === 'P') {
                        <span class="inline-flex items-center gap-1 text-[10px] font-medium text-white/90 bg-white/[0.06] border border-white/[0.12] px-2 py-0.5 rounded-full backdrop-blur-md">
                          <svg class="h-2.5 w-2.5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                          Presencial
                        </span>
                      } @else if (evt.modality === 'R') {
                        <span class="inline-flex items-center gap-1 text-[10px] font-medium text-white/90 bg-white/[0.06] border border-white/[0.12] px-2 py-0.5 rounded-full backdrop-blur-md">
                          <svg class="h-2.5 w-2.5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                          Zoom
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1 text-[10px] font-medium text-white/90 bg-white/[0.06] border border-white/[0.12] px-2 py-0.5 rounded-full backdrop-blur-md">
                          <svg class="h-2.5 w-2.5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49"/></svg>
                          Virtual
                        </span>
                      }

                      @if (evt.modality === 'R' && evt.metadata?.zoomLink) {
                        <button
                          (click)="openZoom($event, evt.metadata?.zoomLink)"
                          title="Unirse directo a Zoom"
                          aria-label="Unirse a Zoom"
                          class="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.08] hover:bg-white/[0.18] text-white border border-white/[0.14] backdrop-blur-md transition shrink-0 border-none cursor-pointer"
                        >
                          <svg class="h-3.5 w-3.5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                        </button>
                      } @else {
                        <span class="text-[10px] font-mono text-neutral-400 group-hover:text-neutral-200 transition-colors truncate max-w-[80px]">
                          {{ evt.modality === 'P' ? getLocationForEvent(evt).aula.replace('Aula ', '') : 'Digital' }}
                        </span>
                      }
                    </div>

                    <h4 class="text-xs font-bold text-white group-hover:text-neutral-100 leading-snug line-clamp-2 transition-colors">
                      {{ getParsedTitle(evt.title) }}
                    </h4>

                    <div class="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400 whitespace-nowrap">
                      <svg class="h-3 w-3 text-neutral-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <span class="truncate">{{ formatScheduleTimeRange(evt.startAt, evt.finishAt) }}</span>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        }
      </div>

      <!-- Sección Dedicada: Cursos Virtuales 24/7 (Acceso Permanente) -->
      @if (virtual247Courses.length > 0) {
        <div class="pt-4 border-t border-[var(--border-subtle)] space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold tracking-tight text-white">
                Asignaturas Virtuales 24/7 (Acceso Permanente)
              </h3>
              <p class="text-xs text-neutral-400 mt-0.5">
                Cursos 100% asíncronos sin horario semanal fijo. Disponibles en cualquier momento en UTP Canvas.
              </p>
            </div>
            <span class="text-xs font-mono text-neutral-500">
              {{ virtual247Courses.length }} {{ virtual247Courses.length === 1 ? 'curso' : 'cursos' }}
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            @for (course of virtual247Courses; track course.courseId) {
              <div class="flex flex-col justify-between rounded-2xl bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] hover:border-neutral-500 transition-all p-4 space-y-3.5 shadow-none">
                <div class="space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--badge-purple-text)] bg-[var(--badge-purple-bg)] border border-[var(--badge-purple-border)] px-2 py-0.5 rounded-full">
                      <svg class="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49"/></svg>
                      Virtual 24/7
                    </span>
                    <span class="text-[10px] font-mono text-neutral-400">
                      {{ course.sectionCode ? 'Sección ' + course.sectionCode : 'Autoaprendizaje' }}
                    </span>
                  </div>

                  <h4 class="text-xs font-bold text-white leading-snug line-clamp-2">
                    {{ formatCourseName(course.name) }}
                  </h4>

                  <p class="text-[11px] text-neutral-400 leading-relaxed">
                    Autoaprendizaje continuo • Entregas y evaluaciones por semana en Canvas
                  </p>
                </div>

                <div class="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <button
                    (click)="onOpenSyllabus(course.name)"
                    class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-yellow)] hover:bg-[var(--accent-yellow-hover)] py-2 px-3 text-xs font-bold text-black transition active:scale-95 shadow-none border-none cursor-pointer"
                  >
                    <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="8" r="6"/>
                      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
                    </svg>
                    <span>Sílabo & Rúbricas</span>
                  </button>

                  @if (course.syllabusUrl) {
                    <a
                      [href]="course.syllabusUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Descargar Sílabo Oficial PDF"
                      class="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--surface-elevated)] border border-[var(--border-medium)] text-white transition active:scale-95 shrink-0 shadow-none no-underline cursor-pointer"
                    >
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" x2="8" y1="13" y2="13"/>
                        <line x1="16" x2="8" y1="17" y2="17"/>
                        <line x1="10" x2="8" y1="9" y2="9"/>
                      </svg>
                    </a>
                  }

                  <button
                    (click)="onAskAiClick('Explícame la metodología, evaluaciones y rúbricas del curso ' + course.name)"
                    title="Consultar al Agente sobre este curso"
                    class="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)] text-white transition active:scale-95 shrink-0 shadow-none border-none cursor-pointer"
                  >
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Modal de Detalle de Clase (full-featured) -->
      <app-class-detail-modal
        [isOpen]="!!selectedEventForModal"
        [event]="selectedEventForModal"
        [weekNumber]="selectedWeek"
        [interval]="currentInterval"
        (close)="selectedEventForModal = null"
        (openGlobalAi)="openAi.emit($event)"
      />

    </div>
  `
})
export class WeeklyScheduleComponent implements OnInit {
  @Input() interval: UTPCurrentInterval | null = null;
  @Input() courses?: ProcessedCourse[];
  @Output() openAi = new EventEmitter<string>();
  @Output() openSyllabus = new EventEmitter<string>();
  currentWeek = 6;
  totalWeeks = 18;
  selectedWeek = 6;
  selectedModality = 'ALL';

  daysToDisplay = [1, 2, 3, 4, 5, 6, 0];
  events: UTPEvent[] = [];
  processedCourses: ProcessedCourse[] = [];
  virtual247Courses: ProcessedCourse[] = [];
  startOfInterval = '';
  currentInterval: UTPCurrentInterval | null = null;

  selectedEventForModal: UTPEvent | null = null;

  constructor(public scheduleService: ScheduleService) {}

  ngOnInit(): void {
    this.hydrateFromCacheOrInterval();

    this.scheduleService.getSchedule().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const interval = this.scheduleService.currentInterval();
          if (interval && interval.events && interval.events.length > 0) {
            this.applyIntervalData(interval);
          } else if (res.data.classes && res.data.classes.length > 0) {
            this.applyScheduleData(res.data);
          }
        }
        this.computeVirtualCourses();
      },
      error: () => {
        this.hydrateFromCacheOrInterval();
        this.computeVirtualCourses();
      }
    });
  }

  private hydrateFromCacheOrInterval(): void {
    const cachedCalendar = getCachedCalendarData();
    const interval = cachedCalendar?.data?.current_interval || this.scheduleService.currentInterval();
    if (interval && interval.events && interval.events.length > 0) {
      this.applyIntervalData(interval);
    }
  }

  private applyIntervalData(interval: UTPCurrentInterval): void {
    this.currentWeek = interval.week_number || 1;
    this.totalWeeks = interval.total_weeks || 18;
    this.selectedWeek = this.currentWeek;
    this.startOfInterval = interval.start_of_interval || '';
    this.events = interval.events || [];
    this.currentInterval = interval;
    this.processedCourses = getProcessedCourses(this.events);
  }

  private applyScheduleData(scheduleData: any): void {
    this.currentWeek = scheduleData.weekNumber || 1;
    this.totalWeeks = scheduleData.totalWeeks || 18;
    this.selectedWeek = this.currentWeek;

    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);
    monday.setHours(0, 0, 0, 0);
    this.startOfInterval = monday.toISOString();

    this.events = scheduleData.classes.map((c: any) => ({
      id: c.id,
      title: `${c.courseName}${c.section && c.section !== 'Sección Única' ? ' (' + c.section + ')' : ''} (Semana ${scheduleData.weekNumber}) - Sesión`,
      modality: c.modality,
      type: 'SESSION',
      startAt: c.startAt,
      finishAt: c.finishAt,
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
    }));
    this.processedCourses = getProcessedCourses(this.events);
  }

  computeVirtualCourses(): void {
    const raw = this.processedCourses.filter(c => 
      c.modalities.includes('VT') || 
      c.weeklySchedules.length === 0
    );

    const seen = new Set<string>();
    const unique: ProcessedCourse[] = [];
    for (const c of raw) {
      const key = normalizeKey((c.name || '').replace(/-\s*\d{4,6}$/g, ''));
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(c);
      }
    }
    this.virtual247Courses = unique;
  }

  get totalWeeksArray(): number[] {
    return Array.from({ length: this.totalWeeks }, (_, i) => i + 1);
  }

  changeWeek(w: number): void {
    this.selectedWeek = Math.max(1, Math.min(this.totalWeeks, w));
  }

  onWeekChange(): void {}

  getDayName(dayNum: number): string {
    return DAYS_OF_WEEK[dayNum] || '';
  }

  isToday(dayNum: number): boolean {
    return new Date().getDay() === dayNum && this.selectedWeek === this.currentWeek;
  }

  getEventsForDayNumber(dayNum: number): UTPEvent[] {
    let weekEvents: UTPEvent[] = [];

    // 1. Intentar filtrar por rango de fecha exacto de la semana seleccionada
    const startOfPeriodStr = this.currentInterval?.start_of_period || this.startOfInterval;
    if (startOfPeriodStr) {
      const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const baseMs = parseDate(startOfPeriodStr).getTime();
      
      // Determinar el inicio de la semana 1 del periodo
      const periodStartMs = this.currentInterval?.start_of_period 
        ? baseMs
        : baseMs - (this.currentWeek - 1) * WEEK_MS;

      const targetWeekStartMs = periodStartMs + (this.selectedWeek - 1) * WEEK_MS;
      const targetWeekEndMs = targetWeekStartMs + WEEK_MS;

      weekEvents = getEventsByDateRange(this.events, targetWeekStartMs, targetWeekEndMs);
    }

    // 2. Si no hubo eventos por fecha, intentar por etiqueta (Semana X)
    if (weekEvents.length === 0) {
      weekEvents = getEventsByWeek(this.events, this.selectedWeek);
    }

    // 3. Si aún no hay eventos (ej. se cargó únicamente la plantilla semanal recurrente de 1 semana):
    //    Renderizar el patrón recurrente semanal deduplicado por slot horario (1 sesión por horario y curso)
    if (weekEvents.length === 0 && this.events.length > 0) {
      const seenSlots = new Set<string>();
      const templateEvents: UTPEvent[] = [];

      for (const evt of this.events) {
        if (evt.isLongLasting) continue;
        const d = parseDate(evt.startAt);
        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        const key = `${d.getDay()}_${evt.title}_${timeStr}`;

        if (!seenSlots.has(key)) {
          seenSlots.add(key);
          templateEvents.push(evt);
        }
      }
      weekEvents = templateEvents;
    }

    // 4. Filtrar por modalidad seleccionada
    const filtered = this.selectedModality === 'ALL' 
      ? weekEvents 
      : weekEvents.filter(e => e.modality === this.selectedModality);

    // 5. Filtrar por día específico de la semana
    return filtered.filter(evt => {
      const d = parseDate(evt.startAt);
      return d.getDay() === dayNum;
    });
  }

  getParsedTitle(title: string): string {
    return parseEventTitle(title).cleanTitle;
  }

  formatScheduleTimeRange(start: string, finish: string): string {
    return formatScheduleTimeRange(start, finish);
  }

  formatCourseName(name: string): string {
    return formatCourseName(name);
  }

  getLocationForEvent(evt: UTPEvent) {
    return resolveEventLocation(evt);
  }

  isSessionActive(evt: UTPEvent, dayNum: number): boolean {
    if (!this.isToday(dayNum)) return false;
    const now = new Date();
    const dayEvents = this.getEventsForDayNumber(dayNum);
    const nextOrLiveEvt = dayEvents.find(e => parseDate(e.finishAt) >= now) || dayEvents[0];
    const startDate = parseDate(evt.startAt);
    const finishDate = parseDate(evt.finishAt);
    const isLiveNow = now >= startDate && now <= finishDate;
    const isNextToday = !isLiveNow && evt.id === nextOrLiveEvt?.id && now < startDate;
    return isLiveNow || isNextToday;
  }

  getCardAuroraStyle(id: string): Record<string, string> {
    const seed = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return getAuroraStyle(seed);
  }

  openZoom(e: Event, link?: string): void {
    e.stopPropagation();
    if (link) window.open(link, '_blank');
  }

  onOpenSyllabus(courseName: string): void {
    this.openSyllabus.emit(courseName);
  }

  onAskAiClick(prompt: string): void {
    this.openAi.emit(prompt);
  }
}
