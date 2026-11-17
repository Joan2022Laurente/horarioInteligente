import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { ServiceItem } from '@domain/models/marketplace';
import { ApiResponse } from '@domain/models/utp.model';
import { environment } from '@env/environment';

export interface PublishItemPayload {
  itemType?: string;
  category: string;
  serviceType: string;
  condition?: string;
  numericPrice: number;
  unit?: string;
  title: string;
  description: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  location?: string;
  contactMethod?: string;
  tutorName?: string;
  tutorCareer?: string;
  tutorCycle?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MarketplaceService {
  private get baseUrl(): string {
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      return '/api/v1/marketplace';
    }
    return `${environment.businessApiUrl}/marketplace`;
  }

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la lista de ítems del Marketplace con filtros opcionales (categoría, tipo, búsqueda, curso, estado).
   */
  getItems(filter?: { category?: string; type?: string; q?: string; status?: string; course?: string } | string): Observable<ServiceItem[]> {
    let params: string[] = [];
    if (typeof filter === 'string') {
      if (filter && filter !== 'ALL') params.push(`category=${encodeURIComponent(filter)}`);
    } else if (filter) {
      if (filter.category && filter.category !== 'ALL') params.push(`category=${encodeURIComponent(filter.category)}`);
      if (filter.type && filter.type !== 'ALL') params.push(`type=${encodeURIComponent(filter.type)}`);
      if (filter.q) params.push(`q=${encodeURIComponent(filter.q)}`);
      if (filter.status && filter.status !== 'ALL') params.push(`status=${encodeURIComponent(filter.status)}`);
      if (filter.course && filter.course !== 'ALL') params.push(`course=${encodeURIComponent(filter.course)}`);
    }
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    const url = `${this.baseUrl}${query}`;

    return this.http.get<ApiResponse<any[]>>(url).pipe(
      map(res => {
        if (res.success && Array.isArray(res.data)) {
          return res.data.map(item => this.mapToServiceItem(item));
        }
        return [];
      }),
      catchError(err => {
        console.warn('[MarketplaceService] Error al obtener ítems de base de datos:', err.message);
        return of([]);
      })
    );
  }

  /**
   * Obtiene las publicaciones propias del estudiante autenticado.
   */
  getMyItems(): Observable<ServiceItem[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/mine`).pipe(
      map(res => {
        if (res.success && Array.isArray(res.data)) {
          return res.data.map(item => this.mapToServiceItem(item));
        }
        return [];
      }),
      catchError(err => {
        console.warn('[MarketplaceService] Error al obtener mis publicaciones:', err.message);
        return of([]);
      })
    );
  }

  /**
   * Cambia el estado de una publicación (AVAILABLE <-> RESERVED -> SOLD para productos, AVAILABLE <-> PAUSED para servicios).
   */
  updateStatus(id: string, status: string): Observable<ServiceItem | null> {
    return this.http.patch<ApiResponse<any>>(`${this.baseUrl}/${encodeURIComponent(id)}/status`, { status }).pipe(
      map(res => {
        if (res.success && res.data) {
          return this.mapToServiceItem(res.data);
        }
        return null;
      }),
      catchError(err => {
        console.error('[MarketplaceService] Error al actualizar estado:', err.message);
        return of(null);
      })
    );
  }

  /**
   * Registra intención de contacto y devuelve los enlaces profundos seguros (Teams institucional / WhatsApp).
   */
  getContactHandshake(id: string): Observable<{ sellerName: string; teamsEmail: string; teamsUrl: string; prefilledMessage: string } | null> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${encodeURIComponent(id)}/contact`, {}).pipe(
      map(res => {
        if (res.success && res.data) {
          return res.data;
        }
        return null;
      }),
      catchError(err => {
        console.warn('[MarketplaceService] Error obteniendo handshake de contacto:', err.message);
        return of(null);
      })
    );
  }

  /**
   * Publica un nuevo ítem o servicio en el Marketplace en la base de datos real.
   */
  publishItem(payload: PublishItemPayload): Observable<ServiceItem | null> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/publish`, payload).pipe(
      map(res => {
        if (res.success && res.data) {
          return this.mapToServiceItem(res.data);
        }
        return null;
      }),
      catchError(err => {
        console.error('[MarketplaceService] Error al publicar en marketplace:', err.message);
        return of(null);
      })
    );
  }

  /**
   * Elimina una publicación del Marketplace (DELETE /api/v1/marketplace/{id}).
   */
  deleteItem(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${encodeURIComponent(id)}`).pipe(
      map(res => !!res.success),
      catchError(err => {
        console.error('[MarketplaceService] Error al eliminar publicación:', err.message);
        return of(false);
      })
    );
  }

  private mapToServiceItem(raw: any): ServiceItem {
    return {
      id: raw.id || `m-${Date.now()}`,
      itemType: raw.itemType || 'PRODUCT',
      category: raw.category || 'CLOTHING_THRIFT',
      serviceType: raw.serviceType || 'General',
      condition: raw.condition || 'SEMINUEVO',
      price: raw.price || `S/ ${(raw.numericPrice || 0).toFixed(2)}`,
      numericPrice: Number(raw.numericPrice) || 0,
      originalPrice: raw.originalPrice ? Number(raw.originalPrice) : undefined,
      unit: raw.unit || '/ unidad',
      title: raw.title || '',
      description: raw.description || '',
      imageUrl: raw.imageUrl || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop',
      thumbnailUrl: raw.thumbnailUrl || raw.imageUrl || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop',
      badge: raw.badge || undefined,
      location: raw.location || 'Campus UTP',
      rating: raw.rating != null ? Number(raw.rating) : 0,
      reviewsCount: Number(raw.reviewsCount) || 0,
      salesCount: Number(raw.salesCount) || 0,
      tutorName: raw.tutorName || 'Estudiante UTP',
      tutorCareer: raw.tutorCareer || 'Ingeniería',
      tutorCycle: Number(raw.tutorCycle) || 1,
      reputation: Number(raw.reputation) || 100,
      tags: raw.tags || ['UTP', 'Estudiante', raw.category],
      contactMethod: raw.contactMethod || 'Coordinación en campus',
      status: raw.status || 'AVAILABLE',
      highlights: raw.highlights || []
    };
  }
}
