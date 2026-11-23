# Prompt para Codex Backend — Funcionalidades faltantes BTE

Necesito ampliar la API REST .NET/C# de Budo Tournaments (BTE) para completar el módulo integral de gestión de academias.

El frontend es Angular 17 + Angular Material + Vex y ya implementó todas las funcionalidades respaldadas por el Swagger actual. No debes modificar el frontend desde este repositorio.

La tarea consiste en implementar correctamente los endpoints, modelos, DTOs, servicios, validaciones, autorización, migraciones y pruebas que faltan en el backend.

## 1. Reglas generales

Antes de modificar código:

1. Inspecciona completamente la solución .NET.
2. Identifica versión de .NET/EF, arquitectura, DbContext, entidades, servicios, controllers, DTOs, validadores, middleware, JWT, roles, errores, paginación, auditoría, migraciones y pruebas.
3. Revisa el Swagger actual.
4. Reutiliza entidades y convenciones reales.
5. No dupliques academias, estudiantes, personas, apoderados, eventos ni pagos existentes.
6. No reemplaces la arquitectura actual.
7. Mantén compatibilidad con todos los endpoints existentes.
8. Implementa incrementalmente y ejecuta build/tests después de cada etapa.

El backend debe ser la fuente de verdad para disponibilidad, conflictos, capacidad, inscripciones, sesiones, asistencia, cargos, saldos, morosidad, pagos, grados y notificaciones.

## 2. Respuestas y errores

Usa el contrato estándar existente y códigos `400`, `401`, `403`, `404`, `409`, `422` y `500`. Los errores de negocio deben incluir mensajes utilizables directamente por el frontend.

## 3. Inscripciones de alumnos en clases

Implementar `ClassEnrollment`:

```text
Id, ClassId, StudentId, BillingPlanId nullable, EnrollmentDate,
Status, Notes, StartDate, EndDate nullable, CreatedAt, UpdatedAt nullable
```

Estados: `ACTIVE`, `PAUSED`, `WITHDRAWN`, `COMPLETED`.

```http
GET    /api/classes/{classId}/enrollments
POST   /api/classes/{classId}/enrollments
GET    /api/class-enrollments/{id}
PUT    /api/class-enrollments/{id}
DELETE /api/class-enrollments/{id}
GET    /api/students/{studentId}/class-enrollments
```

Agregar filtros, búsqueda, paginación y ordenamiento. Validar academia, duplicidad, capacidad, vigencia de clase y plan. No eliminar físicamente historial relevante.

## 4. Instructores asignados a una clase

Implementar `ClassInstructor` con rol, principal, vigencia y estado.

Roles: `HEAD_INSTRUCTOR`, `INSTRUCTOR`, `ASSISTANT`.

```http
GET    /api/classes/{classId}/instructors
POST   /api/classes/{classId}/instructors
GET    /api/class-instructors/{id}
PUT    /api/class-instructors/{id}
DELETE /api/class-instructors/{id}
```

Validar instructor principal único, pertenencia a academia, duplicidad y solapamientos.

## 5. Instructores reales de una sesión

Implementar `ClassSessionInstructor` con rol adicional `SUBSTITUTE`.

```http
GET    /api/class-sessions/{sessionId}/instructors
POST   /api/class-sessions/{sessionId}/instructors
PUT    /api/class-session-instructors/{id}
DELETE /api/class-session-instructors/{id}
```

Un sustituto no modifica al instructor permanente. Validar disponibilidad real.

## 6. Estados y acciones de sesiones

```http
POST /api/class-sessions/{sessionId}/start
POST /api/class-sessions/{sessionId}/complete
POST /api/class-sessions/{sessionId}/cancel
```

