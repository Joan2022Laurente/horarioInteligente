import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  getTasks(): Observable<ApiResponse<TaskSyncItem[]>> {
    const profile = getCachedStudentProfile();
    const token = profile?.token;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    return this.http.get<ApiResponse<TaskSyncItem[]>>(this.baseUrl, { headers }).pipe(
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

  getUpcomingTasks(limit = 15): Observable<ApiResponse<any[]>> {
    const profile = getCachedStudentProfile();
    const token = profile?.token;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/upcoming?limit=${limit}`, { headers }).pipe(
      catchError((err) => {
        console.warn('[TaskService] ℹ️ Error en /tasks/upcoming:', err.message);
        return of({ success: false, message: 'Error consultando tareas próximas', data: [] });
      })
    );
  }

  syncTasks(sectionId?: string): Observable<ApiResponse<TaskSyncItem[]>> {
    const profile = getCachedStudentProfile();
    const token = profile?.token;
    if (!token) {
      console.warn('[TaskService] ℹ️ No hay token activo para sincronización de tareas.');
      return of({ success: false, message: 'No hay token disponible', data: [] });
    }

    const params = new URLSearchParams();
    params.set('token', token);
    if (sectionId) {
      params.set('sectionId', sectionId);
    }

    return this.http.post<ApiResponse<TaskSyncItem[]>>(`${this.baseUrl}/sync?${params.toString()}`, {}).pipe(
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
    return this.http.post<ApiResponse<TaskSyncItem>>(`${this.baseUrl}/${taskId}/deliver`, {}).pipe(
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
