# Gestión integral de academias — implementación frontend

## Base técnica verificada

- Angular 17.0.x, Angular Material 17.0.x y Vex 17.
- Componentes standalone y rutas lazy-loaded.
- RxJS para estado asíncrono; no existe store global.
- Autenticación JWT mediante guard e interceptor.
- API inspeccionada desde `http://localhost:5262/swagger/v1/swagger.json`.

## Rutas incorporadas

- `/academies/:academyId/dashboard`
- `/academies/:academyId/training-modalities`
- `/academies/:academyId/rooms`
- `/academies/:academyId/instructors`
- `/academies/:academyId/classes`
- `/academies/:academyId/classes/:classId`
- `/academies/:academyId/class-sessions/:sessionId/attendance`
- `/academies/:academyId/billing`
- `/academies/:academyId/billing-plans`
- `/academies/:academyId/charges`
- `/academies/:academyId/payments`
- `/academies/:academyId/styles`
- `/academies/:academyId/grading-systems`
- `/academies/:academyId/grading-systems/:systemId/levels`
- `/students/:studentId`

## Funcionalidad implementada

- Dashboard agregado de academia.
- CRUD de modalidades, salas, instructores, clases, horarios y planes.
- Asociación de planes a clases y selección de plan predeterminado.
- Consulta y generación backend de sesiones.
- Inicialización y registro bulk de asistencia.
- Panel financiero, morosidad, mensualidades, cargos y pagos.
- Asignación bulk y parcial de pagos.
- Estilos, sistemas y escalas modelados según Swagger.
- Belt badge reutilizable.
- Perfil integral del alumno con saldo, cargos, pagos y grados.
- Alta de perfil de grado, promoción e historial.
- Menú Vex ampliado sin reemplazar el tema ni agregar Bootstrap.

## Endpoints utilizados

| Método | URL | Uso |
|---|---|---|
| GET | `/api/academies/{academyId}/dashboard` | Dashboard agregado |
| GET/POST | `/api/academies/{academyId}/training-modalities` | Modalidades |
| GET/PUT/DELETE | `/api/training-modalities/{id}` | Detalle modalidad |
| GET/POST | `/api/academies/{academyId}/rooms` | Salas |
| GET/PUT/DELETE | `/api/rooms/{id}` | Detalle sala |
| GET/POST | `/api/academies/{academyId}/instructors` | Instructores |
| GET/PUT | `/api/instructors/{id}` | Detalle/desactivación instructor |
| GET | `/api/persons` | Selector de persona existente |
| GET/POST | `/api/academies/{academyId}/classes` | Clases |
| GET/PUT/DELETE | `/api/classes/{id}` | Detalle clase |
| GET/POST | `/api/classes/{classId}/schedules` | Horarios |
| PUT/DELETE | `/api/class-schedules/{id}` | Edición de horario |
| GET/POST | `/api/classes/{classId}/billing-plans` | Planes de clase |
| DELETE | `/api/classes/{classId}/billing-plans/{planId}` | Quitar plan |
| GET | `/api/classes/{classId}/sessions` | Sesiones |
| POST | `/api/classes/{classId}/sessions/generate` | Generación de sesiones |
| POST | `/api/class-sessions/{sessionId}/attendance/initialize` | Inicializar asistencia |
| GET/PUT | `/api/class-sessions/{sessionId}/attendance` | Asistencia bulk |
| GET/POST | `/api/academies/{academyId}/billing-plans` | Planes/membresías |
| PUT/DELETE | `/api/billing-plans/{id}` | Edición de plan |
| GET | `/api/academies/{academyId}/billing/charges` | Cargos y morosidad |
| POST | `/api/academies/{academyId}/billing/monthly/generate` | Mensualidades |
| GET | `/api/billing/concepts` | Conceptos reales |
| POST | `/api/billing/charges` | Crear cargo |
| GET/POST | `/api/academies/{academyId}/billing/payments`, `/api/billing/payments` | Pagos |
| POST | `/api/billing/payments/{id}/allocate` | Asignación bulk |
| GET | `/api/students/{studentId}/billing/balance` | Saldo oficial |
| GET | `/api/students/{studentId}/billing/charges` | Cargos del alumno |
| GET | `/api/students/{studentId}/billing/payments` | Pagos del alumno |
| GET/POST | `/api/grading-systems` | Sistemas de grado |
| GET/POST | `/api/grading-systems/{systemId}/levels` | Escalas |
| GET/POST | `/api/students/{studentId}/grading-profiles` | Perfiles de grado |
| POST | `/api/student-grading-profiles/{profileId}/promote` | Promoción |
| GET | `/api/student-grading-profiles/{profileId}/history` | Historial |

## Brechas verificadas en Swagger

No se simularon estas funciones porque la API no expone endpoints:

- Inscripciones de alumnos a clases (`ClassEnrollment`).
- Instructores permanentes por clase (`ClassInstructor`).
- Instructores reales o sustitutos por sesión (`ClassSessionInstructor`).
- Cambio explícito de estado de una sesión (iniciar/finalizar/cancelar).
- Historial o resumen de asistencia por alumno.
- Estado de cuenta cronológico consolidado (`account-statement`).
- Listado agregado de morosidad por alumno con contacto.
- Generación específica de matrícula y cobros por clase.
- Dashboard financiero agregado con montos oficiales.
- Exámenes/eventos de grado con puntaje, evaluador, certificado y documento.
- Elegibilidad de promoción como endpoint dedicado.
- Notificaciones, reglas, plantillas, preferencias, entregas y reintentos.
- Canales de contacto de persona y dispositivos push.
- Dashboard de instructor, alumno y apoderado.
- Perfil agregado `/api/students/{id}/academy-profile`.

Además, Swagger no declara esquemas de respuesta para varios endpoints `GET`; el frontend conserva tipado fuerte para entidades publicadas y usa contratos abiertos solo donde la API omite el DTO.

## Validación

- `npx tsc --noEmit -p tsconfig.app.json`: exitoso.
- Build producción aislado: exitoso.
- `npm test -- --watch=false --browsers=ChromeHeadless`: 3/3 exitosos.
- Se agregó `karma-coverage-istanbul-reporter`, requerido por el `karma.conf.js` existente y ausente de dependencias.

