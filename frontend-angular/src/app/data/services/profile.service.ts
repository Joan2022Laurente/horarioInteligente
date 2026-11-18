import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, StudentProfile, UpdateProfileRequest } from '@domain/models/utp.model';
import { AuthService } from './auth.service';
import { MarketplaceMediaService } from '@core/services/marketplace-media.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly mediaService = inject(MarketplaceMediaService);
  private readonly baseUrl = `${environment.academicApiUrl}/profile`;

  getMyProfile(): Observable<ApiResponse<StudentProfile>> {
    return this.http.get<ApiResponse<StudentProfile>>(`${this.baseUrl}/me`).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.authService.updateProfile(res.data);
        }
      })
    );
  }

  updateMyProfile(request: UpdateProfileRequest): Observable<ApiResponse<StudentProfile>> {
    return this.http.put<ApiResponse<StudentProfile>>(`${this.baseUrl}/me`, request).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.authService.updateProfile(res.data);
        }
      })
    );
  }

  async uploadAvatar(file: File): Promise<string> {
    const processed = await this.mediaService.processImage(file);
    const result = await new Promise<{ originalUrl: string }>((resolve, reject) => {
      this.mediaService.uploadMedia(processed, file.name, `avatar_${Date.now()}`).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err)
      });
    });
    return result.originalUrl;
  }
}
