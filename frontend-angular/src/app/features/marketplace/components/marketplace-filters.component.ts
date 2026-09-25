import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceCategory, ServiceFilter, ServiceSortBy } from '@domain/models/marketplace';

@Component({
  selector: 'app-marketplace-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ========================================================================= -->
    <!-- MOBILE TOP BAR (< md screens)                                            -->
    <!-- ========================================================================= -->
    <div class="md:hidden space-y-3 mb-4 text-left">
      <!-- Search Input + Mobile Filter Button -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            [ngModel]="filter.searchQuery"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Buscar productos, snacks, ropa o tutorías..."
            class="w-full bg-[#14151a] border border-white/[0.08] focus:border-[var(--accent-lime)] rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-neutral-500 outline-none transition"
          />
        </div>

        <button
          (click)="isMobileDrawerOpen = true"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#14151a] border border-white/[0.08] text-xs font-bold text-white transition cursor-pointer shrink-0"
        >
          <svg class="h-3.5 w-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span>Filtros</span>
          @if (hasActiveFilters) {
            <span class="h-1.5 w-1.5 rounded-full bg-[var(--accent-lime)]"></span>
          }
        </button>
      </div>

      <!-- Quick Category Chips Scroll -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
        @for (cat of categories; track cat.id) {
          <button
            (click)="onCategoryChange(cat.id)"
            class="px-3.5 py-1.5 rounded-xl font-bold border-none cursor-pointer transition shrink-0 flex items-center gap-1.5 text-xs"
            [ngClass]="filter.category === cat.id 
              ? 'bg-[var(--accent-lime)] text-black' 
              : 'bg-[#14151a] text-neutral-400 hover:text-white border border-white/[0.08]'"
          >
            <span>{{ cat.label }}</span>
          </button>
        }
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- DESKTOP FIXED RIGHT SIDEBAR (Modern Elevated Sidebar)                     -->
    <!-- ========================================================================= -->
    <div class="hidden md:block space-y-4 text-left w-full select-none pb-8">
      
      <!-- 1. Sticky Search Box -->
      <div class="sticky top-0 z-10 bg-[#0c0d10]/95 backdrop-blur-md pb-2 pt-0.5">
        <div class="relative">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            [ngModel]="filter.searchQuery"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Buscar en el campus..."
            class="w-full bg-[#14151a] border border-white/[0.08] focus:border-[var(--accent-lime)] focus:bg-[#181920] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-neutral-500 outline-none transition"
          />
        </div>
      </div>

      <!-- 2. Trending Topics on Campus Marketplace (With Rank & Pulse) -->
      <div class="rounded-2xl bg-[#0c0d10] border border-white/[0.08] overflow-hidden shadow-lg">
        <div class="p-3.5 pb-2.5 flex items-center justify-between border-b border-white/[0.06]">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-[var(--accent-lime)] animate-pulse"></span>
            <h4 class="text-xs font-black uppercase tracking-wider text-white">Tendencias en el Campus</h4>
          </div>
          <span class="text-[10px] font-mono text-neutral-500">Demanda UTP</span>
        </div>

        <div class="divide-y divide-white/[0.06]">
          @for (trend of marketplaceTrends; track trend.tag; let idx = $index) {
            <div 
              (click)="onTagClick(trend.tag)"
              class="p-3 hover:bg-white/[0.03] transition cursor-pointer flex items-center justify-between group"
            >
              <div class="min-w-0 flex items-center gap-2.5">
                <span class="text-[10px] font-mono font-bold text-[var(--accent-lime)] bg-[var(--accent-lime)]/10 px-1.5 py-0.5 rounded-md shrink-0">
                  #0{{ idx + 1 }}
                </span>
                <div class="min-w-0">
                  <span class="text-xs font-bold text-neutral-200 group-hover:text-[var(--accent-lime)] transition block truncate">
                    #{{ trend.tag }}
                  </span>
                  <div class="flex items-center gap-1.5 text-[10px] text-neutral-500">
                    <span>{{ trend.category }}</span>
                    <span>•</span>
                    <span class="font-mono">{{ trend.volume }}</span>
                  </div>
                </div>
              </div>

              <svg class="h-3.5 w-3.5 text-neutral-600 group-hover:text-white transition shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          }
        </div>
      </div>

      <!-- 3. Marketplace Categories & Filters Card -->
      <div class="rounded-2xl bg-[#0c0d10] border border-white/[0.08] p-4 space-y-3.5 shadow-lg">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-black uppercase tracking-wider text-white">Rubros & Filtros</h4>
          @if (hasActiveFilters) {
            <button
              (click)="resetFilters()"
              class="text-xs text-[var(--accent-lime)] hover:underline bg-transparent border-none p-0 cursor-pointer font-bold"
            >
              Restablecer
            </button>
          }
        </div>

        <!-- Categories List -->
        <div class="space-y-1">
          @for (cat of categories; track cat.id) {
            <button
              (click)="onCategoryChange(cat.id)"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition border-none cursor-pointer text-left"
              [ngClass]="filter.category === cat.id 
                ? 'bg-[var(--accent-lime)] text-black font-bold shadow-sm' 
                : 'bg-transparent text-neutral-400 hover:bg-white/[0.04] hover:text-white'"
            >
              <span>{{ cat.label }}</span>
              @if (filter.category === cat.id) {
                <span class="h-1.5 w-1.5 rounded-full bg-black"></span>
              }
            </button>
          }
        </div>

        <!-- Course Selector (For Academic items) -->
        <div class="pt-2 border-t border-white/[0.06] space-y-1">
          <label class="block text-[11px] text-neutral-400 font-medium">Asignatura (Tutorías / Material)</label>
          <div class="relative">
            <select
              [ngModel]="filter.courseName"
              (ngModelChange)="onCourseChange($event)"
              class="w-full bg-[#14151a] border border-white/[0.08] focus:border-[var(--accent-lime)] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer appearance-none truncate pr-8"
            >
              <option value="ALL">Todas las asignaturas</option>
              @for (c of courses; track c) {
                <option [value]="c">{{ c }}</option>
              }
            </select>
            <svg class="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        <!-- Sort Order Selector -->
        <div class="space-y-1">
          <label class="block text-[11px] text-neutral-400 font-medium">Ordenar por</label>
          <div class="grid grid-cols-3 gap-1 bg-[#14151a] p-1 rounded-xl border border-white/[0.08]">
            <button
              (click)="onSortChange('POPULAR')"
              class="py-1 rounded-lg text-[11px] font-medium transition border-none cursor-pointer text-center"
              [ngClass]="filter.sortBy === 'POPULAR' ? 'bg-[var(--accent-lime)] text-black font-bold' : 'bg-transparent text-neutral-400 hover:text-white'"
            >
              Popular
            </button>
            <button
              (click)="onSortChange('RATING')"
              class="py-1 rounded-lg text-[11px] font-medium transition border-none cursor-pointer text-center"
              [ngClass]="filter.sortBy === 'RATING' ? 'bg-[var(--accent-lime)] text-black font-bold' : 'bg-transparent text-neutral-400 hover:text-white'"
            >
              Valorados
            </button>
            <button
              (click)="onSortChange('PRICE_LOW')"
              class="py-1 rounded-lg text-[11px] font-medium transition border-none cursor-pointer text-center"
              [ngClass]="filter.sortBy === 'PRICE_LOW' ? 'bg-[var(--accent-lime)] text-black font-bold' : 'bg-transparent text-neutral-400 hover:text-white'"
            >
              Precio
            </button>
          </div>
        </div>

      </div>

      <!-- Trust Card -->
      <div class="rounded-2xl bg-[#0c0d10] border border-white/[0.08] p-4 space-y-1.5 text-left shadow-lg">
        <div class="flex items-center gap-2">
          <svg class="h-4 w-4 text-[var(--accent-lime)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <h4 class="text-xs font-bold text-white">Trato Directo en Campus</h4>
        </div>
        <p class="text-[11px] text-neutral-400 leading-relaxed">
          Transacciones seguras mano a mano entre estudiantes en pabellones, laboratorios y áreas comunes UTP.
        </p>
      </div>

    </div>

    <!-- ========================================================================= -->
    <!-- MOBILE DRAWER MODAL (< md screens)                                        -->
    <!-- ========================================================================= -->
    @if (isMobileDrawerOpen) {
      <div 
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm md:hidden"
        (click)="isMobileDrawerOpen = false"
      >
        <div 
          class="w-full sm:max-w-md bg-[#0c0d10] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl p-5 space-y-4 text-left max-h-[85vh] overflow-y-auto no-scrollbar"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 class="text-sm font-bold text-white">Filtros del Marketplace</h3>
            <button (click)="isMobileDrawerOpen = false" class="h-7 w-7 rounded-xl bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white border-none cursor-pointer">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <!-- Categories List -->
          <div class="space-y-1">
            <label class="block text-xs font-medium text-neutral-300">Rubro</label>
            <select
              [ngModel]="filter.category"
              (ngModelChange)="onCategoryChange($event)"
              class="w-full bg-[#14151a] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              @for (cat of categories; track cat.id) {
                <option [value]="cat.id">{{ cat.label }}</option>
              }
            </select>
          </div>

          <!-- Course Selector -->
          <div class="space-y-1">
            <label class="block text-xs font-medium text-neutral-300">Asignatura (Tutorías)</label>
            <select
              [ngModel]="filter.courseName"
              (ngModelChange)="onCourseChange($event)"
              class="w-full bg-[#14151a] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              <option value="ALL">Todas las asignaturas</option>
              @for (c of courses; track c) {
                <option [value]="c">{{ c }}</option>
              }
            </select>
          </div>

          <!-- Sort Order -->
          <div class="space-y-1">
            <label class="block text-xs font-medium text-neutral-300">Ordenar por</label>
            <div class="grid grid-cols-3 gap-1 bg-[#14151a] p-1 rounded-xl border border-white/[0.08]">
              <button
                (click)="onSortChange('POPULAR')"
                class="py-1.5 rounded-lg text-xs font-medium transition border-none cursor-pointer"
                [ngClass]="filter.sortBy === 'POPULAR' ? 'bg-[var(--accent-lime)] text-black font-bold' : 'bg-transparent text-neutral-400'"
              >
                Popular
              </button>
              <button
                (click)="onSortChange('RATING')"
                class="py-1.5 rounded-lg text-xs font-medium transition border-none cursor-pointer"
                [ngClass]="filter.sortBy === 'RATING' ? 'bg-[var(--accent-lime)] text-black font-bold' : 'bg-transparent text-neutral-400'"
              >
                Valorados
              </button>
              <button
                (click)="onSortChange('PRICE_LOW')"
                class="py-1.5 rounded-lg text-xs font-medium transition border-none cursor-pointer"
                [ngClass]="filter.sortBy === 'PRICE_LOW' ? 'bg-[var(--accent-lime)] text-black font-bold' : 'bg-transparent text-neutral-400'"
              >
                Precio
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-3 border-t border-white/[0.08]">
            <button
              (click)="resetFilters()"
              class="text-xs text-neutral-400 hover:text-white bg-transparent border-none cursor-pointer"
            >
              Restablecer
            </button>
            <button
              (click)="isMobileDrawerOpen = false"
              class="px-4 py-2 rounded-xl bg-[var(--accent-lime)] text-black font-bold text-xs transition border-none cursor-pointer"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class MarketplaceFiltersComponent {
  @Input({ required: true }) filter!: ServiceFilter;
  @Input() courses: string[] = [
    'Desarrollo Web Integrado',
    'Servicios Cloud',
    'Gestión del Servicio TI',
    'Formación para la Investigación - Sistemas',
    'Lenguajes de Programación',
    'Herramientas para la Comunicación Efectiva'
  ];

  @Output() filterChange = new EventEmitter<Partial<ServiceFilter>>();

  isMobileDrawerOpen = false;

  marketplaceTrends = [
    { tag: 'BrowniesTorreA', category: 'Snacks & Postres', volume: '148 pedidos' },
    { tag: 'MouseGamer', category: 'Tecnología', volume: '92 búsquedas' },
    { tag: 'HoodiesUTP', category: 'Ropa / Thrift', volume: '67 consultas' },
    { tag: 'SpringBoot3', category: 'Tutorías', volume: '54 asesorías' },
    { tag: 'USBKingston', category: 'Hardware', volume: '41 unidades' }
  ];

  categories: { id: ServiceCategory; label: string }[] = [
    { id: 'ALL', label: 'Todo el Marketplace' },
    { id: 'SNACKS_FOOD', label: 'Comida & Snacks' },
    { id: 'CLOTHING_THRIFT', label: 'Ropa & Segunda Mano' },
    { id: 'SECOND_HAND_TECH', label: 'Tecnología Seminueva' },
    { id: 'TECH_GADGETS', label: 'Hardware & USBs' },
    { id: 'PRINTING_SUPPLIES', label: 'Impresiones & Útiles' },
    { id: 'TUTORING', label: 'Tutorías 1 a 1' },
    { id: 'EXAM_PREP', label: 'Repaso Exámenes' },
    { id: 'PROJECT_HELP', label: 'Proyectos & RSL' }
  ];

  get hasActiveFilters(): boolean {
    return (
      this.filter.category !== 'ALL' ||
      this.filter.courseName !== 'ALL' ||
      !!this.filter.searchQuery.trim() ||
      this.filter.sortBy !== 'POPULAR'
    );
  }

  onSearchChange(val: string): void {
    this.filterChange.emit({ searchQuery: val });
  }

  onCategoryChange(cat: ServiceCategory): void {
    this.filterChange.emit({ category: cat });
  }

  onCourseChange(course: string): void {
    this.filterChange.emit({ courseName: course });
  }

  onSortChange(sortBy: ServiceSortBy): void {
    this.filterChange.emit({ sortBy });
  }

  onTagClick(tag: string): void {
    this.filterChange.emit({ searchQuery: tag });
  }

  resetFilters(): void {
    this.filterChange.emit({
      category: 'ALL',
      courseName: 'ALL',
      searchQuery: '',
      sortBy: 'POPULAR'
    });
  }
}
