import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcessedCourse, CourseEvaluation } from '@domain/models/utp.model';
import { ParsedSyllabus } from '@data/syllabus/types';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-course-card',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div
      class="flex flex-col justify-between rounded-[var(--r-2xl)] bg-[var(--utopik-carbon-black)] hover:bg-[#282c20] transition-all duration-300 space-y-4 p-5 group shadow-none cursor-pointer"
      (click)="onOpenSyllabus()"
    >
      <div class="space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-3">
            @for (m of course.modalities; track m) {
              @if (m === 'P') {
                <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--utopik-green-yellow)]">
                  <lucide-icon name="map-pin" class="h-3 w-3"></lucide-icon>
                  Presencial
                </span>
              } @else if (m === 'R') {
                <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--utopik-sandy-brown)]">
                  <lucide-icon name="video" class="h-3 w-3"></lucide-icon>
                  Remoto Zoom
                </span>
              } @else {
                <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--utopik-platinum)]">
                  <lucide-icon name="wifi" class="h-3 w-3"></lucide-icon>
                  Virtual
                </span>
              }
            }
          </div>

          <span class="flex items-center gap-1 text-[11px] font-medium text-neutral-400">
            <lucide-icon name="layers" class="h-3 w-3 text-neutral-500"></lucide-icon>
            {{ course.totalSessions }} {{ course.totalSessions === 1 ? 'sesión' : 'sesiones' }}
          </span>
        </div>

        <h3 class="text-base font-bold text-white leading-snug tracking-tight">
          {{ course.name }}
        </h3>
      </div>

      <div class="flex items-center gap-2 pt-3">
        <button
          type="button"
          class="flex-1 inline-flex items-center justify-center gap-2 rounded-[var(--r-lg)] bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition active:scale-95 py-2.5 px-3 cursor-pointer"
          (click)="onOpenSyllabus(); $event.stopPropagation()"
        >
          <lucide-icon name="book-open" class="h-4 w-4 text-[var(--utopik-green-yellow)]"></lucide-icon>
          <span>Sílabo & Rúbricas</span>
        </button>

        @if (course.zoomLink) {
          <a
            [href]="course.zoomLink"
            target="_blank"
            rel="noopener noreferrer"
            title="Entrar a sala Zoom de la clase"
            class="inline-flex items-center justify-center h-9 w-9 rounded-[var(--r-lg)] bg-white/10 hover:bg-[var(--utopik-sandy-brown)]/20 text-white hover:text-[var(--utopik-sandy-brown)] transition active:scale-95 shrink-0 cursor-pointer"
            (click)="$event.stopPropagation()"
          >
            <lucide-icon name="video" class="h-4 w-4"></lucide-icon>
          </a>
        }

        <button
          type="button"
          (click)="onAskAi(); $event.stopPropagation()"
          title="Consultar al Agente sobre este curso"
          class="inline-flex items-center justify-center h-9 w-9 rounded-[var(--r-lg)] bg-white/10 hover:bg-[var(--utopik-green-yellow)]/20 text-white hover:text-[var(--utopik-green-yellow)] transition active:scale-95 shrink-0 cursor-pointer"
        >
          <lucide-icon name="sparkles" class="h-4 w-4 text-[var(--utopik-green-yellow)]"></lucide-icon>
        </button>
      </div>
    </div>
  `,
})
export class CourseCardComponent {
  @Input({ required: true }) course!: ProcessedCourse;
  @Output() openSyllabus = new EventEmitter<string>();
  @Output() askAi = new EventEmitter<string>();

  onOpenSyllabus(): void {
    this.openSyllabus.emit(this.course.name);
  }

  onAskAi(): void {
    this.askAi.emit(`Analiza el curso ${this.course.name}, su fórmula de evaluación y qué tips necesito para aprobar con 20`);
  }
}
