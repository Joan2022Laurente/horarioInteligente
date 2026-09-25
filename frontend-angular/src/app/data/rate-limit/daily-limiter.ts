/**
 * Gestor de cuota diaria de consultas para el Asistente IA en fase de pruebas.
 * Aplica un límite de 6 consultas por día para usuarios estándar y acceso ilimitado para el usuario autenticado.
 */

const DAILY_LIMIT = 6;
const STORAGE_PREFIX = 'utp_ai_usage_';
const UNLIMITED_USERS = new Set<string>([
  'u23307609',
  'u23107609',
  'admin@utp.edu.pe',
  'admin'
]);

export function getTodayDateKey(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function resetClientDailyUsage(): void {
  if (typeof window === 'undefined') return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        toRemove.push(k);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

export function isLocalhost(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '' || host.startsWith('192.168.');
}

export function isWhitelistedUser(userIdOrEmail?: string): boolean {
  if (isLocalhost()) return true;
  if (!userIdOrEmail) return false;
  const clean = userIdOrEmail.toLowerCase().trim();
  for (const privileged of UNLIMITED_USERS) {
    if (clean.includes(privileged)) {
      resetClientDailyUsage();
      return true;
    }
  }
  return false;
}

export interface DailyLimitStatus {
  isUnlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
  dateKey: string;
}

export function getClientDailyLimitStatus(userIdOrEmail?: string): DailyLimitStatus {
  const dateKey = getTodayDateKey();

  if (isLocalhost() || isWhitelistedUser(userIdOrEmail)) {
    return {
      isUnlimited: true,
      limit: 9999,
      used: 0,
      remaining: 9999,
      dateKey,
    };
  }

  if (typeof window === 'undefined') {
    return {
      isUnlimited: false,
      limit: DAILY_LIMIT,
      used: 0,
      remaining: DAILY_LIMIT,
      dateKey,
    };
  }

  try {
    const key = `${STORAGE_PREFIX}${dateKey}`;
    const raw = localStorage.getItem(key);
    const used = raw ? parseInt(raw, 10) : 0;
    const remaining = Math.max(0, DAILY_LIMIT - used);

    return {
      isUnlimited: false,
      limit: DAILY_LIMIT,
      used,
      remaining,
      dateKey,
    };
  } catch {
    return {
      isUnlimited: false,
      limit: DAILY_LIMIT,
      used: 0,
      remaining: DAILY_LIMIT,
      dateKey,
    };
  }
}

export function incrementClientDailyUsage(userIdOrEmail?: string): DailyLimitStatus {
  const status = getClientDailyLimitStatus(userIdOrEmail);
  if (status.isUnlimited || typeof window === 'undefined') return status;

  try {
    const key = `${STORAGE_PREFIX}${status.dateKey}`;
    const nextUsed = status.used + 1;
    localStorage.setItem(key, nextUsed.toString());
    return {
      ...status,
      used: nextUsed,
      remaining: Math.max(0, DAILY_LIMIT - nextUsed),
    };
  } catch {
    return status;
  }
}
