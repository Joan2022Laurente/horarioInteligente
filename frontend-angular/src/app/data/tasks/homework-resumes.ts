/**
 * Registro de Indicaciones y Consignas Oficiales de Tareas UTP
 * Extraídas en vivo desde el microservicio:
 * GET https://api-pao.utpxpedition.com/course/student/sections/{sectionId}/homeworks/{homeworkId}/resume
 */

export interface OfficialHomeworkResume {
  id: string;
  title: string;
  availableFrom?: string;
  availableUntil?: string;
  evaluationTopScore?: number;
  isGroup?: boolean;
  attempts?: number;
  deliverables?: string;
  content?: string;
  files?: Array<{ id?: string; name: string; url: string; size?: number }>;
  rubric?: any;
  [key: string]: any;
}

export const OFFICIAL_HOMEWORK_RESUMES: Record<string, OfficialHomeworkResume> = {
  "dd70960d-5cd5-5ac8-97de-c4b203a8ccb7": {
    "id": "dd70960d-5cd5-5ac8-97de-c4b203a8ccb7",
    "isQualified": "false",
    "availableFrom": "2026-09-07 00:00:00",
    "availableUntil": "2026-09-14 23:59:00",
    "evaluationTopScore": 20,
    "assignmentStatus": "CREATED",
    "assignmentProgress": "NOT_STARTED",
    "evaluationSystem": null,
    "currentDate": "2026-09-14 09:24:26",
    "isBeforeCurrentDateAvailableFrom": true,
    "isBeforeCurrentDateAvailableUntil": false,
    "isProgrammed": false,
    "isGroup": false,
    "title": "(AC-S05-PA02) - Participación en clase 02",
    "attempts": 1,
    "qualificationType": null,
    "isAssociate": false,
    "teamSetId": null,
    "homeworkLastAttempt": null,
    "homeworkStatus": "NOT_DELIVERED",
    "rubric": null,
    "assignmentIsNsp": false,
    "assignmentIsZero": false,
    "assignmentDiscountScore": null,
    "assignmentIsPlagiarized": false,
    "deliverables": "<p>Sube tu tarea acorde a las indicaciones sugeridas.&nbsp;</p>",
    "content": "<h4 style=\"--tw-ring-color:rgba(59, 130, 246, 0.5);--tw-ring-inset:;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-offset-width:0px;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);border:0px solid currentcolor;box-sizing:border-box;color:rgb(74, 79, 85);font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:1.6rem;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;letter-spacing:normal;margin:0px;orphans:2;outline:none;position:relative !important;text-align:center;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;transition:background 0.2s ease-in-out;white-space:normal;widows:2;word-break:break-word;word-spacing:0px;\"><strong style=\"--tw-ring-color:rgba(59, 130, 246, 0.5);--tw-ring-inset:;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-offset-width:0px;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;border:0px solid currentcolor;box-sizing:border-box;outline:none;transition:background 0.2s ease-in-out;\">Consigna para Participación en clase 2</strong></h4><p style=\"--tw-ring-color:rgba(59, 130, 246, 0.5);--tw-ring-inset:;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-offset-width:0px;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);border:0px solid currentcolor;box-sizing:border-box;color:rgb(74, 79, 85);font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:1.6rem;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;letter-spacing:normal;margin:0px;orphans:2;outline:none;position:relative !important;text-align:center;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;transition:background 0.2s ease-in-out;white-space:normal;widows:2;word-break:break-word;word-spacing:0px;\"><strong style=\"--tw-ring-color:rgba(59, 130, 246, 0.5);--tw-ring-inset:;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-offset-width:0px;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);border:0px solid currentcolor;box-sizing:border-box;color:rgb(74, 79, 85);font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;letter-spacing:normal;orphans:2;outline:none;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;transition:background 0.2s ease-in-out;white-space:normal;widows:2;word-spacing:0px;\">Expresión oral mediante declamación</strong></p><p style=\"--tw-ring-color:rgba(59, 130, 246, 0.5);--tw-ring-inset:;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-offset-width:0px;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);border:0px solid currentcolor;box-sizing:border-box;color:rgb(74, 79, 85);font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;margin:0px;orphans:2;outline:none;position:relative !important;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;transition:background 0.2s ease-in-out;white-space:normal;widows:2;word-spacing:0px;\"><br><strong style=\"--tw-ring-color:rgba(59, 130, 246, 0.5);--tw-ring-inset:;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-offset-width:0px;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;border:0px solid currentcolor;box-sizing:border-box;outline:none;transition:background 0.2s ease-in-out;\">1. Indicación general:</strong><br>Estás en el inicio de tu etapa universitaria y deseas destacar en un entorno cada vez más competitivo. Para lograrlo, necesitas desarrollar habilidades de comunicación que te permitan expresarte con claridad, seguridad y autenticidad, tanto en tu vida académica como en futuros contextos laborales. A lo largo del curso, asumirás el reto de construir tu identidad comunicativa mediante actividades prácticas. Estas experiencias están diseñadas para ayudarte a identificar tus fortalezas, trabajar tus áreas de mejora y proyectarte con mayor confianza ante los demás.</p><p style=\"--tw-ring-color:rgba(59, 130, 246, 0.5);--tw-ring-inset:;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-offset-width:0px;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);border:0px solid currentcolor;box-sizing:border-box;color:rgb(74, 79, 85);font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;margin:0px;orphans:2;outline:none;position:relative !important;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;transition:background 0.2s ease-in-out;white-space:normal;widows:2;word-spacing:0px;\"><br><strong style=\"--tw-ring-color:rgba(59, 130, 246, 0.5);--tw-ring-inset:;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-offset-width:0px;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;border:0px solid currentcolor;box-sizing:border-box;outline:none;transition:background 0.2s ease-in-out;\">2. Indicaciones específicas:</strong></p><p style=\"--tw-ring-color:rgba(59, 130, 246, 0.5);--tw-ring-inset:;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-ring-offset-width:0px;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);border:0px solid currentcolor;box-sizing:border-box;color:rgb(74, 79, 85);font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;margin:0px;orphans:2;outline:none;position:relative !important;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;transition:background 0.2s ease-in-out;white-space:normal;widows:2;word-spacing:0px;\"><span style=\"-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);color:rgb(74, 79, 85);display:inline !important;float:none;font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;orphans:2;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;white-space:normal;widows:2;word-spacing:0px;\">● Actividad individual</span><br><span style=\"-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);color:rgb(74, 79, 85);display:inline !important;float:none;font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;orphans:2;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;white-space:normal;widows:2;word-spacing:0px;\">● Elige una frase o poema breve del listado proporcionado por el docente.</span><br><span style=\"-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);color:rgb(74, 79, 85);display:inline !important;float:none;font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;orphans:2;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;white-space:normal;widows:2;word-spacing:0px;\">● Graba un video en el que recites lo elegido en tres versiones:</span><br><span style=\"-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);color:rgb(74, 79, 85);display:inline !important;float:none;font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;orphans:2;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;white-space:normal;widows:2;word-spacing:0px;\">• Lentamente y con buena dicción.</span><br><span style=\"-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);color:rgb(74, 79, 85);display:inline !important;float:none;font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;orphans:2;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;white-space:normal;widows:2;word-spacing:0px;\">• A velocidad normal.</span><br><span style=\"-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);color:rgb(74, 79, 85);display:inline !important;float:none;font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;orphans:2;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;white-space:normal;widows:2;word-spacing:0px;\">• Lo más rápido posible sin perder claridad ni articulación.</span><br><span style=\"-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);color:rgb(74, 79, 85);display:inline !important;float:none;font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;orphans:2;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;white-space:normal;widows:2;word-spacing:0px;\">● Es importante que no leas ni dependas del texto escrito mientras grabas, por lo que deberás memorizarlo previamente.</span><br><span style=\"-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);color:rgb(74, 79, 85);display:inline !important;float:none;font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;orphans:2;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;white-space:normal;widows:2;word-spacing:0px;\">● Súbelo a YouTube y configura su visibilidad como “Público” o “No listado” para que tu docente pueda visualizarlo.</span><br><span style=\"-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);color:rgb(74, 79, 85);display:inline !important;float:none;font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;orphans:2;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;white-space:normal;widows:2;word-spacing:0px;\">● Comparte el enlace en la sección de comentarios de la participación 2 en la plataforma virtual de aprendizaje.</span><br><span style=\"-webkit-text-stroke-width:0px;background-color:rgb(255, 255, 255);color:rgb(74, 79, 85);display:inline !important;float:none;font-family:Lato, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, &quot;Noto Sans&quot;, sans-serif, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;, &quot;Segoe UI Symbol&quot;, &quot;Noto Color Emoji&quot;;font-size:14px;font-style:normal;font-variant-caps:normal;font-variant-ligatures:normal;font-weight:400;letter-spacing:normal;orphans:2;text-align:start;text-decoration-color:initial;text-decoration-style:initial;text-decoration-thickness:initial;text-indent:0px;text-transform:none;white-space:normal;widows:2;word-spacing:0px;\">● Toma en cuenta las recomendaciones sobre la comunicación oral</span></p><p class=\"MsoTitle\" style=\"text-align:center;\">&nbsp;</p><p class=\"MsoBodyText\" style=\"margin-bottom:.0001pt;margin-left:36.0pt;margin-right:19.85pt;margin-top:1.25pt;text-align:justify;\"><o:p></o:p></p><p class=\"MsoBodyText\" style=\"margin-bottom:.0001pt;margin-left:54.0pt;margin-right:19.85pt;margin-top:1.25pt;text-align:justify;\"><o:p></o:p></p><h4 style=\"margin-bottom:.0001pt;margin-left:19.85pt;margin-right:19.85pt;margin-top:6.0pt;mso-list:l0 level1 lfo1;tab-stops:81.15pt;text-align:justify;text-indent:-14.1pt;\"><o:p></o:p></h4><p class=\"MsoBodyText\" style=\"margin-bottom:.0001pt;margin-left:19.85pt;margin-right:19.85pt;margin-top:2.2pt;text-align:justify;\"><o:p></o:p></p><figure style=\"background-color:var(--ck-color-base-error);color:white;font-size:1em;margin:0;padding:1em;\"><p>Todo acto de <strong>copiar</strong>, <strong>intentar copiar</strong> o <strong>dejar copiar</strong>, durante una prueba, examen, práctica, trabajo o cualquier asignación académica - usando tanto el medio físico como el electrónico - se<strong> encuentra normado </strong>en el <strong>Reglamento de Estudios y el Reglamento de Disciplina del Estudiante</strong> vigentes en el Portal de Transparencia y/o en el Portal del Estudiante.</p></figure><p class=\"MsoBodyText\" style=\"margin-bottom:.0001pt;margin-left:73.85pt;margin-right:19.85pt;margin-top:0cm;mso-list:l2 level1 lfo3;text-align:justify;text-indent:-18.0pt;\"><o:p></o:p></p><h4 style=\"margin-bottom:.0001pt;margin-left:19.85pt;margin-right:19.85pt;margin-top:6.0pt;mso-list:l0 level1 lfo1;tab-stops:81.15pt;text-align:justify;text-indent:-14.1pt;\"><o:p></o:p></h4>",
    "files": [],
    "isFlexibleEvaluation": false
  },
  "d104f0f2-39ce-58aa-86a6-f7ee0f317104": {
    "id": "d104f0f2-39ce-58aa-86a6-f7ee0f317104",
    "isQualified": "false",
    "availableFrom": "2026-09-07 00:00:00",
    "availableUntil": "2026-09-14 23:59:00",
    "evaluationTopScore": 20,
    "assignmentStatus": "CREATED",
    "assignmentProgress": "NOT_STARTED",
    "evaluationSystem": null,
    "currentDate": "2026-09-14 09:24:26",
    "isBeforeCurrentDateAvailableFrom": true,
    "isBeforeCurrentDateAvailableUntil": false,
    "isProgrammed": false,
    "isGroup": false,
    "title": "Tarea - Actividad del narrador oral: entrena tu voz y cuenta un cuento",
    "attempts": 1,
    "qualificationType": null,
    "isAssociate": false,
    "teamSetId": null,
    "homeworkLastAttempt": null,
    "homeworkStatus": "NOT_DELIVERED",
    "rubric": null,
    "assignmentIsNsp": false,
    "assignmentIsZero": false,
    "assignmentDiscountScore": null,
    "assignmentIsPlagiarized": false,
    "deliverables": "<p>Puedes repetir esta actividad tantas veces como quieras y con los cuentos que desees, no es evaluativa. También puedes guardar estas grabaciones para autoevaluar tu proceso de mejora.&nbsp;</p>",
    "content": "<p>Te invitamos a que ahora ejercites tu expresividad oral a través de la narración de cuentos, entrenando aspectos clave como la pronunciación, modulación, pausas, énfasis y respiración, con la ayuda de la app Orai. Para eso, sigue las siguientes instrucciones.</p><p>&nbsp;</p><p>1. Descarga la app Orai en tu celular. Haz clic para acceder a su ​<a target=\"_blank\" rel=\"noopener noreferrer\" href=\"https://drive.google.com/file/d/1Ttbxe3NgA6OYh1Wgf5zMriszU1p60OO5/view?usp=sharing\">guía</a> de uso</p><p>2. Elige un cuento breve: <a target=\"_blank\" rel=\"noopener noreferrer\" href=\"https://www.sparkenthusiasm.com/teacher_treasures_el_arbol_generoso.pdf\">El árbol generoso</a> - <a target=\"_blank\" rel=\"noopener noreferrer\" href=\"https://recursosparaelprofesor.wordpress.com/wp-content/uploads/2018/04/el-pez-arcoiris-marcus-pfister.pdf\">El pez arcoíris</a> - <a target=\"_blank\" rel=\"noopener noreferrer\" href=\"https://www.mundoprimaria.com/cuentos-infantiles/la-gallinita-roja\">La gallinita roja</a></p><p>3. Graba la narración completa del cuento elegido en formato de audio únicamente. Procura leer con pronunciación clara, una entonación expresiva y variada, cuidar las pausas, énfasis y respiración controlada, y de mantener un ritmo que mantenga la atención del oyente.</p><p>4. Observa en análisis automático de cada grabación. Haz al menos dos ensayos con el mismo cuento aplicando las mejoras sugeridas por la app.</p>",
    "files": [],
    "isFlexibleEvaluation": false
  },
  "bac442d4-87a6-4702-8c33-70106e600d7a": {
    "id": "bac442d4-87a6-4702-8c33-70106e600d7a",
    "isQualified": "true",
    "availableFrom": "2026-09-10 16:15:28",
    "availableUntil": "2026-09-11 23:59:00",
    "evaluationTopScore": 20,
    "assignmentStatus": "CREATED",
    "assignmentProgress": "FINISHED",
    "evaluationSystem": "AVANCE DE PROYECTO FINAL 1",
    "currentDate": "2026-09-14 09:24:26",
    "isBeforeCurrentDateAvailableFrom": true,
    "isBeforeCurrentDateAvailableUntil": true,
    "isProgrammed": false,
    "isGroup": false,
    "title": "S05.s1 - 1er Entregable del Proyecto",
    "attempts": 2,
    "qualificationType": "LAST",
    "isAssociate": false,
    "teamSetId": null,
    "homeworkLastAttempt": {
      "id": "339e1a90-8d86-4424-a1dc-24e015e7d87d",
      "attemptNumber": 1,
      "score": 0,
      "status": "CREATED",
      "deliveredDate": "2026-09-11 21:29:08"
    },
    "homeworkStatus": "DELIVERED",
    "rubric": null,
    "assignmentIsNsp": false,
    "assignmentIsZero": false,
    "assignmentDiscountScore": null,
    "assignmentIsPlagiarized": false,
    "deliverables": "<p>Subir los siguientes entregables:</p><p>&nbsp;</p><ul><li>Informe hasta el capitulo 3</li><li>PPTx</li></ul><p>&nbsp;</p>",
    "content": "<p>Estimados Alumnos:</p><p>&nbsp;</p><p>Subir los siguientes entregables:</p><p>&nbsp;</p><ul><li>Informe hasta el capitulo 3</li><li>PPTx</li></ul><p>&nbsp;</p><p>Saludos Cordiales</p><p>Iván Robles Fernández</p><p>Docente del Curso</p>",
    "files": [],
    "isFlexibleEvaluation": true
  },
  "3423c65b-5d1c-4f81-b986-549427986f99": {
    "id": "3423c65b-5d1c-4f81-b986-549427986f99",
    "isQualified": "false",
    "availableFrom": "2026-09-07 06:00:00",
    "availableUntil": "2026-09-13 23:59:00",
    "evaluationTopScore": 1,
    "assignmentStatus": "CREATED",
    "assignmentProgress": "NOT_STARTED",
    "evaluationSystem": null,
    "currentDate": "2026-09-14 09:24:26",
    "isBeforeCurrentDateAvailableFrom": true,
    "isBeforeCurrentDateAvailableUntil": true,
    "isProgrammed": false,
    "isGroup": false,
    "title": "S05.s1-Material - Ejercicios repaso",
    "attempts": 1,
    "qualificationType": null,
    "isAssociate": false,
    "teamSetId": null,
    "homeworkLastAttempt": null,
    "homeworkStatus": "OUT_OF_DATE",
    "rubric": null,
    "assignmentIsNsp": false,
    "assignmentIsZero": false,
    "assignmentDiscountScore": null,
    "assignmentIsPlagiarized": false,
    "deliverables": "<p class=\"isSelectedEnd\"><span>Para la presente actividad, el estudiante deberá desarrollar los ejercicios propuestos utilizando el lenguaje de programación <strong>Java</strong>, aplicando las estructuras y restricciones indicadas en el enunciado de la práctica.</span></p><p class=\"isSelectedEnd\"><span>La solución deberá ser presentada mediante un <strong>documento en formato Word (.docx)</strong>.</span></p><p class=\"isSelectedEnd\">&nbsp;</p><h2><span>Contenido del documento</span></h2><p class=\"isSelectedEnd\"><span>El documento deberá contener la solución desarrollada para cada ejercicio asignado.</span></p><p class=\"isSelectedEnd\"><span>Para <strong>cada ejercicio</strong>, deberá incluir obligatoriamente:</span></p><p class=\"isSelectedEnd\">&nbsp;</p><h3><span>1. Identificación del ejercicio</span></h3><p class=\"isSelectedEnd\"><span>Indicar claramente:</span></p><ul><li data-spread=\"false\"><span>Número del ejercicio.</span></li><li data-spread=\"false\"><span>Título del ejercicio.</span></li></ul><p data-spread=\"false\">&nbsp;</p><h3><span>2. Evidencia de ejecución</span></h3><p class=\"isSelectedEnd\"><span>Incluir una <strong>imagen o captura de pantalla de la ejecución correcta del programa</strong>, donde se pueda visualizar:</span></p><ul><li data-spread=\"false\"><span>Los datos ingresados por teclado.</span></li><li data-spread=\"false\"><span>El procesamiento realizado.</span></li><li data-spread=\"false\"><span>Los resultados obtenidos.</span></li></ul><p class=\"isSelectedEnd\"><span>La captura deberá permitir comprobar que el programa funciona correctamente.</span></p><p class=\"isSelectedEnd\">&nbsp;</p><p class=\"isSelectedEnd\">&nbsp;</p><h3><span>3. Código fuente</span></h3><p class=\"isSelectedEnd\"><span>Incluir el <strong>código Java desarrollado</strong> para resolver el ejercicio.</span></p><p class=\"isSelectedEnd\"><span>El código deberá ser presentado de manera legible, conservando la indentación y estructura utilizada durante la programación.</span></p><p class=\"isSelectedEnd\">&nbsp;</p><h3><span>4. Validaciones</span></h3><p class=\"isSelectedEnd\"><span>Cuando el ejercicio requiera validación, la evidencia deberá demostrar que el programa controla correctamente los datos ingresados.</span></p><p class=\"isSelectedEnd\"><span>Por ejemplo:</span></p><ul><li data-spread=\"false\"><span>Datos numéricos.</span></li><li data-spread=\"false\"><span>Datos decimales.</span></li><li data-spread=\"false\"><span>Letras o texto.</span></li><li data-spread=\"false\"><span>Valores fuera de rango.</span></li><li data-spread=\"false\"><span>Notas menores a 0.</span></li><li data-spread=\"false\"><span>Notas mayores a 20.</span></li><li data-spread=\"false\"><span>Opciones no permitidas.</span></li></ul>",
    "content": "<p><span>Desarrolle los siguientes problemas utilizando el lenguaje de programación, aplicando técnicas de análisis, validación, procesamiento y presentación de información</span></p><p>&nbsp;</p><p><a target=\"_blank\" rel=\"noopener noreferrer\" href=\"https://utp-prd-upload-file-storage.s3.amazonaws.com/pao/content/e374ac21-28b9-4948-983d-c04b48bed725/S05_s1-Material%20-%20Ejercicios%20repaso%20-%20Instruccion%20If%20-%20While_TKPNDD.pdf\">S05.s1-Material - Ejercicios repaso - Instruccion If - While.pdf</a></p>",
    "files": [],
    "isFlexibleEvaluation": false
  },
  "0ac351d5-2f83-5cef-94d4-be6500c43332": {
    "id": "0ac351d5-2f83-5cef-94d4-be6500c43332",
    "isQualified": "false",
    "availableFrom": "2026-09-08 21:42:54",
    "availableUntil": "2026-09-14 20:00:00",
    "evaluationTopScore": 20,
    "assignmentStatus": "CREATED",
    "assignmentProgress": "NOT_STARTED",
    "evaluationSystem": null,
    "currentDate": "2026-09-14 09:24:26",
    "isBeforeCurrentDateAvailableFrom": true,
    "isBeforeCurrentDateAvailableUntil": false,
    "isProgrammed": false,
    "isGroup": false,
    "title": "Tarea: Entrega de avances de la semana",
    "attempts": 3,
    "qualificationType": "LAST",
    "isAssociate": false,
    "teamSetId": null,
    "homeworkLastAttempt": null,
    "homeworkStatus": "NOT_DELIVERED",
    "rubric": null,
    "assignmentIsNsp": false,
    "assignmentIsZero": false,
    "assignmentDiscountScore": null,
    "assignmentIsPlagiarized": false,
    "deliverables": ".",
    "content": "<p style=\"text-align: left;\"><span class=\"TextRun  BCX0 SCXW166799038\" lang=\"ES-ES\" data-contrast=\"none\"><span class=\"NormalTextRun  BCX0 SCXW166799038\"><span>¡Te damos la bienvenida!</span></span></span></p>\n<p>Entrega en esta tarea los avances semanales indicados por tus docentes.</p>\n<p style=\"text-align: left;\"><strong><span class=\"TextRun  BCX0 SCXW166799038\" lang=\"ES-ES\" data-contrast=\"none\"><span class=\"NormalTextRun  BCX0 SCXW166799038\">Recomendaciones:</span></span></strong></p>\n<ul>\n<li><span class=\"TextRun  BCX0 SCXW166799038\" lang=\"ES-ES\" data-contrast=\"none\"><span class=\"NormalTextRun  BCX0 SCXW166799038\"><span>Antes de subir el archivo, revisa que sea el documento correcto.</span></span></span></li>\n<li><span style=\"color: var(--ic-brand-font-color-dark); font-family: inherit; font-size: 1rem;\">Si tuvieras alguna duda o consulta, no dudes en participar en el foro de consultas.<span style=\"color: #ba372a;\">&nbsp;</span></span></li>\n</ul>\n<p style=\"text-align: left;\">&nbsp;</p>\n<p style=\"text-align: left;\">&nbsp;</p>\n<p style=\"text-align: center;\"><span>¡Éxitos!</span></p>\n<p style=\"text-align: center;\"><span><em>Recuerda que esta tarea forma parte de tu nota de participación en aula (PA).</em></span></p>",
    "files": [],
    "isFlexibleEvaluation": false
  }
};

export function getOfficialHomeworkResume(activityId: string): OfficialHomeworkResume | undefined {
  return OFFICIAL_HOMEWORK_RESUMES[activityId];
}
