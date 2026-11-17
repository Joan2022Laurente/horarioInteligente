import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { StudyBuddyMatch } from '@domain/models/matching';
import { formatCourseName } from '@data/schedule-parser';

export type StudyIntent = 'EXAM' | 'PROJECT' | 'CHILL';

@Component({
  selector: 'app-study-match-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <article
      class="group relative flex flex-col justify-between r-card bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] p-4 sm:p-5 transition-all duration-200 text-left shadow-sm select-none font-sans"
    >
      <!-- Top Bar: Factual Badges & Modality -->
      <div class="space-y-3.5">
        <div class="flex items-center justify-between gap-2">
          <!-- Modality Badge (Solid / High Contrast) -->
          <span
            class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 r-control-sm border"
            [ngClass]="match.modality === 'Presencial' 
              ? 'bg-[var(--badge-solid-presencial-bg)] border-[var(--badge-solid-presencial-border)] text-[var(--badge-solid-presencial-text)]' 
              : 'bg-[var(--badge-solid-virtual-bg)] border-[var(--badge-solid-virtual-border)] text-[var(--badge-solid-virtual-text)]'"
          >
            <span 
              class="h-1.5 w-1.5 circle"
              [ngClass]="match.modality === 'Presencial' ? 'bg-[var(--accent-lime)] animate-pulse' : 'bg-[var(--accent-cyan)]'"
            ></span>
            <span>{{ match.modality === 'Presencial' ? 'In-Campus UTP' : 'Virtual' }}</span>
          </span>

          <!-- Campus Sede Indicator -->
          <span class="text-[10px] font-medium text-[var(--text-muted)] truncate max-w-[140px]">
            {{ match.campus }}
          </span>
        </div>

        <!-- Student Persona Header -->
        <div class="flex items-start gap-3">
          <!-- Squircle Avatar Letter -->
          <div
            class="h-11 w-11 r-control-lg bg-[var(--surface-subtle)] text-[var(--foreground)] font-bold flex items-center justify-center text-sm shrink-0 border border-white/10 shadow-sm"
          >
            {{ match.avatarLetter }}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <h3 class="text-sm font-bold text-[var(--foreground)] group-hover:text-[var(--accent-lime)] transition-colors truncate">
                {{ match.name }}
              </h3>
              <!-- Verified Student Shield -->
              <lucide-icon name="shield-check" class="h-3.5 w-3.5 text-[var(--accent-emerald)] shrink-0"></lucide-icon>
            </div>
            <p class="text-[11px] text-[var(--text-muted)] truncate mt-0.5 font-medium">
              {{ match.career }} · Ciclo {{ match.cycle }}
            </p>
          </div>
        </div>

        <!-- Factual Study Badges Box (Eliminates Fake % and Replaces with Truth) -->
        <div class="space-y-2 text-xs bg-[var(--surface-subtle)] p-3 r-panel border border-white/5">
          <!-- Badge 1: Mismo Curso -->
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold text-[var(--accent-lime)] uppercase tracking-wider shrink-0">Curso</span>
            <span class="truncate text-[12px] font-semibold text-[var(--foreground)]">
              {{ formatCourse(match.courseName) }}
            </span>
          </div>

          <!-- Badge 2: Mismo Hueco / Horario Compartido -->
          <div class="flex items-center gap-2 text-[11px] text-[var(--accent-orange)] font-medium">
            <lucide-icon name="clock" class="h-3.5 w-3.5 shrink-0"></lucide-icon>
            <span class="truncate">
              {{ match.sharedWindow.dayName }} {{ match.sharedWindow.start }} – {{ match.sharedWindow.end }}
            </span>
          </div>

          <!-- Badge 3: Misma Ubicación / Torre -->
          <div class="flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-medium">
            <lucide-icon name="map-pin" class="h-3.5 w-3.5 shrink-0 text-neutral-400"></lucide-icon>
            <span class="truncate">
              {{ match.sharedWindow.location }}
            </span>
          </div>
        </div>

        <!-- Intent Chips (Quick Mood Selection) -->
        <div class="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            (click)="setIntent('EXAM')"
            class="inline-flex items-center gap-1 px-2.5 py-1 r-control-sm text-[10px] font-bold transition border cursor-pointer shrink-0 font-sans"
            [ngClass]="selectedIntent === 'EXAM' 
              ? 'bg-[var(--accent-orange)] text-black border-[var(--accent-orange)] font-extrabold shadow-sm' 
              : 'bg-white/[0.04] text-[var(--text-muted)] hover:text-white border-white/5'"
          >
            <lucide-icon name="target" class="h-3 w-3 shrink-0"></lucide-icon>
            <span>Parciales</span>
          </button>
          <button
            type="button"
            (click)="setIntent('PROJECT')"
            class="inline-flex items-center gap-1 px-2.5 py-1 r-control-sm text-[10px] font-bold transition border cursor-pointer shrink-0 font-sans"
            [ngClass]="selectedIntent === 'PROJECT' 
              ? 'bg-[var(--accent-lime)] text-black border-[var(--accent-lime)] font-extrabold shadow-sm' 
              : 'bg-white/[0.04] text-[var(--text-muted)] hover:text-white border-white/5'"
          >
            <lucide-icon name="code" class="h-3 w-3 shrink-0"></lucide-icon>
            <span>Proyecto</span>
          </button>
          <button
            type="button"
            (click)="setIntent('CHILL')"
            class="inline-flex items-center gap-1 px-2.5 py-1 r-control-sm text-[10px] font-bold transition border cursor-pointer shrink-0 font-sans"
            [ngClass]="selectedIntent === 'CHILL' 
              ? 'bg-[var(--accent-purple)] text-white border-[var(--accent-purple)] font-extrabold shadow-sm' 
              : 'bg-white/[0.04] text-[var(--text-muted)] hover:text-white border-white/5'"
          >
            <lucide-icon name="coffee" class="h-3 w-3 shrink-0"></lucide-icon>
            <span>Hueco</span>
          </button>
        </div>

        <!-- Skills / Tags -->
        @if (match.skills && match.skills.length > 0) {
          <div class="flex flex-wrap gap-1.5 pt-0.5">
            @for (skill of match.skills.slice(0, 3); track skill) {
              <span class="inline-flex items-center text-[10px] font-medium bg-white/[0.05] text-neutral-300 px-2 py-0.5 r-control-xs border border-white/5">
                #{{ skill }}
              </span>
            }
          </div>
        }
      </div>

      <!-- Action Buttons (Responsive bottom toolbar) -->
      <div class="flex items-center gap-2 pt-3.5 mt-3.5 border-t border-[var(--border-subtle)]">
        <!-- 1-on-1 Connect Button -->
        <button
          type="button"
          (click)="onConnect()"
          class="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 r-control-lg bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-black font-extrabold text-xs transition-all active:scale-[0.98] border-none cursor-pointer shadow-sm"
        >
          <lucide-icon name="users" class="h-3.5 w-3.5"></lucide-icon>
          <span>Conectar 1 a 1</span>
        </button>

        <!-- Ask Copilot Button -->
        <button
          type="button"
          (click)="onAskAi()"
          title="Consultar al Copiloto IA sobre este match de estudio"
          class="inline-flex items-center justify-center h-9 w-9 r-control-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-elevated)] text-[var(--accent-orange)] hover:text-white border border-white/10 transition-all active:scale-95 shrink-0 cursor-pointer shadow-sm"
        >
          <lucide-icon name="sparkles" class="h-4 w-4"></lucide-icon>
        </button>
      </div>
    </article>
  `
})
export class StudyMatchCardComponent {
  @Input({ required: true }) match!: StudyBuddyMatch;
  @Output() connect = new EventEmitter<{ match: StudyBuddyMatch; intent: StudyIntent }>();
  @Output() askAi = new EventEmitter<string>();

  selectedIntent: StudyIntent = 'EXAM';

  formatCourse(name: string): string {
    return formatCourseName(name);
  }

  setIntent(intent: StudyIntent): void {
    this.selectedIntent = intent;
  }

  onConnect(): void {
    this.connect.emit({ match: this.match, intent: this.selectedIntent });
  }

  onAskAi(): void {
    const prompt = `Analiza la complementariedad de estudio con ${this.match.name} para el curso ${this.match.courseName} en nuestra ventana compartida ${this.match.sharedWindow.dayName} ${this.match.sharedWindow.start}-${this.match.sharedWindow.end}. ¿Qué temas o laboratorios del sílabo nos conviene priorizar?`;
    this.askAi.emit(prompt);
  }
}
