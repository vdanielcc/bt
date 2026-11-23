# Gestión de clases — implementación y brechas

## Alcance disponible

El frontend utiliza Angular 17, componentes standalone, Angular Material, rutas lazy-loaded y el layout Vex. El identificador de academia se obtiene desde la ruta `academies/:academyId`; la navegación lo construye desde el usuario autenticado y no existe un `academyId` fijo.

La primera iteración funcional disponible comprende:

- CRUD con baja lógica de modalidades de entrenamiento y salas.
- Registro y edición de instructores seleccionando una persona existente.
- Listado, creación, edición, detalle y cierre lógico de clases.
- Horarios por clase con validación de conflictos delegada al backend.
- Asignación de instructores por clase.
- Inscripción y retiro lógico de alumnos.
- Asociación de planes existentes.
- Generación y transición de sesiones por clase.
- Registro de asistencia bulk optimizado para tablet.

## Rutas funcionales

| Ruta | Página |
|---|---|
| `/academies/:academyId/classes` | Listado de clases |
| `/academies/:academyId/classes/:classId` | Centro operacional de la clase |
| `/academies/:academyId/training-modalities` | Modalidades de entrenamiento |
| `/academies/:academyId/rooms` | Salas y espacios |
| `/academies/:academyId/instructors` | Instructores |
| `/academies/:academyId/class-sessions/:sessionId/attendance` | Asistencia bulk |

La creación y edición utilizan diálogos, siguiendo el patrón CRUD ya presente en el proyecto.

## Menú

Dentro de `Academia > Gestión de clases`:

1. Clases
2. Modalidades
3. Salas
4. Instructores

Se retiró el antiguo bloque duplicado `Clases`, cuyas rutas no pertenecían al esquema vigente `academies/:academyId`.

No se publican todavía accesos globales a Horarios, Sesiones, Asistencia y Calendario porque la API no dispone de consultas agregadas suficientes. Publicarlos ahora produciría pantallas incompletas o consultas N+1.

## Servicios e interfaces

- `AcademyManagementService`: dashboard, modalidades, salas, instructores y personas.
- `ClassManagementService`: clases, horarios, sesiones, planes y asistencia.
- `AcademyOperationsService`: inscripciones, instructores de clase, transiciones y consultas por alumno.
- Interfaces: `TrainingModality`, `AcademyRoom`, `AcademyInstructor`, `AcademyClass`, `ClassSchedule`, `ClassInstructorAssignment`, `ClassEnrollment`, `ClassSession`, `ClassAttendance`, `AttendanceItemRequest`, `BillingPlan` y `ClassBillingPlan`.

## Endpoints consumidos

| Método | URL | Uso |
|---|---|---|
| GET/POST | `/api/academies/{academyId}/training-modalities` | Modalidades |
| PUT/DELETE | `/api/training-modalities/{id}` | Modalidades |
| GET/POST | `/api/academies/{academyId}/rooms` | Salas |
| PUT/DELETE | `/api/rooms/{id}` | Salas |
| GET/POST | `/api/academies/{academyId}/instructors` | Instructores |
| PUT | `/api/instructors/{id}` | Instructores |
| GET/POST | `/api/academies/{academyId}/classes` | Clases |
| GET/PUT/DELETE | `/api/classes/{classId}` | Clase y cierre lógico |
| GET/POST | `/api/classes/{classId}/schedules` | Horarios |
| PUT/DELETE | `/api/class-schedules/{id}` | Horarios |
| GET/POST | `/api/classes/{classId}/instructors` | Instructores de clase |
| DELETE | `/api/class-instructors/{id}` | Instructores de clase |
| GET/POST | `/api/classes/{classId}/enrollments` | Inscripciones |
| PUT/DELETE | `/api/class-enrollments/{id}` | Estado/retiro de inscripción |
| GET | `/api/classes/{classId}/sessions` | Sesiones de una clase |
| POST | `/api/classes/{classId}/sessions/generate` | Generación de sesiones |
| POST | `/api/class-sessions/{id}/{start|complete|cancel}` | Transiciones |
| GET | `/api/class-sessions/{id}/attendance` | Asistencia |
| POST | `/api/class-sessions/{id}/attendance/initialize` | Inicialización condicional |
| PUT | `/api/class-sessions/{id}/attendance` | Guardado bulk |

## Endpoints faltantes para completar el encargo

### Listado agregado de clases

`GET /api/academies/{academyId}/classes/management`

Debe ser paginado y aceptar búsqueda, modalidad, sala, instructor, estado y día. Cada fila debería incluir nombres de modalidad/sala, horario resumido, instructor principal, inscritos y capacidad. Esto evita llamadas por cada clase.

### Horarios globales

`GET /api/academies/{academyId}/class-schedules`

Debe aceptar rango, clase, modalidad, sala, instructor y día, y devolver clase, sala e instructor resueltos. Es necesario para las vistas Semana y Lista.

### Sesiones globales

`GET /api/academies/{academyId}/class-sessions`

Debe ser paginado, aceptar rango y filtros, e incluir clase, modalidad, sala, instructor, inscritos y resumen de asistencia. También se requiere generación global si el negocio la permite.

### Detalle operacional de sesión

El `GET /api/class-sessions/{id}` actual entrega la entidad base. Se requiere un DTO con clase, modalidad, sala, instructores, alumnos esperados, estado, notas y resumen de asistencia.

### Calendario

Puede reutilizar el endpoint global de sesiones con rango. Si se integran campeonatos, la API debe entregar ambos tipos con identificador, fechas, estado y color semántico estable.

### Historial y resúmenes

Se requieren agregados de asistencia por clase y por sesión. El historial por alumno ya existe, pero no reemplaza el resumen de una clase.

### Instructor autenticado

Falta una consulta de “mis clases/sesiones” resuelta desde la identidad JWT. No debe confiar en un instructor enviado por Angular.

## Permisos

Las rutas permanecen bajo `authGuard` e interceptor JWT. El backend debe continuar validando alcance real de academia por recurso; ocultar una acción en Angular no sustituye la autorización. No se creó la vista “Mis clases” porque falta el contrato basado en la identidad autenticada.

## Decisiones pendientes

- Paginación y filtros server-side de clases, instructores y sesiones.
- DTOs agregados para eliminar IDs crudos y evitar N+1.
- Rutas globales de Horarios, Sesiones, Asistencia y Calendario.
- Detalle de instructor con clases, horarios, próximas sesiones e historial.
- Carga diferida real de cada tab del detalle de clase.
- Selector enriquecido de alumnos elegibles y plan al inscribir.
- Cuenta/saldo por alumno dentro de la clase, calculados por backend.

