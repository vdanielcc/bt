# ETAPA 10 — Grados, cinturones y progresión técnica

Verificación: 18 de octubre de 2026. Código local y réplica `athena_stage4_test`. Sin despliegue en producción. No se avanzó a ETAPA 11.

## Auditoría previa de ETAPA 9

No fue necesario modificar finanzas ni repetir SQL de etapas anteriores.

| Componente | Estado inicial | Corrección / evidencia |
|---|---|---|
| Payment states | COMPLETO | PENDING → CONFIRMED/REJECTED/VOID; CONFIRMED → REFUNDED; terminales sin reapertura. |
| Allocations | COMPLETO | Editables solo en PENDING; confirmar exige distribución exacta del monto. |
| Saldo | COMPLETO | Solo allocations de pagos CONFIRMED. |
| Refund | COMPLETO | Motivo obligatorio, allocations conservadas, recálculo y COMMIT conjunto. Error revierte todo. |
| BillingCharge | COMPLETO | PENDING/PARTIAL/PAID por monto confirmado; OVERDUE derivado. |
| Charge VOID | COMPLETO | Rechaza allocations de pagos CONFIRMED. |
| Baseline | COMPLETO | Build backend, 546 pruebas backend y build frontend aprobados antes de integrar grados. |
| Regresión real | COMPLETO | ETAPA 9: 66/66, incluidos doble refund y error forzado de recálculo. |

## Auditoría inicial de ETAPA 10

| Pieza | Estado inicial | Ajuste |
|---|---|---|
| grading_systems | PARCIAL | Propiedad por academia, asociación opcional, código único por academia. |
| grade_levels | PARCIAL | Orden/código únicos ya existían; agregados mínimo de clases y franja. FK de sistema RESTRICT. |
| student_grading_profiles | PARCIAL | academy_style, grade_since, notas y unicidad de perfiles activos. |
| student_grade_history | INCORRECTO | Inicial consistente y promoción transaccional; sin PUT/DELETE; FK de perfil RESTRICT. |
| Evaluaciones independientes | FALTANTE | Registrar evaluación sin promover ni editar historial. |
| Permisos | FALTANTE | Existían cuatro scoreboard; se agregaron 18 grading concretos. |
| API | PARCIAL | Reutilizada y ampliada con DTOs y autorización real. |
| Angular | PARCIAL | Sustituidos listados/diálogos incompletos, agregados permisos, elegibilidad e historial. |

Las cuatro tablas de grados estaban vacías en la réplica antes de migrar; también los catálogos de estilos. Los fixtures de pruebas se crearon y retiraron de forma independiente.

## Base de datos

- Estructura: `_script/bte_stage_10_grading.sql`, aplicada una vez a la réplica.
- Permisos: `_script/bte_stage_10_grading_permissions.sql`, idempotente y por nombres reales de roles.
- Respaldo previo: `/root/bte-stage10/before-stage10.sql`.
- SHA256 respaldo: `4bc816b1d134837176c6ae604cb2b54652be9faa7a7c45ffcf69e17c5a37063c`.
- El primer intento del seed revirtió por collation de la tabla temporal. Se fijó `utf8mb4_spanish_ci` y se ejecutó solo el seed corregido; no se repitió el esquema.
- `grading_systems`: `academy_id` FK RESTRICT, asociación nullable, `UNIQUE(academy_id,code)`. El preflight rechaza perfiles legacy ambiguos y sistemas usados por varias academias. Sistemas sin propietario inequívoco requieren revisión antes de exponerse.
- `grade_levels`: conserva UNIQUE de sistema/orden y sistema/código; agrega `stripe_color_hex`, `minimum_classes` con CHECK no negativo y FK RESTRICT a sistema.
- `student_grading_profiles`: agrega academy_style, grade_since, notes; FKs de alumno y grado RESTRICT. `active_guard` generado permite varios perfiles históricos y uno activo por alumno/estilo/sistema. Se retira el UNIQUE antiguo que impedía esta separación.
- `student_grade_history`: agrega evaluation_date y override_reason, índice de fecha efectiva; conserva registered_by como actor sin duplicar columna. FK de perfil RESTRICT.
- `student_grading_evaluations`: única tabla nueva, necesaria para que Instructor evalúe sin promover. Registros anexos sin edición por API, score DECIMAL(10,3) nullable y certificado opcional. FKs RESTRICT.
- Se conservan índices existentes de FK e historial por perfil/fecha; solo se agregan los necesarios. No hay eliminación ordinaria de niveles ni cascada que borre historial técnico. Las referencias legacy de evento/actor conservan SET NULL.

## Permisos y matriz

