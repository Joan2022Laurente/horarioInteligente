export interface MemeSticker {
  id: string;
  name: string;
  caption: string;
  src: string;
  category: 'hype' | 'study' | 'reaction' | 'discipline' | 'funny';
  promptHint: string;
}

export const MEME_STICKERS: MemeSticker[] = [
  {
    id: 'fiumba',
    name: 'Tupac Fiumba',
    caption: 'Fiumba, resuelto con flow',
    src: '/stickers/tupac_fiumba.jpg',
    category: 'hype',
    promptHint: 'resuelto rápido, tranquilidad o flow'
  },
  {
    id: 'einstein_pm',
    name: 'Einstein PM',
    caption: 'P*ta madre, qué examen/error',
    src: '/stickers/einstein_pm.jpg',
    category: 'reaction',
    promptHint: 'frustración, error grave o examen brutal'
  },
  {
    id: 'burro_chad',
    name: 'Burro Chad Mewing',
    caption: 'Mewing académico / Confianza 100%',
    src: '/stickers/burro_chad.jpg',
    category: 'hype',
    promptHint: 'seguridad total, victoria o modo chad'
  },
  {
    id: 'angel_consejo',
    name: 'Ángel Consejo',
    caption: 'Tip de oro revelado',
    src: '/stickers/angel_consejo.jpg',
    category: 'study',
    promptHint: 'consejo secreto, tip clave o revelación'
  },
  {
    id: 'whiplash',
    name: 'Whiplash Serio',
    caption: 'Cero excusas. A estudiar en serio',
    src: '/stickers/whiplash.jpg',
    category: 'discipline',
    promptHint: 'disciplina estricta, sin excusas ni retrasos'
  },
  {
    id: 'hulk_bestia',
    name: 'Hulk Modo Bestia',
    caption: '¡Modo bestia activado!',
    src: '/stickers/hulk_bestia.jpg',
    category: 'discipline',
    promptHint: 'energía bruta para amanecida o entrega final'
  },
  {
    id: 'hulk_concentrado',
    name: 'Hulk Hiperfoco Zen',
    caption: 'Concentración y calma mental',
    src: '/stickers/hulk_concentrado.jpg',
    category: 'study',
    promptHint: 'hiperfoco zen, meditación antes de examen'
  },
  {
    id: 'bendicion_capo',
    name: 'Bendición de Capo',
    caption: 'Bendecido por el copiloto',
    src: '/stickers/bendicion_capo.jpg',
    category: 'hype',
    promptHint: 'orgullo, respeto o bendición al estudiante'
  },
  {
    id: 'einstein_explica',
    name: 'Einstein Explica',
    caption: 'Fácil: aquí está la lógica',
    src: '/stickers/einstein_explica.jpg',
    category: 'study',
    promptHint: 'explicación magistral, eureka o claridad'
  },
  {
    id: 'lagartija_lentes',
    name: 'Lagartija Intelectual',
    caption: 'Análisis milimétrico calculado',
    src: '/stickers/lagartija_lentes.jpg',
    category: 'study',
    promptHint: 'análisis detallado o cálculo exacto de notas'
  },
  {
    id: 'chimpance_pensador',
    name: 'Chimpancé Pensador',
    caption: 'Dudas existenciales de la carrera',
    src: '/stickers/chimpance_pensador.jpg',
    category: 'reaction',
    promptHint: 'dudas profundas o dilemas académicos'
  },
  {
    id: 'empieza_lo_bueno',
    name: 'Empieza lo Bueno',
    caption: 'Geometry Dash: Se viene lo épico',
    src: '/stickers/empieza_lo_bueno.jpg',
    category: 'hype',
    promptHint: 'inicio de proyectos épicos o retos'
  },
  {
    id: 'empieza_lo_malo',
    name: 'Empieza lo Malo',
    caption: 'Geometry Dash: Semana de parciales',
    src: '/stickers/empieza_lo_malo.jpg',
    category: 'reaction',
    promptHint: 'semana de parciales o peligro inminente'
  },
  {
    id: 'la_roca_shock',
    name: 'The Rock Shock',
    caption: '¿Cómo que la entrega era hoy?',
    src: '/stickers/la_roca_shock.jpg',
    category: 'reaction',
    promptHint: 'asombro total, sorpresa de fechas o notas'
  },
  {
    id: 'alien_contacto',
    name: 'Alien Contacto',
    caption: 'Conexión mental establecida',
    src: '/stickers/alien_contacto.jpg',
    category: 'study',
    promptHint: 'conexión mental o entendimiento mutuo'
  },
  {
    id: 'alien_tierno',
    name: 'Alien Ojitos',
    caption: '¿Un puntito más por asistencia?',
    src: '/stickers/alien_tierno.jpg',
    category: 'reaction',
    promptHint: 'agradecimiento, súplica o ternura'
  },
  {
    id: 'sobrevalorado_zzz',
    name: 'Pato Lucas ZZZ',
    caption: 'Sobrevalorado zzzzz',
    src: '/stickers/sobrevalorado_zzz.jpg',
    category: 'funny',
    promptHint: 'descartar pérdida de tiempo o cosas innecesarias'
  },
  {
    id: 'timido_deditos',
    name: 'Tímido Deditos',
    caption: '¿Y si repasamos juntos?',
    src: '/stickers/timido_deditos.jpg',
    category: 'funny',
    promptHint: 'consulta con pena o sugerencia tímida'
  },
  {
    id: 'mm_elegante',
    name: 'M&M Elegante',
    caption: 'Fineza y estilo para sacar 20',
    src: '/stickers/mm_elegante.jpg',
    category: 'hype',
    promptHint: 'elegancia, distinción o nota perfecta'
  },
  {
    id: 'moe_espantar',
    name: 'Moe Advertencia',
    caption: 'Pero para espantar si eres listo',
    src: '/stickers/moe_espantar.jpg',
    category: 'funny',
    promptHint: 'troleo amistoso ante procrastinación'
  },
  {
    id: 'piso_es_laburo',
    name: 'El Piso es Laburo',
    caption: '¡El piso es la tarea!',
    src: '/stickers/piso_es_laburo.jpg',
    category: 'funny',
    promptHint: 'esquivando tareas o llamado de atención anti-flojera'
  }
];

