import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-schedule-controls',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 text-white font-sans text-left">
      <!-- Selector de Semana -->
      <div class="flex items-center gap-2">
        <div class="flex items-center bg-[var(--utopik-carbon-black)] r-control-md p-1">
          <button
            type="button"
            (click)="changeWeek(selectedWeek - 1)"
            [disabled]="selectedWeek <= 1"
            aria-label="Semana anterior"
            class="flex h-8 w-8 items-center justify-center r-control-md text-neutral-400 hover:text-white hover:bg-white/5 transition disabled:opacity-20 bg-transparent cursor-pointer"
          >
            <lucide-icon name="chevron-left" class="h-4 w-4"></lucide-icon>
          </button>

          <div class="flex items-center gap-2 px-3">
            <lucide-icon name="calendar" class="h-4 w-4 text-[var(--utopik-green-yellow)]"></lucide-icon>
            <select
              [(ngModel)]="selectedWeek"
              (ngModelChange)="onWeekSelect($event)"
              aria-label="Seleccionar semana académica"
              class="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              @for (w of totalWeeksArray; track w) {
                <option [value]="w" class="bg-[var(--utopik-carbon-black)] text-white">
                  Semana {{ w }} {{ w === currentWeek ? '(Actual)' : '' }}
                </option>
              }
            </select>
          </div>

          <button
            type="button"
            (click)="changeWeek(selectedWeek + 1)"
            [disabled]="selectedWeek >= totalWeeks"
            aria-label="Semana siguiente"
            class="flex h-8 w-8 items-center justify-center r-control-md text-neutral-400 hover:text-white hover:bg-white/5 transition disabled:opacity-20 bg-transparent cursor-pointer"
          >
            <lucide-icon name="chevron-right" class="h-4 w-4"></lucide-icon>
          </button>
        </div>

        @if (selectedWeek === currentWeek) {
          <span class="inline-flex items-center gap-1.5 r-control-md bg-[var(--utopik-green-yellow)]/15 text-[var(--utopik-green-yellow)] font-bold px-2.5 py-1 text-[11px] shadow-none">
            <span class="h-1.5 w-1.5 circle bg-[var(--utopik-green-yellow)] animate-pulse"></span>
            En curso
          </span>
        }
      </div>

      <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <!-- Filtros de Modalidad con Segmented Controls -->
        <div class="inline-flex items-center gap-1 bg-[var(--utopik-carbon-black)] nest-1 r-control-md overflow-x-auto no-scrollbar max-w-full text-xs">
          <button
            type="button"
            (click)="setModality('ALL')"
            class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 r-inner font-bold"
            [ngClass]="selectedModality === 'ALL' ? 'bg-white text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-white/5'"
          >
            Todas
          </button>
          <button
            type="button"
            (click)="setModality('P')"
            class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 r-inner font-bold"
            [ngClass]="selectedModality === 'P' ? 'bg-[var(--utopik-green-yellow)] text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-white/5'"
          >
            Presenciales
          </button>
          <button
            type="button"
            (click)="setModality('R')"
            class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 r-inner font-bold"
            [ngClass]="selectedModality === 'R' ? 'bg-[var(--utopik-sandy-brown)] text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-white/5'"
          >
            Zoom
          </button>
          <button
            type="button"
            (click)="setModality('VT')"
            class="inline-flex items-center gap-1.5 whitespace-nowrap transition-all shadow-none shrink-0 cursor-pointer px-3.5 py-1.5 r-inner font-bold"
            [ngClass]="selectedModality === 'VT' ? 'bg-[var(--utopik-green-yellow)] text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white hover:bg-white/5'"
          >
            Virtuales
          </button>
        </div>
      </div>
    </div>
  `
})
export class ScheduleControlsComponent {
  @Input() currentWeek = 6;
  @Input() totalWeeks = 18;
  @Input() selectedWeek = 6;
  @Input() selectedModality = 'ALL';

  @Output() weekChange = new EventEmitter<number>();
  @Output() modalityChange = new EventEmitter<string>();

  get totalWeeksArray(): number[] {
    return Array.from({ length: this.totalWeeks }, (_, i) => i + 1);
  }

  changeWeek(w: number): void {
    const target = Math.max(1, Math.min(this.totalWeeks, w));
    if (target !== this.selectedWeek) {
      this.selectedWeek = target;
      this.weekChange.emit(this.selectedWeek);
    }
  }

  onWeekSelect(val: number | string): void {
    const num = Number(val);
    if (!isNaN(num)) {
      this.selectedWeek = num;
      this.weekChange.emit(this.selectedWeek);
    }
  }

  setModality(m: string): void {
    this.selectedModality = m;
    this.modalityChange.emit(m);
  }
}