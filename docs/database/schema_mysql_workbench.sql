-- ============================================================================
-- SCRIPT DE BASE DE DATOS PARA EVALUACIÓN DOCENTE (MYSQL WORKBENCH)
-- PROYECTO: HORARIO INTELIGENTE UTP (FULLSTACK SPRING BOOT + ANGULAR)
-- ARQUITECTURA: DOMAIN-DRIVEN DESIGN (DDD) / CQRS
-- FASE DE NORMALIZACIÓN RELACIONAL JPA: los agregados de Horario y Sílabo se
-- descomponen en tablas atómicas con integridad referencial por FKs
-- (schedule_courses, schedule_sessions, syllabus_evaluations,
-- syllabus_weekly_sessions). Los blobs JSON se conservan solo como fallback
-- de transición (schedule_data / raw_json_data, ambas nullable).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS horariodb 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE horariodb;

-- Limpieza de tablas previas (en orden de dependencias)
DROP TABLE IF EXISTS student_tasks;
DROP TABLE IF EXISTS syllabuses;
DROP TABLE IF EXISTS schedule_sessions;
DROP TABLE IF EXISTS schedule_courses;
DROP TABLE IF EXISTS student_schedules;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS marketplace_items;
DROP TABLE IF EXISTS student_networking_profiles;
DROP TABLE IF EXISTS study_beacons;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS syllabus_evaluations;
DROP TABLE IF EXISTS syllabus_weekly_sessions;
DROP TABLE IF EXISTS official_syllabi;

