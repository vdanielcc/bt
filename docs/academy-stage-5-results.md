# ETAPA 5 — Auditoría inicial

| Componente | BD (modelo local) | Backend | Frontend | Estado inicial |
|---|---|---|---|---|
| class_sessions | Entity/DbSet/índice único existentes | Generación parcial; lectura sin agregados, sin edición/manual | Service/modelo parciales; sin página ni tab | PARCIAL |
| class_session_instructors | Entity/DbSet existentes | CRUD parcial sin bloqueo histórico ni conflicto por persona entre academias | Sin UI de sesión | PARCIAL |
| Generador | Tabla existente | Filtra vigencias pero no clase activa/sala válida, copia asignaciones inactivas y valida fuera de transacción | Sin diálogo | PARCIAL |
| Estados | Cuatro estados existentes | Acciones existentes, motivo requiere trim y mutaciones transaccionales | Sin acciones operativas de sesión | PARCIAL |
| Zona horaria | País sin timezone en entity | Servicio configurable por academia, default global Santiago | Sin contexto de sesión | PARCIAL |
| Dashboard | Sesiones existentes | Ya usa class_sessions | Dashboard existente | EXISTE |
| Calendario académico | Sin página específica encontrada | No listado global agregado de sesiones | Solo calendario genérico de plantilla | FALTA |

Se reutilizan servicios, entidades, rutas y autorización existentes. No se desarrolla asistencia, cobros, notificaciones ni sincronización automática futura.

## Esquema físico y cambio incremental

Auditoría ejecutada en athena_stage4_test, réplica de zeuz previamente autorizada. class_sessions y class_session_instructors existen con FK, CHECK de estado/roles/horas y todos los índices operativos. class_sessions tenía cero filas antes de las pruebas.

class_sessions: id, class_id, schedule_id nullable, room_id nullable, session_date DATE, start_time/end_time TIME, status VARCHAR(20), cancellation_reason VARCHAR(500), notes VARCHAR(1000), created_by, created_at, updated_at. Índice único existente (class_id,session_date,start_time), índices (session_date,status), (room_id,session_date,start_time), schedule_id y created_by. FK hacia clase, horario, sala y usuario.

class_session_instructors: id, session_id, academy_instructor_id, role, status, created_at, updated_at. Único existente (session_id,academy_instructor_id), índice de instructor, FK a sesión e instructor; roles incluyen SUBSTITUTE. Desasignar conserva la fila INACTIVE y una nueva asignación del mismo instructor a esa sesión reutiliza esa fila, conforme al único existente.

Único cambio de BD requerido: generated_for_date DATE nullable y único uq_class_session_origin(class_id,generated_for_date). Es la fecha original inmutable de una ocurrencia generada. Permite mover fecha/hora puntualmente y regenerar el rango sin recrear la ocurrencia original. Las sesiones manuales guardan NULL. No se agregan session_type ni tablas duplicadas.

Script: _script/bte_stage_5_class_sessions.sql. Comprueba duplicados recurrentes antes de extender el esquema y rellena la fecha de origen de sesiones generadas existentes. No escoge ni elimina registros ambiguos. Si ya existieran sesiones movidas antes de esta migración, el origen anterior no es reconstruible automáticamente: revisar esos registros antes de aplicarla. En la copia auditada no existían sesiones.

Se aplicó la extensión solo en athena_stage4_test tras respaldar class_sessions en /root/bte-stage4/class_sessions-before-stage5.sql. No se modificó zeuz. Aplicar el script antes de instalar la API nueva en un entorno con el esquema anterior. No ejecutar migraciones EF automáticamente.

## Backend implementado

