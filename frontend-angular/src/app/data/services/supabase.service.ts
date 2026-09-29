import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ParsedSyllabus } from '../syllabus/types';

export interface SupabaseOfficialSyllabus {
  id?: string;
  course_id: string;
  course_code: string;
  course_name: string;
  credits: number;
  hours: string;
  modality: string;
  formula: string;
  learning_goal: string;
  evaluations: any[];
  weekly_schedule: any[];
  rules?: string[];
  anti_plagiarism_policy?: any;
  pdf_url?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private readonly supabaseUrl = environment.supabaseUrl;
  private readonly apiKey = environment.supabaseAnonKey;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'apikey': this.apiKey,
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Obtiene todos los sílabos oficiales almacenados en Supabase
   */
  getOfficialSyllabi(): Observable<ParsedSyllabus[]> {
    const url = `${this.supabaseUrl}/rest/v1/official_syllabi?select=*`;
    return this.http.get<SupabaseOfficialSyllabus[]>(url, { headers: this.getHeaders() }).pipe(
      map(rows => rows.map(r => this.mapSupabaseToParsedSyllabus(r))),
      catchError(err => {
        console.error('[SupabaseService] Error obteniendo official_syllabi:', err);
        return of([]);
      })
    );
  }

  /**
   * Busca un sílabo específico por código o nombre en Supabase
   */
  getSyllabusByCourse(courseIdentifier: string): Observable<ParsedSyllabus | null> {
    if (!courseIdentifier) return of(null);
    const term = courseIdentifier.trim();
    
    // Búsqueda flexible por ID, código o similitud de nombre
    const url = `${this.supabaseUrl}/rest/v1/official_syllabi?or=(course_id.eq.${encodeURIComponent(term)},course_code.eq.${encodeURIComponent(term)},course_name.ilike.*${encodeURIComponent(term)}*)&select=*`;
    
    return this.http.get<SupabaseOfficialSyllabus[]>(url, { headers: this.getHeaders() }).pipe(
      map(rows => {
        if (rows && rows.length > 0) {
          return this.mapSupabaseToParsedSyllabus(rows[0]);
        }
        return null;
      }),
      catchError(err => {
        console.error(`[SupabaseService] Error buscando sílabo '${courseIdentifier}':`, err);
        return of(null);
      })
    );
  }

  /**
   * Guarda o actualiza un sílabo oficial estructurado en Supabase official_syllabi (Upsert por course_id)
   */
  saveOfficialSyllabus(syllabus: ParsedSyllabus): Observable<boolean> {
    if (!syllabus || !syllabus.generalInfo?.courseName) {
      return of(false);
    }

    const cleanCourseName = syllabus.generalInfo.courseName.trim();
    const courseId = syllabus.generalInfo.courseCode?.trim() || syllabus.id?.trim() || cleanCourseName;
    const courseCode = syllabus.generalInfo.courseCode?.trim() || syllabus.id?.trim() || courseId;

    const row: SupabaseOfficialSyllabus = {
      course_id: courseId,
      course_code: courseCode,
      course_name: cleanCourseName,
      credits: syllabus.generalInfo.credits || 3,
      hours: `${syllabus.generalInfo.weeklyHours || 4} horas`,
      modality: syllabus.generalInfo.modality || 'Presencial',
      formula: syllabus.formula || '',
      learning_goal: syllabus.learningGoal || '',
      evaluations: Array.isArray(syllabus.evaluations) ? syllabus.evaluations : [],
      weekly_schedule: Array.isArray(syllabus.weeklySchedule) ? syllabus.weeklySchedule : [],
      rules: Array.isArray(syllabus.rules) ? syllabus.rules : [],
      anti_plagiarism_policy: syllabus.antiPlagiarismPolicy || null,
      updated_at: new Date().toISOString()
    };

    const url = `${this.supabaseUrl}/rest/v1/official_syllabi`;
    const headers = this.getHeaders().set('Prefer', 'resolution=merge-duplicates');

    return this.http.post(url, row, { headers }).pipe(
      map(() => {
        console.log(`[SupabaseService] ⚡ Sílabo oficial '${cleanCourseName}' guardado en Supabase official_syllabi.`);
        return true;
      }),
      catchError(err => {
        console.warn(`[SupabaseService] ℹ️ Error guardando sílabo '${cleanCourseName}' en Supabase:`, err.message);
        return of(false);
      })
    );
  }

  /**
   * Mapea el registro de la tabla official_syllabi de Supabase al modelo interno ParsedSyllabus
   */
  mapSupabaseToParsedSyllabus(row: SupabaseOfficialSyllabus): ParsedSyllabus {
    const weeklyHours = parseInt(row.hours?.replace(/\D/g, '') || '4', 10) || 4;

    return {
      id: row.course_code || row.course_id,
      generalInfo: {
        courseCode: row.course_code || row.course_id,
        courseName: row.course_name,
        semester: '2026 - Ciclo 2 Agosto',
        credits: row.credits || 3,
        modality: row.modality || 'Presencial',
        weeklyHours: weeklyHours,
        careers: ['Ingeniería de Sistemas e Informática']
      },
      learningGoal: row.learning_goal || '',
      formula: row.formula || '',
      evaluations: Array.isArray(row.evaluations) ? row.evaluations : [],
      weeklySchedule: Array.isArray(row.weekly_schedule) ? row.weekly_schedule : [],
      rules: row.rules || [],
      antiPlagiarismPolicy: row.anti_plagiarism_policy || {
        maxSimilarityPercent: 20,
        aiPolicy: 'Uso ético y responsable de Inteligencia Artificial',
        repositoryDelivery: ''
      }
    };
  }
}
