# ETAPA 4 — Alumnos inscritos en clases

Fecha: 2026-10-16. Fuente permanente: backend-production.

## Auditoría inicial

| Componente | BD | Backend | Frontend | Estado inicial |
|---|---|---|---|---|
| Configuración etapas 1–2 | EXISTE | EXISTE | Mantenedores existentes | EXISTE |
| Horarios / instructores de clase | EXISTE | Servicios/endpoints existentes | Dialog horario existente; detalle sin tab | PARCIAL en integración visual de etapa 3 |
| class_enrollments | EXISTE | Entity, DbSet y CRUD parcial | Modelo/service; sin tab ni dialog | PARCIAL |
| student / student_academy | EXISTE | Listado de academia sin límite/búsqueda, mezcla equipos | Perfil existente | EXISTE |
| billing_plans / class_billing_plans | EXISTE | Lectura de asociaciones sin nombres | Service esperaba planes completos | PARCIAL en contrato de lectura |
| Clases de alumno | EXISTE | Listado sin nombres ni horarios | Tab ausente | FALTA integración |

La auditoría de código precedió a los cambios. Después se verificó el esquema físico en la réplica autorizada por el usuario.

## Base de datos

MySQL 8.0.46. Réplica independiente: athena_stage4_test, 117 tablas; origen zeuz, aproximadamente 104 MB. Copia consistente de estructura/datos, sin replicación continua. Se omiten triggers y eventos programados para evitar automatizaciones. Las pruebas llaman al controlador directamente, sin trabajadores de correo/cobros.

Snapshot: /root/bte-stage4/zeuz-stage4-snapshot.sql. Ejecutable: /root/bte-stage4/integration. La copia tenía cero inscripciones y cero clases ACTIVE sin horario activo antes del ensayo. Los datos temporales se limpian en la réplica; se conserva la copia.

class_enrollments contiene id, class_id, student_id, billing_plan_id, enrollment_date, start_date, end_date, status, notes (500 caracteres), created_by, created_at, updated_at y active_student_guard calculado.

Índices existentes: PK; único (class_id,active_student_guard) para ACTIVE; (class_id,status); (student_id,status); billing_plan_id; created_by. No se duplican índices ni se amplía el guard calculado: ACTIVE/PAUSED se excluyen bajo bloqueo transaccional.

FK a clase/alumno con CASCADE y plan/creador con SET NULL. EF respeta las acciones existentes. CHECK para los cuatro estados y end_date >= enrollment_date.

No hace falta DDL: _script/bte_stage_4_class_enrollments.sql contiene únicamente auditoría SELECT/SHOW. No se ejecutaron migraciones ni cambios de esquema en zeuz.

## Backend

- AcademyOperationsController.cs conserva contratos/rutas; extrae acciones de inscripción a archivo parcial. EnrollmentWrite/EnrollmentUpdate limitan notas a 500 caracteres.
- AcademyOperationsController.Enrollments.cs incorpora proyección EnrollmentRead, candidatos limitados, clases del alumno, validaciones, transiciones y EnrollmentRules.
- AcademyClassService/AcademyClassReadDto agregan conteos ACTIVE y ACTIVE+PAUSED en lista/detalle mediante SQL.
- BteV1Context mapea relaciones e índices del esquema existente.
- AcademyScopeAuthorizationFilter conserva permisos por academia; instructor consulta únicamente su clase asignada, sin administrar inscripciones.
- BillingAndGradingController.ClassPlans devuelve planes con id/nombre/estado reales y academia correcta, conforme al service Angular existente. No modifica cobros/pagos.
- No requiere AutoMapper: utiliza proyecciones EF. Validación mediante BusinessException/DataAnnotations. No duplica alumno, controlador o servicio de inscripción.

## Endpoints finales

Se mantienen rutas existentes, sin aliases/acciones por estado duplicadas.

