import { Component, EventEmitter, Input, OnInit, Output, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  UTPEvent, 
  UTPCurrentInterval, 
  CourseAssignment, 
  TaskWithSyllabusContext, 
  AssignmentRubric, 
  CourseEvaluation,
  ChatMessage
} from '@domain/models/utp.model';
import { TaskSyncItem } from '@domain/models/task.model';
import { 
  getCurrentAndNextClass, 
  getEventsForDay, 
  formatTime, 
  parseEventTitle, 
  parseDate,
  formatCourseName,
  getDynamicStudentEvaluations,
  getCanonicalCourseKey 
} from '@data/schedule-parser';
import { getSynchronizedStudentTasks, calculateActivityUrgency, ActivityUrgency } from '@data/activity-adapter';
import { getSyllabusWeekContext } from '@data/syllabus-engine';
import { resolveEventLocation, getClassroomLocation } from '@data/classroom-helper';
import { getCachedCalendarData, saveCachedCalendarData, getCachedSyllabus, getAllCachedSyllabi } from '@data/syllabus/client-storage';
import { getAuroraStyle } from '@data/aurora.helper';
import { ScheduleService } from '@data/services/schedule.service';
import { TaskService } from '@data/services/task.service';
import { ClassDetailModalComponent } from '@features/schedule/class-detail-modal.component';
import { TodayStore } from './today.store';
import { LucideAngularModule } from 'lucide-angular';

export type TodayTabSection = 'todayClasses' | 'tasks' | 'evaluations';

