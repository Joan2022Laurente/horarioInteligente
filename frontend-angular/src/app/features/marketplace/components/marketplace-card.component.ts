import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceItem } from '@domain/models/marketplace';

@Component({
  selector: 'app-marketplace-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article 
      (click)="selectItem.emit(item)"
      class="group relative flex flex-col bg-[#0e0f13] hover:bg-[#14151b] border border-white/[0.08] hover:border-[var(--accent-lime)]/40 rounded-3xl overflow-hidden transition duration-200 cursor-pointer text-left shadow-xl"
    >
      
      <!-- Card Image Aspect Square Frame -->
      <div class="relative aspect-square w-full bg-[#08090b] overflow-hidden">
        <img 
          [src]="item.imageUrl" 
          [alt]="item.title"
          loading="lazy"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
        />

        <!-- Top Badges Overlay -->
        <div class="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
          @if (item.badge) {
            <span 
              class="px-2 py-0.5 rounded-lg text-[10px] font-extrabold tracking-wide uppercase shadow-sm"
              [ngClass]="item.badge === 'TOP TUTOR' || item.badge === 'MÁS SOLICITADO' || item.badge === 'CASERO / FRESCO' || item.badge === 'ENTREGA HOY'
                ? 'bg-[var(--accent-lime)] text-black' 
                : 'bg-black/80 backdrop-blur-md text-white border border-white/10'"
            >
              {{ item.badge }}
            </span>
          } @else {
            <span></span>
          }

          <span class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-black/80 backdrop-blur-md text-neutral-300 border border-white/10">
            Ciclo {{ item.tutorCycle }}
          </span>
        </div>

        <!-- Bottom Location / Course Pill Overlay -->
        @if (item.location || item.courseName) {
          <div class="absolute bottom-2 left-2 right-2 flex items-center pointer-events-none">
            <span class="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-black/85 backdrop-blur-md text-neutral-300 border border-white/10 truncate max-w-full flex items-center gap-1">
              @if (item.location) {
                <svg class="h-3 w-3 text-[var(--accent-lime)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>{{ item.location }}</span>
              } @else if (item.courseName) {
                <span>{{ item.courseName }}</span>
              }
            </span>
          </div>
        }
      </div>

      <!-- Card Body Content -->
      <div class="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
        
        <div class="space-y-1.5">
          <!-- Service / Product Type & Condition / Career -->
          <div class="flex items-center justify-between text-[11px] text-neutral-400">
            <span class="font-medium text-neutral-300">{{ item.serviceType }}</span>
            @if (item.condition) {
              <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 font-medium truncate max-w-[110px]">
                {{ item.condition }}
              </span>
            } @else {
              <span class="text-[10px] text-neutral-500 font-mono truncate max-w-[120px]">{{ item.tutorCareer }}</span>
            }
          </div>

          <!-- Title (2 lines clamp) -->
          <h3 class="text-xs sm:text-[13px] font-bold text-white line-clamp-2 leading-snug group-hover:text-[var(--accent-lime)] transition-colors">
            {{ item.title }}
          </h3>
        </div>

        <!-- Rating & Sales / Tutor Info -->
        <div class="space-y-2 pt-1 border-t border-white/[0.06]">
          
          <!-- Rating Row (Stars + Solicitudes/Ventas) -->
          <div class="flex items-center justify-between text-[11px]">
            <div class="flex items-center gap-1">
              <!-- Star Icon -->
              <svg class="h-3.5 w-3.5 text-[var(--accent-lime)] fill-[var(--accent-lime)]" viewBox="0 0 24 24" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span class="font-bold text-white">{{ item.rating }}</span>
              <span class="text-neutral-500 font-mono">({{ item.reviewsCount }})</span>
            </div>

            <span class="text-[10px] text-neutral-400 font-medium">
              {{ item.salesCount }} {{ item.itemType === 'PRODUCT' ? 'pedidos' : 'asesorías' }}
            </span>
          </div>

          <!-- Emprendedor / Tutor Name & Price Bottom Row -->
          <div class="flex items-center justify-between pt-1">
            <!-- Price Display (Soles) -->
            <div class="flex items-baseline gap-1.5">
              <span class="text-sm sm:text-base font-black text-[var(--accent-lime)]">
                {{ item.price }}
              </span>
              @if (item.originalPrice) {
                <span class="text-[11px] text-neutral-500 line-through">
                  S/ {{ item.originalPrice.toFixed(2) }}
                </span>
              }
              <span class="text-[10px] text-neutral-400">
                {{ item.unit || '/ unidad' }}
              </span>
            </div>

            <!-- Quick Action Button -->
            <button
              type="button"
              (click)="$event.stopPropagation(); selectItem.emit(item)"
              [title]="item.itemType === 'PRODUCT' ? 'Ver producto y pedir' : 'Ver detalle y contactar'"
              class="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-white/[0.06] hover:bg-[var(--accent-lime)] hover:text-black text-white flex items-center justify-center transition border border-white/10 cursor-pointer shrink-0 shadow-sm"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>

        </div>

      </div>

    </article>
  `
})
export class MarketplaceCardComponent {
  @Input({ required: true }) item!: ServiceItem;
  @Output() selectItem = new EventEmitter<ServiceItem>();
}
