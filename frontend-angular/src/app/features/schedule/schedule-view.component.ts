import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleService } from '@data/services/schedule.service';
import { ClassSession } from '@domain/models/utp.model';

@Component({
  selector: 'app-schedule-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="schedule-root">
      
      <!-- Top Banner Summary -->
      <div class="hero-status-banner">
        <div class="status-left">
          <div class="status-badge">
            <span class="live-dot"></span>
            <span>CLASE EN VIVO</span>
          </div>
          <h2 class="class-hero-title">FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS</h2>
          <p class="class-hero-meta">
            <span>18:30 – 21:30</span>
            <span class="meta-separator">•</span>
            <span>Virtual Zoom (Pabellón Virtual)</span>
            <span class="meta-separator">•</span>
            <span>MG. CESAR AUGUSTO CHAVEZ</span>
          </p>
        </div>

        <div class="status-actions">
          <a href="https://utp.zoom.us/j/9876543210" target="_blank" rel="noopener noreferrer" class="btn-zoom-live">
            <span>Entrar a Zoom</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 14px; height: 14px;">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>

      <!-- Header -->
      <div class="section-header">
        <div>
          <h3 class="title-text">Horario Semanal & Sesiones</h3>
          <p class="subtitle-text">
            {{ scheduleService.currentSchedule()?.periodName || '2026 - Ciclo 2 Agosto' }} • Semana {{ scheduleService.currentSchedule()?.weekNumber || 6 }} de 18
          </p>
        </div>

        <button class="btn-sync" (click)="refreshSchedule()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          <span>Sincronizar</span>
        </button>
      </div>

      <!-- Classes Grid -->
      <div class="classes-grid">
        @for (session of scheduleService.currentSchedule()?.classes; track session.id) {
          <div class="session-card">
            <div class="session-top">
              <span class="modality-pill" [class.pill-zoom]="session.modality === 'R'" [class.pill-presential]="session.modality === 'P'">
                {{ session.modality === 'R' ? 'Virtual Zoom' : 'Presencial' }}
              </span>
              <span class="section-tag mono">SECCIÓN {{ session.section }}</span>
            </div>

            <h4 class="session-name">{{ session.courseName }}</h4>
            <p class="session-teacher">{{ session.teacher }}</p>

            <div class="session-bottom">
              <div class="location-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 13px; height: 13px; color: #71717a;">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{{ session.classroom }} • {{ session.building }}</span>
              </div>

              @if (session.zoomLink) {
                <a [href]="session.zoomLink" target="_blank" rel="noopener noreferrer" class="btn-card-zoom">
                  Zoom
                </a>
              }
            </div>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .schedule-root {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    /* Live Hero Banner */
    .hero-status-banner {
      background: linear-gradient(135deg, rgba(20, 20, 23, 0.95), rgba(25, 25, 30, 0.85));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 24px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    .status-left {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(187, 244, 81, 0.12);
      border: 1px solid rgba(187, 244, 81, 0.3);
      color: var(--accent-lime);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      width: fit-content;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-lime);
      animation: pulse-dot 1.5s infinite;
    }
    .class-hero-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #f5f2eb;
      letter-spacing: -0.01em;
    }
    .class-hero-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #a1a1aa;
    }
    .meta-separator { color: #3f3f46; }
    .btn-zoom-live {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 14px;
      background: var(--accent-lime);
      color: #0a0a0c;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-decoration: none;
      box-shadow: 0 6px 20px rgba(187, 244, 81, 0.25);
      transition: all 0.2s;
    }
    .btn-zoom-live:hover {
      background: #a8e63b;
      transform: translateY(-1px);
    }

    /* Section Header */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .title-text {
      font-size: 1.1rem;
      font-weight: 800;
      color: #ffffff;
    }
    .subtitle-text {
      font-size: 12px;
      color: #71717a;
      margin-top: 2px;
    }
    .btn-sync {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #d4d4d8;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-sync:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }

    /* Grid */
    .classes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
    }
    .session-card {
      background: #141417;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 18px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.2s;
    }
    .session-card:hover {
      background: #19191e;
      border-color: rgba(255, 255, 255, 0.12);
      transform: translateY(-2px);
    }
    .session-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .modality-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .pill-zoom {
      background: rgba(58, 134, 255, 0.12);
      color: #60a5fa;
      border: 1px solid rgba(58, 134, 255, 0.25);
    }
    .pill-presential {
      background: rgba(187, 244, 81, 0.12);
      color: var(--accent-lime);
      border: 1px solid rgba(187, 244, 81, 0.25);
    }
    .section-tag {
      font-size: 10px;
      color: #71717a;
      letter-spacing: 0.05em;
    }
    .session-name {
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.35;
    }
    .session-teacher {
      font-size: 11.5px;
      color: #a1a1aa;
    }
    .session-bottom {
      margin-top: auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .location-box {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #71717a;
    }
    .btn-card-zoom {
      padding: 4px 10px;
      border-radius: 8px;
      background: rgba(58, 134, 255, 0.15);
      border: 1px solid rgba(58, 134, 255, 0.3);
      color: #93c5fd;
      font-size: 11px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-card-zoom:hover {
      background: rgba(58, 134, 255, 0.3);
      color: #ffffff;
    }
  `]
})
export class ScheduleViewComponent implements OnInit {
  constructor(public scheduleService: ScheduleService) {}

  ngOnInit(): void {
    this.scheduleService.getSchedule().subscribe();
  }

  refreshSchedule(): void {
    this.scheduleService.syncSchedule().subscribe();
  }
}
