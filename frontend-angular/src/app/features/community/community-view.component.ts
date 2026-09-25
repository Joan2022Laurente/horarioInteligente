import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommunityService } from '@data/services/community.service';
import { ScheduleService } from '@data/services/schedule.service';
import { CommunityFiltersComponent } from './components/community-filters.component';
import { CommunityPostCardComponent } from './components/post-card.component';
import { PostCreateModalComponent } from './components/post-create-modal.component';
import { CreatePostDto, CommunityFilter, PostCategory } from '@domain/models/community';
import { getCachedStudentProfile } from '@data/syllabus/client-storage';

@Component({
  selector: 'app-community-view',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CommunityFiltersComponent, 
    CommunityPostCardComponent, 
    PostCreateModalComponent
  ],
  template: `
    <div class="max-w-[1020px] mx-auto w-full flex flex-col md:flex-row justify-center items-start gap-6 text-white font-sans text-left relative">
      
      <!-- ===================================================================== -->
      <!-- CENTER CONTINUOUS TIMELINE COLUMN (Elevated Dark Surface)             -->
      <!-- ===================================================================== -->
      <main class="w-full md:max-w-[600px] flex-1 border border-white/[0.08] bg-[#0c0d10] rounded-3xl overflow-hidden shadow-2xl min-h-screen">
        
        <!-- Sticky Top Channel Selector (Modern Segmented Pills) -->
        <div class="sticky top-0 z-20 bg-[#0c0d10]/90 backdrop-blur-md border-b border-white/[0.08] p-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            (click)="setCategory('ALL')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="communityService.activeFilter().category === 'ALL' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Feed
          </button>

          <button
            (click)="setCategory('CAMPUS_LIFE')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="communityService.activeFilter().category === 'CAMPUS_LIFE' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Vida Campus
          </button>

          <button
            (click)="setCategory('POLL')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="communityService.activeFilter().category === 'POLL' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Encuestas
          </button>

          <button
            (click)="setCategory('ACADEMIC_QUESTION')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="communityService.activeFilter().category === 'ACADEMIC_QUESTION' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Dudas
          </button>

          <button
            (click)="setCategory('PROJECT_RECRUITMENT')"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition border-none cursor-pointer shrink-0"
            [ngClass]="communityService.activeFilter().category === 'PROJECT_RECRUITMENT' 
              ? 'bg-[var(--accent-lime)] text-black shadow-sm' 
              : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'"
          >
            Squads
          </button>
        </div>

        <!-- Mobile Search & Filter Toolbar (< md screens) -->
        <div class="block md:hidden p-3 border-b border-white/[0.08]">
          <app-community-filters
            [filter]="communityService.activeFilter()"
            [courses]="enrolledCourses"
            (filterChange)="onFilterChange($event)"
          />
        </div>

        <!-- Top Composer Box -->
        <div class="p-4 border-b border-white/[0.08] space-y-3 bg-white/[0.01]">
          <div class="flex items-start gap-3">
            <div class="h-9 w-9 rounded-xl bg-[#16171d] border border-white/10 flex items-center justify-center text-xs font-bold text-[var(--accent-lime)] shrink-0 select-none">
              {{ currentStudentInitial }}
            </div>

            <div 
              (click)="openCreateModal('CAMPUS_LIFE')"
              class="flex-1 cursor-pointer pt-2 text-neutral-400 text-[14px] select-none hover:text-neutral-300"
            >
              ¿Qué está pasando en el campus o en tus cursos?
            </div>
          </div>

          <!-- Attachment Icons Toolbar -->
          <div class="flex items-center justify-between pl-12 pt-1">
            <div class="flex items-center gap-1.5 text-[var(--accent-lime)]">
              <button 
                (click)="openCreateModal('CAMPUS_LIFE')"
                title="Adjuntar imagen"
                class="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-[var(--accent-lime)]/10 transition bg-transparent border-none cursor-pointer text-[var(--accent-lime)]"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </button>

              <button 
                (click)="openCreateModal('POLL')"
                title="Crear encuesta"
                class="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-[var(--accent-lime)]/10 transition bg-transparent border-none cursor-pointer text-[var(--accent-lime)]"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
              </button>

              <button 
                (click)="openCreateModal('ACADEMIC_QUESTION')"
                title="Pregunta sobre un curso"
                class="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-[var(--accent-lime)]/10 transition bg-transparent border-none cursor-pointer text-[var(--accent-lime)]"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
              </button>

              <button 
                (click)="openCreateModal('PROJECT_RECRUITMENT')"
                title="Convocatoria de equipo"
                class="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-[var(--accent-lime)]/10 transition bg-transparent border-none cursor-pointer text-[var(--accent-lime)]"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>
              </button>
            </div>

            <button 
              (click)="openCreateModal('CAMPUS_LIFE')"
              class="px-4 py-1.5 rounded-xl bg-[var(--accent-lime)] hover:bg-[var(--accent-lime-hover)] text-black font-extrabold text-xs transition border-none cursor-pointer shadow-md"
            >
              Publicar
            </button>
          </div>
        </div>

        <!-- Continuous Stream of Posts -->
        <div>
          @if (posts().length === 0) {
            <div class="p-12 text-center space-y-2">
              <p class="text-sm font-bold text-white">No hay publicaciones disponibles</p>
              <p class="text-xs text-neutral-500">Sé el primero en compartir un aporte o consulta en este canal.</p>
            </div>
          } @else {
            @for (post of posts(); track post.id) {
              <app-community-post-card
                [post]="post"
                (upvote)="communityService.toggleUpvote($event)"
                (bookmark)="communityService.toggleBookmark($event)"
                (votePoll)="onVotePoll($event)"
                (addComment)="onAddComment($event)"
                (markSolution)="onMarkSolution($event)"
                (askAi)="askAi.emit($event)"
              />
            }
          }
        </div>

      </main>

      <!-- ===================================================================== -->
      <!-- RIGHT STICKY SIDEBAR (X Style Fixed Sidebar)                          -->
      <!-- ===================================================================== -->
      <aside class="hidden md:block w-[320px] shrink-0 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar">
        <app-community-filters
          [filter]="communityService.activeFilter()"
          [courses]="enrolledCourses"
          (filterChange)="onFilterChange($event)"
        />
      </aside>

      <!-- Create Post Modal -->
      @if (isCreatingPost) {
        <app-post-create-modal
          [category]="initialCategoryForModal"
          [enrolledCourses]="enrolledCourses"
          (close)="isCreatingPost = false"
          (submit)="onCreatePost($event)"
        />
      }

    </div>
  `
})
export class CommunityViewComponent implements OnInit {
  @Output() askAi = new EventEmitter<string>();

