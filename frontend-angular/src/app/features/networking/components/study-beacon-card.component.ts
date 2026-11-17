import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { StudyBeaconRow } from '@domain/models/matching';
import { formatCourseName } from '@data/schedule-parser';

@Component({
  selector: 'app-study-beacon-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <article
      class="group relative flex flex-col justify-between r-card bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] p-4 sm:p-5 transition-all duration-200 text-left shadow-sm select-none font-sans"
    >
      <div class="space-y-3.5">
        <!-- Top Status & Scarcity Badge -->
        <div class="flex items-center justify-between gap-2">
          <!-- Scarcity Badge ("¡Faltan X sillas!") -->
          @if (isFull) {
            <span class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 r-control-sm bg-amber-500/15 border border-amber-500/30 text-amber-300">
              <span class="h-1.5 w-1.5 circle bg-amber-400"></span>
              <span>Mesa Completa ({{ beacon.current_collaborators }}/{{ beacon.max_collaborators }})</span>
            </span>
          } @else {
            <span class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 r-control-sm bg-[var(--badge-lime-bg)] border border-[var(--badge-lime-border)] text-[var(--accent-lime)] animate-pulse">
              <span class="h-1.5 w-1.5 circle bg-[var(--accent-lime)]"></span>
              <span>¡Faltan {{ remainingSeats }} {{ remainingSeats === 1 ? 'silla' : 'sillas' }}!</span>
            </span>
          }

          <!-- Live Beacon Tag -->
          <span class="text-[10px] font-medium text-[var(--text-muted)] flex items-center gap-1">
            <span class="inline-block h-1.5 w-1.5 circle bg-emerald-400 animate-ping"></span>
            <span>Activa ahora</span>
          </span>
        </div>

        <!-- Course & Physical Location Header -->
        <div class="space-y-1">
          <span class="text-[11px] font-bold text-[var(--accent-orange)] uppercase tracking-wider block">
            {{ formatCourse(beacon.course_name) }}
          </span>
          <h3 class="text-sm font-extrabold text-[var(--foreground)] group-hover:text-[var(--accent-lime)] transition-colors flex items-center gap-1.5">
            <lucide-icon name="map-pin" class="h-4 w-4 text-neutral-400 shrink-0"></lucide-icon>
            <span class="truncate">{{ beacon.location_name }}</span>
          </h3>
          <p class="text-[10px] text-[var(--text-muted)] font-medium">
            Sede: {{ beacon.campus }}
          </p>
        </div>

        <!-- Objective / Topic Quote Block -->
        <div class="text-xs text-neutral-300 leading-relaxed bg-[var(--surface-subtle)] p-3 r-panel border border-white/5 relative">
          <span class="text-[var(--text-muted)] italic font-medium block">
            &ldquo;{{ beacon.objective }}&rdquo;
          </span>
        </div>

        <!-- Host and Seats Counter -->
        <div class="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-0.5">
          <div class="flex items-center gap-1.5">
            <div class="h-5 w-5 r-control-xs bg-white/10 flex items-center justify-center font-bold text-[10px] text-white">
              {{ (beacon.host_name || 'U').charAt(0).toUpperCase() }}
            </div>
            <span class="truncate max-w-[130px] font-medium text-neutral-300">
              {{ beacon.host_name || 'Compañero UTP' }}
            </span>
          </div>

          <span class="font-medium text-[10px] text-neutral-400">
            Aforo: {{ beacon.current_collaborators }}/{{ beacon.max_collaborators }}
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-3.5 mt-3.5 border-t border-[var(--border-subtle)]">
        @if (isHost) {
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold text-[var(--accent-lime)] bg-[var(--accent-lime)]/10 px-2.5 py-1.5 r-control-md border border-[var(--accent-lime)]/20 shrink-0">
              Tu Mesa
            </span>
            <button
              type="button"
              (click)="cancel.emit(beacon.id)"
              class="flex-1 py-2 r-control-md bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold text-xs transition border border-red-500/20 cursor-pointer shadow-sm"
            >
              Cancelar Mesa
            </button>
          </div>
        } @else {
          <div class="flex items-center gap-2">
            <button
              type="button"
              [disabled]="isFull"
              (click)="join.emit(beacon)"
              class="flex-1 py-2.5 r-control-lg bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] disabled:bg-white/5 disabled:text-neutral-500 disabled:cursor-not-allowed text-black font-extrabold text-xs transition-all active:scale-[0.98] border-none cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
            >
              <lucide-icon name="clock" class="h-3.5 w-3.5"></lucide-icon>
              <span>{{ isFull ? 'Mesa Llena' : 'Llego en 10 min' }}</span>
            </button>
          </div>
        }
      </div>
    </article>
  `
})
export class StudyBeaconCardComponent {
  @Input({ required: true }) beacon!: StudyBeaconRow;
  @Input() isHost = false;
  @Output() join = new EventEmitter<StudyBeaconRow>();
  @Output() cancel = new EventEmitter<string>();

  get remainingSeats(): number {
    return Math.max(0, this.beacon.max_collaborators - this.beacon.current_collaborators);
  }

  get isFull(): boolean {
    return this.beacon.status === 'FULL' || this.remainingSeats <= 0;
  }

  formatCourse(name: string): string {
    return formatCourseName(name);
  }
}
