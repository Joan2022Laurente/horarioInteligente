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
   * Obtiene la lista de ítems reales del Marketplace desde el Backend del Negocio.
   */
  getItems(category?: string): Observable<ServiceItem[]> {
    const url = category && category !== 'ALL' 
      ? `${this.baseUrl}?category=${encodeURIComponent(category)}`
      : this.baseUrl;

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
      badge: raw.badge || 'NUEVO',
      location: raw.location || 'Campus UTP',
      rating: Number(raw.rating) || 5.0,
      reviewsCount: Number(raw.reviewsCount) || 0,
      salesCount: Number(raw.salesCount) || 0,
      tutorName: raw.tutorName || 'Estudiante UTP',
      tutorCareer: raw.tutorCareer || 'Ingeniería',
      tutorCycle: Number(raw.tutorCycle) || 1,
      reputation: Number(raw.reputation) || 100,
      tags: raw.tags || ['UTP', 'Estudiante', raw.category],
      contactMethod: raw.contactMethod || 'Coordinación en campus',
      highlights: raw.highlights || []
    };
  }
}
