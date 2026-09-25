import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreatePostDto, PostCategory } from '@domain/models/community';

@Component({
  selector: 'app-post-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      (click)="close.emit()"
    >
      <div 
        class="relative flex flex-col w-full max-w-xl rounded-3xl bg-[#111114] text-white p-6 shadow-2xl border border-white/10 space-y-4 text-left max-h-[90vh] overflow-y-auto no-scrollbar"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 class="text-base font-bold text-white">Nueva Publicación en Comunidad</h3>
            <p class="text-xs text-neutral-400">Comparte dudas, guías, fotos o crea encuestas interactivas.</p>
          </div>
          <button (click)="close.emit()" class="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white border-none cursor-pointer">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <!-- Category Selector Pills -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-neutral-300">Tipo de Publicación</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              (click)="category = 'CAMPUS_LIFE'"
              class="p-2.5 rounded-xl text-xs font-bold transition border-none cursor-pointer text-center flex items-center justify-center gap-1.5"
              [ngClass]="category === 'CAMPUS_LIFE' ? 'bg-[var(--accent-blue)] text-white' : 'bg-white/5 text-neutral-400 hover:text-white'"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/></svg>
              <span>Vida Campus</span>
            </button>
            <button
              type="button"
              (click)="category = 'POLL'"
              class="p-2.5 rounded-xl text-xs font-bold transition border-none cursor-pointer text-center flex items-center justify-center gap-1.5"
              [ngClass]="category === 'POLL' ? 'bg-[var(--accent-lime)] text-black' : 'bg-white/5 text-neutral-400 hover:text-white'"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
              <span>Encuesta</span>
            </button>
            <button
              type="button"
              (click)="category = 'ACADEMIC_QUESTION'"
              class="p-2.5 rounded-xl text-xs font-bold transition border-none cursor-pointer text-center flex items-center justify-center gap-1.5"
              [ngClass]="category === 'ACADEMIC_QUESTION' ? 'bg-[var(--accent-orange)] text-white' : 'bg-white/5 text-neutral-400 hover:text-white'"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
              <span>Pregunta</span>
            </button>
            <button
              type="button"
              (click)="category = 'PROJECT_RECRUITMENT'"
              class="p-2.5 rounded-xl text-xs font-bold transition border-none cursor-pointer text-center flex items-center justify-center gap-1.5"
              [ngClass]="category === 'PROJECT_RECRUITMENT' ? 'bg-[var(--accent-purple)] text-white' : 'bg-white/5 text-neutral-400 hover:text-white'"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>
              <span>Equipos</span>
            </button>
          </div>
        </div>

        <!-- Course Selector (Optional) -->
        <div class="space-y-1">
          <label class="block text-xs font-bold text-neutral-300">Asignatura (Opcional)</label>
          <select
            [(ngModel)]="courseName"
            class="w-full bg-[var(--surface-subtle)] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[var(--accent-lime)] cursor-pointer"
          >
            <option value="">General / Sin Asignatura Fija</option>
            @for (c of enrolledCourses; track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
        </div>

        <!-- Title -->
        <div class="space-y-1">
          <label class="block text-xs font-bold text-neutral-300">Título</label>
          <input
            type="text"
            [(ngModel)]="title"
            placeholder="Ej: ¿Qué lenguaje de programación recomiendan para empezar en backend?"
            class="w-full bg-[var(--surface-subtle)] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-[var(--accent-lime)]"
          />
        </div>

        <!-- Content -->
        <div class="space-y-1">
          <label class="block text-xs font-bold text-neutral-300">Detalle o Descripción</label>
          <textarea
            [(ngModel)]="content"
            rows="3"
            placeholder="Escribe tu mensaje, pregunta o contexto..."
            class="w-full bg-[var(--surface-subtle)] border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-[var(--accent-lime)] resize-none"
          ></textarea>
        </div>

        <!-- Image URL Input -->
        <div class="space-y-1">
          <label class="block text-xs font-bold text-neutral-300 flex items-center justify-between">
            <span>Enlace de Imagen / Captura (Opcional)</span>
          </label>
          <div class="flex items-center gap-2">
            <input
              type="url"
              [(ngModel)]="imageUrl"
              placeholder="https://images.unsplash.com/... o enlace de captura"
              class="flex-1 bg-[var(--surface-subtle)] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-[var(--accent-lime)]"
            />
          </div>
          @if (imageUrl) {
            <div class="mt-2 rounded-xl overflow-hidden border border-white/10 max-h-32">
              <img [src]="imageUrl" alt="Vista previa" class="w-full h-32 object-cover" />
            </div>
          }
        </div>

        <!-- Poll Builder Section (Only if category === 'POLL') -->
        @if (category === 'POLL') {
          <div class="space-y-2 p-3.5 rounded-2xl bg-white/[0.03] border border-[var(--accent-lime)]/30">
            <label class="block text-xs font-bold text-[var(--accent-lime)]">Opciones de la Encuesta</label>
            @for (opt of pollOptions; track $index) {
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  [(ngModel)]="pollOptions[$index]"
                  placeholder="Opción {{ $index + 1 }}"
                  class="flex-1 bg-[var(--surface-subtle)] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[var(--accent-lime)]"
                />
                @if (pollOptions.length > 2) {
                  <button (click)="removePollOption($index)" class="text-neutral-400 hover:text-white bg-transparent border-none cursor-pointer flex items-center p-1">
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                }
              </div>
            }
            @if (pollOptions.length < 5) {
              <button
                type="button"
                (click)="addPollOption()"
                class="text-xs font-bold text-[var(--accent-lime)] hover:underline bg-transparent border-none p-0 cursor-pointer pt-1"
              >
                + Añadir Opción
              </button>
            }
          </div>
        }

        <!-- Tags Builder -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-neutral-300">Etiquetas / Tags</label>
          <div class="flex items-center gap-2">
            <input
              type="text"
              [(ngModel)]="currentTagInput"
              (keyup.enter)="addTag()"
              placeholder="Ej: Cloud, Campus, Debate (Presiona Enter)"
              class="flex-1 bg-[var(--surface-subtle)] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-[var(--accent-lime)]"
            />
            <button
              type="button"
              (click)="addTag()"
              class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border-none cursor-pointer"
            >
              + Tag
            </button>
          </div>

          @if (tags.length > 0) {
            <div class="flex flex-wrap gap-1.5 pt-1">
              @for (t of tags; track t) {
                <span class="inline-flex items-center gap-1.5 text-[11px] font-mono bg-white/[0.08] text-[var(--accent-lime)] px-2.5 py-0.5 rounded-lg border border-white/10">
                  <span>#{{ t }}</span>
                  <button (click)="removeTag(t)" class="text-neutral-400 hover:text-white bg-transparent border-none p-0 cursor-pointer flex items-center">
                    <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </span>
              }
            </div>
          }
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
          <button
            type="button"
            (click)="close.emit()"
            class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border-none cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            (click)="submitPost()"
            [disabled]="!title.trim() || !content.trim()"
            class="px-5 py-2.5 rounded-xl bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] disabled:opacity-30 text-black font-extrabold text-xs transition border-none cursor-pointer"
          >
            Publicar en Comunidad
          </button>
        </div>

      </div>
    </div>
  `
})
export class PostCreateModalComponent {
  @Input() category: PostCategory = 'CAMPUS_LIFE';
  @Input() enrolledCourses: string[] = [
    'Desarrollo Web Integrado',
    'Servicios Cloud',
    'Gestión del Servicio TI',
    'Formación para la Investigación - Sistemas',
    'Lenguajes de Programación',
    'Herramientas para la Comunicación Efectiva'
  ];

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<CreatePostDto>();

  title = '';
  content = '';
  imageUrl = '';
  courseName = '';
  tags: string[] = ['Campus', 'Comunidad'];
  currentTagInput = '';
  pollOptions: string[] = ['Opción A', 'Opción B'];

  addPollOption(): void {
    if (this.pollOptions.length < 5) {
      this.pollOptions.push(`Opción ${String.fromCharCode(65 + this.pollOptions.length)}`);
    }
  }

  removePollOption(index: number): void {
    if (this.pollOptions.length > 2) {
      this.pollOptions.splice(index, 1);
    }
  }

  addTag(): void {
    const clean = this.currentTagInput.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]/g, '').trim();
    if (clean && !this.tags.includes(clean)) {
      this.tags.push(clean);
    }
    this.currentTagInput = '';
  }

  removeTag(t: string): void {
    this.tags = this.tags.filter(tag => tag !== t);
  }

  submitPost(): void {
    if (!this.title.trim() || !this.content.trim()) return;
    this.submit.emit({
      title: this.title.trim(),
      content: this.content.trim(),
      category: this.category,
      course_name: this.courseName || undefined,
      image_url: this.imageUrl.trim() || undefined,
      poll_question: this.category === 'POLL' ? this.title.trim() : undefined,
      poll_options: this.category === 'POLL' ? this.pollOptions.filter(o => o.trim().length > 0) : undefined,
      tags: this.tags
    });
  }
}