@Component({
  selector: 'app-today-view',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ClassDetailModalComponent, 
    LucideAngularModule
  ],
  styles: [`
    .tn { font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }
    svg.i, lucide-icon.i { width: 15px; height: 15px; stroke-width: 1.75; flex: none; display: inline-flex; align-items: center; justify-content: center; }
    .today-layout { width: 100%; display: flex; flex-direction: column; gap: 24px; padding-bottom: 60px; }
    @media(min-width: 1024px) {
      .today-layout { display: grid; grid-template-columns: 380px 1fr; gap: 32px; align-items: start; padding-bottom: 24px; }
      .today-sidebar { position: sticky; top: 24px; display: flex; flex-direction: column; gap: 16px; }
      .today-content { min-width: 0; }
    }
    @media(min-width: 1280px) {
      .today-layout { grid-template-columns: 420px 1fr; gap: 36px; }
    }
    .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 4px; }
    .date { font-size: 13px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; }
    h1 { font-size: 34px; line-height: 1; font-weight: 800; letter-spacing: -0.035em; color: var(--foreground); }
    .clock { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--text-muted); padding: 6px 12px; border: 1px solid var(--border-subtle); border-radius: var(--r-control-md); background: var(--surface-card); }
    .dot { width: 8px; height: 8px; border-radius: 9999px; background: var(--text-muted); flex: none; }
    .dot.live { background: var(--accent-lime); animation: dotPulse 1.8s ease-out infinite; }
    @keyframes dotPulse { 0% { box-shadow: 0 0 0 0 rgba(187, 244, 81, 0.4); } 100% { box-shadow: 0 0 0 7px rgba(187, 244, 81, 0); } }
    .hero { background: var(--utopik-carbon-black); border: 1px solid var(--border-subtle); border-radius: var(--r-card); padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .hero.live { border-color: rgba(187, 244, 81, 0.35); }
    .hero-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 14px; }
    .status { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--foreground); }
    .hero.next .status { color: var(--accent-orange); }
    .hero h2 { font-size: 20px; line-height: 1.25; font-weight: 700; letter-spacing: -0.02em; color: var(--foreground); margin-bottom: 6px; }
    .code { font-size: 12px; color: var(--text-muted); font-weight: 500; }
    .times { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin: 18px 0 8px; color: var(--utopik-platinum); }
    .bar { height: 4px; border-radius: var(--r-control-xs); background: rgba(255, 255, 255, 0.1); overflow: hidden; }
    .bar > i { display: block; height: 100%; background: var(--accent-lime); border-radius: inherit; transition: width 400ms ease-out; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
    .cell { background: rgba(0, 0, 0, 0.28); border: 1px solid var(--border-subtle); border-radius: var(--r-panel); padding: 10px 12px; min-height: 48px; }
    .cell small { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); font-weight: 500; margin-bottom: 3px; }
    .cell b { font-size: 13px; font-weight: 600; display: block; color: var(--foreground); }
    .na { color: var(--text-muted) !important; font-weight: 400 !important; font-style: normal; }
    .free { display: flex; gap: 16px; align-items: center; }
    .free svg { width: 56px; height: 56px; flex: none; stroke: var(--border-medium); fill: none; }
    .free h2 { font-size: 18px; margin-bottom: 4px; }
    .free p { font-size: 13px; color: var(--text-muted); line-height: 1.5; }
    .badge { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: var(--r-control-xs); font-size: 11px; font-weight: 600; border: 1px solid; white-space: nowrap; }
    .b-presencial { background: var(--badge-solid-presencial-bg); color: var(--badge-solid-presencial-text); border-color: var(--badge-solid-presencial-border); }
    .b-zoom { background: var(--badge-solid-zoom-bg); color: var(--badge-solid-zoom-text); border-color: var(--badge-solid-zoom-border); }
    .b-virtual { background: var(--badge-solid-virtual-bg); color: var(--badge-solid-virtual-text); border-color: var(--badge-solid-virtual-border); }
    .chip { display: inline-flex; align-items: center; height: 26px; padding: 0 10px; border-radius: var(--r-control-md); font-size: 11px; font-weight: 600; background: var(--surface-subtle); color: var(--text-muted); border: 1px solid var(--border-subtle); transition: all 150ms ease-out; }
    .chip.on { color: var(--accent-lime); border-color: rgba(187, 244, 81, 0.4); background: rgba(187, 244, 81, 0.08); }
    .chip.nx { color: var(--accent-orange); border-color: rgba(238, 150, 75, 0.4); background: rgba(238, 150, 75, 0.08); }
    .seg { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--r-panel); padding: 4px; margin-bottom: 16px; }
    .seg .thumb { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / 3); background: var(--surface-subtle); border: 1px solid var(--border-medium); border-radius: var(--r-control-md); transition: transform 200ms ease-out; }
    .seg button { position: relative; z-index: 1; height: 38px; padding: 0 8px; display: flex; align-items: center; justify-content: center; border: 0; background: none; cursor: pointer; color: var(--text-muted); transition: color 150ms ease-out; }
    .seg button .tab-inner { display: inline-flex; align-items: baseline; gap: 6px; font-size: 13px; font-weight: 500; line-height: 1; color: inherit; }
    .seg button .tn { font-size: 13px; font-weight: 600; line-height: 1; color: inherit; }
    .seg button[aria-selected="true"] { color: var(--foreground); }
    .panels { overflow: hidden; }
    .tl { list-style: none; padding: 0; margin: 0; position: relative; }
    .tl li { display: grid; grid-template-columns: 56px 1fr; gap: 12px; position: relative; padding-bottom: 12px; }
    .tl .t { font-size: 13px; font-weight: 600; line-height: 1.3; padding-top: 14px; color: var(--foreground); }
    .tl .t span { display: block; color: var(--text-muted); font-weight: 400; font-size: 12px; }
    .card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--r-panel); padding: 14px; transition: background 150ms ease-out, border-color 150ms ease-out; }
    .card:hover { background: var(--surface-card-hover); border-color: var(--border-medium); }
    li.done .card { opacity: 0.55; }
    li.live .card { border-color: rgba(187, 244, 81, 0.4); background: rgba(30, 32, 25, 0.8); }
    .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .card h3 { font-size: 14.5px; font-weight: 600; line-height: 1.35; margin: 6px 0 10px; color: var(--foreground); letter-spacing: -0.01em; }
    .facts { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: var(--text-muted); align-items: center; }
    .facts span { display: inline-flex; align-items: center; gap: 5px; min-height: 20px; }
    .sec { font-size: 12px; font-weight: 600; color: var(--text-muted); margin: 4px 0 10px; }
    .list { display: grid; gap: 10px; list-style: none; padding: 0; margin: 0; }
    .task-grid { display: grid; grid-template-columns: 1fr; gap: 12px; list-style: none; padding: 0; margin: 0; }
    @media(min-width: 1100px) {
      .task-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .urg-badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: var(--r-control-xs); }
    .urg-badge.hoy { background: rgba(238, 150, 75, 0.15); color: var(--accent-orange); border: 1px solid rgba(238, 150, 75, 0.3); }
    .urg-badge.man { background: rgba(187, 244, 81, 0.15); color: var(--accent-lime); border: 1px solid rgba(187, 244, 81, 0.3); }
    .urg-badge.sem { background: var(--surface-subtle); color: var(--text-muted); border: 1px solid var(--border-subtle); }
    .w { font-size: 18px; font-weight: 700; color: var(--accent-lime); letter-spacing: -0.02em; }
    .topics { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-subtle); font-size: 12.5px; color: var(--text-muted); line-height: 1.5; }
    .sk { background: linear-gradient(90deg, var(--surface-card) 0%, var(--surface-subtle) 50%, var(--surface-card) 100%); background-size: 200% 100%; animation: skeletonShimmer 1.4s linear infinite; border-radius: var(--r-panel); }
    @keyframes skeletonShimmer { to { background-position: -200% 0; } }
  `],
  template: `
    <div class="today-layout text-white font-sans text-left">
      <!-- Columna Izquierda: Header + Sticky Hero Card -->
      <aside class="today-sidebar">
        <!-- Header Editorial -->
        <header class="head">
          <div>
            <p class="date">{{ formattedTodayDate }} · Semana {{ currentWeek }}</p>
            <h1>Hoy</h1>
          </div>
          <div class="clock" role="timer" aria-label="Hora actual">
            <span class="dot" [class.live]="isLiveNow"></span>
            <span class="tn">{{ now | date:'HH:mm' }}</span>
          </div>
        </header>

        @if (isLoading) {
          <div class="hero-slot">
            <div class="sk" style="height:268px"></div>
          </div>
        } @else {
          <!-- Hero Card Slot -->
          <div class="hero-slot">
            @if (bannerClass && isLiveNow) {
            <article class="hero live" aria-live="polite">
              <div class="hero-top">
                <span class="status">
                  <span class="dot live"></span>
                  En vivo · Queda {{ minutesRemainingCurrent }} min
                </span>
                <span class="badge" [ngClass]="getModalityBadgeClass(bannerClass.modality)">
                  {{ getModalityLabel(bannerClass.modality) }}
                </span>
              </div>
              <span class="code">{{ getCourseCode(bannerClass) }}</span>
              <h2>{{ parsedBannerTitle }}</h2>
              <div class="times tn">
                <span>{{ formatTime(bannerClass.startAt) }}</span>
                <span>{{ formatTime(bannerClass.finishAt) }}</span>
              </div>
              <div class="bar" role="progressbar" [attr.aria-valuenow]="currentClassProgressPct" aria-valuemin="0" aria-valuemax="100">
                <i [style.width.%]="currentClassProgressPct"></i>
              </div>
              <div class="meta">
                <div class="cell">
                  <small>
                    <lucide-icon name="map-pin" class="i"></lucide-icon>
                    Aula
                  </small>
                  <b>{{ getLocation(bannerClass).aula || 'Por asignar' }}</b>
                </div>
                <div class="cell">
                  <small>
                    <lucide-icon name="user" class="i"></lucide-icon>
                    Docente
                  </small>
                  <b [class.na]="!getTeacher(bannerClass)">{{ getTeacher(bannerClass) || 'Por asignar' }}</b>
                </div>
              </div>
              <div class="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                @if (bannerClass.metadata?.zoomLink) {
                  <a
                    [href]="bannerClass.metadata?.zoomLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 r-control-md bg-white/10 hover:bg-white/20 text-white text-xs font-semibold no-underline transition"
                  >
                    <lucide-icon name="video" class="i"></lucide-icon>
                    <span>Unirse a Zoom</span>
                  </a>
                }
                <button
                  (click)="onAskAiClick('¿Qué temas tocan hoy en ' + parsedBannerTitle + ' y qué preguntas clave debería hacer en clase?')"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 r-control-md bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                >
                  <lucide-icon name="sparkles" class="i text-[var(--accent-lime)]"></lucide-icon>
                  <span>Consultar IA</span>
                </button>
                <button
                  (click)="selectedEventForModal = bannerClass"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 r-control-md bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white text-xs font-semibold transition cursor-pointer ml-auto"
                >
                  <span>Ver detalles</span>
                  <lucide-icon name="chevron-right" class="i"></lucide-icon>
                </button>
              </div>
            </article>
          } @else if (bannerClass && !isLiveNow) {
            <article class="hero next">
              <div class="hero-top">
                <span class="status">
                  <lucide-icon name="clock" class="i"></lucide-icon>
                  Próxima en {{ minutesToNext !== null && minutesToNext <= 120 ? minutesToNext + ' min' : (minutesToNext ? (minutesToNext / 60 | number:'1.0-0') + ' h' : 'breve') }}
                </span>
                <span class="badge" [ngClass]="getModalityBadgeClass(bannerClass.modality)">
                  {{ getModalityLabel(bannerClass.modality) }}
                </span>
              </div>
              <span class="code">{{ getCourseCode(bannerClass) }}</span>
              <h2>{{ parsedBannerTitle }}</h2>
              <div class="times tn">
                <span>{{ formatTime(bannerClass.startAt) }}</span>
                <span>{{ formatTime(bannerClass.finishAt) }}</span>
              </div>
              <div class="bar"><i style="width:0%"></i></div>
              <div class="meta">
                <div class="cell">
                  <small>
                    <lucide-icon name="map-pin" class="i"></lucide-icon>
                    Aula
                  </small>
                  <b>{{ getLocation(bannerClass).aula || 'Por asignar' }}</b>
                </div>
                <div class="cell">
                  <small>
                    <lucide-icon name="user" class="i"></lucide-icon>
                    Docente
                  </small>
                  <b [class.na]="!getTeacher(bannerClass)">{{ getTeacher(bannerClass) || 'Por asignar' }}</b>
                </div>
              </div>
              <div class="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                @if (bannerClass.metadata?.zoomLink) {
                  <a
                    [href]="bannerClass.metadata?.zoomLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 r-control-md bg-white/10 hover:bg-white/20 text-white text-xs font-semibold no-underline transition"
                  >
                    <lucide-icon name="video" class="i"></lucide-icon>
                    <span>Unirse a Zoom</span>
                  </a>
                }
                <button
                  (click)="onAskAiClick('¿Qué temas tocan hoy en ' + parsedBannerTitle + ' y qué preguntas clave debería hacer en clase?')"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 r-control-md bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                >
                  <lucide-icon name="sparkles" class="i text-[var(--accent-orange)]"></lucide-icon>
                  <span>Consultar IA</span>
                </button>
                <button
                  (click)="selectedEventForModal = bannerClass"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 r-control-md bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white text-xs font-semibold transition cursor-pointer ml-auto"
                >
                  <span>Ver detalles</span>
                  <lucide-icon name="chevron-right" class="i"></lucide-icon>
                </button>
              </div>
            </article>
          } @else {
            <article class="hero">
              <div class="free">
                <svg viewBox="0 0 72 72" aria-hidden="true">
                  <circle cx="36" cy="36" r="34"/>
                  <circle cx="36" cy="36" r="22"/>
                  <circle cx="36" cy="36" r="10"/>
                  <path d="M2 36h68"/>
                </svg>
                <div>
                  <h2>Sin más clases hoy</h2>
                  <p>Completaste las sesiones del día. ¡Aprovecha para repasar tus tareas y proyectos!</p>
                </div>
              </div>
            </article>
          }
        </div>
      }
    </aside>

    <!-- Columna Derecha: Tabs y Contenido -->
    <div class="today-content">
      @if (isLoading) {
        <section class="tabs-slot" aria-label="Cargando contenido">
          <div class="sk" style="height:112px;margin-bottom:12px"></div>
          <div class="sk" style="height:112px;margin-bottom:12px"></div>
          <div class="sk" style="height:112px"></div>
        </section>
      } @else {
        <section class="tabs-slot" aria-label="Contenido del día">
          <div class="seg" role="tablist">
            <i class="thumb" [style.transform]="'translateX(' + (activeSection === 'todayClasses' ? '0%' : activeSection === 'tasks' ? '100%' : '200%') + ')'"></i>
            <button
              role="tab"
              [attr.aria-selected]="activeSection === 'todayClasses'"
              (click)="activeSection = 'todayClasses'"
            >
              <span class="tab-inner">
                <span>Clases</span>
                <span class="tn">{{ todayEvents.length }}</span>
              </span>
            </button>
            <button
              role="tab"
              [attr.aria-selected]="activeSection === 'tasks'"
              (click)="activeSection = 'tasks'"
            >
              <span class="tab-inner">
                <span>Tareas</span>
                <span class="tn">{{ synchronizedTasks.length }}</span>
              </span>
            </button>
            <button
              role="tab"
              [attr.aria-selected]="activeSection === 'evaluations'"
              (click)="activeSection = 'evaluations'"
            >
              <span class="tab-inner">
                <span>Evaluaciones</span>
                <span class="tn">{{ sortedEvaluations.length }}</span>
              </span>
            </button>
          </div>

          <div class="panels">
        
        <!-- Panel 0: Clases de Hoy -->
        @if (activeSection === 'todayClasses') {
          @if (todayEvents.length === 0) {
            <div class="card p-8 text-center text-sm text-[var(--text-muted)] space-y-2">
              <p class="font-bold text-[var(--utopik-platinum)]">No tienes sesiones programadas para hoy</p>
              <p class="text-xs">Revisa tu horario semanal para ver los próximos días.</p>
              <button
                (click)="navigateToWeekly.emit()"
                class="inline-flex items-center gap-1.5 text-xs text-[var(--accent-lime)] hover:underline font-semibold mt-2 cursor-pointer"
              >
                <span>Ver horario semanal completo</span>
                <lucide-icon name="arrow-right" class="i"></lucide-icon>
              </button>
            </div>
          } @else {
            <ol class="tl">
              @for (c of todayEvents; track c.id) {
                <li [ngClass]="getClassStatus(c)">
                  <div class="t tn">
                    {{ formatTime(c.startAt) }}
                    <span>{{ formatTime(c.finishAt) }}</span>
                  </div>
                  <div class="card cursor-pointer" (click)="selectedEventForModal = c">
                    <div class="row">
                      <span class="code">{{ getCourseCode(c) }}</span>
                      @if (getClassStatus(c) === 'done') {
                        <span class="chip">Completada</span>
                      } @else if (getClassStatus(c) === 'live') {
                        <span class="chip on">En curso</span>
                      } @else if (isNextClass(c)) {
                        <span class="chip nx">Siguiente</span>
                      } @else {
                        <span class="chip">Pendiente</span>
                      }
                    </div>
                    <h3>{{ getCourseTitle(c) }}</h3>
                    <div class="facts">
                      <span>
                        <lucide-icon name="user" class="i"></lucide-icon>
                        {{ getTeacher(c) || 'Por asignar' }}
                      </span>
                      <span>
                        <lucide-icon name="map-pin" class="i"></lucide-icon>
                        {{ getLocation(c).aula || 'Por asignar' }}
                      </span>
                      <span class="badge" [ngClass]="getModalityBadgeClass(c.modality)">
                        {{ getModalityLabel(c.modality) }}
                      </span>
                      @if (c.modality === 'R' && c.metadata?.zoomLink) {
                        <button
                          (click)="openZoomDirect($event, c.metadata?.zoomLink)"
                          title="Unirse a Zoom"
                          class="inline-flex items-center gap-1 px-2 py-0.5 r-control-xs bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold cursor-pointer ml-auto"
                        >
                          <lucide-icon name="video" class="i"></lucide-icon>
                          <span>Zoom</span>
                        </button>
                      }
                    </div>
                  </div>
                </li>
              }
            </ol>
          }
        }

        <!-- Panel 1: Tareas -->
        @if (activeSection === 'tasks') {
          <div class="space-y-3">
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                (click)="taskFilter = 'all'"
                class="chip cursor-pointer transition text-xs"
                [ngClass]="taskFilter === 'all' ? 'on font-bold' : ''"
              >
                Todas ({{ synchronizedTasks.length }})
              </button>
              <button
                (click)="taskFilter = 'homework'"
                class="chip cursor-pointer transition text-xs"
                [ngClass]="taskFilter === 'homework' ? 'on font-bold' : ''"
              >
                Tareas ({{ homeworkTasksCount }})
              </button>
              <button
                (click)="taskFilter = 'forum'"
                class="chip cursor-pointer transition text-xs"
                [ngClass]="taskFilter === 'forum' ? 'on font-bold' : ''"
              >
                Foros ({{ forumTasksCount }})
              </button>
              <button
                (click)="taskFilter = 'graded'"
                class="chip cursor-pointer transition text-xs"
                [ngClass]="taskFilter === 'graded' ? 'nx font-bold' : ''"
              >
                Calificadas ({{ gradedTasksCount }})
              </button>
            </div>

            @if (filteredTasks.length === 0) {
              <div class="card p-8 text-center text-sm text-[var(--text-muted)] space-y-2">
                <p class="font-bold text-[var(--utopik-platinum)]">Sin tareas en este filtro</p>
                <p class="text-xs">No tienes entregables pendientes en esta categoría para la semana.</p>
              </div>
            } @else {
              <ul class="task-grid">
                @for (item of filteredTasks; track item.task.id) {
                  <li class="card flex flex-col justify-between hover:border-[var(--border-medium)] transition-all">
                    <div>
                      <div class="row items-center mb-2">
                        <span class="urg-badge" [ngClass]="getTaskUrgencyClass(item.task).code">
                          {{ getTaskUrgencyClass(item.task).label }}
                        </span>
                        <div class="flex items-center gap-1.5">
                          @if (item.task.status === 'submitted' || item.task.homeworkStatus === 'DELIVERED') {
                            <span class="chip on text-[10.5px]">
                              <lucide-icon name="check-circle-2" class="i text-[var(--accent-lime)]"></lucide-icon>
                              <span>Entregado</span>
                            </span>
                          }
                          <span class="chip text-[10.5px]">
                            {{ item.task.activityType === 'FORUM' ? 'Foro' : 'Tarea' }}
                          </span>
                        </div>
                      </div>

                      <h3 class="text-sm font-bold text-white tracking-tight leading-snug line-clamp-2 my-2">
                        {{ item.task.title }}
                      </h3>

                      <div class="facts">
                        <span>
                          <lucide-icon name="file-text" class="i"></lucide-icon>
                          {{ formatCourse(item.task.courseName) }}
                        </span>
                        @if (item.task.week) {
                          <span>Semana {{ item.task.week }}</span>
                        }
                        @if (item.task.evaluationSystem) {
                          <span class="chip nx text-[10.5px] py-0 px-1.5">
                            {{ item.task.evaluationSystem }}
                            @if (item.syllabusContext.formulaWeight) {
                              ({{ item.syllabusContext.formulaWeight }}%)
                            }
                          </span>
                        } @else if (item.syllabusContext.officialEvaluation && isTaskTitleMatchingEval(item.task.title, item.syllabusContext.officialEvaluation.code)) {
                          <span class="chip nx text-[10.5px] py-0 px-1.5">
                            {{ item.syllabusContext.officialEvaluation.code }} ({{ item.syllabusContext.formulaWeight }}%)
                          </span>
                        }
                      </div>
                    </div>

                    <div>
                      <div class="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[var(--border-subtle)]">
                        @if (item.task.instructionsHtml) {
                          <button
                            (click)="selectedTaskForInstructions = item.task"
                            class="chip cursor-pointer hover:text-white text-xs"
                            title="Ver indicaciones oficiales"
                          >
                            <lucide-icon name="file-text" class="i mr-1"></lucide-icon>
                            <span>Indicaciones</span>
                          </button>
                        }
                        @if (item.task.rubric) {
                          <button
                            (click)="openRubric(item.task.rubric, item.task.title, item.task.courseName)"
                            class="chip cursor-pointer hover:text-white text-xs"
                            title="Ver rúbrica de calificación"
                          >
                            <lucide-icon name="award" class="i mr-1"></lucide-icon>
                            <span>Rúbrica</span>
                          </button>
                        }
                        <button
                          (click)="onAskAiClick('¿Cómo resuelvo la actividad &quot;' + item.task.title + '&quot; del curso &quot;' + item.task.courseName + '&quot; según el sílabo y rúbrica oficial?')"
                          class="chip cursor-pointer hover:text-white ml-auto text-[var(--accent-orange)] text-xs"
                          title="Consultar al Copiloto IA"
                        >
                          <lucide-icon name="sparkles" class="i mr-1"></lucide-icon>
                          <span>Copiloto</span>
                        </button>
                        <button
                          (click)="expandedTaskIds[item.task.id] = !expandedTaskIds[item.task.id]"
                          class="chip cursor-pointer hover:text-white"
                          title="Ver contexto del sílabo"
                        >
                          <lucide-icon [name]="expandedTaskIds[item.task.id] ? 'chevron-up' : 'chevron-down'" class="i"></lucide-icon>
                        </button>
                      </div>

                      @if (expandedTaskIds[item.task.id]) {
                        <div class="topics">
                          <div class="flex items-center gap-1.5 font-semibold text-[var(--foreground)] mb-1">
                            <lucide-icon name="book-open" class="i text-[var(--accent-lime)]"></lucide-icon>
                            <span>Contexto del Sílabo</span>
                          </div>
                          <p class="text-xs text-[var(--text-muted)]">
                            {{ item.task.syllabusCorrelation?.syllabusUnit || item.syllabusContext.unitTitle }}
                          </p>
                          @if (item.task.syllabusCorrelation?.syllabusTopic) {
                            <p class="text-xs text-[var(--foreground)] mt-1">
                              Tema: {{ item.task.syllabusCorrelation?.syllabusTopic }}
                            </p>
                          } @else if (item.syllabusContext.sessionTopics.length > 0) {
                            <p class="text-xs text-[var(--foreground)] mt-1">
                              Tema: {{ item.syllabusContext.sessionTopics[0] }}
                            </p>
                          }
                        </div>
                      }
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        }

        <!-- Panel 2: Evaluaciones Oficiales -->
        @if (activeSection === 'evaluations') {
          <div>
            <p class="sec">Semana {{ currentWeek }} · según sílabo oficial ({{ sortedEvaluations.length }})</p>
            @if (sortedEvaluations.length === 0) {
              <div class="card p-8 text-center text-sm text-[var(--text-muted)] space-y-2">
                <p class="font-bold text-[var(--utopik-platinum)]">No hay evaluaciones registradas</p>
                <p class="text-xs">Revisa los sílabos de tus cursos para conocer las fechas de evaluación.</p>
              </div>
            } @else {
              <ul class="list">
                @for (ev of sortedEvaluations; track ev.id) {
                  <li class="card">
                    <div class="row">
                      <div>
                        <span class="code">{{ ev.courseName.split(' - ')[0] }}</span>
                        <h3 style="margin-bottom: 0;">
                          {{ ev.code }} · Semana {{ ev.week }}
                          @if (ev.week === currentWeek) {
                            <span class="chip on ml-1.5 text-[10px]">Esta semana</span>
                          }
                        </h3>
                      </div>
                      <span class="w tn">{{ ev.weightPercent }}%</span>
                    </div>

                    @if (ev.description || getEvaluationTopics(ev.courseName)) {
                      <p class="topics">{{ ev.description || getEvaluationTopics(ev.courseName) }}</p>
                    }

                    <div class="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                      <button
                        (click)="selectedCourseForSyllabus = ev.courseName; isSyllabusModalOpen = true"
                        class="chip cursor-pointer hover:text-white"
                        title="Ver sílabo completo"
                      >
                        <lucide-icon name="book-open" class="i mr-1 text-[var(--accent-lime)]"></lucide-icon>
                        Sílabo
                      </button>
                      <button
                        (click)="onAskAiClick('¿Cómo prepararme para ' + ev.code + ' (' + ev.fullName + ') de ' + ev.courseName + ' y qué rúbrica evalúa la UTP para sacar 20?')"
                        class="chip cursor-pointer hover:text-white ml-auto"
                        title="Consultar al Copiloto IA"
                      >
                        <lucide-icon name="sparkles" class="i mr-1 text-[var(--accent-orange)]"></lucide-icon>
                        Consultar Copiloto
                      </button>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        }
      </div>
    </section>
  }
</div>

        <!-- MODAL: Detalle de Clase -->
        <app-class-detail-modal
          [isOpen]="!!selectedEventForModal"
          [event]="selectedEventForModal"
          [weekNumber]="currentWeek"
          [interval]="currentInterval"
          (close)="selectedEventForModal = null"
          (openGlobalAi)="onAskAiClick($event)"
        />

        <!-- MODAL: Rúbrica -->
        @if (activeRubric) {
          <div 
            class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
            (click)="activeRubric = null"
          >
            <div 
              class="relative flex flex-col w-full max-w-3xl max-h-[85vh] r-control-sm bg-[var(--utopik-carbon-black)] text-white shadow-2xl overflow-hidden"
              (click)="$event.stopPropagation()"
            >
              <div class="bg-[var(--utopik-carbon-black)] px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold text-white">{{ activeRubric.taskTitle }}</h3>
                  <p class="text-xs text-neutral-400">{{ activeRubric.courseName }} • Rúbrica Oficial (Total: {{ activeRubric.rubric.totalPoints }} pts)</p>
                </div>
                <button 
                  (click)="activeRubric = null" 
                  aria-label="Cerrar rúbrica"
                  class="flex h-8 w-8 items-center justify-center r-control-md bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition cursor-pointer shrink-0"
                >
                  <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
                </button>
              </div>
              <div class="flex-1 overflow-y-auto p-6 space-y-4">
                @for (crit of activeRubric.rubric.criteria; track crit.id) {
                  <div class="p-4 r-card bg-white/[0.02] space-y-2">
                    <div class="flex justify-between items-center">
                      <h4 class="text-sm font-bold text-white">{{ crit.title }}</h4>
                      <span class="text-xs font-bold text-[var(--utopik-green-yellow)]">Max: {{ crit.maxPoints }} pts</span>
                    </div>
                    <p class="text-xs text-neutral-400">{{ crit.description }}</p>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      @for (lvl of crit.levels; track lvl.name) {
                        <div class="p-2.5 r-panel bg-white/[0.03] space-y-1">
                          <div class="flex justify-between text-[11px] font-bold">
                            <span class="text-neutral-200">{{ lvl.name }}</span>
                            <span class="text-[var(--utopik-green-yellow)]">{{ lvl.points }} pts</span>
                          </div>
                          <p class="text-[10px] text-neutral-400 leading-snug">{{ lvl.description }}</p>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- MODAL: Indicaciones de Tarea -->
        @if (selectedTaskForInstructions) {
          <div 
            class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
            (click)="selectedTaskForInstructions = null"
          >
            <div 
              class="relative flex flex-col w-full max-w-2xl max-h-[85vh] r-control-sm bg-[var(--utopik-carbon-black)] text-white shadow-2xl overflow-hidden"
              (click)="$event.stopPropagation()"
            >
              <div class="bg-[var(--utopik-carbon-black)] px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 class="text-base font-bold text-white">{{ selectedTaskForInstructions.title }}</h3>
                  <p class="text-xs text-neutral-400">{{ selectedTaskForInstructions.courseName }} • Semana {{ selectedTaskForInstructions.week }}</p>
                </div>
                <button 
                  (click)="selectedTaskForInstructions = null" 
                  aria-label="Cerrar indicaciones"
                  class="flex h-8 w-8 items-center justify-center r-control-md bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition cursor-pointer shrink-0"
                >
                  <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
                </button>
              </div>
              <div class="flex-1 overflow-y-auto p-6 space-y-4 utp-instructions-content" [innerHTML]="selectedTaskForInstructions.instructionsHtml">
              </div>
            </div>
          </div>
        }
    </div>
  `
})
export class TodayViewComponent implements OnInit, OnDestroy {
  @Output() navigateToWeekly = new EventEmitter<void>();
  @Output() askAi = new EventEmitter<string>();

