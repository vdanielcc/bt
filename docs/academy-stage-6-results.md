# ETAPA 6 — Control de asistencia

## Auditoría inicial (antes de cambios)

| Componente | BD | Backend | Frontend | Estado inicial |
|---|---|---|---|---|
| Asistencia de sesión | Tabla existente, unique sesión/alumno, cuatro estados | Entidad, DbSet y tres rutas existentes; falta servicio dedicado y consistencia | Registro existente y ruta | PARCIAL |
| Auditoría | recorded_at y updated_at; NO created_at | Herencia incorrecta intenta consultar created_at; recorded_by desde JWT | Sin salida ni versión de concurrencia | PARCIAL |
| Integridad | FK alumno CASCADE; índice alumno/estado existente; falta sesión/estado | PUT permite SCHEDULED y COMPLETED, N+1, sin cierre completo | Inicializa ABSENT y convierte horas a UTC | PARCIAL |
| Historial alumno | Datos existentes | Paginación básica, resumen carga memoria e incluye justificados/canceladas | Tab existente, sin filtros completos | PARCIAL |
| Historial clase | Vista existente | Sin endpoints dedicados | Sin tab | FALTA |
| Acceso global | Sesiones existentes | Agenda reutilizable | Listado de sesiones sin contador de asistencia | PARCIAL |
| Permisos | Roles reales existentes | Instructor asignado/sustituto puede asistencia; inicio/cierre restringido a gestores | Detalle sin enlace de asistencia | PARCIAL |

Auditoría de zeuz mediante transacción READ ONLY: class_attendance tiene 0 registros, columnas id, session_id, student_id, status, check_in_at, check_out_at, notes(500), recorded_by, recorded_at, updated_at. UNIQUE uq_class_attendance_session_student; ix_class_attendance_student(student_id,status); FK recorded_by SET NULL; sesión y alumno CASCADE. CHECK estados y orden entrada/salida. La vista vw_class_attendance_summary filtra COMPLETED pero incluye EXCUSED en el denominador y sus joins a inscripciones pueden multiplicar registros en reingresos.

Se reutilizan sesiones reales y su bloqueo transaccional, rutas existentes y componentes. Inicialización será una preparación idempotente sin insertar estados inventados: GET/initialize devuelven el padrón y los registros existentes; el primer bulk crea las filas. No se añade PENDING. La pausa histórica no puede reconstruirse porque no existen periodos de pausa; se conserva siempre la asistencia ya registrada.

## BD e integridad final

No se agregan columnas ni estados. `recorded_at` conserva la creación; `updated_at` y `recorded_by` registran modificación y actor autenticado. Se ignora `CreatedAt` heredado exclusivamente en ClassAttendance porque no existe en esta tabla. Entrada/salida continúan como DATETIME local con la fecha de sesión, expuestas como TimeOnly en el contrato operativo, sin conversión a UTC. Son opcionales para PRESENT/LATE/EXCUSED; ABSENT normaliza ambas a NULL. Salida debe ser >= llegada.

Script: `_script/bte_stage_6_class_attendance.sql`. Mantiene UNIQUE(session_id,student_id), índice existente (student_id,status) y FK de usuario SET NULL. Agrega (session_id,status) y cambia FK de alumno y sesión a RESTRICT para proteger historia, incluso ante eliminación indirecta de una clase. Corrige la vista existente `vw_class_attendance_summary`: agrega registros reales COMPLETED sin depender de inscripciones posteriores ni multiplicar reingresos; excluye EXCUSED del denominador. La API agrega con EF para permitir filtros de período y academia; no crea otra vista.

Aplicado y repetido con éxito únicamente en `athena_stage4_test`. Respaldo previo: `/root/bte-stage4/attendance-before-stage6.sql`. Zeuz, entorno y servicios de producción no fueron modificados.

## Backend y archivos

