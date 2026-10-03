# Guía Oficial: Configuración y Uso de MySQL Workbench

Esta guía detalla los pasos para configurar, ejecutar y sustentar la base de datos del proyecto **Horario Inteligente UTP** utilizando **MySQL Workbench** y el backend **Spring Boot** en arquitectura **DDD / CQRS**.

---

## 1. Requisitos Previos

1. **MySQL Server** (local o en la nube):
   * **Local (Recomendado):** Tener [XAMPP](https://www.apachefriends.org/) con el servicio **MySQL** iniciado (puerto 3306), o tener instalado **MySQL Community Server 8.0+**.
   * **Nube:** Una base de datos MySQL en plataformas gratuitas como [Aiven.io](https://aiven.io/), [Clever Cloud](https://www.clever-cloud.com/) o [TiDB Cloud](https://tidbcloud.com/).
2. **MySQL Workbench** instalado en la computadora.
3. **Java JDK 17** y Maven (incluido con `.\mvnw.cmd`).

---

## 2. Paso a Paso: Conexión en MySQL Workbench

### Opción A: Conexión a Base de Datos en la Nube (Aiven Cloud)
1. Abre **MySQL Workbench**.
2. En la pantalla de inicio, haz clic en el botón **`+`** (junto a *MySQL Connections*).
3. Configura los parámetros:
   * **Connection Name:** `Aiven Cloud - Horario UTP`
   * **Connection Method:** `Standard (TCP/IP)`
   * **Hostname:** `mysql-horario-utp-horario.k.aivencloud.com`
   * **Port:** `26871`
   * **Username:** `horario_admin` (o `avnadmin`)
   * **Default Schema:** `horariodb`
4. En la pestaña **SSL**:
   * **Use SSL:** Seleccionar `Require` o `If Available`.
5. Haz clic en **Test Connection**, introduce tu contraseña y pulsa **OK**.
6. *(Opcional)* Como la base de datos ya fue desplegada y poblada en la nube, al ingresar verás inmediatamente las 5 tablas creadas (`students`, `student_schedules`, `student_tasks`, `syllabuses`, `marketplace_items`) con los datos de prueba.

---

### Opción B: Conexión Local (XAMPP / MySQL Server Local)
1. Abre **MySQL Workbench**.
2. Haz clic en tu conexión local (generalmente **Local instance MySQL** en el puerto 3306, usuario `root`).
3. Ve al menú superior:
   * **File** -> **Open SQL Script...**
4. Selecciona el script del repositorio:
   * `docs/database/schema_mysql_workbench.sql`
5. Haz clic en el ícono del **Rayo (Execute)** para ejecutar todo el script.
6. En el panel lateral izquierdo (*Navigator* -> pestaña *Schemas*), haz clic derecho y selecciona **Refresh All**.
7. Verás la base de datos **`horariodb`** con las 5 tablas del dominio:
   * `students`: Información del estudiante y ciclo académico.
   * `student_schedules`: Horario del ciclo con asignaturas y bloques.
   * `student_tasks`: Tareas, entregas y evaluaciones ponderadas.
   * `syllabuses`: Sílabos oficiales con fórmulas y créditos.
   * `marketplace_items`: Publicaciones de apoyo y apuntes estudiantiles.

---

## 3. Generar el Diagrama Entidad-Relación (EER) en Workbench (Para Sustentación)

Los docentes suelen solicitar el diagrama visual de la base de datos:
1. En MySQL Workbench, ve al menú: **Database** -> **Reverse Engineer...** (o presiona `Ctrl + R`).
2. Mantén seleccionada la conexión local y presiona **Next**.
3. Selecciona la base de datos **`horariodb`** y presiona **Next**.
4. Deja marcadas todas las tablas y haz clic en **Execute** -> **Next** -> **Finish**.
5. Workbench abrirá una pestaña con el **Diagrama EER** interactivo mostrando las 5 entidades, sus claves primarias y sus relaciones foráneas (`CASCADE`).

---

## 4. Ejecución del Backend Conectado a MySQL

Para que el backend Spring Boot guarde y consulte directamente desde MySQL:

### Opción 1: Con MySQL Local (XAMPP / Puerto 3306)
```bash
cd backend-springboot
java -jar target/horario-backend-1.0.0.jar --spring.profiles.active=mysql
```

### Opción 2: Con Aiven Cloud MySQL
```powershell
$env:MYSQL_URL="jdbc:mysql://mysql-horario-utp-horario.k.aivencloud.com:26871/horariodb?sslMode=REQUIRED"
$env:MYSQL_USER="horario_admin"
$env:MYSQL_PASSWORD="tu_password"
java -jar target/horario-backend-1.0.0.jar --spring.profiles.active=mysql
```

---

## 5. Consultas SQL Rápidas para la Demostración

Puedes ejecutar estas consultas en la pestaña SQL de MySQL Workbench durante la sustentación:

```sql
USE horariodb;

-- 1. Ver estudiantes matriculados
SELECT id, student_code, full_name, career, current_cycle FROM students;

-- 2. Ver tareas y evaluaciones sincronizadas
SELECT course_name, title, due_date, priority, status FROM student_tasks;

-- 3. Ver fórmulas de evaluación de sílabos
SELECT course_code, course_name, credits, formula FROM syllabuses;

-- 4. Ver artículos del Marketplace
SELECT title, seller_name, category, price FROM marketplace_items;
```
