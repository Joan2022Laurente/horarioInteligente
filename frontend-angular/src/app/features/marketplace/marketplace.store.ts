import { Injectable, computed, signal, inject } from '@angular/core';
import { UiFeedbackService } from '@core/services/ui-feedback.service';
import { MarketplaceService, PublishItemPayload } from '@data/services/marketplace.service';
import { ServiceItem, ServiceFilter, ServiceCategory, ServiceSortBy, MarketplaceItem } from '@domain/models/marketplace';
import { INITIAL_MARKETPLACE_ITEMS } from './marketplace.catalog';

export type SortOption = 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC' | 'RATING' | ServiceSortBy;

@Injectable({
  providedIn: 'root'
})
export class MarketplaceStore {
  private readonly marketplaceService = inject(MarketplaceService);
  private readonly uiFeedback = inject(UiFeedbackService);

  readonly items = signal<MarketplaceItem[]>(INITIAL_MARKETPLACE_ITEMS);
  readonly loading = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);
  readonly selectedCategory = signal<string>('ALL');
  readonly searchQuery = signal<string>('');
  readonly sortBy = signal<SortOption>('NEWEST');
  readonly isPublishModalOpen = signal<boolean>(false);

  readonly filterSignal = signal<ServiceFilter>({
    category: 'ALL',
    searchQuery: '',
    courseName: 'ALL',
    sortBy: 'POPULAR'
  });

  readonly filteredItems = computed<MarketplaceItem[]>(() => {
    let list = this.items();
    const filter = this.filterSignal();
    const cat = this.selectedCategory() !== 'ALL' ? this.selectedCategory() : filter.category;
    const query = (this.searchQuery() || filter.searchQuery || '').toLowerCase().trim();
    const course = filter.courseName;

    if (cat !== 'ALL') {
      list = list.filter((i) => (i.category || '').toUpperCase() === cat.toUpperCase());
    }

    if (course !== 'ALL') {
      list = list.filter((i) => i.courseName === course);
    }

    if (query) {
      list = list.filter(
        (i) =>
          (i.title || '').toLowerCase().includes(query) ||
          (i.description || '').toLowerCase().includes(query) ||
          (i.tutorName || '').toLowerCase().includes(query) ||
          (i.location || '').toLowerCase().includes(query) ||
          (i.courseName || '').toLowerCase().includes(query) ||
          (i.condition || '').toLowerCase().includes(query) ||
          (i.tags || []).some(t => t.toLowerCase().includes(query))
      );
    }

    // La senal sortBy es la unica fuente de verdad del orden. El valor por defecto
    // 'NEWEST' debe ordenar por fecha real, no caer en filter.sortBy='POPULAR'.
    const sort = this.sortBy();
    return [...list].sort((a, b) => {
      if (sort === 'PRICE_ASC' || sort === 'PRICE_LOW') return (a.numericPrice || 0) - (b.numericPrice || 0);
      if (sort === 'PRICE_DESC' || sort === 'PRICE_HIGH') return (b.numericPrice || 0) - (a.numericPrice || 0);
      if (sort === 'RATING') return (b.rating || 0) - (a.rating || 0);
      if (sort === 'NEWEST' || sort === 'RECENT') {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      }
      if (sort === 'POPULAR') return (b.salesCount || 0) - (a.salesCount || 0);
      return (b.salesCount || 0) - (a.salesCount || 0);
    });
  });

  loadItems(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.marketplaceService.getItems().subscribe({
      next: (res: ServiceItem[]) => {
        // Se reemplaza siempre con la respuesta real, aunque esté vacía.
        this.items.set(Array.isArray(res) ? res : []);
        this.loading.set(false);
      },
      error: (err) => {
        // No se inventa contenido: se conserva el ultimo catalogo real cargado y
        // se informa del fallo para que el usuario pueda reintentar.
        this.loadError.set(err?.message || 'No se pudo cargar el marketplace.');
        this.loading.set(false);
        this.uiFeedback.error('No se pudo cargar el marketplace.', err?.message);
      }
    });
  }

  setCategory(category: string): void {
    this.selectedCategory.set(category);
    this.filterSignal.update(curr => ({ ...curr, category: category as ServiceCategory }));
  }

  setSearchQuery(q: string): void {
    this.searchQuery.set(q);
    this.filterSignal.update(curr => ({ ...curr, searchQuery: q }));
  }

  setSortBy(sort: SortOption): void {
    this.sortBy.set(sort);
    this.filterSignal.update(curr => ({ ...curr, sortBy: sort as ServiceSortBy }));
  }

  updateFilter(partial: Partial<ServiceFilter>): void {
    this.filterSignal.update(curr => ({ ...curr, ...partial }));
    if (partial.category) this.selectedCategory.set(partial.category);
    if (partial.searchQuery !== undefined) this.searchQuery.set(partial.searchQuery);
    if (partial.sortBy) this.sortBy.set(partial.sortBy);
  }

  resetFilters(): void {
    this.selectedCategory.set('ALL');
    this.searchQuery.set('');
    this.sortBy.set('NEWEST');
    this.filterSignal.set({
      category: 'ALL',
      searchQuery: '',
      courseName: 'ALL',
      sortBy: 'POPULAR'
    });
  }

  addItem(item: MarketplaceItem): void {
    this.loadError.set(null);
    this.items.update(list => [item, ...list]);
  }

  removeItem(id: string): void {
    this.items.update(list => list.filter(item => item.id !== id));
  }

  openPublishModal(): void {
    this.isPublishModalOpen.set(true);
  }

  closePublishModal(): void {
    this.isPublishModalOpen.set(false);
  }
}
