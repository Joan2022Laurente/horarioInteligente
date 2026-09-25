-- ==============================================================================
-- SCHEMA SUPABASE: RED SOCIAL Y COMUNIDAD ESTUDIANTIL UTP
-- Optimizado para alto rendimiento y baja saturación de base de datos
-- ==============================================================================

-- 1. Crear tabla principal de publicaciones
CREATE TABLE IF NOT EXISTS public.community_posts (
  id TEXT PRIMARY KEY DEFAULT ('post-' || round(extract(epoch from now()) * 1000)::text),
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  student_code TEXT NOT NULL,
  career TEXT DEFAULT 'Ingeniería de Sistemas e Informática',
  campus TEXT DEFAULT 'Lima Centro',
  cycle INT DEFAULT 6,
  
  course_name TEXT,              -- Opcional (NULL para posts generales o de vida campus)
  section_code TEXT,             -- Opcional
  category TEXT NOT NULL,        -- 'CAMPUS_LIFE', 'ACADEMIC_QUESTION', 'POLL', 'PROJECT_RECRUITMENT', 'STUDY_TIPS', 'GENERAL'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  image_url TEXT,                -- URL de imagen/captura adjunta
  media_urls JSONB DEFAULT '[]'::jsonb,
  
  poll JSONB DEFAULT NULL,       -- Encuesta embebida { question, total_votes, options: [{id, text, votes_count}] }
  tags JSONB DEFAULT '[]'::jsonb,
  
  upvotes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  comments JSONB DEFAULT '[]'::jsonb, -- Array de comentarios embebidos para lectura en 1 solo roundtrip (evita N+1 joins)
  solution_comment_id TEXT DEFAULT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Índices de alta velocidad para filtros comunes y paginación
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON public.community_posts (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_course ON public.community_posts (course_name) WHERE course_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON public.community_posts (author_id);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acceso: Lectura pública/anónima autenticada y creación
CREATE POLICY "Lectura pública de publicaciones" 
ON public.community_posts 
FOR SELECT 
USING (true);

CREATE POLICY "Inserción de publicaciones para usuarios" 
ON public.community_posts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Actualización de publicaciones" 
ON public.community_posts 
FOR UPDATE 
USING (true);

-- 5. Semilla inicial de publicaciones (Feed demo)
INSERT INTO public.community_posts (
  id, author_id, author_name, student_code, career, campus, cycle,
  course_name, category, title, content, image_url, tags, upvotes_count, comments_count, solution_comment_id, comments
) VALUES 
(
  'post-101',
  'usr-1',
  'Valeria Mendoza',
  'U21304921',
  'Ingeniería de Sistemas e Informática',
  'Lima Centro',
  6,
  'Desarrollo Web Integrado',
  'ACADEMIC_QUESTION',
  'Configuración de JWT en Spring Boot 3 y Angular sin romper endpoints públicos para APF1',
  'Al implementar SecurityFilterChain en Spring Boot 3.3 con JWT, los endpoints de `/api/v1/public/**` siguen exigiendo token Bearer o responden 403 Forbidden. Comparto la captura de la arquitectura de filtros para revisión:',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
  '["SpringBoot", "JWT", "Security", "Angular", "APF1"]'::jsonb,
  32,
  2,
  'comm-101-1',
  '[
    {
      "id": "comm-101-1",
      "post_id": "post-101",
      "author": { "id": "usr-prof", "student_code": "U20109988", "full_name": "Carlos Benites (Tutor Par)", "career": "Ingeniería de Sistemas e Informática" },
      "content": "En Spring Boot 3 debes usar `.requestMatchers(\"/api/v1/public/**\").permitAll()` y asegurarte de anteponer el filtro JWT antes de `UsernamePasswordAuthenticationFilter.class` con `addFilterBefore(...)`.",
      "upvotes_count": 18,
      "has_user_upvoted": true,
      "is_verified_solution": true,
      "created_at": "Hoy, 14:45"
    }
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (
  id, author_id, author_name, student_code, career, campus, cycle,
  category, title, content, poll, tags, upvotes_count, comments_count
) VALUES 
(
  'post-102',
  'usr-2',
  'Mateo Quispe Flores',
  'U20219842',
  'Ingeniería de Sistemas e Informática',
  'Lima Centro',
  6,
  'POLL',
  'Encuesta: ¿Qué proveedor Cloud prefieren para proyectos finales de ciclo?',
  'Estamos debatiendo en clase qué proveedor ofrece mejor soporte para despliegues con créditos de estudiante (AWS Academy vs Azure for Students vs Google Cloud):',
  '{
    "id": "poll-102",
    "question": "Proveedor Cloud preferido para proyectos",
    "total_votes": 68,
    "user_voted_option_id": "opt-1",
    "options": [
      { "id": "opt-1", "text": "AWS (Amazon Web Services)", "votes_count": 42 },
      { "id": "opt-2", "text": "Azure (Microsoft)", "votes_count": 16 },
      { "id": "opt-3", "text": "GCP (Google Cloud)", "votes_count": 10 }
    ]
  }'::jsonb,
  '["Cloud", "AWS", "Azure", "Debate", "Encuesta"]'::jsonb,
  27,
  1
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (
  id, author_id, author_name, student_code, career, campus, cycle,
  category, title, content, image_url, tags, upvotes_count, comments_count
) VALUES 
(
  'post-103',
  'usr-3',
  'Luciana Diaz',
  'U22334455',
  'Ingeniería de Sistemas e Informática',
  'Lima Centro',
  6,
  'CAMPUS_LIFE',
  'Nuevos espacios de estudio con tomas de corriente en Torre A (Piso 8 y 10)',
  'Habilitaron nuevas mesas con tomas de corriente y conectividad rápida frente a los laboratorios de cómputo en Torre A. Excelente para quienes tenemos horas libres entre clases presenciales.',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
  '["Campus", "TorreA", "EspaciosEstudio", "LimaCentro"]'::jsonb,
  41,
  1
) ON CONFLICT (id) DO NOTHING;
