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
          [src]="item.thumbnailUrl || item.imageUrl" 
          [alt]="item.title"
          (error)="onImgError($event)"
          loading="lazy"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
        />

        <!-- Status Badges Overlay (Solo estados reales) -->
        @if (item.status && item.status !== 'AVAILABLE') {
          <div class="absolute top-2.5 left-2.5 pointer-events-none">
            <span 
              class="px-2 py-0.5 r-control-xs text-[10px] font-extrabold tracking-wide uppercase shadow-sm"
              [ngClass]="item.status === 'SOLD' ? 'bg-purple-600 text-white' : 'bg-yellow-500 text-black'"
            >
              {{ item.status === 'SOLD' ? 'VENDIDO' : 'APARTADO' }}
            </span>
          </div>
        }

        <!-- Bottom Location Pill Overlay -->
        @if (item.location) {
          <div class="absolute bottom-2 left-2 right-2 flex items-center pointer-events-none">
            <span class="px-2 py-0.5 r-control-xs text-[10px] font-medium bg-black/85 backdrop-blur-md text-neutral-300 border border-white/10 truncate max-w-full flex items-center gap-1">
              <lucide-icon name="map-pin" class="h-3 w-3 text-[var(--accent-lime)] shrink-0"></lucide-icon>
              <span>{{ item.location }}</span>
            </span>
          </div>
        }
      </div>

      <!-- Card Body Content (Solo datos reales) -->
      <div class="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
        
        <div class="space-y-1">
          <!-- Condition & Seller Name -->
          <div class="flex items-center justify-between text-[11px]">
            @if (item.condition) {
              <span class="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 r-control-sm">
                {{ item.condition }}
              </span>
            } @else {
              <span class="text-neutral-400">Campus UTP</span>
            }
            <span class="text-[11px] text-neutral-400 truncate max-w-[130px]">{{ item.tutorName }}</span>
          </div>

          <!-- Title (2 lines clamp) -->
          <h3 class="text-xs sm:text-[13px] font-bold text-white line-clamp-2 leading-snug group-hover:text-[var(--accent-lime)] transition-colors pt-0.5">
            {{ item.title }}
          </h3>
        </div>

        <!-- Real Price Row -->
        <div class="pt-2 border-t border-white/[0.06] flex items-baseline justify-between">
          <div class="flex items-baseline gap-1">
            <span class="text-sm sm:text-base font-black text-[var(--accent-lime)]">
              {{ item.price }}
            </span>
            @if (item.unit && item.unit !== '/ unidad') {
              <span class="text-[10px] text-neutral-400">
                {{ item.unit }}
              </span>
            }
          </div>
          <span class="text-[10px] text-neutral-500 font-medium group-hover:text-white transition-colors">
            Ver detalle →
          </span>
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