  isLoading = false;
  activeSection: TodayTabSection = 'todayClasses';
  taskFilter: 'all' | 'homework' | 'forum' | 'graded' = 'all';

  /** Telemetría [TODAY-VIEW] (F12): arrancada del skeleton de horario y de la petición de tareas. */
  private scheduleSkeletonStart = 0;
  private tasksRequestStart = 0;
  private tasksArrived = true;

  readonly todayStore = inject(TodayStore);

  get now(): Date {
    return this.todayStore.now();
  }

  get bannerClass(): UTPEvent | null {
    return this.todayStore.currentClass() || this.todayStore.nextClass();
  }

  get isLiveNow(): boolean {
    return !!this.todayStore.currentClass();
  }

  get minutesRemainingCurrent(): number | null {
    return this.todayStore.minutesRemainingCurrent();
  }

  get minutesToNext(): number | null {
    return this.todayStore.minutesToNext();
  }

  get todayEvents(): UTPEvent[] {
    return this.todayStore.eventsForToday();
  }

  currentInterval: UTPCurrentInterval = {
    period_name: '2026 - Ciclo 2 Agosto',
    week_number: 6,
    total_weeks: 18,
    current_date: new Date().toISOString(),
    start_of_interval: new Date().toISOString(),
    end_of_interval: new Date().toISOString(),
    start_of_period: new Date().toISOString(),
    end_of_period: new Date().toISOString(),
    events: []
  };

