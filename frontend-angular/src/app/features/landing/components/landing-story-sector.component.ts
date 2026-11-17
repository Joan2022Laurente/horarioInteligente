import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-landing-story-sector',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <section class="utopik-sector min-h-[75vh] lg:h-screen lg:min-h-screen flex flex-col justify-center py-16 lg:py-24 px-6 sm:px-10 lg:px-16">
      <div class="max-w-xl space-y-6">
        
        <!-- Eyebrow Editorial (KISS: una sola palabra, condicional si existe) -->
        @if (eyebrow) {
          <div class="inline-flex items-center">
            <span class="text-[11px] font-black tracking-[0.25em] uppercase font-sans font-medium"
                  [ngClass]="{
                    'text-[var(--utopik-green-yellow)]': color === 'lime',
                    'text-[var(--utopik-sandy-brown)]': color === 'sandy',
                    'text-[var(--utopik-platinum)]': color === 'platinum'
                  }">
              {{ eyebrow }}
            </span>
          </div>
        }

        <!-- Titular Editorial Principal -->
        <h2 class="text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--utopik-platinum)] leading-[1.04] tracking-tight">
          {{ title }}
        </h2>

        <!-- Subtítulo Enriquecido -->
        <p class="text-base sm:text-lg text-neutral-400 font-normal leading-relaxed">
          {{ subtitle }}
        </p>

        <!-- CTA Opcional -->
        @if (cta) {
          <div class="pt-2">
            <button
              type="button"
              (click)="ctaClick.emit()"
              class="inline-flex items-center gap-2.5 px-7 py-3.5 r-control-lg bg-[var(--utopik-green-yellow)] hover:bg-[#aee642] text-[var(--utopik-onyx)] font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl shadow-[var(--utopik-green-yellow)]/20 transition-all active:scale-95 cursor-pointer border-none group"
            >
              <span>{{ cta }}</span>
              <lucide-icon name="arrow-right" class="w-4 h-4 text-[var(--utopik-onyx)] group-hover:translate-x-1 transition-transform stroke-[2.5]"></lucide-icon>
            </button>
          </div>
        }
      </div>

      <!-- Micro-tarjetas para vista móvil (cuando el panel derecho se oculta) -->
      <div class="lg:hidden mt-8 grid grid-cols-1 gap-3">
        <ng-content></ng-content>
      </div>
    </section>
  `,
})
export class LandingStorySectorComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() cta = '';
  @Input() color: 'lime' | 'sandy' | 'platinum' = 'lime';
  @Output() ctaClick = new EventEmitter<void>();
}