Roles reales: Admin=`admin`, Director=`academy_admin`, Instructor=`instructor`, Student=`alumno`, Guardian=`apoderado`. No se creó otro rol Director. A=admin, D=academy_admin, I=instructor, S=alumno, G=apoderado.

| Permission | Existía | Creado | Roles asignados |
|---|---|---|---|
| grading.system.view | No | Sí | A,D,I |
| grading.system.create | No | Sí | A,D |
| grading.system.update | No | Sí | A,D |
| grading.system.activate | No | Sí | A,D |
| grading.level.view | No | Sí | A,D,I,S,G |
| grading.level.create | No | Sí | A,D |
| grading.level.update | No | Sí | A,D |
| grading.level.reorder | No | Sí | A,D |
| grading.level.activate | No | Sí | A,D |
| grading.student.view | No | Sí | A,D,I,S,G |
| grading.student.create_profile | No | Sí | A,D |
| grading.student.assign_initial_grade | No | Sí | A,D |
| grading.student.view_eligibility | No | Sí | A,D,I,S,G |
| grading.student.promote | No | Sí | A,D |
| grading.student.promote_override | No | Sí | A,D |
| grading.student.view_history | No | Sí | A,D,I,S,G |
| grading.evaluation.record | No | Sí | A,D,I |
| grading.certificate.record | No | Sí | A,D |

| Acción | Admin | Director | Instructor | Student | Guardian |
|---|---|---|---|---|---|
| Ver sistemas | Sí | Sí | Sí | No | No |
| Crear/editar/activar sistema | Sí | Sí | No | No | No |
| Ver niveles | Sí | Sí | Sí | Contexto propio | Representado |
| Crear/editar/ordenar/activar nivel | Sí | Sí | No | No | No |
| Ver perfil y elegibilidad | Sí | Sí | Asignados | Propio | Representado |
| Crear perfil / grado inicial | Sí | Sí | Permiso explícito | No | No |
| Promover | Sí | Sí | Permiso explícito + scope | No | No |
| Override | Sí | Sí | No por defecto | No | No |
| Ver historial | Sí | Sí | Asignados | Propio | Representado |
| Editar/eliminar historial | No | No | No | No | No |
| Registrar evaluación | Sí | Sí | Asignados | No | No |
| Registrar certificado | Sí | Sí | Permiso explícito + scope | No | No |

Todo permiso se consulta mediante permissions/role_permissions/user_roles, con usuario activo. Los roles identifican relaciones de alcance; no sustituyen permisos ni se confía en el rol declarado por JWT. Si falta view_eligibility, el perfil agregado conserva la lectura técnica pero devuelve elegibilidad/clases/meses/próximo grado como null, con eligibilityVisible=false. El endpoint dedicado y el filtro por elegibilidad rechazan la petición; Angular oculta esas columnas y filtro.

Admin/Director requieren academy_users o representación legal de la academia. Instructor requiere vínculo activo/vigente, clase asignada, estilo de modalidad y enrollment activo/vigente del alumno. Student usa su persona; Guardian, representación activa. Incluso Admin con permiso no puede acceder a otra academia. Se probó Instructor con concesión concreta mediante rol adicional temporal, luego retirado; la matriz por defecto quedó intacta.

## Backend y endpoints

Entities ampliadas: GradingSystem, GradeLevel, StudentGradingProfile, StudentGradeHistory y StudentCurrentGradeView. Nueva: StudentGradingEvaluation. DTOs: `bte.api.DTO.Academy/GradingDtos.cs`. Servicios: GradingService y parcial Catalog, GradingAuthorizationService. Controller existente dividido en parcial `BillingAndGradingController.Grading.cs`. EF conserva nombres reales snake_case. Validadores comprueban fechas, longitudes, requisitos, orden, colores, DECIMAL y contexto.

`AcademyScopeAuthorizationFilter` resuelve grados antes del bypass Admin legacy. Todas las rutas siguientes empiezan en `/api`; cada operación valida además su alcance.