  currentWeek = 6;
  totalWeeks = 18;
  periodName = '2026 - Ciclo 2 Agosto';

  synchronizedTasks: TaskWithSyllabusContext[] = [];
  sortedEvaluations: CourseEvaluation[] = [];

  expandedTaskIds: Record<string, boolean> = {};

  // Modals state
  selectedEventForModal: UTPEvent | null = null;
  activeRubric: { rubric: AssignmentRubric; taskTitle: string; courseName: string } | null = null;
  selectedTaskForInstructions: CourseAssignment | null = null;
  selectedCourseForSyllabus: string | null = null;
  isSyllabusModalOpen = false;

  auroraStyle = getAuroraStyle(42);
  private readonly taskService = inject(TaskService);

  constructor(public scheduleService: ScheduleService) {}

  ngOnInit(): void {
    this.refreshData();
  }

  ngOnDestroy(): void {
    // Ciclo de reloj gestionado por TodayStore
  }

  refreshData(): void {
    const refreshStartedAt = performance.now();
    const cachedCalendar = getCachedCalendarData();
    const interval = cachedCalendar?.data?.current_interval || this.scheduleService.currentInterval();
    if (interval && interval.events && interval.events.length > 0) {
      this.isLoading = false;
      console.log(`[TODAY-VIEW] ⚡ Horario pintado de inmediato desde LocalStorage (${interval.events.length} evento/s, ${(performance.now() - refreshStartedAt).toFixed(1)}ms, skeleton innecesario)`);
      const regularEvents = interval.events.filter(e => !e.isLongLasting && e.modality !== 'VT');
      this.currentInterval = {
        ...interval,
        events: regularEvents
      };
      this.currentWeek = this.currentInterval.week_number || 1;
      this.totalWeeks = this.currentInterval.total_weeks || 18;
      this.periodName = this.currentInterval.period_name || '2026 - Ciclo 2 Agosto';
      this.calculateCurrentBanner();
    } else {
      this.scheduleSkeletonStart = refreshStartedAt;
      this.isLoading = true;
      console.log('[TODAY-VIEW] ⏳ Skeletons activados. Esperando: [Horario, Tareas]');
      this.loadScheduleFromBackend();
    }

    this.updateStudentEvaluationsAndTasks();
    this.calculateCurrentBanner();
  }

