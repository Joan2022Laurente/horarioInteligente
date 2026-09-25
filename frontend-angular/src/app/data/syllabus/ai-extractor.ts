import { ParsedSyllabus, SyllabusEvaluationItem, SyllabusWeeklySession } from './types';
import { validateParsedSyllabus, ValidationResult } from './deterministic-validator';

export interface ExtractionOptions {
  apiKey?: string;
  maxRetries?: number;
}

export interface ExtractionResult {
  success: boolean;
  syllabus?: ParsedSyllabus;
  validation?: ValidationResult;
  executionTimeMs: number;
  attemptsCount?: number;
  errors?: string[];
}

import { environment } from '@env/environment';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Pool dinámico de modelos free verificados (con fallback nativo multi-modelo)
const OPENROUTER_MODELS_POOL = [
  "openrouter/free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-31b-it:free"
];

function sanitizeJson(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

async function callOpenRouterWithFailover(body: Record<string, unknown>, preferredKey?: string): Promise<any> {
  const configuredKeys: string[] = environment.openRouterApiKeys || [];
  const keysToTry: string[] = preferredKey 
    ? [preferredKey, ...configuredKeys.filter(k => k !== preferredKey)]
    : configuredKeys;

  if (keysToTry.length === 0) {
    throw new Error("No se encontraron API keys de OpenRouter configuradas en las variables de entorno.");
  }

  let lastError: Error | null = null;

  for (let keyIdx = 0; keyIdx < keysToTry.length; keyIdx++) {
    const currentKey = keysToTry[keyIdx];
    try {
      const res = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${currentKey}`,
          "HTTP-Referer": "https://horario-inteligente-utp.edu.pe",
          "X-Title": "Horario Inteligente UTP",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        return data;
      }

      if (res.status === 429 || res.status === 401 || res.status === 402 || res.status === 403) {
        console.warn(`⚠️ [OpenRouter Key #${keyIdx + 1} (${currentKey.slice(0, 16)}...)] HTTP ${res.status}: rotando a la siguiente llave...`);
        lastError = new Error(`OpenRouter HTTP ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
        continue;
      }

      throw new Error(`OpenRouter HTTP ${res.status}: ${data.error?.message || JSON.stringify(data)}`);
    } catch (err: any) {
      lastError = err;
      console.warn(`⚠️ [OpenRouter Key #${keyIdx + 1}] Error: ${err.message}. Intentando siguiente llave si existe...`);
    }
  }

  throw lastError || new Error("Se agotaron todas las llaves disponibles de OpenRouter.");
}


function partitionSyllabusText(text: string): { generalText: string; scheduleText: string } {
  const clean = text.replace(/\r\n/g, '\n');

  // En sílabos UTP:
  // Sección 1 a 4: Datos generales, Fundamentación, Sumilla, Logro General
  // Sección 7: Sistema de Evaluación (Fórmula, Ponderaciones, Rúbricas, Políticas)
  // Sección 8: Bibliografía (Se excluye para ahorrar tokens)
  // Sección 10: Cronograma de Actividades (Semanas 1 a 18)
  const evalIndex = clean.search(/(?:##\s*)?7\.\s*SISTEMA DE EVALUACI[ÓO]N/i);
  const biblioIndex = clean.search(/(?:##\s*)?8\.\s*FUENTES DE INFORMACI[ÓO]N/i);
  const scheduleIndex = clean.search(/(?:##\s*)?10\.\s*CRONOGRAMA DE ACTIVIDADES/i);

  let generalText = '';
  if (evalIndex !== -1) {
    const evalEnd = biblioIndex !== -1 ? biblioIndex : (evalIndex + 3000);
    const headerPart = clean.slice(0, evalIndex);
    const evalPart = clean.slice(evalIndex, evalEnd);
    generalText = `${headerPart}\n\n${evalPart}`;
  } else {
    generalText = clean.slice(0, 5000);
  }

  let scheduleText = '';
  if (scheduleIndex !== -1) {
    scheduleText = clean.slice(scheduleIndex);
  } else {
    const unitsIndex = clean.search(/(?:##\s*)?5\.\s*UNIDADES/i);
    scheduleText = unitsIndex !== -1 ? clean.slice(unitsIndex) : clean;
  }

  return { generalText, scheduleText };
}


/**
 * Pipeline de Extracción en 2 Fases (Two-Pass Anti-Truncation):
 * Fase 1: Metadatos, Logro, Fórmula y Sistema de Evaluación completo.
 * Fase 2: Cronograma detallado semana a semana (1 a N) con temas y actividades.
 * Fase 3: Validación determinística estricta (100% pesos, cronología y semanas).
 */
export async function extractSyllabusStructured(
  rawText: string,
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const apiKey = options.apiKey;
  const maxRetries = options.maxRetries || 2;
  const errors: string[] = [];

  const { generalText, scheduleText } = partitionSyllabusText(rawText);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[LLM Extractor] 🚀 Iniciando Pase 1 (Fórmula + Metadatos) - Intento ${attempt}/${maxRetries}...`);

      // ==========================================
      // FASE 1: Estructura de Evaluación y Metadatos
      // ==========================================
      const promptPhase1 = `Eres un extractor de datos académicos de alta precisión para universidades (UTP).
Extrae del siguiente texto oficial de sílabo los metadatos generales y la estructura completa de evaluaciones.

REGLAS ESTRICTAS PARA EVALUACIONES:
1. "formula": Copia la fórmula matemática EXACTA tal como aparece en el texto (ej. "(10%)PC1 + (20%)PC2 + (20%)PA + (20%)EP + (30%)EF" o "(10%)ATI1 + (20%)ATI2 + (20%)ATI3 + (20%)PA + (30%)TI").
2. "evaluations": Genera un item por CADA evaluación que aparezca en la tabla del sistema de evaluación.
3. "description": Copia el nombre oficial textual de la tabla (ej. "PRÁCTICA CALIFICADA 1", "PARTICIPACIÓN EN CLASE", "AVANCE DE PORTAFOLIO 1", "AVANCE DE TRABAJO DE INVESTIGACIÓN 1", "EXAMEN PARCIAL", "PROYECTO FINAL", etc.).
4. "weightPercent": Extrae el porcentaje numérico exacto (ej. 10, 20, 30).
5. "week": Extrae el número de semana exacto en que se rinde (1 a 18).
6. "modality": "Individual" o "Grupal".
7. "totalWeeksDeclared": Extrae el número total de semanas del curso (usualmente 18).

TEXTO DEL SÍLABO:
${generalText}

RESPONDE ÚNICAMENTE CON ESTE OBJETO JSON VÁLIDO (ejemplo de estructura):
{
  "generalInfo": {
    "courseCode": "100000ST61",
    "courseName": "Desarrollo Web Integrado",
    "semester": "2026 - Ciclo 2 Agosto",
    "credits": 3,
    "modality": "Presencial",
    "weeklyHours": 4,
    "careers": ["Ingeniería de Sistemas e Informática"]
  },
  "totalWeeksDeclared": 18,
  "learningGoal": "Al finalizar el curso...",
  "formula": "(20%)APF1 + (20%)APF2 + (20%)APF3 + (40%)PROY",
  "evaluations": [
    {
      "id": "APF1",
      "type": "APF1",
      "description": "AVANCE DE PORTAFOLIO 1",
      "observation": "",
      "weightPercent": 20,
      "week": 5,
      "modality": "Grupal"
    }
  ],
  "rules": ["Regla del curso"],
  "antiPlagiarismPolicy": {
    "maxSimilarityPercent": 20,
    "aiPolicy": "Uso ético y responsable de herramientas de Inteligencia Artificial."
  }
}`;

      const resPhase1 = await callOpenRouterWithFailover({
        model: OPENROUTER_MODELS_POOL[0],
        models: OPENROUTER_MODELS_POOL,
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a precise JSON extractor. Output valid JSON only." },
          { role: "user", content: promptPhase1 }
        ]
      }, apiKey);

      const content1 = sanitizeJson(resPhase1.choices[0]?.message?.content || '{}');
      const dataPhase1 = JSON.parse(content1);

      const totalWeeks = dataPhase1.totalWeeksDeclared || 18;
      console.log(`[LLM Extractor] ✅ Pase 1 completado (${dataPhase1.generalInfo?.courseName}). Total semanas declaradas: ${totalWeeks}. Iniciando Pase 2 (Cronograma 1..${totalWeeks})...`);

      // ==========================================
      // FASE 2: Cronograma Semana a Semana
      // ==========================================
      const promptPhase2 = `Eres un extractor académico. Extrae la programación semana a semana del curso "${dataPhase1.generalInfo?.courseName || 'Curso'}".

REGLAS CRÍTICAS:
1. Debes extraer TODAS las semanas desde la semana 1 hasta la semana ${totalWeeks}. NO OMITAS NINGUNA SEMANA.
2. Cada semana debe contener:
   - "week": número entero (1..${totalWeeks})
   - "unit": nombre de la unidad académica (ej. "Unidad 1: Fundamentos")
   - "topics": arreglo de strings con los temas específicos tratados esa semana
   - "activities": actividades o tareas prácticas de la semana
   - "evaluation": código o nombre corto de la evaluación si se rinde esa semana (ej. "APF1", "PC1", "ATI1", "PROY", o null si no hay evaluación)

TEXTO DE UNIDADES Y CRONOGRAMA:
${scheduleText}

RESPONDE ÚNICAMENTE CON ESTE OBJETO JSON VÁLIDO (ejemplo):
{
  "weeklySchedule": [
    {
      "week": 1,
      "unit": "Unidad 1",
      "topics": ["Tema 1"],
      "activities": "Exposición docente y laboratorio",
      "evaluation": null
    }
  ]
}`;

      const resPhase2 = await callOpenRouterWithFailover({
        model: OPENROUTER_MODELS_POOL[0],
        models: OPENROUTER_MODELS_POOL,
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a precise JSON extractor. Output valid JSON only." },
          { role: "user", content: promptPhase2 }
        ]
      }, apiKey);

      const content2 = sanitizeJson(resPhase2.choices[0]?.message?.content || '{}');
      const dataPhase2 = JSON.parse(content2);

      let weeklySchedule: SyllabusWeeklySession[] = dataPhase2.weeklySchedule || [];

      // Si vinieron temas individuales o agrupados, asegurar topics array
      weeklySchedule = weeklySchedule.map((s, idx) => ({
        week: s.week || (idx + 1),
        unit: s.unit || `Unidad ${Math.ceil((idx + 1) / 4)}`,
        topics: Array.isArray(s.topics) && s.topics.length > 0 ? s.topics : (s.topic ? [s.topic] : ["Desarrollo temático de la sesión."]),
        activities: s.activities || "",
        evaluation: s.evaluation || undefined
      }));

      // ==========================================
      // FASE 3: Ensamble y Validación Determinística
      // ==========================================
      const completeSyllabus: ParsedSyllabus = {
        id: dataPhase1.generalInfo?.courseCode || 'UTP_COURSE',
        generalInfo: {
          courseCode: dataPhase1.generalInfo?.courseCode || '',
          courseName: dataPhase1.generalInfo?.courseName || '',
          semester: dataPhase1.generalInfo?.semester || '2026 - Ciclo 2 Agosto',
          credits: Number(dataPhase1.generalInfo?.credits) || 3,
          modality: dataPhase1.generalInfo?.modality || 'Presencial',
          weeklyHours: Number(dataPhase1.generalInfo?.weeklyHours) || 4,
          careers: dataPhase1.generalInfo?.careers || ['Ingeniería de Sistemas e Informática']
        },
        learningGoal: dataPhase1.learningGoal || '',
        formula: dataPhase1.formula || '',
        evaluations: (dataPhase1.evaluations || []).map((ev: any) => ({
          id: ev.id || ev.type,
          type: ev.type || '',
          description: ev.description || '',
          observation: ev.observation || '',
          weightPercent: Number(ev.weightPercent) || 0,
          week: Number(ev.week) || 1,
          modality: ev.modality || 'Individual'
        })),
        rules: dataPhase1.rules || [],
        antiPlagiarismPolicy: dataPhase1.antiPlagiarismPolicy || {
          maxSimilarityPercent: 20,
          aiPolicy: 'Uso ético y con citación obligatoria.',
          repositoryDelivery: 'Entrega en Canvas/Turnitin'
        },
        weeklySchedule
      };

      const validation = validateParsedSyllabus(completeSyllabus);

      if (validation.isValid) {
        console.log(`[LLM Extractor] 🎯 Sílabo validado exitosamente (100% Cobertura, ${weeklySchedule.length} semanas, ${completeSyllabus.evaluations.length} evaluaciones)`);
        return {
          success: true,
          syllabus: completeSyllabus,
          validation,
          executionTimeMs: Date.now() - startTime,
          attemptsCount: attempt
        };
      } else {
        console.warn(`[LLM Extractor] ⚠️ Validación falló en intento ${attempt}:`, validation.errors);
        errors.push(...validation.errors);
      }

    } catch (err: any) {
      console.error(`[LLM Extractor] ❌ Error en intento ${attempt}:`, err.message);
      errors.push(err.message);
    }
  }

  return {
    success: false,
    errors,
    executionTimeMs: Date.now() - startTime,
    attemptsCount: maxRetries
  };
}
