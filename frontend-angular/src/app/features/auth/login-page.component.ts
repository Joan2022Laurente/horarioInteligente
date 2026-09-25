import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@data/services/auth.service';
import { ScheduleService } from '@data/services/schedule.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative min-h-screen lg:h-screen lg:max-h-screen w-full bg-[#070709] text-white flex flex-col justify-between overflow-x-hidden select-none selection:bg-[var(--accent-lime)] selection:text-black font-sans">
      
      <!-- 1. Luces de Fondo Volumétricas Sutiles -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[40rem] h-[20rem] bg-[var(--accent-lime)]/[0.04] rounded-full blur-[140px]"></div>
        <div class="absolute top-1/3 -right-40 w-[24rem] h-[24rem] bg-blue-500/[0.03] rounded-full blur-[160px]"></div>
        <div class="absolute -bottom-40 left-10 w-[28rem] h-[28rem] bg-[var(--accent-lime)]/[0.04] rounded-full blur-[140px]"></div>
      </div>

      <!-- 2. Barra Superior Minimalista y Responsive -->
      <header class="relative z-10 w-full px-4 sm:px-8 lg:px-12 h-14 sm:h-16 flex items-center justify-between gap-3 bg-gradient-to-b from-black/60 via-black/20 to-transparent backdrop-blur-md border-none shrink-0">
        
        <!-- Izquierda: Indicador & Logo -->
        <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <span class="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
          <span class="text-[10px] sm:text-[11px] tracking-wider text-neutral-300 uppercase font-semibold">
            ESTUDIANTES UTP
          </span>
        </div>

        <!-- Derecha: Enlaces Adaptados -->
        <nav class="flex items-center gap-4 sm:gap-6 lg:gap-8 text-[11px] sm:text-xs font-semibold tracking-wider uppercase shrink-0">
          <button
            type="button"
            (click)="isLoginModalOpen = true"
            class="text-white border-b border-dashed border-white pb-0.5 cursor-pointer hover:text-[var(--accent-lime)] transition bg-transparent border-t-0 border-l-0 border-r-0"
          >
            ACCESO
          </button>
          
          <button
            type="button"
            (click)="openPrivacy.emit()"
            class="hidden sm:inline-block text-neutral-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none uppercase font-semibold text-xs tracking-wider"
          >
            POLÍTICAS & SEGURIDAD
          </button>
        </nav>

      </header>

      <!-- 3. Hero Central Proporcionado y Ordenado -->
      <main class="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 py-3 sm:py-6 flex-1 flex flex-col justify-center items-start text-left">
        
        <div class="w-full space-y-3 sm:space-y-4">
          
          <!-- Titular Principal -->
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-black text-[#f5f2eb] tracking-tight uppercase leading-[1.05]">
            HORARIO<span class="text-[var(--accent-lime)]">.UTP</span>
          </h1>

          <!-- Subtítulo Conciso -->
          <p class="text-xs sm:text-sm lg:text-base text-neutral-400 font-normal leading-relaxed max-w-2xl">
            Organiza, conecta y sincroniza tu ciclo universitario. Horarios oficiales en tiempo real, copiloto de IA académica y red de estudio entre compañeros de la universidad.
          </p>

          <!-- Botones de Acción -->
          <div class="pt-2 sm:pt-4 flex flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <button
              type="button"
              (click)="isLoginModalOpen = true"
              class="inline-flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl bg-[var(--accent-lime)] hover:bg-[#a8e63b] text-[#0a0a0c] font-bold text-xs sm:text-sm tracking-wide uppercase shadow-xl shadow-[var(--accent-lime)]/20 transition-all active:scale-95 cursor-pointer group shrink-0 border-none"
            >
              <span>Empezar</span>
              <svg class="h-4 w-4 text-[#0a0a0c] group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
            </button>

            <button
              type="button"
              (click)="openPrivacy.emit()"
              class="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-medium text-xs tracking-wide uppercase transition cursor-pointer shrink-0"
            >
              <svg class="h-3.5 w-3.5 text-[var(--accent-lime)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Seguridad</span>
            </button>
          </div>

        </div>

        <!-- 3 Tarjetas de Características -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 w-full pt-6 sm:pt-8">
          
          <div class="p-3 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md space-y-1">
            <div class="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
              <svg class="h-3.5 w-3.5 text-[var(--accent-lime)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 8V4H8"/>
                <rect width="16" height="12" x="4" y="8" rx="2"/>
                <path d="M2 14h2"/>
                <path d="M20 14h2"/>
                <path d="M15 13v2"/>
                <path d="M9 13v2"/>
              </svg>
              <span>Copiloto de IA</span>
            </div>
            <p class="text-[11px] sm:text-xs text-neutral-400 leading-normal">
              Analiza rúbricas, cronogramas y prepara tus evaluaciones.
            </p>
          </div>

          <div class="p-3 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md space-y-1">
            <div class="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
              <svg class="h-3.5 w-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="18" x="3" y="4" rx="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <span>Sincronización en Vivo</span>
            </div>
            <p class="text-[11px] sm:text-xs text-neutral-400 leading-normal">
              Horarios de clase, aulas, docentes y tareas desde la UTP.
            </p>
          </div>

          <div class="p-3 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md space-y-1">
            <div class="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
              <svg class="h-3.5 w-3.5 text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
              <span>Red de Estudio</span>
            </div>
            <p class="text-[11px] sm:text-xs text-neutral-400 leading-normal">
              Faros de estudio con alumnos de tu carrera y campus.
            </p>
          </div>

        </div>

      </main>

      <!-- 4. Pie de Página Minimalista Transparente -->
      <footer class="relative z-10 w-full px-4 sm:px-8 lg:px-12 py-3 sm:h-14 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500 bg-gradient-to-t from-black/60 via-black/20 to-transparent backdrop-blur-md border-none shrink-0">
        <div class="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-normal">
          <span>© 2026 UTP.HORARIO</span>
          <span class="text-neutral-700">/</span>
          <button
            type="button"
            (click)="openPrivacy.emit()"
            class="hover:text-white underline underline-offset-4 cursor-pointer transition bg-transparent border-none text-neutral-500 text-[11px] sm:text-xs"
          >
            Políticas de Privacidad & Seguridad
          </button>
        </div>

        <div class="text-[11px] sm:text-xs text-neutral-500 uppercase tracking-wider font-medium">
          ESTUDIANTES UTP
        </div>
      </footer>

      <!-- 5. MODAL DE LOGIN MODERNO -->
      @if (isLoginModalOpen) {
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-150 font-sans"
          (click)="isLoginModalOpen = false"
        >
          <div 
            class="relative w-full max-w-md rounded-3xl bg-[#09090c]/95 backdrop-blur-2xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] space-y-4 sm:space-y-5"
            (click)="$event.stopPropagation()"
          >
            <!-- Header del Modal -->
            <div class="flex items-start justify-between">
              <div class="space-y-1 text-left">
                <h2 class="text-base sm:text-lg font-bold tracking-tight text-white">
                  Acceso Institucional
                </h2>
                <p class="text-xs text-neutral-400">
                  Ingresa con tus credenciales oficiales de UTP Class
                </p>
              </div>

              <button
                type="button"
                (click)="isLoginModalOpen = false"
                class="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition cursor-pointer bg-transparent border-none"
                aria-label="Cerrar modal"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18"/>
                  <path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>

            <!-- Mensajes de Estado -->
            @if (errorMessage) {
              <div class="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3 flex items-start gap-2.5 text-xs text-rose-300">
                <svg class="h-4 w-4 shrink-0 mt-0.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" x2="12" y1="8" y2="12"/>
                  <line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
                <span>{{ errorMessage }}</span>
              </div>
            }

            @if (successMessage) {
              <div class="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-start gap-2.5 text-xs text-emerald-300">
                <svg class="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>{{ successMessage }}</span>
              </div>
            }

            <!-- Formulario -->
            <form (ngSubmit)="handleLogin()" class="space-y-3.5 sm:space-y-4 text-left">
              <div>
                <label class="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Código de Alumno
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="username"
                    name="username"
                    placeholder="u123456789"
                    [disabled]="isLoading"
                    required
                    class="w-full rounded-2xl bg-black/40 border border-white/10 pl-10 pr-4 py-2.5 sm:py-3 text-xs text-white placeholder-neutral-500 focus:border-[var(--accent-lime)] focus:ring-1 focus:ring-[var(--accent-lime)] focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Contraseña Institucional
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <input
                    type="password"
                    [(ngModel)]="password"
                    name="password"
                    placeholder="Tu contraseña de UTP Class"
                    [disabled]="isLoading"
                    required
                    class="w-full rounded-2xl bg-black/40 border border-white/10 pl-10 pr-4 py-2.5 sm:py-3 text-xs text-white placeholder-neutral-500 focus:border-[var(--accent-lime)] focus:ring-1 focus:ring-[var(--accent-lime)] focus:outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                [disabled]="isLoading"
                class="w-full flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-lime)] hover:bg-[#a8e63b] py-3 sm:py-3.5 text-xs font-bold text-[#0a0a0c] shadow-lg shadow-[var(--accent-lime)]/20 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer uppercase tracking-wider border-none"
              >
                @if (isLoading) {
                  <span class="h-4 w-4 border-2 border-[#0a0a0c] border-t-transparent rounded-full animate-spin"></span>
                  <span>Validando con UTP...</span>
                } @else {
                  <span>Ingresar</span>
                  <svg class="h-4 w-4 text-[#0a0a0c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M5 12h14"/>
                    <path d="m12 5 7 7-7 7"/>
                  </svg>
                }
              </button>
            </form>

            <!-- Pie de Privacidad -->
            <div class="pt-1.5 text-center text-neutral-400 space-y-1 select-none">
              <p class="text-[10px] text-neutral-400 leading-normal max-w-xs mx-auto">
                Validación oficial en tiempo real. Tu contraseña no se almacena en ninguna base de datos.
              </p>
              <div class="pt-0.5">
                <button
                  type="button"
                  (click)="openPrivacy.emit(); isLoginModalOpen = false"
                  class="inline-flex items-center gap-1 text-[10px] text-[var(--accent-lime)] hover:underline font-medium cursor-pointer transition bg-transparent border-none"
                >
                  <span>Conoce nuestras Políticas de Privacidad y Seguridad</span>
                  <svg class="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14"/>
                    <path d="m12 5 7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </div>
      }

    </div>
  `
})
export class LoginPageComponent {
  @Output() openPrivacy = new EventEmitter<void>();

  isLoginModalOpen = false;
  username = '';
  password = '';
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private scheduleService: ScheduleService
  ) {}

  handleLogin(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Ingresa tu código de alumno y contraseña institucional.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.successMessage = `¡Bienvenido, ${res.data.fullName}! Sincronizando tu horario y asignaturas...`;
          // Iniciar de inmediato la sincronización y persistencia de horario para este alumno específico
          this.scheduleService.getSchedule().subscribe();
          setTimeout(() => {
            this.isLoginModalOpen = false;
          }, 800);
        } else {
          this.errorMessage = res.error || 'Error al validar credenciales.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Error de conexión con el servidor Spring Boot.';
      }
    });
  }
}
