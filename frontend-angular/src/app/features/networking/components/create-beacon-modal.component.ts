import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { StudyBeaconRow } from '@domain/models/matching';

export interface CreateBeaconPayload {
  location_name: string;
  course_name: string;
  objective: string;
  max_collaborators: number;
}

@Component({
  selector: 'app-create-beacon-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity font-sans"
      (click)="close.emit()"
    >
      <div
        class="relative flex flex-col w-full max-w-md r-control-lg bg-[var(--surface-card)] text-[var(--foreground)] p-6 shadow-md border border-[var(--border-medium)] space-y-4 text-left animate-in fade-in zoom-in-95 duration-150"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h3 class="text-base font-extrabold text-[var(--foreground)] flex items-center gap-2">
              <span>Publicar Mesa de Estudio</span>
              <span class="text-[10px] font-bold text-[var(--accent-lime)] bg-[var(--accent-lime)]/10 px-2 py-0.5 r-control-xs border border-[var(--accent-lime)]/20">
                In-Campus
              </span>
            </h3>
            <p class="text-xs text-[var(--text-muted)] mt-0.5">
              Arma un squad de estudio efímero para tu ventana libre de hoy.
            </p>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            class="h-8 w-8 circle bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center border-none cursor-pointer transition"
          >
            <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
          </button>
        </div>

        <!-- Form Fields -->
        <form (ngSubmit)="onSubmit()" class="space-y-3.5 text-xs">
          <!-- Ubicación física -->
          <div>
            <label class="block font-bold text-neutral-300 mb-1">
              Ubicación física en Campus <span class="text-[var(--accent-orange)]">*</span>
            </label>
            <input
              type="text"
              name="location"
              [(ngModel)]="location"
              required
              placeholder="Ej: Torre A - Piso 8 (Laboratorio PC) o Biblioteca"
              class="w-full bg-[var(--surface-input)] border border-[var(--border-subtle)] focus:border-[var(--accent-lime)] focus:ring-1 focus:ring-[var(--accent-lime)] r-control-md px-3.5 py-2.5 text-white placeholder-neutral-500 text-xs transition outline-none font-sans"
            />
          </div>

          <!-- Curso / Asignatura -->
          <div>
            <label class="block font-bold text-neutral-300 mb-1">
              Curso / Asignatura <span class="text-[var(--accent-orange)]">*</span>
            </label>
            <select
              name="course"
              [(ngModel)]="course"
              required
              class="w-full bg-[var(--surface-input)] border border-[var(--border-subtle)] focus:border-[var(--accent-lime)] focus:ring-1 focus:ring-[var(--accent-lime)] r-control-md px-3.5 py-2.5 text-white text-xs transition outline-none cursor-pointer font-sans"
            >
              @for (c of coursesList; track c) {
                <option [value]="c" class="bg-[#121215] text-white">{{ c }}</option>
              }
            </select>
          </div>

          <!-- Objetivo de la sesión -->
          <div>
            <label class="block font-bold text-neutral-300 mb-1">
              Objetivo de la sesión <span class="text-[var(--accent-orange)]">*</span>
            </label>
            <textarea
              name="objective"
              [(ngModel)]="objective"
              required
              rows="2"
              placeholder="Ej: Resolviendo laboratorio de Spring Boot + JPA para el APF1..."
              class="w-full bg-[var(--surface-input)] border border-[var(--border-subtle)] focus:border-[var(--accent-lime)] focus:ring-1 focus:ring-[var(--accent-lime)] r-control-md px-3.5 py-2 text-white placeholder-neutral-500 text-xs transition outline-none resize-none font-sans"
            ></textarea>
          </div>

          <!-- Aforo máximo de la mesa -->
          <div>
            <label class="block font-bold text-neutral-300 mb-1">
              Capacidad máxima (Sillas en la mesa)
            </label>
            <div class="grid grid-cols-4 gap-2">
              @for (cap of [2, 3, 4, 6]; track cap) {
                <button
                  type="button"
                  (click)="capacity = cap"
                  class="py-2 r-control-md text-xs font-bold transition border cursor-pointer font-sans"
                  [ngClass]="capacity === cap
                    ? 'bg-[var(--accent-lime)] text-black border-[var(--accent-lime)]'
                    : 'bg-white/[0.04] text-[var(--text-muted)] hover:text-white border-white/5'"
                >
                  {{ cap }} sillas
                </button>
              }
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2 pt-2">
            <button
              type="button"
              (click)="close.emit()"
              class="flex-1 py-2.5 r-control-lg bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs border-none cursor-pointer transition shadow-sm font-sans"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="!isValid"
              class="flex-1 py-2.5 r-control-lg bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-xs border-none cursor-pointer transition shadow-sm font-sans"
            >
              Publicar en Radar
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class CreateBeaconModalComponent {
  @Input() coursesList: string[] = [
    'Desarrollo Web Integrado',
    'Servicios Cloud',
    'Gestión del Servicio TI',
    'Formación para la Investigación - Sistemas',
    'Lenguajes de Programación',
    'Herramientas para la Comunicación Efectiva'
  ];

  @Output() close = new EventEmitter<void>();
  @Output() create = new EventEmitter<CreateBeaconPayload>();

  location = '';
  course = 'Desarrollo Web Integrado';
  objective = '';
  capacity = 4;

  get isValid(): boolean {
    return this.location.trim().length > 3 && this.objective.trim().length > 5;
  }

  onSubmit(): void {
    if (!this.isValid) return;
    this.create.emit({
      location_name: this.location.trim(),
      course_name: this.course,
      objective: this.objective.trim(),
      max_collaborators: this.capacity
    });
  }
}
