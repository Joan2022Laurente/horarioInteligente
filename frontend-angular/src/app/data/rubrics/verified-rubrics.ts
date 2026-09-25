import { AssignmentRubric } from '@/types/utp';

/**
 * Rúbricas Oficiales verificadas basadas en el flujo Canvas/PAO UTP.
 */
export const VERIFIED_ASSIGNMENT_RUBRICS: Record<string, AssignmentRubric> = {
  // 1. Rúbrica APF1 - Desarrollo Web Integrado (Semana 5)
  'rubric-dwi-apf1': {
    id: 'rubric-dwi-apf1',
    title: 'Rúbrica Oficial APF1: 1er Entregable del Proyecto Web Integrado',
    totalPoints: 20,
    criteria: [
      {
        id: 'crit-dwi-1',
        title: 'Arquitectura de Componentes y Modularidad (Spring Boot / Angular)',
        description: 'Estructuración limpia de endpoints, separación de responsabilidades en capas y tipado estricto.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Estructura modular en capas (Controller, Service, Repository), SRP estricto y DTOs bien definidos.' },
          { name: 'Notable', points: 4, description: 'Estructura adecuada con ligera mezcla de lógica en controladores.' },
          { name: 'En Proceso', points: 2.5, description: 'Controladores monolíticos con acoplamiento severo.' },
          { name: 'Insuficiente', points: 0, description: 'No modulariza o el código no compila.' }
        ]
      },
      {
        id: 'crit-dwi-2',
        title: 'Desarrollo Guiado por Pruebas (TDD)',
        description: 'Implementación de pruebas unitarias previas a la lógica de negocio usando JUnit y Mockito.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Cobertura de pruebas exhaustiva con casos exitosos y de error (bad request, not found).' },
          { name: 'Notable', points: 4, description: 'Pruebas funcionales básicas para endpoints principales.' },
          { name: 'En Proceso', points: 2.5, description: 'Pruebas testimoniales incompletas.' },
          { name: 'Insuficiente', points: 0, description: 'Sin pruebas unitarias.' }
        ]
      },
      {
        id: 'crit-dwi-3',
        title: 'Diseño de Endpoints y Métodos HTTP (RESTful)',
        description: 'Uso semántico de GET, POST, PUT, DELETE con códigos de estado HTTP apropiados y payloads JSON.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Restricciones REST cumplidas, URIs pluralizadas y manejo global de excepciones (@ControllerAdvice).' },
          { name: 'Notable', points: 4, description: 'Endpoints REST funcionales con códigos de estado estándar.' },
          { name: 'En Proceso', points: 2.5, description: 'Uso incorrecto de verbos HTTP (ej. POST para consultas).' },
          { name: 'Insuficiente', points: 0, description: 'Endpoints rotos.' }
        ]
      },
      {
        id: 'crit-dwi-4',
        title: 'Entregables: Informe Técnico (Cap. 1-3) y Sustentación PPTx',
        description: 'Documentación técnica del proyecto hasta el capítulo 3 y diapositivas de presentación ejecutiva.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Informe completo bajo normas APA/IEEE, diagramas arquitectónicos y PPTx claro para sustentación.' },
          { name: 'Notable', points: 4, description: 'Informe con capítulos 1 a 3 completos pero diagramas esquemáticos.' },
          { name: 'En Proceso', points: 2.5, description: 'Informe incompleto o sin presentación de apoyo.' },
          { name: 'Insuficiente', points: 0, description: 'No entrega informe.' }
        ]
      }
    ]
  },

  // 2. Rúbrica ATI1 - Formación para la Investigación (Semana 4)
  'rubric-inv-ati1': {
    id: 'rubric-inv-ati1',
    title: 'Rúbrica Oficial ATI1: Ficha de Investigación e Introducción RSL',
    totalPoints: 20,
    criteria: [
      {
        id: 'crit-inv-1',
        title: 'Definición del Tema y Pertinencia con Líneas UTP',
        description: 'Tema alineado a las líneas de investigación de la carrera y justificación de relevancia científica.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Tema delimitado con precisión, alta relevancia en ingeniería y alineación explícita con líneas UTP.' },
          { name: 'Notable', points: 4, description: 'Tema pertinente pero con justificación teórica general.' },
          { name: 'En Proceso', points: 2.5, description: 'Tema ambiguo o poco alineado al campo de sistemas/software.' },
          { name: 'Insuficiente', points: 0, description: 'No define el tema de investigación.' }
        ]
      },
      {
        id: 'crit-inv-2',
        title: 'Ecuación de Búsqueda Preliminar (Scopus / Web of Science)',
        description: 'Formulación inicial de términos clave y operadores booleanos en bases de datos indexadas.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Ecuación estructurada en Scopus con operadores AND/OR y vocabulario controlado (Thesaurus).' },
          { name: 'Notable', points: 4, description: 'Ecuación funcional pero con sinónimos limitados.' },
          { name: 'En Proceso', points: 2.5, description: 'Búsqueda no especializada en Google común.' },
          { name: 'Insuficiente', points: 0, description: 'Sin ecuación de búsqueda.' }
        ]
      },
      {
        id: 'crit-inv-3',
        title: 'Redacción de la Introducción bajo Formato de Revista',
        description: 'Estructura formal de introducción científica con estado del arte preliminar y citas en Mendeley.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Redacción académica impecable, antecedentes de los últimos 5 años y citación según la revista.' },
          { name: 'Notable', points: 4, description: 'Introducción coherente con leves fallas de estilo en citación.' },
          { name: 'En Proceso', points: 2.5, description: 'Falta de hilo conductor o fuentes desactualizadas.' },
          { name: 'Insuficiente', points: 0, description: 'Texto desarticulado sin citas.' }
        ]
      },
      {
        id: 'crit-inv-4',
        title: 'Integridad Académica y Originalidad (Anti-IA / Antiplagio)',
        description: 'Cumplimiento estricto del umbral de similitud (<20%) y redacción ética sin IA generativa.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Similitud Turnitin menor al 10%, citas parafraseadas correctamente y cero uso de IA.' },
          { name: 'Notable', points: 4, description: 'Similitud entre 11% y 20% con paráfrasis aceptable.' },
          { name: 'En Proceso', points: 1, description: 'Similitud entre 21% y 30% que requiere subsanación urgente.' },
          { name: 'Insuficiente', points: 0, description: 'Plagio evidente (>30%) o texto generado por IA sin autoría.' }
        ]
      }
    ]
  },

  // 3. Rúbrica Narrador Oral - Comunicación Efectiva (Semana 5)
  'rubric-com-s05': {
    id: 'rubric-com-s05',
    title: 'Rúbrica Oficial: Actividad del Narrador Oral y Storytelling',
    totalPoints: 20,
    criteria: [
      {
        id: 'crit-com-1',
        title: 'Expresión Oral y Modulación Vocal',
        description: 'Claridad, ritmo, entonación, manejo de pausas y volumen adecuado.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Excelente modulación, inflexión de voz acorde a la emoción y dicción perfecta.' },
          { name: 'Notable', points: 4, description: 'Buena entonación con pocas muletillas.' },
          { name: 'En Proceso', points: 2.5, description: 'Tono monótono o velocidad apresurada.' },
          { name: 'Insuficiente', points: 0, description: 'Inaudible o lectura robótica.' }
        ]
      },
      {
        id: 'crit-com-2',
        title: 'Lenguaje Corporal y Contacto Visual',
        description: 'Postura abierta, gestos de soporte y mirada directa a la cámara/audiencia.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Seguridad escénica total, gesticulación expresiva y contacto visual continuo.' },
          { name: 'Notable', points: 4, description: 'Postura adecuada con leves miradas fuera de encuadre.' },
          { name: 'En Proceso', points: 2.5, description: 'Brazos cruzados, rigidez corporal o mirada hacia abajo.' },
          { name: 'Insuficiente', points: 0, description: 'No enciende cámara o muestra total desinterés.' }
        ]
      },
      {
        id: 'crit-com-3',
        title: 'Estructura Narrativa (Storytelling)',
        description: 'Inicio impactante, conflicto claro, clímax emocional y moraleja/cierre profesional.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Historia cautivadora, gancho inicial potente y moraleja alineada al ámbito profesional.' },
          { name: 'Notable', points: 4, description: 'Estructura clara de inicio, nudo y desenlace.' },
          { name: 'En Proceso', points: 2.5, description: 'Relato plano sin clímax ni lección concluyente.' },
          { name: 'Insuficiente', points: 0, description: 'Historia inconexa sin coherencia.' }
        ]
      },
      {
        id: 'crit-com-4',
        title: 'Tiempo de Duración y Pautas de Entrega',
        description: 'Video dentro del rango de 2 a 3 minutos con audio nítido y buena iluminación.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Tiempo exacto (2:00 - 3:00 min), iluminación frontal y audio sin eco.' },
          { name: 'Notable', points: 4, description: 'Tiempo ligeramente fuera de rango (±30s) pero calidad técnica buena.' },
          { name: 'En Proceso', points: 2.5, description: 'Menos de 1:30 o más de 4 minutos con ruido de fondo.' },
          { name: 'Insuficiente', points: 0, description: 'Video ilegible o enlace privado inaccesible.' }
        ]
      }
    ]
  },

  // 4. Rúbrica Lenguajes de Programación - Ejercicios Repaso (Semana 5 / PC1)
  'rubric-lp-pc1': {
    id: 'rubric-lp-pc1',
    title: 'Rúbrica Oficial PC1: Programación Funcional e Inmutabilidad',
    totalPoints: 20,
    criteria: [
      {
        id: 'crit-lp-1',
        title: 'Aplicación de Principios Funcionales Puros',
        description: 'Uso de funciones puras, inmutabilidad y ausencia de efectos secundarios (side effects).',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Cero mutaciones de estado, funciones puras y tipado inmutable.' },
          { name: 'Notable', points: 4, description: 'Funcional en su mayoría con mínimas variables mutables.' },
          { name: 'En Proceso', points: 2.5, description: 'Mezcla imperativa excesiva con bucles for y variables mutables.' },
          { name: 'Insuficiente', points: 0, description: 'No aplica paradigma funcional.' }
        ]
      },
      {
        id: 'crit-lp-2',
        title: 'Funciones de Orden Superior (Map, Filter, Reduce, Currying)',
        description: 'Transformación elegante de colecciones y composición de funciones.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Pipelines composables declarativos con manejo limpio de colecciones.' },
          { name: 'Notable', points: 4, description: 'Uso correcto de map/filter con código legible.' },
          { name: 'En Proceso', points: 2.5, description: 'Uso ineficiente de funciones de orden superior.' },
          { name: 'Insuficiente', points: 0, description: 'No implementa las transformaciones solicitadas.' }
        ]
      },
      {
        id: 'crit-lp-3',
        title: 'Eficiencia y Manejo Seguro de Nulos / Errores',
        description: 'Uso de tipos Option/Maybe o Result para evitar NullPointerExceptions.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: 'Manejo defensivo sin excepciones no controladas ni valores undefined.' },
          { name: 'Notable', points: 4, description: 'Control de errores adecuado con validaciones estándar.' },
          { name: 'En Proceso', points: 2.5, description: 'Código vulnerable a excepciones con entradas vacías.' },
          { name: 'Insuficiente', points: 0, description: 'El programa crashea.' }
        ]
      },
      {
        id: 'crit-lp-4',
        title: 'Batería de Pruebas Unitarias',
        description: 'Casos de prueba automatizados cubriendo casos borde y valores límite.',
        maxPoints: 5,
        levels: [
          { name: 'Sobresaliente', points: 5, description: '100% de tests pasando, cubriendo casos normales y límites.' },
          { name: 'Notable', points: 4, description: 'Tests funcionales para casos principales.' },
          { name: 'En Proceso', points: 2.5, description: 'Solo un test básico incompleto.' },
          { name: 'Insuficiente', points: 0, description: 'Sin pruebas unitarias.' }
        ]
      }
    ]
  }
};
