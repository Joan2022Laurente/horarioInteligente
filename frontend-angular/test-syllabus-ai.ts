import * as fs from 'fs';
import * as path from 'path';
const { PDFParse } = require('pdf-parse');
import { extractSyllabusStructured } from './src/app/data/syllabus/ai-extractor';

async function parsePdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text || '';
}


async function runAutonomousTest() {
  console.log('================================================================');
  console.log('🤖 TEST AUTÓNOMO Y TRANSPARENTE: EXTRACCIÓN CON OPENROUTER LLM (ANGULAR)');
  console.log('================================================================\n');

  const pdfDir = path.resolve(__dirname, '../labs/silabos ejemplos');
  const files = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));

  console.log(`📁 Archivos PDF oficiales detectados (${files.length}):`);
  files.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
  console.log('\n----------------------------------------------------------------\n');

  const results: any[] = [];

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(pdfDir, fileName);
    console.log(`\n================================================================`);
    console.log(`📄 [${i + 1}/${files.length}] PROCESANDO: ${fileName}`);
    console.log(`================================================================`);

    const dataBuffer = fs.readFileSync(filePath);
    const rawText = await parsePdfText(dataBuffer);

    console.log(`📊 Longitud del texto crudo extraído del PDF: ${rawText.length} caracteres`);
    console.log(`🚀 Iniciando extracción con OpenRouter LLM (Dynamic Free Models Pool) en 2 fases...`);


    const result = await extractSyllabusStructured(rawText, { maxRetries: 3 });

    if (result.success && result.syllabus) {
      const s = result.syllabus;
      const v = result.validation;
      console.log(`\n✅ RESULTADO: ÉXITO (Tiempo: ${(result.executionTimeMs / 1000).toFixed(2)}s | Intentos: ${result.attemptsCount})`);
      console.log(`   • Curso: ${s.generalInfo.courseName} (${s.generalInfo.courseCode})`);
      console.log(`   • Créditos: ${s.generalInfo.credits} | Modalidad: ${s.generalInfo.modality} | Horas: ${s.generalInfo.weeklyHours}h/sem`);
      console.log(`   • Logro: ${s.learningGoal.slice(0, 80)}...`);
      console.log(`   • Fórmula: ${s.formula}`);
      console.log(`   • Evaluaciones (${s.evaluations.length} items):`);
      s.evaluations.forEach(ev => {
        console.log(`     - [${ev.type}] ${ev.description} | ${ev.weightPercent}% | Sem ${ev.week} | ${ev.modality}`);
      });
      console.log(`   • Ponderación Total: ${v?.metrics.totalWeightPercent}% (Debe ser 100%)`);
      console.log(`   • Cronograma Semanal: ${s.weeklySchedule.length} semanas extraídas (Total temas: ${v?.metrics.totalTopicsCount})`);
      console.log(`   • Semanas 1 a 3:`);
      s.weeklySchedule.slice(0, 3).forEach(w => {
        const topicsStr = w.topics ? w.topics.join(' / ') : (w.topic || '');
        console.log(`     - Sem ${w.week} (${w.unit}): ${topicsStr.slice(0, 70)}... ${w.evaluation ? `[${w.evaluation}]` : ''}`);
      });
      console.log(`   • Semanas 16 a 18:`);
      s.weeklySchedule.slice(-3).forEach(w => {
        const topicsStr = w.topics ? w.topics.join(' / ') : (w.topic || '');
        console.log(`     - Sem ${w.week} (${w.unit}): ${topicsStr.slice(0, 70)}... ${w.evaluation ? `[${w.evaluation}]` : ''}`);
      });

      const antiPlagPercent = s.antiPlagiarismPolicy?.maxSimilarityPercent ?? 'N/A';
      const aiPolicyText = s.antiPlagiarismPolicy?.aiPolicy ? s.antiPlagiarismPolicy.aiPolicy.slice(0, 50) + '...' : 'N/A';
      console.log(`   • Antiplagio: Máx ${antiPlagPercent}% | IA: ${aiPolicyText}`);


      results.push({
        file: fileName,
        courseName: s.generalInfo.courseName,
        courseCode: s.generalInfo.courseCode,
        success: true,
        weightTotal: v?.metrics.totalWeightPercent,
        weeksCount: s.weeklySchedule.length,
        evalsCount: s.evaluations.length,
        timeSec: (result.executionTimeMs / 1000).toFixed(2),
      });
    } else {
      console.error(`\n❌ RESULTADO: FALLIDO`);
      console.error(`   Errores:`, result.errors);
      results.push({
        file: fileName,
        success: false,
        errors: result.errors,
        timeSec: (result.executionTimeMs / 1000).toFixed(2),
      });
    }

    if (i < files.length - 1) {
      console.log(`\n⏳ Esperando 5s antes de procesar el siguiente curso para refrescar cuota Groq...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }


  console.log('\n\n================================================================');
  console.log('📊 RESUMEN FINAL DEL TEST AUTÓNOMO (ANGULAR)');
  console.log('================================================================\n');
  console.table(results);
}

runAutonomousTest().catch(console.error);
