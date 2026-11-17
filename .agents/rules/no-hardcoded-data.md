# Rule: Prohibición Estricta de Datos Hardcodeados (Zero Hardcoded Data)

## 1. Directiva Fundamental (Regla de Oro)
Queda **ESTRICTAMENTE PROHIBIDO** hardcodear datos de alumnos, sedes, campus, carreras, cursos, secciones, docentes, fórmulas de evaluación, sílabos, rúbricas, fechas, notas o hitos académicos.

Este sistema atiende a miles de estudiantes de **diferentes sedes** (Lima Centro, Lima Norte, Lima Sur, San Juan de Lurigancho, Arequipa, Chiclayo, Trujillo, Piura, Huancayo, Ica, Chimbote, etc.), diferentes facultades, carreras y ciclos académicos.

## 2. Obligación de Dinamismo Absoluto (100% Dynamic Pipeline)
1. **Sedes y Campus**:
   - NUNCA asumir una sede fija como `"Campus Lima Centro - Sede Arequipa"`, `"Lima Centro"`, `"Sede Central"`, o `"Campus Digital"`.
   - La sede, pabellón, aula y piso deben extraerse **en tiempo real** desde la respuesta oficial de la API/GraphQL del Portal UTP (`location.building.desc`, `location.classRoom.id`, `location.classRoom.floor`, `metadata.building`, etc.).
   - Si un dato no viene en la respuesta, debe manejarse como campo opcional (`""` o `null`) o con un identificador genérico neutro (`"Campus UTP"`, `"Pabellón UTP"`, `"Aula General"`), NUNCA inventar una sede o campus específico.

2. **Cursos, Secciones y Docentes**:
   - Extraerse directamente de los eventos del horario (`scheduleByDate` o PAO Calendar API).
   - El código de sección debe resolverse dinámicamente desde el ID de clase (`cls.path("id")`, `linkCourseClass`, `metadata.sectionId`, `metadata.sectionCode`).

3. **Sílabos, Rúbricas y Fórmulas de Evaluación**:
   - Extraerse en vivo mediante la llamada PAO Syllabus con el `sectionId` numérico del estudiante, descargando el PDF oficial desde AWS S3 y parseándolo mediante Apache PDFBox (Backend Spring Boot) o el parser dinámico de sílabos (Frontend Angular).
   - NUNCA registrar hitos, rúbricas, porcentajes de peso (ej. "APF1 20%", "PC1 15%") o semanas estáticas fijas en código.
   - Los hitos académicos (`AcademicMilestone`) deben computarse dinámicamente sumando y agrupando las evaluaciones reales extraídas de los sílabos activos del alumno en sesión.

4. **Perfil del Alumno**:
   - Nombre, código, correo, carrera, campus y ciclo deben extraerse de los claims del JWT (`preferred_username`, `name`, `email`, `sub`, `userId`, `campus`, `career`, `cycle`) emitidos por el servidor SSO (`sso.utp.edu.pe`).

## 3. Protocolo de Auditoría y Corrección Inmediata
- Si durante cualquier tarea, inspección de código o refactorización se detecta una cadena hardcodeada (nombres de cursos fijos, sedes fijas, fechas fijas, fórmulas inventadas), **se debe reportar inmediatamente en el output y corregir para que sea 100% dinámica**.
- No se admiten mocks estáticos como reemplazo de integraciones reales activas.
