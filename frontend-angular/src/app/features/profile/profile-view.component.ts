import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '@data/services/auth.service';
import { ScheduleService } from '@data/services/schedule.service';
import { ProfileService } from '@data/services/profile.service';
import { UiFeedbackService } from '@core/services/ui-feedback.service';
import { StudentProfile } from '@domain/models/utp.model';
import { McpGuideModalComponent } from '../mcp-guide/mcp-guide-modal.component';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, McpGuideModalComponent],
  template: `
    <div class="mx-auto w-full max-w-5xl px-3 sm:px-6 py-4 sm:py-8 space-y-6 text-white font-sans text-left">

      <!-- ===================================================================== -->
      <!-- 1. IDENTIDAD INSTITUCIONAL (OFICIAL UTP)                               -->
      <!-- ===================================================================== -->
      <header class="profile-card p-5 sm:p-7 shadow-md shadow-black/40">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div class="relative h-24 w-24 flex-none">
            <div class="profile-avatar h-24 w-24 text-3xl font-extrabold select-none">
              @if (avatarUrl()) {
                <img [src]="avatarUrl()" alt="Avatar del estudiante" class="w-full h-full object-cover">
              } @else {
                <span>{{ initials(student()?.fullName || student()?.name || 'UTP') }}</span>
              }
            </div>
            <button
              type="button"
              class="avatar-btn"
              (click)="photoInput.click()"
              [disabled]="isUploadingAvatar"
              aria-label="Cambiar foto de perfil"
              title="Subir foto de perfil"
            >
              @if (isUploadingAvatar) {
                <lucide-icon name="loader-2" class="h-4 w-4 animate-spin text-[var(--accent-lime)]"></lucide-icon>
              } @else {
                <lucide-icon name="camera" class="h-4 w-4 text-white"></lucide-icon>
              }
            </button>
            <input #photoInput type="file" accept="image/*" class="hidden" (change)="onPhotoSelected($event)">
          </div>

          <div class="min-w-0">
            <h1 class="text-xl font-extrabold leading-tight tracking-tight sm:text-2xl break-words">
              {{ student()?.fullName || student()?.name || 'Estudiante UTP' }}
            </h1>
            <p class="text-[var(--text-muted)] mt-1 text-sm break-all font-mono">
              {{ student()?.email || (studentCode() + '@utp.edu.pe') }}
            </p>
            <span class="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-lime)] bg-[rgba(187,244,81,0.08)] border border-[rgba(187,244,81,0.2)] rounded-[var(--r-control-md)] px-2.5 py-1">
              <lucide-icon name="shield-check" class="h-3.5 w-3.5"></lucide-icon>
              <span>Estudiante Verificado UTP</span>
            </span>
          </div>
        </div>

        <dl class="mt-6 grid grid-cols-2 gap-px overflow-hidden lg:grid-cols-4 bg-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-[var(--r-control-lg)]">
          <div class="p-3.5 bg-[var(--surface-input)]">
            <dt class="text-[var(--text-muted)] text-xs font-medium">Código UTP</dt>
            <dd class="mt-1 text-sm font-bold text-[var(--accent-lime)] font-mono">{{ studentCode() }}</dd>
          </div>
          <div class="p-3.5 bg-[var(--surface-input)]">
            <dt class="text-[var(--text-muted)] text-xs font-medium">Ciclo actual</dt>
            <dd class="mt-1 text-sm font-semibold">Ciclo {{ student()?.currentCycle || 1 }}</dd>
          </div>
          <div class="col-span-2 p-3.5 lg:col-span-1 bg-[var(--surface-input)]">
            <dt class="text-[var(--text-muted)] text-xs font-medium">Carrera</dt>
            <dd class="mt-1 text-sm font-semibold truncate" [title]="student()?.career || 'Pregrado UTP'">
              {{ student()?.career || 'Pregrado UTP' }}
            </dd>
          </div>
          <div class="col-span-2 p-3.5 lg:col-span-1 bg-[var(--surface-input)]">
            <dt class="text-[var(--text-muted)] text-xs font-medium">Campus</dt>
            <dd class="mt-1 text-sm font-semibold truncate" [title]="student()?.campus || 'Sede UTP'">
              {{ student()?.campus || 'Sede UTP' }}
            </dd>
          </div>
        </dl>
        <p class="text-[var(--text-muted)] mt-3 flex items-center gap-1.5 text-xs">
          <lucide-icon name="lock" class="h-3.5 w-3.5 shrink-0"></lucide-icon>
          <span>Estos datos institucionales los provee la universidad y no se pueden alterar manualmente.</span>
        </p>
      </header>

      <!-- ===================================================================== -->
      <!-- 2. FORMULARIO COMERCIAL & LIVE PREVIEW (2 COLUMNAS)                   -->
      <!-- ===================================================================== -->
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">

        <!-- Formulario de Contacto & Comercio -->
        <section class="profile-card p-5 sm:p-7 shadow-md shadow-black/40" aria-labelledby="formTitle">
          <h2 id="formTitle" class="text-base font-bold flex items-center gap-2">
            <span>Contacto y comercio en el campus</span>
          </h2>
          <p class="text-[var(--text-muted)] mt-1 text-sm">
            Esta información alimenta el Marketplace estudiantil y el módulo de Networking.
          </p>

          <form (ngSubmit)="saveProfile()" class="mt-6 space-y-5" novalidate>
            <!-- Campo WhatsApp -->
            <div>
              <label class="field-label" for="phone">WhatsApp de contacto</label>
              <div class="field-wrapper" [class.bad]="phoneError">
                <lucide-icon name="phone" class="h-4 w-4 text-[var(--text-muted)] shrink-0"></lucide-icon>
                <span class="text-sm font-semibold text-[var(--text-muted)] select-none">+51</span>
                <input
                  id="phone"
                  name="phone"
                  [(ngModel)]="phoneWhatsapp"
                  (input)="onPhoneInput($event)"
                  inputmode="numeric"
                  autocomplete="tel-national"
                  maxlength="9"
                  placeholder="987654321"
                  class="field-input"
                >
              </div>
              @if (phoneError) {
                <p class="text-xs text-rose-400 mt-1">Ingresa un número de 9 dígitos que comience con 9 (Perú).</p>
              }
              <p class="text-xs text-[var(--text-muted)] mt-1">
                Los compradores del Marketplace se contactarán contigo directamente a este número vía WhatsApp.
              </p>
            </div>

            <!-- Campo Punto de Entrega en Campus -->
            <div>
              <label class="field-label" for="campusLoc">Punto de entrega en campus</label>
              <div class="field-wrapper">
                <lucide-icon name="map-pin" class="h-4 w-4 text-[var(--text-muted)] shrink-0"></lucide-icon>
                <input
                  id="campusLoc"
                  name="campusLoc"
                  [(ngModel)]="campusLocation"
                  maxlength="100"
                  placeholder="Torre A - Piso 3 (Cafetería)"
                  class="field-input"
                >
              </div>
              <p class="text-xs text-[var(--text-muted)] mt-1">
                Lugar habitual donde entregas productos o te reúnes para estudiar.
              </p>
            </div>

            <!-- Campo Enlace Social / Portafolio -->
            <div>
              <label class="field-label" for="social">Enlace social o portafolio</label>
              <div class="field-wrapper" [class.bad]="socialError">
                <lucide-icon name="globe" class="h-4 w-4 text-[var(--text-muted)] shrink-0"></lucide-icon>
                <input
                  id="social"
                  name="social"
                  type="url"
                  inputmode="url"
                  [(ngModel)]="socialLink"
                  (input)="socialError = false"
                  placeholder="https://linkedin.com/in/tu-perfil"
                  class="field-input"
                >
              </div>
              @if (socialError) {
                <p class="text-xs text-rose-400 mt-1">Pega un enlace completo que empiece con http:// o https://</p>
              }
              <p class="text-xs text-[var(--text-muted)] mt-1">
                LinkedIn, GitHub o Instagram de tu emprendimiento o proyectos.
              </p>
            </div>

            <!-- Campo Presentación / Biografía -->
            <div>
              <div class="flex items-baseline justify-between mb-1.5">
                <label class="field-label mb-0" for="bio">Presentación breve</label>
                <span class="text-[var(--text-muted)] text-xs">{{ bio.length }}/160</span>
              </div>
              <div class="field-wrapper py-1" style="align-items: flex-start">
                <textarea
                  id="bio"
                  name="bio"
                  rows="2"
                  maxlength="160"
                  [(ngModel)]="bio"
                  placeholder="Cuéntales qué vendes en el campus o en qué áreas te gustaría colaborar..."
                  class="field-input resize-none"
                ></textarea>
              </div>
            </div>

            <!-- Botón Guardar Cambios -->
            <div class="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <button
                type="submit"
                [disabled]="isSaving"
                class="btn-primary-action px-6 py-3 rounded-[var(--r-control-lg)] flex items-center justify-center gap-2 text-sm font-bold transition cursor-pointer disabled:opacity-50"
              >
                @if (isSaving) {
                  <lucide-icon name="loader-2" class="h-4 w-4 animate-spin"></lucide-icon>
                  <span>Guardando...</span>
                } @else {
                  <lucide-icon name="check" class="h-4 w-4"></lucide-icon>
                  <span>Guardar cambios</span>
                }
              </button>
              <p class="text-xs text-[var(--text-muted)]">
                Los cambios se reflejan al instante en tu ficha pública y publicaciones.
              </p>
            </div>
          </form>
        </section>

        <!-- Live Preview: Así te ven los demás -->
        <aside class="lg:sticky lg:top-6" aria-labelledby="pvTitle">
          <div class="mb-3 flex items-center justify-between px-1">
            <h2 id="pvTitle" class="text-sm font-bold flex items-center gap-1.5">
              <span>Así te ven los demás</span>
            </h2>
            <span class="text-xs text-[var(--accent-lime)] font-mono">Vista en vivo</span>
          </div>

          <div class="profile-card overflow-hidden shadow-md shadow-black/40">
            <!-- Header Banner Degradado Sobrio -->
            <div class="h-16 bg-gradient-to-r from-[#1a2410] to-[#141417]"></div>

            <div class="px-5 pb-5">
              <!-- Avatar Superpuesto -->
              <div class="profile-avatar -mt-8 h-16 w-16 text-xl font-extrabold select-none border-[3px] border-[var(--surface-card)]">
                @if (avatarUrl()) {
                  <img [src]="avatarUrl()" alt="Avatar" class="w-full h-full object-cover">
                } @else {
                  <span>{{ initials(student()?.fullName || student()?.name || 'UTP') }}</span>
                }
              </div>

              <!-- Nombre y Badge -->
              <div class="mt-3 flex items-center gap-1.5">
                <h3 class="text-base font-bold leading-tight break-words">
                  {{ formatName(student()?.fullName || student()?.name || 'Estudiante UTP') }}
                </h3>
                <lucide-icon name="shield-check" class="h-4 w-4 text-[var(--accent-lime)] shrink-0"></lucide-icon>
              </div>

              <p class="text-[var(--text-muted)] mt-0.5 text-xs">
                {{ student()?.career || 'Pregrado' }} · Ciclo {{ student()?.currentCycle || 1 }}
              </p>

              <!-- Bio Preview -->
              <p class="mt-3 text-sm leading-relaxed" [class.text-[var(--text-muted)]]="!bio">
                {{ bio || 'Aún no agregaste una presentación personal.' }}
              </p>

              <!-- Detalles de Contacto -->
              <ul class="mt-4 space-y-2 text-sm border-t border-[var(--border-subtle)] pt-3">
                <li class="flex items-start gap-2">
                  <lucide-icon name="map-pin" class="h-4 w-4 text-[var(--text-muted)] mt-0.5 shrink-0"></lucide-icon>
                  <span [class.text-[var(--text-muted)]]="!campusLocation">
                    {{ campusLocation || 'Sin punto de entrega definido' }}
                  </span>
                </li>
                <li class="flex items-start gap-2">
                  <lucide-icon name="external-link" class="h-4 w-4 text-[var(--text-muted)] mt-0.5 shrink-0"></lucide-icon>
                  <span class="min-w-0 break-all" [class.text-[var(--text-muted)]]="!socialLink">
                    {{ cleanUrl(socialLink) || 'Sin enlace social' }}
                  </span>
                </li>
              </ul>

              <!-- Botón Contactar por WhatsApp -->
              <button
                type="button"
                [disabled]="!isPhoneValid()"
                (click)="openWhatsAppPreview()"
                class="btn-wa-action mt-5 w-full py-2.5 px-4 rounded-[var(--r-control-lg)] flex items-center justify-center gap-2 text-sm font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <lucide-icon name="message-square" class="h-4 w-4"></lucide-icon>
                <span>Contactar por WhatsApp</span>
              </button>
              <p class="text-[var(--text-muted)] mt-2 break-all text-center text-xs font-mono">
                @if (isPhoneValid()) {
                  wa.me/51{{ phoneWhatsapp }}
                } @else {
                  Agrega tu WhatsApp para activar el botón
                }
              </p>
            </div>
          </div>
        </aside>

      </div>

      <!-- ===================================================================== -->
      <!-- 3. INTEGRACIÓN MODEL CONTEXT PROTOCOL (MCP)                           -->
      <!-- ===================================================================== -->
      <section class="profile-card p-5 sm:p-7 shadow-md shadow-black/40 space-y-4" aria-labelledby="mcpTitle">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="h-10 w-10 rounded-[var(--r-control-lg)] bg-[var(--surface-subtle)] border border-[var(--border-medium)] flex items-center justify-center text-[var(--accent-lime)] shrink-0">
              <lucide-icon name="plug" class="h-5 w-5"></lucide-icon>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 id="mcpTitle" class="text-base font-bold text-white tracking-tight">Servidor MCP Académico</h2>
                <span class="text-[11px] font-semibold text-[var(--accent-lime)] bg-[rgba(187,244,81,0.08)] border border-[rgba(187,244,81,0.2)] rounded-[var(--r-control-sm)] px-2 py-0.5 font-mono">v2024-11-05</span>
              </div>
              <p class="text-xs text-[var(--text-muted)] mt-0.5">Conecta tu horario, evaluaciones y sílabos oficiales a Claude, ChatGPT o Cursor en tiempo real.</p>
            </div>
          </div>

          <button 
            type="button" 
            (click)="isMcpModalOpen.set(true)"
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--r-control-md)] bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--accent-lime)] text-white font-semibold text-xs tracking-wider transition cursor-pointer shrink-0"
          >
            <lucide-icon name="plug" class="h-3.5 w-3.5 text-[var(--accent-lime)]"></lucide-icon>
            <span>Configurar Conexión</span>
          </button>
        </div>
      </section>

      @if (isMcpModalOpen()) {
        <app-mcp-guide-modal (closed)="isMcpModalOpen.set(false)"></app-mcp-guide-modal>
      }

      <!-- ===================================================================== -->
      <!-- 4. SESIÓN & MANTENIMIENTO                                             -->
      <!-- ===================================================================== -->
      <section class="profile-card p-5 sm:p-7 shadow-md shadow-black/40" aria-labelledby="sesTitle">
        <h2 id="sesTitle" class="text-base font-bold flex items-center gap-2">
          <span>Sesión y mantenimiento</span>
        </h2>
        <p class="text-[var(--text-muted)] mt-1 text-sm">
          Actualiza tus cursos oficiales desde la pasarela UTP o cierra la sesión de forma segura.
        </p>

        <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            [disabled]="isSyncing"
            (click)="handleSyncLive()"
            class="btn-ghost-action px-5 py-2.5 rounded-[var(--r-control-lg)] flex items-center justify-center gap-2 text-sm font-semibold transition cursor-pointer border border-[var(--border-medium)] bg-[var(--surface-card)] hover:bg-[var(--surface-card-hover)]"
          >
            @if (isSyncing) {
              <lucide-icon name="loader-2" class="h-4 w-4 animate-spin text-[var(--accent-lime)]"></lucide-icon>
              <span>Sincronizando con UTP...</span>
            } @else {
              <lucide-icon name="refresh-cw" class="h-4 w-4 text-[var(--accent-lime)]"></lucide-icon>
              <span>Sincronizar horario y cursos con UTP</span>
            }
          </button>

          <button
            type="button"
            (click)="handleLogout()"
            class="sm:ml-auto px-5 py-2.5 rounded-[var(--r-control-lg)] flex items-center justify-center gap-2 text-sm font-semibold transition cursor-pointer bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300"
          >
            <lucide-icon name="log-out" class="h-4 w-4"></lucide-icon>
            <span>Cerrar sesión & Limpiar datos locales</span>
          </button>
        </div>
      </section>

    </div>
  `,
  styles: [`
    .profile-card {
      background: var(--surface-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--r-card);
    }
    .profile-avatar {
      border-radius: var(--r-circle);
      background: #1d2a14;
      color: var(--accent-lime);
      display: grid;
      place-items: center;
      overflow: hidden;
      border: 1px solid var(--border-medium);
    }
    .avatar-btn {
      position: absolute;
      right: -2px;
      bottom: -2px;
      width: 32px;
      height: 32px;
      border-radius: var(--r-circle);
      background: var(--surface-card-hover);
      border: 1px solid var(--border-medium);
      display: grid;
      place-items: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      transition: background 0.15s ease;
    }
    .avatar-btn:hover:not(:disabled) {
      background: #24242e;
    }
    .field-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      color: #fff;
    }
    .field-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--surface-input);
      border: 1px solid var(--border-subtle);
      border-radius: var(--r-control-lg);
      padding: 0 12px;
      transition: border-color 0.15s ease;
    }
    .field-wrapper:hover {
      border-color: var(--border-medium);
    }
    .field-wrapper:focus-within {
      border-color: var(--accent-lime);
    }
    .field-wrapper.bad {
      border-color: rgba(251, 113, 133, 0.6);
    }
    .field-input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: 0;
      outline: 0;
      color: #fff;
      font: inherit;
      font-size: 14px;
      padding: 11px 0;
    }
    .field-input::placeholder {
      color: #5c5c62;
    }
    .btn-primary-action {
      background: var(--accent-lime);
      color: #0a0a0c;
    }
    .btn-primary-action:hover:not(:disabled) {
      background: #c8f76e;
    }
    .btn-wa-action {
      background: var(--utopik-sandy-brown);
      color: #1a0f05;
    }
    .btn-wa-action:hover:not(:disabled) {
      filter: brightness(1.07);
    }
  `]
})
export class ProfileViewComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly feedback = inject(UiFeedbackService);

  readonly student = this.authService.currentStudent;
  readonly studentCode = computed(() => {
    const s = this.student();
    return (s?.studentCode || s?.username || '').toUpperCase();
  });
  readonly avatarUrl = signal<string>('');
  readonly isMcpModalOpen = signal(false);

  phoneWhatsapp = '';
  campusLocation = '';
  socialLink = '';
  bio = '';

  isSaving = false;
  isSyncing = false;
  isUploadingAvatar = false;
  phoneError = false;
  socialError = false;

  ngOnInit(): void {
    this.populateFromLocal();
    this.loadRemoteProfile();
  }

  private populateFromLocal(): void {
    const s = this.student();
    if (s) {
      this.phoneWhatsapp = s.phoneWhatsapp || '';
      this.campusLocation = s.campusLocation || '';
      this.socialLink = s.socialLink || '';
      this.bio = s.bio || '';
      if (s.avatarUrl) {
        this.avatarUrl.set(s.avatarUrl);
      }
    }
  }

  private loadRemoteProfile(): void {
    this.profileService.getMyProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const d = res.data;
          this.phoneWhatsapp = d.phoneWhatsapp || '';
          this.campusLocation = d.campusLocation || '';
          this.socialLink = d.socialLink || '';
          this.bio = d.bio || '';
          if (d.avatarUrl) {
            this.avatarUrl.set(d.avatarUrl);
          }
        }
      },
      error: (err) => {
        console.warn('[ProfileView] No se pudo actualizar el perfil remoto en segundo plano:', err?.message || err);
      }
    });
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/\D/g, '').slice(0, 9);
    this.phoneWhatsapp = clean;
    input.value = clean;
    this.phoneError = false;
  }

  isPhoneValid(): boolean {
    return /^9\d{8}$/.test(this.phoneWhatsapp.trim());
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      this.feedback.error('La imagen no debe superar los 3 MB.');
      input.value = '';
      return;
    }

    this.isUploadingAvatar = true;
    try {
      const publicUrl = await this.profileService.uploadAvatar(file);
      this.avatarUrl.set(publicUrl);
      this.feedback.success('Foto de perfil subida exitosamente');
      // Guardar de inmediato en el perfil
      this.profileService.updateMyProfile({ avatarUrl: publicUrl }).subscribe();
    } catch (err: any) {
      this.feedback.error('Error al subir la imagen', err?.message || 'Verifica tu conexión');
    } finally {
      this.isUploadingAvatar = false;
      input.value = '';
    }
  }

  saveProfile(): void {
    const phone = this.phoneWhatsapp.trim();
    const social = this.socialLink.trim();

    this.phoneError = false;
    this.socialError = false;

    if (phone && !/^9\d{8}$/.test(phone)) {
      this.phoneError = true;
      this.feedback.error('El número de WhatsApp debe tener 9 dígitos y comenzar con 9.');
      return;
    }

    if (social && !/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(social)) {
      this.socialError = true;
      this.feedback.error('El enlace social debe ser una URL válida (http:// o https://).');
      return;
    }

    this.isSaving = true;
    this.profileService.updateMyProfile({
      phoneWhatsapp: phone,
      campusLocation: this.campusLocation.trim(),
      socialLink: social,
      bio: this.bio.trim(),
      avatarUrl: this.avatarUrl() || undefined
    }).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.success) {
          this.feedback.success('Perfil actualizado correctamente');
        } else {
          this.feedback.error('No se pudo guardar el perfil', res.error || undefined);
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.feedback.error('Error al guardar el perfil', err?.error?.error || err?.message);
      }
    });
  }

  openWhatsAppPreview(): void {
    if (this.isPhoneValid()) {
      window.open(`https://wa.me/51${this.phoneWhatsapp.trim()}`, '_blank', 'noopener');
    }
  }

  handleSyncLive(): void {
    this.isSyncing = true;
    this.scheduleService.syncSchedule().subscribe({
      next: (res: any) => {
        this.isSyncing = false;
        if (res.success) {
          this.feedback.success('Horario y cursos sincronizados con éxito desde UTP');
        } else {
          this.feedback.error('Error al sincronizar', res.error || undefined);
        }
      },
      error: (err: any) => {
        this.isSyncing = false;
        this.feedback.error('Error al conectar con la pasarela institucional', err?.message);
      }
    });
  }

  handleLogout(): void {
    this.authService.logout();
    this.feedback.info('Sesión cerrada y datos locales purgados');
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (!parts.length || !parts[0]) return 'U';
    const first = parts[0][0] || '';
    const second = (parts[2] || parts[1] || '')[0] || '';
    return (first + second).toUpperCase();
  }

  formatName(name: string): string {
    return name.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }

  cleanUrl(url: string): string {
    return url ? url.replace(/^https?:\/\//, '') : '';
  }
}
