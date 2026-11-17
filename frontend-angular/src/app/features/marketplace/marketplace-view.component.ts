import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ScheduleService } from '@data/services/schedule.service';
import { MarketplaceService } from '@data/services/marketplace.service';
import { getCachedStudentProfile } from '@data/syllabus/client-storage';
import { ServiceItem, ServiceFilter, ServiceCategory, ServiceSortBy, MarketplaceType } from '@domain/models/marketplace';
import { MarketplaceCardComponent } from './components/marketplace-card.component';
import { MarketplaceFiltersComponent } from './components/marketplace-filters.component';
import { MarketplaceStore } from './marketplace.store';

@Component({
  selector: 'app-marketplace-view',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    LucideAngularModule,
    MarketplaceCardComponent, 
    MarketplaceFiltersComponent
  ],
  template: `
    <div class="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-start gap-6 text-white font-sans text-left relative">
      
      <!-- ===================================================================== -->
      <!-- CENTER CONTINUOUS COLUMN (Elevated Dark Marketplace Stream)           -->
      <!-- ===================================================================== -->
      <main class="w-full flex-1 border border-white/[0.08] bg-[#0c0d10] r-card overflow-hidden shadow-2xl min-h-screen">
        
        <!-- Sticky Top Channel Selector (Modern Segmented Pills) -->
        <div class="sticky top-0 z-20 bg-[#0c0d10]/90 backdrop-blur-md border-b border-white/[0.08] p-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            (click)="setCategory('ALL')"
            class="px-3.5 py-1.5 r-control-sm text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="filterSignal().category === 'ALL' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Todo
          </button>

          <button
            (click)="setCategory('SNACKS_FOOD')"
            class="px-3.5 py-1.5 r-control-sm text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="filterSignal().category === 'SNACKS_FOOD' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Comida & Snacks
          </button>

          <button
            (click)="setCategory('CLOTHING_THRIFT')"
            class="px-3.5 py-1.5 r-control-sm text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="filterSignal().category === 'CLOTHING_THRIFT' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Ropa Thrift
          </button>

          <button
            (click)="setCategory('SECOND_HAND_TECH')"
            class="px-3.5 py-1.5 r-control-sm text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="filterSignal().category === 'SECOND_HAND_TECH' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Tech Seminuevo
          </button>

          <button
            (click)="setCategory('TUTORING')"
            class="px-3.5 py-1.5 r-control-sm text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="filterSignal().category === 'TUTORING' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Tutorías 1 a 1
          </button>

          <button
            (click)="setCategory('PRINTING_SUPPLIES')"
            class="px-3.5 py-1.5 r-control-sm text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="filterSignal().category === 'PRINTING_SUPPLIES' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Impresiones
          </button>
        </div>

        <!-- Mobile Search & Filter Toolbar (< lg screens) -->
        <div class="block lg:hidden p-3 border-b border-white/[0.08]">
          <app-marketplace-filters
            [filter]="filterSignal()"
            [courses]="enrolledCourses"
            (filterChange)="onFilterChange($event)"
          />
        </div>

        <!-- Top Action / Publish Header Bar -->
        <div class="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
          <div>
            <h2 class="text-sm sm:text-base font-bold text-white">Marketplace & Emprendimientos UTP</h2>
            <p class="text-xs text-neutral-400">Comercio directo y seguro entre estudiantes de campus</p>
          </div>

          <button 
            (click)="isOfferModalOpen = true"
            class="px-4 py-1.5 r-control-sm bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-black font-extrabold text-xs transition border-none cursor-pointer shadow-md"
          >
            + Publicar
          </button>
        </div>

        <!-- Products & Services Grid Container -->
        <div>
          @if (filteredItems().length === 0) {
            <div class="p-12 text-center space-y-2">
              <p class="text-sm font-bold text-white">No hay publicaciones disponibles</p>
              <p class="text-xs text-neutral-500">Prueba cambiando los filtros o sé el primero en publicar un producto o asesoría.</p>
              <button 
                (click)="resetFilters()"
                class="px-4 py-1.5 r-control-sm bg-white text-black font-bold text-xs border-none cursor-pointer mt-2"
              >
                Limpiar filtros
              </button>
            </div>
          } @else {
            <div class="p-3.5 sm:p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              @for (item of filteredItems(); track item.id) {
                <app-marketplace-card
                  [item]="item"
                  (selectItem)="selectedItem = $event"
                />
              }
            </div>
          }
        </div>

      </main>

      <!-- ===================================================================== -->
      <!-- RIGHT STICKY SIDEBAR (Elevated Fixed Filters)                         -->
      <!-- ===================================================================== -->
      <aside class="hidden lg:block w-[320px] shrink-0 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar">
        <app-marketplace-filters
          [filter]="filterSignal()"
          [courses]="enrolledCourses"
          (filterChange)="onFilterChange($event)"
        />
      </aside>

      <!-- ===================================================================== -->
      <!-- ITEM DETAIL & CONTACT MODAL                                           -->
      <!-- ===================================================================== -->
      @if (selectedItem) {
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          (click)="selectedItem = null"
        >
          <div 
            class="relative flex flex-col md:flex-row w-full max-w-3xl r-control-sm bg-[#0c0d10] text-white shadow-2xl border border-white/[0.08] overflow-hidden max-h-[90vh] text-left"
            (click)="$event.stopPropagation()"
          >
            <!-- Left Modal Image Frame -->
            <div class="md:w-5/12 bg-[#08090b] relative flex items-center justify-center overflow-hidden">
              <img 
                [src]="selectedItem.imageUrl" 
                [alt]="selectedItem.title"
                class="w-full h-48 md:h-full object-cover"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden"></div>
              
              @if (selectedItem.badge) {
                <span class="absolute top-4 left-4 px-2.5 py-1 r-control-md text-[10px] font-extrabold bg-[var(--accent-lime)] text-black uppercase tracking-wider shadow-md">
                  {{ selectedItem.badge }}
                </span>
              }
            </div>

            <!-- Right Modal Details Form & Info -->
            <div class="md:w-7/12 p-6 space-y-4 overflow-y-auto no-scrollbar flex flex-col justify-between">
              
              <div class="space-y-3">
                <!-- Header -->
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <span class="px-2.5 py-0.5 r-control-md text-[10px] font-semibold bg-white/10 text-neutral-300">
                      {{ selectedItem.serviceType }}
                    </span>
                    @if (selectedItem.condition) {
                      <span class="ml-1 px-2.5 py-0.5 r-control-md text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        {{ selectedItem.condition }}
                      </span>
                    }
                    @if (selectedItem.location) {
                      <span class="ml-1 text-xs text-[var(--accent-lime)] font-medium inline-flex items-center gap-1">
                        • <lucide-icon name="map-pin" class="h-3 w-3 inline text-[var(--accent-lime)]"></lucide-icon> {{ selectedItem.location }}
                      </span>
                    } @else if (selectedItem.courseName) {
                      <span class="ml-1 text-xs text-neutral-400 font-medium">
                        • {{ selectedItem.courseName }}
                      </span>
                    }
                  </div>

                  <button 
                    (click)="selectedItem = null" 
                    class="h-7 w-7 r-control-sm bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white border-none cursor-pointer"
                  >
                    <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
                  </button>
                </div>

                <h2 class="text-base sm:text-lg font-bold text-white leading-snug">
                  {{ selectedItem.title }}
                </h2>

                <!-- Rating and Seller Snapshot -->
                <div class="flex items-center justify-between p-3 r-card bg-[#14151a] border border-white/[0.08]">
                  <div class="flex items-center gap-2.5">
                    <div class="h-9 w-9 r-panel bg-[#181920] border border-white/10 flex items-center justify-center text-xs font-bold text-[var(--accent-lime)]">
                      {{ selectedItem.tutorName.charAt(0) }}
                    </div>
                    <div>
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold text-white">{{ selectedItem.tutorName }}</span>
                        <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 r-control-sm font-medium">Estudiante UTP</span>
                      </div>
                      <span class="text-[11px] text-neutral-400 block">{{ selectedItem.tutorCareer }} • Ciclo {{ selectedItem.tutorCycle }}</span>
                    </div>
                  </div>

                  <div class="text-right">
                    <div class="flex items-center gap-1 text-xs font-bold text-white">
                      <lucide-icon name="star" class="h-3.5 w-3.5 text-[var(--accent-lime)] fill-[var(--accent-lime)]"></lucide-icon>
                      <span>{{ selectedItem.rating }}</span>
                    </div>
                    <span class="text-[10px] text-neutral-500">{{ selectedItem.salesCount }} pedidos / ventas</span>
                  </div>
                </div>

                <!-- Description -->
                <div class="space-y-1 text-xs text-neutral-300 leading-relaxed">
                  <p>{{ selectedItem.description }}</p>
                </div>

                <!-- Highlights / Specs -->
                @if (selectedItem.highlights && selectedItem.highlights.length > 0) {
                  <div class="space-y-1.5 pt-1">
                    <span class="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Detalles & Estado:</span>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-neutral-200">
                      @for (hl of selectedItem.highlights; track hl) {
                        <div class="flex items-center gap-1.5">
                          <lucide-icon name="check" class="h-3.5 w-3.5 text-[var(--accent-lime)] shrink-0 stroke-[2.5]"></lucide-icon>
                          <span class="truncate">{{ hl }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Tags -->
                @if (selectedItem.tags && selectedItem.tags.length > 0) {
                  <div class="flex flex-wrap gap-1.5 pt-1">
                    @for (t of selectedItem.tags; track t) {
                      <span class="text-[11px] text-[var(--accent-lime)] bg-[var(--accent-lime)]/10 px-2 py-0.5 r-control-md border border-[var(--accent-lime)]/20 font-medium">
                        #{{ t }}
                      </span>
                    }
                  </div>
                }

                <!-- Institutional Contact & Delivery -->
                <div class="p-3 r-panel bg-white/[0.03] border border-white/10 space-y-1 text-xs">
                  <span class="text-[11px] text-neutral-400 block font-medium">Punto de Entrega & Contacto:</span>
                  <p class="font-medium text-white text-xs select-all">{{ selectedItem.contactMethod }}</p>
                </div>

              </div>

              <!-- Price & Order Action Row -->
              <div class="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
                <div>
                  <span class="text-[11px] text-neutral-500 block">Precio Estudiantil</span>
                  <div class="flex items-baseline gap-1.5">
                    <span class="text-xl font-black text-[var(--accent-lime)]">{{ selectedItem.price }}</span>
                    @if (selectedItem.originalPrice) {
                      <span class="text-xs text-neutral-500 line-through">S/ {{ selectedItem.originalPrice.toFixed(2) }}</span>
                    }
                    <span class="text-xs text-neutral-400">{{ selectedItem.unit || '/ unidad' }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button 
                    (click)="selectedItem = null" 
                    class="px-3.5 py-2.5 r-control-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs border-none cursor-pointer transition"
                  >
                    Cerrar
                  </button>
                  @if (isMyListing(selectedItem)) {
                    <div class="flex items-center gap-1.5">
                      @if (selectedItem.itemType === 'SERVICE') {
                        @if (selectedItem.status === 'PAUSED') {
                          <button 
                            (click)="changeStatus(selectedItem, 'AVAILABLE')" 
                            class="px-2.5 py-2 r-control-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/20 cursor-pointer"
                          >
                            Reanudar
                          </button>
                        } @else {
                          <button 
                            (click)="changeStatus(selectedItem, 'PAUSED')" 
                            class="px-2.5 py-2 r-control-md bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 font-bold text-xs border border-yellow-500/20 cursor-pointer"
                          >
                            Pausar
                          </button>
                        }
                      } @else {
                        @if (selectedItem.status === 'AVAILABLE') {
                          <button 
                            (click)="changeStatus(selectedItem, 'RESERVED')" 
                            class="px-2.5 py-2 r-control-md bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 font-bold text-xs border border-yellow-500/20 cursor-pointer"
                          >
                            Apartar
                          </button>
                          <button 
                            (click)="changeStatus(selectedItem, 'SOLD')" 
                            class="px-2.5 py-2 r-control-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold text-xs border border-purple-500/20 cursor-pointer"
                          >
                            Vendido
                          </button>
                        } @else if (selectedItem.status === 'RESERVED') {
                          <button 
                            (click)="changeStatus(selectedItem, 'AVAILABLE')" 
                            class="px-2.5 py-2 r-control-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/20 cursor-pointer"
                          >
                            Liberar
                          </button>
                          <button 
                            (click)="changeStatus(selectedItem, 'SOLD')" 
                            class="px-2.5 py-2 r-control-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold text-xs border border-purple-500/20 cursor-pointer"
                          >
                            Vendido
                          </button>
                        }
                      }
                      <button 
                        (click)="deleteOffer(selectedItem)" 
                        class="px-2.5 py-2 r-control-md bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold text-xs border border-red-500/20 cursor-pointer transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  } @else {
                    <button 
                      (click)="contactSeller(selectedItem)" 
                      class="px-5 py-2.5 r-control-lg bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-black font-extrabold text-xs border-none cursor-pointer transition shadow-lg"
                    >
                      {{ selectedItem.itemType === 'PRODUCT' ? 'Pedir / Contactar' : 'Coordinar Asesoría' }}
                    </button>
                  }
                </div>
              </div>

            </div>

          </div>
        </div>
      }

      <!-- ===================================================================== -->
      <!-- PUBLISH / OFFER ITEM MODAL                                            -->
      <!-- ===================================================================== -->
      @if (isOfferModalOpen) {
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          (click)="isOfferModalOpen = false"
        >
          <div 
            class="relative flex flex-col w-full max-w-xl r-control-lg bg-[#0c0d10] text-white p-6 shadow-2xl border border-white/[0.08] space-y-4 text-left max-h-[90vh] overflow-y-auto no-scrollbar"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 class="text-base font-bold text-white">Publicar en el Marketplace UTP</h3>
                <p class="text-xs text-neutral-400">Ofrece comida casera, ropa, tecnología seminueva o tutorías a tus compañeros.</p>
              </div>
              <button (click)="isOfferModalOpen = false" class="h-8 w-8 r-control-md bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white border-none cursor-pointer">
                <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
              </button>
            </div>

            <div class="space-y-3">
              
              <!-- Category Selector -->
              <div class="space-y-1">
                <label class="block text-xs font-bold text-neutral-300">Categoría</label>
                <select [(ngModel)]="newOffer.category" class="w-full bg-[#14151a] border border-white/[0.08] focus:border-[var(--accent-lime)] r-control-lg px-3.5 py-2.5 text-xs text-white outline-none">
                  <option value="SNACKS_FOOD">Comida, Snacks & Postres de Campus</option>
                  <option value="CLOTHING_THRIFT">Ropa, Hoodies & Moda de Segunda Mano</option>
                  <option value="SECOND_HAND_TECH">Tecnología & Hardware Seminuevo (Mouse, Teclados, Laptops)</option>
                  <option value="TECH_GADGETS">USBs, Cables & Gadgets Nuevos</option>
                  <option value="PRINTING_SUPPLIES">Impresiones, Anillados & Útiles</option>
                  <option value="TUTORING">Tutoría 1 a 1</option>
                  <option value="EXAM_PREP">Preparación para Exámenes (PC/Final)</option>
                  <option value="PROJECT_HELP">Asesoría de Proyectos / RSL</option>
                </select>
              </div>

              <!-- Title -->
              <div class="space-y-1">
                <label class="block text-xs font-bold text-neutral-300">Título de la Publicación</label>
                <input type="text" [(ngModel)]="newOffer.title" placeholder="Ej: Hoodie Oversized Negro Talla M / Mouse Logitech G305 / Brownies" class="w-full bg-[#14151a] border border-white/[0.08] r-control-lg px-3.5 py-2.5 text-xs text-white outline-none focus:border-[var(--accent-lime)]" />
              </div>

              <!-- Condition & Location -->
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="block text-xs font-bold text-neutral-300">Estado / Condición</label>
                  <select [(ngModel)]="newOffer.condition" class="w-full bg-[#14151a] border border-white/[0.08] r-control-lg px-3.5 py-2.5 text-xs text-white outline-none">
                    <option value="NUEVO">Nuevo / En empaque</option>
                    <option value="SEMINUEVO 9.5/10">Seminuevo 9.5/10</option>
                    <option value="SEMINUEVO 9/10">Seminuevo 9/10</option>
                    <option value="CASERO / DEL DÍA">Casero / Del día (Comida)</option>
                    <option value="USADO - BUEN ESTADO">Usado - Buen estado</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="block text-xs font-bold text-neutral-300">Punto de Entrega</label>
                  <input type="text" [(ngModel)]="newOffer.location" placeholder="Ej: Torre A - Piso 3" class="w-full bg-[#14151a] border border-white/[0.08] r-control-lg px-3.5 py-2.5 text-xs text-white outline-none focus:border-[var(--accent-lime)]" />
                </div>
              </div>

              <!-- Price & Unit -->
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="block text-xs font-bold text-neutral-300">Precio en Soles (S/)</label>
                  <input type="number" [(ngModel)]="newOffer.numericPrice" placeholder="45.00" class="w-full bg-[#14151a] border border-white/[0.08] r-control-lg px-3.5 py-2.5 text-xs text-white outline-none focus:border-[var(--accent-lime)]" />
                </div>
                <div class="space-y-1">
                  <label class="block text-xs font-bold text-neutral-300">Unidad</label>
                  <select [(ngModel)]="newOffer.unit" class="w-full bg-[#14151a] border border-white/[0.08] r-control-lg px-3.5 py-2.5 text-xs text-white outline-none">
                    <option value="/ prenda">Por prenda</option>
                    <option value="/ unidad">Por unidad</option>
                    <option value="/ porción">Por porción</option>
                    <option value="/ pack">Por pack</option>
                    <option value="/ hora">Por hora (Tutoría)</option>
                    <option value="/ sesión">Por sesión</option>
                  </select>
                </div>
              </div>

              <!-- Description -->
              <div class="space-y-1">
                <label class="block text-xs font-bold text-neutral-300">Descripción & Detalles (Talla, modelo, especificaciones)</label>
                <textarea [(ngModel)]="newOffer.description" rows="3" placeholder="Describe estado, tiempo de uso, especificaciones o ingredientes..." class="w-full bg-[#14151a] border border-white/[0.08] r-control-lg p-3 text-xs text-white outline-none focus:border-[var(--accent-lime)] resize-none"></textarea>
              </div>

              <!-- Image URL -->
              <div class="space-y-1">
                <label class="block text-xs font-bold text-neutral-300">Enlace de Foto del Producto / Servicio (Opcional)</label>
                <input type="url" [(ngModel)]="newOffer.imageUrl" placeholder="https://images.unsplash.com/..." class="w-full bg-[#14151a] border border-white/[0.08] r-control-lg px-3.5 py-2.5 text-xs text-white outline-none focus:border-[var(--accent-lime)]" />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button (click)="isOfferModalOpen = false" class="px-4 py-2.5 r-control-lg bg-white/10 hover:bg-white/15 text-white font-bold text-xs border-none cursor-pointer">
                Cancelar
              </button>
              <button (click)="publishNewOffer()" [disabled]="!newOffer.title.trim() || !newOffer.numericPrice" class="px-5 py-2.5 r-control-lg bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] disabled:opacity-30 text-black font-extrabold text-xs border-none cursor-pointer">
                Publicar en Marketplace
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class MarketplaceViewComponent implements OnInit {
  private readonly scheduleService = inject(ScheduleService);
  private readonly marketplaceService = inject(MarketplaceService);
  readonly marketplaceStore = inject(MarketplaceStore);

  readonly filterSignal = this.marketplaceStore.filterSignal;
  readonly filteredItems = this.marketplaceStore.filteredItems;

  isOfferModalOpen = false;
  selectedItem: ServiceItem | null = null;

  newOffer = {
    category: 'CLOTHING_THRIFT' as ServiceCategory,
    title: '',
    numericPrice: 45.00,
    unit: '/ prenda',
    condition: 'SEMINUEVO 9/10',
    location: 'Torre A - Piso 3',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop'
  };

  ngOnInit(): void {
    this.marketplaceStore.loadItems();
  }

  get hasActiveFilters(): boolean {
    const f = this.filterSignal();
    return (
      f.category !== 'ALL' ||
      f.courseName !== 'ALL' ||
      !!f.searchQuery.trim() ||
      f.sortBy !== 'POPULAR'
    );
  }

  get enrolledCourses(): string[] {
    const interval = this.scheduleService.currentInterval();
    const list = Array.from(new Set(
      (interval?.events || []).map(e => e.metadata?.courseName || e.title)
    ));
    return list.length > 0 ? list : [
      'Desarrollo Web Integrado',
      'Servicios Cloud',
      'Gestión del Servicio TI',
      'Formación para la Investigación - Sistemas',
      'Lenguajes de Programación',
      'Herramientas para la Comunicación Efectiva'
    ];
  }

  setCategory(cat: ServiceCategory | 'ALL'): void {
    this.marketplaceStore.setCategory(cat);
  }

  onFilterChange(partial: Partial<ServiceFilter>): void {
    this.marketplaceStore.updateFilter(partial);
  }

  resetFilters(): void {
    this.marketplaceStore.resetFilters();
  }

  contactSeller(item: ServiceItem): void {
    this.marketplaceService.getContactHandshake(item.id).subscribe(handshake => {
      if (handshake && handshake.teamsUrl) {
        window.open(handshake.teamsUrl, '_blank');
      } else if (item.contactMethod.includes('teams.microsoft.com')) {
        window.open(item.contactMethod, '_blank');
      } else if (item.contactMethod.includes('@utp.edu.pe')) {
        const email = item.contactMethod.match(/u\d+@utp\.edu\.pe/)?.[0] || item.contactMethod;
        window.open(`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`, '_blank');
      } else {
        navigator.clipboard?.writeText(item.contactMethod);
        alert(`Información de contacto copiada:\n${item.contactMethod}`);
      }
    });
  }

  changeStatus(item: ServiceItem, newStatus: string): void {
    this.marketplaceService.updateStatus(item.id, newStatus).subscribe(updated => {
      if (updated) {
        item.status = updated.status;
        this.selectedItem = updated;
        this.marketplaceStore.loadItems();
      }
    });
  }

  publishNewOffer(): void {
    if (!this.newOffer.title.trim() || !this.newOffer.numericPrice) return;
    
    const isFood = this.newOffer.category === 'SNACKS_FOOD';
    const isCloth = this.newOffer.category === 'CLOTHING_THRIFT';
    const isTech = this.newOffer.category === 'TECH_GADGETS' || this.newOffer.category === 'SECOND_HAND_TECH';

    const defaultImg = isFood 
      ? 'https://images.unsplash.com/photo-1515037893149-de7f840978e2?q=80&w=600&auto=format&fit=crop'
      : isCloth
      ? 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop'
      : 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=600&auto=format&fit=crop';

    const itemType: MarketplaceType = (isFood || isCloth || isTech) ? 'PRODUCT' : 'SERVICE';

    const student = getCachedStudentProfile();
    const contactEmail = student?.studentCode ? `${student.studentCode}@utp.edu.pe` : 'estudiante@utp.edu.pe';

    const payload = {
      itemType,
      category: this.newOffer.category,
      serviceType: 'Emprendimiento UTP',
      condition: this.newOffer.condition,
      numericPrice: this.newOffer.numericPrice,
      unit: this.newOffer.unit,
      location: this.newOffer.location.trim() || 'Campus UTP',
      title: this.newOffer.title.trim(),
      description: this.newOffer.description.trim() || 'Publicación en el marketplace estudiantil UTP.',
      imageUrl: this.newOffer.imageUrl || defaultImg,
      contactMethod: `Punto de entrega: ${this.newOffer.location} • Teams: ${contactEmail}`,
      tutorName: student?.fullName || student?.name || student?.studentCode || 'Estudiante UTP',
      tutorCareer: student?.career || '',
      tutorCycle: student?.currentCycle ?? 1
    };

    this.marketplaceService.publishItem(payload).subscribe(savedItem => {
      if (savedItem) {
        this.marketplaceStore.addItem(savedItem);
      } else {
        const fallbackItem: ServiceItem = {
          id: `m-${Date.now()}`,
          itemType,
          category: payload.category,
          serviceType: payload.serviceType,
          condition: payload.condition,
          numericPrice: payload.numericPrice,
          price: `S/ ${payload.numericPrice.toFixed(2)}`,
          unit: payload.unit,
          location: payload.location,
          title: payload.title,
          description: payload.description,
          imageUrl: payload.imageUrl,
          badge: 'NUEVO EN CAMPUS',
          rating: 5.0,
          reviewsCount: 1,
          salesCount: 1,
          tutorName: payload.tutorName,
          tutorCareer: payload.tutorCareer,
          tutorCycle: payload.tutorCycle,
          reputation: 100,
          tags: ['UTP', 'Emprendimiento', 'Campus', 'Venta'],
          contactMethod: payload.contactMethod,
          highlights: ['Producto verificado por estudiante', 'Entrega directa y trato en mano en campus']
        };
        this.marketplaceStore.addItem(fallbackItem);
      }
    });

    this.isOfferModalOpen = false;
    this.newOffer.title = '';
    this.newOffer.description = '';
  }

  isMyListing(item: ServiceItem): boolean {
    const student = getCachedStudentProfile();
    const myCode = (student?.studentCode || student?.username || '').toUpperCase();
    return !!myCode && (
      (item.tutorName || '').toUpperCase().includes(myCode) ||
      (item.contactMethod || '').toUpperCase().includes(myCode)
    );
  }

  deleteOffer(item: ServiceItem): void {
    if (!confirm('¿Estás seguro de que deseas eliminar esta publicación del Marketplace?')) return;
    this.marketplaceService.deleteItem(item.id).subscribe(ok => {
      this.marketplaceStore.removeItem(item.id);
      this.selectedItem = null;
    });
  }
}