  updateStudentEvaluationsAndTasks(): void {
    const enrolledKeys = new Set<string>();
    const events = this.currentInterval?.events || [];
    for (const ev of events) {
      if (ev.metadata?.courseName) enrolledKeys.add(getCanonicalCourseKey(ev.metadata.courseName));
      if (ev.metadata?.courseId) enrolledKeys.add(getCanonicalCourseKey(ev.metadata.courseId));
      if (ev.metadata?.sectionCode) enrolledKeys.add(getCanonicalCourseKey(ev.metadata.sectionCode));
      const parsed = parseEventTitle(ev.title);
      if (parsed.cleanTitle) enrolledKeys.add(getCanonicalCourseKey(parsed.cleanTitle));
    }

    // 1. Cargar tareas oficiales en vivo desde el Backend / UTP Academic Gateway API
    this.loadTasksFromBackend(enrolledKeys);

    // 2. Filtrar evaluaciones estrictamente por los cursos matriculados del estudiante autenticado
    this.sortedEvaluations = getDynamicStudentEvaluations(enrolledKeys);
  }

  private loadTasksFromBackend(enrolledKeys: Set<string>): void {
    this.tasksArrived = false;
    const targetWeek = this.currentWeek || 1;
    this.tasksRequestStart = performance.now();
    this.taskService.getActivitiesByWeek(targetWeek).subscribe({
      next: (res) => {
        this.tasksArrived = true;
        console.log(`[TODAY-VIEW] 📥 Tareas/actividades recibidas en ${Math.round(performance.now() - this.tasksRequestStart)}ms (${res.data?.length ?? 0} ítems, semana ${targetWeek})`);
        if (res.success && res.data && res.data.length > 0) {
          const dynamicTasks: TaskWithSyllabusContext[] = res.data.map((u: TaskSyncItem) => {
            const isDelivered = u.isDelivered || u.studentStatus === 'DELIVERED' || u.studentStatus === 'SUBMITTED' || u.homeworkStatus === 'DELIVERED';
            const courseTitle = u.courseName || '';
            const week = u.week || u.weekNumber || targetWeek;
            const syllabusContext = getSyllabusWeekContext(courseTitle, week);
            const correlation = u.syllabusCorrelation;

            if (correlation && correlation.isSyllabusMatched) {
              if (correlation.syllabusUnit) syllabusContext.unitTitle = correlation.syllabusUnit;
              if (correlation.syllabusTopic) syllabusContext.sessionTopics = [correlation.syllabusTopic];
              if (correlation.weightPercent) syllabusContext.formulaWeight = correlation.weightPercent;
            }

            const actType = (u.type || u.activityType || '').toUpperCase().includes('FORUM') ? 'FORUM' : 'HOMEWORK';
            const evalSys = correlation?.evaluationType || u.evaluationSystem || null;
            const isGraded = Boolean(u.isQualified || evalSys || (u.classificationCategory && u.classificationCategory.includes('WEIGHTED')));

            const task: CourseAssignment = {
              id: u.id || u.homeworkId || u.activityId || `task-${Math.random()}`,
              courseId: u.courseId || u.sectionId || '',
              courseName: courseTitle,
              sectionCode: u.sectionId || '',
              title: u.title || 'Actividad Oficial',
              week: week,
              type: isGraded ? 'evaluation' : (actType === 'FORUM' ? 'practice' : 'homework'),
              dueDate: u.dueDate || u.finishAt || u.startAt || '',
              isGraded: isGraded,
              status: isDelivered ? 'submitted' : 'pending',
              homeworkStatus: u.homeworkStatus || u.studentStatus || 'PENDING',
              availableUntil: u.dueDate || u.finishAt,
              activityId: u.homeworkId || u.activityId,
              sectionId: u.sectionId,
              activityType: actType,
              evaluationSystem: evalSys,
              classificationCategory: u.classificationCategory,
              urgency: u.urgency,
              daysRemaining: u.daysRemaining,
              courseCode: u.courseCode || correlation?.courseCode,
              syllabusCorrelation: correlation
            };

            return { task, syllabusContext };
          });

          // Deduplicar por id Y por title+courseName para cubrir casos donde la API
          // retorna el mismo ítem con diferentes IDs (contentId vs activityId vs id)
          const seenIds = new Set<string>();
          const seenTitleKeys = new Set<string>();
          this.synchronizedTasks = dynamicTasks.filter(item => {
            const titleKey = `${item.task.courseName}||${item.task.title}`;
            if (seenIds.has(item.task.id) || seenTitleKeys.has(titleKey)) return false;
            seenIds.add(item.task.id);
            seenTitleKeys.add(titleKey);
            return true;
          });
        } else {
          // Fallback a /tasks (Read Model local con fallback del portal)
          console.warn(`[TODAY-VIEW] ⚠️ Actividades vacías para la semana ${targetWeek}: degradando a GET /tasks...`);
          this.taskService.getTasks().subscribe({
            next: (taskRes) => {
              console.log(`[TODAY-VIEW] 📥 Tareas (fallback /tasks) recibidas en ${Math.round(performance.now() - this.tasksRequestStart)}ms (${taskRes.data?.length ?? 0} ítems)`);
              if (taskRes.success && taskRes.data && taskRes.data.length > 0) {
                this.synchronizedTasks = taskRes.data.map((t: TaskSyncItem) => {
                  const week = t.week || this.currentWeek || 1;
                  const syllabusContext = getSyllabusWeekContext(t.courseName, week);
                  const correlation = t.syllabusCorrelation;
                  if (correlation && correlation.isSyllabusMatched) {
                    if (correlation.syllabusUnit) syllabusContext.unitTitle = correlation.syllabusUnit;
                    if (correlation.syllabusTopic) syllabusContext.sessionTopics = [correlation.syllabusTopic];
                    if (correlation.weightPercent) syllabusContext.formulaWeight = correlation.weightPercent;
                  }
                  const isDelivered = t.isDelivered || t.homeworkStatus === 'DELIVERED';
                  const task: CourseAssignment = {
                    id: t.id || `task-${Math.random()}`,
                    courseId: t.sectionId || '',
                    courseName: t.courseName || '',
                    sectionCode: t.sectionId || '',
                    title: t.title || 'Tarea UTP',
                    week: week,
                    type: 'evaluation',
                    dueDate: t.dueDate,
                    isGraded: true,
                    status: isDelivered ? 'submitted' : 'pending',
                    homeworkStatus: t.homeworkStatus || 'PENDING',
                    courseCode: t.courseCode || correlation?.courseCode,
                    syllabusCorrelation: correlation
                  };
                  return { task, syllabusContext };
                });
              } else {
                const fallback = getSynchronizedStudentTasks();
                this.synchronizedTasks = enrolledKeys.size > 0
                  ? fallback.filter(t => {
                      const cName = getCanonicalCourseKey(t.task.courseName || '');
                      const sCode = getCanonicalCourseKey(t.task.sectionCode || '');
                      return enrolledKeys.has(cName) || enrolledKeys.has(sCode) ||
                        Array.from(enrolledKeys).some(k => (cName && (cName.includes(k) || k.includes(cName))));
                    })
                  : [];
              }
            }
          });
        }
      },
      error: () => {
        console.warn(`[TODAY-VIEW] ⚠️ Error consultando actividades (semana ${targetWeek}) tras ${Math.round(performance.now() - this.tasksRequestStart)}ms: se sirve el fallback local`);
        const fallback = getSynchronizedStudentTasks();
        this.synchronizedTasks = enrolledKeys.size > 0
          ? fallback.filter(t => {
              const cName = getCanonicalCourseKey(t.task.courseName || '');
              const sCode = getCanonicalCourseKey(t.task.sectionCode || '');
              return enrolledKeys.has(cName) || enrolledKeys.has(sCode) ||
                Array.from(enrolledKeys).some(k => (cName && (cName.includes(k) || k.includes(cName))));
            })
          : [];
      }
    });
  }

