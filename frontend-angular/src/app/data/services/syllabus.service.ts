import { Injectable, signal } from '@angular/core';
import { Observable, tap, of, catchError, switchMap } from 'rxjs';
import { ApiResponse } from '@domain/models/utp.model';
import { ParsedSyllabus } from '@data/syllabus/types';
import { getCachedSyllabus, saveCachedSyllabus, getAllCachedSyllabi } from '@data/syllabus/client-storage';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class SyllabusService {
  private syllabiSignal = signal<Record<string, ParsedSyllabus>>(getAllCachedSyllabi());
  readonly syllabiMap = this.syllabiSignal.asReadonly();

  constructor(private supabaseService: SupabaseService) {
    console.log('[SyllabusService] 🟢 Inicializado con Supabase Production Database.');
  }

  private preloadAllSyllabi(): void {
    this.supabaseService.getOfficialSyllabi().subscribe({
      next: (syllabi) => {
        if (syllabi && syllabi.length > 0) {
          const current = { ...this.syllabiSignal() };
          for (const s of syllabi) {
            if (s.generalInfo?.courseCode) {
              current[s.generalInfo.courseCode] = s;
              this.persistLocal(s.generalInfo.courseCode, s);
            }
            if (s.generalInfo?.courseName) {
              current[s.generalInfo.courseName] = s;
              this.persistLocal(s.generalInfo.courseName, s);
            }
          }
          this.syllabiSignal.set(current);
          console.log(`[SyllabusService] 📚 ${syllabi.length} sílabos oficiales cargados automáticamente.`);
        }
      },
      error: (err) => console.warn('[SyllabusService] Error precargando sílabos:', err)
    });
  }

  /**
   * Obtiene el sílabo directamente desde Supabase o caché local:
   * 1. Revisa si hay caché local fresca y válida.
   * 2. Si no hay, o se pide refrescar, consulta la tabla 'official_syllabi' de Supabase directamente.
   * 3. Persiste en memoria y caché local.
   */
  getSyllabus(courseCodeOrName: string, sectionId?: string, pdfUrl?: string, forceRefresh = false): Observable<ApiResponse<ParsedSyllabus | null>> {
    const cleanKey = courseCodeOrName.trim();
    
    // 1. Verificación en caché local si no se fuerza refresco
    if (!forceRefresh) {
      const cached = getCachedSyllabus(cleanKey);
      if (cached && cached.formula && cached.weeklySchedule && cached.weeklySchedule.length >= 10) {
        return of({
          success: true,
          message: 'Sílabo obtenido de caché local sincronizada',
          data: cached,
        });
      }
    }

    console.log(`[SyllabusService] ☁️ Consultando Supabase Production Database para '${cleanKey}'...`);

    return this.supabaseService.getSyllabusByCourse(cleanKey).pipe(
      switchMap(syllabus => {
        if (syllabus && syllabus.formula && syllabus.weeklySchedule && syllabus.weeklySchedule.length > 0) {
          console.log(`[SyllabusService] ✅ Sílabo oficial obtenido de Supabase: ${syllabus.generalInfo.courseName}`);
          this.persistLocal(cleanKey, syllabus);
          return of({
            success: true,
            message: 'Sílabo obtenido de Supabase Production Database',
            data: syllabus,
          });
        }

        return of({
          success: false,
          message: `No se encontró sílabo en Supabase para '${cleanKey}'`,
          data: null,
        });
      }),
      catchError(err => {
        console.error('[SyllabusService] Error al consultar Supabase:', err);
        return of({
          success: false,
          message: 'Error al conectar con la base de datos Supabase',
          data: null,
        });
      })
    );
  }

  /**
   * Sincroniza todos los sílabos oficiales desde Supabase a la caché local
   */
  syncAllFromSupabase(): Observable<ParsedSyllabus[]> {
    return this.supabaseService.getOfficialSyllabi().pipe(
      tap(list => {
        list.forEach(s => {
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
