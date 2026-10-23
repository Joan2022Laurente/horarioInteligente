import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@data/services/auth.service';
import { ScheduleService } from '@data/services/schedule.service';

/**
 * Fase 0.8: máquina de estados del Stepper de Login en Tiempo Real.
 * `idle`: sin onboarding en curso; `auth`: login institucional; `schedule` y
 * `syllabi`: Auto-Bootstrap Integral (POST /auth/bootstrap); `ready`: Copiloto
 * listo; `error`: cualquier fase interrumpida (el paso visible pasa a `failed`).
 */
export type LoginStep = 'idle' | 'auth' | 'schedule' | 'syllabi' | 'ready' | 'error';

/** Item visible del Stepper de Onboarding dentro del modal de login. */
export interface StepItem {
  id: LoginStep;
  label: string;
  detail?: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

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
              class="inline-flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg bg-[var(--accent-lime)] hover:bg-[#a8e63b] text-[#0a0a0c] font-bold text-xs sm:text-sm tracking-wide uppercase shadow-xl shadow-[var(--accent-lime)]/20 transition-all active:scale-95 cursor-pointer group shrink-0 border-none"
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
          (click)="attemptCloseModal()"
        >
          <div 
            class="relative w-full max-w-md rounded-2xl bg-[#09090c]/95 backdrop-blur-2xl border border-white/[0.08] p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] space-y-4 sm:space-y-5"
            (click)="$event.stopPropagation()"
          >
            <!-- Botón de cierre: cancela ante error; bloqueado durante el proceso activo -->
            <button
              type="button"
              (click)="attemptCloseModal()"
              [attr.aria-label]="isClosable ? 'Cerrar modal' : 'Sincronización en curso'"
              [class.pointer-events-none]="!isClosable"
              [class.opacity-30]="!isClosable"
              class="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition cursor-pointer bg-transparent border-none"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18"/>
                <path d="m6 6 12 12"/>
              </svg>
            </button>

