-- ==============================================================================
-- SCHEMA SUPABASE: PERSISTENCIA DE HORARIOS Y PERFILES DE NETWORKING ESTUDIANTIL
-- Proyecto: Horario Inteligente Fullstack UTP
-- ==============================================================================

-- 1. TABLA: student_schedules (Cache y Daily Gate persistente en Supabase)
CREATE TABLE IF NOT EXISTS public.student_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_code VARCHAR(32) NOT NULL,
    period_name VARCHAR(64) NOT NULL DEFAULT '2026 - Ciclo 2 Agosto',
    week_number INT DEFAULT 1,
    total_weeks INT DEFAULT 18,
    schedule_data JSONB NOT NULL,
    last_synced_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_student_schedule_period UNIQUE (student_code, period_name)
);

CREATE INDEX IF NOT EXISTS idx_student_schedules_code ON public.student_schedules (student_code);
CREATE INDEX IF NOT EXISTS idx_student_schedules_sync ON public.student_schedules (student_code, last_synced_date);

ALTER TABLE public.student_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_schedules_all" ON public.student_schedules;
CREATE POLICY "student_schedules_all" ON public.student_schedules FOR ALL USING (true) WITH CHECK (true);

-- 2. TABLA: student_networking_profiles (Perfiles sociales y ventanas libres para matching)
CREATE TABLE IF NOT EXISTS public.student_networking_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_code VARCHAR(32) UNIQUE NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    career VARCHAR(128),
    campus VARCHAR(64),
    cycle INT DEFAULT 1,
    program VARCHAR(64),
    enrolled_courses JSONB DEFAULT '[]'::jsonb,
    free_windows JSONB DEFAULT '[]'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    match_intent VARCHAR(64) DEFAULT 'STUDY_BUDDY',
    contact_channels JSONB DEFAULT '{}'::jsonb,
    ghost_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_networking_campus ON public.student_networking_profiles (campus);
CREATE INDEX IF NOT EXISTS idx_networking_ghost ON public.student_networking_profiles (ghost_mode);
CREATE INDEX IF NOT EXISTS idx_networking_code ON public.student_networking_profiles (student_code);

ALTER TABLE public.student_networking_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "networking_profiles_all" ON public.student_networking_profiles;
CREATE POLICY "networking_profiles_all" ON public.student_networking_profiles FOR ALL USING (true) WITH CHECK (true);
