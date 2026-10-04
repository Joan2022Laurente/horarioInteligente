# Guía Oficial: Conexión del Equipo a Base de Datos en la Nube (MySQL Workbench)

Esta guía detalla el procedimiento oficial para que todos los integrantes del equipo conecten **MySQL Workbench** directamente a la base de datos centralizada en la nube (**Aiven Cloud MySQL**).

Al utilizar la base de datos en la nube:
- **Cero instalaciones locales pesadas**: No se requiere instalar MySQL Server local ni configurar servicios en XAMPP.
- **Sincronización total en el equipo**: Todos los integrantes visualizan y comparten exactamente los mismos datos en tiempo real (alumnos, horarios, tareas sincronizadas, sílabos y marketplace).
- **Cero scripts manuales**: Las tablas, claves foráneas, restricciones e índices ya se encuentran creados y actualizados en la nube.

---

## 1. Parámetros Oficiales de Conexión

| Parámetro | Valor Oficial |
| :--- | :--- |
| **Nombre de la Conexión** | `Aiven Cloud - Horario UTP` |
| **Connection Method** | `Standard (TCP/IP)` |
| **Hostname / Servidor** | `mysql-horario-utp-horario.k.aivencloud.com` |
| **Port / Puerto** | `26871` |
| **Username / Usuario** | `horario_admin` |
| **Password / Contraseña** | *(Solicitar por el chat interno del equipo — omitida por seguridad de GitHub)* |
| **Default Schema** | `horariodb` |
| **Modo SSL** | `Require` (Obligatorio por seguridad en la nube) |

---

## 2. Paso a Paso: Configurar la Conexión en MySQL Workbench

1. Abre **MySQL Workbench**.
2. En la pantalla principal, haz clic en el ícono **`+`** (junto al texto *MySQL Connections*).
3. En la ventana **Setup New Connection**:
   - **Connection Name:** `Aiven Cloud - Horario UTP`
   - **Hostname:** `mysql-horario-utp-horario.k.aivencloud.com`
   - **Port:** `26871`
   - **Username:** `horario_admin`
   - **Default Schema:** `horariodb`
4. Configuración de **Contraseña**:
   - Haz clic en el botón **Store in Vault...** (o *Guardar contraseña*).
   - Pega la contraseña compartida del equipo y pulsa **OK**.
5. Configuración de **Seguridad SSL**:
   - Ve a la pestaña **SSL** (en la misma ventana).
   - En el campo **Use SSL**, selecciona **`Require`** (o `If Available`).
6. Verificación:
   - Haz clic en el botón **Test Connection** (esquina inferior derecha).
   - Verás el mensaje de confirmación:  
     `Successfully made the MySQL connection`.
7. Haz clic en **OK** para guardar la conexión.

---

## 3. Exploración de Datos Compartidos en Tiempo Real

Una vez creada la conexión:
1. Haz doble clic sobre la tarjeta **`Aiven Cloud - Horario UTP`** para abrir la sesión de trabajo.
2. En el panel izquierdo (**Navigator** -> pestaña **Schemas**), expande el esquema **`horariodb`** y la carpeta **Tables**.
3. Verás las 5 tablas centrales del dominio:
   - `students`: Estudiantes matriculados, código institucional y ciclo vigente.
   - `student_schedules`: Horario oficial sincronizado con bloques horarios y aulas.
   - `tasks`: Tareas, entregas académicas y evaluaciones ponderadas.
   - `official_syllabi`: Sílabos universitarios con fórmulas y créditos.
   - `marketplace_items`: Publicaciones de apuntes y tutorías de estudiantes.
4. Para inspeccionar cualquier tabla, haz clic derecho sobre su nombre y selecciona **Select Rows - Limit 1000**.

---

## 4. Generar Diagrama Entidad-Relación (EER) en 3 Clics

Para la sustentación o revisión técnica del modelo relacional:
1. Con la sesión de Workbench abierta, ve al menú superior:  
   **Database** -> **Reverse Engineer...** (o presiona el atajo `Ctrl + R`).
2. En *Stored Connection*, selecciona **`Aiven Cloud - Horario UTP`** y presiona **Next**.
3. Ingresa tu contraseña si te la solicita y pulsa **Next**.
4. Marca la casilla del esquema **`horariodb`** y haz clic en **Next**.
5. Deja seleccionadas todas las tablas y haz clic en **Execute** -> **Next** -> **Finish**.
6. MySQL Workbench generará de inmediato el **Diagrama EER interactivo**, mostrando las entidades, campos, claves primarias (`PK`) y relaciones con eliminación en cascada (`ON DELETE CASCADE`).

---

## 5. Consultas SQL Rápidas para Validación y Pruebas

Puedes ejecutar estas consultas directamente en la pestaña SQL (`Ctrl + T`) de MySQL Workbench:

```sql
USE horariodb;

-- 1. Ver estudiantes matriculados y sus ciclos activos
SELECT id, student_code, full_name, career, current_cycle 
FROM students;

-- 2. Consultar horario semanal y bloques de clase por alumno
SELECT student_code, period, JSON_LENGTH(schedule_data) AS total_bloques, updated_at 
FROM student_schedules;

-- 3. Ver tareas, estados de entrega y correlación con el sílabo
SELECT student_code, course_name, title, due_date, homework_status, is_delivered, syllabus_correlation 
FROM tasks 
ORDER BY due_date ASC;

-- 4. Ver sílabos cacheados y fórmulas de evaluación
SELECT course_code, course_name, credits, formula, updated_at 
FROM official_syllabi;

-- 5. Ver publicaciones del Marketplace estudiantil
SELECT id, title, tutor_name, category, price, rating, reviews_count 
FROM marketplace_items;
```

---

## 6. Conexión del Backend Local a la Misma Base de Datos

Para que tu backend local en Spring Boot utilice la misma base de datos en la nube:

### En PowerShell (Windows):
```powershell
$env:MYSQL_URL="jdbc:mysql://mysql-horario-utp-horario.k.aivencloud.com:26871/horariodb?sslMode=REQUIRED"
$env:MYSQL_USER="horario_admin"
$env:MYSQL_PASSWORD="<pegar_aqui_la_contrasena_compartida>"
$env:PORT="8080"

cd backend-springboot
java -jar target/horario-backend-1.0.0.jar
```