- ClassSession y BteV1Context: fecha de origen, índice único y mapeos de FK/tamaños correspondientes al esquema físico existente. No se renombra ninguna tabla.
- ClassSessionDtos: SessionWrite, SessionRead, SessionInstructorRead y SessionGenerationResult.
- ClassSessionService: se conserva el servicio existente. GenerateAsync mantiene su retorno int para consumidores previos y delega al generador completo GenerateDetailedAsync. Las operaciones nuevas están en ClassSessionService.Operations.cs. InitializeAttendanceAsync preexistente no se modifica ni se invoca al generar/finalizar sesiones.
- IClassSessionService: contratos tipados para lectura, generación, sesión manual, edición, transiciones y asignaciones puntuales.
- AcademyManagementController.Sessions.cs: listado global/clase, detalle, generación, creación manual y edición. Se sustituyen las acciones parciales anteriores en el mismo controlador, sin rutas paralelas.
- AcademyOperationsController.Sessions.cs: reutiliza las rutas existentes de instructores y start/complete/cancel, delegando al mismo servicio.
- AcademyScopeAuthorizationFilter: propiedad de academia en lectura/escritura, instructor solo consulta detalles/asignaciones que la autorización real le permite. No se otorgan permisos de iniciar/finalizar a instructor automáticamente.
- AcademyTimeZoneService: academia por override configurable; si no existe, país ISO2 del representante registrado mediante la misma relación que utiliza AcademyCountryDocumentHelper. Countries no tiene timezone en el modelo. AcademyTimeZones:Countries configura el mapa de países y AcademyTimeZones:Overrides resuelve zonas específicas, incluidas excepciones de países con varias zonas. País sin configuración devuelve error claro en lugar de aplicar Santiago globalmente. Servicio pasa a Scoped por utilizar DbContext. Las fechas y horas de sesiones son locales y no se convierten a UTC.
- Edición de horario ya referenciado por sesiones: conserva la versión anterior y crea otra con EffectiveFrom posterior, cerrando la vigencia anterior sin tocar sesiones. Se rechazan dos horarios vigentes del mismo día aunque sus horas no se solapen. Este ajuste completa la dependencia histórica necesaria para las sesiones.
- Sin AutoMapper nuevo: proyecciones EF y consultas agregadas. Validadores de negocio se concentran en el servicio existente, usando BusinessException y DataAnnotations.

## Endpoints finales

| Método | Endpoint | Descripción |
|---|---|---|
| GET | /api/academies/{academyId}/class-sessions | Agenda agregada, zona horaria y fecha local |
| GET | /api/classes/{classId}/sessions | Sesiones por clase, ordenadas por fecha/hora |
| POST | /api/classes/{classId}/sessions/generate | Generación, devuelve created/existing/skipped/errors |
| POST | /api/classes/{classId}/sessions | Sesión manual, sin schedule_id |
| GET | /api/class-sessions/{id} | Detalle, sala, modalidad, instructores y alumnos esperados |
| PUT | /api/class-sessions/{id} | Fecha/horas/sala/notas de sesión SCHEDULED |
| GET | /api/class-sessions/{sessionId}/instructors | Instructores actuales de la sesión |
| POST | /api/class-sessions/{sessionId}/instructors | Asignar instructor, incluye SUBSTITUTE |
| PUT | /api/class-session-instructors/{id} | Editar asignación puntual existente |
| DELETE | /api/class-session-instructors/{id} | Desasignación lógica, solo SCHEDULED |
| POST | /api/class-sessions/{sessionId}/start | SCHEDULED a IN_PROGRESS |
| POST | /api/class-sessions/{sessionId}/complete | IN_PROGRESS a COMPLETED |
| POST | /api/class-sessions/{sessionId}/cancel | SCHEDULED a CANCELLED, motivo obligatorio |

El listado global admite dateFrom/dateTo, classId, trainingModalityId, roomId, instructorId y status. Por defecto muestra una semana desde la fecha local de la academia. Se limita el rango solicitado a 366 días de diferencia; el usuario puede consultar otros rangos históricos. Se devuelve una lista agregada y los instructores se cargan en bloque, sin consultas por fila. El conteo esperado se calcula en SQL.

Generación: body dateFrom/dateTo. Manual/edición: sessionDate, startTime, endTime, roomId, notes; classId viene de la ruta al crear y no se puede reasignar al editar. Cancelación: reason no vacío, máximo 500 caracteres.

## Reglas y concurrencia

