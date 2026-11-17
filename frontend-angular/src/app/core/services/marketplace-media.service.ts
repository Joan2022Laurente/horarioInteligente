import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';

export interface ProcessedMedia {
  originalBlob: Blob;
  thumbnailBlob: Blob;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  originalSizeBytes: number;
  thumbnailSizeBytes: number;
}

export interface UploadMediaResult {
  originalUrl: string;
  thumbnailUrl: string;
  originalSizeBytes: number;
  thumbnailSizeBytes: number;
}

@Injectable({
  providedIn: 'root'
})
export class MarketplaceMediaService {
  private readonly SUPABASE_URL = 'https://flsvdobbrtvpzyatusis.supabase.co';
  private readonly SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsc3Zkb2JicnR2cHp5YXR1c2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5MjYyMjUsImV4cCI6MjExMDUwMjIyNX0.tlgcWJqPJhXjnzd64MS9EL7yi5jKOWYl8sDT2O8ZipE';
  private readonly BUCKET = 'marketplace';

  /**
   * Procesa la imagen en el navegador:
   * 1. Original optimizada: Máx 1200px preservando aspect ratio, WebP Q=0.82
   * 2. Thumbnail ligero: Máx 300px preservando aspect ratio, WebP Q=0.72
   */
  async processImage(file: File): Promise<ProcessedMedia> {
    const img = await this.loadImage(file);
    const previewUrl = URL.createObjectURL(file);

    // 1. Optimizar imagen original
    const { blob: originalBlob, width: origW, height: origH } = await this.resizeAndCompress(img, 1200, 1200, 0.82);

    // 2. Optimizar miniatura (thumbnail)
    const { blob: thumbnailBlob, width: thumbW, height: thumbH } = await this.resizeAndCompress(img, 320, 320, 0.72);

    return {
      originalBlob,
      thumbnailBlob,
      previewUrl,
      originalWidth: origW,
      originalHeight: origH,
      thumbnailWidth: thumbW,
      thumbnailHeight: thumbH,
      originalSizeBytes: originalBlob.size,
      thumbnailSizeBytes: thumbnailBlob.size
    };
  }

  /**
   * Sube los blobs procesados a Supabase Storage y registra en PostgreSQL.
   */
  uploadMedia(media: ProcessedMedia, originalFileName: string, itemId?: string): Observable<UploadMediaResult> {
    return from(this.executeUpload(media, originalFileName, itemId));
  }

  private async executeUpload(media: ProcessedMedia, originalFileName: string, itemId?: string): Promise<UploadMediaResult> {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const baseId = itemId || `${timestamp}_${randomSuffix}`;

    const originalPath = `originals/${baseId}.webp`;
    const thumbnailPath = `thumbnails/${baseId}_thumb.webp`;

    // 1. Subida paralela a Supabase Storage
    await Promise.all([
      this.uploadFileToStorage(originalPath, media.originalBlob),
      this.uploadFileToStorage(thumbnailPath, media.thumbnailBlob)
    ]);

    const originalUrl = `${this.SUPABASE_URL}/storage/v1/object/public/${this.BUCKET}/${originalPath}`;
    const thumbnailUrl = `${this.SUPABASE_URL}/storage/v1/object/public/${this.BUCKET}/${thumbnailPath}`;

    // 2. Registro no bloqueante en PostgreSQL marketplace_media
    this.recordInDatabase({
      item_id: itemId || baseId,
      original_url: originalUrl,
      thumbnail_url: thumbnailUrl,
      file_name: originalFileName,
      mime_type: 'image/webp',
      width: media.originalWidth,
      height: media.originalHeight,
      size_bytes: media.originalSizeBytes
    }).catch(err => console.warn('[MarketplaceMediaService] Aviso al registrar auditoría en DB:', err));

    return {
      originalUrl,
      thumbnailUrl,
      originalSizeBytes: media.originalSizeBytes,
      thumbnailSizeBytes: media.thumbnailSizeBytes
    };
  }

  private async uploadFileToStorage(path: string, blob: Blob): Promise<void> {
    const uploadUrl = `${this.SUPABASE_URL}/storage/v1/object/${this.BUCKET}/${path}`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': this.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
        'Content-Type': 'image/webp',
        'x-upsert': 'true'
      },
      body: blob
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error al subir imagen a Supabase Storage: ${res.status} - ${errText}`);
    }
  }

  private async recordInDatabase(payload: any): Promise<void> {
    const restUrl = `${this.SUPABASE_URL}/rest/v1/marketplace_media`;
    await fetch(restUrl, {
      method: 'POST',
      headers: {
        'apikey': this.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('No se pudo cargar la imagen para procesamiento'));
      };
      img.src = objectUrl;
    });
  }

  private resizeAndCompress(
    img: HTMLImageElement,
    maxWidth: number,
    maxHeight: number,
    quality: number
  ): Promise<{ blob: Blob; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Escalar proporcionalmente manteniendo el aspecto
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('No se pudo obtener el contexto 2D del Canvas'));
      }

      // Suavizado bicúbico
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Exportar en WebP con fallback a JPEG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width, height });
          } else {
            // Fallback
            canvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) {
                  resolve({ blob: fallbackBlob, width, height });
                } else {
                  reject(new Error('Fallo al exportar blob desde Canvas'));
                }
              },
              'image/jpeg',
              quality
            );
          }
        },
        'image/webp',
        quality
      );
    });
  }
}
