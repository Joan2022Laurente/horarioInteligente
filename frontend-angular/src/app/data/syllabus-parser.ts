import { CourseEvaluation } from '@domain/models/utp.model';
import { 
  SyllabusGeneralInfo, 
  SyllabusEvaluationItem, 
  SyllabusWeeklySession, 
  ParsedSyllabus 
} from './syllabus/types';
import { getSyllabusForCourse } from './syllabus/official-registry';

// Re-export types and official registry so existing callers remain 100% compatible
export * from './syllabus/types';
export * from './syllabus/official-registry';

/**
 * Parser universal dinámico para documentos de sílabo UTP (Texto plano extraído de PDF o Markdown).
 * Procesa en tiempo real sílabos de cualquier carrera, facultad y ciclo sin requerir datos pre-hardcodeados.
 */
export function parseSyllabusMarkdown(text: string): ParsedSyllabus {
  const cleanText = text.replace(/\r\n/g, '\n');

  // 1. Extraer Código y Nombre
  const titleMatch = cleanText.match(/(?:#\s*)?SÍLABO\s*\n?\s*([^(]+?)\s*\(([A-Z0-9_]{6,12})\)/i) ||
                     cleanText.match(/#\s*\*{0,2}SÍLABO\s+([^(]+)\s*\(([^)]+)\)\*{0,2}/i);
  
  let courseName = titleMatch ? titleMatch[1].trim() : '';
  let courseCode = titleMatch ? titleMatch[2].trim() : '';

  if (!courseName) {
    const headerLineMatch = cleanText.match(/([A-ZÁÉÍÓÚÑ\s\-]{4,50})\s*\(([A-Z0-9_]{6,12})\)/);
    if (headerLineMatch) {
      courseName = headerLineMatch[1].trim();
      courseCode = headerLineMatch[2].trim();
    } else {
      courseName = 'CURSO UNIVERSITARIO UTP';
      courseCode = '100000';
    }
  }

  // 2. Extraer Periodo / Ciclo
  const cycleMatch = cleanText.match(/(\d{4}\s*-\s*Ciclo\s*\d+\s*[A-Za-z]+)/i);
  const semester = cycleMatch ? cycleMatch[1].trim() : '2026 - Ciclo 2 Agosto';

  // 3. Extraer Datos Generales
  const creditsMatch = cleanText.match(/Créditos:\s*(\d+)/i);
  const modalityMatch = cleanText.match(/Enseñanza de curso:\s*([^\n\r]+)/i);
  const hoursMatch = cleanText.match(/Horas semanales:\s*(\d+)/i);
  const careersMatch = cleanText.match(/Carrera:\s*([\s\S]*?)(?=\s*1\.2|\s*Créditos|\n\s*2\.|\n\s*\d+\.\d+)/i);

  const credits = creditsMatch ? parseInt(creditsMatch[1], 10) : 3;
  const modality = modalityMatch ? modalityMatch[1].trim() : 'Presencial';
  const weeklyHours = hoursMatch ? parseInt(hoursMatch[1], 10) : 4;
  const careers = careersMatch 
    ? careersMatch[1].split('\n').map(c => c.trim()).filter(c => c.length > 2)
    : ['Ingeniería de Sistemas e Informática', 'Ingeniería de Software'];

  // 4. Logro General de Aprendizaje
  const goalMatch = cleanText.match(/(?:##\s*)?4\.\s*LOGRO GENERAL DE APRENDIZAJE\s*([\s\S]*?)(?=(?:##\s*)?5\.\s*UNIDADES|\n\s*5\.|$)/i);
  const learningGoal = goalMatch ? goalMatch[1].trim().replace(/\n+/g, ' ') : '';

  // 5. Extraer Fórmula de Evaluación
  const formulaMatch = cleanText.match(/\(\d+%\)[A-Za-z0-9_]+(?:\s*\+\s*\(\d+%\)[A-Za-z0-9_]+)+/i) ||
                       cleanText.match(/`(\([^`]+?\))`/) ||
                       cleanText.match(/Fórmula:\s*([^\n\r]+)/i);
  const formula = formulaMatch ? formulaMatch[0].trim() : '(25%)PC1 + (25%)PC2 + (10%)PA + (40%)PROY';

  // Construir mapa de ponderaciones a partir de la fórmula
  const weightMap: Record<string, number> = {};
  const weightRegex = /\((\d{1,2})%\)([A-Z0-9_]+)/gi;
  let wm;
  while ((wm = weightRegex.exec(formula)) !== null) {
    weightMap[wm[2].toUpperCase()] = parseInt(wm[1], 10);
  }

  // 6. Extraer Tabla de Evaluaciones
  const evaluations: SyllabusEvaluationItem[] = [];
  
  // Intento A: Formato Tabla Markdown con pipes '|'
  const evalTableSection = cleanText.match(/##\s*\*{0,2}7\.1\.\s*DESCRIPCIÓN DE LAS EVALUACIONES\*{0,2}([\s\S]*?)(?=##\s*\*{0,2}8\.|$)/i);
  if (evalTableSection && evalTableSection[1].includes('|')) {
    const rows = evalTableSection[1].split('\n').filter(r => r.includes('|') && !r.includes('---'));
    for (const row of rows) {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 4 && !cols[0].toLowerCase().includes('tipo') && !cols[0].toLowerCase().includes('evaluación')) {
        const type = cols[0].toUpperCase();
        const description = cols[1];
        const week = parseInt(cols[2], 10) || 1;
        const weightPercent = weightMap[type] || (cols[4] ? parseInt(cols[4].replace('%', ''), 10) : 20) || 20;
        const modalityStr = (cols[5]?.toLowerCase().includes('grupal') || description.toLowerCase().includes('proyecto')) ? 'Grupal' : 'Individual';
        const observation = cols[3] || cols[6] || `${modalityStr}. ${description}.`;

        evaluations.push({
          id: `eval-${type.toLowerCase()}-${week}`,
          type,
          description,
          week,
          weightPercent,
          modality: modalityStr,
          observation,
          rules: [`Semana ${week}`, `Ponderación ${weightPercent}%`, modalityStr, 'No rezagado']
        });
      }
    }
  }

  // Intento B: Formato Texto Plano Extraído de PDF UTP
  if (evaluations.length === 0) {
    const evalBlockMatch = cleanText.match(/(?:Donde:\s*\n?\s*Tipo\s+Descripción\s+Semana\s+Observación|7\.1\.\s*DESCRIPCIÓN DE LAS EVALUACIONES|7\.\s*SISTEMA DE EVALUACIÓN)([\s\S]*?)(?=Indicaciones|8\.\s*FUENTES|##\s*8\.|$)/i);
    
    if (evalBlockMatch) {
      const evalLines = evalBlockMatch[1].split('\n');
      for (const line of evalLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.toLowerCase().startsWith('tipo') || trimmed.toLowerCase().startsWith('el cálculo') || trimmed.toLowerCase().startsWith('donde')) continue;

        const rowMatch = trimmed.match(/^([A-Z0-9_]{2,8})\s+(.+?)\s+(\d{1,2})(?:\s+(.*))?$/i);
        if (rowMatch) {
          const type = rowMatch[1].toUpperCase();
          const description = rowMatch[2].trim();
          const week = parseInt(rowMatch[3], 10);
          const rawObs = rowMatch[4] ? rowMatch[4].trim() : '';
          const modalityStr = (rawObs.toLowerCase().includes('grupal') || description.toLowerCase().includes('proyecto') || type === 'PROY' || type === 'TI' || type === 'TF') ? 'Grupal' : 'Individual';
          const weightPercent = weightMap[type] || 25;

          evaluations.push({
            id: `eval-${type.toLowerCase()}-${week}`,
            type,
            description,
            week,
            weightPercent,
            modality: modalityStr,
            observation: rawObs || `${modalityStr}. ${description}.`,
            rules: [`Semana ${week}`, `Ponderación ${weightPercent}%`, modalityStr, 'No rezagado']
          });
        }
      }
    }
  }

  // Fallback por fórmula
  if (evaluations.length === 0 && Object.keys(weightMap).length > 0) {
    Object.entries(weightMap).forEach(([type, weight], index) => {
      const isFinal = type.includes('PROY') || type.includes('EF') || type.includes('TI');
      const isMid = type.includes('EP') || type.includes('PC2');
      const isPA = type.includes('PA');
      const week = isFinal ? 18 : isPA ? 17 : isMid ? 12 : 3 + (index * 3);
      const isGrupal = isFinal;

      evaluations.push({
        id: `eval-${type.toLowerCase()}-${week}`,
        type,
        description: isFinal ? 'PROYECTO FINAL' : isPA ? 'PARTICIPACIÓN EN CLASE' : `EVALUACIÓN ${type}`,
        week,
        weightPercent: weight,
        modality: isGrupal ? 'Grupal' : 'Individual',
        observation: `${isGrupal ? 'Grupal' : 'Individual'}. Evaluación curricular oficial (${weight}%).`,
        rules: [`Semana ${week}`, `Ponderación ${weight}%`, isGrupal ? 'Grupal' : 'Individual']
      });
    });
  }

  // 7. Extraer Indicaciones y Reglas Generales
  const rules: string[] = [];
  const rulesSection = cleanText.match(/Indicaciones sobre Fórmulas de Evaluación:\s*([\s\S]*?)(?=8\.\s*FUENTES|##\s*8\.|$)/i) ||
                       cleanText.match(/(?:##\s*)?8\.\s*INDICACIONES GENERALES\s*([\s\S]*?)(?=(?:##\s*)?9\.|$)/i);
  if (rulesSection) {
    const lines = rulesSection[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^\d+\./)) {
        rules.push(trimmed.replace(/^[-*\d.]+\s*/, ''));
      }
    }
  }
  if (rules.length === 0) {
    rules.push('La nota mínima aprobatoria final es de 12.');
    rules.push('En este curso, no aplica examen rezagado.');
  }

  // 8. Políticas de Integridad y Plagio
  let antiPlagiarismPolicy: ParsedSyllabus['antiPlagiarismPolicy'];
  if (cleanText.includes('Integridad académica') || cleanText.includes('similitud') || cleanText.includes('plagio')) {
    antiPlagiarismPolicy = {
      maxSimilarityPercent: 20,
      aiPolicy: 'Permitido el uso responsable de IA para asistencia y depuración, prohibida la copia íntegra no documentada.',
      repositoryDelivery: 'Registro obligatorio con historial de commits y entrega en plataforma oficial.'
    };
  }

  // 9. Cronograma de Actividades (Semanas 1 a 18)
  const weeklySchedule: SyllabusWeeklySession[] = [];
  const scheduleSection = cleanText.match(/(?:10\.\s*CRONOGRAMA DE ACTIVIDADES|10\.CRONOGRAMA DE ACTIVIDADES)([\s\S]*)$/i);
  
  if (scheduleSection) {
    const lines = scheduleSection[1].split('\n');
    let currentUnit = 'Unidad 1';
    let currentWeekNum = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.includes('Unidad 1') || line.includes('Unidad de aprendizaje 1')) currentUnit = 'Unidad 1';
      if (line.includes('Unidad 2') || line.includes('Unidad de aprendizaje 2')) currentUnit = 'Unidad 2';
      if (line.includes('Unidad 3') || line.includes('Unidad de aprendizaje 3')) currentUnit = 'Unidad 3';
      if (line.includes('Unidad 4') || line.includes('Unidad de aprendizaje 4')) currentUnit = 'Unidad 4';

      const rowMatch = line.match(/^(\d{1,2})\s+(\d{1,2})\s+(.+)$/);
      if (rowMatch) {
        currentWeekNum = parseInt(rowMatch[1], 10);
        const session = parseInt(rowMatch[2], 10);
        const topic = rowMatch[3].trim();
        
        let evaluationName: string | undefined;
        if (topic.includes('Evaluación') || topic.includes('APF') || topic.includes('PC') || topic.includes('PROY') || topic.includes('EXAMEN') || topic.includes('PARTICIPACIÓN')) {
          const evalMatch = topic.match(/(APF\d|PC\d|ATI\d|TA\d|EP|EF|PROY|TI|TF|PA)/i);
          if (evalMatch) evaluationName = evalMatch[1].toUpperCase();
        }

        weeklySchedule.push({
          week: currentWeekNum,
          session,
          unit: currentUnit,
          topic,
          evaluation: evaluationName
        });
        continue;
      }

      const sessionOnlyMatch = line.match(/^(\d{1,2})\s+([A-Za-zÁÉÍÓÚ].+)$/);
      if (sessionOnlyMatch && parseInt(sessionOnlyMatch[1], 10) <= 36) {
        const session = parseInt(sessionOnlyMatch[1], 10);
        const topic = sessionOnlyMatch[2].trim();

        let evaluationName: string | undefined;
        if (topic.includes('Evaluación') || topic.includes('APF') || topic.includes('PC') || topic.includes('PROY') || topic.includes('EXAMEN') || topic.includes('PARTICIPACIÓN')) {
          const evalMatch = topic.match(/(APF\d|PC\d|ATI\d|TA\d|EP|EF|PROY|TI|TF|PA)/i);
          if (evalMatch) evaluationName = evalMatch[1].toUpperCase();
        }

        weeklySchedule.push({
          week: Math.ceil(session / 2) || currentWeekNum,
          session,
          unit: currentUnit,
          topic,
          evaluation: evaluationName
        });
      }
    }
  }

  // Fallback de unidades
  if (weeklySchedule.length === 0) {
    const unitsSection = cleanText.match(/(?:5\.\s*UNIDADES Y LOGROS ESPECÍFICOS DE APRENDIZAJE|5\.UNIDADES)([\s\S]*?)(?=6\.\s*METODOLOGÍA|6\.METODOLOGÍA|$)/i);
    if (unitsSection) {
      const uText = unitsSection[1];
      const weekBlocks = uText.split(/(?=Semana\s*\d+)/i);
      
      weekBlocks.forEach((block, idx) => {
        const wMatch = block.match(/Semana\s*([\d,\sy]+)/i);
        const topicMatch = block.match(/Temario:\s*([\s\S]*?)(?=Unidad|Logro|Semana|$)/i);
        const wNum = wMatch ? parseInt(wMatch[1], 10) || (idx + 1) : (idx + 1);
        const topic = topicMatch ? topicMatch[1].trim().replace(/\n+/g, ' ') : block.trim().slice(0, 100);

        if (topic) {
          weeklySchedule.push({
            week: wNum,
            session: wNum * 2,
            unit: `Unidad ${Math.min(3, Math.ceil(wNum / 6))}`,
            topic
          });
        }
      });
    }
  }

  return {
    id: courseCode,
    generalInfo: {
      courseCode,
      courseName,
      semester,
      credits,
      modality,
      weeklyHours,
      careers,
    },
    learningGoal,
    formula,
    evaluations,
    rules,
    antiPlagiarismPolicy,
    weeklySchedule,
  };
}

export function resolveCourseSyllabus(
  courseNameOrCode: string,
  syllabiCache?: Record<string, ParsedSyllabus>
): ParsedSyllabus | null {
  if (!courseNameOrCode) return null;
  const normalized = courseNameOrCode.toUpperCase().trim();

  if (syllabiCache) {
    if (syllabiCache[courseNameOrCode]) return syllabiCache[courseNameOrCode];
    if (syllabiCache[normalized]) return syllabiCache[normalized];
    for (const s of Object.values(syllabiCache)) {
      if (
        s.generalInfo?.courseCode?.toUpperCase() === normalized ||
        s.generalInfo?.courseName?.toUpperCase().includes(normalized) ||
        normalized.includes(s.generalInfo?.courseName?.toUpperCase() || '')
      ) {
        return s;
      }
    }
  }

  return getSyllabusForCourse(courseNameOrCode);
}

export function getWeekTopicFromSyllabus(
  syllabus: ParsedSyllabus,
  weekNumber: number
): { topic: string; activities?: string; evaluation?: string } {
  if (!syllabus?.weeklySchedule || syllabus.weeklySchedule.length === 0) {
    return { topic: `Sesión académica de la Semana ${weekNumber}` };
  }

  const session = syllabus.weeklySchedule.find((s) => s.week === weekNumber);
  if (session) {
    const topicText =
      session.topic ||
      (session.topics && session.topics.length > 0
        ? session.topics.join(', ')
        : `Unidad de aprendizaje: ${session.unit}`);
    const activitiesText = Array.isArray(session.activities)
      ? session.activities.join(' • ')
      : session.activities;
    return {
      topic: topicText,
      activities: activitiesText,
      evaluation: session.evaluation,
    };
  }

  return { topic: `Contenido temático de la Semana ${weekNumber}` };
}

export function generateDynamicStudyTips(
  syllabus: ParsedSyllabus,
  weekNumber: number
): string[] {
  const tips: string[] = [];
  if (!syllabus) return ['Revisa los temas semanales y coordina tus entregables con anticipación.'];

  const upcomingEval = syllabus.evaluations?.find(
    (e) => e.week === weekNumber || e.week === weekNumber + 1
  );
  if (upcomingEval) {
    tips.push(
      `Atención a la evaluación **${upcomingEval.type}** (${upcomingEval.description}) en Semana ${upcomingEval.week} con un peso del ${upcomingEval.weightPercent}% (${upcomingEval.modality}).`
    );
  }

  if (syllabus.learningGoal) {
    tips.push(
      `Logro formativo: ${syllabus.learningGoal.slice(0, 160)}${
        syllabus.learningGoal.length > 160 ? '...' : ''
      }`
    );
  }

  if (syllabus.antiPlagiarismPolicy) {
    tips.push(
      `Política de integridad: límite máximo de similitud ${syllabus.antiPlagiarismPolicy.maxSimilarityPercent}% en entregas.`
    );
  }

  if (tips.length === 0) {
    tips.push('Repasa los conceptos clave y planifica tus sesiones de estudio con antelación.');
  }

  return tips;
}
