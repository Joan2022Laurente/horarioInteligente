-- ==============================================================================
-- SCHEMA SUPABASE: TABLA DE MARKETPLACE Y SERVICIOS ESTUDIANTILES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.marketplace_items (
    id VARCHAR(64) PRIMARY KEY,
    item_type VARCHAR(32) DEFAULT 'PRODUCT',       -- 'PRODUCT' | 'SERVICE'
    category VARCHAR(64) NOT NULL,                 -- 'FOOD', 'ACADEMIC_ADVICE', 'TECH_HARDWARE', 'CLOTHING_THRIFT', etc.
    service_type VARCHAR(64),                      -- 'Ropa & Hoodies', 'Asesoría Universitaria', etc.
    item_condition VARCHAR(64),                    -- 'NUEVO', 'SEMINUEVO 9/10', etc.
    price VARCHAR(32),                             -- 'S/ 45.00'
    numeric_price NUMERIC(10, 2) DEFAULT 0.00,
    original_price NUMERIC(10, 2),
    unit VARCHAR(32) DEFAULT '/ unidad',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    badge VARCHAR(64),
    location VARCHAR(128) DEFAULT 'Campus UTP',
    rating NUMERIC(3, 2) DEFAULT 5.00,
    reviews_count INT DEFAULT 0,
    sales_count INT DEFAULT 0,
    tutor_name VARCHAR(128) DEFAULT 'Estudiante UTP',
    tutor_career VARCHAR(128),
    tutor_cycle INT DEFAULT 1,
    reputation INT DEFAULT 100,
    contact_method VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON public.marketplace_items (category);
CREATE INDEX IF NOT EXISTS idx_marketplace_created_at ON public.marketplace_items (created_at DESC);

-- Habilitar RLS
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de marketplace" ON public.marketplace_items FOR SELECT USING (true);
CREATE POLICY "Inserción pública de marketplace" ON public.marketplace_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Actualización de marketplace" ON public.marketplace_items FOR UPDATE USING (true);
