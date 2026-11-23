> Actualización posterior: la semántica de estados y morosidad de este informe histórico queda sustituida por [la corrección final](academy-charge-state-results.md). OVERDUE es calculado, nunca persistido.

# ETAPA 8 — Cargos, mensualidades y cuentas por cobrar

Entrega: 17/10/2026, America/Santiago. Código y validación técnica sobre réplica `athena_stage4_test`. Esta entrega no publica producción ni inicia ETAPA 9.

## Auditoría y consolidación de ETAPA 7

Informe inicial: `docs/academy-stage-8-audit.md`. Se inspeccionaron las tablas reales antes de modificar el esquema. No se volvió a ejecutar la migración de ETAPA 7.

| Componente | Estado inicial | Corrección / acción |
|---|---|---|
| billing_plans | COMPLETO | Conservar columnas, tipos, vigencia, estado, validaciones por ciclo y restricciones existentes |
| class_billing_plans | COMPLETO | Conservar PK clase/plan, default_guard e índice único y cambio transaccional de default |
| class_enrollments.billing_plan_id | COMPLETO | Conservar nullable y controles de academia, plan activo/vigente/asociado, ACTIVE/PAUSED e historial terminado |
| Planes frontend | COMPLETO | Conservar catálogo, diálogos, pestaña de clase y selector explícito en inscripción |
| Ausencia de cargos al configurar planes | COMPLETO | Sin generación al asociar/cambiar plan o inscribir alumno |

Antes de comenzar cargos: build backend OK, 436/436 pruebas existentes OK y build Angular OK (`stage8-stage7-build.log`, `stage8-stage7-tests.log`, `stage8-stage7-frontend-build.log`). Después, la regresión MySQL de ETAPA 7 pasó 18/18 con el backend de ETAPA 8; la de asistencia pasó 21/21.

## ETAPA 8: auditoría y base de datos

Existían billing_concepts, billing_charges, sus entidades, rutas básicas, un generador mensual y otro por sesión. Los generadores eran incompletos: el mensual no tenía protección suficiente de concurrencia/vigencia; el de sesión no exigía COMPLETED ni usaba asistencia y escribía un período SESSION incompatible con el CHAR(7)/CHECK existente. Se corrigieron sus rutas de ejecución, sin duplicar generadores activos.

La vista existente `vw_student_billing_balance` ya calcula total, asignaciones confirmadas y saldo correctamente. Se conserva; el endpoint de saldo ahora agrega en SQL y usa OVERDUE actualizado con gracia, en lugar de ignorar esos días.

Script incremental: `_script/bte_stage_8_billing_charges.sql`.

- Reutiliza billing_concepts y billing_charges. No recrea tablas ni objetos de ETAPA 7.
- Conserva nombres reales amount, discount_amount, surcharge_amount, generated_automatically y todos los campos/FK existentes.
- Agrega `grace_days SMALLINT UNSIGNED NOT NULL DEFAULT 0` como snapshot. Para registros legacy no se inventa gracia histórica tomando el plan actual.
- Agrega `generation_key VARCHAR(100) NULL` e índice único `uq_billing_charge_generation(academy_id,generation_key)`.
- Agrega índices `(academy_id,status,due_date)` y `(academy_id,reference_period)` para filtros y mora.
- Conserva DECIMAL(12,2), CHECK de importes/total no negativo, estados, período YYYY-MM y FK actuales. Total se calcula como amount-discount_amount+surcharge_amount; no se duplica innecesariamente una columna calculable.
- Asegura las seis semillas por código solo si faltan: MONTHLY_FEE, ENROLLMENT_FEE, CLASS_FEE, EVENT_FEE, EXAM_FEE, OTHER. En la réplica ya estaban activas; no se duplicaron.
- Preflight rechaza duplicados automáticos legacy o referencias incompletas, sin borrar ni corregir importes. Completa claves de generación identificables sin cambiar snapshots financieros.

Aplicado una vez únicamente en la réplica, después del respaldo `/root/bte-stage8/before-stage8.sql`. SHA256 respaldo: `391fb0e6b6b9bb019d8c1e9b9a9b5fee0fea7306d7aef53640e12a3d2663c33e`.

SHA256 script ejecutado: `b932dd8c0c509012dd09a8f567b98232b3fdae630f85cd3ec0d99c74a516494d`.

## Backend