  loadScheduleFromBackend(): void {
    this.scheduleService.getSchedule().subscribe({
      next: (res) => {
        const skeletonHeldMs = Math.round(performance.now() - this.scheduleSkeletonStart);
        this.isLoading = false;
        const stillWaiting = this.tasksArrived ? [] : ['Tareas'];
        console.log(`[TODAY-VIEW] 📥 Horario recibido en ${skeletonHeldMs}ms${stillWaiting.length ? `. Aún esperando: [${stillWaiting.join(', ')}]` : ''}`);
        console.log(`[TODAY-VIEW] ✨ Skeletons apagados tras ${skeletonHeldMs}ms totales.`);
        if (res.success && res.data) {
          this.currentWeek = res.data.weekNumber || 1;
          this.totalWeeks = res.data.totalWeeks || 18;
          this.periodName = res.data.periodName || '2026 - Ciclo 2 Agosto';
          if (res.data.classes && res.data.classes.length > 0) {
            const todayMs = Date.now();
            const today = new Date(todayMs);
            const dayOfWeek = today.getDay();
            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() + daysToMonday);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);

            this.currentInterval = {
              period_name: this.periodName,
              week_number: this.currentWeek,
              total_weeks: this.totalWeeks,
              current_date: new Date().toISOString(),
              start_of_interval: weekStart.toISOString(),
              end_of_interval: weekEnd.toISOString(),
              start_of_period: res.data.startDate ? res.data.startDate.toString() : new Date().toISOString(),
              end_of_period: res.data.endDate ? res.data.endDate.toString() : new Date().toISOString(),
              events: res.data.classes.map(c => ({
                id: c.id,
                title: `${c.courseName.toUpperCase()}${c.section && c.section !== 'Sección Única' ? ' (' + c.section + ')' : ''} (Semana ${this.currentWeek}) - Sesión`,
                modality: c.modality || 'P',
                type: 'SESSION',
                startAt: typeof c.startAt === 'string' ? c.startAt : (c.startAt ? String(c.startAt) : ''),
                finishAt: typeof c.finishAt === 'string' ? c.finishAt : (c.finishAt ? String(c.finishAt) : ''),
                metadata: {
                  courseId: c.courseCode,
                  courseName: c.courseName,
                  sectionCode: c.section,
                  sectionId: c.sectionId || (c.classLink ? c.classLink.match(/\/section\/([a-f0-9\-]+)/i)?.[1] : undefined),
                  classroom: c.classroom,
                  building: c.building,
                  floor: c.floor,
                  environmentType: c.environmentType,
                  teacher: c.teacher,
                  zoomLink: c.zoomLink,
                  classLink: c.classLink,
                  syllabusUrl: c.syllabusUrl
                }
              }))
            };
            saveCachedCalendarData({
              success: true,
              code: 200,
              message: 'Calendario sincronizado',
              idTransaction: 'sync-' + Date.now(),
              data: { current_interval: this.currentInterval }
            });
            this.updateStudentEvaluationsAndTasks();
            this.calculateCurrentBanner();
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.warn(`[TODAY-VIEW] ⚠️ Horario falló tras ${Math.round(performance.now() - this.scheduleSkeletonStart)}ms: skeletons apagados sin datos`, err);
      }
    });
  }

