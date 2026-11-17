import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { StudyBuddyMatch } from '@domain/models/matching';
import { StudyIntent } from './study-match-card.component';
import { formatCourseName } from '@data/schedule-parser';

@Component({
  selector: 'app-connect-handshake-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity font-sans"
      (click)="close.emit()"
    >
      <div
        class="relative flex flex-col w-full max-w-md r-control-lg bg-[var(--surface-card)] text-[var(--foreground)] p-6 shadow-md border border-[var(--border-medium)] space-y-4 text-left animate-in fade-in zoom-in-95 duration-150"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold text-[var(--accent-lime)] bg-[var(--accent-lime)]/10 px-2 py-0.5 r-control-xs border border-[var(--accent-lime)]/20">
                Match de Estudio 1 a 1
              </span>
              <span class="text-[10px] font-medium text-neutral-400">
                {{ intentLabel }}
              </span>
            </div>
            <h3 class="text-base font-extrabold text-[var(--foreground)] mt-1 truncate">
              Coordinar con {{ match.name }}
            </h3>
            <p class="text-xs text-[var(--text-muted)] truncate font-medium">
              {{ formatCourse(match.courseName) }} · Ciclo {{ match.cycle }}
            </p>
          </div>
          <button
            type="button"
            (click)="close.emit()"
            class="h-8 w-8 circle bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center border-none cursor-pointer transition shrink-0"
          >
            <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
          </button>
        </div>

        <!-- Coincidence Context Box -->
        <div class="bg-[var(--surface-subtle)] p-3.5 r-panel space-y-2 text-xs border border-white/5">
          <div class="flex items-center gap-2 text-[var(--accent-lime)] font-bold">
            <lucide-icon name="clock" class="h-3.5 w-3.5"></lucide-icon>
            <span>Ventana Horaria Compartida:</span>
          </div>
          <p class="text-[var(--foreground)] font-semibold text-sm">
            {{ match.sharedWindow.dayName }} de {{ match.sharedWindow.start }} a {{ match.sharedWindow.end }}
          </p>
          <div class="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-medium">
            <lucide-icon name="map-pin" class="h-3.5 w-3.5 text-neutral-400 shrink-0"></lucide-icon>
            <span>{{ match.sharedWindow.location }} ({{ match.campus }})</span>
          </div>
        </div>

        <!-- Connection Handshake Deep Links -->
        <div class="space-y-2.5 pt-1">
          <!-- Primary Channel: Microsoft Teams Institucional (Zero Fake Writes / Safe) -->
          <a
            [href]="teamsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full flex items-center justify-center gap-2 py-3 px-4 r-control-lg bg-[#464EB8] hover:bg-[#5a62cf] text-white font-bold text-xs no-underline transition-all shadow-sm active:scale-[0.98]"
          >
            <lucide-icon name="users" class="h-4 w-4 shrink-0"></lucide-icon>
            <span>Abrir Chat en Microsoft Teams</span>
          </a>

          <!-- Optional Secondary: WhatsApp (if explicitly opted-in) -->
          @if (match.whatsappPhone) {
            <a
              [href]="whatsappUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full flex items-center justify-center gap-2 py-2.5 px-4 r-control-lg bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs no-underline transition-all shadow-sm active:scale-[0.98]"
            >
              <lucide-icon name="message-circle" class="h-4 w-4 shrink-0"></lucide-icon>
              <span>Coordinar por WhatsApp</span>
            </a>
          }

          <!-- Institutional Email Fallback -->
          <a
            [href]="mailUrl"
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4 r-control-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-bold text-xs no-underline transition border border-white/5 shadow-sm"
          >
            <lucide-icon name="mail" class="h-3.5 w-3.5 shrink-0"></lucide-icon>
            <span>Correo Institucional ({{ studentEmail }})</span>
          </a>
        </div>

        <!-- Privacy & Protection Notice (Ley 29733) -->
        <div class="p-3 r-control-lg bg-white/[0.02] border border-white/5 text-[10px] text-neutral-400 space-y-1 font-medium">
          <p class="font-bold text-neutral-300 flex items-center gap-1.5">
            <lucide-icon name="shield-check" class="h-3.5 w-3.5 text-[var(--accent-emerald)] shrink-0"></lucide-icon>
            <span>Cumplimiento Ley 29733 (Protección de Datos Personales):</span>
          </p>
          <p class="leading-relaxed">
            Identidades validadas por matrícula oficial UTP. Por seguridad de la comunidad, acuerda tus sesiones de estudio siempre en espacios comunes del campus (laboratorios, cafeterías o biblioteca).
          </p>
        </div>
      </div>
    </div>
  `
})
export class ConnectHandshakeModalComponent {
  @Input({ required: true }) match!: StudyBuddyMatch;
  @Input() intent: StudyIntent = 'EXAM';
  @Output() close = new EventEmitter<void>();

  get studentEmail(): string {
    const code = (this.match.studentCode || '').toLowerCase().trim();
    return code.includes('@') ? code : `${code}@utp.edu.pe`;
  }

  get intentLabel(): string {
    switch (this.intent) {
      case 'EXAM': return 'Repaso de Parciales';
      case 'PROJECT': return 'Avance de Proyecto';
      case 'CHILL': return 'Hueco & Descanso';
      default: return 'Sesión de Estudio';
    }
  }

  get prefilledMessage(): string {
    return `Hola ${this.match.name}, vi en Horario Inteligente UTP que ambos estamos libres el ${this.match.sharedWindow.dayName} de ${this.match.sharedWindow.start} a ${this.match.sharedWindow.end} en ${this.match.sharedWindow.location}. ¿Te gustaría que repasemos juntos para ${this.formatCourse(this.match.courseName)}?`;
  }

  get teamsUrl(): string {
    const email = this.studentEmail;
    const msg = encodeURIComponent(this.prefilledMessage);
    return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}&message=${msg}`;
  }

  get whatsappUrl(): string {
    const phone = (this.match.whatsappPhone || '').replace(/\D/g, '');
    const msg = encodeURIComponent(this.prefilledMessage);
    return `https://wa.me/${phone}?text=${msg}`;
  }

  get mailUrl(): string {
    const subject = encodeURIComponent(`Horario Inteligente UTP - Estudio ${this.formatCourse(this.match.courseName)}`);
    const body = encodeURIComponent(this.prefilledMessage);
    return `mailto:${this.studentEmail}?subject=${subject}&body=${body}`;
  }

  formatCourse(name: string): string {
    return formatCourseName(name);
  }
}
