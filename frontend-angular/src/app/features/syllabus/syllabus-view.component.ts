import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcessedCourse, CourseEvaluation } from '@domain/models/utp.model';
import { ParsedSyllabus } from '@data/syllabus/types';
import { ScheduleService } from '@data/services/schedule.service';
import { SyllabusService } from '@data/services/syllabus.service';
import { CourseCardComponent } from './components/course-card.component';
import { SyllabusModalComponent } from './components/syllabus-modal.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-syllabus-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CourseCardComponent,
    SyllabusModalComponent,
    LucideAngularModule,
  ],
  template: `
    <div class="space-y-6 text-white font-sans text-left">

      <!-- Header Info -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl sm:text-2xl font-black tracking-tight text-white">
            Asignaturas Matriculadas ({{ courses.length }})
          </h2>
          <p class="text-xs text-[var(--utopik-platinum)]/60 mt-1">
            Periodo {{ periodName }} • Sílabos oficiales, rúbricas y fórmulas de evaluación descargadas en tiempo real.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="onAskAi('Haz un resumen comparativo de todos mis cursos, sus exigencias y fechas de exámenes clave')"
            class="inline-flex items-center gap-2 rounded-[var(--r-lg)] bg-[var(--utopik-green-yellow)] px-4 py-2 text-xs font-black text-black transition active:scale-95"
          >
            <lucide-icon name="sparkles" class="h-3.5 w-3.5 text-black"></lucide-icon>
            <span>Resumen IA</span>
          </button>
        </div>
      </div>

      <!-- Grid de Cursos -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (course of courses; track course.courseId) {
          <app-course-card
            [course]="course"
            (openSyllabus)="openSyllabus($event)"
            (askAi)="onAskAi($event)"
          />
        }
      </div>

      <!-- MODAL: Sílabo Completo & Rúbricas -->
      <app-syllabus-modal
        [isOpen]="isSyllabusModalOpen"
        [syllabus]="currentModalSyllabus"
        [isSyncing]="isSyncing"
        [syncStep]="syncStep"
        [selectedCourseName]="selectedCourseName"
        [selectedCourseSyllabusUrl]="selectedCourseSyllabusUrl"
        [syllabusErrorMessage]="syllabusErrorMessage"
        [currentWeek]="currentWeek"
        (close)="isSyllabusModalOpen = false"
        (askAi)="onAskAi($event)"
        (retry)="retrySyllabus()"
      />

    </div>
  `,
})
export class SyllabusViewComponent implements OnInit {
  @Input() initialCourseToOpen?: string;
  @Output() askAi = new EventEmitter<string>();

  isSyllabusModalOpen = false;
  selectedCourseName = '';
  selectedCourseSyllabusUrl?: string;
  currentModalSyllabus: ParsedSyllabus | null = null;
  isSyncing = false;
  syncStep = '';
  syllabusErrorMessage: string | null = null;
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
      this.scheduleService.getSchedule().subscribe({
        next: () => {
          if (this.initialCourseToOpen) {
            this.openSyllabus(this.initialCourseToOpen);
          }
        },
      });
    } else if (this.initialCourseToOpen) {
      this.openSyllabus(this.initialCourseToOpen);
    }
  }

  openSyllabus(courseName: string): void {
    this.selectedCourseName = courseName;
    this.isSyllabusModalOpen = true;
    this.currentModalSyllabus = null;
    this.syllabusErrorMessage = null;

    const course = this.courses.find(c => c.name === courseName || c.courseId === courseName);
    this.selectedCourseSyllabusUrl = course?.syllabusUrl;

    this.isSyncing = true;
    this.syncStep = `Cargando sílabo oficial de ${courseName}...`;

    const identifier = course?.courseId || courseName;
    this.syllabusService.getSyllabus(
      identifier,
      course?.sectionId || course?.sectionCode,
      course?.syllabusUrl
    ).subscribe({
      next: (res) => {
        this.isSyncing = false;

        if (!res?.success || !res?.data) {
          this.currentModalSyllabus = null;
          this.syllabusErrorMessage = res?.message
            || 'No fue posible recuperar el sílabo oficial en este momento.';
          console.warn(`[SyllabusView] Sílabo no disponible para '${identifier}': ${this.syllabusErrorMessage}`);
          return;
        }

        if (!this.isUsableSyllabus(res.data)) {
          this.currentModalSyllabus = null;
          this.syllabusErrorMessage =
            'El sílabo oficial de este curso aún no está disponible. Reintenta en unos segundos.';
          console.warn(`[SyllabusView] Sílabo sin contenido verificable para '${identifier}'.`);
          return;
        }

        this.currentModalSyllabus = res.data;
        this.syllabusErrorMessage = null;
        this.scrollToCurrentWeek();
      },
      error: (err) => {
        this.isSyncing = false;
        this.currentModalSyllabus = null;
        this.syllabusErrorMessage =
          'No fue posible conectar con la pasarela de sílabos. Revisa tu conexión y reintenta.';
        console.warn(`[SyllabusView] Error de red al cargar el sílabo de '${identifier}':`, err);
      }
    });
  }

  /** Verifica que el sílabo recibido tenga contenido curricular real y verificable. */
  private isUsableSyllabus(syllabus: any): boolean {
    if (!syllabus) return false;
    const hasFormula = typeof syllabus.formula === 'string' && syllabus.formula.trim().length > 0;
    const hasWeeks = Array.isArray(syllabus.weeklySchedule) && syllabus.weeklySchedule.length > 0;
    const hasEvaluations = Array.isArray(syllabus.evaluations) && syllabus.evaluations.length > 0;
    return hasFormula || hasWeeks || hasEvaluations;
  }

  retrySyllabus(): void {
    this.currentModalSyllabus = null;
    this.syllabusErrorMessage = null;
    this.isSyncing = true;
    this.syncStep = `Cargando sílabo oficial de ${this.selectedCourseName}...`;
    this.openSyllabus(this.selectedCourseName);
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
        const top = el.offsetTop - container.offsetTop - 80;
        container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    }, 150);
  }

  onAskAi(prompt: string): void {
    this.askAi.emit(prompt);
  }
}
