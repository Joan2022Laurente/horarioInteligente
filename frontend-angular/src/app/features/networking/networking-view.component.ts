import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudyBuddyMatch, StudyBeaconRow } from '@domain/models/matching';
import { NetworkingService } from '@data/services/networking.service';
import { formatCourseName } from '@data/schedule-parser';

@Component({
  selector: 'app-networking-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 text-white font-sans text-left">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
        <div>
          <h2 class="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Radar de Estudio & Matching Dual</span>
            <span class="text-[11px] font-bold text-[var(--accent-lime)] bg-[var(--accent-lime)]/10 border border-[var(--accent-lime)]/20 px-2.5 py-0.5 rounded-full">
              Sede Lima Centro
            </span>
          </h2>
          <p class="text-xs text-neutral-400 mt-1">
            Conecta con compañeros de tu misma sede y ciclo según tus horas libres in-campus, cursos y habilidades complementarias.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            (click)="isCreatingBeacon = true"
            class="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] px-4 py-2 text-xs font-black text-black transition active:scale-95 shadow-none border-none cursor-pointer"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            <span>Crear Mesa In-Campus</span>
          </button>
        </div>
      </div>

      <!-- Controls & Tabs -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div class="inline-flex items-center gap-1 bg-[var(--surface-card)] border border-[var(--border-subtle)] p-1 rounded-2xl text-xs">
          <button
            (click)="activeTab = 'buddies'"
            class="px-3.5 py-1.5 rounded-xl font-bold border-none cursor-pointer transition"
            [ngClass]="activeTab === 'buddies' ? 'bg-white text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white'"
          >
            Matching Dual 1 a 1 ({{ filteredBuddies.length }})
          </button>
          <button
            (click)="activeTab = 'beacons'"
            class="px-3.5 py-1.5 rounded-xl font-bold border-none cursor-pointer transition"
            [ngClass]="activeTab === 'beacons' ? 'bg-white text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white'"
          >
            Mesas de Estudio ({{ beacons.length }})
          </button>
        </div>

        <!-- Filter pills -->
        <div class="inline-flex items-center gap-1 bg-[var(--surface-card)] border border-[var(--border-subtle)] p-1 rounded-2xl text-xs">
          <button
            (click)="selectedModalityFilter = 'ALL'"
            class="px-3 py-1 rounded-xl font-bold border-none cursor-pointer transition"
            [ngClass]="selectedModalityFilter === 'ALL' ? 'bg-white text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white'"
          >
            Todos
          </button>
          <button
            (click)="selectedModalityFilter = 'Presencial'"
            class="px-3 py-1 rounded-xl font-bold border-none cursor-pointer transition"
            [ngClass]="selectedModalityFilter === 'Presencial' ? 'bg-[var(--accent-emerald)] text-black font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white'"
          >
            Presencial (Campus)
          </button>
          <button
            (click)="selectedModalityFilter = 'Virtual'"
            class="px-3 py-1 rounded-xl font-bold border-none cursor-pointer transition"
            [ngClass]="selectedModalityFilter === 'Virtual' ? 'bg-[var(--accent-purple)] text-white font-extrabold' : 'bg-transparent text-neutral-400 hover:text-white'"
          >
            Virtual
          </button>
        </div>
      </div>

      <!-- TAB 1: Matching Dual 1 a 1 -->
      @if (activeTab === 'buddies') {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (buddy of filteredBuddies; track buddy.id) {
            <div class="flex flex-col justify-between rounded-3xl bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] hover:border-neutral-500 p-5 space-y-4 shadow-none transition-all group">
              <div class="space-y-3.5">
                
                <!-- Match Score & Badge -->
                <div class="flex items-center justify-between gap-2">
                  <span class="inline-flex items-center gap-1.5 text-[11px] font-black text-black bg-[var(--accent-lime)] px-3 py-1 rounded-full shadow-none">
                    <svg class="h-3 w-3 fill-black" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    <span>{{ buddy.compatibilityPercent }}% Match Dual</span>
                  </span>

                  <div class="flex items-center gap-1.5">
                    <span class="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--badge-emerald-text)] bg-[var(--badge-emerald-bg)] border border-[var(--badge-emerald-border)] px-2 py-0.5 rounded-full">
                      <span class="h-1.5 w-1.5 rounded-full bg-[var(--accent-emerald)] animate-pulse"></span>
                      {{ buddy.modality === 'Presencial' ? 'In-Campus' : 'Online' }}
                    </span>
                  </div>
                </div>

                <!-- Perfil y Carrera -->
                <div class="flex items-start gap-3">
                  <div class="h-11 w-11 rounded-2xl bg-[var(--surface-subtle)] text-white font-bold flex items-center justify-center text-sm shrink-0 border border-white/10">
                    {{ buddy.avatarLetter }}
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <h3 class="text-sm font-bold text-white group-hover:text-[var(--accent-lime)] transition-colors truncate">
                        {{ buddy.name }}
                      </h3>
                      <svg class="h-3.5 w-3.5 text-[var(--accent-emerald)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <p class="text-[11px] text-neutral-400 truncate mt-0.5">
                      {{ buddy.career }} • Ciclo {{ buddy.cycle }}
                    </p>
                  </div>
                </div>

                <!-- Curso y Ventana Libre Compartida -->
                <div class="space-y-2 text-xs bg-[var(--surface-subtle)] p-3 rounded-2xl border border-white/5">
                  <div class="flex items-center justify-between text-neutral-200 font-bold">
                    <span class="truncate text-[12px] text-white">{{ formatCourseName(buddy.courseName) }}</span>
                  </div>

                  <div class="flex items-center gap-1.5 text-[11px] text-[var(--accent-orange)] font-medium">
                    <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>{{ buddy.sharedWindow.dayName }} {{ buddy.sharedWindow.start }} – {{ buddy.sharedWindow.end }}</span>
                  </div>

                  <div class="flex items-center gap-1.5 text-[10px] text-neutral-400">
                    <svg class="h-3 w-3 text-neutral-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>{{ buddy.sharedWindow.location }} ({{ buddy.campus }})</span>
                  </div>
                </div>

                <!-- Factores Clave de Compatibilidad -->
                <div class="space-y-1">
                  @for (reason of buddy.matchScore.reasons.slice(0, 2); track reason) {
                    <p class="text-[10px] text-neutral-300 flex items-center gap-1.5">
                      <span class="h-1 w-1 rounded-full bg-[var(--accent-lime)] shrink-0"></span>
                      <span class="truncate">{{ reason }}</span>
                    </p>
                  }
                </div>

                <!-- Habilidades Complementarias -->
                <div class="flex flex-wrap gap-1.5 pt-1">
                  @for (skill of buddy.skills; track skill) {
                    <span class="inline-flex items-center text-[10px] font-mono bg-white/[0.06] text-neutral-300 px-2 py-0.5 rounded-lg border border-white/5">
                      {{ skill }}
                    </span>
                  }
                </div>
              </div>

              <!-- Acciones de Contacto e IA -->
              <div class="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  (click)="connectTarget = buddy"
                  class="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs transition active:scale-95 shadow-none border-none cursor-pointer"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                  <span>Conectar 1 a 1</span>
                </button>

                <button
                  (click)="onAskAi('Analiza la complementariedad de estudio con ' + buddy.name + ' para el curso ' + buddy.courseName + ' según nuestro horario')"
                  title="Consultar al Agente sobre este match"
                  class="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)] text-white transition active:scale-95 shrink-0 shadow-none border-none cursor-pointer"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- TAB 2: Mesas de Estudio (Beacons) -->
      @if (activeTab === 'beacons') {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (b of beacons; track b.id) {
            <div class="flex flex-col justify-between rounded-3xl bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)] border border-[var(--border-subtle)] hover:border-neutral-500 p-5 space-y-4 shadow-none transition-all">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent-lime)] bg-[var(--accent-lime)]/10 px-2.5 py-0.5 rounded-full">
                    {{ b.current_collaborators }}/{{ b.max_collaborators }} Compañeros
                  </span>
                  <span class="text-[10px] font-mono text-neutral-400">Activa ahora</span>
                </div>

                <div class="space-y-1">
                  <span class="text-[11px] font-bold text-[var(--accent-orange)]">{{ formatCourseName(b.course_name) }}</span>
                  <h3 class="text-sm font-bold text-white">{{ b.location_name }}</h3>
                </div>

                <p class="text-xs text-neutral-300 leading-relaxed bg-[var(--surface-subtle)] p-3 rounded-2xl border border-white/5">
                  &ldquo;{{ b.objective }}&rdquo;
                </p>

                <p class="text-[10px] text-neutral-400 flex items-center gap-1">
                  <span>Host: {{ b.host_name || 'Compañero UTP' }}</span>
                </p>
              </div>

              <button
                (click)="connectTargetBeacon = b"
                class="w-full py-2.5 rounded-xl bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-black font-extrabold text-xs transition active:scale-95 border-none cursor-pointer"
              >
                Unirme a la Mesa
              </button>
            </div>
          }
        </div>
      }

      <!-- MODAL: Crear Mesa de Estudio -->
      @if (isCreatingBeacon) {
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          (click)="isCreatingBeacon = false"
        >
          <div 
            class="relative flex flex-col w-full max-w-md rounded-3xl bg-[#111114] text-white p-6 shadow-2xl border border-white/10 space-y-4"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 class="text-base font-bold text-white">Publicar Mesa de Estudio In-Campus</h3>
              <button (click)="isCreatingBeacon = false" class="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white border-none cursor-pointer">✕</button>
            </div>

            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-neutral-400 font-bold mb-1">Ubicación física en Campus</label>
                <input 
                  [(ngModel)]="newBeaconLocation" 
                  placeholder="Ej: Torre A - Piso 8 (Laboratorio PC)" 
                  class="w-full bg-[var(--surface-subtle)] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[var(--accent-lime)]"
                />
              </div>

              <div>
                <label class="block text-neutral-400 font-bold mb-1">Curso / Asignatura</label>
                <select 
                  [(ngModel)]="newBeaconCourse"
                  class="w-full bg-[var(--surface-subtle)] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[var(--accent-lime)] cursor-pointer"
                >
                  <option value="Desarrollo Web Integrado">Desarrollo Web Integrado</option>
                  <option value="Servicios Cloud">Servicios Cloud</option>
                  <option value="Gestión del Servicio TI">Gestión del Servicio TI</option>
                  <option value="Formación para la Investigación - Sistemas">Formación para la Investigación - Sistemas</option>
                  <option value="Lenguajes de Programación">Lenguajes de Programación</option>
                  <option value="Herramientas para la Comunicación Efectiva">Herramientas para la Comunicación Efectiva</option>
                </select>
              </div>

              <div>
                <label class="block text-neutral-400 font-bold mb-1">Objetivo de la sesión</label>
                <textarea 
                  [(ngModel)]="newBeaconObjective" 
                  rows="2"
                  placeholder="Ej: Resolviendo laboratorio de Spring Boot + Docker para APF1..." 
                  class="w-full bg-[var(--surface-subtle)] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[var(--accent-lime)] resize-none"
                ></textarea>
              </div>

              <div>
                <label class="block text-neutral-400 font-bold mb-1">Capacidad máxima</label>
                <select 
                  [(ngModel)]="newBeaconCapacity"
                  class="w-full bg-[var(--surface-subtle)] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[var(--accent-lime)] cursor-pointer"
                >
                  <option [value]="2">2 personas (Dual)</option>
                  <option [value]="3">3 personas (Trío)</option>
                  <option [value]="4">4 personas (Squad de proyecto)</option>
                  <option [value]="6">6 personas (Mesa de laboratorio)</option>
                </select>
              </div>
            </div>

            <div class="flex items-center gap-2 pt-2">
              <button 
                (click)="isCreatingBeacon = false"
                class="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border-none cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                (click)="submitCreateBeacon()"
                class="flex-1 py-2.5 rounded-xl bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-black font-extrabold text-xs border-none cursor-pointer"
              >
                Publicar en Radar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Handshake Directo 1 a 1 -->
      @if (connectTarget) {
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          (click)="connectTarget = null"
        >
          <div 
            class="relative flex flex-col w-full max-w-md rounded-3xl bg-[#111114] text-white p-6 shadow-2xl border border-white/10 space-y-4"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 class="text-base font-bold text-white">Canal Directo de Estudio</h3>
                <p class="text-xs text-neutral-400">{{ connectTarget.name }} • {{ connectTarget.courseName }}</p>
              </div>
              <button (click)="connectTarget = null" class="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white border-none cursor-pointer">✕</button>
            </div>

            <div class="bg-[var(--surface-subtle)] p-3.5 rounded-2xl space-y-1.5 text-xs border border-white/5">
              <p class="font-bold text-[var(--accent-lime)]">Ventana Libre Sugerida:</p>
              <p class="text-neutral-200">{{ connectTarget.sharedWindow.dayName }} de {{ connectTarget.sharedWindow.start }} a {{ connectTarget.sharedWindow.end }}</p>
              <p class="text-[11px] text-neutral-400">Lugar: {{ connectTarget.sharedWindow.location }} ({{ connectTarget.campus }})</p>
            </div>

            <div class="space-y-2 pt-1">
              @if (connectTarget.whatsappPhone) {
                <a 
                  [href]="connectTarget.whatsappPhone" 
                  target="_blank"
                  class="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs no-underline transition"
                >
                  <svg class="h-4 w-4 fill-black" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
                  <span>Coordinar por WhatsApp</span>
                </a>
              }

              @if (connectTarget.email) {
                <a 
                  [href]="'mailto:' + connectTarget.email + '?subject=Horario Inteligente UTP - Sesión de Estudio ' + connectTarget.courseName" 
                  target="_blank"
                  class="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs no-underline transition"
                >
                  <svg class="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  <span>Enviar Correo UTP ({{ connectTarget.studentCode }})</span>
                </a>
              }
            </div>
          </div>
        </div>
      }

      <!-- MODAL: Unirse a Mesa de Estudio -->
      @if (connectTargetBeacon) {
        <div 
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          (click)="connectTargetBeacon = null"
        >
          <div 
            class="relative flex flex-col w-full max-w-md rounded-3xl bg-[#111114] text-white p-6 shadow-2xl border border-white/10 space-y-4"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 class="text-base font-bold text-white">Mesa de Estudio In-Campus</h3>
              <button (click)="connectTargetBeacon = null" class="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white border-none cursor-pointer">✕</button>
            </div>

            <div class="space-y-2 text-xs">
              <p class="text-sm font-bold text-[var(--accent-lime)]">{{ connectTargetBeacon.location_name }}</p>
              <p class="text-neutral-300">{{ connectTargetBeacon.objective }}</p>
              <p class="text-neutral-400">Cupo: {{ connectTargetBeacon.current_collaborators }}/{{ connectTargetBeacon.max_collaborators }} confirmados</p>
            </div>

            <button
              (click)="confirmJoinBeacon()"
              class="w-full py-3 rounded-2xl bg-[var(--accent-lime)] text-black font-extrabold text-xs border-none cursor-pointer"
            >
              Confirmar mi Asistencia a la Mesa
            </button>
          </div>
        </div>
      }

    </div>
  `
})
export class NetworkingViewComponent implements OnInit {
  @Output() askAi = new EventEmitter<string>();

  activeTab: 'buddies' | 'beacons' = 'buddies';
  selectedModalityFilter: 'ALL' | 'Presencial' | 'Virtual' = 'ALL';

  buddies: StudyBuddyMatch[] = [];
  beacons: StudyBeaconRow[] = [];

  isCreatingBeacon = false;
  newBeaconLocation = '';
  newBeaconCourse = 'Desarrollo Web Integrado';
  newBeaconObjective = '';
  newBeaconCapacity = 4;

  connectTarget: StudyBuddyMatch | null = null;
  connectTargetBeacon: StudyBeaconRow | null = null;

  constructor(private networkingService: NetworkingService) {}

  ngOnInit(): void {
    // Sincronizar perfil local con Supabase (con dirty check)
    this.networkingService.syncProfileToSupabase().subscribe();

    // Obtener matches duales optimizados
    this.networkingService.getDualMatches().subscribe(matches => {
      this.buddies = matches;
    });

    // Obtener mesas activas
    this.networkingService.getBeacons().subscribe(beacons => {
      this.beacons = beacons;
    });
  }

  get filteredBuddies(): StudyBuddyMatch[] {
    return this.buddies.filter(b => {
      if (this.selectedModalityFilter === 'ALL') return true;
      return b.modality === this.selectedModalityFilter;
    });
  }

  formatCourseName(name: string): string {
    return formatCourseName(name);
  }

  submitCreateBeacon(): void {
    if (!this.newBeaconLocation || !this.newBeaconObjective) return;

    this.networkingService.createBeacon({
      location_name: this.newBeaconLocation,
      course_name: this.newBeaconCourse,
      objective: this.newBeaconObjective,
      max_collaborators: this.newBeaconCapacity
    }).subscribe(() => {
      this.isCreatingBeacon = false;
      this.newBeaconLocation = '';
      this.newBeaconObjective = '';
    });
  }

  confirmJoinBeacon(): void {
    if (this.connectTargetBeacon) {
      this.connectTargetBeacon.current_collaborators = Math.min(
        this.connectTargetBeacon.max_collaborators,
        this.connectTargetBeacon.current_collaborators + 1
      );
      this.connectTargetBeacon = null;
    }
  }

  onAskAi(prompt: string): void {
    this.askAi.emit(prompt);
  }
}
