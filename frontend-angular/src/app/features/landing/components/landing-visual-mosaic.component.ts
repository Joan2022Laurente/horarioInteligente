import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-landing-visual-mosaic',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="relative w-full max-w-xl h-full flex flex-col justify-center items-center pt-20 pb-8 px-4 sm:px-6 select-none">

      <!-- Contenedor Grid Stack: todas las vistas comparten la celda (1, 1) evitando desmontajes de DOM y parpadeos -->
      <div class="w-full grid grid-cols-1 grid-rows-1 items-center justify-items-center">

        <!-- ════════════════════════════════════════════════════════════════════════════
             SECTOR 0: HERO — MOSAICO ARTÍSTICO ASIMÉTRICO (Inspiración noho)
             ════════════════════════════════════════════════════════════════════════════ -->
        <div 
          class="col-start-1 row-start-1 w-full transition-opacity duration-300 ease-out"
          [ngClass]="active === 0 ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'"
        >
          <div class="w-full grid grid-cols-12 gap-3.5">
            
            <!-- Tile 1 (Grande, Verde Lima): Identidad y Ciclo -->
            <div class="col-span-7 r-card bg-[var(--utopik-green-yellow)] text-[var(--utopik-onyx)] p-5 flex flex-col justify-between shadow-xl min-h-[160px] transform hover:scale-[1.02] transition-transform">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-black uppercase tracking-widest bg-[var(--utopik-onyx)] text-[var(--utopik-green-yellow)] px-2.5 py-1 rounded-full">
                  2026 · Ciclo II
                </span>
                <span class="text-xs font-sans font-bold">UTP OS</span>
              </div>
              <div>
                <div class="text-3xl font-black tracking-tighter leading-none">153</div>
                <div class="text-xs font-extrabold uppercase tracking-wide mt-1">Sesiones de Horario Oficial</div>
              </div>
              <div class="text-[10px] font-bold tracking-wider uppercase opacity-80">
                Sincronización Inmediata
              </div>
            </div>

            <!-- Tile 2 (Carbon Black): Reloj en Vivo -->
            <div class="col-span-5 r-card bg-[var(--utopik-carbon-black)] text-[var(--utopik-platinum)] p-5 flex flex-col justify-between shadow-xl min-h-[160px] border border-black/10 transform hover:scale-[1.02] transition-transform">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase tracking-widest text-neutral-400">En Vivo</span>
                <span class="w-2 h-2 circle bg-[var(--utopik-green-yellow)] animate-ping"></span>
              </div>
              <div class="my-2">
                <div class="text-3xl font-black font-sans tracking-tight text-[var(--utopik-platinum)]">14:28</div>
                <div class="text-[10px] text-neutral-400 font-medium">Campus Central</div>
              </div>
              <div class="text-[9px] font-bold uppercase tracking-wider text-[var(--utopik-green-yellow)]">
                Turno Activo
              </div>
            </div>

            <!-- Tile 3 (Sandy Brown): Beacons y Alumnos -->
            <div class="col-span-5 r-card bg-[var(--utopik-sandy-brown)] text-[var(--utopik-onyx)] p-5 flex flex-col justify-between shadow-xl min-h-[160px] transform hover:scale-[1.02] transition-transform">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase tracking-widest bg-[var(--utopik-onyx)] text-[var(--utopik-sandy-brown)] px-2 py-0.5 rounded-full">
                  Radar
                </span>
                <div class="flex -space-x-1.5">
                  <span class="w-4 h-4 circle bg-[var(--utopik-onyx)] text-[var(--utopik-sandy-brown)] text-[8px] font-black flex items-center justify-center">J</span>
                  <span class="w-4 h-4 circle bg-white text-black text-[8px] font-black flex items-center justify-center">M</span>
                  <span class="w-4 h-4 circle bg-[var(--utopik-green-yellow)] text-black text-[8px] font-black flex items-center justify-center">+8</span>
                </div>
              </div>
              <div>
                <div class="text-base font-black leading-tight">Piso 4 Biblioteca</div>
                <div class="text-[10px] font-bold mt-0.5 text-black/80">Compañeros Estudiando</div>
              </div>
              <div class="text-[9px] font-black uppercase tracking-wider text-black/70">
                Beacons Activos
              </div>
            </div>

            <!-- Tile 4 (Onyx + Acentos): Marketplace & Copiloto -->
            <div class="col-span-7 r-card bg-[var(--utopik-onyx)] text-[var(--utopik-platinum)] p-5 flex flex-col justify-between shadow-xl min-h-[160px] border border-white/5 transform hover:scale-[1.02] transition-transform">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase tracking-widest text-[var(--utopik-green-yellow)]">Market & AI</span>
                <span class="px-2 py-0.5 rounded-full bg-lime-400/20 text-[var(--utopik-green-yellow)] text-[9px] font-black">
                  Comunidad
                </span>
              </div>
              <div class="my-2">
                <div class="text-sm font-bold text-[var(--utopik-platinum)]">Calculadora TI-Nspire CX</div>
                <div class="text-xs text-[var(--utopik-green-yellow)] font-sans font-black mt-0.5">S/ 450.00 · Entrega en Aula</div>
              </div>
              <div class="flex items-center justify-between text-[10px] text-neutral-400 font-medium">
                <span>Entre Estudiantes</span>
                <span class="text-[var(--utopik-platinum)] font-bold">100% Seguro</span>
              </div>
            </div>

          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════════════════════
             SECTOR 1: CLASES & HORARIO — SIMULADOR INTERACTIVO DE HORARIO REAL
             ════════════════════════════════════════════════════════════════════════════ -->
        <div 
          class="col-start-1 row-start-1 w-full transition-opacity duration-300 ease-out"
          [ngClass]="active === 1 ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'"
        >
          <div class="w-full space-y-3.5">
            
            <!-- Encabezado de Calendario Estudiantil -->
            <div class="flex items-center justify-between px-2">
              <div>
                <div class="text-xs font-black uppercase tracking-widest text-[var(--utopik-onyx)]">Viernes, 23 de Octubre</div>
                <div class="text-[11px] text-neutral-500 font-medium">3 clases programadas hoy</div>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-[var(--utopik-green-yellow)] text-[var(--utopik-onyx)] font-black text-[10px] uppercase tracking-wider shadow-sm">
                Sincronizado
              </span>
            </div>

            <!-- Selector de Días de la Semana -->
            <div class="grid grid-cols-6 gap-2 p-2 r-panel bg-black/5 border border-black/10 text-center">
              @for (d of ['L','M','M','J','V','S']; track $index) {
                <div 
                  class="py-2 r-control-lg text-xs font-black transition-all cursor-pointer select-none"
                  [ngClass]="{
                    'bg-[var(--utopik-green-yellow)] text-black shadow-sm font-black': $index === 4,
                    'text-neutral-700 hover:text-black hover:bg-black/5': $index !== 4
                  }"
                >
                  {{ d }}
                </div>
              }
            </div>

            <!-- Timeline: Clase Pasada -->
            <div class="p-4 r-panel bg-black/5 border border-black/10 flex items-center justify-between opacity-70">
              <div>
                <div class="text-[10px] font-sans font-medium text-neutral-600 font-bold">08:00 - 10:15 · Finalizada</div>
                <div class="text-xs font-bold text-[var(--utopik-onyx)]">Sistemas Distribuidos</div>
                <div class="text-[10px] text-neutral-500">Aula 302 · Torre B</div>
              </div>
              <span class="text-[10px] font-sans font-bold text-black/60 uppercase">
                Presencial
              </span>
            </div>

            <!-- Timeline: CLASE EN CURSO / PRÓXIMA (Tarjeta Heroica Verde Lima) -->
            <div class="p-5 r-card bg-[var(--utopik-green-yellow)] text-[var(--utopik-onyx)] shadow-2xl shadow-sm border-2 border-black/10 space-y-3 transform scale-[1.02]">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full bg-[var(--utopik-onyx)] text-[var(--utopik-green-yellow)] text-[9px] font-black uppercase tracking-wider animate-pulse">
                  Comienza en 12 minutos
                </span>
                <span class="text-xs font-sans font-black">14:30 - 16:00</span>
              </div>
              <div>
                <h4 class="text-2xl font-black tracking-tight leading-none">Cálculo Aplicado II</h4>
                <p class="text-xs font-bold mt-1 text-black/80">Sección 14088 · Teoría Presencial</p>
              </div>
              <div class="pt-2 border-t border-black/15 flex items-center justify-between text-xs font-extrabold">
                <div class="flex items-center gap-1.5">
                  <lucide-icon name="map-pin" class="w-4 h-4 stroke-[2.5]"></lucide-icon>
                  <span>Aula 402 · Torre A (Piso 4)</span>
                </div>
                <span class="underline cursor-pointer">Ver Ruta</span>
              </div>
            </div>

            <!-- Timeline: Siguiente Clase de la Tarde -->
            <div class="p-4 r-panel bg-[var(--utopik-carbon-black)] text-[var(--utopik-platinum)] border border-black/10 flex items-center justify-between shadow-md">
              <div>
                <div class="text-[10px] font-sans font-medium text-[var(--utopik-green-yellow)] font-bold">16:30 - 18:45 · Más Tarde</div>
                <div class="text-xs font-bold text-white">Herramientas de Comunicación Efectiva</div>
                <div class="text-[10px] text-neutral-400">Aula Virtual Zoom · Link directo listo</div>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-[rgba(187,244,81,0.1)] text-[var(--utopik-green-yellow)] text-[9px] font-black uppercase">
                Zoom
              </span>
            </div>

          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════════════════════
             SECTOR 2: CAMPUS & NETWORKING — RADAR EN VIVO & STUDY BEACONS
             ════════════════════════════════════════════════════════════════════════════ -->
        <div 
          class="col-start-1 row-start-1 w-full transition-opacity duration-300 ease-out"
          [ngClass]="active === 2 ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'"
        >
          <div class="w-full space-y-3.5">
            
            <!-- Encabezado de Radar -->
            <div class="flex items-center justify-between px-2">
              <div>
                <div class="text-xs font-black uppercase tracking-widest text-[var(--utopik-onyx)]">Radar de Campus</div>
                <div class="text-[11px] text-neutral-500 font-medium">Campus Lima Centro · Torre A & Biblioteca</div>
              </div>
              <div class="flex items-center gap-1.5 text-xs font-black text-emerald-700">
                <span class="w-2 h-2 circle bg-emerald-500 animate-ping"></span>
                24 Alumnos Conectados
              </div>
            </div>

            <!-- BEACON PRINCIPAL (Tarjeta Cálida Sandy Brown) -->
            <div class="p-5 r-card bg-[var(--utopik-sandy-brown)] text-[var(--utopik-onyx)] shadow-xl shadow-sm border border-black/10 space-y-3">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full bg-[var(--utopik-onyx)] text-[var(--utopik-sandy-brown)] text-[9px] font-black uppercase tracking-wider">
                  Study Beacon Activo
                </span>
                <span class="text-xs font-black text-black/80">Piso 4 · Biblioteca</span>
              </div>
              <div>
                <h4 class="text-xl font-black tracking-tight leading-tight">Grupo Repaso Cálculo Aplicado</h4>
                <p class="text-xs font-bold text-black/80 mt-0.5">Mesa 12 · Resolviendo Guía de Práctica 2</p>
              </div>
              
              <!-- Avatares de compañeros en el beacon -->
              <div class="pt-2 border-t border-black/15 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="flex -space-x-2">
                    <span class="w-7 h-7 circle bg-[var(--utopik-onyx)] text-[var(--utopik-platinum)] font-black text-[10px] flex items-center justify-center border-2 border-[var(--utopik-sandy-brown)]">JL</span>
                    <span class="w-7 h-7 circle bg-[var(--utopik-carbon-black)] text-white font-black text-[10px] flex items-center justify-center border-2 border-[var(--utopik-sandy-brown)]">MC</span>
                    <span class="w-7 h-7 circle bg-[var(--utopik-green-yellow)] text-black font-black text-[10px] flex items-center justify-center border-2 border-[var(--utopik-sandy-brown)]">AR</span>
                    <span class="w-7 h-7 circle bg-[var(--utopik-onyx)] text-[var(--utopik-sandy-brown)] font-black text-[10px] flex items-center justify-center border-2 border-[var(--utopik-sandy-brown)]">+5</span>
                  </div>
                  <span class="text-[11px] font-extrabold text-[var(--utopik-onyx)]">8 compañeros unidos</span>
                </div>
                <button type="button" class="px-3 py-1.5 r-control-sm bg-[var(--utopik-onyx)] text-[var(--utopik-platinum)] text-[10px] font-black uppercase tracking-wider cursor-pointer border-none hover:bg-black">
                  Unirme
                </button>
              </div>
            </div>

            <!-- BEACON SECUNDARIO (Tarjeta Carbon Black) -->
            <div class="p-4 r-panel bg-[var(--utopik-carbon-black)] text-[var(--utopik-platinum)] shadow-lg border border-black/15 flex items-center justify-between">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 circle bg-[var(--utopik-green-yellow)]"></span>
                  <span class="text-xs font-bold text-white">Cafetería Torre A · Mesas con Enchufe</span>
                </div>
                <div class="text-[11px] text-neutral-400">Espacio libre para cargar laptop y avanzar informes</div>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-lime-400/20 text-[var(--utopik-green-yellow)] text-[9px] font-black uppercase tracking-wider">
                Disponible
              </span>
            </div>

            <!-- Micro-Badge de Comunidad -->
            <div class="p-3.5 r-control-lg bg-[var(--utopik-onyx)] text-[var(--utopik-platinum)] text-xs flex items-center justify-between border border-white/10">
              <span class="text-neutral-300 font-medium text-[11px]">¿Estudiando solo? Enciende tu Beacon y comparte mesa.</span>
              <span class="text-[var(--utopik-sandy-brown)] font-bold text-[10px] uppercase tracking-wider underline cursor-pointer">Activar</span>
            </div>

          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════════════════════
             SECTOR 3: MARKETPLACE — TIENDA ESTUDIANTIL Y ECONOMÍA CIRCULAR
             ════════════════════════════════════════════════════════════════════════════ -->
        <div 
          class="col-start-1 row-start-1 w-full transition-opacity duration-300 ease-out"
          [ngClass]="active === 3 ? 'opacity-100 pointer-events-auto z-10' : 'opacity-0 pointer-events-none z-0'"
        >
          <div class="w-full space-y-3.5">
            
            <!-- Encabezado de Marketplace -->
            <div class="flex items-center justify-between px-2">
              <div>
                <div class="text-xs font-black uppercase tracking-widest text-[var(--utopik-onyx)]">Mercado Universitario</div>
                <div class="text-[11px] text-neutral-500 font-medium">Compra y venta directa entre alumnos verificados</div>
              </div>
            </div>

            <!-- ITEM 1: Calculadora Gráfica (Tarjeta Carbon Black con Acento Verde Lima) -->
            <div class="p-4 r-card bg-[var(--utopik-carbon-black)] text-[var(--utopik-platinum)] border border-white/10 shadow-xl flex items-center justify-between gap-4">
              <div class="w-14 h-14 r-panel bg-[var(--utopik-onyx)] border border-white/10 flex items-center justify-center shrink-0">
                <lucide-icon name="calculator" class="w-6 h-6 text-[var(--utopik-green-yellow)]"></lucide-icon>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-[9px] font-black uppercase tracking-wider text-[var(--utopik-green-yellow)] bg-lime-400/20 px-2 py-0.5 rounded-full">
                    Ingeniería
                  </span>
                  <span class="text-[10px] text-neutral-400">Ciclo 6 · Ing. Sistemas</span>
                </div>
                <div class="text-sm font-black text-white truncate mt-0.5">Calculadora Casio fx-991LA CW</div>
                <div class="text-[11px] text-neutral-400">Excelente estado · Incluye manual</div>
              </div>
              <div class="text-right shrink-0">
                <div class="text-base font-black text-[var(--utopik-green-yellow)] font-sans font-medium">S/ 45.00</div>
                <button type="button" class="mt-1 px-3 py-1 r-control-sm bg-[var(--utopik-green-yellow)] text-[var(--utopik-onyx)] text-[10px] font-black uppercase tracking-wider cursor-pointer border-none hover:bg-[#aee642]">
                  Contactar
                </button>
              </div>
            </div>

            <!-- ITEM 2: Libro de Carrera (Tarjeta Onyx) -->
            <div class="p-4 r-card bg-[var(--utopik-onyx)] text-[var(--utopik-platinum)] border border-white/10 shadow-xl flex items-center justify-between gap-4">
              <div class="w-14 h-14 r-panel bg-[var(--utopik-carbon-black)] border border-white/10 flex items-center justify-center shrink-0">
                <lucide-icon name="book-open" class="w-6 h-6 text-[var(--utopik-sandy-brown)]"></lucide-icon>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-[9px] font-black uppercase tracking-wider text-[var(--utopik-sandy-brown)] bg-amber-500/20 px-2 py-0.5 rounded-full">
                    Ciencias
                  </span>
                  <span class="text-[10px] text-neutral-400">Ciclo 2</span>
                </div>
                <div class="text-sm font-black text-white truncate mt-0.5">Física Universitaria Sears Vol. 1</div>
                <div class="text-[11px] text-neutral-400">Original · Con ejercicios resueltos</div>
              </div>
              <div class="text-right shrink-0">
                <div class="text-base font-black text-[var(--utopik-sandy-brown)] font-sans font-medium">S/ 35.00</div>
                <button type="button" class="mt-1 px-3 py-1 r-control-sm bg-[var(--utopik-sandy-brown)] text-[var(--utopik-onyx)] text-[10px] font-black uppercase tracking-wider cursor-pointer border-none hover:bg-amber-400">
                  Contactar
                </button>
              </div>
            </div>

            <!-- ITEM 3: Asesoría / Tutoría de Alumnos -->
            <div class="p-4 r-card bg-[var(--utopik-sandy-brown)] text-[var(--utopik-onyx)] shadow-lg flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 circle bg-[var(--utopik-onyx)] text-[var(--utopik-sandy-brown)] font-black text-sm flex items-center justify-center">
                  <lucide-icon name="graduation-cap" class="w-5 h-5 text-[var(--utopik-sandy-brown)]"></lucide-icon>
                </div>
                <div>
                  <div class="text-xs font-black uppercase tracking-wider">Asesorías de Cálculo & Física</div>
                  <div class="text-[11px] font-bold text-black/80">Por estudiante de 9no ciclo con promedio 18.5</div>
                </div>
              </div>
              <span class="text-sm font-black font-sans">S/ 15/hr</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class LandingVisualMosaicComponent {
  @Input() active = 0;
}