| Método | Endpoint | Descripción |
|---|---|---|
| GET | /api/classes/{classId}/enrollments | Inscritos/historial; number, size, status, search; nombres/documentos/planes |
| POST | /api/classes/{classId}/enrollments | Inscribir alumno existente, ACTIVE inicial |
| GET | /api/class-enrollments/{id} | Detalle con referencias |
| PUT | /api/class-enrollments/{id} | Plan/notas y transición, preserva inicio |
| DELETE | /api/class-enrollments/{id} | Retiro lógico con fecha actual, conserva registro |
| GET | /api/students/{studentId}/class-enrollments | Clases, modalidad, fechas, historial/horarios; number, size, status, academyId |
| GET | /api/classes/{classId}/available-students | search mínimo 2 caracteres, máximo 20 resultados; excluye ACTIVE/PAUSED |
| GET | /api/classes/{classId}/billing-plans | Planes asociados con nombres reales |

Create recibe studentId, billingPlanId opcional, enrollmentDate y notes. PUT mantiene contrato previo: billingPlanId, startDate original, endDate, status, notes. Retirar/completar acepta endDate o usa hoy; no puede preceder a inscripción/inicio. La interfaz usa hoy.

## Frontend

- /academies/:academyId/classes: columna alumnos/cupos con conteos de API.
- /academies/:academyId/classes/:classId: tab Alumnos, tabla, búsqueda, estados, paginación, chips/progreso, loading/error/empty/reintento. Resumen muestra activos y cupos disponibles.
- /students/:studentId: tab Clases del perfil existente, con modalidad/horario/fechas/estado/historial y paginación independiente.
- ClassEnrollmentsComponent: acciones por estado/permisos y confirmación con AcademyConfirmDialogComponent.
- ClassEnrollmentDialogComponent: MatDialog, autocomplete con debounce/cancelación, fecha local, plan opcional/notas; evita doble submit, conserva diálogo ante conflicto.
- StudentClassesComponent consulta horarios agregados, sin requests por fila.
- enrollment-status.util.ts centraliza traducciones y fecha local.
- AcademyOperationsService se amplía sin duplicarlo.
- Tipos: ClassEnrollmentListItem, CreateClassEnrollmentRequest, UpdateClassEnrollmentRequest, StudentClassListItem, EnrollmentCandidate, EnrollmentStatus. Sin introducir any.

## Reglas implementadas

Una inscripción vigente ACTIVE/PAUSED por alumno/clase. PAUSED conserva cupo/registro/fecha. WITHDRAWN/COMPLETED liberan cupo, fijan término y conservan historial; no se reactivan. Reingreso crea nuevo registro.

Cada mutación abre transacción READ COMMITTED y bloquea la fila de la clase antes de validar capacidad/duplicados; serializa solicitudes concurrentes. Duplicado/capacidad/clase inactiva devuelven 409.

Inscribir/reactivar requiere clase ACTIVE y horario activo. Exige relación activa student_academy en la academia de la clase. Plan NULL válido; plan informado debe estar activo, vigente y asociado a clase/academia. No crea Person/Student.

Reutiliza autorización por rol/academia. Instructor solo consulta su clase; alumnos/apoderados no administran. No genera cargos, mensualidades, sesiones ni asistencias. No modifica entidades competitivas.

## Verificación

