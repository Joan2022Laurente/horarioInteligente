-- ============================================================================
-- Migración Fase 1.1 — Ampliación de cotas (Zero-Crash Policy)
-- Base de datos: horario_inteligente (Aiven MySQL)
-- Fecha: 2026-10-23
--
-- Motivo: la pasarela oficial puede emitir códigos compuestos más largos que las
-- cotas originales. Incidente observado en caliente (U23307609):
--   ERROR SqlExceptionHelper : Data truncation: Data too long for column
--   'course_code' at row 1  [insert into schedule_sessions ...]
-- Con la inserción fallando, el horario nunca se persistía y cada login
-- repetía el fetch remoto a la pasarela.
--
-- IMPORTANTE: Hibernate con ddl-auto: update NO amplía columnas ya creadas en
-- MySQL. Estas ALTER TABLE deben ejecutarse UNA sola vez contra Aiven (son
-- idempotentes: repetirlas es inocuo), p. ej.:
--   mysql -h <host-aiven> -u <usuario> -p horario_inteligente \
--       < migration_fase_1_1_ampliacion_cotas.sql
-- ============================================================================

-- 1. Calendario relacional de clases (causa raíz del incidente)
ALTER TABLE schedule_sessions MODIFY COLUMN course_code      VARCHAR(128);
ALTER TABLE schedule_sessions MODIFY COLUMN section          VARCHAR(64);
ALTER TABLE schedule_sessions MODIFY COLUMN section_id       VARCHAR(128);
ALTER TABLE schedule_sessions MODIFY COLUMN classroom        VARCHAR(128);
ALTER TABLE schedule_sessions MODIFY COLUMN building         VARCHAR(128);
ALTER TABLE schedule_sessions MODIFY COLUMN environment_type VARCHAR(128);

-- 2. Catálogo de cursos matriculados
ALTER TABLE schedule_courses MODIFY COLUMN course_code VARCHAR(128);
ALTER TABLE schedule_courses MODIFY COLUMN section     VARCHAR(64);

-- 3. Evaluaciones del sílabo (cota defensiva ante códigos compuestos futuros)
ALTER TABLE syllabus_evaluations MODIFY COLUMN evaluation_code VARCHAR(128);

-- Nullabilidad preservada: todas las columnas tocadas son nullable en el DDL
-- canónico (schema_mysql_workbench.sql) y en las entidades JPA.

-- Verificación posterior sugerida:
--   SHOW COLUMNS FROM schedule_sessions WHERE Field IN
--     ('course_code','section','section_id','classroom','building','environment_type');
--   SHOW COLUMNS FROM schedule_courses WHERE Field IN ('course_code','section');
--   SHOW COLUMNS FROM syllabus_evaluations WHERE Field = 'evaluation_code';
