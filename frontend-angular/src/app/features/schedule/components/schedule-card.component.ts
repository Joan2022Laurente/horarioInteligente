import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { UTPEvent } from '@domain/models/utp.model';
import { parseEventTitle, formatScheduleTimeRange } from '@data/schedule-parser';
import { resolveEventLocation } from '@data/classroom-helper';

@Component({
  selector: 'app-schedule-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div
      (click)="cardClick.emit(evt)"
      class="group relative rounded-[var(--r-2xl)] p-4 transition-all duration-300 space-y-3 shadow-none cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
      [ngClass]="isActive ? 'bg-[#282c20]' : 'bg-[var(--utopik-carbon-black)] hover:bg-[#282c20]'"
      [ngStyle]="auroraStyle"
    >
      <div class="flex items-center justify-between gap-1.5">
        @if (evt.modality === 'P') {
          <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--utopik-green-yellow)]">
            <lucide-icon name="map-pin" class="h-3 w-3"></lucide-icon>
            Presencial
          </span>
        } @else if (evt.modality === 'R') {
          <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--utopik-sandy-brown)]">
            <lucide-icon name="video" class="h-3 w-3"></lucide-icon>
            Zoom
          </span>
        } @else {
          <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--utopik-platinum)]">
            <lucide-icon name="wifi" class="h-3 w-3"></lucide-icon>
            Virtual
          </span>
        }

        @if (evt.modality === 'R' && evt.metadata?.zoomLink) {
          <button
            type="button"
            (click)="onZoomClick($event)"
            title="Unirse directo a Zoom"
            aria-label="Unirse a Zoom"
            class="flex h-6 w-6 items-center justify-center rounded-[var(--r-md)] bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition shrink-0 cursor-pointer"
          >
            <lucide-icon name="video" class="h-3.5 w-3.5 text-white/90"></lucide-icon>
          </button>
        } @else {
          <span class="text-[11px] font-mono font-medium text-neutral-400 group-hover:text-neutral-200 transition-colors truncate max-w-[80px]">
            {{ evt.modality === 'P' ? location.aula.replace('Aula ', '') : 'Digital' }}
          </span>
        }
      </div>

      <h4 class="text-xs font-bold text-white group-hover:text-[var(--utopik-green-yellow)] leading-snug line-clamp-2 transition-colors">
        {{ parsedTitle }}
      </h4>

      <div class="flex items-center gap-1.5 text-xs font-mono text-neutral-400 whitespace-nowrap">
        <lucide-icon name="clock" class="h-3.5 w-3.5 text-neutral-500 shrink-0"></lucide-icon>
        <span class="truncate">{{ timeRange }}</span>
      </div>
    </div>
  `
})
export class ScheduleCardComponent {
  @Input({ required: true }) evt!: UTPEvent;
  @Input() isActive = false;
  @Input() auroraStyle: Record<string, string> | null = null;

  @Output() cardClick = new EventEmitter<UTPEvent>();
  @Output() zoomClick = new EventEmitter<string>();

  get parsedTitle(): string {
    return parseEventTitle(this.evt?.title || '').cleanTitle;
  }

  get timeRange(): string {
    return formatScheduleTimeRange(this.evt?.startAt || '', this.evt?.finishAt || '');
  }

  get location() {
    return resolveEventLocation(this.evt);
  }

  onZoomClick(e: Event): void {
    e.stopPropagation();
    if (this.evt.metadata?.zoomLink) {
      this.zoomClick.emit(this.evt.metadata.zoomLink);
    }
  }
}