import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PollData } from '@domain/models/community';

@Component({
  selector: 'app-poll-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl border border-white/[0.08] bg-[#090a0d] p-3.5 space-y-2.5 text-left my-2 shadow-inner">
      
      <!-- Poll Question & Total Votes -->
      <div class="flex items-center justify-between text-xs text-neutral-400">
        <span class="font-bold text-white">{{ poll.question || 'Encuesta' }}</span>
        <span class="text-[11px] font-mono text-[var(--accent-lime)] bg-[var(--accent-lime)]/10 px-2 py-0.5 rounded-md font-bold">
          {{ poll.total_votes }} {{ poll.total_votes === 1 ? 'voto' : 'votos' }}
        </span>
      </div>

      <!-- Poll Options -->
      <div class="space-y-2">
        @for (opt of poll.options; track opt.id) {
          <div 
            (click)="onOptionClick(opt.id)"
            class="relative overflow-hidden rounded-xl border transition-all duration-150 p-2.5 cursor-pointer select-none group"
            [ngClass]="poll.user_voted_option_id === opt.id 
              ? 'border-[var(--accent-lime)] bg-[var(--accent-lime)]/10 shadow-sm' 
              : 'border-white/[0.08] bg-[#14151a] hover:bg-[#181920]'"
          >
            <!-- Progress Bar Fill -->
            <div 
              class="absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out rounded-xl"
              [ngClass]="poll.user_voted_option_id === opt.id ? 'bg-[var(--accent-lime)]/25' : 'bg-white/[0.06]'"
              [style.width.%]="getPercentage(opt.votes_count)"
            ></div>

            <div class="relative flex items-center justify-between z-10 text-xs gap-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <span 
                  class="h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition"
                  [ngClass]="poll.user_voted_option_id === opt.id 
                    ? 'border-[var(--accent-lime)] bg-[var(--accent-lime)]' 
                    : 'border-neutral-500 group-hover:border-neutral-300 bg-transparent'"
                >
                  @if (poll.user_voted_option_id === opt.id) {
                    <span class="h-1.5 w-1.5 rounded-full bg-black"></span>
                  }
                </span>

                <span class="font-medium text-neutral-100 truncate">
                  {{ opt.text }}
                </span>
              </div>

              <span class="font-mono text-xs font-bold text-neutral-200 shrink-0">
                {{ getPercentage(opt.votes_count) }}%
              </span>
            </div>
          </div>
        }
      </div>

      <div class="text-[11px] text-neutral-500 pt-0.5">
        <span>{{ poll.user_voted_option_id ? 'Voto registrado • Haz clic para cambiar' : 'Haz clic en una opción para votar' }}</span>
      </div>

    </div>
  `
})
export class PollWidgetComponent {
  @Input({ required: true }) poll!: PollData;
  @Output() vote = new EventEmitter<string>();

  getPercentage(votes: number): number {
    if (!this.poll.total_votes || this.poll.total_votes === 0) return 0;
    return Math.round((votes / this.poll.total_votes) * 100);
  }

  onOptionClick(optionId: string): void {
    this.vote.emit(optionId);
  }
}