  public communityService = inject(CommunityService);
  private scheduleService = inject(ScheduleService);

  readonly posts = this.communityService.filteredPosts;
  isCreatingPost = false;
  initialCategoryForModal: PostCategory = 'CAMPUS_LIFE';

  get currentStudentInitial(): string {
    const student = getCachedStudentProfile();
    return (student?.name || 'J').charAt(0).toUpperCase();
  }

  get enrolledCourses(): string[] {
    const interval = this.scheduleService.currentInterval();
    const list = Array.from(new Set(
      (interval?.events || []).map(e => e.metadata?.courseName || e.title)
    ));
    return list.length > 0 ? list : [
      'Desarrollo Web Integrado',
      'Servicios Cloud',
      'Gestión del Servicio TI',
      'Formación para la Investigación - Sistemas',
      'Lenguajes de Programación',
      'Herramientas para la Comunicación Efectiva'
    ];
  }

  ngOnInit(): void {
    this.communityService.getPosts().subscribe();
  }

  setCategory(cat: PostCategory | 'ALL'): void {
    this.communityService.setFilter({ category: cat });
  }

  openCreateModal(cat: PostCategory): void {
    this.initialCategoryForModal = cat;
    this.isCreatingPost = true;
  }

  onFilterChange(partial: Partial<CommunityFilter>): void {
    this.communityService.setFilter(partial);
  }

  onCreatePost(dto: CreatePostDto): void {
    this.communityService.createPost(dto).subscribe(() => {
      this.isCreatingPost = false;
    });
  }

  onVotePoll(ev: { postId: string; optionId: string }): void {
    this.communityService.votePoll(ev.postId, ev.optionId);
  }

  onAddComment(ev: { postId: string; content: string }): void {
    this.communityService.addComment(ev.postId, ev.content);
  }

  onMarkSolution(ev: { postId: string; commentId: string }): void {
    this.communityService.markAsSolution(ev.postId, ev.commentId);
  }
}