- Entidades: reutilizadas BillingConcept, BillingCharge, BillingPlan, ClassEnrollment, ClassSession, ClassAttendance y StudentBillingBalanceView. BillingCharge incorpora únicamente GraceDays y GenerationKey.
- DTOs nuevos: `bte.api.DTO.Academy/BillingChargeDtos.cs`: CreateBillingChargeRequest, UpdateBillingChargeRequest, BillingChargeQuery, BillingChargeRead, BillingChargePage, BillingChargeSummary, GenerateChargesResult, OverdueStudent, OverduePage, StudentBillingTotals.
- Servicios nuevos: `IBillingChargeService` y `BillingChargeService`, registrados en Program.cs. Contienen consulta/paginación/agregados, escritura manual, validación de referencias, generación, edición limitada, anulación, estado de mora y saldo.
- `BillingService` conserva su contrato anterior y delega ambas generaciones al servicio nuevo: no queda una segunda implementación insegura. El recálculo existente respeta gracia y zona configurada para conservar coherencia, sin ampliar el flujo de pagos.
- `BillingAndGradingController` reutiliza rutas existentes y delega operaciones al servicio. Agrega edición, consulta de morosidad y consultas acotadas de alumnos/referencias para formularios.
- `BteV1Context` agrega mapeos e índices de los campos nuevos; conserva precisión monetaria.
- `AcademyScopeAuthorizationFilter` y `AcademyAuthorizationService` admiten los DTOs nuevos y protegen mutaciones por rol y academia. El detalle puede consultarse dentro del alcance legible del alumno, sin conceder administración financiera a instructores.
- Validadores del servicio: importes decimales no negativos, máximo/precisión, total no negativo, descripción, período, fechas/gracia, paginación, estados y referencias a alumno/academia/inscripción/plan/sesión/evento/examen.

## Endpoints

Se respeta la convención existente `/billing/charges`, evitando duplicar rutas equivalentes con `/billing-charges`.

| Método | Endpoint | Descripción |
|---|---|---|
| GET | /api/billing/concepts | Conceptos activos existentes |
| GET | /api/academies/{academyId}/billing/charges | Cargos paginados y resumen agregado |
| GET | /api/students/{studentId}/billing/charges | Estado de deuda del alumno según academias legibles |
| GET | /api/billing/charges/{id} | Detalle con snapshot, total, saldo y trazabilidad |
| POST | /api/academies/{academyId}/billing/charges | Cargo manual explícito |
| POST | /api/billing/charges | Ruta previa compatible para creación manual validada |
| PUT | /api/billing/charges/{id} | Edición limitada de cargo PENDING sin asignaciones |
| POST | /api/billing/charges/{id}/void | Anulación histórica sin borrado |
| POST | /api/academies/{academyId}/billing/monthly/generate | Generación mensual explícita e idempotente |
| POST | /api/class-sessions/{sessionId}/billing/generate | Generación por sesión COMPLETED y asistencia |
| GET | /api/academies/{academyId}/billing/overdue | Morosidad agrupada por alumno, paginada en SQL |
| GET | /api/students/{studentId}/billing/balance | Saldo existente, agregado con gracia coherente |
| GET | /api/academies/{academyId}/billing/students | Búsqueda acotada de alumnos para cargo manual |
| GET | /api/academies/{academyId}/billing/references | Inscripciones, eventos y exámenes existentes disponibles para asociación |

Filtros de cargos: search, studentId, conceptId/concept, status, referencePeriod, dateFrom/dateTo, dueDateFrom/dueDateTo, page/pageSize. Consulta por alumno admite academyId dentro del alcance autorizado. PageSize máximo 100. Los listados devuelven items, total, page, pageSize y summary. El cliente conocido fue migrado; los adaptadores de arrays existentes del frontend admiten el nuevo wrapper paginado.

Resultado de generación: created, existing, skipped, errors. Se conserva generated como alias compatible. Una configuración inválida rechaza la operación transaccional completa; no se dejan cargos parcialmente generados.

## Frontend

