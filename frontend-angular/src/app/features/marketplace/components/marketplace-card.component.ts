import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ServiceItem } from '@domain/models/marketplace';

@Component({
  selector: 'app-marketplace-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <article 
      (click)="selectItem.emit(item)"
      class="group relative flex flex-col bg-[#0e0f13] hover:bg-[#14151b] border border-white/[0.08] hover:border-[var(--accent-lime)]/40 r-control-lg overflow-hidden transition duration-200 cursor-pointer text-left shadow-xl"
    >
      
      <!-- Card Image Aspect Square Frame -->
      <div class="relative aspect-square w-full bg-[#121318] flex items-center justify-center overflow-hidden">
        <img 
          [src]="item.imageUrl" 
          [alt]="item.title"
          (error)="onImgError($event)"
          loading="lazy"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
        />

        <!-- Top Badges Overlay -->
        @if (item.badge && item.badge !== item.condition) {
          <div class="absolute top-2.5 left-2.5 pointer-events-none">
            <span 
              class="px-2 py-0.5 r-control-xs text-[10px] font-extrabold tracking-wide uppercase shadow-sm"
              [ngClass]="item.badge === 'TOP TUTOR' || item.badge === 'MÁS SOLICITADO' || item.badge === 'ENTREGA HOY'
                ? 'bg-[var(--accent-lime)] text-black' 
                : 'bg-black/80 backdrop-blur-md text-white border border-white/10'"
            >
              {{ item.badge }}
            </span>
          </div>
        }

        <!-- Bottom Location / Course Pill Overlay -->
        @if (item.location || item.courseName) {
          <div class="absolute bottom-2 left-2 right-2 flex items-center pointer-events-none">
            <span class="px-2 py-0.5 r-control-xs text-[10px] font-medium bg-black/85 backdrop-blur-md text-neutral-300 border border-white/10 truncate max-w-full flex items-center gap-1">
              @if (item.location) {
                <lucide-icon name="map-pin" class="h-3 w-3 text-[var(--accent-lime)] shrink-0"></lucide-icon>
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
          <!-- Service / Product Type -->
          <div class="flex items-center justify-between text-[11px] text-neutral-400">
            <span class="font-medium text-neutral-300">{{ item.serviceType }}</span>
            @if (item.tutorCareer && item.category === 'TUTORING') {
              <span class="text-[10px] text-neutral-500 font-medium truncate max-w-[120px]">{{ item.tutorCareer }}</span>
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
              <lucide-icon name="star" class="h-3.5 w-3.5 text-[var(--accent-lime)] fill-[var(--accent-lime)]"></lucide-icon>
              <span class="font-bold text-white">{{ item.rating }}</span>
              <span class="text-neutral-500 font-medium">({{ item.reviewsCount }})</span>
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
              class="h-7 w-7 sm:h-8 sm:w-8 r-control-sm bg-white/[0.06] hover:bg-[var(--accent-lime)] hover:text-black text-white flex items-center justify-center transition border border-white/10 cursor-pointer shrink-0 shadow-sm"
            >
              <lucide-icon name="message-square" class="h-3.5 w-3.5"></lucide-icon>
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

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?q=80&w=600&auto=format&fit=crop';
    }
  }
}