- Generación solo en clase ACTIVE/IsActive, con horarios activos vigentes y dentro de vigencia de clase. Respeta las versiones EffectiveFrom/EffectiveTo y día ISO lunes=1/domingo=7. Múltiples horarios aplicables al mismo día producen error de configuración, nunca selección arbitraria.
- Snapshot explícito de sala: horario o sala principal; debe ser activa y pertenecer a la academia. Snapshot de instructores según asignación ACTIVE, fechas y vigencia/actividad del instructor. Inactivos o inválidos se reportan; sesiones futuras ya generadas conservan sus instructores y la UI los marca para revisión.
- Idempotencia conserva estado, notas, sala, instructores y origen incluso al mover una sesión. Sesiones canceladas/completadas siguen existiendo; no se sincronizan ni sobrescriben desde el horario.
- Mutaciones operativas utilizan transacción READ COMMITTED y un advisory lock MySQL por base de datos. Se libera explícitamente antes de devolver la conexión al pool. Serializa generación/edición/asignaciones/estados entre academias para proteger conflictos de la misma persona física. Es una estrategia conservadora: no paraleliza escrituras independientes de sesiones dentro de la misma BD.
- Conflictos reales por sala/fecha/solapamiento e instructor por PersonId entre academias. También considera reservas recurrentes todavía sin una ocurrencia operativa. Una ocurrencia generada, incluso movida/cancelada, prevalece sobre su planificación. Horarios contiguos no se consideran conflicto.
- Solo SCHEDULED permite editar fecha/hora/sala/notas o instructores. Cambiar una sesión no modifica ClassSchedule ni ClassInstructor.
- Cancelar exige motivo; no se elimina sesión. No se permite cancelar IN_PROGRESS ni completar directamente SCHEDULED. Las sesiones COMPLETED/CANCELLED son históricas y de consulta.
- No se crean registros de asistencia, cargos, pagos ni notificaciones. La infraestructura preexistente de etapas futuras permanece intacta y fuera del flujo nuevo.

## Frontend

- Menú Academia → Gestión de clases: Sesiones y Calendario, sin duplicar el calendario genérico de plantilla.
- /academies/:academyId/class-sessions: listado con filtros de fecha, clase, modalidad, sala, instructor y estado; datos agregados, alumnos esperados, estados traducidos y acciones válidas. Diálogos de generar/crear sesión extraordinaria.
- /academies/:academyId/calendar: calendario mensual de sesiones reales, incluidas canceladas/completadas históricas. Usa la misma consulta agregada, con navegación de mes y días alineados por semana.
- /academies/:academyId/class-sessions/:sessionId: detalle operativo, origen recurrente/manual, notas, motivo, alumnos esperados e instructores. Editar, sustituto, desasignar, iniciar, finalizar y cancelar según estado/rol.
- Detalle de clase: tab Sesiones con próximas/históricas/ambas y filtros de rango. Mantiene Horarios, Instructores y Alumnos de etapas anteriores.
- ClassSessionsComponent, SessionDetailComponent y SessionDialogComponent. Formularios mantienen datos ante 409, evitan doble envío y muestran errores reales. Resultado de generación muestra creadas/existentes/omitidas y detalles de errores, sin cerrar automáticamente.
- ClassManagementService se amplía para recursos hijos; AcademyOperationsService mantiene transiciones existentes. Sin servicios duplicados.
- class-session.models.ts: ClassSessionListItem, ClassSessionDetail, ClassSessionInstructor, GenerateClassSessionsRequest/Result, CreateClassSessionRequest, UpdateClassSessionRequest, CancelClassSessionRequest, filtros/agenda y traducciones centralizadas. No se introduce any.
- Instructor puede abrir detalle individual si la API autoriza su asignación; el guard frontend no concede acceso global ni acciones administrativas. No se crea vista Mis sesiones, que es opcional.
- El dashboard conserva class_sessions como fuente. Se elimina su fallback a instructores permanentes actuales cuando una sesión no tiene asignación; muestra Sin asignar. Las próximas sesiones ahora incluyen sala, instructores snapshot y alumnos esperados reales mediante consultas agregadas, en lugar de campos vacíos.

## Límites de datos históricos

El conteo de alumnos esperados utiliza inscripción/inicio/término reales, deduplicando alumnos. PAUSED actual se excluye. No existe un registro detallado de pausas por periodo, por lo que no se puede reconstruir con exactitud cuántos alumnos estaban pausados en una fecha histórica; no se inventa ese dato ni se crean asistencias para simularlo.

La sincronización explícita de sesiones futuras con horarios y la generación global por academia quedan fuera de la primera implementación: solo se genera por clase y no hay sincronización automática.

## Verificación y entrega

Backend restore/build/publish: OK, sin errores de compilación; persisten advertencias nullable de la fuente recuperada. Frontend producción y comprobación SEO: OK.

