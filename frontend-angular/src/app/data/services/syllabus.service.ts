import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, catchError, switchMap, from } from 'rxjs';
import { ApiResponse } from '@domain/models/utp.model';
import { ParsedSyllabus } from '@data/syllabus/types';
import { getCachedSyllabus, saveCachedSyllabus, getAllCachedSyllabi, getCachedStudentProfile } from '@data/syllabus/client-storage';
import { SupabaseService } from './supabase.service';
import { extractSyllabusStructured, cleanRawSyllabusText } from '@data/syllabus/ai-extractor';
import { validateParsedSyllabus } from '@data/syllabus/deterministic-validator';
import { UiFeedbackService } from '@core/services/ui-feedback.service';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class SyllabusService {
  private readonly http = inject(HttpClient);
  private readonly supabaseService = inject(SupabaseService);
  private readonly feedback = inject(UiFeedbackService);

  private syllabiSignal = signal<Record<string, ParsedSyllabus>>(getAllCachedSyllabi());
  readonly syllabiMap = this.syllabiSignal.asReadonly();

  constructor() {
    console.log('[SyllabusService] 🟢 Inicializado con Pipeline Inteligente (Caché -> Fetch Crudo -> IA OpenRouter -> Validador -> Supabase).');
  }

  /**
   * Pipeline de Sílabos:
   * 1. Caché First: Verifica en Supabase o LocalStorage. Si existe y es válido, retorna inmediatamente (0 llamadas IA).
   * 2. Fetch Crudo: Si no está en caché, solicita el texto a la API externa (GET /syllabus/{courseCode} o GET /syllabus/raw-text).
   * 3. Pre-limpieza de Texto: Filtra bibliografía, reglamentos y anexos para ahorrar 60% de tokens.
   * 4. Invocación a OpenRouter (ai-extractor.ts): Ejecuta en paralelo con Promise.all la extracción (Fórmula + 18 semanas).
   * 5. Validación: Valida determinísticamente (100% pesos). Si es válido, guarda en Supabase y LocalStorage. Si falla, emite warning feedback.
   */
  getSyllabus(courseCodeOrName: string, sectionId?: string, pdfUrl?: string, forceRefresh = false): Observable<ApiResponse<ParsedSyllabus | null>> {
    const cleanKey = courseCodeOrName.trim();
    if (!cleanKey) {
      return of({ success: false, message: 'Identificador de curso inválido', data: null });
    }

    // 1. Caché First: LocalStorage
    if (!forceRefresh) {
      const localCached = getCachedSyllabus(cleanKey);
      if (localCached && localCached.formula && localCached.weeklySchedule && localCached.weeklySchedule.length >= 10) {
        console.log(`[SyllabusService] ⚡ Sílabo obtenido instantáneamente desde LocalStorage (0 llamadas): ${cleanKey}`);
        return of({
          success: true,
          message: 'Sílabo obtenido de caché local sincronizada',
          data: localCached,
        });
      }
    }

    // 2. Caché First: Supabase
    return this.supabaseService.getSyllabusByCourse(cleanKey).pipe(
      switchMap((sbSyllabus) => {
        if (!forceRefresh && sbSyllabus && sbSyllabus.formula && sbSyllabus.weeklySchedule && sbSyllabus.weeklySchedule.length > 0) {
          console.log(`[SyllabusService] 🛡️ Sílabo recuperado desde Supabase Database (0 llamadas a IA): ${sbSyllabus.generalInfo.courseName}`);
          this.persistLocal(cleanKey, sbSyllabus);
          return of({
            success: true,
            message: 'Sílabo obtenido de Supabase Database',
            data: sbSyllabus,
          });
        }

        // 3. No en caché: Solicitar texto crudo a la API externa
        console.log(`[SyllabusService] 🌐 Sílabo no encontrado en caché. Solicitando texto a la API académica externa: ${cleanKey}...`);
        return this.fetchAndProcessSyllabusWithAi(cleanKey, sectionId, pdfUrl);
      }),
      catchError((err) => {
        console.warn('[SyllabusService] Error en búsqueda de caché de sílabo:', err);
        return this.fetchAndProcessSyllabusWithAi(cleanKey, sectionId, pdfUrl);
      })
    );
  }

  /**
   * Obtiene el texto crudo del sílabo de la API externa y lo procesa mediante el motor de IA
   */
  private fetchAndProcessSyllabusWithAi(courseCode: string, sectionId?: string, pdfUrl?: string): Observable<ApiResponse<ParsedSyllabus | null>> {
    const profile = getCachedStudentProfile();
    const token = profile?.token;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Intentar endpoint de texto crudo de la API externa
    const rawUrl = `${environment.academicApiUrl}/syllabus/raw-text?courseCode=${encodeURIComponent(courseCode)}${sectionId ? `&sectionId=${encodeURIComponent(sectionId)}` : ''}${pdfUrl ? `&pdfUrl=${encodeURIComponent(pdfUrl)}` : ''}`;
    const fallbackUrl = `${environment.academicApiUrl}/syllabus/${encodeURIComponent(courseCode)}${sectionId ? `?sectionId=${encodeURIComponent(sectionId)}` : ''}`;

    return this.http.get<ApiResponse<any>>(rawUrl, { headers }).pipe(
      catchError(() => this.http.get<ApiResponse<any>>(fallbackUrl, { headers })),
      switchMap((res) => {
        const rawContent = typeof res?.data === 'string' ? res.data : (res?.data?.rawText || res?.data?.syllabusText || JSON.stringify(res?.data || ''));

        if (!rawContent || rawContent.length < 50) {
          this.feedback.show(`No se pudo obtener el contenido del sílabo para ${courseCode}`, 'warning');
          return of({
            success: false,
            message: 'Texto del sílabo no disponible en la API externa',
            data: null,
          });
        }

        // Pre-limpieza y extracción con IA en paralelo
        this.feedback.show(`Extrayendo sílabo de ${courseCode} con IA...`, 'info');
        return from(this.processWithAiExtractor(rawContent, courseCode));
      }),
      catchError((err) => {
        console.error('[SyllabusService] Fallo conectando con la API externa para sílabo:', err);
        this.feedback.show(`Error de red al consultar sílabo de ${courseCode}`, 'error');
        return of({
          success: false,
          message: 'Error al contactar con la API externa',
          data: null,
        });
      })
    );
  }

  /**
   * Orquestación de IA (OpenRouter Fase 1 + Fase 2 con Promise.all), validación determinística y persistencia
   */
  private async processWithAiExtractor(rawText: string, courseCode: string): Promise<ApiResponse<ParsedSyllabus | null>> {
    try {
      const cleanedText = cleanRawSyllabusText(rawText);
      const extraction = await extractSyllabusStructured(cleanedText, { maxRetries: 2 });

      if (extraction.success && extraction.syllabus) {
        const parsed = extraction.syllabus;
        const validation = validateParsedSyllabus(parsed);

        if (validation.isValid) {
          console.log(`[SyllabusService] 🎯 Sílabo validado determinísticamente al 100%: ${parsed.generalInfo.courseName}`);
          
          // Guardar en LocalStorage
          this.persistLocal(courseCode, parsed);

          // Guardar en Supabase official_syllabi
          this.persistToSupabase(parsed);

          this.feedback.show(`Sílabo de ${parsed.generalInfo.courseName} analizado y validado con éxito.`, 'success');
          return {
            success: true,
            message: 'Sílabo procesado y validado exitosamente con IA',
            data: parsed,
          };
        } else {
          console.warn('[SyllabusService] ⚠️ Validación determinística falló:', validation.errors);
          this.feedback.show(`El sílabo de ${courseCode} presenta inconsistencias en la suma de ponderaciones.`, 'warning');
          
          // Fallback con datos parciales
          this.persistLocal(courseCode, parsed);
          return {
            success: true,
            message: 'Sílabo procesado con advertencias de validación',
            data: parsed,
          };
        }
      } else {
        this.feedback.show(`No fue posible estructurar el sílabo con IA: ${extraction.errors?.join(', ')}`, 'warning');
        return {
          success: false,
          message: extraction.errors?.join('; ') || 'Fallo de extracción con IA',
          data: null,
        };
      }
    } catch (e: any) {
      console.error('[SyllabusService] Excepción durante procesamiento con IA:', e);
      this.feedback.show(`Error al procesar sílabo con IA: ${e.message}`, 'error');
      return {
        success: false,
        message: e.message,
        data: null,
      };
    }
  }

  /**
   * Persiste el sílabo estructurado en la tabla 'official_syllabi' de Supabase
   */
  private async persistToSupabase(syllabus: ParsedSyllabus): Promise<void> {
    const courseCode = syllabus.generalInfo.courseCode;
    if (!courseCode) return;

    try {
      const headers = {
        'apikey': environment.supabaseAnonKey,
        'Authorization': `Bearer ${environment.supabaseAnonKey}`,
        'Content-Type': 'application/json',
      };

      const checkUrl = `${environment.supabaseUrl}/rest/v1/official_syllabi?course_code=eq.${encodeURIComponent(courseCode)}&select=id`;
      const checkRes = await fetch(checkUrl, { headers });
      const rows = checkRes.ok ? await checkRes.json() : [];

      const body = {
        course_id: courseCode,
        course_code: courseCode,
        course_name: syllabus.generalInfo.courseName,
        credits: syllabus.generalInfo.credits,
        hours: `${syllabus.generalInfo.weeklyHours || 4} horas`,
        modality: syllabus.generalInfo.modality,
        formula: syllabus.formula,
        learning_goal: syllabus.learningGoal,
        evaluations: syllabus.evaluations,
        weekly_schedule: syllabus.weeklySchedule,
        rules: syllabus.rules,
        anti_plagiarism_policy: syllabus.antiPlagiarismPolicy,
        updated_at: new Date().toISOString(),
      };

      if (Array.isArray(rows) && rows.length > 0) {
        const patchUrl = `${environment.supabaseUrl}/rest/v1/official_syllabi?id=eq.${rows[0].id}`;
        await fetch(patchUrl, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(body),
        });
        console.log(`[SyllabusService] ☁️ Sílabo de ${courseCode} actualizado en Supabase.`);
      } else {
        const postUrl = `${environment.supabaseUrl}/rest/v1/official_syllabi`;
        await fetch(postUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        console.log(`[SyllabusService] ☁️ Sílabo de ${courseCode} registrado en Supabase.`);
      }
    } catch (e: any) {
      console.warn('[SyllabusService] No se pudo persistir en Supabase:', e.message);
    }
  }

  /**
   * Sincroniza todos los sílabos oficiales desde Supabase a la caché local
   */
  syncAllFromSupabase(): Observable<ParsedSyllabus[]> {
    return this.supabaseService.getOfficialSyllabi().pipe(
      tap((list) => {
        list.forEach((s) => {
          if (s.generalInfo?.courseCode) this.persistLocal(s.generalInfo.courseCode, s);
          if (s.generalInfo?.courseName) this.persistLocal(s.generalInfo.courseName, s);
        });
        console.log(`[SyllabusService] ⚡ ${list.length} sílabos oficiales sincronizados desde Supabase.`);
      })
    );
  }

  private persistLocal(key: string, syllabus: ParsedSyllabus): void {
    saveCachedSyllabus(key, syllabus);
    if (syllabus.generalInfo?.courseCode) {
      saveCachedSyllabus(syllabus.generalInfo.courseCode, syllabus);
    }
    if (syllabus.generalInfo?.courseName) {
      saveCachedSyllabus(syllabus.generalInfo.courseName, syllabus);
    }
    this.syllabiSignal.set(getAllCachedSyllabi());
  }
}
