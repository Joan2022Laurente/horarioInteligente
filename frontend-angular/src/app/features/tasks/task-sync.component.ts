import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '@data/services/task.service';
import { TaskSyncItem } from '@domain/models/task.model';

@Component({
  selector: 'app-task-sync',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tasks-container">
      <div class="header-section">
        <div>
          <h2 class="section-title">Sincronización de Entregables</h2>
          <p class="section-subtitle">Detección de estado "Entregado" y verificación de tareas UTP</p>
        </div>
        <button class="btn btn-secondary" (click)="syncTasks()">
          Actualizar de Canvas/PAO
        </button>
      </div>

      <div class="tasks-table glass-panel">
        <div class="table-header">
          <span>Tarea / Actividad</span>
          <span>Curso</span>
          <span>Semana</span>
          <span>Estado de Entrega</span>
          <span>Acción</span>
        </div>

        @if (taskService.tasks().length === 0) {
          <div class="empty-state">
            <p>No hay tareas registradas para tu horario actual o no se ha sincronizado aún.</p>
          </div>
        } @else {
          @for (task of taskService.tasks(); track task.id) {
            <div class="table-row" [class.delivered-row]="task.isDelivered">
              <div class="task-info">
                <strong class="task-title">{{ task.title }}</strong>
                <span class="task-type">{{ task.type }}</span>
              </div>

              <span class="course-name">{{ task.courseName }}</span>

              <span class="week-tag mono">Sem {{ task.week }}</span>

              <div>
                @if (task.isDelivered || task.homeworkStatus === 'DELIVERED') {
                  <span class="badge badge-success">Entregado</span>
                } @else {
                  <span class="badge badge-amber">Pendiente</span>
                }
              </div>

              <div>
                @if (!task.isDelivered && task.homeworkStatus !== 'DELIVERED') {
                  <button class="btn btn-primary deliver-btn" (click)="markDelivered(task.id)">
                    Marcar Entregado
                  </button>
                } @else {
                  <span class="delivered-date mono">
                    {{ task.deliveredDate ? 'Enviado' : 'Completado' }}
                  </span>
                }
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .tasks-container {
      padding: 0 24px;
    }
    .header-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 1.4rem;
      font-weight: 800;
      color: #ffffff;
    }
    .section-subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .tasks-table {
      padding: 8px;
      overflow: hidden;
    }
    .table-header {
      display: grid;
      grid-template-columns: 2fr 1.5fr 0.8fr 1fr 1fr;
      padding: 12px 16px;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
    }
    .table-row {
      display: grid;
      grid-template-columns: 2fr 1.5fr 0.8fr 1fr 1fr;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid var(--border-subtle);
      transition: background 0.2s;
    }
    .table-row:last-child {
      border-bottom: none;
    }
    .table-row:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .task-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .task-title {
      font-size: 0.9rem;
      color: #ffffff;
    }
    .task-type {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .course-name {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    .week-tag {
      font-size: 0.8rem;
      color: #a5b4fc;
    }
    .deliver-btn {
      padding: 6px 12px;
      font-size: 0.75rem;
    }
    .delivered-date {
      font-size: 0.75rem;
      color: var(--accent-emerald);
    }
  `]
})
export class TaskSyncComponent implements OnInit {
  constructor(public taskService: TaskService) {}

  ngOnInit(): void {
    this.taskService.getTasks().subscribe();
  }

  syncTasks(): void {
    this.taskService.syncTasks().subscribe();
  }

  markDelivered(taskId: string): void {
    this.taskService.markAsDelivered(taskId).subscribe();
  }
}
