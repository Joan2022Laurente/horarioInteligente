import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunityPost } from '@domain/models/community';
import { PollWidgetComponent } from './poll-widget.component';
import { formatCourseName } from '@data/schedule-parser';

@Component({
  selector: 'app-community-post-card',
  standalone: true,
  imports: [CommonModule, FormsModule, PollWidgetComponent],
  template: `
    <!-- Modern Elevated Post Item (Hairline border separator, sleek hover) -->
    <article class="border-b border-white/[0.06] p-4 sm:p-5 hover:bg-white/[0.02] transition-colors text-left">
      
      <div class="flex items-start gap-3">
        <!-- Author Squircle Avatar -->
        <div class="h-10 w-10 rounded-xl bg-[#16171d] border border-white/10 flex items-center justify-center text-xs font-bold text-[var(--accent-lime)] shrink-0 select-none shadow-sm">
          {{ post.author.avatar_letter || post.author.full_name.charAt(0) }}
        </div>

        <!-- Post Content Column -->
        <div class="min-w-0 flex-1 space-y-2">
          
          <!-- Top Row: Name + @handle + Date + Category Pill + Menu/Bookmark -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap text-sm leading-none">
              <span class="font-bold text-white hover:underline cursor-pointer">
                {{ post.author.full_name }}
              </span>
              <span class="text-neutral-500 text-xs font-normal">&#64;{{ post.author.student_code.toLowerCase() }}</span>
              <span class="text-neutral-600 text-xs">·</span>
              <span class="text-neutral-500 text-xs hover:underline cursor-pointer">{{ post.created_at }}</span>

              <!-- Category Badge -->
              <span 
                class="ml-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border"
                [ngClass]="getCategoryBadgeClass(post.category)"
              >
                {{ getCategoryLabel(post.category) }}
              </span>

              <!-- Solved Badge -->
              @if (post.solution_comment_id) {
                <span class="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30 font-medium">
                  <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Resuelto</span>
                </span>
              }
            </div>

            <!-- Bookmark Button -->
            <button
              (click)="onBookmarkClick()"
              [title]="post.has_user_bookmarked ? 'Guardado' : 'Guardar'"
              class="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/[0.08] transition border-none cursor-pointer"
            >
              <svg 
                class="h-4 w-4" 
                viewBox="0 0 24 24" 
                [attr.fill]="post.has_user_bookmarked ? '#e4e4e7' : 'none'" 
                [attr.stroke]="post.has_user_bookmarked ? '#e4e4e7' : 'currentColor'" 
                stroke-width="2"
              >
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
              </svg>
            </button>
          </div>

          <!-- Optional Course Tag -->
          @if (post.course_name) {
            <div class="inline-flex items-center gap-1.5 text-xs text-neutral-300 bg-[#14151a] px-2.5 py-1 rounded-lg border border-white/[0.08]">
              <svg class="h-3 w-3 text-[var(--accent-lime)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>
              <span>{{ formatCourseName(post.course_name) }}</span>
            </div>
          }

          <!-- Headline / Title -->
          <h3 
            class="text-[15px] font-bold text-white leading-snug hover:underline cursor-pointer" 
            (click)="isExpanded = !isExpanded"
          >
            {{ post.title }}
          </h3>

          <!-- Post Text Body -->
          <p class="text-[14px] text-neutral-200 leading-relaxed whitespace-pre-line" [ngClass]="isExpanded ? '' : 'line-clamp-4'">
            {{ post.content }}
          </p>

          @if (post.content.length > 220 && !isExpanded) {
            <button (click)="isExpanded = true" class="text-xs text-[var(--accent-lime)] hover:underline bg-transparent border-none p-0 cursor-pointer">
              Mostrar más
            </button>
          }

          <!-- Image Attachment (Rounded 2xl Image Frame) -->
          @if (post.image_url) {
            <div 
              class="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#090a0d] cursor-pointer max-h-[360px] my-2"
              (click)="isImageZoomed = true"
            >
              <img 
                [src]="post.image_url" 
                [alt]="post.title"
                loading="lazy"
                class="w-full max-h-[360px] object-cover hover:opacity-95 transition"
              />
            </div>
          }

          <!-- Poll Widget -->
          @if (post.poll) {
            <app-poll-widget
              [poll]="post.poll"
              (vote)="onVotePoll($event)"
            />
          }

          <!-- Tags -->
          @if (post.tags && post.tags.length > 0) {
            <div class="flex flex-wrap gap-1.5 pt-1">
              @for (tag of post.tags; track tag) {
                <span class="text-xs text-[var(--accent-lime)] hover:underline cursor-pointer">
                  #{{ tag }}
                </span>
              }
            </div>
          }

          <!-- Action Toolbar (Reply, Like, Link, AI Assist) -->
          <div class="flex items-center justify-between pt-2 text-neutral-500 max-w-md">
            
            <!-- Reply Button -->
            <button
              (click)="isCommentsOpen = !isCommentsOpen"
              class="flex items-center gap-2 text-xs hover:text-[var(--accent-lime)] group transition bg-transparent border-none cursor-pointer p-1"
            >
              <div class="h-7 w-7 rounded-lg flex items-center justify-center group-hover:bg-[var(--accent-lime)]/10 transition">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <span class="text-xs">{{ post.comments_count }}</span>
            </button>

            <!-- Upvote / Like Button -->
            <button
              (click)="onUpvoteClick()"
              class="flex items-center gap-2 text-xs group transition bg-transparent border-none cursor-pointer p-1"
              [ngClass]="post.has_user_upvoted ? 'text-[#f91880]' : 'hover:text-[#f91880]'"
            >
              <div class="h-7 w-7 rounded-lg flex items-center justify-center group-hover:bg-[#f91880]/10 transition">
                <svg 
                  class="h-4 w-4" 
                  viewBox="0 0 24 24" 
                  [attr.fill]="post.has_user_upvoted ? 'currentColor' : 'none'" 
                  stroke="currentColor" 
                  stroke-width="2"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
              </div>
              <span class="text-xs">{{ post.upvotes_count }}</span>
            </button>

            <!-- Copy Link Button -->
            <button
              (click)="copyPostLink()"
              title="Copiar enlace"
              class="h-7 w-7 rounded-lg flex items-center justify-center hover:text-[var(--accent-lime)] hover:bg-[var(--accent-lime)]/10 transition bg-transparent border-none cursor-pointer"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </button>

            <!-- Copilot AI Helper -->
            <button
              (click)="onAskAiClick()"
              title="Analizar publicación con Copiloto IA"
              class="flex items-center gap-1.5 text-xs hover:text-white bg-[#14151a] hover:bg-white/[0.08] px-2.5 py-1 rounded-xl border border-white/[0.08] transition cursor-pointer text-neutral-300"
            >
              <svg class="h-3.5 w-3.5 text-[var(--accent-lime)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
              <span>IA</span>
            </button>

          </div>

          <!-- Comments Thread (Inline Replies) -->
          @if (isCommentsOpen) {
            <div class="pt-3 border-t border-white/[0.06] space-y-3">
              
              <!-- List of Replies -->
              <div class="space-y-3">
                @for (comment of post.comments; track comment.id) {
                  <div class="flex items-start gap-2.5 text-xs text-left">
                    <div class="h-7 w-7 rounded-lg bg-[#181920] border border-white/10 flex items-center justify-center text-[10px] font-bold text-[var(--accent-lime)] shrink-0">
                      {{ comment.author.avatar_letter || comment.author.full_name.charAt(0) }}
                    </div>

                    <div class="flex-1 bg-[#121318] rounded-2xl p-3 border border-white/[0.08] space-y-1">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                          <span class="font-bold text-white">{{ comment.author.full_name }}</span>
                          @if (comment.is_verified_solution) {
                            <span class="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                              Solución
                            </span>
                          }
                        </div>
                        <span class="text-[10px] text-neutral-500 font-mono">{{ comment.created_at }}</span>
                      </div>

                      <p class="text-neutral-200 text-xs leading-relaxed whitespace-pre-line">
                        {{ comment.content }}
                      </p>

                      <div class="flex justify-end pt-1">
                        <button
                          (click)="onMarkSolution(comment.id)"
                          class="text-[10px] text-neutral-500 hover:text-white bg-transparent border-none cursor-pointer"
                        >
                          {{ comment.is_verified_solution ? 'Desmarcar solución' : 'Marcar como solución' }}
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- Reply Input Box -->
              <div class="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  [(ngModel)]="newCommentText"
                  (keyup.enter)="onSubmitComment()"
                  placeholder="Escribe una respuesta o aporte..."
                  class="flex-1 bg-[#14151a] border border-white/[0.08] focus:border-[var(--accent-lime)] rounded-2xl px-4 py-2 text-xs text-white placeholder:text-neutral-500 outline-none transition"
                />
                <button
                  (click)="onSubmitComment()"
                  [disabled]="!newCommentText.trim()"
                  class="px-4 py-2 rounded-xl bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] disabled:opacity-40 text-black font-bold text-xs transition border-none cursor-pointer shrink-0 shadow-sm"
                >
                  Responder
                </button>
              </div>

            </div>
          }

        </div>
      </div>

    </article>

    <!-- Fullscreen Lightbox Image Modal -->
    @if (isImageZoomed && post.image_url) {
      <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        (click)="isImageZoomed = false"
      >
        <div class="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl" (click)="$event.stopPropagation()">
          <img [src]="post.image_url" [alt]="post.title" class="max-w-full max-h-[85vh] object-contain rounded-2xl" />
          <button (click)="isImageZoomed = false" class="absolute top-3 right-3 h-8 w-8 rounded-xl bg-black/80 text-white flex items-center justify-center border border-white/10 cursor-pointer">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      </div>
    }
  `
})
export class CommunityPostCardComponent {
  @Input({ required: true }) post!: CommunityPost;
  @Output() upvote = new EventEmitter<string>();
  @Output() bookmark = new EventEmitter<string>();
  @Output() votePoll = new EventEmitter<{ postId: string; optionId: string }>();
  @Output() addComment = new EventEmitter<{ postId: string; content: string }>();
  @Output() markSolution = new EventEmitter<{ postId: string; commentId: string }>();
  @Output() askAi = new EventEmitter<string>();

