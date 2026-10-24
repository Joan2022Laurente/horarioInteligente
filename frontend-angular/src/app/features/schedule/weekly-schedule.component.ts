import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { UTPEvent, UTPCurrentInterval, ProcessedCourse } from '@domain/models/utp.model';
import { ClassDetailModalComponent } from './class-detail-modal.component';
import { ScheduleControlsComponent } from './components/schedule-controls.component';
import { ScheduleCardComponent } from './components/schedule-card.component';
import { 
  getEventsByWeek, 
  getEventsByDateRange,
  parseEventTitle, 
  formatCourseName, 
  DAYS_OF_WEEK, 
  parseDate, 
  getProcessedCourses 
} from '@data/schedule-parser';
import { getCachedCalendarData } from '@data/syllabus/client-storage';
import { getAuroraStyle } from '@data/aurora.helper';
import { ScheduleService } from '@data/services/schedule.service';
import { normalizeKey } from '../../core/utils/string.utils';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

@Component({
  selector: 'app-weekly-schedule',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LucideAngularModule,
    ClassDetailModalComponent,
    ScheduleControlsComponent,
    ScheduleCardComponent
  ],
  template: `
    <div class="space-y-8 text-white font-sans text-left">
      <!-- 1. Controles: Navegación de Semana, Modalidades y Exportación -->
      <app-schedule-controls
        [currentWeek]="currentWeek"
        [totalWeeks]="totalWeeks"
        [selectedWeek]="selectedWeek"
        [selectedModality]="selectedModality"
        [isExporting]="isExporting()"
        (weekChange)="selectedWeek = $event"
        (modalityChange)="selectedModality = $event"
        (exportRequested)="exportToGoogleCalendar()"
      />

      <!-- 2. Grid Semanal de 7 Días (Lunes a Domingo) con separación de filas generosa -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3.5 sm:gap-4.5">
        @for (dayNum of daysToDisplay; track dayNum) {
          <div class="flex flex-col">
            <!-- Header del Día (Flat design, cero borders) -->
            <div class="pb-2.5 flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold tracking-tight" [ngClass]="isToday(dayNum) ? 'text-white' : 'text-neutral-400'">
                  {{ getDayName(dayNum) }}
                </span>
                @if (isToday(dayNum)) {
                  <span class="inline-flex items-center px-2 py-0.5 rounded-[var(--r-xs)] text-[10px] font-bold bg-[var(--utopik-green-yellow)]/15 text-[var(--utopik-green-yellow)] leading-none">
                    Hoy
                  </span>
                }
              </div>
            </div>

            <!-- Lista de Sesiones del Día con gap-4 vertical entre filas -->
            <div class="flex flex-col gap-4 flex-1">
              @if (getEventsForDayNumber(dayNum).length === 0) {
                <div class="h-28 rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)]/60 flex items-center justify-center text-center text-xs text-neutral-600 font-medium select-none">
                  Sin clases
                </div>
              } @else {
                @for (evt of getEventsForDayNumber(dayNum); track evt.id) {
                  <app-schedule-card
                    [evt]="evt"
                    [isActive]="isSessionActive(evt, dayNum)"
                    [auroraStyle]="isSessionActive(evt, dayNum) ? getCardAuroraStyle(evt.id) : null"
                    (cardClick)="selectedEventForModal = $event"
                    (zoomClick)="openZoomDirect($event)"
                  />
                }
              }
            </div>
          </div>
        }
      </div>

      <!-- 3. Asignaturas Virtuales 24/7 Asíncronas (Flat design, cero borders) -->
      @if (virtual247Courses.length > 0) {
        <div class="pt-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold tracking-tight text-neutral-400 uppercase">
              Asignaturas Virtuales 24/7
            </h3>
            <span class="text-xs font-medium text-neutral-500">
              {{ virtual247Courses.length }} {{ virtual247Courses.length === 1 ? 'curso' : 'cursos' }}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4.5">
            @for (course of virtual247Courses; track course.courseId) {
              <div
                (click)="openVirtualCourseModal(course)"
                class="group relative rounded-[var(--r-2xl)] p-4 transition-all duration-300 space-y-3 shadow-none cursor-pointer hover:-translate-y-0.5 active:translate-y-0 bg-[var(--utopik-carbon-black)] hover:bg-[#282c20]"
              >
                <div class="flex items-center justify-between gap-1.5">
                  <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--utopik-platinum)]">
                    <lucide-icon name="wifi" class="h-3 w-3"></lucide-icon>
                    24/7 Asíncrono
                  </span>

                  <span class="text-[10px] font-medium text-neutral-400 group-hover:text-neutral-200 transition-colors">
                    Canvas
                  </span>
                </div>

                <h4 class="text-xs font-bold text-white group-hover:text-[var(--utopik-green-yellow)] leading-snug line-clamp-2 transition-colors">
                  {{ formatCourseName(course.name) }}
                </h4>

                <div class="flex items-center justify-between text-xs font-mono text-neutral-400">
                  <div class="flex items-center gap-1.5 truncate">
                    <lucide-icon name="clock" class="h-3.5 w-3.5 text-neutral-500 shrink-0"></lucide-icon>
                    <span class="truncate">Sin horario fijo</span>
                  </div>
                  @if (course.sectionCode) {
                    <span class="text-[10px] text-neutral-500 shrink-0 font-medium">Sec. {{ course.sectionCode }}</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- 4. Modal de Detalle de Clase -->
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
  private readonly feedback = inject(UiFeedbackService);
  readonly isExporting = signal<boolean>(false);

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

  getDayName(dayNum: number): string {
    return DAYS_OF_WEEK[dayNum] || '';
  }

  isToday(dayNum: number): boolean {
    return new Date().getDay() === dayNum && this.selectedWeek === this.currentWeek;
  }

  getEventsForDayNumber(dayNum: number): UTPEvent[] {
    let weekEvents: UTPEvent[] = [];

    const startOfPeriodStr = this.currentInterval?.start_of_period || this.startOfInterval;
    if (startOfPeriodStr) {
      const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const baseMs = parseDate(startOfPeriodStr).getTime();
      
      const periodStartMs = this.currentInterval?.start_of_period 
        ? baseMs
        : baseMs - (this.currentWeek - 1) * WEEK_MS;

      const targetWeekStartMs = periodStartMs + (this.selectedWeek - 1) * WEEK_MS;
      const targetWeekEndMs = targetWeekStartMs + WEEK_MS;

      weekEvents = getEventsByDateRange(this.events, targetWeekStartMs, targetWeekEndMs);
    }

    if (weekEvents.length === 0) {
      weekEvents = getEventsByWeek(this.events, this.selectedWeek);
    }

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

    const filtered = this.selectedModality === 'ALL' 
      ? weekEvents 
      : weekEvents.filter(e => e.modality === this.selectedModality);

    return filtered.filter(evt => {
      const d = parseDate(evt.startAt);
      if (d.getDay() !== dayNum) return false;

      if (evt.modality === 'VT') return false;
      const cleanTitle = normalizeKey(parseEventTitle(evt.title).cleanTitle);
      const is247 = this.virtual247Courses.some(v => {
        const vName = normalizeKey((v.name || '').replace(/-\s*\d{4,6}$/g, ''));
        return vName === cleanTitle || cleanTitle.includes(vName) || vName.includes(cleanTitle);
      });
      return !is247;
    });
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

  formatCourseName(name: string): string {
    return formatCourseName(name);
  }

  openZoomDirect(link: string): void {
    if (link) window.open(link, '_blank');
  }

  exportToGoogleCalendar(): void {
    if (this.isExporting()) return;
    this.isExporting.set(true);
    const period = this.scheduleService.currentSchedule()?.periodName || '2026 - Ciclo 2 Agosto';

    this.scheduleService.exportCalendarIcs(period).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `horario_utp_${period.replace(/\s+/g, '_')}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isExporting.set(false);
        this.feedback.success('Horario exportado', 'Archivo .ics descargado exitosamente para Google Calendar.');
      },
      error: (err) => {
        console.error('[WeeklySchedule] Error exportando horario a .ics:', err);
        this.isExporting.set(false);
        this.feedback.error('Error al exportar', 'No se pudo generar el archivo .ics de tu horario.');
      }
    });
  }

  openVirtualCourseModal(course: ProcessedCourse): void {
    const existingEvt = this.events.find(e => {
      const title = parseEventTitle(e.title).cleanTitle.toLowerCase();
      return title.includes(course.name.toLowerCase()) || course.name.toLowerCase().includes(title);
    });

    if (existingEvt) {
      this.selectedEventForModal = existingEvt;
    } else {
      this.selectedEventForModal = {
        id: course.courseId || `virtual-${Date.now()}`,
        title: `${course.name} (Virtual 24/7)`,
        modality: 'VT',
        type: 'SESSION',
        startAt: new Date().toISOString(),
        finishAt: new Date().toISOString(),
        metadata: {
          courseName: course.name,
          sectionCode: course.sectionCode,
          zoomLink: course.zoomLink,
          classLink: course.classLink,
          environmentType: 'Virtual 24/7'
        }
      };
    }
  }
}