- `bte.api.DTO.Academy/ClassAttendanceDtos.cs`: contrato operativo, versión, filas, página histórica y resumen tipados.
- `bte.api.Services/ClassAttendanceService.cs`: padrón, validaciones, preparación, bulk/upsert, historial y agregación SQL.
- `ClassSessionService.cs` y `ClassSessionService.Operations.cs`: preparación sin inserciones, cierre completo, notas separadas y bloqueo reutilizado.
- `bte.api.Models/BteV1Context.cs`: mapping real, índices y FKs; reutiliza ClassAttendance y DbSet.
- `AcademyManagementController.cs`, `.Sessions.cs`, `AcademyOperationsController.cs`: delegación, historial de clase, notas y KPI mensual existente con agregación SQL y fórmula corregida.
- `ClassSessionDtos.cs`: contador de asistencia y request de notas.
- `AcademyScopeAuthorizationFilter.cs`: inicio, cierre y notas para instructor asignado/sustituto mediante roles y asignaciones reales. No concede cancelación ni edición de estructura a instructores.

## Endpoints finales

| Método | Endpoint | Descripción |
|---|---|---|
| GET | /api/class-sessions/{sessionId}/attendance | Sesión, padrón y registros conservados, nombres/documentos en bloque, versión |
| POST | /api/class-sessions/{sessionId}/attendance/initialize | Preparación idempotente del padrón, sin estados inventados |
| PUT | /api/class-sessions/{sessionId}/attendance | Upsert atómico; body `{attendance:[{studentId,status,checkInTime,checkOutTime,notes}],version}` |
| POST | /api/class-sessions/{sessionId}/start | Inicio explícito SCHEDULED → IN_PROGRESS |
| POST | /api/class-sessions/{sessionId}/complete | Cierre con asistencia completa; vacío permitido |
| PUT | /api/class-sessions/{sessionId}/notes | Notas en SCHEDULED/IN_PROGRESS; no descongela estructura |
| GET | /api/students/{studentId}/attendance | Historial paginado COMPLETED y catálogo de clases históricas autorizadas |
| GET | /api/students/{studentId}/attendance/summary | Resumen definitivo alumno por clase/período |
| GET | /api/classes/{classId}/attendance | Sesiones finalizadas paginadas con contadores |
| GET | /api/classes/{classId}/attendance-summary | Resumen definitivo clase por período |

Filtros: dateFrom/dateTo, classId y status en historial alumno; classId/dateFrom/dateTo en resumen alumno; período en clase. Paginación existente number/size, máximo 100. El estado filtra las filas; el porcentaje del período conserva todos los estados para evitar una tasa engañosa al seleccionar uno.

El GET operativo cambia de array crudo a `{session,students,version}`; frontend actualizado conjuntamente. Se conservan rutas y propiedad `attendance` del bulk. Initialize deja de inventar ABSENT. Clientes externos anteriores deben actualizarse antes de publicar.

## Reglas y concurrencia

- Asistencia siempre por ClassSession, nunca ClassSchedule.
- Padrón: enrollment_date y start_date <= fecha, end_date nulo o >= fecha; ACTIVE o inscripción histórica WITHDRAWN/COMPLETED con end_date aplicable. PAUSED no es esperado, sin liberar el cupo de ETAPA 4. Se exige vínculo alumno-academia; puede estar inactivo actualmente para no invalidar inscripción histórica.
- COMPLETED consulta registros guardados, conservando alumnos retirados/pausados después. No hay períodos de pausa almacenados: una sesión abierta refleja estado actual y fechas disponibles, sin inventar reconstrucción histórica.
- SCHEDULED permite vista previa. Solo IN_PROGRESS permite bulk. COMPLETED/CANCELLED rechazan escritura. CANCELLED devuelve padrón operativo vacío y no participa en historial definitivo ni porcentajes.
- Finalización exige estado válido por alumno esperado; cero alumnos permite cerrar. Transiciones ETAPA 5 preservadas.
- Bulk carga existentes una sola vez, valida toda la lista antes de mutar y guarda en transacción READ COMMITTED, sin petición ni consulta independiente por alumno.
- Guardado y cierre usan el mismo advisory lock de sesiones. Ambos bloquean la fila padre de clase, igual que las mutaciones de inscripción de ETAPA 4, estabilizando el padrón durante la operación.
- Versión SHA256 cubre estado, padrón y contenido/auditoría persistida. Angular siempre la envía; una versión obsoleta genera 409 sin sobrescribir. Se permite omitirla por compatibilidad: ese cliente solo obtiene serialización y atomicidad, no detección de formulario antiguo. Se relee la precisión DATETIME real antes de devolver la nueva versión.
- recorded_by proviene del usuario autenticado. El filtro global protege sesión/clase/alumno/academia. Instructor ajeno no opera por pertenecer solamente a la academia.
- Estadísticas definitivas solo COMPLETED. Tasa `(PRESENT+LATE)/(PRESENT+LATE+ABSENT)*100`, redondeada a dos decimales. EXCUSED separado; denominador vacío devuelve null y UI muestra “Sin base de cálculo”. KPI legacy del dashboard conserva 0 sin base para mantener su contrato.

