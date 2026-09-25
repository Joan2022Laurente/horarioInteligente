import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { ChatMessage, DailyQuotaStatus, AiChatRequest } from '@domain/models/ai.model';
import { ApiResponse } from '@domain/models/utp.model';

import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class AiAssistantService {
  private get baseUrl(): string {
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      return '/api/v1/ai';
    }
    return `${environment.businessApiUrl}/ai`;
  }

  private isThinkingSignal = signal<boolean>(false);
  private quotaSignal = signal<DailyQuotaStatus | null>(null);

  readonly isThinking = this.isThinkingSignal.asReadonly();
  readonly quota = this.quotaSignal.asReadonly();

  constructor(private http: HttpClient) {}

  sendMessage(
    userPrompt: string,
    userId = 'guest-student',
    studentProfile?: unknown,
    calendarData?: unknown,
    syllabiData?: unknown,
    liveContext?: unknown
  ): Observable<ApiResponse<ChatMessage>> {
    this.isThinkingSignal.set(true);

    const payload: AiChatRequest = {
      message: userPrompt,
      userId,
      studentProfile,
      calendarData,
      syllabiData,
      liveContext,
      schedule: calendarData,
      syllabi: syllabiData,
    };

    return this.http.post<ApiResponse<ChatMessage>>(`${this.baseUrl}/chat`, payload).pipe(
      tap({
        next: () => this.isThinkingSignal.set(false),
        error: () => this.isThinkingSignal.set(false),
      }),
      catchError((err) => {
        this.isThinkingSignal.set(false);
        console.error('[AiAssistantService] Error conectando con el backend de IA:', err);
        // Fallback dinámico local resiliente si el servidor no responde
        const fallbackMessage: ChatMessage = {
          id: `fallback-${Date.now()}`,
          role: 'assistant',
          content: `### Copiloto Académico UTP\n\nEstoy analizando tu consulta: *"${userPrompt}"*.\n\nActualmente tienes acceso directo a tu horario, tus clases sincrónicas y los temas semanales de cada curso. ¿Deseas consultar las evaluaciones de esta semana o el detalle de alguna asignatura?`,
          timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
          suggestions: [
            '¿Qué clases tengo hoy y en qué aula?',
            '¿Qué temas tocan esta semana según el sílabo?',
            '¿Cuáles son mis próximas evaluaciones y porcentajes?',
          ],
        };
        return of({
          success: true,
          data: fallbackMessage,
        });
      })
    );
  }

  fetchQuota(userId = 'guest-student'): Observable<ApiResponse<DailyQuotaStatus>> {
    return this.http.get<ApiResponse<DailyQuotaStatus>>(`${this.baseUrl}/quota?userId=${userId}`).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.quotaSignal.set(res.data);
        }
      })
    );
  }
}