-- ----------------------------------------------------------------------------
-- 1. TABLA: students (Agregado de Estudiante)
-- ----------------------------------------------------------------------------
CREATE TABLE students (
    id VARCHAR(100) PRIMARY KEY,
    student_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    career VARCHAR(200),
    campus VARCHAR(100),
    current_cycle INT DEFAULT 1,
    INDEX idx_student_code (student_code)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. TABLA: student_schedules (Horario del Estudiante por Periodo)
--    Raíz del agregado de horario. schedule_data queda como fallback legacy.
-- ----------------------------------------------------------------------------
CREATE TABLE student_schedules (
    id VARCHAR(64) PRIMARY KEY,
    student_code VARCHAR(50) NOT NULL,
    period_name VARCHAR(64) NOT NULL,
    week_number INT,
    total_weeks INT,
    start_date DATE,
    end_date DATE,
    schedule_data LONGTEXT,
    last_synced_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_schedule_period UNIQUE (student_code, period_name),
    CONSTRAINT fk_schedules_student FOREIGN KEY (student_code) REFERENCES students(student_code) ON DELETE CASCADE,
    INDEX idx_schedule_student (student_code)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2.1. TABLA: schedule_courses (Catálogo relacional de cursos matriculados)
-- ----------------------------------------------------------------------------
CREATE TABLE schedule_courses (
    id VARCHAR(36) PRIMARY KEY,
    schedule_id VARCHAR(64) NOT NULL,
    course_code VARCHAR(32),
    course_name VARCHAR(255) NOT NULL,
    section VARCHAR(32),
    credits INT,
    teacher VARCHAR(255),
    modality VARCHAR(32),
    weekly_hours INT,
    CONSTRAINT fk_sched_course_schedule FOREIGN KEY (schedule_id)
        REFERENCES student_schedules(id) ON DELETE CASCADE,
    INDEX idx_sched_course_schedule (schedule_id),
    INDEX idx_sched_course_code (course_code)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2.2. TABLA: schedule_sessions (Calendario relacional de clases)
--      FK redundante schedule_id para consultas de calendario rápido
--      (ocupación de aulas, cruce docente-alumno, horas presenciales vs. virtual).
--      course_id es nullable: la pasarela puede emitir clases sin curso emparejable
--      (eventos de calendario con título libre); los campos course_code/course_name/
--      section denormalizados conservan el dato exacto para el Value Object.
-- ----------------------------------------------------------------------------
CREATE TABLE schedule_sessions (
    id VARCHAR(36) PRIMARY KEY,
    schedule_id VARCHAR(64) NOT NULL,
    course_id VARCHAR(36),
    course_code VARCHAR(32),
    course_name VARCHAR(255),
    section VARCHAR(32),
    classroom VARCHAR(64),
    building VARCHAR(64),
    floor VARCHAR(32),
    teacher VARCHAR(255),
    modality VARCHAR(16),
    start_at DATETIME,
    finish_at DATETIME,
    zoom_link TEXT,
    environment_type VARCHAR(64),
    class_link TEXT,
    section_id VARCHAR(64),
    CONSTRAINT fk_sched_session_schedule FOREIGN KEY (schedule_id)
        REFERENCES student_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_sched_session_course FOREIGN KEY (course_id)
        REFERENCES schedule_courses(id) ON DELETE CASCADE,
    INDEX idx_sched_session_schedule (schedule_id),
    INDEX idx_sched_session_course (course_id),
    INDEX idx_sched_session_start (start_at)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. TABLA: tasks (Tareas sincronizadas del estudiante)
-- ----------------------------------------------------------------------------
CREATE TABLE tasks (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    course_name VARCHAR(255),
    section_id VARCHAR(100),
    homework_id VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'TAREA',
    week INT,
    homework_status VARCHAR(50),
    assignment_progress VARCHAR(50),
    due_date DATETIME,
    delivered_date DATETIME,
    max_score DOUBLE,
    score DOUBLE,
    is_delivered BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_tasks_student FOREIGN KEY (student_id) REFERENCES students(student_code) ON DELETE CASCADE,
    INDEX idx_tasks_student (student_id),
    INDEX idx_tasks_status (homework_status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. TABLA: official_syllabi (Sílabos oficiales de asignaturas)
--    Raíz del agregado de sílabo. raw_json_data queda como fallback legacy.
-- ----------------------------------------------------------------------------
CREATE TABLE official_syllabi (
    course_id VARCHAR(100) PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL UNIQUE,
    course_name VARCHAR(255) NOT NULL,
    semester VARCHAR(50),
    credits INT DEFAULT 3,
    modality VARCHAR(50) DEFAULT 'Presencial',
    weekly_hours INT,
    formula TEXT,
    learning_goal TEXT,
    max_similarity_percent INT,
    ai_policy TEXT,
    careers_text TEXT,
    rules_text TEXT,
    raw_json_data LONGTEXT,
    INDEX idx_syllabi_course_code (course_code)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4.1. TABLA: syllabus_evaluations (Evaluaciones del sílabo, normalizadas)
-- ----------------------------------------------------------------------------
CREATE TABLE syllabus_evaluations (
    id VARCHAR(36) PRIMARY KEY,
    syllabus_id VARCHAR(100) NOT NULL,
    evaluation_name VARCHAR(128),
    evaluation_code VARCHAR(32),
    weight_percent DOUBLE,
    week_number INT,
    is_individual BOOLEAN,
    observation TEXT,
    rules_text TEXT,
    CONSTRAINT fk_syllabus_eval_syllabus FOREIGN KEY (syllabus_id)
        REFERENCES official_syllabi(course_id) ON DELETE CASCADE,
    INDEX idx_syllabus_eval_syllabus (syllabus_id),
    INDEX idx_syllabus_eval_week (week_number)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4.2. TABLA: syllabus_weekly_sessions (Cronograma semanal del sílabo, normalizado)
-- ----------------------------------------------------------------------------
CREATE TABLE syllabus_weekly_sessions (
    id VARCHAR(36) PRIMARY KEY,
    syllabus_id VARCHAR(100) NOT NULL,
    week_number INT,
    session_number INT,
    unit VARCHAR(255),
    topics TEXT,
    learning_activities TEXT,
    evaluation_description VARCHAR(255),
    CONSTRAINT fk_syllabus_week_syllabus FOREIGN KEY (syllabus_id)
        REFERENCES official_syllabi(course_id) ON DELETE CASCADE,
    INDEX idx_syllabus_week_syllabus (syllabus_id),
    INDEX idx_syllabus_week_number (week_number)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. TABLA: marketplace_items (Marketplace académico estudiantil)
-- ----------------------------------------------------------------------------
CREATE TABLE marketplace_items (
    id VARCHAR(64) PRIMARY KEY,
    seller_student_code VARCHAR(50),
    item_type VARCHAR(32),
    category VARCHAR(64) NOT NULL,
    service_type VARCHAR(64),
    item_condition VARCHAR(64),
    price VARCHAR(32),
    numeric_price DOUBLE,
    original_price DOUBLE,
    unit VARCHAR(32),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    badge VARCHAR(64),
    location VARCHAR(128),
    rating DOUBLE DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    sales_count INT DEFAULT 0,
    tutor_name VARCHAR(128),
    tutor_career VARCHAR(128),
    tutor_cycle INT,
    reputation INT DEFAULT 100,
    contact_method VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_marketplace_student FOREIGN KEY (seller_student_code) REFERENCES students(student_code) ON DELETE SET NULL,
    INDEX idx_marketplace_category (category),
    INDEX idx_marketplace_type (item_type),
    INDEX idx_marketplace_seller (seller_student_code)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. TABLA: study_beacons (Mesas de Estudio activas en campus - Networking)
-- ----------------------------------------------------------------------------
CREATE TABLE study_beacons (
    id VARCHAR(64) PRIMARY KEY,
    host_id VARCHAR(32) NOT NULL,
    host_name VARCHAR(128),
    host_avatar VARCHAR(16),
    campus VARCHAR(64) NOT NULL,
    location_name VARCHAR(128) NOT NULL,
    course_name VARCHAR(128) NOT NULL,
    section_code VARCHAR(32),
    objective TEXT,
    max_collaborators INT,
    current_collaborators INT,
    status VARCHAR(32),
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_beacon_campus_status (campus, status),
    INDEX idx_beacon_course (course_name),
    INDEX idx_beacon_host (host_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. TABLA: student_networking_profiles (Perfiles de Matching Dual - Networking)
-- ----------------------------------------------------------------------------
CREATE TABLE student_networking_profiles (
    student_code VARCHAR(32) PRIMARY KEY,
    full_name VARCHAR(128) NOT NULL,
    avatar_letter VARCHAR(8),
    career VARCHAR(128),
    campus VARCHAR(64),
    cycle INT,
    program VARCHAR(64),
    enrolled_courses_json TEXT,
    free_windows_json TEXT,
    skills_json TEXT,
    match_intent VARCHAR(64),
    contact_channels_json TEXT,
    ghost_mode BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at DATETIME,
    INDEX idx_netprofile_campus (campus),
    INDEX idx_netprofile_intent (match_intent),
    INDEX idx_netprofile_ghost (ghost_mode)
) ENGINE=InnoDB;

-- ============================================================================
-- INSERCIÓN DE DATOS DE EJEMPLO REALES PARA DEMOSTRACIÓN DOCENTE
-- Sílabos con contenido relacional normalizado (evaluaciones y cronograma
-- semanal derivados de los blobs JSON anteriores). Sin separador ';' interno:
-- el cargador de scripts divide sentencias por ';'.
-- ============================================================================

INSERT INTO students (id, student_code, full_name, email, career, campus, current_cycle)
VALUES 
('usr-demo-01', 'U23307609', 'JOAN JOAQUIN CALLAÑAUPA LAURENTE', 'u23307609@utp.edu.pe', 'Ingeniería de Sistemas e Informática', 'Lima Centro', 7);

INSERT INTO official_syllabi (course_id, course_code, course_name, semester, credits, modality,
                              weekly_hours, formula, learning_goal, max_similarity_percent, ai_policy,
                              careers_text, rules_text, raw_json_data)
VALUES 
('100000SI65', '100000SI65', 'DESARROLLO WEB INTEGRADO', '2026 - Ciclo 2 Agosto', 3, 'Presencial',
 6, '20% [PC1] + 20% [PC2] + 20% [PA] + 40% [PROY]', 'Arquitectura Frontend y Backend, Integración de APIs y Seguridad',
 20, 'El uso de IA generativa se permite solo como apoyo de investigación, previa citación según el código de honor UTP.',
 'Ingeniería de Sistemas e Informática', 'Sílabo oficial UTP', NULL),
('100000SI58', '100000SI58', 'FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS', '2026 - Ciclo 2 Agosto', 3, 'Presencial',
 3, '15% [PC1] + 20% [PC2] + 25% [PA] + 40% [PROY]', 'Investigación tecnológica e innovación',
 20, 'El uso de IA generativa se permite solo como apoyo de investigación, previa citación según el código de honor UTP.',
 'Ingeniería de Sistemas e Informática', 'Sílabo oficial UTP', NULL),
('100000SI66', '100000SI66', 'GESTIÓN DEL SERVICIO TI', '2026 - Ciclo 2 Agosto', 3, 'Presencial',
 4, '20% [PC1] + 20% [PC2] + 20% [TB] + 40% [EXFN]', 'Gobierno de TI, ITIL 4 y Gestión de Servicios',
 20, 'El uso de IA generativa se permite solo como apoyo de investigación, previa citación según el código de honor UTP.',
 'Ingeniería de Sistemas e Informática', 'Sílabo oficial UTP', NULL),
('100000SI67', '100000SI67', 'HERRAMIENTAS PARA LA COMUNICACIÓN EFECTIVA', '2026 - Ciclo 2 Agosto', 2, 'Virtual 24/7 (Asíncrono)',
 2, '20% [TA1] + 20% [TA2] + 20% [TA3] + 40% [TF]', 'Comunicación Asertiva Digital, Oratoria y Pitch Profesional',
 20, 'El uso de IA generativa se permite solo como apoyo de investigación, previa citación según el código de honor UTP.',
 'Ingeniería de Sistemas e Informática', 'Sílabo oficial UTP', NULL),
('100000SI68', '100000SI68', 'SERVICIOS CLOUD', '2026 - Ciclo 2 Agosto', 3, 'Presencial',
 4, '25% [PC1] + 25% [PC2] + 20% [LAB] + 30% [PROY]', 'Arquitecturas Cloud Resilientes, Contenedores e IaC',
 20, 'El uso de IA generativa se permite solo como apoyo de investigación, previa citación según el código de honor UTP.',
 'Ingeniería de Sistemas e Informática', 'Sílabo oficial UTP', NULL),
('100000SI69', '100000SI69', 'LENGUAJES DE PROGRAMACIÓN', '2026 - Ciclo 2 Agosto', 3, 'Presencial',
 4, '20% [PC1] + 20% [PC2] + 20% [LAB] + 40% [EXFN]', 'Paradigmas de Programación, Sistemas de Tipos y Concurrencia',
 20, 'El uso de IA generativa se permite solo como apoyo de investigación, previa citación según el código de honor UTP.',
 'Ingeniería de Sistemas e Informática', 'Sílabo oficial UTP', NULL),
('100000SI60', '100000SI60', 'DESARROLLO DE SOFTWARE AVANZADO', '2026 - Ciclo 2 Agosto', 4, 'Presencial',
 5, '20% [PC1] + 20% [PC2] + 20% [TB] + 40% [EXFN]', 'Arquitectura de Software y Sistemas Distribuidos',
 20, 'El uso de IA generativa se permite solo como apoyo de investigación, previa citación según el código de honor UTP.',
 'Ingeniería de Sistemas e Informática', 'Sílabo oficial UTP', NULL),
('100000SI62', '100000SI62', 'REDES Y COMUNICACIONES', '2026 - Ciclo 2 Agosto', 3, 'Presencial',
 4, '30% [LAB] + 30% [PC] + 40% [EXFN]', 'Infraestructura y Redes',
 20, 'El uso de IA generativa se permite solo como apoyo de investigación, previa citación según el código de honor UTP.',
 'Ingeniería de Sistemas e Informática', 'Sílabo oficial UTP', NULL);

-- Evaluaciones normalizadas (pesos y semanas coherentes con la fórmula y el cronograma)
INSERT INTO syllabus_evaluations (id, syllabus_id, evaluation_name, evaluation_code,
                                  weight_percent, week_number, is_individual, observation, rules_text)
VALUES 
('100000SI65-PC1', '100000SI65', 'Práctica Calificada 1', 'PC1', 20.0, 5, TRUE, NULL, NULL),
('100000SI65-PC2', '100000SI65', 'Práctica Calificada 2', 'PC2', 20.0, 10, TRUE, NULL, NULL),
('100000SI65-PA',  '100000SI65', 'Práctica Áulica', 'PA', 20.0, NULL, TRUE, NULL, NULL),
('100000SI65-PROY','100000SI65', 'Proyecto Final', 'PROY', 40.0, 18, TRUE, NULL, NULL),
('100000SI58-PC1', '100000SI58', 'Práctica Calificada 1', 'PC1', 15.0, 4, TRUE, NULL, NULL),
('100000SI58-PC2', '100000SI58', 'Práctica Calificada 2', 'PC2', 20.0, 9, TRUE, NULL, NULL),
('100000SI58-PA',  '100000SI58', 'Práctica Áulica', 'PA', 25.0, NULL, TRUE, NULL, NULL),
('100000SI58-PROY','100000SI58', 'Proyecto de Investigación', 'PROY', 40.0, 18, TRUE, NULL, NULL),
('100000SI66-PC1', '100000SI66', 'Práctica Calificada 1', 'PC1', 20.0, 5, TRUE, NULL, NULL),
('100000SI66-PC2', '100000SI66', 'Práctica Calificada 2', 'PC2', 20.0, 11, TRUE, NULL, NULL),
('100000SI66-TB',  '100000SI66', 'Trabajo Grupal Service Desk', 'TB', 20.0, 15, FALSE, 'Evaluación grupal por equipos', NULL),
('100000SI66-EXFN','100000SI66', 'Examen Final Integrador', 'EXFN', 40.0, 18, TRUE, NULL, NULL),
('100000SI67-TA1', '100000SI67', 'Tarea Académica 1', 'TA1', 20.0, 4, TRUE, NULL, NULL),
('100000SI67-TA2', '100000SI67', 'Tarea Académica 2', 'TA2', 20.0, 8, TRUE, NULL, NULL),
('100000SI67-TA3', '100000SI67', 'Tarea Académica 3', 'TA3', 20.0, 13, TRUE, NULL, NULL),
('100000SI67-TF',  '100000SI67', 'Trabajo Final', 'TF', 40.0, 17, TRUE, NULL, NULL),
('100000SI68-PC1', '100000SI68', 'Práctica Calificada 1', 'PC1', 25.0, 5, TRUE, NULL, NULL),
('100000SI68-PC2', '100000SI68', 'Práctica Calificada 2', 'PC2', 25.0, 11, TRUE, NULL, NULL),
('100000SI68-LAB', '100000SI68', 'Evaluación de Laboratorios', 'LAB', 20.0, 15, TRUE, NULL, NULL),
('100000SI68-PROY','100000SI68', 'Proyecto Cloud', 'PROY', 30.0, 18, TRUE, NULL, NULL),
('100000SI69-PC1', '100000SI69', 'Práctica Calificada 1', 'PC1', 20.0, 5, TRUE, NULL, NULL),
('100000SI69-PC2', '100000SI69', 'Práctica Calificada 2', 'PC2', 20.0, 11, TRUE, NULL, NULL),
('100000SI69-LAB', '100000SI69', 'Evaluación de Laboratorios', 'LAB', 20.0, 15, TRUE, NULL, NULL),
('100000SI69-EXFN','100000SI69', 'Examen Final Integrador', 'EXFN', 40.0, 18, TRUE, NULL, NULL),
('100000SI60-PC1', '100000SI60', 'Práctica Calificada 1', 'PC1', 20.0, NULL, TRUE, NULL, NULL),
('100000SI60-PC2', '100000SI60', 'Práctica Calificada 2', 'PC2', 20.0, NULL, TRUE, NULL, NULL),
('100000SI60-TB',  '100000SI60', 'Trabajo Grupal', 'TB', 20.0, NULL, FALSE, 'Aplicación de prácticas ágiles', NULL),
('100000SI60-EXFN','100000SI60', 'Examen Final', 'EXFN', 40.0, NULL, TRUE, NULL, NULL),
('100000SI62-LAB', '100000SI62', 'Evaluación de Laboratorios', 'LAB', 30.0, NULL, TRUE, NULL, NULL),
('100000SI62-PC',  '100000SI62', 'Práctica Calificada', 'PC', 30.0, NULL, TRUE, NULL, NULL),
('100000SI62-EXFN','100000SI62', 'Examen Final Integrador', 'EXFN', 40.0, NULL, TRUE, NULL, NULL);

-- Cronograma semanal normalizado (unit asumía el campo title del JSON previo)
INSERT INTO syllabus_weekly_sessions (id, syllabus_id, week_number, session_number, unit, topics, learning_activities, evaluation_description)
VALUES 
('100000SI65-W1',  '100000SI65', 1, 1, 'Fundamentos de Arquitectura Web Moderna', 'Componentes y Estado', NULL, NULL),
('100000SI65-W2',  '100000SI65', 2, 1, 'APIs RESTful y Autenticación JWT', 'Filtros y DTOs', NULL, NULL),
('100000SI65-W5',  '100000SI65', 5, 1, 'Práctica Calificada 1 (PC1)', 'Evaluación Frontend', NULL, 'Práctica Calificada 1 (PC1)'),
('100000SI65-W10', '100000SI65', 10, 1, 'Práctica Calificada 2 (PC2)', 'Evaluación Backend', NULL, 'Práctica Calificada 2 (PC2)'),
('100000SI65-W18', '100000SI65', 18, 1, 'Sustentación Proyecto Final (PROY)', 'Despliegue en Producción', NULL, 'Sustentación Proyecto Final (PROY)'),
('100000SI58-W1',  '100000SI58', 1, 1, 'Planteamiento del Problema de Investigación', 'Definición del alcance, Formulación de objetivos', NULL, NULL),
('100000SI58-W2',  '100000SI58', 2, 1, 'Estado del Arte', 'Revisión de literatura científica', NULL, NULL),
('100000SI58-W4',  '100000SI58', 4, 1, 'Práctica Calificada 1 (PC1)', 'Justificación del Problema', NULL, 'Práctica Calificada 1 (PC1)'),
('100000SI58-W9',  '100000SI58', 9, 1, 'Práctica Calificada 2 (PC2)', 'Marco Teórico', NULL, 'Práctica Calificada 2 (PC2)'),
('100000SI58-W18', '100000SI58', 18, 1, 'Sustentación de Artículo Científico (PROY)', 'Paper Final IEEE', NULL, 'Sustentación de Artículo Científico (PROY)'),
('100000SI66-W1',  '100000SI66', 1, 1, 'Introducción a la Gestión de Servicios TI', 'ITIL 4 y Sistema de Valor del Servicio', NULL, NULL),
('100000SI66-W5',  '100000SI66', 5, 1, 'Práctica Calificada 1 (PC1)', 'Fundamentos ITIL 4', NULL, 'Práctica Calificada 1 (PC1)'),
('100000SI66-W11', '100000SI66', 11, 1, 'Práctica Calificada 2 (PC2)', 'Gestión de Incidentes y Cambios', NULL, 'Práctica Calificada 2 (PC2)'),
('100000SI66-W15', '100000SI66', 15, 1, 'Trabajo Grupal Service Desk (TB)', 'Mesa de Ayuda y SLAs', NULL, 'Trabajo Grupal Service Desk (TB)'),
('100000SI66-W18', '100000SI66', 18, 1, 'Examen Final Integrador (EXFN)', 'Evaluación de Casos', NULL, 'Examen Final Integrador (EXFN)'),
('100000SI67-W1',  '100000SI67', 1, 1, 'Bases de la Comunicación Asertiva', 'Escucha activa y medios digitales', NULL, NULL),
('100000SI67-W4',  '100000SI67', 4, 1, 'Tarea Académica 1 (TA1)', 'Comunicación Asertiva', NULL, 'Tarea Académica 1 (TA1)'),
('100000SI67-W8',  '100000SI67', 8, 1, 'Tarea Académica 2 (TA2)', 'Oratoria y Discurso Persuasivo', NULL, 'Tarea Académica 2 (TA2)'),
('100000SI67-W13', '100000SI67', 13, 1, 'Tarea Académica 3 (TA3)', 'Informe Ejecutivo', NULL, 'Tarea Académica 3 (TA3)'),
('100000SI67-W17', '100000SI67', 17, 1, 'Trabajo Final (TF)', 'Pitch Profesional Grabado', NULL, 'Trabajo Final (TF)'),
('100000SI68-W1',  '100000SI68', 1, 1, 'Fundamentos de Cloud Computing', 'Modelos IaaS, PaaS, SaaS', NULL, NULL),
('100000SI68-W5',  '100000SI68', 5, 1, 'Práctica Calificada 1 (PC1)', 'VPC, Subnets y Cómputo', NULL, 'Práctica Calificada 1 (PC1)'),
('100000SI68-W11', '100000SI68', 11, 1, 'Práctica Calificada 2 (PC2)', 'Contenedores y Serverless', NULL, 'Práctica Calificada 2 (PC2)'),
('100000SI68-W15', '100000SI68', 15, 1, 'Evaluación de Laboratorios (LAB)', 'Talleres en Nube', NULL, 'Evaluación de Laboratorios (LAB)'),
('100000SI68-W18', '100000SI68', 18, 1, 'Sustentación de Proyecto Cloud (PROY)', 'Infraestructura con Terraform', NULL, 'Sustentación de Proyecto Cloud (PROY)'),
('100000SI69-W1',  '100000SI69', 1, 1, 'Evolución y Gramáticas de Lenguajes', 'Análisis Léxico, Sintáctico y AST', NULL, NULL),
('100000SI69-W5',  '100000SI69', 5, 1, 'Práctica Calificada 1 (PC1)', 'Gramáticas y Tipos', NULL, 'Práctica Calificada 1 (PC1)'),
('100000SI69-W11', '100000SI69', 11, 1, 'Práctica Calificada 2 (PC2)', 'Concurrencia y Memoria', NULL, 'Práctica Calificada 2 (PC2)'),
('100000SI69-W15', '100000SI69', 15, 1, 'Evaluación de Laboratorios (LAB)', 'Implementación de Lenguajes', NULL, 'Evaluación de Laboratorios (LAB)'),
('100000SI69-W18', '100000SI69', 18, 1, 'Examen Final Integrador (EXFN)', 'Evaluación Teórico-Práctica', NULL, 'Examen Final Integrador (EXFN)'),
('100000SI60-W1',  '100000SI60', 1, 1, 'Domain-Driven Design (DDD)', 'Agregados y Entidades, Puertos y Adaptadores', NULL, NULL),
('100000SI60-W2',  '100000SI60', 2, 1, 'Microservicios con Spring Boot', 'Configuración y Resiliencia', NULL, NULL),
('100000SI62-W1',  '100000SI62', 1, 1, 'Modelos de Red OSI y TCP/IP', 'Capas y Protocolos', NULL, NULL),
('100000SI62-W2',  '100000SI62', 2, 1, 'Enrutamiento Estático y Dinámico', 'VLANs y Trunking', NULL, NULL);

INSERT INTO tasks (id, student_id, course_name, section_id, homework_id, title, type, week, homework_status, assignment_progress, due_date, max_score, score, is_delivered)
VALUES 
('task-demo-01', 'U23307609', 'FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS', 'SEC-01', 'HW-01', 'Avance del Estado del Arte (Capítulo 1)', 'TAREA', 4, 'Pendiente', 'En progreso', '2026-10-15 23:59:00', 20.0, NULL, FALSE),
('task-demo-02', 'U23307609', 'DESARROLLO DE SOFTWARE AVANZADO', 'SEC-02', 'HW-02', 'Implementación de Microservicio DDD con Spring Boot y MySQL', 'PROYECTO', 5, 'Pendiente', 'En progreso', '2026-10-18 23:59:00', 20.0, NULL, FALSE),
('task-demo-03', 'U23307609', 'REDES Y COMUNICACIONES', 'SEC-03', 'HW-03', 'Laboratorio 3: Simulación Packet Tracer VLANs', 'LABORATORIO', 3, 'Completada', 'Entregado', '2026-10-12 18:00:00', 20.0, 19.5, TRUE);

INSERT INTO marketplace_items (id, seller_student_code, item_type, category, service_type, item_condition, price, numeric_price, original_price, unit, title, description, badge, location, rating, reviews_count, sales_count, tutor_name, tutor_career, tutor_cycle, reputation, contact_method)
VALUES 
('item-demo-01', 'U23307609', 'MATERIAL', 'TESIS', 'RECURSO', 'DIGITAL', 'Gratis', 0.00, 0.00, 'PDF', 'Plantilla Látex para Tesis UTP IEEE', 'Formato oficial de investigación con normas bibliográficas automatizadas.', 'POPULAR', 'Campus Lima Centro', 5.0, 14, 32, 'Joan Callañaupa', 'Ing. de Sistemas', 7, 98, 'u23307609@utp.edu.pe'),
('item-demo-02', 'U23307609', 'SERVICIO', 'ASESORIA', 'TUTORIA', 'ONLINE', 'S/. 25.00', 25.00, 35.00, 'Hora', 'Asesoría en Arquitectura DDD y Spring Boot 3', 'Sesión 1 a 1 para diseño de agregados, puertos y adaptadores.', 'TOP RATED', 'Remoto Google Meet', 4.9, 8, 12, 'Joan Callañaupa', 'Ing. de Sistemas', 7, 100, 'u23307609@utp.edu.pe');

-- Horario de demostración vacío y honesto (El backend sincroniza el horario real
-- desde la pasarela oficial). schedule_data en NULL: el contenido vive ya
-- relacionalmente en schedule_courses y schedule_sessions.
INSERT INTO student_schedules (id, student_code, period_name, week_number, total_weeks, start_date, end_date, schedule_data, last_synced_date)
VALUES 
('sched-demo-01', 'U23307609', '2026 - Ciclo 2 Agosto', 7, 18, '2026-08-17', '2026-12-18', NULL, '2026-10-03');

-- ============================================================================
-- CONSULTAS DE DEMOSTRACIÓN RÁPIDA PARA LA SUSTENTACIÓN CON EL PROFESOR
-- ============================================================================
-- 1. Consultar estudiante registrado:
-- SELECT * FROM students;

-- 2. Consultar asignaturas y fórmulas de evaluación (columnas atómicas normalizadas):
-- SELECT course_code, course_name, credits, formula FROM official_syllabi;

-- 3. Consultar tareas sincronizadas:
-- SELECT course_name, title, due_date, homework_status, is_delivered FROM tasks;

-- 4. Consultar marketplace académico:
-- SELECT title, tutor_name, category, price FROM marketplace_items;

-- 4b. Consultar mesas de estudio activas en campus (Networking Fase 1.0):
-- SELECT host_id, location_name, course_name, current_collaborators, status
-- FROM study_beacons WHERE status = 'ACTIVE' ORDER BY created_at DESC;

-- 4c. Perfiles candidatos al Matching Dual (sin ghost mode):
-- SELECT student_code, full_name, career, campus, match_intent
-- FROM student_networking_profiles WHERE ghost_mode = FALSE;

-- 5. Consultar horario sincronizado:
-- SELECT student_code, period_name, last_synced_date FROM student_schedules;

-- 6. Análisis relacional: ocupación de aulas por sesiones del calendario:
-- SELECT classroom, COUNT(*) AS sesiones,
--        SUM(TIMESTAMPDIFF(MINUTE, start_at, finish_at)) / 60.0 AS horas
-- FROM schedule_sessions GROUP BY classroom ORDER BY horas DESC;

-- 7. Análisis relacional: distribución de evaluaciones por semana (sílabo SI58):
-- SELECT evaluation_code, evaluation_name, week_number, weight_percent, is_individual
-- FROM syllabus_evaluations WHERE syllabus_id = '100000SI58' ORDER BY week_number;

-- 8. Análisis relacional: cronograma semanal de contenidos (sílabo SI65):
-- SELECT week_number, unit, topics, evaluation_description
-- FROM syllabus_weekly_sessions WHERE syllabus_id = '100000SI65'
-- ORDER BY week_number, session_number;
