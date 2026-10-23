-- ============================================================================
-- Migración Fase 1.2 — Marca de vigencia para el Read Model de actividades
-- Base de datos: horario_inteligente (Aiven MySQL)
-- Fecha: 2026-10-23
--
-- Motivo: la vista HOY debe responder desde MySQL en milisegundos aunque el
-- localStorage del navegador esté vacío. Para ello el Read Model de tareas
-- (tabla tasks) necesita una marca de frescura por fila: last_synced_date.
-- El backend la estampa en cada persistencia (TaskSyncMapper) y el filtro
-- findByStudentIdSyncedSince sirve solo filas del día.
--
-- Sobre filas legacy: quedarán con marca NULL ⇒ vencidas ⇒ la primera
-- petición de activities refresca desde la pasarela y persiste con marca
-- (a partir de ahí todas las lecturas del día son instantáneas).
--
-- IMPORTANTE: Hibernate ddl-auto: update SÍ añade columnas nuevas, pero las
-- sentencias explícitas garantizan despliegue idempotente y controlado en Aiven:
--   mysql -h <host-aiven> -u <usuario> -p horario_inteligente \
--       < migration_fase_1_2_tasks_vigencia.sql
-- ============================================================================

-- 1. Marca de vigencia por fila de actividad
ALTER TABLE tasks ADD COLUMN last_synced_date DATE NULL;

-- 2. Índice de la consulta de vigencia (find estudiante + marca de día)
CREATE INDEX idx_tasks_student_sync ON tasks (student_id, last_synced_date);

-- Verificación posterior sugerida:
--   SHOW COLUMNS FROM tasks WHERE Field = 'last_synced_date';
--   SHOW INDEX FROM tasks WHERE Key_name = 'idx_tasks_student_sync';