Estados: `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. Aplicar máquina de estados y auditoría.

## 7. Asistencia por alumno

```http
GET /api/students/{studentId}/attendance
GET /api/students/{studentId}/attendance/summary
```

Incluir filtros, paginación y resumen: total, presentes, atrasos, ausentes, justificados y porcentaje calculado en backend. Agregar `checkOutAt` si falta.

## 8. Perfil integral agregado

```http
GET /api/students/{studentId}/academy-profile
```

Devolver estudiante, academia, clases activas, asistencia, resumen financiero, grados, próxima clase, apoderados, contactos y preferencias sin consultas N+1.

## 9. Estado de cuenta

```http
GET /api/students/{studentId}/billing/account-statement
```

Debe entregar saldos oficiales y movimientos cronológicos, considerando cargos, descuentos, recargos, anulaciones, pagos, asignaciones y devoluciones.

## 10. Dashboard financiero

```http
GET /api/academies/{academyId}/billing/dashboard
```

Devolver recaudado del mes, pendiente, vencido, pagos de hoy, morosos, últimos pagos y próximos vencimientos.

## 11. Morosidad agrupada

```http
GET /api/academies/{academyId}/billing/overdue
```

Agregar búsqueda, días mínimos, paginación y ordenamiento. Calcular total, cantidad, fecha más antigua, días de atraso y contacto.

## 12. Matrícula

```http
POST /api/students/{studentId}/billing/enrollment-fee
```

Crear cargo `ENROLLMENT_FEE` con monto, vencimiento y descripción, evitando duplicados.

## 13. Cobros por clase

```http
POST /api/class-sessions/{sessionId}/billing/generate
```

La API determina alumnos, planes `PER_CLASS`, exenciones, duplicados y monto. Responder generados, existentes, omitidos y errores.

## 14. Eventos y exámenes financieros

Asegurar referencias completas para cargos `EVENT_FEE` y `EXAM_FEE` sin romper pagos legacy.

## 15. Grados y exámenes

Ampliar promoción de forma compatible con evento/examen, puntaje, evaluador, certificado, documento y notas.

```http
GET  /api/students/{studentId}/grading/eligibility
POST /api/student-grading-profiles/{profileId}/promote
GET  /api/student-grading-profiles/{profileId}/history
```

La elegibilidad debe indicar requisitos de edad/tiempo, resultado y mensajes. Revalidar transaccionalmente al promover.

## 16. Canales de contacto

Implementar `PersonContactChannel` para `EMAIL` y `WHATSAPP`:

```http
GET    /api/persons/{personId}/contact-channels
POST   /api/persons/{personId}/contact-channels
PUT    /api/person-contact-channels/{id}
DELETE /api/person-contact-channels/{id}
```

Normalizar valores, manejar principal/verificado/activo y no confundir con credenciales.

## 17. Dispositivos APP

Implementar `AppDevice` para `ANDROID`, `IOS`, `WEB`.

```http
GET  /api/persons/{personId}/app-devices
POST /api/app-devices/register
POST /api/app-devices/{id}/deactivate
```

Nunca devolver push tokens completos en listados administrativos.

## 18. Preferencias de notificación

Tipos: `PAYMENTS`, `CLASSES`, `ABSENCES`, `GRADES`, `EVENTS`. Canales: `EMAIL`, `WHATSAPP`, `PUSH`.

```http
GET /api/persons/{personId}/notification-preferences
PUT /api/persons/{personId}/notification-preferences
```

El `PUT` debe aceptar actualización bulk.

## 19. Reglas de notificación

Triggers: `BEFORE_DUE`, `AFTER_DUE`, `BEFORE_CLASS`, `CLASS_CANCELLED`, `ABSENCE`, `GRADE_CHANGE`, `EVENT_REMINDER`.

```http
GET    /api/academies/{academyId}/notification-rules
POST   /api/academies/{academyId}/notification-rules
GET    /api/notification-rules/{id}
PUT    /api/notification-rules/{id}
DELETE /api/notification-rules/{id}
```

Usar offset no negativo y unidad explícita `MINUTES`, `HOURS` o `DAYS`.

## 20. Plantillas

Implementar `NotificationTemplate` con tipo, canal, asunto, cuerpo, variables soportadas y estado.

```http
GET    /api/academies/{academyId}/notification-templates
POST   /api/academies/{academyId}/notification-templates
GET    /api/notification-templates/{id}
PUT    /api/notification-templates/{id}
DELETE /api/notification-templates/{id}
```

Documentar y validar placeholders. No guardar secretos.

## 21. Cola e historial

Implementar `Notification` y `NotificationDelivery`, con estados generales y por entrega.

```http
GET  /api/academies/{academyId}/notifications/dashboard
GET  /api/academies/{academyId}/notifications
GET  /api/academies/{academyId}/notifications/history
GET  /api/notifications/{id}
POST /api/notification-deliveries/{id}/retry
```

Agregar filtros y paginación. El frontend no envía directamente a proveedores.

## 22. Procesamiento de notificaciones

Crear interfaces desacopladas para email, WhatsApp, push, dispatcher y scheduler. Usar secretos seguros. Si no hay proveedores reales, usar proveedores `Disabled/NoOp` que nunca simulen éxito.

Integrar background jobs existentes o un `BackgroundService` con cancelación, idempotencia, concurrencia controlada, logging y reintentos limitados.

## 23. Triggers automáticos

Preparar vencimientos, cargos vencidos, clases próximas/canceladas, ausencias, cambios de grado y eventos. Resolver destinatarios y preferencias en backend, respetando apoderados, zona horaria e idempotencia.

## 24. Dashboard instructor

```http
GET /api/instructors/{instructorId}/dashboard
```

Devolver clases de hoy, próximas clases, sesiones pendientes y asistencias pendientes, con autorización por alcance.

## 25. Dashboard alumno/apoderado

```http
GET /api/students/{studentId}/dashboard
GET /api/guardians/{guardianPersonId}/dashboard
```

Reutilizar relaciones reales de apoderados.

## 26. Autorización

Usar roles reales y policies de la arquitectura. Proteger finanzas, asistencia, datos personales, grados y notificaciones en backend. Aplicar alcance por academia, alumno e instructor.

## 27. Paginación

Implementar paginación server-side consistente para alumnos, inscripciones, sesiones, cargos, pagos, morosidad, notificaciones e historial. Mantener compatibilidad con contratos existentes.

## 28. Índices y restricciones

Agregar constraints para inscripción activa única, instructor principal, sesión única, asistencia única, cargos automáticos idempotentes, contactos principales y notificaciones idempotentes. Indexar academia, fecha, estado y destinatario.

## 29. Transacciones y concurrencia

Usar transacciones en inscripción/capacidad, sesiones, cargos, pagos, promoción y notificaciones. Evitar carreras y agregar row version cuando corresponda.

## 30. Migraciones y seeds

Crear migraciones EF Core y seeds solo para catálogos técnicos. No generar datos ficticios de negocio.

## 31. OpenAPI

Documentar requests, responses, enums, filtros, paginación y errores. Corregir los `GET` existentes que no declaran DTO de respuesta. No exponer entidades EF si el proyecto usa DTOs.

## 32. Tests

Agregar pruebas para capacidad, duplicidad, conflictos, sesiones idempotentes, asistencia bulk, saldos, pagos parciales, mensualidades, grados, notificaciones, reintentos y autorización.

Ejecutar:

```bash
dotnet restore
dotnet build
dotnet test
```

## 33. Orden recomendado

1. Inscripciones, instructores, sesiones y asistencia.
2. Estado de cuenta, dashboard financiero, morosidad y cargos.
3. Grados, elegibilidad y perfil agregado.
4. Contactos, dispositivos, preferencias, reglas y plantillas.
5. Cola, proveedores, scheduler, historial, retry y triggers.
6. Dashboards por rol, paginación, autorización, índices y auditoría.

Después de cada etapa ejecutar build y tests.

## 34. Entrega requerida

Reportar archivos nuevos/modificados, entidades, migraciones, endpoints y roles, DTOs, reglas, autorización, Swagger, resultados de build/tests, configuración pendiente y brechas restantes.

## 35. Criterio de finalización

La tarea termina cuando:

1. Los endpoints existen o se documenta técnicamente por qué no aplican.
2. Swagger expone contratos completos.
3. Las migraciones compilan y aplican.
4. La autorización se valida en backend.
5. Las operaciones críticas son transaccionales.
6. No se duplican entidades actuales.
7. `dotnet build` termina correctamente.
8. `dotnet test` termina correctamente.
9. El reporte final permite al frontend continuar sin inventar contratos.

Comienza inspeccionando la solución y Swagger. Implementa progresivamente siguiendo la arquitectura real del backend.
