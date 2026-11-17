# Rule: Prohibición Estricta de Fallbacks Silenciosos, Mocks Engañosos y Datos Ficticios (Zero Silent Fallbacks & Honest UI)

## 1. Directiva Fundamental (Tolerancia Cero a Fallbacks Engañosos)
Queda **TERMINANTEMENTE PROHIBIDO** implementar "fallbacks" silenciosos, simulaciones en memoria, mocks en tiempo de ejecución o estados optimistas ficticios que oculten fallos del servidor, problemas de red o errores de base de datos.
La aplicación DEBE **fallar de forma rápida, ruidosa y honesta (Fail-Fast & Honest System)**.

Bajo ninguna circunstancia se debe engañar al usuario ni al desarrollador haciéndole creer que una operación (guardado, actualización, eliminación o consulta) fue exitosa cuando en realidad el backend, la red o la base de datos respondieron con error.

---

## 2. Mandatos Específicos para el Desarrollo

### 2.1. Cero Fallbacks en Operaciones Mutacionales (POST, PUT, PATCH, DELETE)
- **Prohibido el `addItem(fallbackItem)` o actualización optimista ciega:** Si una petición de publicación (`POST`), edición (`PATCH/PUT`) o eliminación (`DELETE`) falla o devuelve `null`/error HTTP (4xx, 5xx):
  - **NUNCA** crear un objeto simulado con `id: Date.now()` o datos temporales en el Store, Signal o State para "parchar" la UI.
  - **NUNCA** cerrar el modal ni limpiar el formulario fingiendo éxito.
  - **SIEMPRE** detener el flujo, marcar `isSubmitting = false`, mostrar un mensaje de error visible y explícito (ej. alerta o toast descriptivo del fallo) y mantener los datos ingresados por el usuario intactos para que pueda corregir o reintentar.
- El estado del cliente **SOLO** se actualiza cuando el backend responde con `200/201 OK` y devuelve la entidad real persistida con su ID oficial generado por la base de datos.

### 2.2. Cero Mocks Silenciosos en Servicios y Consultas (GET)
- **Prohibido el `catchError(() => of(fakeItems))`:** Si un endpoint de consulta falla:
  - **NUNCA** sustituir el error por arrays con productos, cursos, horarios o eventos ficticios de relleno (`defaultCourses`, `mockProducts`, etc.).
  - Si la llamada falla, el error debe propagarse al Store o componente para que la interfaz muestre el **estado de error real**: *"No se pudo conectar con el servidor. Reintentar"*.
  - Si la respuesta es exitosa pero la lista está vacía (`[]`), se muestra el **estado vacío legítimo**: *"No hay elementos disponibles"*, NUNCA inyectar semillas ficticias en tiempo de ejecución.

### 2.3. Cero Operadores OR Ciegos que Inventen Métricas (`|| fakeValue`)
- Prohibido el uso de valores de relleno automáticos que distorsionen la realidad:
  - ❌ `rating: Number(raw.rating) || 5.0` (¡PROHIBIDO! Si no tiene calificación, es `0` o `null`, jamás asumir 5 estrellas).
  - ❌ `salesCount: raw.salesCount || 1` (¡PROHIBIDO! Si no tiene ventas, es `0`).
  - ❌ `badge: raw.badge || 'NUEVO EN CAMPUS'` (¡PROHIBIDO! Los badges solo existen si vienen explícitamente de la base de datos o lógica de negocio validada).
  - ❌ Hashtags inventados (`#UTP`, `#Emprendimiento`, `#Venta`) o textos por defecto como *"Publicación en el marketplace estudiantil UTP"* a menos que el usuario los haya redactado textualmente.

### 2.4. Manejo Honesto de Errores en la UI
- Todo error debe ser comunicado de manera fidedigna al usuario.
- Si un servicio externo (Supabase, API Externa UTP, MySQL/H2) está pausado, caído o devuelve 401/403/500, el sistema debe reportar el estado técnico exacto sin disfraces.

---

## 3. Protocolo de Auditoría y Refactorización Obligatoria
Cualquier agente, subagente o ingeniero que intervenga en este repositorio y detecte:
1. `catchError` que devuelva `of(mockData)` o datos semilla ocultando un error HTTP.
2. `fallbackItem` en bloques `else` o handlers de fallo.
3. Arrays estáticos de respaldo usados como reemplazo transparente de endpoints caídos.
**Tiene la obligación ineludible de eliminarlos de inmediato y reemplazarlos por el manejo de error explícito y fiel.**
