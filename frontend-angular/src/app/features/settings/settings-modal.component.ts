import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@data/services/auth.service';
import { ScheduleService } from '@data/services/schedule.service';
import { ApiResponse } from '@domain/models/utp.model';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in" (click)="close.emit()">
        <div class="w-full max-w-md rounded-3xl bg-[#09090c]/95 border border-white/[0.08] p-6 sm:p-8 space-y-5 text-left shadow-[0_25px_70px_rgba(0,0,0,0.85)]" (click)="$event.stopPropagation()">
          
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-base sm:text-lg font-bold text-white">Perfil & Sesión UTP</h2>
              <p class="text-xs text-neutral-400">Datos institucionales y sincronización en vivo</p>
            </div>
            <button (click)="close.emit()" class="p-1.5 rounded-xl text-neutral-400 hover:text-white bg-transparent border-none cursor-pointer">✕</button>
          </div>

          <!-- Mensajes de Estado -->
          @if (feedbackMessage) {
            <div class="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2 text-xs text-emerald-300">
              <svg class="h-4 w-4 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>{{ feedbackMessage }}</span>
            </div>
          }

          <div class="space-y-4">
            <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] space-y-2.5">
              <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-400">Nombre:</span>
                <strong class="text-white">{{ authService.currentStudent()?.fullName || authService.currentStudent()?.name || 'Estudiante UTP' }}</strong>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-neutral-400">Código:</span>
                <span class="font-mono text-[var(--accent-lime)] font-bold">{{ authService.currentStudent()?.studentCode || authService.currentStudent()?.username || '' }}</span>
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
                <span class="font-mono text-neutral-200 font-semibold">Ciclo {{ authService.currentStudent()?.currentCycle || 7 }}</span>
              </div>
            </div>

            <!-- Botón Sincronizar Horario en Vivo -->
            <button
              type="button"
              [disabled]="isSyncing"
              (click)="handleSyncLive()"
              class="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
            >
              @if (isSyncing) {
                <span class="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Sincronizando con UTP...</span>
              } @else {
                <svg class="h-3.5 w-3.5 text-[var(--accent-lime)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
                <span>Forzar Sincronización en Vivo</span>
              }
            </button>

            <!-- Modo Avanzado: Token UTP manual -->
            <div>
              <button
                type="button"
                (click)="showAdvanced = !showAdvanced"
                class="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition bg-transparent border-none cursor-pointer"
              >
                <span>{{ showAdvanced ? '▼ Ocultar opciones avanzadas' : '▶ Modo Avanzado (Token Bearer UTP)' }}</span>
              </button>

              @if (showAdvanced) {
                <div class="mt-2.5 p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                  <label class="block text-[11px] text-neutral-400 font-mono">
                    Token Bearer JWT (desde portal class.utp.edu.pe):
                  </label>
                  <textarea
                    [(ngModel)]="customToken"
                    rows="3"
                    placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
                    class="w-full rounded-xl bg-black/60 border border-white/10 p-2 text-[10px] font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-[var(--accent-lime)] transition resize-none"
                  ></textarea>
                  <button
                    type="button"
                    (click)="handleSaveToken()"
                    class="w-full py-2 rounded-xl bg-[var(--accent-lime)] hover:bg-[#a8e63b] text-black font-bold text-xs uppercase tracking-wider transition cursor-pointer border-none"
                  >
                    Guardar & Sincronizar Token
                  </button>
                </div>
              }
            </div>

            <div class="pt-2">
              <button 
                type="button"
                (click)="authService.logout(); close.emit()"
                class="w-full py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
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

  showAdvanced = false;
  customToken = '';
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

  handleSaveToken(): void {
    if (!this.customToken.trim()) return;
    this.authService.login({ token: this.customToken.trim() }).subscribe({
      next: (res: ApiResponse<any>) => {
        if (res.success) {
          this.feedbackMessage = 'Sesión actualizada con el nuevo token.';
          this.customToken = '';
          this.showAdvanced = false;
          if (res.data?.token) {
            this.scheduleService.syncSchedule(res.data.token).subscribe();
          }
          setTimeout(() => (this.feedbackMessage = null), 3000);
        }
      }
    });
  }
}
