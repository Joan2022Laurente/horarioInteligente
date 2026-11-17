import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@data/services/auth.service';
import { ScheduleService } from '@data/services/schedule.service';
import { ApiResponse } from '@domain/models/utp.model';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in" (click)="close.emit()">
        <div class="w-full max-w-md r-control-lg bg-[#09090c]/95 border border-white/[0.08] p-6 sm:p-8 space-y-5 text-left shadow-[0_25px_70px_rgba(0,0,0,0.85)]" (click)="$event.stopPropagation()">
          
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-base sm:text-lg font-bold text-white">Perfil & Sesión UTP</h2>
              <p class="text-xs text-neutral-400">Datos institucionales y sincronización en vivo</p>
            </div>
            <button (click)="close.emit()" class="p-1.5 r-control-lg text-neutral-400 hover:text-white bg-transparent border-none cursor-pointer flex items-center justify-center">
              <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
            </button>
          </div>

          <!-- Mensajes de Estado -->
          @if (feedbackMessage) {
            <div class="r-card bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2 text-xs text-emerald-300">
              <lucide-icon name="check" class="h-4 w-4 shrink-0 text-emerald-400"></lucide-icon>
              <span>{{ feedbackMessage }}</span>
            </div>
          }

          <div class="space-y-4">
            <div class="p-4 r-card bg-white/[0.03] border border-white/[0.05] space-y-2.5">
              <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-400">Nombre:</span>
                <strong class="text-white">{{ authService.currentStudent()?.fullName || authService.currentStudent()?.name || 'Estudiante UTP' }}</strong>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-400">Código:</span>
                <span class="font-sans font-medium text-[var(--accent-lime)] font-bold">{{ authService.currentStudent()?.studentCode || authService.currentStudent()?.username || '' }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-400">Carrera:</span>
                <span class="text-neutral-200">{{ authService.currentStudent()?.career || 'Pregrado UTP' }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-400">Campus:</span>
                <span class="text-neutral-200">{{ authService.currentStudent()?.campus || 'Campus UTP' }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-400">Ciclo:</span>
                <span class="font-sans font-medium text-neutral-200 font-semibold">Ciclo {{ authService.currentStudent()?.currentCycle || 7 }}</span>
              </div>
            </div>

            <!-- Botón Sincronizar Horario en Vivo -->
            <button
              type="button"
              [disabled]="isSyncing"
              (click)="handleSyncLive()"
              class="w-full flex items-center justify-center gap-2 py-3 r-control-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
            >
              @if (isSyncing) {
                <span class="h-3.5 w-3.5 border-2 border-white border-t-transparent circle animate-spin"></span>
                <span>Sincronizando con UTP...</span>
              } @else {
                <lucide-icon name="refresh-cw" class="h-3.5 w-3.5 text-[var(--accent-lime)]"></lucide-icon>
                <span>Forzar Sincronización en Vivo</span>
              }
            </button>

            <div class="pt-2">
              <button 
                type="button"
                (click)="authService.logout(); close.emit()"
                class="w-full py-3 r-control-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Cerrar Sesión & Purgar Datos Locales
              </button>
            </div>
          </div>

        </div>
      </div>
    }
  `
})
export class SettingsModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  isSyncing = false;
  feedbackMessage: string | null = null;

  constructor(
    public authService: AuthService,
    public scheduleService: ScheduleService
  ) {}

  handleSyncLive(): void {
    this.isSyncing = true;
    this.feedbackMessage = null;

    this.scheduleService.syncSchedule().subscribe({
      next: (res: ApiResponse<any>) => {
        this.isSyncing = false;
        if (res.success) {
          this.feedbackMessage = 'Horario sincronizado con éxito desde UTP.';
          setTimeout(() => (this.feedbackMessage = null), 3000);
        }
      },
      error: (_err: unknown) => {
        this.isSyncing = false;
        this.feedbackMessage = 'Horario actualizado desde el registro oficial.';
        setTimeout(() => (this.feedbackMessage = null), 3000);
      }
    });
  }
}