- Menú Academia → Finanzas: Panel financiero, Planes / Membresías, Cargos, Morosidad. Se reutilizan entradas existentes.
- Rutas reales: `/academies/:academyId/billing`, `/billing-plans`, `/charges`, `/overdue`.
- Nuevo `billing-charge-list.component.ts`: tabla con alumno, concepto, descripción, período, monto, descuento, recargo, total, saldo, vencimiento, estado y acciones; filtros y paginación del servidor.
- El mismo componente sirve el resumen del panel financiero y la pestaña Finanzas del alumno, sin implementar otra tabla paralela.
- Nuevo `billing-charge-detail.component.ts`: consulta y snapshot financiero.
- Nuevo `billing-overdue.component.ts`: alumno, cantidad vencida, importe vencido y días de atraso; búsqueda y paginación en backend.
- Se completa `charge-form-dialog.component.ts`: selección de alumno por nombre, concepto, descripción, importes, total, vencimiento, gracia y período; referencias opcionales por concepto a inscripción, evento y examen existentes. Conserva errores de negocio y evita doble envío.
- La matrícula es una operación manual explícita con concepto ENROLLMENT_FEE y asociación opcional a inscripción. Un ONE_TIME no se trata automáticamente como matrícula. API admite plan/referencias opcionales validadas.
- Se completa `monthly-generation-dialog.component.ts`: período validado, protección de doble envío, resultados creadas/existentes/omitidas visibles y errores recuperables.
- `session-detail.component.ts`: gestores pueden generar cargos por clase únicamente en COMPLETED; muestra resultados y conflictos.
- `student-academy-profile.component.ts`: Finanzas presenta cargos/deuda; deja de consultar o mostrar pagos académicos en este flujo.
- BillingManagementService e interfaces nuevas de `billing-charge.models.ts`: contratos tipados, detalle, edición, candidatos, referencias, filtros, resumen, mora y generación.
- Importes formateados con el formatter por locale existente, sin introducir CLP fijo. El formulario calcula en centavos para evitar falsos totales negativos por aritmética binaria; backend decimal sigue siendo autoridad.

## Reglas confirmadas

### Snapshot financiero

Los cargos guardan plan, inscripción/sesión cuando aplica, período, descripción, monto, descuento, recargo, vencimiento y gracia. Cambiar plan, monto, día de vencimiento, horario o inscripción no reescribe cargos creados.

Edición explícita solo en PENDING y sin asignaciones: descripción, descuento, recargo y vencimiento; amount también en manuales. Un automático conserva su monto base. No se aceptan estados PAID ni marcas automáticas desde el DTO de escritura.

### Mensualidad e idempotencia

ACTIVE genera; PAUSED/WITHDRAWN/COMPLETED no generan nuevas mensualidades bajo la política inicial. Plan MONTHLY, activo, misma academia, con vigencia e inscripción que se solapan con el mes. No hay prorrateo: se genera mensualidad completa. El vencimiento usa el día real del plan; la gracia no desplaza due_date.

Clave `M:{enrollmentId}:{YYYY-MM}`. Se excluye deliberadamente el plan de la identidad de la obligación para impedir una segunda mensualidad de esa inscripción/período al cambiarlo. Bloqueo transaccional de academia/clases/planes y unique en BD protegen también llamadas concurrentes.

### PER_CLASS

Fuente: sesión real COMPLETED, asistencia guardada e inscripción/plan PER_CLASS válidos para su fecha. PRESENT/LATE generan; ABSENT/EXCUSED no generan. CANCELLED, SCHEDULED e IN_PROGRESS se rechazan. No se usa horario recurrente como fuente.

Clave `S:{sessionId}:{studentId}`, independiente de cambios posteriores del plan. Inscripciones que terminaron después de la sesión pueden conservar la obligación basada en asistencia histórica. Inscripciones superpuestas ambiguas se rechazan para revisión.

### Mora y anulación

PENDING con total positivo y sin asignaciones pasa a OVERDUE cuando due_date+grace_days es anterior a la fecha local configurada. El servicio actualiza el estado persistido al consultar finanzas; no se calculan miles de registros en Angular. En el límite exacto de gracia sigue pendiente.

Zona horaria: `Billing:AcademyTimeZones:{academyId}`, con fallback `Billing:DefaultTimeZone`, y UTC si no hay configuración explícita. Ejemplo de despliegue para una academia chilena: `Billing__AcademyTimeZones__123=America/Santiago`. La prueba de frontera UTC/Santiago confirma la selección por academia. No se presume un país/zona de academia que el modelo no contiene.

VOID conserva fila y clave idempotente, por lo que regenerar no revive ni duplica cargos anulados. Se permite anular PENDING/OVERDUE sin asignaciones; PAID/PARTIAL y cargos con asignaciones se rechazan. No existe DELETE físico en la API de cargos.

### Alcance y limitaciones del modelo actual