Pruebas backend globales: 387 correctas / 388, con el fallo previo StudentUpdateTests.SharedFormPayloadDeserializesAndValidatesWithoutLegacyContactFields por interpretación cultural de un Range decimal. Está documentado desde etapas anteriores; no corresponde a sesiones. Las 56 pruebas enfocadas de sesiones y permisos pasan. Incluyen 17 casos de sesiones (versiones, idempotencia, snapshots, conflictos, estados, origen, zona por país y límites de texto) y la nueva prueba de permisos de sesiones.

Pruebas frontend globales: 344 correctas / 346. Pasan las 9 pruebas nuevas de sesiones y la regresión de clases/horarios/instructores/alumnos. Continúan los fallos previos documentados de auth.service.spec.ts (URL esperada localhost frente a configuración actual) y schedule-times.spec.ts (texto esperado de intervalo frente a hora inicial). No se modifica el motor competitivo para alterar esos resultados.

El ensayo MySQL final pasó 21 comprobaciones en athena_stage4_test con conexiones independientes, contra el servicio/controlador real y SQL real; no es una simulación InMemory de concurrencia. Su ejecutable rechaza cualquier base con otro nombre. Se verifica origen tras reprogramación, versiones, snapshots, generación concurrente, manual, sustitutos, persona física entre academias, estados/historial, ausencia de asistencia y datos operativos del dashboard. Evidencia remota: /root/bte-stage4/stage5-results.log. Se comprobó la eliminación de clases, sesiones y asignaciones temporales al terminar (cero filas temporales). Se conserva la réplica y su extensión de esquema. El SHA256 del ensamblado remoto coincide con el artefacto local.

La prueba adicional de dashboard identificó y corrigió su lectura previa de una columna created_at inexistente en class_attendance: ahora proyecta solo SessionId/Status que utiliza. No se implementa registro de asistencia ni se altera esa tabla.

## Regresión

| Área | Verificación |
|---|---|
| ETAPA 1 | Tests de configuración/modalidades/salas/instructores/estilos correctos |
| ETAPA 2 | Tests de clases, creación/edición/listado/estado correctos |
| ETAPA 3 | Tests visuales de horarios/instructores correctos; versión de horario referenciado probada |
| ETAPA 4 | Tests de inscripción, cupos, historial y permisos correctos |
| Eventos | Compilan sus rutas y pasan tests de eventos/categorías/competidores/inscripciones/fixtures/resultados; persiste el fallo previo de expectativas del cronograma |

No se afirma una aceptación manual en el hosting público. No se publicaron cambios, no se reinició bte-api.service y no se modificó /etc/bte-api.env.

## Artefactos y reproducción

- Frontend: dist-stage-5.
- Backend portable completo: release/stage5-backend.
- SHA256 de bte.api.dll: 1c8342d072b08647787540f146eb2c9d240516c90da147bcc30920ca62ed7e56.
- Ensayo MySQL: backend-production/tests/stage5-mysql y release/stage5-mysql. Requiere BTE_TEST_MYSQL_CONNECTION hacia athena_stage4_test. No inicia trabajadores ni servicios públicos.
- Script de esquema: _script/bte_stage_5_class_sessions.sql.
- dotnet restore backend-production/bte.api.csproj
- dotnet build backend-production/bte.api.csproj --no-restore
- dotnet test backend-production/tests/bte.api.Tests/bte.api.Tests.csproj --no-restore
- npm run build -- --output-path dist-stage-5
- npm test -- --watch=false --browsers=ChromeHeadless --progress=false

## Pendientes reales y estado

1. Respaldar/aplicar el script de esquema en el entorno final antes de instalar la API nueva; después publicar frontend/API y efectuar aceptación autenticada con ambos conectados. El despliegue productivo no fue solicitado en esta tarea.
2. Configurar overrides de zona horaria si una academia utiliza una zona distinta de la convención configurada para su país, o si su país aún no está en AcademyTimeZones:Countries.
3. Resolver por separado los tres fallos globales preexistentes; no hay fallos nuevos de sesiones ni errores TypeScript.

ETAPA 5 PARCIAL según el cierre de punta a punta: implementación y verificación técnica completas en la réplica; falta migración/despliegue final y aceptación de la interfaz con esa API. No avanzar a ETAPA 6.

Actualización 17/10/2026: se completó posteriormente ETAPA 6 y se publicó el backend acumulado y las migraciones de ETAPAS 5 y 6 en producción zeuz, con respaldos y comprobaciones autenticadas correctas. El estado anterior corresponde al cierre original de este informe. Ver `docs/production-20261017.md` para evidencia y entrega del frontend.
