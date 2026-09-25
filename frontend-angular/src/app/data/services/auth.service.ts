import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { StudentProfile, ApiResponse } from '@domain/models/utp.model';
import { getCachedStudentProfile, saveCachedStudentProfile, clearAllLocalUserData } from '@data/syllabus/client-storage';
import { AppDiagnosticLogger } from '@data/diagnostic-logger';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = `${environment.academicApiUrl}/auth`;

  private currentStudentSignal = signal<StudentProfile | null>(null);
  
  readonly currentStudent = this.currentStudentSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentStudentSignal() !== null);
  readonly studentName = computed(() => this.currentStudentSignal()?.fullName || this.currentStudentSignal()?.name || 'Estudiante UTP');

  constructor(private http: HttpClient) {
    this.restoreSession();
  }

  login(credentials: { username?: string; password?: string; token?: string }): Observable<ApiResponse<StudentProfile>> {
    console.log('[AuthService] 🔐 Intentando login...');
    return this.http.post<ApiResponse<StudentProfile>>(`${this.baseUrl}/login`, credentials).pipe(
      tap((res) => {
        if (res.success && res.data) {
          const currentCode = (res.data.studentCode || res.data.username || '').toUpperCase();
          const prevCode = (localStorage.getItem('utp_current_student_code') || '').toUpperCase();
          if (prevCode && prevCode !== currentCode) {
            console.log(`[AuthService] 🔄 Estudiante distinto detectado (${prevCode} -> ${currentCode}). Purgando datos anteriores.`);
            clearAllLocalUserData();
          }
          localStorage.setItem('utp_current_student_code', currentCode);

          console.log('[AuthService] ✅ Login exitoso:', {
            studentName: res.data.fullName,
            studentCode: res.data.studentCode,
            hasToken: !!res.data.token,
          });

          // Diagnóstico de origen de datos
          AppDiagnosticLogger.logAuthSource({
            origin: 'API_LOGIN_GATEWAY',
            studentCode: currentCode,
            studentName: res.data.fullName || res.data.name || 'Estudiante UTP',
            career: res.data.career,
            campus: res.data.campus,
            hasToken: !!res.data.token,
          });

          this.currentStudentSignal.set(res.data);
          localStorage.setItem('utp_auth_profile', JSON.stringify(res.data));
          saveCachedStudentProfile({
            id: res.data.id || '',
            name: res.data.fullName || res.data.name || '',
            fullName: res.data.fullName || res.data.name || '',
            studentCode: currentCode,
            username: currentCode,
            email: res.data.email || '',
            userId: res.data.id || '',
            career: res.data.career || '',
            campus: res.data.campus || '',
            currentCycle: res.data.currentCycle || 1,
            role: res.data.role || 'STUDENT',
            token: res.data.token || ''
          });

          // Sincronizar perfil persistente en Supabase
          this.syncStudentProfileToSupabase(res.data);
        }
      })
    );
  }

  /**
   * Persiste el perfil del alumno en la tabla 'students' de Supabase
   */
  private syncStudentProfileToSupabase(profile: StudentProfile): void {
    const studentCode = (profile.studentCode || profile.username || '').toUpperCase();
    if (!studentCode) return;

    const headers = {
      'apikey': environment.supabaseAnonKey,
      'Authorization': `Bearer ${environment.supabaseAnonKey}`,
      'Content-Type': 'application/json'
    };

    const checkUrl = `${environment.supabaseUrl}/rest/v1/students?student_code=eq.${encodeURIComponent(studentCode)}&select=id`;
    this.http.get<any[]>(checkUrl, { headers }).subscribe({
      next: (existing) => {
        const body = {
          student_code: studentCode,
          full_name: profile.fullName || profile.name || 'Estudiante UTP',
          email: profile.email || `${studentCode.toLowerCase()}@utp.edu.pe`,
          career: profile.career || '',
          campus: profile.campus || '',
          cycle: profile.currentCycle || 1,
          updated_at: new Date().toISOString()
        };

        if (existing && existing.length > 0) {
          const updateUrl = `${environment.supabaseUrl}/rest/v1/students?student_code=eq.${encodeURIComponent(studentCode)}`;
          this.http.patch(updateUrl, body, { headers }).subscribe({
            next: () => console.log(`[AuthService] ⚡ Perfil de estudiante ${studentCode} sincronizado en Supabase.`),
            error: (err) => console.warn('[AuthService] ℹ️ Error actualizando estudiante en Supabase:', err.message)
          });
        } else {
          const insertUrl = `${environment.supabaseUrl}/rest/v1/students`;
          this.http.post(insertUrl, body, { headers }).subscribe({
            next: () => console.log(`[AuthService] ⚡ Nuevo estudiante ${studentCode} registrado en Supabase.`),
            error: (err) => console.warn('[AuthService] ℹ️ Error insertando estudiante en Supabase:', err.message)
          });
        }
      },
      error: (err) => console.warn('[AuthService] ℹ️ Consulta Supabase students en espera:', err.message)
    });
  }

  logout(): void {
    console.log('[AuthService] 🚪 Cerrando sesión y limpiando credenciales locales...');
    this.currentStudentSignal.set(null);
    localStorage.removeItem('utp_auth_profile');
    localStorage.removeItem('utp_current_student_code');
    clearAllLocalUserData();
  }

  private restoreSession(): void {
    const cachedProfile = getCachedStudentProfile();
    if (cachedProfile && (cachedProfile.token || cachedProfile.username)) {
      console.log('[AuthService] 🔄 Sesión restaurada desde perfil cifrado:', {
        student: cachedProfile.name,
        hasToken: !!cachedProfile.token,
      });
      const profileData: StudentProfile = {
        id: cachedProfile.userId || '',
        name: cachedProfile.name || '',
        fullName: cachedProfile.name || '',
        username: cachedProfile.username || '',
        studentCode: cachedProfile.username || '',
        email: cachedProfile.email || '',
        career: cachedProfile.career || '',
        campus: cachedProfile.campus || '',
        currentCycle: cachedProfile.currentCycle || 1,
        token: cachedProfile.token || ''
      };
      this.currentStudentSignal.set(profileData);
      AppDiagnosticLogger.logAuthSource({
        origin: 'LOCAL_CACHE_PROFILE',
        studentCode: profileData.studentCode || profileData.username,
        studentName: profileData.fullName || profileData.name,
        career: profileData.career,
        campus: profileData.campus,
        hasToken: !!profileData.token,
      });
      this.syncStudentProfileToSupabase(profileData);
      this.runLegacyStorageMigration();
      return;
    }

    const raw = localStorage.getItem('utp_auth_profile');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        console.log('[AuthService] 🔄 Sesión restaurada desde utp_auth_profile:', {
          student: parsed.fullName || parsed.name,
          hasToken: !!parsed.token,
        });
        this.currentStudentSignal.set(parsed);
        this.syncStudentProfileToSupabase(parsed);
        this.runLegacyStorageMigration();
      } catch {
        localStorage.removeItem('utp_auth_profile');
      }
    } else {
      console.log('[AuthService] ℹ️ No hay sesión activa en localStorage.');
    }
  }

  /**
   * Saneamiento y migración silenciosa para usuarios que ingresaron antes de la actualización
   */
  private runLegacyStorageMigration(): void {
    if (typeof window === 'undefined') return;
    const MIGRATION_KEY = 'utp_storage_version';
    if (localStorage.getItem(MIGRATION_KEY) === 'v2_supabase') {
      return;
    }

    console.log('[AuthService] 🧹 Ejecutando migración de almacenamiento previo a v2_supabase...');
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('utp_syllabus_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(MIGRATION_KEY, 'v2_supabase');
      console.log('[AuthService] ✅ Migración completada: Sílabos huérfanos anteriores purgados.');
    } catch (e: any) {
      console.warn('[AuthService] ℹ️ Error en migración de almacenamiento:', e.message);
    }
  }
}
