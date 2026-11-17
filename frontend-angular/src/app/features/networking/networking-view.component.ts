import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { StudyBuddyMatch, StudyBeaconRow } from '@domain/models/matching';
import { NetworkingService } from '@data/services/networking.service';
import { StudyIntent } from './components/study-match-card.component';
import { StudyCardDeckComponent } from './components/study-card-deck.component';
import { StudyBeaconCardComponent } from './components/study-beacon-card.component';
import { 
  CreateBeaconModalComponent, 
  CreateBeaconPayload 
} from './components/create-beacon-modal.component';
import { ConnectHandshakeModalComponent } from './components/connect-handshake-modal.component';
import { JoinBeaconModalComponent } from './components/join-beacon-modal.component';

@Component({
  selector: 'app-networking-view',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    LucideAngularModule,
    StudyCardDeckComponent,
    StudyBeaconCardComponent,
    CreateBeaconModalComponent,
    ConnectHandshakeModalComponent,
    JoinBeaconModalComponent
  ],
  template: `
    <div class="max-w-[1140px] mx-auto w-full px-3 sm:px-6 py-4 space-y-6 text-white font-sans text-left">
      
      <!-- ===================================================================== -->
      <!-- TOP BANNER & HEADER                                                   -->
      <!-- ===================================================================== -->
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-xl sm:text-2xl font-black tracking-tight text-[var(--foreground)] flex items-center gap-2">
              <span>Radar de Estudio & Matching</span>
            </h2>
            <span class="text-[11px] font-semibold text-[var(--accent-lime)] bg-[var(--badge-lime-bg)] border border-[var(--badge-lime-border)] px-2.5 py-0.5 r-control-sm font-sans">
              {{ studentCampus }}
            </span>
          </div>
          <p class="text-xs text-[var(--text-muted)] mt-1.5 max-w-2xl leading-relaxed">
            Tienes tiempo libre in-campus esta semana. Conecta con compañeros de tu misma sede y cursos para resolver laboratorios o preparar parciales sin fricción.
          </p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            (click)="isCreatingBeacon = true"
            class="inline-flex items-center justify-center gap-2 r-control-lg bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] px-4 py-2.5 text-xs font-black text-black transition-all active:scale-95 shadow-sm border-none cursor-pointer"
          >
            <lucide-icon name="plus" class="h-4 w-4 stroke-[2.5]"></lucide-icon>
            <span>Crear Mesa In-Campus</span>
          </button>
        </div>
      </header>

      <!-- ===================================================================== -->
      <!-- SEGMENTED CONTROLS & FILTER BAR (Responsive)                         -->
      <!-- ===================================================================== -->
      <section class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <!-- Main Navigation Tabs -->
        <div class="inline-flex items-center gap-1 bg-[var(--surface-card)] border border-[var(--border-subtle)] nest-1 r-control-lg text-xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            (click)="activeTab = 'buddies'"
            class="px-3.5 py-1.5 r-inner font-bold border-none cursor-pointer transition shrink-0"
            [ngClass]="activeTab === 'buddies' 
              ? 'bg-white text-black font-extrabold shadow-sm' 
              : 'bg-transparent text-neutral-400 hover:text-white'"
          >
            Matching 1 a 1 ({{ filteredBuddies.length }})
          </button>
          
          <button
            type="button"
            (click)="activeTab = 'beacons'"
            class="px-3.5 py-1.5 r-inner font-bold border-none cursor-pointer transition shrink-0"
            [ngClass]="activeTab === 'beacons' 
              ? 'bg-white text-black font-extrabold shadow-sm' 
              : 'bg-transparent text-neutral-400 hover:text-white'"
          >
            Mesas de Estudio ({{ beacons.length }})
          </button>
        </div>

        <!-- Modality Filter Pills -->
        <div class="inline-flex items-center gap-1 bg-[var(--surface-card)] border border-[var(--border-subtle)] nest-1 r-control-md text-xs shrink-0">
          <button
            type="button"
            (click)="selectedModalityFilter = 'ALL'"
            class="px-3 py-1 r-inner font-bold border-none cursor-pointer transition"
            [ngClass]="selectedModalityFilter === 'ALL' 
              ? 'bg-white text-black font-extrabold shadow-sm' 
              : 'bg-transparent text-[var(--text-muted)] hover:text-white'"
          >
            Todos
          </button>

          <button
            type="button"
            (click)="selectedModalityFilter = 'Presencial'"
            class="px-3 py-1 r-inner font-bold border-none cursor-pointer transition"
            [ngClass]="selectedModalityFilter === 'Presencial' 
              ? 'bg-[var(--badge-solid-presencial-bg)] text-[var(--badge-solid-presencial-text)] border border-[var(--badge-solid-presencial-border)] font-extrabold shadow-sm' 
              : 'bg-transparent text-[var(--text-muted)] hover:text-white'"
          >
            Presencial (Campus)
          </button>

          <button
            type="button"
            (click)="selectedModalityFilter = 'Virtual'"
            class="px-3 py-1 r-inner font-bold border-none cursor-pointer transition"
            [ngClass]="selectedModalityFilter === 'Virtual' 
              ? 'bg-[var(--badge-solid-virtual-bg)] text-[var(--badge-solid-virtual-text)] border border-[var(--badge-solid-virtual-border)] font-extrabold shadow-sm' 
              : 'bg-transparent text-[var(--text-muted)] hover:text-white'"
          >
            Virtual
          </button>
        </div>
      </section>

      <!-- ===================================================================== -->
      <!-- TAB 1: MATCHING DUAL 1 A 1                                            -->
      <!-- ===================================================================== -->
      @if (activeTab === 'buddies') {
        @if (filteredBuddies.length === 0) {
          <div class="col-span-full p-12 text-center space-y-3 r-card bg-[var(--surface-card)] border border-[var(--border-subtle)]">
            <div class="h-12 w-12 circle bg-white/5 mx-auto flex items-center justify-center text-neutral-400">
              <lucide-icon name="help-circle" class="h-6 w-6 text-neutral-400"></lucide-icon>
            </div>
            <p class="text-sm font-bold text-white">No hay compañeros de estudio con ventana coincidente en este filtro</p>
            <p class="text-xs text-[var(--text-muted)] max-w-md mx-auto">
              Prueba seleccionando "Todos" o crea una Mesa In-Campus para que compañeros de tu curso se sumen a tu horario.
            </p>
          </div>
        } @else {
          <!-- TINDER-STYLE CARD DECK (Centrado, Interactivo y con Swipe) -->
          <app-study-card-deck
            [matches]="filteredBuddies"
            (connect)="onOpenConnectModal($event)"
            (askAi)="onAskAi($event)"
            (viewBeacons)="activeTab = 'beacons'"
          ></app-study-card-deck>
        }
      }

      <!-- ===================================================================== -->
      <!-- TAB 2: MESAS DE ESTUDIO (STUDY BEACONS)                               -->
      <!-- ===================================================================== -->
      @if (activeTab === 'beacons') {
        @if (beacons.length === 0) {
          <div class="col-span-full p-12 text-center space-y-3 r-card bg-[var(--surface-card)] border border-[var(--border-subtle)]">
            <div class="h-12 w-12 circle bg-white/5 mx-auto flex items-center justify-center text-neutral-400">
              <lucide-icon name="users" class="h-6 w-6 text-[var(--accent-lime)]"></lucide-icon>
            </div>
            <p class="text-sm font-bold text-white">No hay mesas de estudio activas en este momento</p>
            <p class="text-xs text-[var(--text-muted)] max-w-md mx-auto">
              Sé el primero en convocar una mesa en campus para resolver laboratorios o avanzar proyectos de ciclo.
            </p>
            <div class="pt-2">
              <button
                type="button"
                (click)="isCreatingBeacon = true"
                class="inline-flex items-center gap-2 r-control-md bg-[var(--accent-lime)] text-black px-4 py-2 font-bold text-xs border-none cursor-pointer"
              >
                Publicar Mesa de Estudio
              </button>
            </div>
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            @for (b of beacons; track b.id) {
              <app-study-beacon-card
                [beacon]="b"
                [isHost]="isHost(b)"
                (join)="onJoinBeacon(b)"
                (cancel)="cancelBeacon($event)"
              ></app-study-beacon-card>
            }
          </div>
        }
      }

      <!-- ===================================================================== -->
      <!-- MODAL 1: CREAR MESA DE ESTUDIO IN-CAMPUS                              -->
      <!-- ===================================================================== -->
      @if (isCreatingBeacon) {
        <app-create-beacon-modal
          (close)="isCreatingBeacon = false"
          (create)="submitCreateBeacon($event)"
        ></app-create-beacon-modal>
      }

      <!-- ===================================================================== -->
      <!-- MODAL 2: HANDSHAKE INSTITUCIONAL 1 A 1                                -->
      <!-- ===================================================================== -->
      @if (activeConnect) {
        <app-connect-handshake-modal
          [match]="activeConnect.match"
          [intent]="activeConnect.intent"
          (close)="activeConnect = null"
        ></app-connect-handshake-modal>
      }

      <!-- ===================================================================== -->
      <!-- MODAL 3: CONFIRMAR UNIÓN A MESA DE ESTUDIO                            -->
      <!-- ===================================================================== -->
      @if (activeJoinBeacon) {
        <app-join-beacon-modal
          [beacon]="activeJoinBeacon"
          (close)="activeJoinBeacon = null"
          (confirm)="confirmJoinBeacon($event)"
        ></app-join-beacon-modal>
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

  studentCampus = 'Sede Lima Centro';
  myStudentCode = '';

  // Modals state
  isCreatingBeacon = false;
  activeConnect: { match: StudyBuddyMatch; intent: StudyIntent } | null = null;
  activeJoinBeacon: StudyBeaconRow | null = null;

  constructor(private networkingService: NetworkingService) {}

  ngOnInit(): void {
    // Sincronizar perfil local con dirty-checking
    this.networkingService.syncProfile().subscribe();

    // Cachear campus y código de alumno sin disparar NG0600 en getters de template
    const profile = this.networkingService.getMyProfile();
    if (profile) {
      this.studentCampus = profile.campus || 'Sede Lima Centro';
      this.myStudentCode = (profile.student_code || '').toLowerCase();
    }

    // Cargar matches duales
    this.networkingService.getDualMatches().subscribe(matches => {
      this.buddies = matches;
    });

    // Cargar mesas activas
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

  isHost(beacon: StudyBeaconRow): boolean {
    return !!this.myStudentCode && (beacon.host_id || '').toLowerCase() === this.myStudentCode;
  }

  onOpenConnectModal(event: { match: StudyBuddyMatch; intent: StudyIntent }): void {
    this.activeConnect = event;
  }

  onJoinBeacon(beacon: StudyBeaconRow): void {
    this.activeJoinBeacon = beacon;
  }

  submitCreateBeacon(payload: CreateBeaconPayload): void {
    this.networkingService.createBeacon(payload).subscribe(() => {
      this.isCreatingBeacon = false;
      this.beacons = this.networkingService.beacons();
    });
  }

  confirmJoinBeacon(beaconId: string): void {
    this.networkingService.joinBeacon(beaconId).subscribe(() => {
      this.beacons = this.networkingService.beacons();
      this.activeJoinBeacon = null;
    });
  }

  cancelBeacon(beaconId: string): void {
    this.networkingService.deleteBeacon(beaconId).subscribe(() => {
      this.beacons = this.networkingService.beacons();
    });
  }

  onAskAi(prompt: string): void {
    this.askAi.emit(prompt);
  }
}
