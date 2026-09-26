import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { ChatMessage, DailyQuotaStatus, AiChatRequest } from '@domain/models/ai.model';
import { ApiResponse } from '@domain/models/utp.model';
import { getCachedStudentProfile } from '@data/syllabus/client-storage';
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

  /**
   * Consumo en tiempo real vía Server-Sent Events (SSE).
   * Decodifica 'event: tool' y 'event: delta' palabra por palabra.
   */
  async streamChat(
    message: string,
    onDelta: (word: string) => void,
    onTool: (toolName: string) => void
  ): Promise<void> {
    this.isThinkingSignal.set(true);
    try {
      const profile = getCachedStudentProfile();
      const studentCode = profile?.studentCode || profile?.username || '';
      const token = profile?.token || '';

      const url = `${this.baseUrl}/chat/stream?message=${encodeURIComponent(message)}&studentCode=${encodeURIComponent(studentCode)}`;
      console.log("[AiChat] 🚀 Iniciando solicitud de streaming a:", url);

      const headers: Record<string, string> = {
        'Accept': 'text/event-stream'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      console.log("[AiChat] 📥 Respuesta recibida. Status:", response.status, response.statusText);
      if (!response.ok || !response.body) {
        const errorText = await response.text().catch(() => "");
        console.error("[AiChat] ❌ Error en respuesta del servidor:", response.status, errorText);
        throw new Error(`Error en el servidor (${response.status}): ${errorText || response.statusText}`);
      }

      console.log("[AiChat] 🔄 Abriendo lector de flujo (reader)...");
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // console.debug("[AiChat] 📦 Chunk recibido:", value); // para depuración fina
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = 'message';
        for (const line of lines) {
          if (!line.trim()) {
            currentEvent = 'message';
            continue;
          }

          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            let data = line.slice(5);
            if (data.startsWith(' ')) {
              data = data.slice(1);
            }

            if (data.trim() === '[DONE]') {
              console.log("[AiChat] 🏁 Evento [DONE] recibido del servidor.");
              return;
            }

            if (currentEvent === 'tool') {
              const toolName = data.trim();
              console.log("[AiChat] 🛠️ Herramienta detectada:", toolName);
              onTool(toolName);
            } else if (currentEvent === 'delta') {
              onDelta(data);
            }
          }
        }
      }
    } catch (error) {
      console.error("[AiChat] 🚨 Excepción durante el streaming:", error);
      throw error;
    } finally {
      this.isThinkingSignal.set(false);
      console.log("[AiChat] 🏁 Flujo de streaming finalizado.");
    }
  }
}

