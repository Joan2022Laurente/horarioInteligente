import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { TaskSyncItem } from '@domain/models/task.model';
import { ApiResponse } from '@domain/models/utp.model';
import { environment } from '@env/environment';
import { getCachedStudentProfile } from '@data/syllabus/client-storage';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly baseUrl = `${environment.academicApiUrl}/tasks`;

  private tasksSignal = signal<TaskSyncItem[]>([]);
  readonly tasks = this.tasksSignal.asReadonly();

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const profile = getCachedStudentProfile();
    let headers = new HttpHeaders();
    if (profile?.token) {
      headers = headers.set('Authorization', `Bearer ${profile.token}`);
    }
    const studentCode = (profile?.studentCode || profile?.username || '').toUpperCase();
    if (studentCode) {
      headers = headers.set('x-user-id', studentCode);
    }
    return headers;
  }

  getTasks(studentId?: string): Observable<ApiResponse<TaskSyncItem[]>> {
    const profile = getCachedStudentProfile();
    const effectiveStudentId = studentId || (profile?.studentCode || profile?.username || '').toUpperCase();
    const url = effectiveStudentId ? `${this.baseUrl}?studentId=${encodeURIComponent(effectiveStudentId)}` : this.baseUrl;

    return this.http.get<ApiResponse<TaskSyncItem[]>>(url, { headers: this.getAuthHeaders() }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.tasksSignal.set(res.data);
        }
      }),
      catchError((err) => {
        console.warn('[TaskService] ℹ️ Consulta de tareas:', err.message);
        return of({ success: false, message: 'No se pudieron cargar tareas del servidor', data: [] });
      })
    );
  }

  syncTasks(token?: string, sectionId?: string): Observable<ApiResponse<TaskSyncItem[]>> {
    const profile = getCachedStudentProfile();
    const effectiveToken = token || profile?.token;
    if (!effectiveToken) {
      console.warn('[TaskService] ℹ️ No hay token activo para sincronización de tareas.');
      return of({ success: false, message: 'No hay token disponible', data: [] });
    }

    const params = new URLSearchParams();
    params.set('token', effectiveToken);
    if (sectionId) {
      params.set('sectionId', sectionId);
    }

    return this.http.post<ApiResponse<TaskSyncItem[]>>(`${this.baseUrl}/sync?${params.toString()}`, {}, { headers: this.getAuthHeaders() }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.tasksSignal.set(res.data);
        }
      }),
      catchError((err) => {
        console.warn('[TaskService] ℹ️ Error en sincronización de tareas:', err.message);
        return of({ success: false, message: 'Error en sincronización', data: [] });
      })
    );
  }

  markAsDelivered(taskId: string): Observable<ApiResponse<TaskSyncItem>> {
    return this.http.post<ApiResponse<TaskSyncItem>>(`${this.baseUrl}/${taskId}/deliver`, {}, { headers: this.getAuthHeaders() }).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.tasksSignal.update((tasks) =>
            tasks.map((t) => (t.id === taskId ? res.data : t))
          );
        }
      })
    );
  }
}
