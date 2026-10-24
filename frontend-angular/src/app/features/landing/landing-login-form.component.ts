import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@data/services/auth.service';
import { ScheduleService } from '@data/services/schedule.service';

export type LoginStep = 'idle' | 'auth' | 'schedule' | 'syllabi' | 'ready' | 'error';

export interface StepItem {
  id: LoginStep;
  label: string;
  detail?: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

@Component({
  selector: 'app-landing-login-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full max-w-md mx-auto relative select-none">
      <!-- Cabecera del formulario (Integrado directamente sobre fondo carbón de la sección, Flat KISS) -->
      <div class="relative z-10 text-center mb-8">
        <h3 class="text-4xl sm:text-5xl font-black text-[var(--utopik-platinum)] tracking-tight lowercase">
          utopik<span class="text-[var(--utopik-green-yellow)]">.</span>
        </h3>
        <p class="text-xs sm:text-sm text-neutral-400 mt-2 max-w-sm mx-auto font-medium">
          Código institucional y contraseña del portal.
        </p>
      </div>

      <!-- Formulario de credenciales (cuando no está en bootstrapping activo) -->
      @if (!isBootstrapping) {
        <form (ngSubmit)="handleLogin()" class="relative z-10 space-y-4">
          <!-- Mensaje de error -->
          @if (errorMessage) {
            <div class="p-3.5 rounded-[var(--r-lg)] bg-red-500/10 text-red-400 text-xs font-semibold flex items-start gap-2.5">
              <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="2"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"/>
              </svg>
              <span>{{ errorMessage }}</span>
            </div>
          }

          <!-- Campo Código -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-[var(--utopik-platinum)] uppercase tracking-wider">
              Código de estudiante
            </label>
            <div class="relative">
              <input
                type="text"
                [(ngModel)]="username"
                name="username"
                placeholder="Ej. U23307609"
                required
                autocomplete="username"
                class="w-full px-4 py-3.5 rounded-[var(--r-lg)] bg-[var(--utopik-onyx)] text-[var(--utopik-platinum)] placeholder-neutral-600 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--utopik-green-yellow)] transition font-mono uppercase border-none"
              />
            </div>
          </div>

          <!-- Campo Contraseña -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-[var(--utopik-platinum)] uppercase tracking-wider">
              Contraseña
            </label>
            <div class="relative">
              <input
                [type]="showPassword ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                placeholder="Tu contraseña del portal"
                required
                autocomplete="current-password"
                class="w-full px-4 py-3.5 rounded-[var(--r-lg)] bg-[var(--utopik-onyx)] text-[var(--utopik-platinum)] placeholder-neutral-600 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--utopik-green-yellow)] transition pr-11 border-none"
              />
              <button
                type="button"
                (click)="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs font-bold cursor-pointer bg-transparent border-none p-1"
              >
                {{ showPassword ? 'Ocultar' : 'Ver' }}
              </button>
            </div>
          </div>

          <!-- Botón de Envío: Conciso, directo (Acceder) -->
          <button
            type="submit"
            [disabled]="isLoading || !username || !password"
            class="w-full py-4 px-6 rounded-[var(--r-lg)] bg-[var(--utopik-green-yellow)] hover:bg-[#aee642] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--utopik-onyx)] font-black text-sm uppercase tracking-wider shadow-lg shadow-[var(--utopik-green-yellow)]/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border-none mt-4"
          >
            @if (isLoading) {
              <svg class="animate-spin h-4 w-4 text-[var(--utopik-onyx)]" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Verificando...</span>
            } @else {
              <span>Acceder</span>
              <svg class="w-4 h-4 text-[var(--utopik-onyx)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            }
          </button>
        </form>
      } @else {
        <!-- Stepper de Sincronización en Tiempo Real (Bloques planos onyx sobre fondo carbón) -->
        <div class="relative z-10 space-y-4 py-2">
          <div class="space-y-2.5">
            @for (step of steps; track step.id) {
              <div class="p-3.5 rounded-[var(--r-lg)] bg-[var(--utopik-onyx)] border-none transition-all shadow-md shadow-black/30">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    @if (step.status === 'completed') {
                      <div class="w-5 h-5 rounded-full bg-[var(--utopik-green-yellow)] text-[var(--utopik-onyx)] flex items-center justify-center">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                    } @else if (step.status === 'active') {
                      <div class="w-5 h-5 rounded-full border-2 border-[var(--utopik-green-yellow)] border-t-transparent animate-spin"></div>
                    } @else if (step.status === 'failed') {
                      <div class="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </div>
                    } @else {
                      <div class="w-5 h-5 rounded-full bg-neutral-800 text-neutral-500 flex items-center justify-center text-[10px] font-bold">
                        ·
                      </div>
                    }

                    <div>
                      <div class="text-xs font-bold"
                           [ngClass]="{
                             'text-[var(--utopik-green-yellow)]': step.status === 'active' || step.status === 'completed',
                             'text-red-400': step.status === 'failed',
                             'text-neutral-400': step.status === 'pending'
                           }">
                        {{ step.label }}
                      </div>
                      @if (step.detail) {
                        <div class="text-[11px] text-neutral-400 mt-0.5">{{ step.detail }}</div>
                      }
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          @if (failedStep) {
            <button
              type="button"
              (click)="resetLoginState()"
              class="w-full py-3 px-4 rounded-[var(--r-lg)] bg-[var(--utopik-onyx)] hover:bg-neutral-800 text-[var(--utopik-platinum)] font-bold text-xs uppercase tracking-wider border-none transition cursor-pointer mt-3"
            >
              Reintentar acceso
            </button>
          }
        </div>
      }

      <!-- Footer del Login (Flat sobre fondo carbón) -->
      <div class="relative z-10 mt-8 flex items-center justify-between text-xs text-neutral-400 font-semibold border-none">
        <button
          type="button"
          (click)="openPrivacy.emit()"
          class="hover:text-[var(--utopik-platinum)] transition bg-transparent border-none cursor-pointer p-0 font-bold"
        >
          Políticas & Privacidad
        </button>
        <span class="font-mono text-[11px] text-neutral-500 font-bold">utopik</span>
      </div>
    </div>
  `
})
export class LandingLoginFormComponent implements OnDestroy {
  @Output() openPrivacy = new EventEmitter<void>();

  username = '';
  password = '';
  showPassword = false;
  isLoading = false;
  errorMessage: string | null = null;

  isBootstrapping = false;
  currentStep: LoginStep = 'idle';
  failedStep: LoginStep | null = null;
  bootstrapError: string | null = null;
  steps: StepItem[] = LandingLoginFormComponent.buildSteps();

  private syllabiTimer?: ReturnType<typeof setTimeout>;
  private readyTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private authService: AuthService,
    private scheduleService: ScheduleService
  ) {}

  static buildSteps(): StepItem[] {
    return [
      { id: 'auth', label: '1. Validación de Identidad', detail: 'Verificando con portal oficial...', status: 'pending' },
      { id: 'schedule', label: '2. Horario y Cursos', detail: 'Sincronizando asignaturas del ciclo...', status: 'pending' },
      { id: 'syllabi', label: '3. Sílabos y Tareas', detail: 'Sincronizando evaluaciones académicas...', status: 'pending' },
      { id: 'ready', label: '4. Copiloto Activo', detail: 'Preparando tu experiencia estudiantil...', status: 'pending' }
    ];
  }

  handleLogin(): void {
    if (!this.username || !this.password) return;

    this.clearAllTimers();
    this.isLoading = true;
    this.errorMessage = null;
    this.isBootstrapping = true;
    this.failedStep = null;
    this.bootstrapError = null;
    this.currentStep = 'auth';
    this.steps = LandingLoginFormComponent.buildSteps();
    this.updateStep('auth', { status: 'active', detail: 'Validando credenciales...' });

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          const code = (res.data.studentCode || res.data.username || this.username).toUpperCase();
          this.updateStep('auth', { status: 'completed', detail: `Estudiante verificado (${code})` });
          this.runBootstrapPhase();
        } else {
          this.failCurrentStep(res.error || 'Credenciales no válidas.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.failCurrentStep(err.error?.error || 'No se pudo conectar con el servidor.');
      }
    });
  }

  private runBootstrapPhase(): void {
    this.currentStep = 'schedule';
    this.updateStep('schedule', { status: 'active', detail: 'Sincronizando horario oficial...' });

    this.authService.bootstrapSession().subscribe({
      next: (res) => {
        if (!res.success || !res.data) {
          this.failCurrentStep(res.error || 'Error al sincronizar datos académicos.');
          return;
        }

        const summary = res.data;
        this.updateStep('schedule', {
          status: 'completed',
          detail: `Horario listo (${summary.coursesCount} cursos matriculados)`
        });

        this.currentStep = 'syllabi';
        this.updateStep('syllabi', {
          status: 'active',
          detail: 'Cargando sílabos y tareas...'
        });

        this.syllabiTimer = setTimeout(() => {
          if (!this.isBootstrapping) return;
          this.updateStep('syllabi', {
            status: 'completed',
            detail: `Evaluaciones sincronizadas (${summary.syllabiSynced}/${summary.syllabiTotal})`
          });
          this.runReadyPhase();
        }, 350);
      },
      error: (err) => {
        this.failCurrentStep(err.error?.error || 'Fallo de conexión al sincronizar cursos.');
      }
    });
  }

  private runReadyPhase(): void {
    this.currentStep = 'ready';
    this.updateStep('ready', { status: 'active', detail: 'Activando utopik...' });

    this.scheduleService.getSchedule().subscribe();

    this.readyTimer = setTimeout(() => {
      if (!this.isBootstrapping) return;
      this.updateStep('ready', { status: 'completed', detail: 'Todo listo. Bienvenido.' });

      // Transición final al dashboard estudiantil
      setTimeout(() => {
        this.authService.finalizeLogin();
      }, 450);
    }, 450);
  }

  resetLoginState(): void {
    this.clearAllTimers();
    this.isBootstrapping = false;
    this.isLoading = false;
    this.failedStep = null;
    this.errorMessage = null;
    this.currentStep = 'idle';
    this.steps = LandingLoginFormComponent.buildSteps();
  }

  private updateStep(id: LoginStep, patch: Partial<StepItem>): void {
    this.steps = this.steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
  }

  private failCurrentStep(message: string): void {
    this.failedStep = this.currentStep;
    this.bootstrapError = message;
    this.errorMessage = message;
    if (this.currentStep !== 'idle' && this.currentStep !== 'error') {
      this.updateStep(this.currentStep, { status: 'failed', detail: message });
    }
  }

  private clearAllTimers(): void {
    if (this.syllabiTimer) clearTimeout(this.syllabiTimer);
    if (this.readyTimer) clearTimeout(this.readyTimer);
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
  }
}