| Método | Endpoint | Permission | Descripción |
|---|---|---|---|
| GET | /grading/permissions | Autenticación | Permisos y contextos accesibles con nombres. |
| GET | /academies/{academyId}/grading/options | grading.system.view | Estilos/asociaciones; candidatos solo con create_profile y scope. |
| GET | /academies/{academyId}/grading-systems | grading.system.view | Catálogo de academia. |
| POST | /academies/{academyId}/grading-systems | grading.system.create | Crear sistema. |
| PUT | /grading-systems/{id} | grading.system.update | Editar sin trasladar propiedad ni contexto con perfiles. |
| PUT | /grading-systems/{id}/active | grading.system.activate | Activar/desactivar. |
| GET | /grading-systems/{systemId}/levels | grading.level.view | Niveles por orden. |
| POST | /grading-systems/{systemId}/levels | grading.level.create | Agregar nivel. |
| PUT | /grade-levels/{id} | grading.level.update | Editar nivel. |
| PUT | /grade-levels/{id}/active | grading.level.activate | Activar/desactivar. |
| PUT | /grading-systems/{systemId}/levels/order | grading.level.reorder | Orden completo en una transacción. |
| GET | /academies/{academyId}/grading/students | grading.student.view | Filtros estilo/sistema/grado/elegibilidad/búsqueda. |
| GET | /students/{studentId}/grading | grading.student.view | Perfiles accesibles agregados. |
| POST | /students/{studentId}/grading-profiles | grading.student.create_profile | Grado inicial requiere además assign_initial_grade. |
| POST | /student-grading-profiles/{profileId}/initial-grade | grading.student.assign_initial_grade | Perfil sin grado/historial; admite grado avanzado. |
| PUT | /student-grading-profiles/{profileId}/active | grading.student.create_profile | Inactivar/reactivar sin cambiar sistema. |
| GET | /students/{studentId}/grading/eligibility | grading.student.view_eligibility | Elegibilidad agregada. |
| POST | /student-grading-profiles/{profileId}/promote | grading.student.promote | Promoción transaccional. |
| GET | /student-grading-profiles/{profileId}/history | grading.student.view_history | Historial con nombres y responsable. |
| GET | /student-grading-profiles/{profileId}/evaluations | grading.student.view_history | Evaluaciones/certificados anexos. |
| POST | /student-grading-profiles/{profileId}/evaluations | grading.evaluation.record | Evaluar sin promover. |
| POST | /student-grading-profiles/{profileId}/certificates | grading.certificate.record | Registrar certificado. |

Los alias GET/POST `/grading-systems?academyId=...` y GET `/students/{studentId}/grading-profiles` usan el mismo flujo autorizado. No hay PUT/DELETE de historial.

Promote agrega `expectedCurrentGradeLevelId` al payload conceptual: Angular envía el grado mostrado. READ COMMITTED, bloqueo de sistema y perfil, relectura y comparación detectan solicitudes obsoletas con 409. Solo siguiente sort_order, incluso con override. Override omite únicamente mínimos de tiempo/clases y exige promote_override, motivo y actor. Evaluación/certificado en promoción exige también su permiso específico.

Historial se inserta y guarda antes de actualizar current_grade/grade_since y guardar, todo antes de COMMIT. Error posterior al INSERT revierte ambos hechos. Creación de perfil e inicial también son transaccionales.

## Angular

- Rutas `/academies/:academyId/grading`, alias grading-systems, detalle grading-systems/:systemId/levels y `/mi-cuenta/grading`.
- Menú Academia → Grados / Progresión desde capabilities; lectura personal/representados para Student/Guardian. Guard consulta permisos y academias accesibles.
- GradingPageComponent: tabs Estudiantes/Sistemas por permiso; filtros, paginación, nombres de contexto, grado, desde, próximo, clases/meses y elegibilidad textual.
- GradingEditDialogComponent: sistema/nivel, perfil con inicial avanzado, inicial separado, promoción, evaluación y certificado. Override solo con permiso y motivo obligatorio.
- Pantallas existentes de niveles y diálogos apuntan a la implementación compartida. El tab del alumno reutiliza la pantalla y ya no solicita un historial por perfil al abrir el alumno.
- GradingManagementService y grading.models.ts contienen contratos nuevos. Se retiró el payload antiguo de promoción. Botones de catálogo y acciones dependen de permisos.
- Historial muestra fecha, desde/hacia, evaluación, score, certificado, responsable, notas y excepción; sin edición/eliminación.
- Se retiró el fallback duplicado de payments; se conserva la pantalla financiera de ETAPA 9.

## Reglas confirmadas

- Multi-estilo y multi-academia independientes; nunca se modifica student.level competitivo.
- sort_order define progresión. KYU/DAN/MON/OTHER son metadatos.
- Current grade y grade_since viven en perfil. Inicial genera NULL → grado, incluso avanzado. Historial conserva hechos.
- Solo siguiente nivel; sin saltos/retroceso ni auto-promotion. Sistema/target inactivos rechazan promociones; niveles históricos inactivos permanecen visibles.
- COMPLETED + PRESENT/LATE cuentan desde grade_since, hasta la fecha consultada, en la misma academia y academy_style. ABSENT/EXCUSED y sesiones CANCELLED no cuentan.
- Meses por aniversario calendario, con fin de mes y bisiesto. Requisito cero satisfecho; elegibilidad no cambia grado.
- Override requiere permiso concreto, motivo y actor. Instructor no promueve por defecto y con permiso sigue restringido a su scope.
- Student solo propio, Guardian solo representados; Admin A no accede al perfil B del mismo alumno.
- Historial sin CRUD para todos. Evaluaciones anexas no alteran una promoción.
- Puntaje opcional sin escala 0–100 supuesta; certificado opcional; sin PDF, jurados/rúbricas o cargos financieros automáticos.
- Backend es autoridad. Scoreboard, fixtures oficiales y reglamentos por asociación no fueron modificados.