  isExpanded = false;
  isCommentsOpen = false;
  isImageZoomed = false;
  newCommentText = '';

  formatCourseName(name: string): string {
    return formatCourseName(name);
  }

  getCategoryBadgeClass(cat: string): string {
    switch (cat) {
      case 'CAMPUS_LIFE': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'POLL': return 'bg-[var(--accent-lime)]/10 text-[var(--accent-lime)] border-[var(--accent-lime)]/20';
      case 'ACADEMIC_QUESTION': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'STUDY_TIPS': return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'PROJECT_RECRUITMENT': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-white/[0.04] text-neutral-400 border-white/[0.08]';
    }
  }

  getCategoryLabel(cat: string): string {
    switch (cat) {
      case 'CAMPUS_LIFE': return 'Vida Campus';
      case 'POLL': return 'Encuesta';
      case 'ACADEMIC_QUESTION': return 'Duda';
      case 'STUDY_TIPS': return 'Tips';
      case 'PROJECT_RECRUITMENT': return 'Squads';
      default: return 'General';
    }
  }

  onUpvoteClick(): void {
    this.upvote.emit(this.post.id);
  }

  onBookmarkClick(): void {
    this.bookmark.emit(this.post.id);
  }

  onVotePoll(optionId: string): void {
    this.votePoll.emit({ postId: this.post.id, optionId });
  }

  onSubmitComment(): void {
    if (!this.newCommentText.trim()) return;
    this.addComment.emit({ postId: this.post.id, content: this.newCommentText.trim() });
    this.newCommentText = '';
  }

  onMarkSolution(commentId: string): void {
    this.markSolution.emit({ postId: this.post.id, commentId });
  }

  onAskAiClick(): void {
    this.askAi.emit(`Analiza la siguiente publicación de la comunidad estudiantil:\n\nTítulo: "${this.post.title}"\nCategoría: ${this.post.category}\nContenido: "${this.post.content}"\n\nBrinda una respuesta académica o contextual precisa para el estudiante.`);
  }

  copyPostLink(): void {
    navigator.clipboard?.writeText(window.location.href);
  }
}
