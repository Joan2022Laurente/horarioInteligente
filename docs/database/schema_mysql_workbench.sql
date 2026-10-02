-- ============================================================================
-- SCRIPT DE BASE DE DATOS PARA EVALUACIÓN DOCENTE (MYSQL WORKBENCH)
-- PROYECTO: HORARIO INTELIGENTE UTP (FULLSTACK SPRING BOOT + ANGULAR)
-- ARQUITECTURA: DOMAIN-DRIVEN DESIGN (DDD) / CQRS
-- ============================================================================

CREATE DATABASE IF NOT EXISTS horariodb 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE horariodb;

-- ----------------------------------------------------------------------------
-- 1. TABLA: students (Agregado de Estudiante)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(100) PRIMARY KEY,
    student_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    career VARCHAR(200),
    campus VARCHAR(100),
    current_cycle INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_code (student_code)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. TABLA: student_schedules (Horario del Estudiante por Periodo)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_schedules (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    academic_cycle VARCHAR(50) NOT NULL,
    raw_json LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_schedules_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_schedule_student_period (student_id, academic_cycle)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. TABLA: student_tasks (Tareas sincronizadas del estudiante)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_tasks (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    course_name VARCHAR(255),
    course_code VARCHAR(50),
    due_date DATETIME,
    status VARCHAR(50) DEFAULT 'PENDIENTE',
    priority VARCHAR(50) DEFAULT 'MEDIA',
    type VARCHAR(50) DEFAULT 'TAREA',
    weight VARCHAR(50),
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_tasks_student (student_id),
    INDEX idx_tasks_status (status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. TABLA: syllabuses (Sílabos oficiales de asignaturas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS syllabuses (
    id VARCHAR(100) PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL UNIQUE,
    course_name VARCHAR(255) NOT NULL,
    semester VARCHAR(50),
    credits INT DEFAULT 3,
    modality VARCHAR(50) DEFAULT 'Presencial',
    weekly_hours INT DEFAULT 4,
    learning_goal TEXT,
    formula TEXT,
    raw_json LONGTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_syllabus_code (course_code)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. TABLA: marketplace_items (Marketplace académico estudiantil)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_items (
    id VARCHAR(100) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    seller_name VARCHAR(255),
    course_code VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0.00,
    category VARCHAR(50),
    contact_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_marketplace_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_marketplace_course (course_code),
    INDEX idx_marketplace_category (category)
) ENGINE=InnoDB;

-- ============================================================================
-- INSERCIÓN DE DATOS DE EJEMPLO REALES PARA DEMOSTRACIÓN DOCENTE
-- ============================================================================

INSERT INTO students (id, student_code, full_name, email, career, campus, current_cycle)
VALUES 
('usr-demo-01', 'U23307609', 'JOAN JOAQUIN CALLAÑAUPA LAURENTE', 'u23307609@utp.edu.pe', 'Ingeniería de Sistemas e Informática', 'Lima Centro', 7)
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name);

INSERT INTO syllabuses (id, course_code, course_name, semester, credits, modality, weekly_hours, learning_goal, formula)
VALUES 
('syl-100000SI58', '100000SI58', 'FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS', '2026 - Ciclo 2 Agosto', 3, 'Presencial', 4, 'Al finalizar el curso, el estudiante formula un proyecto de investigación estructurado.', '15% [PC1] + 20% [PC2] + 25% [PA] + 40% [PROY]'),
('syl-100000SI60', '100000SI60', 'DESARROLLO DE SOFTWARE AVANZADO', '2026 - Ciclo 2 Agosto', 4, 'Presencial', 5, 'Diseño e implementación de sistemas distribuidos y microservicios.', '20% [PC1] + 20% [PC2] + 20% [TB] + 40% [EXFN]'),
('syl-100000SI62', '100000SI62', 'REDES Y COMUNICACIONES', '2026 - Ciclo 2 Agosto', 3, 'Presencial', 4, 'Configuración y análisis de protocolos de red y arquitecturas TCP/IP.', '30% [LAB] + 30% [PC] + 40% [EXFN]')
ON DUPLICATE KEY UPDATE course_name = VALUES(course_name);

INSERT INTO student_tasks (id, student_id, title, course_name, course_code, due_date, status, priority, type, weight)
VALUES 
('task-demo-01', 'usr-demo-01', 'Avance del Estado del Arte (Capítulo 1)', 'FORMACIÓN PARA LA INVESTIGACIÓN - SISTEMAS', '100000SI58', '2026-10-15 23:59:00', 'PENDIENTE', 'ALTA', 'TAREA', '15%'),
('task-demo-02', 'usr-demo-01', 'Implementación de Microservicio DDD con Spring Boot', 'DESARROLLO DE SOFTWARE AVANZADO', '100000SI60', '2026-10-18 23:59:00', 'PENDIENTE', 'ALTA', 'PROYECTO', '20%'),
('task-demo-03', 'usr-demo-01', 'Laboratorio 3: Simulación Packet Tracer VLANs', 'REDES Y COMUNICACIONES', '100000SI62', '2026-10-12 18:00:00', 'COMPLETADA', 'MEDIA', 'LABORATORIO', '10%')
ON DUPLICATE KEY UPDATE title = VALUES(title);

INSERT INTO marketplace_items (id, student_id, seller_name, course_code, title, description, price, category, contact_info)
VALUES 
('item-demo-01', 'usr-demo-01', 'Joan Callañaupa', '100000SI58', 'Plantilla Látex para Tesis UTP IEEE', 'Formato oficial de investigación con normas bibliográficas automatizadas.', 0.00, 'MATERIAL', 'u23307609@utp.edu.pe'),
('item-demo-02', 'usr-demo-01', 'Joan Callañaupa', '100000SI60', 'Guía Resumen Patrones DDD y CQRS', 'Cheat-sheet completo con ejemplos prácticos en Spring Boot 3.', 0.00, 'RESUMEN', 'u23307609@utp.edu.pe')
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- ============================================================================
-- CONSULTAS DE DEMOSTRACIÓN RÁPIDA PARA LA SUSTENTACIÓN CON EL PROFESOR
-- ============================================================================
-- 1. Consultar estudiante registrado:
-- SELECT * FROM students;

-- 2. Consultar asignaturas y fórmulas de evaluación:
-- SELECT course_code, course_name, credits, formula FROM syllabuses;

-- 3. Consultar tareas pendientes del alumno:
-- SELECT course_name, title, due_date, priority, status FROM student_tasks;

-- 4. Consultar marketplace:
-- SELECT title, seller_name, category, price FROM marketplace_items;