## Frontend

- Ruta global `/academies/:academyId/attendance` y menú Asistencia. Reutiliza ClassSessionsComponent, por defecto hoy según fecha local del backend. Clase, hora, sala, instructores, estado y contador; SCHEDULED muestra “Pendiente de iniciar”, IN_PROGRESS “Continuar asistencia”, COMPLETED “Ver asistencia”, CANCELLED “Cancelada”.
- Ruta existente `/academies/:academyId/class-sessions/:sessionId/attendance`: AttendanceRegisterComponent renovado, controles con texto y tamaño táctil, nombre/documento, llegada/salida locales, notas, cabecera y contadores sin consultas extra.
- “Marcar todos presentes” modifica solo formulario, sin inventar hora. “Limpiar cambios” restaura snapshot del servidor. Guardado único, protección de doble envío, errores sin pérdida de datos y recarga con descarte explícito.
- Guardar y finalizar espera el bulk antes de complete. Si falla cierre informa que la asistencia quedó guardada.
- SCHEDULED requiere inicio explícito. Terminales solo lectura. Vacía muestra mensaje y permite finalizar.
- CanDeactivate sencillo reutiliza AcademyConfirmDialogComponent; beforeunload evita pérdida accidental al cerrar/recargar.
- Detalle enlaza registro/historial. Instructor autorizado puede iniciar, operar asistencia y finalizar, y editar exclusivamente notas durante IN_PROGRESS.
- AttendanceHistoryComponent en tab Asistencia de clase y alumno: carga independiente lazy, filtros por clase con nombres, fechas y estado, paginación, tasa y recuentos; llegada, salida y observación.
- `class-attendance.models.ts` y `ClassAttendanceService`: contratos sin any y traducciones centralizadas. Retirados métodos operativos obsoletos de ClassManagementService. No se duplicó la página ni el sistema de estado.

## Pruebas y regresión

- Backend focalizado: **80/80** (asistencia, sesiones, autorización y gestión). Incluye estados, fechas, pausas, duplicados, alumnos ajenos, horas, validación de cierre, vacío, versión obsoleta, inmutabilidad, tasa, notas y sustituto autorizado.
- Backend global: **405/406**. Único fallo previo: `StudentUpdateTests.SharedFormPayloadDeserializesAndValidatesWithoutLegacyContactFields`, validación Range decimal/cultura documentada antes de esta etapa.
- MySQL ETAPA 6: **21/21**, repetido sobre binario final: preparación, estados, elegibilidad, atomicidad, duplicados, carrera de dos guardados con igual versión, carrera guardado/cierre, ABSENT, hora local, versión con precisión persistida, tasa SQL 80%, paginación, retiro posterior, vista y FK protectora.
- MySQL regresión ETAPA 5: **21/21** sobre API actualizada: generación concurrente/idempotente, versiones, snapshots, movimientos, conflictos, sustituciones, cancelación, transiciones e inmutabilidad. Fixtures temporales eliminados tras ambas ejecuciones.
- Logs remotos: `/root/bte-stage4/stage6-results.log` y `/root/bte-stage4/stage5-regression-after-stage6.log`.
- ETAPAS 1–4 cubiertas por suite global y pruebas de permisos/inscripciones. Dominio competitivo sin modificaciones; pruebas existentes de eventos, categorías, competidores, llaves y resultados incluidas en suite global. El fallo previo del cronograma frontend se informa como limitación, no se presenta como aprobado.

