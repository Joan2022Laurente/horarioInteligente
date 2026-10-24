import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingStorySectorComponent } from './components/landing-story-sector.component';
import { LandingVisualMosaicComponent } from './components/landing-visual-mosaic.component';
import { LandingLoginFormComponent } from './landing-login-form.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    LandingStorySectorComponent,
    LandingVisualMosaicComponent,
    LandingLoginFormComponent
  ],
  template: `
    <div class="utopik-landing bg-[var(--utopik-onyx)] text-[var(--utopik-platinum)] font-sans selection:bg-[var(--utopik-green-yellow)] selection:text-black relative">
      
      <!-- ═══════════════════════════════════════════════════════════════════════════
           BLOQUE SCROLLYTELLING: 2 COLUMNAS (IZQUIERDA SCROLLABLE + DERECHA STICKY)
           Sectores 0 al 3 confinados a este contenedor
           ═══════════════════════════════════════════════════════════════════════════ -->
      <div class="relative w-full flex flex-col lg:flex-row">

        <!-- Header Flotante superior alineado a la columna izquierda -->
        <header class="absolute top-0 left-0 w-full lg:w-1/2 px-6 sm:px-10 lg:px-14 h-20 sm:h-24 flex items-center justify-between z-20">
          <div class="cursor-pointer" (click)="scrollToTop()">
            <span class="text-3xl sm:text-4xl font-black tracking-tight lowercase text-[var(--utopik-platinum)]">
              utopik<span class="text-[var(--utopik-green-yellow)]">.</span>
            </span>
          </div>

          <div class="flex items-center gap-4">
            <button
              type="button"
              (click)="scrollToLogin()"
              class="lg:hidden text-xs font-black uppercase tracking-wider text-[var(--utopik-green-yellow)] transition cursor-pointer bg-transparent border-none py-1"
            >
              Acceso
            </button>
            <button
              type="button"
              (click)="openPrivacy.emit()"
              class="text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-[var(--utopik-platinum)] transition cursor-pointer bg-transparent border-none py-1"
            >
              Políticas
            </button>
          </div>
        </header>

        <!-- COLUMNA IZQUIERDA: 4 SECTORES NARRATIVOS (0 AL 3) -->
        <div class="w-full lg:w-1/2 flex flex-col relative z-10">
          
          <!-- Sector 0: Hero (KISS: sin minisubtítulo, CTA conciso) -->
          <app-landing-story-sector 
            title="Tu vida universitaria organizada en un solo lugar." 
            subtitle="Llega a tiempo a tus clases, encuentra compañeros de estudio en tu campus y accede al marketplace de la comunidad sin fricciones." 
            cta="Comenzar" 
            color="lime"
            (ctaClick)="scrollToLogin()">
            <div class="rounded-[var(--r-xl)] bg-[var(--utopik-carbon-black)] border border-[rgba(232,233,235,0.12)] p-4 text-xs text-neutral-300">
              Sincronización académica instantánea con tu campus
            </div>
          </app-landing-story-sector>

          <!-- Sector 1: Horario -->
          <app-landing-story-sector 
            eyebrow="Horario" 
            title="Llega directo a tu aula a tiempo y sin estrés." 
            subtitle="Consulta tu horario actualizado en tiempo real. Se acabaron los PDFs borrosos y la incertidumbre de esperar a que cargue el portal cuando estás a punto de entrar al aula." 
            color="lime">
            <div class="rounded-[var(--r-xl)] bg-[var(--utopik-green-yellow)] text-[var(--utopik-onyx)] p-4 text-xs font-bold">
              Próxima clase: Cálculo Aplicado II · Aula 402 Torre A
            </div>
          </app-landing-story-sector>

          <!-- Sector 2: Networking -->
          <app-landing-story-sector 
            eyebrow="Networking" 
            title="Conecta con compañeros de tu facultad hoy mismo." 
            subtitle="¿Necesitas armar grupo para un proyecto o resolver dudas antes del examen? Activa un Study Beacon o encuentra quién está estudiando en la biblioteca de tu campus." 
            color="sandy">
            <div class="rounded-[var(--r-xl)] bg-[var(--utopik-sandy-brown)] text-[var(--utopik-onyx)] p-4 text-xs font-bold">
              Study Beacon Activo: Piso 4 Biblioteca · 8 compañeros cerca
            </div>
          </app-landing-story-sector>

          <!-- Sector 3: Marketplace -->
          <app-landing-story-sector 
            eyebrow="Marketplace" 
            title="El marketplace hecho por y para estudiantes." 
            subtitle="Vende o compra libros, calculadoras, guías y materiales de ciclos pasados directamente con otros alumnos de tu universidad con total confianza." 
            color="platinum">
            <div class="rounded-[var(--r-xl)] bg-[var(--utopik-platinum)] text-[var(--utopik-onyx)] p-4 text-xs font-bold">
              Calculadora Científica Casio · S/ 45.00 · Verificado
            </div>
          </app-landing-story-sector>

        </div>

        <!-- COLUMNA DERECHA: STICKY TOP-0 H-SCREEN (Canvas Platinum) -->
        <div 
          class="hidden lg:flex lg:w-1/2 h-screen sticky top-0 z-20 items-center justify-center p-8 lg:p-14"
          style="background-color: var(--utopik-platinum);"
        >
          <!-- Tracker Minimalista KISS (Línea activa + puntos sutiles, exactamente centrado sin texto ni marcos) -->
          <div class="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30 select-none pointer-events-none">
            @for (step of [0, 1, 2, 3]; track step) {
              <span 
                class="h-1 rounded-full transition-all duration-300"
                [ngClass]="{
                  'w-6 bg-black': activeSector === step,
                  'w-1.5 bg-black/25': activeSector !== step
                }"
              ></span>
            }
          </div>

          <!-- Botón rápido superior derecho sobre el canvas Platinum -->
          <button
            type="button"
            (click)="scrollToLogin()"
            class="absolute top-6 right-8 sm:top-8 sm:right-12 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--utopik-onyx)] text-[var(--utopik-platinum)] hover:bg-black transition-all cursor-pointer border-none text-xs font-black uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 z-30"
          >
            <span>Acceso</span>
            <svg class="w-3.5 h-3.5 text-[var(--utopik-green-yellow)]" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
            </svg>
          </button>

          <!-- Showcase Visual Mosaico reactivo al sector activo -->
          <app-landing-visual-mosaic [active]="activeSector"></app-landing-visual-mosaic>
        </div>

      </div>

      <!-- ═══════════════════════════════════════════════════════════════════════════
           SECTOR 4: LOGIN SECTION (FONDO VERDE COMPLETO, INTEGRADO SIN MODAL)
           ═══════════════════════════════════════════════════════════════════════════ -->
      <section 
        #loginSection 
        class="utopik-sector min-h-screen w-full flex flex-col items-center justify-center py-20 px-6 sm:px-10 lg:px-14 relative z-30 bg-[var(--utopik-carbon-black)]"
      >
        <div class="w-full max-w-md">
          <app-landing-login-form (openPrivacy)="openPrivacy.emit()"></app-landing-login-form>
        </div>
      </section>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      background-color: var(--utopik-onyx);
    }
  `]
})
export class LandingPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('loginSection') loginSection?: ElementRef<HTMLElement>;

  activeSector = 0;
  private sectors: HTMLElement[] = [];
  private scrollListener?: () => void;
  private wheelListener?: (e: WheelEvent) => void;
  private rafId?: number;
  private isWheeling = false;
  private wheelTimeout?: ReturnType<typeof setTimeout>;

  @Output() openPrivacy = new EventEmitter<void>();

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (window.innerWidth < 1024) return;
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      if (this.activeSector < this.sectors.length - 1) {
        event.preventDefault();
        this.goToSector(this.activeSector + 1);
      }
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      if (this.activeSector > 0) {
        event.preventDefault();
        this.goToSector(this.activeSector - 1);
      }
    }
  }

  goToSector(idx: number): void {
    if (idx >= 0 && idx < this.sectors.length) {
      this.activeSector = idx;
      this.sectors[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  ngAfterViewInit(): void {
    document.documentElement.classList.add('utopik-snap-scroll');
    this.sectors = Array.from(document.querySelectorAll<HTMLElement>('.utopik-sector'));
    
    // Wheel listener no-pasivo para control suave y auto-target en PC
    this.wheelListener = (e: WheelEvent) => {
      if (window.innerWidth < 1024) return;
      if (Math.abs(e.deltaY) < 16) return;

      e.preventDefault();

      if (this.isWheeling) return;

      const direction = e.deltaY > 0 ? 1 : -1;
      const targetIdx = this.activeSector + direction;

      if (targetIdx >= 0 && targetIdx < this.sectors.length) {
        this.isWheeling = true;
        this.goToSector(targetIdx);

        clearTimeout(this.wheelTimeout);
        this.wheelTimeout = setTimeout(() => {
          this.isWheeling = false;
        }, 750);
      }
    };

    window.addEventListener('wheel', this.wheelListener, { passive: false });

    // Listener de sincronización visual reactiva al hacer scroll
    this.scrollListener = () => {
      if (this.rafId) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = undefined;
        this.updateActiveSector();
      });
    };

    window.addEventListener('scroll', this.scrollListener, { passive: true });
    this.updateActiveSector();
  }

  private updateActiveSector(): void {
    if (this.isWheeling || !this.sectors.length) return;

    let closestIdx = 0;
    let minDistance = Infinity;
    const viewportCenter = window.innerHeight / 2;

    for (let i = 0; i < this.sectors.length; i++) {
      const rect = this.sectors[i].getBoundingClientRect();
      const sectorCenter = rect.top + rect.height / 2;
      const distance = Math.abs(sectorCenter - viewportCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = i;
      }
    }

    if (this.activeSector !== closestIdx) {
      this.activeSector = closestIdx;
    }
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('utopik-snap-scroll');
    if (this.wheelListener) {
      window.removeEventListener('wheel', this.wheelListener);
    }
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.wheelTimeout) {
      clearTimeout(this.wheelTimeout);
    }
  }

  scrollToLogin(): void {
    this.goToSector(4);
  }

  scrollToTop(): void {
    this.goToSector(0);
  }
}