export const STICKERS_MAP: Record<string, MemeSticker> = MEME_STICKERS.reduce((acc, sticker) => {
  acc[sticker.id.toLowerCase()] = sticker;
  // Aliases for tolerance
  if (sticker.id === 'fiumba') acc['tupac_fiumba'] = sticker;
  if (sticker.id === 'burro_chad') acc['burro'] = sticker;
  if (sticker.id === 'whiplash') acc['whiplash_serio'] = sticker;
  if (sticker.id === 'angel_consejo') acc['angel'] = sticker;
  if (sticker.id === 'hulk_bestia') acc['hulk'] = sticker;
  if (sticker.id === 'einstein_pm') acc['einstein'] = sticker;
  if (sticker.id === 'la_roca_shock') acc['la_roca'] = sticker;
  if (sticker.id === 'sobrevalorado_zzz') acc['sobrevalorado'] = sticker;
  return acc;
}, {} as Record<string, MemeSticker>);

export function getStickerById(id: string): MemeSticker | undefined {
  if (!id) return undefined;
  const cleanId = id.trim().toLowerCase().replace(/^\[sticker:/, '').replace(/\]$/, '');
  return STICKERS_MAP[cleanId];
}

export const AI_STICKER_PROMPT_GUIDE = `## STICKERS MEMES DISPONIBLES (Opcional para dar simpatía o humor universitario, máx 1 al final del mensaje con [STICKER:id]):
${MEME_STICKERS.map(s => `[STICKER:${s.id}] (${s.promptHint})`).join(', ')}`;