## Alcance y publicación

No se implementaron cobros, cargos, notificaciones ni ETAPA 7. La entrega contiene código y migración comprobada en réplica. Producción no fue desplegada: aplicar antes las migraciones de ETAPAS 5 y 6 a zeuz con respaldo, publicar API y frontend juntos y comprobar acceso frontend según AGENTS.md. Pendiente aceptación del flujo con una cuenta real en entorno publicado.

## Build y evidencia local

- Restore .NET ejecutado; build y publish de backend correctos. Artefacto servidor: `release/stage6-backend/`.
- API final SHA256: `FC9AE38BFB1D97670D5A89DB2E2F092B9437F9193DDBB73CA73753B934465E5B`.
- Frontend producción compilado, sin errores TypeScript. Artefacto: `dist-stage-6/`, hash Angular `9e6ebac24a0b0353`, 16/10/2026 20:41 UTC. Verificación SEO de HTML compilado correcta. Quedan warnings CommonJS ya existentes de canvg/jspdf.
- El optimizador de Angular agotó memoria en algunos intentos; el build final terminó usando `NG_BUILD_MAX_WORKERS=1` y `NODE_OPTIONS=--max-old-space-size=4096`.
- Suite Angular general completada anteriormente: **350/352**, con los dos fallos previos de `auth.service.spec.ts` (URL localhost esperada frente al entorno configurado) y `schedule-times.spec.ts` (formato de horas). Incluye las seis pruebas nuevas del registro de asistencia.
- Repetición general tras agregar dos pruebas de contrato: Chrome se desconectó después de **146/354**, sin fallos hasta ese punto. No se informa esa ejecución incompleta como aprobada. Conjunto aislado de asistencia sobre código final: **8/8 aprobado**, incluidas las dos pruebas de contrato bulk/filtros.
- Logs locales: `stage6-restore.log`, `stage6-backend-tests.log`, `stage6-backend-focused.log`, `stage6-backend-release.log`, `stage6-frontend-build.log`, `stage6-frontend-tests.log`, `stage6-frontend-focused.log`.

La regresión no está completamente verde por los tres fallos anteriores y la repetición general interrumpida. Las comprobaciones focalizadas y MySQL distinguen la validación de esta etapa de esas limitaciones.

## Estado de entrega

Implementación de ETAPA 6 completa y validada técnicamente en código y réplica de pruebas: bulk sin N+1, solo IN_PROGRESS editable, COMPLETED inmutable, CANCELLED sin asistencia operativa, alumno/clase/academia validados, cierre exige asistencia completa, vacío permitido, LATE cuenta como presencia, EXCUSED y cancelaciones excluidos del porcentaje. ETAPAS 1–5 sin fallos nuevos en pruebas completadas; dominio de eventos sin cambios. No se presenta como desplegada ni aceptada manualmente en producción.

Pendientes reales de publicación: migraciones y despliegue coordinado en producción, aceptación con cuenta real y volver a ejecutar la suite Angular general completa en un equipo con memoria suficiente. Los tres fallos previos de las suites globales siguen documentados y fuera de las modificaciones de asistencia.

**ETAPA 6 COMPLETA — implementación y validación en réplica. Publicación en producción pendiente.**

Actualización 17/10/2026: publicación de BD y backend realizada en producción por solicitud explícita del usuario. Migraciones, servicio y consultas autenticadas verificados. Frontend recompilado para /bte/ con normalización HH:mm:ss y ocho pruebas de asistencia aprobadas. La entrega del frontend es un ZIP para instalación manual, según lo solicitado. Ver `docs/production-20261017.md`; la aceptación visual queda para cuando se instale ese paquete en el hosting web.
