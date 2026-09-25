import { HttpInterceptorFn } from '@angular/common/http';
import { getCachedStudentProfile } from '@data/syllabus/client-storage';
import { environment } from '@env/environment';

/**
 * Interceptor funcional HTTP que inyecta automáticamente el token JWT Bearer
 * y el encabezado de identidad x-user-id en todas las solicitudes salientes,
 * preservando las claves de autenticación en llamadas directas a Supabase.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Respetar peticiones directas a Supabase que configuran su propio apikey/anonKey
  if (req.url.includes(environment.supabaseUrl) || req.headers.has('apikey')) {
    return next(req);
  }

  // Respetar si la solicitud ya incluye una cabecera Authorization válida
  if (req.headers.has('Authorization') && !req.headers.get('Authorization')?.includes('Bearer undefined')) {
    return next(req);
  }

  const profile = getCachedStudentProfile();
  if (!profile?.token) {
    return next(req);
  }

  const studentCode = (profile.studentCode || profile.username || '').toUpperCase();
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${profile.token}`,
      ...(studentCode ? { 'x-user-id': studentCode } : {})
    }
  });

  return next(authReq);
};