  calculateCurrentBanner(): void {
    // El estado temporal y eventos del día se calculan reactivamente en TodayStore
  }

  get parsedBannerTitle(): string {
    return this.bannerClass ? parseEventTitle(this.bannerClass.title).cleanTitle : '';
  }

  get formattedTodayDate(): string {
    const raw = this.now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    return raw.replace(/de\s+([a-z])/i, (_, m) => 'De ' + m.toUpperCase());
  }

  get filteredTasks(): TaskWithSyllabusContext[] {
    return this.synchronizedTasks.filter(item => {
      if (this.taskFilter === 'homework') {
        return item.task.activityType === 'HOMEWORK';
      }
      if (this.taskFilter === 'forum') {
        return item.task.activityType === 'FORUM';
      }
      if (this.taskFilter === 'graded') {
        return item.task.isGraded || Boolean(item.task.evaluationSystem);
      }
      return true;
    });
  }

  get homeworkTasksCount(): number {
    return this.synchronizedTasks.filter(item => item.task.activityType === 'HOMEWORK').length;
  }

  get forumTasksCount(): number {
    return this.synchronizedTasks.filter(item => item.task.activityType === 'FORUM').length;
  }

  get gradedTasksCount(): number {
    return this.synchronizedTasks.filter(item => item.task.isGraded || Boolean(item.task.evaluationSystem)).length;
  }