            @if (isBootstrapping) {
              <!-- Fase 0.8: Stepper de Onboarding en Tiempo Real -->
              <div class="space-y-4 py-2">
                <!-- Cabecera de estado -->
                <div class="text-left space-y-1">
                  <h3 class="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span class="inline-block h-2 w-2 rounded-full bg-[var(--accent-lime)] animate-ping"></span>
                    Preparando tu espacio universitario
                  </h3>
                  <p class="text-[11px] sm:text-xs text-neutral-400">
                    Sincronizando tus datos oficiales de UTP Class en tiempo real
                  </p>
                </div>

                <!-- Lista vertical del Stepper -->
                <div class="space-y-2.5 pt-2">
                  @for (step of steps; track step.id) {
                    <div 
                      class="flex items-start gap-3 p-2.5 sm:p-3 rounded-[var(--r-lg)] transition-all duration-300"
                      [ngClass]="{
                        'bg-[var(--surface-card)] border border-[var(--border-subtle)] opacity-40': step.status === 'pending',
                        'bg-[var(--surface-subtle)] border border-[rgba(187,244,81,0.3)] shadow-[0_0_15px_rgba(187,244,81,0.08)]': step.status === 'active',
                        'bg-[var(--surface-card)] border border-emerald-500/20': step.status === 'completed',
                        'bg-rose-500/10 border border-rose-500/30': step.status === 'failed'
                      }"
                    >
                      <!-- Icono de estado -->
                      <div class="mt-0.5 shrink-0">
                        @if (step.status === 'completed') {
                          <svg class="h-4 w-4 text-[var(--accent-lime)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M20 6 9 17l-5-5"/>
                          </svg>
                        } @else if (step.status === 'active') {
                          <div class="h-4 w-4 border-2 border-[var(--accent-lime)] border-t-transparent rounded-full animate-spin"></div>
                        } @else if (step.status === 'failed') {
                          <svg class="h-4 w-4 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                        } @else {
                          <div class="h-4 w-4 rounded-full border border-neutral-600 bg-neutral-800"></div>
                        }
                      </div>

                      <!-- Textos -->
                      <div class="text-left flex-1 min-w-0">
                        <p class="text-xs font-semibold text-white truncate">{{ step.label }}</p>
                        @if (step.detail) {
                          <p class="text-[10px] sm:text-[11px] text-neutral-400 tracking-wide mt-0.5 font-mono truncate">
                            {{ step.detail }}
                          </p>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Error y acciones: Reintentar sin borrar campos / cancelar ante falla -->
              @if (hasStepFailed) {
                <div class="space-y-3">
                  <div class="rounded-[var(--r-lg)] bg-rose-500/10 border border-rose-500/30 p-3 flex items-start gap-2.5">
                    <svg class="h-4 w-4 shrink-0 mt-0.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p class="text-xs text-rose-300 leading-normal flex-1 min-w-0">{{ bootstrapError }}</p>
                  </div>

                  <div class="flex items-center gap-2.5">
                    <button
                      type="button"
                      (click)="retryFailedStep()"
                      class="flex-1 inline-flex items-center justify-center gap-2 rounded-[var(--r-md)] bg-[var(--accent-lime)] hover:bg-[#a8e63b] py-2.5 text-xs font-bold text-[#0a0a0c] shadow-lg shadow-[var(--accent-lime)]/20 transition active:scale-[0.98] cursor-pointer uppercase tracking-wider border-none"
                    >
                      <svg class="h-3.5 w-3.5 text-[#0a0a0c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M21 12a9 9 0 1 1-2.64-6.36"/>
                        <path d="M21 3v6h-6"/>
                      </svg>
                      <span>Reintentar</span>
                    </button>

                    <button
                      type="button"
                      (click)="cancelFromStepper()"
                      class="flex-1 inline-flex items-center justify-center rounded-[var(--r-md)] py-2.5 text-xs font-semibold text-neutral-300 border border-[var(--border-medium)] hover:text-white hover:bg-white/5 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              }
            } @else {
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
                      class="w-full rounded-md bg-black/40 border border-white/10 pl-10 pr-4 py-2.5 sm:py-3 text-xs text-white placeholder-neutral-500 focus:border-[var(--accent-lime)] focus:ring-1 focus:ring-[var(--accent-lime)] focus:outline-none transition"
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
                      class="w-full rounded-md bg-black/40 border border-white/10 pl-10 pr-4 py-2.5 sm:py-3 text-xs text-white placeholder-neutral-500 focus:border-[var(--accent-lime)] focus:ring-1 focus:ring-[var(--accent-lime)] focus:outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  [disabled]="isLoading"
                  class="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-lime)] hover:bg-[#a8e63b] py-3 sm:py-3.5 text-xs font-bold text-[#0a0a0c] shadow-lg shadow-[var(--accent-lime)]/20 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer uppercase tracking-wider border-none"
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
            }

          </div>
        </div>
      }
    </div>
  `
})
export class LoginPageComponent implements OnDestroy {
  @Output() openPrivacy = new EventEmitter<void>();

  isLoginModalOpen = false;
  username = '';
  password = '';
  isLoading = false;
  errorMessage: string | null = null;

  // ─── Fase 0.8: Stepper de Login en Tiempo Real ───────────────────────────
  // El backend ya terminó el Auto-Bootstrap Integral (POST /auth/bootstrap) y el
  // Pre-Flight Guard garantiza que el Copiloto nunca aterriza con datos vacíos;
  // aquí se refleja el avance real sin spinner ciego ni setTimeout arbitrarios.
  steps: StepItem[] = LoginPageComponent.buildSteps();
  isBootstrapping = false;
  currentStep: LoginStep = 'idle';
  failedStep: LoginStep | null = null;
  bootstrapError: string | null = null;
  // Auditoría 0.9: TODO timer del pipeline es rastreado; ningún callback sobrevive
  // al desmontaje del componente ni a una cancelación del onboarding.
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private syllabiTimer: ReturnType<typeof setTimeout> | null = null;
  private readyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private authService: AuthService,
    private scheduleService: ScheduleService
  ) {}

  /** Hay al menos una fase interrumpida (muestra Reintentar/Cancelar). */
  get hasStepFailed(): boolean {
    return this.failedStep !== null;
  }

  /**
   * Criterio de Fase 0.8: el modal cierra SOLO cuando el backend completa el
   * bootstrap (micro-transición de 600 ms) o cuando el usuario cancela ante
   * error. A mitad del proceso activo el cierre queda bloqueado.
   */
  get isClosable(): boolean {
    if (!this.isBootstrapping) {
      return true;
    }
    return this.hasStepFailed || this.isReadyCompleted;
  }

  private static buildSteps(): StepItem[] {
    return [
      { id: 'auth', label: 'Credenciales institucionales', status: 'pending' },
      { id: 'schedule', label: 'Horario académico', status: 'pending' },
      { id: 'syllabi', label: 'Sílabos y evaluaciones', status: 'pending' },
      { id: 'ready', label: 'Copiloto Académico IA', status: 'pending' },
    ];
  }

  private get isReadyCompleted(): boolean {
    return this.stepById('ready')?.status === 'completed';
  }

  private stepById(id: LoginStep): StepItem | undefined {
    return this.steps.find((step) => step.id === id);
  }

  private updateStep(id: LoginStep, patch: Partial<StepItem>): void {
    const index = this.steps.findIndex((step) => step.id === id);
    if (index >= 0) {
      this.steps[index] = { ...this.steps[index], ...patch };
    }
  }

  /** Pipeline completo: validación → auth (login institucional) → bootstrap → ready. */
  handleLogin(): void {
    // El reintento (campos intactos) cruza esta barrera; el doble envío NO.
    if (this.isBootstrapping && !this.hasStepFailed) {
      return;
    }
    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Ingresa tu código de alumno y contraseña institucional.';
      return;
    }

    this.clearAllTimers();
    this.isLoading = true;
    this.errorMessage = null;
    this.isBootstrapping = true;
    this.failedStep = null;
    this.bootstrapError = null;
    this.currentStep = 'auth';
    this.steps = LoginPageComponent.buildSteps();
    this.updateStep('auth', { status: 'active', detail: 'Verificando credenciales institucionales...' });

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          const code = (res.data.studentCode || res.data.username || this.username).toUpperCase();
          this.updateStep('auth', { status: 'completed', detail: `Identidad verificada (${code})` });
          this.runBootstrapPhase();
        } else {
          this.failCurrentStep(res.error || 'Error al validar credenciales.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.failCurrentStep(err.error?.error || 'Error de conexión con el servidor Spring Boot.');
      }
    });
  }

  /** Fases 2 y 3 (schedule + syllabi) del Auto-Bootstrap Integral del backend. */
  private runBootstrapPhase(): void {
    this.currentStep = 'schedule';
    this.updateStep('schedule', { status: 'active', detail: 'Sincronizando horario y asignaturas...' });

    this.authService.bootstrapSession().subscribe({
      next: (res) => {
        if (!res.success || !res.data) {
          this.failCurrentStep(res.error || 'No se pudo sincronizar tu información académica.');
          return;
        }

        const summary = res.data;
        this.updateStep('schedule', {
          status: 'completed',
          detail: `Horario detectado (${summary.coursesCount} asignaturas matriculadas)`
        });

        // Transición fluida al paso 3: Sílabos y Evaluaciones
        this.currentStep = 'syllabi';
        this.updateStep('syllabi', {
          status: 'active',
          detail: 'Sincronizando sílabos y evaluaciones...'
        });

        this.syllabiTimer = setTimeout(() => {
          if (!this.isBootstrapping) return; // Guard: onboarding cancelado → no-op
          this.updateStep('syllabi', {
            status: 'completed',
            detail: `Sílabos y evaluaciones sincronizados (${summary.syllabiSynced}/${summary.syllabiTotal})`
          });
          this.runReadyPhase();
        }, 400);
      },
      error: (err) => {
        this.failCurrentStep(err.error?.error || 'Error de conexión durante la sincronización académica.');
      }
    });
  }

  /** Fase 4: activa Copiloto, refresca el estado local y cierra tras micro-transición suave. */
  private runReadyPhase(): void {
    this.currentStep = 'ready';
    this.updateStep('ready', { status: 'active', detail: 'Inicializando Copiloto Académico IA...' });

    // Notificar al ScheduleService para refrescar sus signals locales en memoria
    // con el horario ya persistido por el Auto-Bootstrap del backend.
    this.scheduleService.getSchedule().subscribe();

    this.readyTimer = setTimeout(() => {
      if (!this.isBootstrapping) return; // Guard: onboarding cancelado → no-op
      this.updateStep('ready', { status: 'completed', detail: 'Copiloto Académico IA listo para operar' });

      // El backend YA completó el bootstrap: este timer da 800ms para que el usuario
      // aprecie los 4 checks verdes antes de ingresar al Dashboard.
      this.closeTimer = setTimeout(() => {
        if (!this.isBootstrapping) return; // Guard: onboarding cancelado → no-op
        this.authService.finalizeLogin();
        this.resetStepperState();
        this.isLoginModalOpen = false;
      }, 800);
    }, 400);
  }

  /** Marca el paso actual como fallido y conserva los campos para reintentar. */
  private failCurrentStep(message: string): void {
    this.updateStep(this.currentStep, { status: 'failed' });
    this.failedStep = this.currentStep;
    this.bootstrapError = message;
  }

  /** Reintenta la fase fallida SIN borrar los campos del formulario. */
  retryFailedStep(): void {
    if (!this.hasStepFailed) {
      return;
    }
    const retryStep = this.failedStep;
    this.failedStep = null;
    this.bootstrapError = null;
    if (retryStep === 'auth') {
      // Identidad pendiente: re-ejecuta login + bootstrap con los campos intactos.
      this.handleLogin();
      return;
    }
    // Identidad ya verificada y token cacheado para el interceptor: el reintento
    // no repite credenciales, continúa en la sincronización académica.
    this.runBootstrapPhase();
  }

  /** Cancela el onboarding y cierra el modal (solo disponible ante error). */
  cancelFromStepper(): void {
    this.authService.cancelPendingLogin();
    this.resetStepperState();
    this.isLoginModalOpen = false;
  }

  /** Punto único de cierre del modal: bloqueado durante el bootstrap activo. */
  attemptCloseModal(): void {
    if (!this.isClosable) {
      return;
    }
    this.cancelFromStepper();
  }

  /** Restaura la máquina de estados; los campos del formulario nunca se borran. */
  private resetStepperState(): void {
    this.clearAllTimers();
    this.isBootstrapping = false;
    this.currentStep = 'idle';
    this.failedStep = null;
    this.bootstrapError = null;
    this.steps = LoginPageComponent.buildSteps();
  }

  /** Apaga TODOS los timers del pipeline (close, syllabi y ready). */
  private clearAllTimers(): void {
    for (const timer of [this.closeTimer, this.syllabiTimer, this.readyTimer]) {
      if (timer !== null) clearTimeout(timer);
    }
    this.closeTimer = null;
    this.syllabiTimer = null;
    this.readyTimer = null;
  }

  /** Auditoría 0.9: el desmontaje del componente deja cero timers pendientes. */
  ngOnDestroy(): void {
    this.clearAllTimers();
  }
}
