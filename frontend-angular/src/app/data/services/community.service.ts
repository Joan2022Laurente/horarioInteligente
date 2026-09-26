import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, map, catchError, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  CommunityPost, 
  CommunityComment, 
  CommunityFilter, 
  CreatePostDto,
  PostCategory,
  PostSortBy
} from '@domain/models/community';
import { getCachedStudentProfile } from '../syllabus/client-storage';

const COMMUNITY_POSTS_CACHE_KEY = 'utp_community_posts_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos TTL

@Injectable({
  providedIn: 'root'
})
export class CommunityService {
  private readonly supabaseUrl = environment.supabaseUrl;
  private readonly apiKey = environment.supabaseAnonKey;

  private postsSignal = signal<CommunityPost[]>([]);
  readonly allPosts = this.postsSignal.asReadonly();

  private activeFilterSignal = signal<CommunityFilter>({
    category: 'ALL',
    courseName: 'ALL',
    searchQuery: '',
    sortBy: 'POPULAR',
    onlyBookmarked: false,
    onlySolved: false
  });
  readonly activeFilter = this.activeFilterSignal.asReadonly();

  // Computed Signal: Filtrado y ordenamiento reactivo en 0ms
  readonly filteredPosts = computed<CommunityPost[]>(() => {
    const posts = this.postsSignal();
    const filter = this.activeFilterSignal();
    const query = (filter.searchQuery || '').trim().toLowerCase();

    return posts
      .filter(post => {
        // Filtro por categoría
        if (filter.category !== 'ALL' && post.category !== filter.category) {
          return false;
        }

        // Filtro por curso
        if (filter.courseName !== 'ALL' && post.course_name !== filter.courseName) {
          return false;
        }

        // Filtro por favoritos / guardados
        if (filter.onlyBookmarked && !post.has_user_bookmarked) {
          return false;
        }

        // Filtro por resueltos
        if (filter.onlySolved && !post.solution_comment_id) {
          return false;
        }

        // Búsqueda por texto (título, contenido, tags, autor, curso)
        if (query) {
          const matchTitle = post.title.toLowerCase().includes(query);
          const matchContent = post.content.toLowerCase().includes(query);
          const matchTags = post.tags.some(t => t.toLowerCase().includes(query));
          const matchAuthor = post.author?.full_name?.toLowerCase().includes(query);
          const matchCourse = post.course_name?.toLowerCase().includes(query);
          if (!matchTitle && !matchContent && !matchTags && !matchAuthor && !matchCourse) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (filter.sortBy === 'POPULAR') {
          return (b.upvotes_count + b.comments_count * 2) - (a.upvotes_count + a.comments_count * 2);
        }
        if (filter.sortBy === 'RECENT') {
          return b.id.localeCompare(a.id);
        }
        if (filter.sortBy === 'UNRESOLVED') {
          const aSolved = !!a.solution_comment_id;
          const bSolved = !!b.solution_comment_id;
          if (aSolved !== bSolved) return aSolved ? 1 : -1;
          return b.upvotes_count - a.upvotes_count;
        }
        return 0;
      });
  });

  // Request deduplication
  private inFlightPosts$: Observable<CommunityPost[]> | null = null;

  constructor(private http: HttpClient) {
    this.hydrateFromLocalCache();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'apikey': this.apiKey,
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    });
  }

  private hydrateFromLocalCache(): void {
    try {
      const raw = localStorage.getItem(COMMUNITY_POSTS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.data && Array.isArray(parsed.data)) {
          this.postsSignal.set(parsed.data);
          return;
        }
      }
    } catch {}

    // Estado inicial limpio
    this.postsSignal.set([]);
  }

  /**
   * Carga los posts desde Supabase con fallback local y deduplicación de peticiones.
   */
  getPosts(forceRefresh = false): Observable<CommunityPost[]> {
    if (!forceRefresh && this.postsSignal().length > 0) {
      const raw = localStorage.getItem(COMMUNITY_POSTS_CACHE_KEY);
      if (raw) {
        const { timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          return of(this.postsSignal());
        }
      }
    }

    if (this.inFlightPosts$) {
      return this.inFlightPosts$;
    }

    const url = `${this.supabaseUrl}/rest/v1/community_posts?select=*&order=created_at.desc&limit=30`;

    this.inFlightPosts$ = this.http.get<any[]>(url, { headers: this.getHeaders() }).pipe(
      map(remotePosts => {
        let combined: CommunityPost[] = [];
        if (remotePosts && remotePosts.length > 0) {
          combined = remotePosts.map(p => this.mapRemoteToCommunityPost(p));
        }

        this.postsSignal.set(combined);
        localStorage.setItem(COMMUNITY_POSTS_CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          data: combined
        }));
        this.inFlightPosts$ = null;
        return combined;
      }),
      catchError(() => {
        const fallback = this.postsSignal().length > 0 ? this.postsSignal() : [];
        this.postsSignal.set(fallback);
        this.inFlightPosts$ = null;
        return of(fallback);
      }),
      shareReplay(1)
    );

    return this.inFlightPosts$;
  }

  private mapRemoteToCommunityPost(row: any): CommunityPost {
    return {
      id: row.id,
      author: row.author || {
        id: row.author_id || 'usr-anon',
        student_code: row.student_code || '',
        full_name: row.author_name || 'Estudiante UTP',
        avatar_letter: (row.author_name || 'E').charAt(0),
        career: row.career || 'Ingeniería de Sistemas e Informática'
      },
      course_name: row.course_name,
      section_code: row.section_code,
      category: row.category || 'ACADEMIC_QUESTION',
      title: row.title,
      content: row.content,
      tags: Array.isArray(row.tags) ? row.tags : [],
      media_urls: row.media_urls || [],
      upvotes_count: row.upvotes_count || 0,
      has_user_upvoted: !!row.has_user_upvoted,
      has_user_bookmarked: !!row.has_user_bookmarked,
      comments_count: Array.isArray(row.comments) ? row.comments.length : (row.comments_count || 0),
      comments: Array.isArray(row.comments) ? row.comments : [],
      solution_comment_id: row.solution_comment_id,
      created_at: row.created_at || 'Reciente'
    };
  }

  /**
   * Actualiza el filtro reactivo.
   */
  setFilter(update: Partial<CommunityFilter>): void {
    this.activeFilterSignal.update(curr => ({ ...curr, ...update }));
  }

  /**
   * Crea una nueva publicación con actualización optimista inmediata en 0ms.
   */
  createPost(dto: CreatePostDto): Observable<CommunityPost> {
    const student = getCachedStudentProfile();
    const studentCode = (student?.studentCode || student?.username || '').toUpperCase();
    const fullName = student?.fullName || student?.name || studentCode || 'Estudiante';
    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      author: {
        id: student?.id || student?.userId || studentCode || 'me',
        student_code: studentCode,
        full_name: fullName,
        avatar_letter: (fullName.charAt(0) || 'U').toUpperCase(),
        career: student?.career || '',
        campus: student?.campus || '',
        cycle: student?.currentCycle ?? 1,
        reputation_score: 100
      },
      course_name: dto.course_name || undefined,
      category: dto.category,
      title: dto.title.trim(),
      content: dto.content.trim(),
      image_url: dto.image_url || undefined,
      poll: (dto.category === 'POLL' && dto.poll_options && dto.poll_options.length >= 2) ? {
        id: `poll-${Date.now()}`,
        question: dto.poll_question || dto.title.trim(),
        total_votes: 1,
        user_voted_option_id: 'opt-1',
        options: dto.poll_options.map((opt, idx) => ({
          id: `opt-${idx + 1}`,
          text: opt.trim(),
          votes_count: idx === 0 ? 1 : 0
        }))
      } : null,
      tags: dto.tags,
      upvotes_count: 1,
      has_user_upvoted: true,
      has_user_bookmarked: false,
      comments_count: 0,
      comments: [],
      solution_comment_id: null,
      created_at: 'Ahora mismo'
    };

    // Actualización optimista local
    this.postsSignal.update(list => [newPost, ...list]);
    this.persistCache();

    // Intentar sincronizar en Supabase
    const url = `${this.supabaseUrl}/rest/v1/community_posts`;
    this.http.post(url, newPost, { headers: this.getHeaders() }).subscribe({
      error: () => console.log('[CommunityService] ℹ️ Post persistido localmente.')
    });

    return of(newPost);
  }

  /**
   * Vota en una encuesta con cálculo de porcentajes optimista en 0ms.
   */
  votePoll(postId: string, optionId: string): void {
    this.postsSignal.update(list => 
      list.map(p => {
        if (p.id === postId && p.poll) {
          const previousVotedId = p.poll.user_voted_option_id;
          const isSame = previousVotedId === optionId;
          
          let totalDelta = 0;
          if (!previousVotedId) {
            totalDelta = 1;
          } else if (isSame) {
            totalDelta = -1;
          }

          const updatedOptions = p.poll.options.map(opt => {
            if (opt.id === optionId) {
              return { ...opt, votes_count: opt.votes_count + (isSame ? -1 : 1) };
            }
            if (opt.id === previousVotedId && !isSame) {
              return { ...opt, votes_count: Math.max(0, opt.votes_count - 1) };
            }
            return opt;
          });

          return {
            ...p,
            poll: {
              ...p.poll,
              total_votes: Math.max(0, p.poll.total_votes + totalDelta),
              user_voted_option_id: isSame ? null : optionId,
              options: updatedOptions
            }
          };
        }
        return p;
      })
    );
    this.persistCache();
  }

  /**
   * Toggle Upvote con actualización optimista.
   */
  toggleUpvote(postId: string): void {
    this.postsSignal.update(list => 
      list.map(p => {
        if (p.id === postId) {
          const active = !p.has_user_upvoted;
          return {
            ...p,
            has_user_upvoted: active,
            upvotes_count: p.upvotes_count + (active ? 1 : -1)
          };
        }
        return p;
      })
    );
    this.persistCache();
  }

  /**
   * Toggle Bookmark / Guardado.
   */
  toggleBookmark(postId: string): void {
    this.postsSignal.update(list => 
      list.map(p => {
        if (p.id === postId) {
          return { ...p, has_user_bookmarked: !p.has_user_bookmarked };
        }
        return p;
      })
    );
    this.persistCache();
  }

  /**
   * Añade un comentario o respuesta a una publicación.
   */
  addComment(postId: string, content: string): void {
    if (!content.trim()) return;
    const student = getCachedStudentProfile();
    const studentCode = (student?.studentCode || student?.username || '').toUpperCase();
    const fullName = student?.fullName || student?.name || studentCode || 'Estudiante';
    const newComment: CommunityComment = {
      id: `comm-${Date.now()}`,
      post_id: postId,
      author: {
        id: student?.id || student?.userId || studentCode || 'me',
        student_code: studentCode,
        full_name: fullName,
        avatar_letter: (fullName.charAt(0) || 'U').toUpperCase(),
        career: student?.career || ''
      },
      content: content.trim(),
      upvotes_count: 0,
      has_user_upvoted: false,
      is_verified_solution: false,
      created_at: 'Ahora mismo'
    };

    this.postsSignal.update(list => 
      list.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments_count: p.comments_count + 1,
            comments: [...p.comments, newComment]
          };
        }
        return p;
      })
    );
    this.persistCache();
  }

  /**
   * Marca una respuesta como Solución Verificada.
   */
  markAsSolution(postId: string, commentId: string): void {
    this.postsSignal.update(list => 
      list.map(p => {
        if (p.id === postId) {
          const isTogglingOff = p.solution_comment_id === commentId;
          const updatedComments = p.comments.map(c => ({
            ...c,
            is_verified_solution: !isTogglingOff && c.id === commentId
          }));
          return {
            ...p,
            solution_comment_id: isTogglingOff ? null : commentId,
            comments: updatedComments
          };
        }
        return p;
      })
    );
    this.persistCache();
  }

  private persistCache(): void {
    try {
      localStorage.setItem(COMMUNITY_POSTS_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: this.postsSignal()
      }));
    } catch {}
  }
}
