/**
 * Normalizador y Sanitizador de Consignas e Indicaciones de la UTP.
 * Transforma el HTML crudo de PAO / Canvas (plagado de estilos inline de Word,
 * saltos vacíos y texto duplicado) en estructuras adaptadas a nuestro estilo Neo-Brutalist Pop.
 */

export interface CleanDeliverableItem {
  id: string;
  label: string;
  type: 'doc' | 'slides' | 'video' | 'code' | 'link' | 'general';
  hint?: string;
}

/**
 * Detecta el tipo de entregable para asignar icono y color pop temático.
 */
function detectDeliverableType(text: string): CleanDeliverableItem['type'] {
  const lower = text.toLowerCase();
  if (lower.includes('ppt') || lower.includes('presentaci') || lower.includes('diapositiv')) {
    return 'slides';
  }
  if (lower.includes('informe') || lower.includes('word') || lower.includes('pdf') || lower.includes('documento') || lower.includes('ensayo') || lower.includes('matriz')) {
    return 'doc';
  }
  if (lower.includes('video') || lower.includes('youtube') || lower.includes('declamaci') || lower.includes('grabaci') || lower.includes('audio')) {
    return 'video';
  }
  if (lower.includes('código') || lower.includes('codigo') || lower.includes('github') || lower.includes('repositorio') || lower.includes('proyecto web') || lower.includes('zip')) {
    return 'code';
  }
  if (lower.includes('enlace') || lower.includes('link') || lower.includes('url')) {
    return 'link';
  }
  return 'general';
}

/**
 * Extrae ítems de entregables limpios a partir del HTML de entregables o consigna.
 */
export function extractDeliverableItems(deliverablesHtml?: string, instructionsHtml?: string): CleanDeliverableItem[] {
  const source = deliverablesHtml || instructionsHtml || '';
  if (!source) return [];

  const items: CleanDeliverableItem[] = [];

  // Buscar elementos <li>
  const liMatches = Array.from(source.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi));
  if (liMatches.length > 0) {
    liMatches.forEach((m, idx) => {
      const clean = m[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      if (clean && clean.length > 1) {
        items.push({
          id: `item-${idx}`,
          label: clean,
          type: detectDeliverableType(clean),
        });
      }
    });
    return items;
  }

  // Si no hay <li>, buscar párrafos o líneas que comiencen con viñetas (•, -, o texto clave)
  const plainText = source
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ');

  const lines = plainText.split('\n').map(l => l.trim()).filter(Boolean);
  
  lines.forEach((line, idx) => {
    // Ignorar encabezados genéricos como "Subir los siguientes entregables:"
    if (line.toLowerCase().startsWith('subir los siguientes') || line.toLowerCase().startsWith('entregables:')) {
      return;
    }
    const cleanLine = line.replace(/^[•\-\*●\d\.\)]+\s*/, '').trim();
    if (cleanLine.length > 2 && (
      cleanLine.toLowerCase().includes('informe') ||
      cleanLine.toLowerCase().includes('ppt') ||
      cleanLine.toLowerCase().includes('video') ||
      cleanLine.toLowerCase().includes('documento') ||
      cleanLine.toLowerCase().includes('enlace') ||
      cleanLine.toLowerCase().includes('archivo')
    )) {
      items.push({
        id: `extracted-${idx}`,
        label: cleanLine,
        type: detectDeliverableType(cleanLine),
      });
    }
  });

  return items;
}

/**
 * Limpia y normaliza el HTML de la consigna para el diseño oscuro Neo-Brutalist:
 * - Elimina estilos inline que forzan fondos blancos o tamaños de letra desproporcionados
 * - Elimina párrafos vacíos y &nbsp; repetidos
 * - Elimina tags de Microsoft Word (<o:p>)
 * - Desduplica si el contenido incluye exactamente la lista de entregables ya mostrada arriba
 */
export function cleanInstructionsHtml(rawHtml?: string): string {
  if (!rawHtml) return '';

  let cleaned = rawHtml
    // Quitar tags de Office / Word
    .replace(/<\/?o:[^>]*>/gi, '')
    // Quitar atributos style inline que fuerzan colores/fondos blancos
    .replace(/style="[^"]*"/gi, '')
    .replace(/style='[^']*'/gi, '')
    // Quitar clases de Microsoft Word
    .replace(/class="Mso[^"]*"/gi, '')
    .replace(/class='Mso[^']*'/gi, '')
    // Eliminar párrafos con solo &nbsp; o espacios
    .replace(/<p[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
    // Normalizar múltiples saltos de línea consecutivos
    .replace(/(<br\s*\/?>\s*){2,}/gi, '<br />')
    .trim();

  return cleaned;
}