## Verificación y entregables

Backend: OK (`dotnet restore`, `dotnet build`, `dotnet test`, `dotnet publish`). 554 pruebas aprobadas, sin errores ni omitidas. Permanecen advertencias preexistentes de nulabilidad y código legacy.

Frontend: OK (`npm run build`, ChromeHeadless). 414 pruebas aprobadas. Build con código de salida 0 y SEO verificado; advertencias CommonJS preexistentes. Se agregaron pruebas de botones por permisos, contrato de promoción/evaluación, lectura protegida de elegibilidad y menú de grados.

MySQL/API: 54 comprobaciones aprobadas con MySQL real, Kestrel y JWT firmados. Incluyen inicial avanzado con historial, duplicados, orden masivo, elegibilidad por tiempo/clases, estados de asistencia, fin de mes, Instructor por defecto y con concesión, override, alcance por estilo, Student/Guardian, Admin sin permiso concreto, protección de elegibilidad en perfil/endpoint/filtro, dos promociones simultáneas (una confirma y otra 409), rollback forzado después de insertar historial, RESTRICT, historial inmutable, multiacademia y ausencia de finanzas automáticas.

La auditoría posterior confirmó 18 permisos y 50 asignaciones por defecto, sin roles temporales. Sistemas/niveles/perfiles/historial/evaluaciones quedaron con cero filas al retirar los fixtures, igual que su estado inicial vacío.

| Regresión | Resultado | Evidencia |
|---|---|---|
| ETAPA 1 — modalidades/salas/instructores | OK | AcademyConfigurationTests, InstructorCandidateTests y pruebas Angular. |
| ETAPA 2 — clases | OK | AcademyClassTests y pruebas Angular. |
| ETAPA 3 — horarios/asignaciones | OK | AcademyManagementTests, conflictos/horarios y detalle Angular. |
| ETAPA 4 — enrollments | OK | ClassEnrollmentTests, ActiveAcademyMembershipTests. |
| ETAPA 5 — sesiones | OK | ClassSessionTests y generación/estados. |
| ETAPA 6 — asistencia | OK | ClassAttendanceTests + MySQL 21 comprobaciones. |
| ETAPA 7 — planes | OK | BillingPlanTests + MySQL 18/18. |
| ETAPA 8 — cargos/mensualidades/PER_CLASS | OK | BillingChargeTests + MySQL 36/36. |
| ETAPA 9 — pagos/allocations/refund/cuenta | OK | BillingPaymentTests + MySQL 66/66. |
| Eventos | OK | EventAdministration/Enrollment/Pricing, Category/Fixture/CompetitionEngine/Scoreboard y RegistrationPaymentTests, más suite Angular. |

Las verificaciones de eventos y ETAPAS 1–5 son automatizadas; no representan una prueba manual de todos los flujos en producción. No se publicó frontend, API ni SQL en producción.

Evidencias reproducibles en `docs/validation/stage10/`: logs completos de backend/Angular, `mysql-results.log`, regresiones MySQL 6–9 y `schema-audit.log`. Runner de integración: `backend-production/tests/stage10-mysql/Program.cs`.

Backend publicable: `release/stage10-backend/`. Scripts incrementales: `_script/bte_stage_10_grading.sql` y `_script/bte_stage_10_grading_permissions.sql`. Frontend: `entregables/bte-frontend-app-20261018-etapa-10.zip`, base `/bte/`, assets y SEO verificados.

Los hashes finales se registran en `docs/validation/stage10/artifacts.json`.

- Frontend ZIP: `ac6a00868980a36d828b6edc35c72a9294178575b660c74c832c7a3a7796d4a6`.
- Backend API DLL: `bb4277ef4b3b201eeeadebe1343af9e4d9ff9a64931fb8d2b70ff8cf35b8bbe5`.

ETAPA 10 COMPLETA en el código y la réplica verificados. Se detiene el trabajo antes de ETAPA 11.

El agregado carga asistencia y niveles en bloque, sin consultas por alumno. Búsqueda/elegibilidad y paginación se aplican sobre el agregado materializado; para volúmenes muy grandes, trasladar esa selección a SQL queda como optimización posterior.