  formatTime(dateStr: string): string {
    return formatTime(dateStr);
  }

  getParsedTitle(title: string): string {
    return parseEventTitle(title).cleanTitle;
  }

  getLocationForEvent(ev: UTPEvent) {
    return resolveEventLocation(ev);
  }

  isSessionActive(ev: UTPEvent): boolean {
    const s = parseDate(ev.startAt);
    const f = parseDate(ev.finishAt);
    const isLive = this.now >= s && this.now <= f;
    const nextOrLive = this.todayEvents.find(e => parseDate(e.finishAt) >= this.now) || this.todayEvents[0];
    const isNext = !isLive && ev.id === nextOrLive?.id && this.now < s;
    return isLive || isNext;
  }

  openZoomDirect(e: Event, link?: string): void {
    e.stopPropagation();
    if (link) window.open(link, '_blank');
  }

  getTaskUrgency(task: CourseAssignment): ActivityUrgency | null {
    if (task.urgency) {
      if (task.urgency === 'DUE_THIS_WEEK' || task.urgency === 'URGENT') {
        const days = task.daysRemaining ?? 1;
        return {
          status: days <= 1 ? 'today' : 'upcoming',
          label: days <= 1 ? 'Vence pronto (esta semana)' : `Vence en ${days} días`,
          badgeVariant: days <= 1 ? 'orange' : 'neutral'
        };
      }
      if (task.urgency === 'UPCOMING') {
        const days = task.daysRemaining;
        return {
          status: 'upcoming',
          label: days ? `Vence en ${days} días` : 'Programado',
          badgeVariant: 'neutral'
        };
      }
    }
    const cleanDate = task.dueDate ? task.dueDate.replace(' ', 'T') : undefined;
    return calculateActivityUrgency(cleanDate);
  }

  openRubric(rubric: AssignmentRubric, taskTitle: string, courseName: string): void {
    this.activeRubric = { rubric, taskTitle, courseName };
  }

  onAskAiClick(prompt: string): void {
    this.askAi.emit(prompt);
  }

  isTaskTitleMatchingEval(title: string, evalCode?: string): boolean {
    if (!evalCode || !title) return false;
    const cleanTitle = title.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanCode = evalCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return cleanTitle.includes(cleanCode) || cleanCode.includes(cleanTitle);
  }

  getClassStatus(ev: UTPEvent): 'done' | 'live' | 'wait' {
    if (!ev.finishAt || !ev.startAt) return 'wait';
    const s = parseDate(ev.startAt);
    const f = parseDate(ev.finishAt);
    if (this.now >= f) return 'done';
    if (this.now >= s && this.now < f) return 'live';
    return 'wait';
  }

  isNextClass(ev: UTPEvent): boolean {
    const next = this.todayStore.nextClass();
    return Boolean(next && next.id === ev.id);
  }

  getCourseCode(ev: UTPEvent): string {
    const courseId = ev.metadata?.courseId?.trim();
    const title = (ev.metadata?.courseName || parseEventTitle(ev.title).cleanTitle || ev.title || '').trim();
    if (courseId && courseId.toLowerCase() !== title.toLowerCase() && !courseId.includes(' ')) {
      return courseId;
    }
    const parsed = parseEventTitle(ev.title);
    const sec = ev.metadata?.sectionCode || parsed.sectionCode;
    return sec && sec !== 'UTP' ? sec : '';
  }

  getCourseTitle(ev: UTPEvent): string {
    if (ev.metadata?.courseName) return ev.metadata.courseName;
    const parsed = parseEventTitle(ev.title);
    return parsed.cleanTitle || ev.title;
  }

  formatCourse(name: string): string {
    return formatCourseName(name);
  }

  getLocation(ev: UTPEvent): { aula: string; pabellon: string; full: string } {
    const loc = resolveEventLocation(ev);
    return {
      aula: loc.aula || '',
      pabellon: loc.pabellon || '',
      full: `${loc.pabellon || ''} · ${loc.aula || ''}`.trim()
    };
  }

  getTeacher(ev: UTPEvent): string | null {
    return ev.metadata?.teacher || null;
  }

  getModalityBadgeClass(modality?: string): string {
    const m = (modality || 'P').toUpperCase();
    if (m === 'P' || m === 'PRESENCIAL') return 'b-presencial';
    if (m === 'R' || m === 'REMOTO' || m === 'ZOOM') return 'b-zoom';
    return 'b-virtual';
  }

  getModalityLabel(modality?: string): string {
    const m = (modality || 'P').toUpperCase();
    if (m === 'P' || m === 'PRESENCIAL') return 'Presencial';
    if (m === 'R' || m === 'REMOTO' || m === 'ZOOM') return 'Zoom';
    return 'Virtual';
  }

  get remainingClassesCount(): number {
    return this.todayEvents.filter(c => this.getClassStatus(c) !== 'done').length;
  }

  get currentClassProgressPct(): number {
    const cur = this.todayStore.currentClass();
    if (!cur || !cur.startAt || !cur.finishAt) return 0;
    const s = parseDate(cur.startAt).getTime();
    const f = parseDate(cur.finishAt).getTime();
    const n = this.now.getTime();
    if (f <= s) return 0;
    return Math.min(100, Math.max(0, Math.round(((n - s) / (f - s)) * 100)));
  }

  getTaskUrgencyClass(task: CourseAssignment): { code: 'hoy' | 'man' | 'sem'; label: string } {
    const urg = this.getTaskUrgency(task);
    if (!urg) return { code: 'sem', label: 'Esta semana' };
    if (urg.status === 'today') return { code: 'hoy', label: 'Vence hoy' };
    if (task.daysRemaining === 1) return { code: 'man', label: 'Vence mañana' };
    return { code: 'sem', label: urg.label };
  }

  getEvaluationTopics(courseName: string): string {
    const syllabus = getCachedSyllabus(courseName);
    if (syllabus?.weeklySchedule) {
      const currentWeekSession = syllabus.weeklySchedule.find(s => s.week === this.currentWeek);
      if (currentWeekSession) {
        if (currentWeekSession.topic) return currentWeekSession.topic;
        if (currentWeekSession.topics && currentWeekSession.topics.length > 0) {
          return currentWeekSession.topics.join(', ');
        }
      }
    }
    const ctx = getSyllabusWeekContext(courseName, this.currentWeek);
    if (ctx.sessionTopics && ctx.sessionTopics.length > 0) {
      return ctx.sessionTopics.join(', ');
    }
    return '';
  }
}
