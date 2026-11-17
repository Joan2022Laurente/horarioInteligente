import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { ScheduleService } from '@data/services/schedule.service';
import { MarketplaceService } from '@data/services/marketplace.service';
import { MarketplaceMediaService, ProcessedMedia } from '@core/services/marketplace-media.service';
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
    <div class="w-full grid grid-cols-1 md:grid-cols-4 gap-5 items-start text-white font-sans text-left relative">
      
      <!-- ===================================================================== -->
      <!-- CENTER CONTINUOUS COLUMN (Elevated Dark Marketplace Stream - 75%)     -->
      <!-- ===================================================================== -->
      <main class="w-full md:col-span-3 border border-white/[0.08] bg-[#0c0d10] r-card overflow-hidden shadow-2xl min-h-screen">

        <!-- Top Action / Publish Header Bar -->
        <div class="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
          <div>
            <h2 class="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              Marketplace & Emprendimientos UTP
            </h2>
            <p class="text-xs text-neutral-400 mt-0.5">Comercio directo y seguro entre estudiantes de campus</p>
          </div>

          <button 
            (click)="isOfferModalOpen = true"
            class="px-4 py-2 r-control-sm bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-black font-extrabold text-xs transition border-none cursor-pointer shadow-md"
          >
            + Publicar
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
            <div class="p-3.5 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <!-- RIGHT STICKY SIDEBAR (Elevated Fixed Filters - 25%)                   -->
      <!-- ===================================================================== -->
      <aside class="hidden md:block md:col-span-1 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar">
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
                [src]="selectedItem.imageUrl || selectedItem.thumbnailUrl" 
                [alt]="selectedItem.title"
                class="w-full h-48 md:h-full object-cover"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden"></div>
              
              @if (selectedItem.status && selectedItem.status !== 'AVAILABLE') {
                <span class="absolute top-4 left-4 px-2.5 py-1 r-control-md text-[10px] font-extrabold uppercase tracking-wider shadow-md"
                  [ngClass]="selectedItem.status === 'SOLD' ? 'bg-purple-600 text-white' : 'bg-yellow-500 text-black'">
                  {{ selectedItem.status === 'SOLD' ? 'VENDIDO' : 'APARTADO' }}
                </span>
              }
            </div>

            <!-- Right Modal Details Form & Info -->
            <div class="md:w-7/12 p-6 space-y-4 overflow-y-auto no-scrollbar flex flex-col justify-between">
              
              <div class="space-y-3">
                <!-- Header -->
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    @if (selectedItem.condition) {
                      <span class="px-2.5 py-0.5 r-control-md text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        {{ selectedItem.condition }}
                      </span>
                    }
                    @if (selectedItem.location) {
                      <span class="text-xs text-neutral-300 font-medium inline-flex items-center gap-1">
                        <lucide-icon name="map-pin" class="h-3 w-3 inline text-[var(--accent-lime)]"></lucide-icon> {{ selectedItem.location }}
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

                <!-- Real Seller Snapshot (Sin calificaciones inventadas) -->
                <div class="p-3 r-card bg-[#14151a] border border-white/[0.08] flex items-center gap-3">
                  <div class="h-9 w-9 r-panel bg-[#181920] border border-white/10 flex items-center justify-center text-xs font-bold text-[var(--accent-lime)] shrink-0">
                    {{ selectedItem.tutorName.charAt(0) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-bold text-white truncate">{{ selectedItem.tutorName }}</span>
                      <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 r-control-sm font-medium shrink-0">Estudiante UTP</span>
                    </div>
                    @if (selectedItem.tutorCareer) {
                      <span class="text-[11px] text-neutral-400 block truncate">{{ selectedItem.tutorCareer }} • Ciclo {{ selectedItem.tutorCycle || 1 }}</span>
                    }
                  </div>
                </div>

                <!-- Description (Solo si es real y no texto relleno) -->
                @if (selectedItem.description && selectedItem.description.trim() && !isDefaultDescription(selectedItem.description)) {
                  <div class="p-3 r-panel bg-white/[0.02] border border-white/[0.06] text-xs text-neutral-300 leading-relaxed">
                    <p class="whitespace-pre-line">{{ selectedItem.description }}</p>
                  </div>
                }

                <!-- Institutional Contact & Delivery -->
                <div class="p-3 r-panel bg-white/[0.03] border border-white/10 space-y-1 text-xs">
                  <span class="text-[11px] text-neutral-400 block font-medium">Contacto directo:</span>
                  <p class="font-medium text-white text-xs select-all break-all">{{ getCleanContactText(selectedItem) }}</p>
                </div>

              </div>

              <!-- Price & Order Action Row -->
              <div class="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
                <div>
                  <span class="text-[11px] text-neutral-500 block">Precio</span>
                  <div class="flex items-baseline gap-1">
                    <span class="text-xl font-black text-[var(--accent-lime)]">{{ selectedItem.price }}</span>
                    @if (selectedItem.unit && selectedItem.unit !== '/ unidad') {
                      <span class="text-xs text-neutral-400">{{ selectedItem.unit }}</span>
                    }
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
                      class="px-5 py-2.5 r-control-lg bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-black font-extrabold text-xs border-none cursor-pointer transition shadow-lg flex items-center gap-1.5"
                    >
                      <lucide-icon name="message-square" class="h-3.5 w-3.5"></lucide-icon>
                      <span>{{ selectedItem.itemType === 'PRODUCT' ? 'Pedir / Contactar' : 'Coordinar Asesoría' }}</span>
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

              <!-- Image Upload & Optimization Zone -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label class="block text-xs font-bold text-neutral-300">
                    Foto del Producto / Servicio
                  </label>
                  <button 
                    type="button"
                    (click)="useManualUrl = !useManualUrl"
                    class="text-[11px] text-[var(--accent-lime)] hover:underline bg-transparent border-none cursor-pointer"
                  >
                    {{ useManualUrl ? '← Subir archivo de imagen' : 'Ingresar URL manual' }}
                  </button>
                </div>

                @if (!useManualUrl) {
                  <!-- Drag & Drop Zone -->
                  <div 
                    (dragover)="onDragOver($event)"
                    (dragleave)="isDragging = false"
                    (drop)="onFileDrop($event)"
                    class="relative border-2 border-dashed r-control-lg p-4 transition-all text-center"
                    [ngClass]="isDragging ? 'border-[var(--accent-lime)] bg-[var(--accent-lime)]/5' : 'border-white/[0.12] bg-[#14151a] hover:border-white/25'"
                  >
                    <input 
                      #fileInput 
                      type="file" 
                      accept="image/png,image/jpeg,image/webp,image/jpg" 
                      class="hidden" 
                      (change)="onFileSelected($event)" 
                    />

                    @if (isOptimizing) {
                      <!-- Processing indicator -->
                      <div class="py-4 flex flex-col items-center justify-center space-y-2">
                        <div class="h-5 w-5 border-2 border-[var(--accent-lime)] border-t-transparent rounded-full animate-spin"></div>
                        <p class="text-xs font-bold text-white">Cargando imagen...</p>
                      </div>
                    } @else if (imagePreview) {
                      <!-- Uploaded Preview -->
                      <div class="flex items-center gap-3.5 text-left">
                        <div class="relative w-16 h-16 r-control-md overflow-hidden bg-black/60 border border-white/10 shrink-0 shadow-md">
                          <img [src]="imagePreview" alt="Vista previa" class="w-full h-full object-cover" />
                        </div>
                        <div class="flex-1 space-y-1">
                          <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                            <lucide-icon name="check" class="h-3.5 w-3.5 text-emerald-400 stroke-[3]"></lucide-icon>
                            <span>Imagen cargada</span>
                          </div>
                          <div class="pt-0.5 flex items-center gap-2">
                            <button 
                              type="button" 
                              (click)="fileInput.click()" 
                              class="text-[11px] px-2.5 py-1 r-control-sm bg-white/10 hover:bg-white/20 text-white font-medium border-none cursor-pointer transition"
                            >
                              Cambiar
                            </button>
                            <button 
                              type="button" 
                              (click)="removeSelectedImage()" 
                              class="text-[11px] px-2.5 py-1 r-control-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium cursor-pointer transition"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      </div>
                    } @else {
                      <!-- Empty state - click or drop -->
                      <div 
                        (click)="fileInput.click()" 
                        class="py-4 flex flex-col items-center justify-center space-y-1.5 cursor-pointer"
                      >
                        <div class="h-9 w-9 r-panel bg-white/5 flex items-center justify-center text-[var(--accent-lime)]">
                          <lucide-icon name="upload" class="h-5 w-5"></lucide-icon>
                        </div>
                        <p class="text-xs font-bold text-white">Sube una foto de tu producto o servicio</p>
                        <p class="text-[11px] text-neutral-400">Haz clic aquí o arrastra tu imagen</p>
                      </div>
                    }
                  </div>
                } @else {
                  <!-- Manual URL input fallback -->
                  <div class="space-y-1">
                    <input 
                      type="url" 
                      [(ngModel)]="newOffer.imageUrl" 
                      placeholder="https://images.unsplash.com/..." 
                      class="w-full bg-[#14151a] border border-white/[0.08] r-control-lg px-3.5 py-2.5 text-xs text-white outline-none focus:border-[var(--accent-lime)]" 
                    />
                    <p class="text-[10px] text-neutral-500">Pega un enlace directo a una imagen pública en internet.</p>
                  </div>
                }
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button (click)="isOfferModalOpen = false" [disabled]="isPublishing" class="px-4 py-2.5 r-control-lg bg-white/10 hover:bg-white/15 disabled:opacity-30 text-white font-bold text-xs border-none cursor-pointer">
                Cancelar
              </button>
              <button (click)="publishNewOffer()" [disabled]="!newOffer.title.trim() || !newOffer.numericPrice || isPublishing" class="px-5 py-2.5 r-control-lg bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] disabled:opacity-30 text-black font-extrabold text-xs border-none cursor-pointer flex items-center gap-2">
                @if (isPublishing) {
                  <div class="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Publicando...</span>
                } @else {
                  <span>Publicar en Marketplace</span>
                }
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
  private readonly mediaService = inject(MarketplaceMediaService);
  readonly marketplaceStore = inject(MarketplaceStore);

  readonly filterSignal = this.marketplaceStore.filterSignal;
  readonly filteredItems = this.marketplaceStore.filteredItems;

  isOfferModalOpen = false;
  selectedItem: ServiceItem | null = null;

  useManualUrl = false;
  isOptimizing = false;
  isPublishing = false;
  isDragging = false;
  imagePreview: string | null = null;
  pendingFile: File | null = null;
  pendingProcessed: ProcessedMedia | null = null;
  uploadedOriginalUrl: string | null = null;
  uploadedThumbnailUrl: string | null = null;

  newOffer = {
    category: 'CLOTHING_THRIFT' as ServiceCategory,
    title: '',
    numericPrice: 45.00,
    unit: '/ prenda',
    condition: 'SEMINUEVO 9/10',
    location: 'Torre A - Piso 3',
    description: '',
    imageUrl: ''
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

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.handleImageFile(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.handleImageFile(file);
    }
  }

  private async handleImageFile(file: File): Promise<void> {
    try {
      this.isOptimizing = true;
      this.pendingFile = file;
      this.pendingProcessed = await this.mediaService.processImage(file);
      this.imagePreview = this.pendingProcessed.previewUrl;
      this.isOptimizing = false;
    } catch (err) {
      console.error('[MarketplaceView] Error al procesar imagen localmente:', err);
      this.isOptimizing = false;
    }
  }

  removeSelectedImage(): void {
    if (this.imagePreview && this.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreview);
    }
    this.imagePreview = null;
    this.pendingFile = null;
    this.pendingProcessed = null;
    this.uploadedOriginalUrl = null;
    this.uploadedThumbnailUrl = null;
    this.newOffer.imageUrl = '';
  }

  async publishNewOffer(): Promise<void> {
    if (!this.newOffer.title.trim() || !this.newOffer.numericPrice || this.isPublishing) return;
    this.isPublishing = true;
    
    const isFood = this.newOffer.category === 'SNACKS_FOOD';
    const isCloth = this.newOffer.category === 'CLOTHING_THRIFT';
    const isTech = this.newOffer.category === 'TECH_GADGETS' || this.newOffer.category === 'SECOND_HAND_TECH';

    const defaultImg = isFood 
      ? 'https://images.unsplash.com/photo-1515037893149-de7f840978e2?q=80&w=600&auto=format&fit=crop'
      : isCloth
      ? 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop'
      : 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=600&auto=format&fit=crop';

    let effectiveImg = this.newOffer.imageUrl.trim() || defaultImg;
    let effectiveThumb = this.newOffer.imageUrl.trim() || defaultImg;

    // Subir a Supabase Storage únicamente al hacer clic en Publicar
    if (this.pendingProcessed && this.pendingFile) {
      try {
        const uploadResult = await firstValueFrom(
          this.mediaService.uploadMedia(this.pendingProcessed, this.pendingFile.name)
        );
        effectiveImg = uploadResult.originalUrl;
        effectiveThumb = uploadResult.thumbnailUrl;
      } catch (err) {
        console.error('[MarketplaceView] Error al subir imagen a Supabase al publicar:', err);
      }
    }

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
      imageUrl: effectiveImg,
      thumbnailUrl: effectiveThumb,
      contactMethod: `Punto de entrega: ${this.newOffer.location} • Teams: ${contactEmail}`,
      tutorName: student?.fullName || student?.name || student?.studentCode || 'Estudiante UTP',
      tutorCareer: student?.career || '',
      tutorCycle: student?.currentCycle ?? 1
    };

    this.marketplaceService.publishItem(payload).subscribe({
      next: (savedItem) => {
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
            thumbnailUrl: payload.thumbnailUrl,
            rating: 0,
            reviewsCount: 0,
            salesCount: 0,
            tutorName: payload.tutorName,
            tutorCareer: payload.tutorCareer,
            tutorCycle: payload.tutorCycle,
            reputation: 100,
            tags: [],
            contactMethod: payload.contactMethod,
            status: 'AVAILABLE'
          };
          this.marketplaceStore.addItem(fallbackItem);
        }
        this.isOfferModalOpen = false;
        this.isPublishing = false;
        this.newOffer.title = '';
        this.newOffer.description = '';
        this.removeSelectedImage();
      },
      error: (err) => {
        console.error('[MarketplaceView] Error al publicar ítem:', err);
        this.isPublishing = false;
      }
    });
  }

  isDefaultDescription(desc?: string): boolean {
    if (!desc) return true;
    return desc.includes('marketplace estudiantil UTP') || desc.includes('Publicación en el');
  }

  getCleanContactText(item: ServiceItem): string {
    if (!item.contactMethod) return 'Coordinación institucional en campus';
    const match = item.contactMethod.match(/[uU]\d{8}@utp\.edu\.pe/);
    if (match) {
      return `Microsoft Teams: ${match[0]}`;
    }
    return item.contactMethod;
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