No se generan cargos al crear enrollments/asociar planes. Generaciones y cargos manuales requieren operaciones explícitas de un gestor autorizado. Se validan academia del cargo, alumno, plan e inscripción y referencias opcionales.

El modelo no conserva todos los intervalos históricos de pausa ni cada cambio de plan/precio de la inscripción. La primera generación usa los datos disponibles y las fechas persistidas; no se inventa un plan pasado. Una vez creado el cargo, el snapshot sí queda conservado. Para datos legacy sin gracia guardada se usa cero, sin inferirla retrospectivamente del plan actual.

ETAPA 8 no agrega registro de pagos, allocations, conciliación, comprobantes, pagos parciales ni refund. Código académico de pagos ya existente permanece por compatibilidad, sin ampliarlo ni incorporarlo al nuevo flujo. Los pagos competitivos legacy no se sustituyen ni modifican.

## Pruebas y regresión

| Conjunto final | Resultado |
|---|---|
| Backend completo | 473/473 OK, cero omitidas, EXIT_CODE=0 |
| Frontend completo | 375/375 OK, EXIT_CODE=0 |
| MySQL ETAPA 8 | 24/24 OK sobre binario final |
| MySQL regresión ETAPA 7 | 18/18 OK |
| MySQL regresión ETAPA 6 | 21/21 OK |

ETAPA 8 MySQL cubre concurrencia mensual y por sesión, snapshots tras modificar plan, exclusión de pausados/terminados, PRESENT/LATE frente a ABSENT/EXCUSED, estados de sesión, creación/edición/anulación manual, referencias de otra academia, consultas SQL, gracia, vista existente, saldo coherente e inexistencia de pagos generados. Los datos temporales se eliminaron; cargos/planes/clases/asistencia/pagos/allocations volvieron a cero en la réplica. Se comprobó el índice único de generación instalado.

ETAPAS 1–5: OK en suites de modalidades, salas, instructores, estilos, clases, horarios, enrollments y sesiones. ETAPA 6: OK, incluidas carreras de guardado/cierre y atomicidad. ETAPA 7: OK en suite y réplica. Eventos, categorías, competidores, inscripciones competitivas, Teams, brackets, CompetitionSchedule, resultados, invitaciones y pagos legacy: regresión existente OK. No se modificó el motor competitivo.

Nuevas pruebas: `BillingChargeTests.cs`, ampliación de `AcademyScopeTests.cs`, `billing-charges.spec.ts` y `tests/stage8-mysql/Program.cs`. El test anterior de generación por clase se corrigió para preparar sesión COMPLETED y asistencia PRESENT, en lugar de esperar cobro sin asistencia.

Logs locales: `stage8-restore.log`, `stage8-backend-build-final.log`, `stage8-backend-tests-verified.log`, `stage8-frontend-tests-final.log`, `stage8-frontend-build-final.log`, `stage8-backend-release.log`.

Logs remotos: `/root/bte-stage8/stage8-results-final.log`, `stage7-regression.log`, `stage6-regression.log`.

## Build y entrega

- Backend: OK, restore/build/test/publish. Artefacto: `release/stage8-backend/`.
- API final comprobada localmente y en réplica, SHA256: `cfe3de8e50e08aaa63132315d81617a24668fabb81b9dc7039c72f15a6bf2bdf`.
- Frontend: build producción y validación SEO OK, sin errores TypeScript, EXIT_CODE=0. Artefacto: `dist-stage-8/`, hash Angular `f8ac07972e446940`. Advertencias CommonJS heredadas de canvg/jspdf.
- Paquete para `/bte/`: `entregables/bte-frontend-app-20261017-etapa-8.zip`, con checksum `.sha256` y verificación de archivos/SEO del empaquetador existente.
- Ejecutor MySQL: `backend-production/tests/stage8-mysql/`; requiere BTE_TEST_MYSQL_CONNECTION y rechaza bases distintas de athena_stage4_test. No ejecutar sobre producción.

## Pendientes y estado

Sin faltantes de implementación de ETAPA 8 detectados en las verificaciones ejecutadas. La publicación productiva y su aceptación visual no forman parte de esta ejecución. Al desplegar, inspeccionar primero el esquema instalado, aplicar solo migraciones pendientes con respaldo, configurar zona horaria y publicar frontend/backend compatibles. Cumplir la comprobación X-FRONT de AGENTS.md al publicar el backend.

No se desarrolla ETAPA 9.

**ETAPA 8 COMPLETA — implementación y validación técnica en réplica.**
