-- ============================================================================
-- SCRIPT DE BASE DE DATOS PARA EVALUACIÓN DOCENTE (MYSQL WORKBENCH)
-- PROYECTO: HORARIO INTELIGENTE UTP (FULLSTACK SPRING BOOT + ANGULAR)
-- ARQUITECTURA: DOMAIN-DRIVEN DESIGN (DDD) / CQRS
-- ============================================================================

CREATE DATABASE IF NOT EXISTS horariodb 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE horariodb;

-- Limpieza de tablas previas (en orden de dependencias)
DROP TABLE IF EXISTS student_tasks;
DROP TABLE IF EXISTS syllabuses;
DROP TABLE IF EXISTS student_schedules;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS marketplace_items;
DROP TABLE IF EXISTS students;
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
-- ----------------------------------------------------------------------------
CREATE TABLE student_schedules (
    id VARCHAR(64) PRIMARY KEY,
    student_code VARCHAR(32) NOT NULL,
    period_name VARCHAR(64) NOT NULL,
    week_number INT,
    total_weeks INT,
    schedule_data LONGTEXT,
    last_synced_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_schedule_period UNIQUE (student_code, period_name),
    INDEX idx_schedule_student (student_code)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. TABLA: tasks (Tareas sincronizadas del estudiante)
-- ----------------------------------------------------------------------------
CREATE TABLE tasks (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
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
    INDEX idx_tasks_student (student_id),
    INDEX idx_tasks_status (homework_status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. TABLA: official_syllabi (Sílabos oficiales de asignaturas)
-- ----------------------------------------------------------------------------
CREATE TABLE official_syllabi (
    course_id VARCHAR(100) PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    semester VARCHAR(50),
    credits INT DEFAULT 3,
    modality VARCHAR(50) DEFAULT 'Presencial',
    formula TEXT,
    raw_json_data LONGTEXT,
    INDEX idx_syllabi_course_code (course_code)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. TABLA: marketplace_items (Marketplace académico estudiantil)
-- ----------------------------------------------------------------------------
CREATE TABLE marketplace_items (
    id VARCHAR(64) PRIMARY KEY,
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
    INDEX idx_marketplace_category (category),
    INDEX idx_marketplace_type (item_type)
) ENGINE=InnoDB;

-- ============================================================================
-- INSERCIÓN DE DATOS DE EJEMPLO REALES PARA DEMOSTRACIÓN DOCENTE
-- ============================================================================

INSERT INTO students (id, student_code, full_name, email, career, campus, current_cycle)
VALUES 
('usr-demo-01', 'U23307609', 'JOAN JOAQUIN CALLAÑAUPA LAURENTE', 'u23307609@utp.edu.pe', 'Ingeniería de Sistemas e Informática', 'Lima Centro', 7);

INSERT INTO official_syllabi (course_id, course_code, course_name, semester, credits, modality, formula, raw_json_data)
VALUES 
('100000SI58', '100000SI58', 'FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS', '2026 - Ciclo 2 Agosto', 3, 'Presencial', '15% [PC1] + 20% [PC2] + 25% [PA] + 40% [PROY]', '{"courseCode":"100000SI58","courseName":"FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS","formula":"15% [PC1] + 20% [PC2] + 25% [PA] + 40% [PROY]","competencias":["Investigación tecnológica e innovación"],"weeklySchedule":[{"week":1,"title":"Planteamiento del Problema de Investigación","topics":["Definición del alcance","Formulación de objetivos"]},{"week":2,"title":"Estado del Arte","topics":["Revisión de literatura científica"]}]}'),
('100000SI60', '100000SI60', 'DESARROLLO DE SOFTWARE AVANZADO', '2026 - Ciclo 2 Agosto', 4, 'Presencial', '20% [PC1] + 20% [PC2] + 20% [TB] + 40% [EXFN]', '{"courseCode":"100000SI60","courseName":"DESARROLLO DE SOFTWARE AVANZADO","formula":"20% [PC1] + 20% [PC2] + 20% [TB] + 40% [EXFN]","competencias":["Arquitectura de Software y Sistemas Distribuidos"],"weeklySchedule":[{"week":1,"title":"Domain-Driven Design (DDD)","topics":["Agregados y Entidades","Puertos y Adaptadores"]},{"week":2,"title":"Microservicios con Spring Boot","topics":["Configuración y Resiliencia"]}]}'),
('100000SI62', '100000SI62', 'REDES Y COMUNICACIONES', '2026 - Ciclo 2 Agosto', 3, 'Presencial', '30% [LAB] + 30% [PC] + 40% [EXFN]', '{"courseCode":"100000SI62","courseName":"REDES Y COMUNICACIONES","formula":"30% [LAB] + 30% [PC] + 40% [EXFN]","competencias":["Infraestructura y Redes"],"weeklySchedule":[{"week":1,"title":"Modelos de Red OSI y TCP/IP","topics":["Capas y Protocolos"]},{"week":2,"title":"Enrutamiento Estático y Dinámico","topics":["VLANs y Trunking"]}]}');

INSERT INTO tasks (id, student_id, course_name, section_id, homework_id, title, type, week, homework_status, assignment_progress, due_date, max_score, score, is_delivered)
VALUES 
('task-demo-01', 'U23307609', 'FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS', 'SEC-01', 'HW-01', 'Avance del Estado del Arte (Capítulo 1)', 'TAREA', 4, 'Pendiente', 'En progreso', '2026-10-15 23:59:00', 20.0, NULL, FALSE),
('task-demo-02', 'U23307609', 'DESARROLLO DE SOFTWARE AVANZADO', 'SEC-02', 'HW-02', 'Implementación de Microservicio DDD con Spring Boot y MySQL', 'PROYECTO', 5, 'Pendiente', 'En progreso', '2026-10-18 23:59:00', 20.0, NULL, FALSE),
('task-demo-03', 'U23307609', 'REDES Y COMUNICACIONES', 'SEC-03', 'HW-03', 'Laboratorio 3: Simulación Packet Tracer VLANs', 'LABORATORIO', 3, 'Completada', 'Entregado', '2026-10-12 18:00:00', 20.0, 19.5, TRUE);

INSERT INTO marketplace_items (id, item_type, category, service_type, item_condition, price, numeric_price, original_price, unit, title, description, badge, location, rating, reviews_count, sales_count, tutor_name, tutor_career, tutor_cycle, reputation, contact_method)
VALUES 
('item-demo-01', 'MATERIAL', 'TESIS', 'RECURSO', 'DIGITAL', 'Gratis', 0.00, 0.00, 'PDF', 'Plantilla Látex para Tesis UTP IEEE', 'Formato oficial de investigación con normas bibliográficas automatizadas.', 'POPULAR', 'Campus Lima Centro', 5.0, 14, 32, 'Joan Callañaupa', 'Ing. de Sistemas', 7, 98, 'u23307609@utp.edu.pe'),
('item-demo-02', 'SERVICIO', 'ASESORIA', 'TUTORIA', 'ONLINE', 'S/. 25.00', 25.00, 35.00, 'Hora', 'Asesoría en Arquitectura DDD y Spring Boot 3', 'Sesión 1 a 1 para diseño de agregados, puertos y adaptadores.', 'TOP RATED', 'Remoto Google Meet', 4.9, 8, 12, 'Joan Callañaupa', 'Ing. de Sistemas', 7, 100, 'u23307609@utp.edu.pe');

INSERT INTO student_schedules (id, student_code, period_name, week_number, total_weeks, schedule_data, last_synced_date)
VALUES 
('sched-demo-01', 'U23307609', '2026 - Ciclo 2 Agosto', 7, 18, '{"periodName":"2026 - Ciclo 2 Agosto","weekNumber":7,"totalWeeks":18,"courses":[],"classes":[]}', '2026-10-03');

-- ============================================================================
-- CONSULTAS DE DEMOSTRACIÓN RÁPIDA PARA LA SUSTENTACIÓN CON EL PROFESOR
-- ============================================================================
-- 1. Consultar estudiante registrado:
-- SELECT * FROM students;

-- 2. Consultar asignaturas y fórmulas de evaluación:
-- SELECT course_code, course_name, credits, formula FROM official_syllabi;

-- 3. Consultar tareas sincronizadas:
-- SELECT course_name, title, due_date, homework_status, is_delivered FROM tasks;

-- 4. Consultar marketplace académico:
-- SELECT title, tutor_name, category, price FROM marketplace_items;

-- 5. Consultar horario sincronizado:
-- SELECT student_code, period_name, last_synced_date FROM student_schedules;
