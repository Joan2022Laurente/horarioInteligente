import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '@data/services/schedule.service';
import { MarketplaceService } from '@data/services/marketplace.service';
import { getCachedStudentProfile } from '@data/syllabus/client-storage';
import { ServiceItem, ServiceFilter, ServiceCategory, ServiceSortBy, MarketplaceType } from '@domain/models/marketplace';
import { MarketplaceCardComponent } from './components/marketplace-card.component';
import { MarketplaceFiltersComponent } from './components/marketplace-filters.component';

@Component({
  selector: 'app-marketplace-view',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MarketplaceCardComponent, 
    MarketplaceFiltersComponent
  ],
  template: `
    <div class="max-w-[1020px] mx-auto w-full flex flex-col md:flex-row justify-center items-start gap-6 text-white font-sans text-left relative">
      
      <!-- ===================================================================== -->
      <!-- CENTER CONTINUOUS COLUMN (Elevated Dark Marketplace Stream)           -->
      <!-- ===================================================================== -->
      <main class="w-full md:max-w-[600px] flex-1 border border-white/[0.08] bg-[#0c0d10] rounded-3xl overflow-hidden shadow-2xl min-h-screen">
        
        <!-- Sticky Top Channel Selector (Modern Segmented Pills) -->
        <div class="sticky top-0 z-20 bg-[#0c0d10]/90 backdrop-blur-md border-b border-white/[0.08] p-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            (click)="setCategory('ALL')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="filterSignal().category === 'ALL' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Todo
          </button>

          <button
            (click)="setCategory('SNACKS_FOOD')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="filterSignal().category === 'SNACKS_FOOD' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Comida & Snacks
          </button>

          <button
            (click)="setCategory('CLOTHING_THRIFT')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="filterSignal().category === 'CLOTHING_THRIFT' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Ropa Thrift
          </button>

          <button
            (click)="setCategory('SECOND_HAND_TECH')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="filterSignal().category === 'SECOND_HAND_TECH' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Tech Seminuevo
          </button>

          <button
            (click)="setCategory('TUTORING')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="filterSignal().category === 'TUTORING' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Tutorías 1 a 1
          </button>

          <button
            (click)="setCategory('PRINTING_SUPPLIES')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="filterSignal().category === 'PRINTING_SUPPLIES' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Impresiones
          </button>
        </div>

        <!-- Mobile Search & Filter Toolbar (< md screens) -->
        <div class="block md:hidden p-3 border-b border-white/[0.08]">
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
            class="px-4 py-1.5 rounded-xl bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-black font-extrabold text-xs transition border-none cursor-pointer shadow-md"
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
                class="px-4 py-1.5 rounded-xl bg-white text-black font-bold text-xs border-none cursor-pointer mt-2"
              >
                Limpiar filtros
              </button>
            </div>
          } @else {
            <div class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
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
      <!-- RIGHT STICKY SIDEBAR (X Style Fixed Sidebar)                          -->
      <!-- ===================================================================== -->
      <aside class="hidden md:block w-[320px] shrink-0 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar">
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
            class="relative flex flex-col md:flex-row w-full max-w-3xl rounded-3xl bg-[#0c0d10] text-white shadow-2xl border border-white/[0.08] overflow-hidden max-h-[90vh] text-left"
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
                <span class="absolute top-4 left-4 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-[var(--accent-lime)] text-black uppercase tracking-wider shadow-md">
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
                    <span class="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-white/10 text-neutral-300">
                      {{ selectedItem.serviceType }}
                    </span>
                    @if (selectedItem.condition) {
                      <span class="ml-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        {{ selectedItem.condition }}
                      </span>
                    }
                    @if (selectedItem.location) {
                      <span class="ml-1 text-xs text-[var(--accent-lime)] font-medium">
                        • 📍 {{ selectedItem.location }}
                      </span>
                    } @else if (selectedItem.courseName) {
                      <span class="ml-1 text-xs text-neutral-400 font-medium">
                        • {{ selectedItem.courseName }}
                      </span>
                    }
                  </div>

                  <button 
                    (click)="selectedItem = null" 
                    class="h-7 w-7 rounded-xl bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white border-none cursor-pointer"
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>

                <h2 class="text-base sm:text-lg font-bold text-white leading-snug">
                  {{ selectedItem.title }}
                </h2>

                <!-- Rating and Seller Snapshot -->
                <div class="flex items-center justify-between p-3 rounded-2xl bg-[#14151a] border border-white/[0.08]">
                  <div class="flex items-center gap-2.5">
                    <div class="h-9 w-9 rounded-xl bg-[#181920] border border-white/10 flex items-center justify-center text-xs font-bold text-[var(--accent-lime)]">
                      {{ selectedItem.tutorName.charAt(0) }}
                    </div>
                    <div>
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold text-white">{{ selectedItem.tutorName }}</span>
                        <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md font-medium">Estudiante UTP</span>
                      </div>
                      <span class="text-[11px] text-neutral-400 block">{{ selectedItem.tutorCareer }} • Ciclo {{ selectedItem.tutorCycle }}</span>
                    </div>
                  </div>

                  <div class="text-right">
                    <div class="flex items-center gap-1 text-xs font-bold text-white">
                      <svg class="h-3.5 w-3.5 text-[var(--accent-lime)] fill-[var(--accent-lime)]" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
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
                          <svg class="h-3.5 w-3.5 text-[var(--accent-lime)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
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
                      <span class="text-[11px] text-[var(--accent-lime)] bg-[var(--accent-lime)]/10 px-2 py-0.5 rounded-lg border border-[var(--accent-lime)]/20 font-mono">
                        #{{ t }}
                      </span>
                    }
                  </div>
                }

                <!-- Institutional Contact & Delivery -->
                <div class="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1 text-xs">
                  <span class="text-[11px] text-neutral-400 block font-medium">Punto de Entrega & Contacto:</span>
                  <p class="font-mono text-white text-xs select-all">{{ selectedItem.contactMethod }}</p>
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
                    class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border-none cursor-pointer transition"
                  >
                    Cerrar
                  </button>
                  <button 
                    (click)="contactSeller(selectedItem)" 
                    class="px-5 py-2.5 rounded-xl bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-black font-extrabold text-xs border-none cursor-pointer transition shadow-lg"
                  >
                    {{ selectedItem.itemType === 'PRODUCT' ? 'Pedir / Contactar' : 'Coordinar Asesoría' }}
                  </button>
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
            class="relative flex flex-col w-full max-w-xl rounded-3xl bg-[#0c0d10] text-white p-6 shadow-2xl border border-white/[0.08] space-y-4 text-left max-h-[90vh] overflow-y-auto no-scrollbar"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 class="text-base font-bold text-white">Publicar en el Marketplace UTP</h3>
                <p class="text-xs text-neutral-400">Ofrece comida casera, ropa, tecnología seminueva o tutorías a tus compañeros.</p>
              </div>
              <button (click)="isOfferModalOpen = false" class="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white border-none cursor-pointer">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div class="space-y-3">
              
              <!-- Category Selector -->
              <div class="space-y-1">
                <label class="block text-xs font-bold text-neutral-300">Categoría</label>
                <select [(ngModel)]="newOffer.category" class="w-full bg-[#14151a] border border-white/[0.08] focus:border-[var(--accent-lime)] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none">
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
                <input type="text" [(ngModel)]="newOffer.title" placeholder="Ej: Hoodie Oversized Negro Talla M / Mouse Logitech G305 / Brownies" class="w-full bg-[#14151a] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[var(--accent-lime)]" />
              </div>

              <!-- Condition & Location -->
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="block text-xs font-bold text-neutral-300">Estado / Condición</label>
                  <select [(ngModel)]="newOffer.condition" class="w-full bg-[#14151a] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none">
                    <option value="NUEVO">Nuevo / En empaque</option>
                    <option value="SEMINUEVO 9.5/10">Seminuevo 9.5/10</option>
                    <option value="SEMINUEVO 9/10">Seminuevo 9/10</option>
                    <option value="CASERO / DEL DÍA">Casero / Del día (Comida)</option>
                    <option value="USADO - BUEN ESTADO">Usado - Buen estado</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="block text-xs font-bold text-neutral-300">Punto de Entrega</label>
                  <input type="text" [(ngModel)]="newOffer.location" placeholder="Ej: Torre A - Piso 3" class="w-full bg-[#14151a] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[var(--accent-lime)]" />
                </div>
              </div>

              <!-- Price & Unit -->
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="block text-xs font-bold text-neutral-300">Precio en Soles (S/)</label>
                  <input type="number" [(ngModel)]="newOffer.numericPrice" placeholder="45.00" class="w-full bg-[#14151a] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[var(--accent-lime)]" />
                </div>
                <div class="space-y-1">
                  <label class="block text-xs font-bold text-neutral-300">Unidad</label>
                  <select [(ngModel)]="newOffer.unit" class="w-full bg-[#14151a] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none">
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
                <textarea [(ngModel)]="newOffer.description" rows="3" placeholder="Describe estado, tiempo de uso, especificaciones o ingredientes..." class="w-full bg-[#14151a] border border-white/[0.08] rounded-xl p-3 text-xs text-white outline-none focus:border-[var(--accent-lime)] resize-none"></textarea>
              </div>

              <!-- Image URL -->
              <div class="space-y-1">
                <label class="block text-xs font-bold text-neutral-300">Enlace de Foto del Producto / Servicio (Opcional)</label>
                <input type="url" [(ngModel)]="newOffer.imageUrl" placeholder="https://images.unsplash.com/..." class="w-full bg-[#14151a] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[var(--accent-lime)]" />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button (click)="isOfferModalOpen = false" class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border-none cursor-pointer">
                Cancelar
              </button>
              <button (click)="publishNewOffer()" [disabled]="!newOffer.title.trim() || !newOffer.numericPrice" class="px-5 py-2.5 rounded-xl bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] disabled:opacity-30 text-black font-extrabold text-xs border-none cursor-pointer">
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
  private scheduleService = inject(ScheduleService);
  private marketplaceService = inject(MarketplaceService);

  ngOnInit(): void {
    this.marketplaceService.getItems().subscribe(items => {
      if (items && items.length > 0) {
        this.itemsSignal.set(items);
      }
    });
  }

  isOfferModalOpen = false;
  selectedItem: ServiceItem | null = null;

  filterSignal = signal<ServiceFilter>({
    category: 'ALL',
    searchQuery: '',
    courseName: 'ALL',
    sortBy: 'POPULAR'
  });

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

  itemsSignal = signal<ServiceItem[]>([
    // =========================================================================
    // 1. ROPA & MODA ESTUDIANTIL / SEGUNDA MANO (THRIFT)
    // =========================================================================
    {
      id: 'm-cloth-1',
      itemType: 'PRODUCT',
      category: 'CLOTHING_THRIFT',
      serviceType: 'Ropa & Hoodies',
      condition: 'SEMINUEVO 9/10',
      price: 'S/ 45.00',
      numericPrice: 45.00,
      originalPrice: 85.00,
      unit: '/ prenda',
      title: 'Hoodie Oversized Negro Unisex 100% Algodón con Capucha (Talla M)',
      description: 'Polera con capucha de corte oversized holgado, tela franela reactiva que no destiñe. Súper abrigadora para los salones y laboratorios de cómputo con aire acondicionado.',
      imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop',
      badge: 'THRIFT / RECOMENDADO',
      location: 'Torre A - Piso 3',
      rating: 4.95,
      reviewsCount: 24,
      salesCount: 18,
      tutorName: 'Nicole Salazar',
      tutorCareer: 'Ing. Industrial',
      tutorCycle: 4,
      reputation: 97,
      tags: ['Hoodie', 'Oversized', 'Ropa', 'Thrift', 'Invierno'],
      contactMethod: 'WhatsApp: 982145781 • Entrega directa en campus Torre A',
      highlights: ['Algodón franela 100% abrigador', 'Corte moderno oversized unisex', 'Estado impecable 9/10 sin bolitas', 'Lavado y desinfectado']
    },
    {
      id: 'm-cloth-2',
      itemType: 'PRODUCT',
      category: 'CLOTHING_THRIFT',
      serviceType: 'Casacas & Abrigo',
      condition: 'SEMINUEVO 9.5/10',
      price: 'S/ 55.00',
      numericPrice: 55.00,
      originalPrice: 95.00,
      unit: '/ prenda',
      title: 'Casaca Cortaviento Impermeable con Forro Polar Térmico (Talla L)',
      description: 'Ideal para quienes tienen clases en el turno noche o viajan en transporte público tarde. Bolsillos con cierre hermético para celular y billetera.',
      imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=600&auto=format&fit=crop',
      badge: 'OFERTA',
      location: 'Torre B - Hall Principal',
      rating: 4.90,
      reviewsCount: 19,
      salesCount: 15,
      tutorName: 'Martin Ramos',
      tutorCareer: 'Ing. Software',
      tutorCycle: 6,
      reputation: 95,
      tags: ['Casaca', 'Impermeable', 'TurnoNoche', 'Ropa'],
      contactMethod: 'WhatsApp: 976332145 • Prueba de talla en campus',
      highlights: ['Material impermeable repelente al agua', 'Forro polar interior suave', 'Cierres reforzados antirrobo', 'Excelente estado 9.5/10']
    },
    {
      id: 'm-cloth-3',
      itemType: 'PRODUCT',
      category: 'CLOTHING_THRIFT',
      serviceType: 'Mochilas & Accesorios',
      condition: 'COMO NUEVA',
      price: 'S/ 48.00',
      numericPrice: 48.00,
      originalPrice: 89.00,
      unit: '/ unidad',
      title: 'Mochila Antirrobo para Laptop 15.6" con Candado TSA y Puerto USB',
      description: 'Mochila acolchada ergonómica con bolsillo oculto trasero, compartimento acolchado para laptop de hasta 15.6 pulgadas y salida para cable de carga USB.',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600&auto=format&fit=crop',
      badge: 'MÁS SOLICITADO',
      location: 'Patio Central',
      rating: 4.98,
      reviewsCount: 33,
      salesCount: 22,
      tutorName: 'Andrea Vega',
      tutorCareer: 'Ing. Sistemas',
      tutorCycle: 5,
      reputation: 99,
      tags: ['Mochila', 'Laptop', 'Antirrobo', 'Accesorios'],
      contactMethod: 'Teams: u23108892@utp.edu.pe / WhatsApp: 994512789',
      highlights: ['Compartimento acolchado para laptop', 'Material repelente a salpicaduras', 'Puerto de carga USB externo', 'Uso de solo 1 mes']
    },

    // =========================================================================
    // 2. TECNOLOGÍA & HARDWARE DE SEGUNDA MANO (SEMINUEVOS)
    // =========================================================================
    {
      id: 'm-tech2-1',
      itemType: 'PRODUCT',
      category: 'SECOND_HAND_TECH',
      serviceType: 'Periféricos Seminuevos',
      condition: 'SEMINUEVO 9/10',
      price: 'S/ 85.00',
      numericPrice: 85.00,
      originalPrice: 140.00,
      unit: '/ unidad',
      title: 'Mouse Inalámbrico Gamer Logitech G305 Lightspeed (Sensor Hero 12K)',
      description: '100% operativo sin doble click, incluye receptor USB Lightspeed original y caja. Super ligero y preciso para programar y jugar. Funciona con una sola pila AA (incluida nueva).',
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=600&auto=format&fit=crop',
      badge: 'TOP GADGET',
      location: 'Torre A - Laboratorio 4',
      rating: 4.94,
      reviewsCount: 29,
      salesCount: 14,
      tutorName: 'Daniel Cordova',
      tutorCareer: 'Ing. Software',
      tutorCycle: 7,
      reputation: 98,
      tags: ['Logitech', 'Mouse', 'G305', 'Inalámbrico', 'Gaming'],
      contactMethod: 'WhatsApp: 993412567 • Se prueba en el laboratorio',
      highlights: ['Sensor óptico HERO 12,000 DPI', 'Latencia ultra baja de 1ms', 'Incluye pila Duracell nueva', 'Se entrega con caja y extensor']
    },
    {
      id: 'm-tech2-2',
      itemType: 'PRODUCT',
      category: 'SECOND_HAND_TECH',
      serviceType: 'Teclados Mecánicos',
      condition: 'SEMINUEVO 9/10',
      price: 'S/ 75.00',
      numericPrice: 75.00,
      originalPrice: 130.00,
      unit: '/ unidad',
      title: 'Teclado Mecánico Redragon Kumara K552 RGB Switch Blue (TKL)',
      description: 'Teclado compacto TKL (sin pad numérico) ideal para llevar en la mochila a la universidad. Switches mecánicos Outemu Blue táctiles y audibles. Limpiado tecla por tecla con alcohol isopropílico.',
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=600&auto=format&fit=crop',
      badge: 'OFERTA TECH',
      location: 'Torre B - Piso 3',
      rating: 4.88,
      reviewsCount: 21,
      salesCount: 16,
      tutorName: 'Franco Huaman',
      tutorCareer: 'Ing. Sistemas',
      tutorCycle: 6,
      reputation: 94,
      tags: ['Teclado', 'Redragon', 'Mecánico', 'RGB', 'SwitchBlue'],
      contactMethod: 'Teams: u22104512@utp.edu.pe • Prueba de tipeo en vivo',
      highlights: ['Switches mecánicos táctiles', 'Iluminación RGB configurable', 'Estructura metálica resistente', 'Incluye extractor de teclas']
    },
    {
      id: 'm-tech2-3',
      itemType: 'PRODUCT',
      category: 'SECOND_HAND_TECH',
      serviceType: 'Componentes de Laptop',
      condition: 'TESTEADO 100%',
      price: 'S/ 50.00',
      numericPrice: 50.00,
      originalPrice: 85.00,
      unit: '/ unidad',
      title: 'Memoria RAM Kingston Fury Impact 8GB DDR4 3200MHz SODIMM Laptop',
      description: 'Módulo de memoria RAM para laptop. Ideal para repotenciar tu máquina de 8GB a 16GB y correr Docker, Spring Boot y Android Studio sin lentitud. Testeada con MemTest86 cero errores.',
      imageUrl: 'https://images.unsplash.com/photo-1562976540-1502c2145186?q=80&w=600&auto=format&fit=crop',
      badge: 'REPOTENCIA TU LAPTOP',
      location: 'Torre A - Laboratorio 601',
      rating: 5.0,
      reviewsCount: 15,
      salesCount: 19,
      tutorName: 'Leonardo Paz',
      tutorCareer: 'Ing. Sistemas',
      tutorCycle: 8,
      reputation: 100,
      tags: ['RAM', 'DDR4', 'Laptop', 'Upgrade', 'Kingston'],
      contactMethod: 'WhatsApp: 981140921 • Ayudo a instalarla en tu laptop',
      highlights: ['Velocidad 3200MHz CL20', 'Compatible con Intel 10th-12th gen y AMD Ryzen', 'Instalación gratuita en campus', 'Garantía personal de prueba']
    },
    {
      id: 'm-tech-3',
      itemType: 'PRODUCT',
      category: 'SECOND_HAND_TECH',
      serviceType: 'Calculadoras & Útiles',
      condition: 'SEMINUEVA 9.5/10',
      price: 'S/ 65.00',
      numericPrice: 65.00,
      originalPrice: 95.00,
      unit: '/ unidad',
      title: 'Calculadora Científica Casio FX-991LAX ClassWiz con Panel Solar',
      description: 'En excelente estado estético 9.5/10 con su tapa protectora original y celda solar funcional. Ideal para Cálculo 1, 2, 3, Física y Estadística. Resuelve matrices 4x4 e integrales.',
      imageUrl: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?q=80&w=600&auto=format&fit=crop',
      badge: 'OFERTA ÚNICA',
      location: 'Torre A - Piso 2',
      rating: 4.88,
      reviewsCount: 16,
      salesCount: 12,
      tutorName: 'Alexis Castro',
      tutorCareer: 'Ing. Civil',
      tutorCycle: 5,
      reputation: 92,
      tags: ['Casio', 'Calculadora', 'ClassWiz', 'Cálculo', 'Física'],
      contactMethod: 'Teams: u23104992@utp.edu.pe',
      highlights: ['Resolución de matrices e integrales', 'Pantalla LCD de alta resolución', 'Batería + Celda Solar', 'Tapa rígida original']
    },

    // =========================================================================
    // 3. COMIDA, SNACKS & POSTRES CASEROS
    // =========================================================================
    {
      id: 'm-food-1',
      itemType: 'PRODUCT',
      category: 'SNACKS_FOOD',
      serviceType: 'Snacks & Postres',
      condition: 'CASERO / FRESCO',
      price: 'S/ 4.50',
      numericPrice: 4.50,
      originalPrice: 6.00,
      unit: '/ unidad',
      title: 'Brownies Artesanales de Chocolate con Fudge y Chispas',
      description: 'Hechos en casa con cacao al 70%, textura melcochosa, rellenos de fudge artesanal. Vienen en empaque individual sellado. ¡Perfectos para el break entre clases!',
      imageUrl: 'https://images.unsplash.com/photo-1515037893149-de7f840978e2?q=80&w=600&auto=format&fit=crop',
      badge: 'CASERO / FRESCO',
      location: 'Torre A - Piso 3 / Cafetería',
      rating: 4.96,
      reviewsCount: 52,
      salesCount: 88,
      tutorName: 'Sofia Ramirez',
      tutorCareer: 'Ing. Industrial',
      tutorCycle: 5,
      reputation: 98,
      tags: ['Brownies', 'Postres', 'Chocolate', 'Fresco', 'Break'],
      contactMethod: 'WhatsApp / Teams: 984512309 • Entrega inmediata en Torre A',
      highlights: ['Cacao 70% melcochoso', 'Empaque higiénico hermético', 'Entrega en 5 min en campus', 'Promo: 2 por S/ 8.00']
    },
    {
      id: 'm-food-2',
      itemType: 'PRODUCT',
      category: 'SNACKS_FOOD',
      serviceType: 'Comida de Campus',
      condition: 'DEL DÍA',
      price: 'S/ 6.00',
      numericPrice: 6.00,
      unit: '/ sandwich',
      title: 'Sandwich Triple de Pollo con Palta, Huevo y Mayonesa Casera',
      description: 'Pan de molde fresco con triple capa generosa: pechuga de pollo deshilachada, palta fuerte madura y huevo duro con receta casera. Se prepara en la mañana antes de venir a clases.',
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=600&auto=format&fit=crop',
      badge: 'ENTREGA HOY',
      location: 'Torre B - Hall Central',
      rating: 4.92,
      reviewsCount: 39,
      salesCount: 65,
      tutorName: 'Kevin Quispe',
      tutorCareer: 'Ing. Sistemas',
      tutorCycle: 4,
      reputation: 95,
      tags: ['Triples', 'Desayuno', 'PolloPalta', 'Almuerzo', 'Fresco'],
      contactMethod: 'WhatsApp: 971204891 • Pedidos hasta las 11:00 am',
      highlights: ['Ingredientes frescos del día', 'Táper ecológico incluido', 'Entrega rápida entre clases', 'Opciones con ají pollero']
    },
    {
      id: 'm-food-3',
      itemType: 'PRODUCT',
      category: 'SNACKS_FOOD',
      serviceType: 'Snacks Calientes',
      condition: 'DEL DÍA',
      price: 'S/ 5.00',
      numericPrice: 5.00,
      originalPrice: 6.50,
      unit: '/ porción',
      title: 'Empanadas de Carne al Horno con Masa Casera + Crema de Ají',
      description: 'Relleno de carne picada jugosa, cebolla caramelizada, aceituna y huevo duro. Masa crocante al horno (cero grasa de fritura). Servidas calientes desde lonchera térmica.',
      imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=600&auto=format&fit=crop',
      badge: 'MÁS VENDIDO',
      location: 'Patio Central / Puerta 1',
      rating: 4.88,
      reviewsCount: 44,
      salesCount: 74,
      tutorName: 'Camila Navarro',
      tutorCareer: 'Administración',
      tutorCycle: 6,
      reputation: 93,
      tags: ['Empanadas', 'Horno', 'Carne', 'AjíCasero'],
      contactMethod: 'WhatsApp: 963118945 • Entregas a partir de las 12:30 pm',
      highlights: ['Al horno sin exceso de grasa', 'Incluye crema de ají casero', 'Pack de 2 por S/ 9.00', 'Disponibles calientes']
    },

    // =========================================================================
    // 4. HARDWARE NUEVO & ACCESORIOS
    // =========================================================================
    {
      id: 'm-tech-1',
      itemType: 'PRODUCT',
      category: 'TECH_GADGETS',
      serviceType: 'Hardware & Almacenamiento',
      condition: 'NUEVO EN BLISTER',
      price: 'S/ 28.00',
      numericPrice: 28.00,
      originalPrice: 38.00,
      unit: '/ unidad',
      title: 'USB Kingston DataTraveler 64GB 3.2 con ISOs UTP + JDK & Herramientas',
      description: 'Memoria USB original de alta velocidad 3.2. Viene formateada y precargada con ISO booteable de Ubuntu 22.04 LTS / Windows 11, JDK 17 & 21, VS Code, Git, NetBeans y Docker.',
      imageUrl: 'https://images.unsplash.com/photo-1618761714958-0655d13a5935?q=80&w=600&auto=format&fit=crop',
      badge: 'STOCK HOY',
      location: 'Torre A - Laboratorio 602',
      rating: 4.95,
      reviewsCount: 61,
      salesCount: 82,
      tutorName: 'Diego Gomez',
      tutorCareer: 'Ing. Sistemas',
      tutorCycle: 6,
      reputation: 99,
      tags: ['USB', 'Kingston', 'ISOs', 'Linux', 'SoftwareUTP'],
      contactMethod: 'Teams: u22108744@utp.edu.pe / WhatsApp: 992341882',
      highlights: ['USB 3.2 Kingston Original', 'Precargado con IDEs y JDKs', 'Garantía directa de 6 meses', 'Booteo probado en laptops']
    },
    {
      id: 'm-tech-2',
      itemType: 'PRODUCT',
      category: 'TECH_GADGETS',
      serviceType: 'Adaptadores & Cables',
      condition: 'NUEVO EN CAJA',
      price: 'S/ 38.00',
      numericPrice: 38.00,
      originalPrice: 50.00,
      unit: '/ unidad',
      title: 'Adaptador HUB USB-C a HDMI 4K + 3x USB 3.0 + Carga PD 100W',
      description: 'El salvavidas para exposiciones en aulas UTP. Conecta tu laptop moderna (MacBook, Asus, Lenovo, HP) directamente a los proyectores HDMI del salón sin fallas de resolución.',
      imageUrl: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?q=80&w=600&auto=format&fit=crop',
      badge: 'POPULAR',
      location: 'Torre B - Piso 4',
      rating: 4.90,
      reviewsCount: 28,
      salesCount: 35,
      tutorName: 'Mateo Torres',
      tutorCareer: 'Ing. Software',
      tutorCycle: 7,
      reputation: 96,
      tags: ['HubUSBC', 'HDMI', 'Exposiciones', 'Laptops', 'Gadgets'],
      contactMethod: 'WhatsApp: 981140921 • Prueba en vivo antes de comprar',
      highlights: ['Salida HDMI 4K@30Hz / 1080p@60Hz', 'Carcasa de aluminio disipador', '3 puertos USB 3.0 rápidos', 'Compatible con Windows y Mac']
    },

    // =========================================================================
    // 5. IMPRESIONES & SERVICIOS EXPRESS
    // =========================================================================
    {
      id: 'm-print-1',
      itemType: 'SERVICE',
      category: 'PRINTING_SUPPLIES',
      serviceType: 'Impresiones & Copias',
      price: 'S/ 0.20',
      numericPrice: 0.20,
      unit: '/ hoja B/N',
      title: 'Impresiones Láser B/N y Color + Anillados Express Frente a Puerta 2',
      description: 'Evita las largas colas de la fotocopiadora. Envía tus PDFs, rúbricas o informes por WhatsApp con 15 minutos de anticipación y recógelos listos y anillados en la puerta del campus.',
      imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=600&auto=format&fit=crop',
      badge: 'SIN COLAS',
      location: 'Frente a Puerta 2 (Campus Lima Centro)',
      rating: 4.97,
      reviewsCount: 78,
      salesCount: 140,
      tutorName: 'Jose Mendoza',
      tutorCareer: 'Ing. Sistemas',
      tutorCycle: 7,
      reputation: 99,
      tags: ['Impresiones', 'Anillados', 'PDF', 'Puerta2', 'Express'],
      contactMethod: 'WhatsApp: 991245890 • Envía tu archivo en PDF',
      highlights: ['Impresión láser nítida 1200 DPI', 'Anillados con micas transparentes', 'Recojo en 5 minutos', 'B/N: S/ 0.20 • Color: S/ 0.60']
    },

    // =========================================================================
    // 6. TUTORÍAS ACADÉMICAS & ASESORÍAS
    // =========================================================================
    {
      id: 'm-tut-1',
      itemType: 'SERVICE',
      category: 'TUTORING',
      serviceType: 'Tutoría 1 a 1',
      price: 'S/ 25.00',
      numericPrice: 25.00,
      originalPrice: 35.00,
      unit: '/ hora',
      title: 'Preparación para PC1 y PC2: Desarrollo Web & Spring Boot 3',
      description: 'Dominio de arquitectura hexagonal, APIs REST, autenticación JWT, Angular 18 con Signals y bases de datos relacionales con resolución de rúbrica.',
      imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600&auto=format&fit=crop',
      badge: 'TOP TUTOR',
      rating: 4.95,
      reviewsCount: 48,
      salesCount: 64,
      tutorName: 'Asesor UTP Senior',
      tutorCareer: 'Ing. Sistemas',
      tutorCycle: 7,
      courseName: 'Desarrollo Web Integrado',
      reputation: 98,
      tags: ['SpringBoot3', 'Angular', 'APF1', 'REST'],
      contactMethod: 'Microsoft Teams / Correo institucional UTP',
      highlights: ['Configuración Spring Security', 'Signals & RxJS en Angular', 'Resolución de rúbrica PC', 'Deployment en Render']
    },
    {
      id: 'm-tut-2',
      itemType: 'SERVICE',
      category: 'PROJECT_HELP',
      serviceType: 'Asesoría de Tesis / RSL',
      price: 'S/ 30.00',
      numericPrice: 30.00,
      originalPrice: 40.00,
      unit: '/ sesión',
      title: 'Metodología PRISMA y Búsquedas Bibliográficas en Scopus & IEEE',
      description: 'Estructuración de matrices PICO, ecuaciones de búsqueda booleanas complejas y redacción de RSL con citas APA 7 sin plagio.',
      imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600&auto=format&fit=crop',
      badge: 'MÁS SOLICITADO',
      rating: 4.92,
      reviewsCount: 36,
      salesCount: 42,
      tutorName: 'Carlos Benites',
      tutorCareer: 'Ing. Sistemas',
      tutorCycle: 8,
      courseName: 'Formación para la Investigación - Sistemas',
      reputation: 95,
      tags: ['PRISMA', 'Scopus', 'IEEE', 'APA7'],
      contactMethod: 'Teams UTP: u20201452@utp.edu.pe',
      highlights: ['Filtros de exclusión PRISMA', 'Búsqueda Scopus avanzada', 'Matriz de síntesis de datos', 'Formato final de artículo']
    }
  ]);

  readonly filteredItems = computed<ServiceItem[]>(() => {
    const filter = this.filterSignal();
    const query = (filter.searchQuery || '').trim().toLowerCase();

    return this.itemsSignal()
      .filter(item => {
        if (filter.category !== 'ALL' && item.category !== filter.category) return false;
        if (filter.courseName !== 'ALL' && item.courseName !== filter.courseName) return false;
        if (query) {
          const matchTitle = item.title.toLowerCase().includes(query);
          const matchDesc = item.description.toLowerCase().includes(query);
          const matchTutor = item.tutorName.toLowerCase().includes(query);
          const matchLocation = (item.location || '').toLowerCase().includes(query);
          const matchCourse = (item.courseName || '').toLowerCase().includes(query);
          const matchCondition = (item.condition || '').toLowerCase().includes(query);
          const matchTags = item.tags.some(t => t.toLowerCase().includes(query));
          if (!matchTitle && !matchDesc && !matchTutor && !matchLocation && !matchCourse && !matchCondition && !matchTags) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (filter.sortBy === 'POPULAR') return b.salesCount - a.salesCount;
        if (filter.sortBy === 'RATING') return b.rating - a.rating;
        if (filter.sortBy === 'PRICE_LOW') return a.numericPrice - b.numericPrice;
        if (filter.sortBy === 'PRICE_HIGH') return b.numericPrice - a.numericPrice;
        return 0;
      });
  });

  get hasActiveFilters(): boolean {
    return (
      this.filterSignal().category !== 'ALL' ||
      this.filterSignal().courseName !== 'ALL' ||
      !!this.filterSignal().searchQuery.trim() ||
      this.filterSignal().sortBy !== 'POPULAR'
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
    this.filterSignal.update(curr => ({ ...curr, category: cat }));
  }

  onFilterChange(partial: Partial<ServiceFilter>): void {
    this.filterSignal.update(curr => ({ ...curr, ...partial }));
  }

  resetFilters(): void {
    this.filterSignal.set({
      category: 'ALL',
      searchQuery: '',
      courseName: 'ALL',
      sortBy: 'POPULAR'
    });
  }

  contactSeller(item: ServiceItem): void {
    if (item.contactMethod.includes('teams.microsoft.com')) {
      window.open(item.contactMethod, '_blank');
    } else if (item.contactMethod.includes('@utp.edu.pe')) {
      const email = item.contactMethod.match(/u\d+@utp\.edu\.pe/)?.[0] || item.contactMethod;
      window.open(`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`, '_blank');
    } else {
      navigator.clipboard?.writeText(item.contactMethod);
      alert(`Información de contacto copiada:\n${item.contactMethod}`);
    }
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
      tutorName: student?.fullName || student?.name || 'Estudiante UTP',
      tutorCareer: student?.career || 'Ingeniería',
      tutorCycle: student?.currentCycle || 6
    };

    this.marketplaceService.publishItem(payload).subscribe(savedItem => {
      if (savedItem) {
        this.itemsSignal.update(list => [savedItem, ...list]);
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
        this.itemsSignal.update(list => [fallbackItem, ...list]);
      }
    });

    this.isOfferModalOpen = false;
    this.newOffer.title = '';
    this.newOffer.description = '';
  }
}
