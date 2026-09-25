import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { TaskSyncItem } from '@domain/models/task.model';
import { ApiResponse } from '@domain/models/utp.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly baseUrl = 'http://localhost:8080/api/v1/tasks';

  private tasksSignal = signal<TaskSyncItem[]>([]);
  readonly tasks = this.tasksSignal.asReadonly();

  constructor(private http: HttpClient) {}

  getTasks(studentId = 'current-student'): Observable<ApiResponse<TaskSyncItem[]>> {
    return this.http.get<ApiResponse<TaskSyncItem[]>>(`${this.baseUrl}?studentId=${studentId}`).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.tasksSignal.set(res.data);
        }
      })
    );
  }

  syncTasks(token = 'demo-token', sectionId = '34374'): Observable<ApiResponse<TaskSyncItem[]>> {
    return this.http.post<ApiResponse<TaskSyncItem[]>>(`${this.baseUrl}/sync?token=${token}&sectionId=${sectionId}`, {}).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.tasksSignal.set(res.data);
        }
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
