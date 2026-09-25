/**
 * Utilidades centralizadas para normalización y manipulación de texto y claves.
 */

/**
 * Normaliza una cadena eliminando acentos, caracteres especiales y espacios múltiples.
 * Ideal para comparaciones insensibles a tildes y mayúsculas en cursos y sílabos.
 */
export function normalizeKey(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza nombres de cursos para presentación limpia en la UI.
 */
export function cleanCourseName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza un string de fecha ISO o formato SQL 'YYYY-MM-DD HH:mm:ss' a objeto Date.
 */
export function parseNormalizedDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  return new Date(normalized);
}
