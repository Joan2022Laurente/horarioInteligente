import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { StudyBeaconRow } from '@domain/models/matching';
import { formatCourseName } from '@data/schedule-parser';

@Component({
  selector: 'app-join-beacon-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity font-sans"
      (click)="close.emit()"
    >
      <div
        class="relative flex flex-col w-full max-w-md r-control-lg bg-[var(--surface-card)] text-[var(--foreground)] p-6 shadow-md border border-[var(--border-medium)] space-y-4 text-left animate-in fade-in zoom-in-95 duration-150"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <span class="text-[10px] font-bold text-[var(--accent-lime)] bg-[var(--accent-lime)]/10 px-2 py-0.5 r-control-xs border border-[var(--accent-lime)]/20">
              Mesa In-Campus
            </span>
            <h3 class="text-base font-extrabold text-[var(--foreground)] mt-1">
              Unirse al Squad de Estudio
            </h3>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            class="h-8 w-8 circle bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center border-none cursor-pointer transition"
          >
            <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
          </button>
        </div>

        <!-- Info details -->
        <div class="space-y-2.5 text-xs bg-[var(--surface-subtle)] p-4 r-panel border border-white/5">
          <div class="space-y-1">
            <span class="text-[10px] font-bold text-[var(--accent-orange)] uppercase tracking-wider block">
              {{ formatCourse(beacon.course_name) }}
            </span>
            <p class="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
              <lucide-icon name="map-pin" class="h-4 w-4 text-[var(--accent-lime)] shrink-0"></lucide-icon>
              <span>{{ beacon.location_name }}</span>
            </p>
          </div>

          <p class="text-neutral-300 italic pt-1 font-medium">
            &ldquo;{{ beacon.objective }}&rdquo;
          </p>

          <div class="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-2 border-t border-white/5">
            <span class="font-medium">Anfitrión: {{ beacon.host_name || 'Compañero UTP' }}</span>
            <span class="font-semibold text-[var(--accent-lime)]">
              {{ beacon.current_collaborators }}/{{ beacon.max_collaborators }} sillas ocupadas
            </span>
          </div>
        </div>

        <!-- Commitment Microcopy -->
        <p class="text-[11px] text-neutral-400 leading-relaxed font-medium">
          Al pulsar <strong class="text-white">"Llego en 10 min"</strong>, se reservará tu silla en la mesa y se notificará a los demás compañeros de tu curso.
        </p>

        <!-- Actions -->
        <div class="flex items-center gap-2 pt-1">
          <button
            type="button"
            (click)="close.emit()"
            class="flex-1 py-2.5 r-control-lg bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs border-none cursor-pointer transition shadow-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            (click)="confirm.emit(beacon.id)"
            class="flex-1 py-2.5 r-control-lg bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-black font-extrabold text-xs border-none cursor-pointer transition shadow-sm active:scale-[0.98]"
          >
            Llego en 10 min
          </button>
        </div>
      </div>
    </div>
  `
})
export class JoinBeaconModalComponent {
  @Input({ required: true }) beacon!: StudyBeaconRow;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<string>();

  formatCourse(name: string): string {
    return formatCourseName(name);
  }
}