- Backend restore/build: OK. Publicación Release portable del ejecutable de integración: OK. Advertencias de nullable/recuperación de fuente ya presentes.
- Frontend npm run build: OK, salida dist-stage-4; comprobación SEO OK. Advertencias CommonJS de canvg/jspdf ya existentes.
- Backend global: 369 correctas / 370. Único fallo: StudentUpdateTests.SharedFormPayloadDeserializesAndValidatesWithoutLegacyContactFields, por parseo de Range decimal con cultura local. Está documentado antes de esta etapa en docs/academy-stage-2-results.md; no se modifica código de alumnos ajeno a la inscripción.
- Backend de inscripción: 10/10 correctas. La prueba nueva de permisos en AcademyScopeTests también pasa: academia propietaria, academia ajena, anónimo e instructor de clase asignada sin permiso de escritura.
- Frontend global: 326 correctas / 328. Pasan las seis nuevas pruebas de inscripción (contratos/filtros, candidatos/clases, conflicto mantiene diálogo, doble submit y búsqueda con debounce). Fallos previos documentados en etapa 2: auth.service.spec.ts espera localhost en vez de la URL configurada; schedule-times.spec.ts espera un rango horario frente a la hora inicial devuelta. El recorrido existente de clases pasa.
- MySQL real sobre athena_stage4_test: 18 comprobaciones correctas. Concurrencia con dos DbContexts/conexiones contra el controlador real: exactamente un 201 y un 409 para el último cupo. Listados y horario agregado se ejecutan mediante SQL real. También pasan duplicados ACTIVE/PAUSED, pausa/reactivación, retiro con término, historial inmutable, reingreso, liberación por COMPLETED/WITHDRAWN, academia ajena, plan/fecha inválidos y clase INACTIVE/CLOSED/sin horario.
- Evidencia remota: /root/bte-stage4/mysql-results.log. La clase/horario/inscripciones temporales se eliminaron al terminar; la réplica se conserva.

## Regresión y límites

| Área | Resultado |
|---|---|
| ETAPA 1 | OK en tests automatizados existentes; tablas físicas presentes |
| ETAPA 2 | OK en tests y recorrido Angular existentes; lista/detalle con agregados SQL reales |
| ETAPA 3 | Servicios/horarios/instructores existentes pasan sus tests; integración visual completada posteriormente por solicitud del usuario, con 25 tests frontend de clases correctos |
| Eventos | Sin cambios en sus implementaciones; tests de eventos/categorías/competidores/inscripciones/fixtures pasan. Persiste el fallo previo de expectativas del cronograma |

No se afirma aceptación manual en el hosting público. No se publicaron frontend/API ni se reinició bte-api.service. No se modificó /etc/bte-api.env. La única operación de infraestructura fue crear la copia solicitada para pruebas.

## Reproducción

- dotnet restore backend-production/bte.api.csproj
- dotnet build backend-production/bte.api.csproj --no-restore
- dotnet test backend-production/tests/bte.api.Tests/bte.api.Tests.csproj --no-restore
- npm test -- --watch=false --browsers=ChromeHeadless --progress=false
- npm run build -- --output-path dist-stage-4
- Ejecutable MySQL: backend-production/tests/stage4-mysql. Requiere BTE_TEST_MYSQL_CONNECTION y rechaza toda base cuyo nombre no sea exactamente athena_stage4_test. Invoca el controlador real; no inicia la API pública ni sus tareas de fondo.

## Artefactos preparados

- Frontend de producción: dist-stage-4, compilación final y SEO correctos.
- Backend de producción: release/stage4-backend.
- SHA256 de bte.api.dll: f2745a2a3d379ccdeb51919bf11beb767628e9b183108db1e88114c98b9fb1d6.
- Fuente del ensayo reproducible: backend-production/tests/stage4-mysql; ejecutable portable en release/stage4-mysql.
- No se incluyen credenciales en código, documentación o artefactos del ensayo.

## Pendientes reales y cierre

1. Desplegar la API y frontend revisados si se solicita publicación y efectuar aceptación autenticada de la interfaz contra esa API. La versión pública aún no incorpora estos cambios.
2. La integración visual de horarios/instructores se completó posteriormente por solicitud del usuario. Ver docs/academy-stage-3-visual.md. Se reutilizan los endpoints existentes; sus restricciones de consulta siguen siendo autoridad.
3. Resolver por separado los tres fallos globales preexistentes documentados arriba; no hay fallos nuevos de inscripción ni errores TypeScript.

ETAPA 4 PARCIAL respecto al cierre de punta a punta solicitado: inscripción implementada y verificada técnica/relacionalmente; falta aceptación de la interfaz con el despliegue final. La dependencia visual de ETAPA 3 se completó posteriormente. No avanzar a ETAPA 5.
