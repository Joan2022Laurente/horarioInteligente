import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, catchError, map } from 'rxjs';
import { ApiResponse } from '@domain/models/utp.model';
import { ParsedSyllabus } from '@data/syllabus/types';
import { getCachedSyllabus, saveCachedSyllabus, getAllCachedSyllabi, getCachedStudentProfile } from '@data/syllabus/client-storage';
import { SupabaseService } from './supabase.service';
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
    console.log('[SyllabusService] 🟢 Inicializado con Integración Directa API Externa v1.2.0 (Caché Local -> API Gateway / Supabase).');
  }

  /**
   * Pipeline de Sílabos v1.2.0:
   * 1. Caché Local First: Si existe en LocalStorage y es válido, retorna inmediatamente (0 latencia).
   * 2. Gateway API v1.2.0: Consume GET /syllabus/{courseCode}. La API externa se encarga internamente de:
   *    - Consultar Supabase (official_syllabi).
   *    - Descargar PDF de S3/PAO si hay miss.
   *    - Parsear con flota de modelos OpenRouter y validar con Quality Gate determinista.
   *    - Persistir en Supabase DB dedicada y retornar el objeto estructurado.
   * 3. Fallback: Consulta directa a Supabase si el gateway presenta fallos temporales de red.
   */
  getSyllabus(courseCodeOrName: string, sectionId?: string, pdfUrl?: string, forceRefresh = false): Observable<ApiResponse<ParsedSyllabus | null>> {
    const cleanKey = courseCodeOrName?.trim();
    if (!cleanKey) {
      return of({ success: false, message: 'Identificador de curso inválido', data: null });
    }

    // 1. Caché First: LocalStorage (adaptable a ciclos regulares, de verano o modulares)
    if (!forceRefresh) {
      const localCached = getCachedSyllabus(cleanKey);
      if (localCached && localCached.formula && localCached.weeklySchedule && localCached.weeklySchedule.length > 0) {
        console.log(`[SyllabusService] ⚡ Sílabo obtenido instantáneamente desde LocalStorage (0 llamadas): ${cleanKey}`);
        return of({
          success: true,
          message: 'Sílabo obtenido de caché local sincronizada',
          data: localCached,
        });
      }
    }

    // 2. Consumo Directo de la API Externa v1.2.0
    const profile = getCachedStudentProfile();
    const token = profile?.token;
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    const queryParams: string[] = [];
    if (sectionId) queryParams.push(`sectionId=${encodeURIComponent(sectionId)}`);
    if (pdfUrl) queryParams.push(`pdfUrl=${encodeURIComponent(pdfUrl)}`);
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    const apiUrl = `${environment.academicApiUrl}/syllabus/${encodeURIComponent(cleanKey)}${queryString}`;

    console.log(`[SyllabusService] 🌐 Solicitando sílabo estructurado a API Externa v1.2.0: ${apiUrl}`);

    return this.http.get<ApiResponse<any>>(apiUrl, { headers }).pipe(
      map((res) => {
        if (res && res.success && res.data) {
          const adapted = this.adaptApiResponseToParsedSyllabus(res.data, cleanKey);
          this.persistLocal(cleanKey, adapted);
          console.log(`[SyllabusService] ✅ Sílabo sincronizado desde API Externa: ${adapted.generalInfo.courseName} (${adapted.weeklySchedule.length} semanas)`);
          return {
            success: true,
            message: res.message || 'Sílabo obtenido exitosamente',
            data: adapted,
          };
        }
        throw new Error(res?.message || 'Respuesta vacía de la API externa');
      }),
      catchError((apiErr) => {
        console.warn(`[SyllabusService] ⚠️ Fallo en llamada a API Externa para ${cleanKey}: ${apiErr.message}. Activando fallback a Supabase...`);
        return this.supabaseService.getSyllabusByCourse(cleanKey).pipe(
          map((sbSyllabus) => {
            if (sbSyllabus && sbSyllabus.formula && sbSyllabus.weeklySchedule && sbSyllabus.weeklySchedule.length > 0) {
              console.log(`[SyllabusService] 🛡️ Sílabo recuperado desde fallback Supabase: ${sbSyllabus.generalInfo.courseName}`);
              this.persistLocal(cleanKey, sbSyllabus);
              return {
                success: true,
                message: 'Sílabo obtenido de Supabase Database',
                data: sbSyllabus,
              };
            }
            return {
              success: false,
              message: `No se encontró sílabo para ${cleanKey}`,
              data: null,
            };
          }),
          catchError((sbErr) => {
            console.error(`[SyllabusService] ❌ Error en fallback de Supabase:`, sbErr);
            this.feedback.show(`No fue posible recuperar el sílabo de ${cleanKey}`, 'warning');
            return of({
              success: false,
              message: 'No disponible en este momento',
              data: null,
            });
          })
        );
      })
    );
  }

  /**
   * Adapta el envelope de la API Externa v1.2.0 al contrato tipado ParsedSyllabus del Frontend.
   * Maneja tanto campos planos en la raíz (courseCode, courseName) como objetos anidados en generalInfo.
   */
  private adaptApiResponseToParsedSyllabus(raw: any, fallbackKey: string): ParsedSyllabus {
    const rawGeneral = raw?.generalInfo || {};
    const courseCode = raw?.courseCode || rawGeneral.courseCode || raw?.id || fallbackKey;
    const courseName = raw?.courseName || rawGeneral.courseName || fallbackKey;
    const credits = Number(raw?.credits ?? rawGeneral.credits ?? 3);
    const weeklyHours = Number(raw?.weeklyHours ?? rawGeneral.weeklyHours ?? 4);
    const modality = raw?.modality || rawGeneral.modality || 'Presencial';
    const semester = raw?.semester || rawGeneral.semester || '2026 - Ciclo 2 Agosto';
    const careers = Array.isArray(raw?.careers) ? raw.careers : (rawGeneral.careers || ['Ingeniería de Sistemas e Informática']);

    return {
      id: raw?.id || courseCode,
      generalInfo: {
        courseCode,
        courseName,
        semester,
        credits,
        modality,
        weeklyHours,
        careers,
      },
      learningGoal: raw?.learningGoal || rawGeneral.learningGoal || '',
      methodologySummary: raw?.methodologySummary || '',
      formula: raw?.formula || '',
      evaluations: Array.isArray(raw?.evaluations) ? raw.evaluations : [],
      rules: Array.isArray(raw?.rules) ? raw.rules : [],
      antiPlagiarismPolicy: raw?.antiPlagiarismPolicy,
      weeklySchedule: Array.isArray(raw?.weeklySchedule) ? raw.weeklySchedule : [],
    };
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
