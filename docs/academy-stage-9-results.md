# ETAPA 9: pagos, distribución, abonos y estado de cuenta

> Corrección posterior: [contrato definitivo de refund](academy-stage-9-refund-results.md). El refund ahora exige motivo y devuelve cargos y estado de cuenta actualizados; los requests vacíos ya no son válidos para esa operación.

Implementación incremental sobre el proyecto existente. Entrega local y validación en la réplica `athena_stage4_test`; producción no publicada. La ETAPA 10 no se inicia.

## Auditoría y conservación de ETAPA 8

La clasificación inicial está en [academy-stage-9-audit.md](academy-stage-9-audit.md): componentes COMPLETO, PARCIAL, INCORRECTO y FALTANTE, con la acción aplicada. Se inspeccionaron tablas reales antes de migrar. Existían las dos tablas financieras, entidades, DECIMAL(12,2), métodos/estados válidos, FK, el UNIQUE(payment_id,charge_id), índices por academia/alumno y una implementación parcial incorrecta de asignación posterior a confirmación.

ETAPA 8 conserva sus snapshots, `grace_days`, reglas de generación, transacciones, claves idempotentes y VOID terminal. Los estados persistidos siguen siendo PENDING/PARTIAL/PAID/VOID. OVERDUE continúa calculado por `BillingChargeStateRules`, con gracia snapshot y fecha de cada academia resuelta mediante `IAcademyTimeZoneService` y su país; no se escribe por paso del tiempo.

El cambio requerido de ETAPA 8 es el saldo real: se retiró el atajo que devolvía cero por el solo texto PAID. Ahora se calcula `MAX(totalAmount - confirmedAllocatedAmount, 0)`; VOID conserva saldo cobrable cero. Un PAID legítimo tiene cero por estar totalmente cubierto. Se ajustó el fixture antiguo que simulaba PAID sin dinero aplicado; las pruebas ahora utilizan pagos confirmados o un cargo de total cero. La proyección central de morosidad no se duplicó.

## Base de datos

Script: [_script/bte_stage_9_billing_payments.sql](../_script/bte_stage_9_billing_payments.sql). Es SQL First incremental: no recrea tablas, no modifica columnas de importes ni repite migraciones de etapas anteriores.

| Objeto | Resultado |
|---|---|
| billing_payments | Tabla existente; default de status corregido de CONFIRMED a PENDING |
| Métodos | CASH, TRANSFER, CARD, WEBPAY, OTHER; CHECK existente conservado |
| Estados de pago | PENDING, CONFIRMED, REJECTED, VOID, REFUNDED; CHECK existente conservado |
| Auditoría | confirmed_by/at, rejected_by/at, voided_by/at, refunded_by/at nullable; actores referencian users |
| billing_payment_allocations | Reutiliza amount DECIMAL y created_at; agrega created_by nullable con FK a users |
| UNIQUE | Se conserva uq_billing_payment_allocation(payment_id,charge_id), sin duplicarlo |
| Índices | Conserva (academy_id,paid_at), (student_id,paid_at), referencia y charge_id; agrega (status,paid_at) y (paid_at) solo si no existe un índice con ese prefijo |
| FK payment → allocations | ON DELETE CASCADE sustituido por RESTRICT: no borra historia financiera |
| FK estudiante/pagador | RESTRICT hacia student/persons; no se crean entidades de pagador |
| Vista de balance | Misma vista y contrato; suma únicamente allocations de CONFIRMED, clamp a cero y VOID no cobrable |

Datos iniciales en réplica: cero cargos, pagos y allocations. El preflight rechaza confirmados con distribución incompleta, allocations de otra academia/alumno, confirmados sobre VOID y sobrepagos existentes. No inventa dinero ni corrige silenciosamente registros legacy.

Respaldo previo: `/root/bte-stage9/before-stage9.sql`, SHA256 `5f86dcac461b78f02bbe87afe0be5f5f40a438b65eb89ef996ddc7f1ebd7d179`.

SHA256 del script final ejecutado: `014ffc4aeaf03831a935c533c86c847a88efd9c57d6117ad8364e5de375d191e`.

El primer ALTER fue rechazado por MySQL al reutilizar un nombre de FK eliminado dentro del mismo ALTER. Se consultó information_schema y se comprobó que no se habían añadido columnas ni cambiado las FK. Se corrigieron los nombres de las nuevas restricciones, se retiró la rutina temporal fallida y se aplicó el script final correctamente. No se reejecutaron scripts de etapas anteriores. MySQL DDL tiene commit implícito: una futura publicación debe realizar respaldo y detener escritores financieros mientras aplica este script una sola vez.

## Backend y reglas definitivas

Se amplió la clase existente `BillingService` mediante `BillingService.Payments.cs`; se mantienen sus generadores y la entrada de compatibilidad de IBillingService. No se agregó un segundo servicio paralelo para los mismos pagos. Entidades existentes: BillingPayment y BillingPaymentAllocation. DTOs explícitos en `BillingPaymentDtos.cs`, proyecciones agregadas y mappings snake_case existentes, con conversiones UTC para fechas de pago y auditoría.

Creación: todos los medios, incluido CASH, comienzan PENDING. El alumno debe pertenecer activamente a la academia y el pagador opcional debe existir en persons. No hay binding de la entidad financiera desde el cliente. Los DTO de escritura rechazan propiedades desconocidas: no se pueden enviar status, owners nuevos o un monto de refund parcial.

Edición: solo PENDING. Permite monto, medio, referencia, fecha y notas; el comprobante tiene su endpoint propio. El monto no puede quedar debajo de la distribución propuesta. La academia, alumno y origen quedan estables. Importes positivos, máximo DECIMAL(12,2), hasta dos decimales, métodos válidos y límites de texto se validan en backend.

PUT allocations representa el conjunto completo. Permite conjunto vacío; elimina físicamente únicamente propuestas retiradas de un pago todavía PENDING. Consolida las parejas repetidas del request en una sola fila, preservando el UNIQUE. Los cargos deben ser PENDING/PARTIAL, con saldo positivo, del mismo alumno y academia. El total propuesto no puede superar el pago. Otras propuestas PENDING no reservan ni consumen saldo.

Transiciones únicas: PENDING→CONFIRMED, PENDING→REJECTED, PENDING→VOID, CONFIRMED→REFUNDED. Los tres estados terminales no se reabren. CONFIRMED no admite edición, redistribución, VOID ni rechazo. Refund es total; no elimina ni modifica allocations históricas. Solo dejan de contar porque el pago deja de estar CONFIRMED.

Confirmación y refund son transaccionales READ COMMITTED. Se bloquea primero el pago con SELECT FOR UPDATE y después los cargos ordenados por ID. Se recarga el estado tras obtener el lock. Al confirmar se exige una distribución no vacía cuya suma sea exactamente payment.amount; se revalidan dueños, elegibilidad y saldo actual de cada cargo. Se guarda el estado y se recalculan todos los cargos en la misma transacción. Cualquier error revierte la operación completa. No se utiliza Redis ni locks externos.

Solo CONFIRMED contribuye a paidAmount. PENDING, REJECTED, VOID y REFUNDED no contribuyen. Recalcular conserva VOID; con paidAmount=0 produce PENDING, con abono inferior al total PARTIAL, y con el total cubierto PAID. No existe selección manual de esos estados de cargo. OVERDUE sigue calculado y un cargo moroso puede recibir pagos.

La confirmación no admite monto sin distribuir, sobrepago ni saldo a favor. La corrección de un confirmado es refund + nuevo pago correcto. No se introdujeron wallet, advance payments, pago de hermanos ni refund parcial.

Autorización: se reutilizan AcademyAuthorizationService y AcademyScopeAuthorizationFilter, con las reglas reales existentes de admin y academy_admin y su academia. No se introduce un modelo alternativo de permisos. Las acciones indirectas resuelven el propietario del pago; las lecturas personales se restringen a academias legibles del alumno. Instructor no obtiene permisos financieros nuevos. Las pruebas incluyen roles falsificados/desactualizados y acceso cruzado.

Comprobantes: reutilizan `IFileValidationService`, `DocumentFileOptions`, Storage:BasePath y los helpers existentes de paths/MIME. PDF/JPG/PNG con validación de firma y tamaño configurado; los binarios quedan en storage, no en BD. Paths generados por servidor, descarga autenticada y edición solo PENDING. Una carrera con confirmación se revalida al guardar el path y elimina el archivo nuevo si la operación fue rechazada. Los archivos anteriores no se eliminan como efecto de un refund.

paidAt con offset se conserva como UTC. Una fecha sin offset se interpreta en la zona existente de la academia. Al leer MySQL, las fechas de pago/auditoría conservan Kind UTC para su serialización. Las fechas de vencimiento siguen siendo DateOnly de academia.

## Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| GET | /api/academies/{academyId}/billing-payments | Listado paginado; search, studentId, paymentMethod, status, dateFrom/dateTo |
| POST | /api/academies/{academyId}/billing-payments | Registrar PENDING con DTO explícito |
| GET | /api/billing-payments/{id} | Pago, alumno, pagador, comprobante, importes agregados y allocations |
| PUT | /api/billing-payments/{id} | Editar metadatos/monto de PENDING |
| PUT | /api/billing-payments/{id}/allocations | Reemplazar el conjunto completo de propuestas PENDING |
| POST | /api/billing-payments/{id}/confirm | Confirmar distribución exacta de forma transaccional |
| POST | /api/billing-payments/{id}/reject | PENDING → REJECTED |
| POST | /api/billing-payments/{id}/void | PENDING → VOID |
| POST | /api/billing-payments/{id}/refund | CONFIRMED → REFUNDED total |
| POST | /api/billing-payments/{id}/receipt | Cargar/reemplazar comprobante PENDING |
| GET | /api/billing-payments/{id}/receipt | Descargar comprobante autorizado |
| GET | /api/students/{studentId}/billing/account-statement | Resumen, cargos e historial de pagos agregados |
| GET | /api/students/{studentId}/billing/payments | Consulta personal restringida por academia |
| GET | /api/academies/{academyId}/billing/charges?eligibleForPayment=true&studentId=… | Cargos con saldo elegibles, filtrados en SQL |

Las rutas académicas anteriores `/billing/payments`, `/billing/payments/{id}/allocate`, `/void` y `/refund` se mantienen como entradas de compatibilidad hacia la misma implementación definitiva. El antiguo POST allocate también reemplaza el conjunto PENDING; nunca agrega allocations a un confirmado. No hay endpoints de borrado físico de pagos/cargos ni de distribución histórica.

## Estado de cuenta

El DTO contiene totalCharged, totalPaid, totalPending, totalOverdue y balance, más cargos y pagos. totalCharged excluye VOID; totalPaid suma allocations confirmadas de cargos vigentes, nunca todos los payments completos. totalPending representa toda la deuda pendiente de pago, incluida la vencida; balance coincide con ese total. totalOverdue es el subconjunto calculado por la regla central.

Cada cargo devuelve descripción/concepto/fecha, totalAmount, paidAmount, balance, status, effectiveStatus, dueDate y gracia. Los payments incluyen monto, distribución, medio, estado y referencia; VOID/refund permanecen visibles como historia. Los agregados se realizan mediante proyecciones SQL; no hay un request HTTP por cada fila.

## Frontend

Se conservó el patrón real de rutas de BTE: **/academies/:academyId/payments**, dentro de Academia → Finanzas. Es la adaptación de la ruta conceptual solicitada `/academia/finanzas/pagos`; no se inventó una segunda academia global sin ID. El menú queda Panel financiero, Planes / Membresías, Cargos, Pagos, Morosidad.

- `BillingPaymentListComponent`: título/descripción solicitados, + Registrar pago, filtros, paginación y columnas Fecha, Alumno, Monto, Asignado, Por asignar, Medio, Referencia, Estado y Acciones.
- Se corrigieron los componentes existentes `PaymentFormDialogComponent` y `PaymentAllocationComponent`; no se duplicaron formularios o asignadores.
- Registro/edición con búsqueda de alumno, pagador opcional por nombre, importes, medio, fecha, referencia, archivo y notas. Nunca envía status ni created_by.
- `BillingPaymentDetailComponent`: acciones según estado. PENDING permite Editar/Distribuir/Confirmar/Rechazar/Anular; CONFIRMED ofrece Reembolsar; terminales solo consulta. Confirmar queda deshabilitado hasta asignar todo. Confirmación y refund requieren diálogo explícito.
- Selector con saldo real, carga paginada por lotes, morosos primero y vencimiento ascendente. La distribución es manual y visible; no hay asignación silenciosa. Permite guardar sin distribuir y limpiar propuestas.
- Un error al cargar no permite guardar un conjunto vacío accidental. Errores de saldo/estado del servidor se muestran y permiten actualizar. Un fallo de upload informa que el pago ya quedó PENDING y reintenta el archivo sobre el mismo ID, sin duplicarlo.
- `BillingAccountStatementComponent` reemplaza la pestaña financiera incompleta del perfil del alumno: saldo total, vencido, total pagado, cargos y pagos con sus estados/historia.
- Interfaces en `billing-payment.models.ts` y ampliación de BillingManagementService. Angular recibe morosidad y saldos del backend; no implementa reglas alternativas de vencimiento o contabilidad.

## Pruebas

| Escenario obligatorio | Resultado |
|---|---|
| Cargo 35000 + propuesta PENDING 20000 | OK: paid=0, balance=35000, PENDING |
| Confirmar 20000 | OK: paid=20000, balance=15000, PARTIAL |
| Confirmar segundo pago 15000 | OK: paid=35000, balance=0, PAID |
| Un pago 70000 para dos cargos 35000 | OK: ambos PAID |
| Distribución 35000 de pago 50000 | OK: confirmación rechazada |
| Sin allocations | OK: guardar PENDING permitido; confirmar rechazado |
| Propuesta mayor que payment.amount | OK: PUT rechazado |
| Allocation mayor que saldo | OK: rechazado; se revalida al confirmar |
| Dos propuestas PENDING al mismo saldo | OK: ambas guardan; después de confirmar una, la otra no confirma |
| Dos confirmaciones simultáneas MySQL | OK: exactamente una confirma, sin sobrepago |
| Confirmación de varios cargos con uno invalidado | OK: rollback completo, ningún saldo parcial aplicado |
| PUT sobre CONFIRMED | OK: rechazado; histórico inmutable |
| PENDING → VOID/REJECTED | OK: no afecta saldos; conserva allocations |
| CONFIRMED → VOID/REJECTED | OK: rechazado |
| Reabrir VOID/REJECTED/REFUNDED | OK: rechazado |
| Refund de único abono 20000 | OK: recupera 35000 y PENDING |
| Refund de 15000 entre dos pagos | OK: quedan paid=20000, balance=15000, PARTIAL |
| Refund conserva allocations | OK: filas permanecen y dejan de contarse |
| PARTIAL vencido | OK: effectiveStatus=OVERDUE calculado |
| PAID | OK: no moroso |
| Cargos PAID/VOID | OK: no elegibles |
| Academia o alumno diferentes | OK: rechazados |
| Reducir payment.amount bajo distribución | OK: rechazado; exige redistribuir primero |
| UNIQUE(payment,charge) | OK: request repetido consolidado; duplicado SQL rechazado |
| Comprobante válido / firma falsa | OK: guarda/descarga desde storage; falso rechazado |
| Cambiar comprobante confirmado | OK: rechazado |
| Estado de cuenta mixto | OK: excluye VOID de deuda y no suma PENDING/refund como pagado |
| Acceso financiero ajeno, instructor y no autenticado | OK: bloqueado por autorización existente |
| Upload fallido y reintento Angular | OK: conserva el ID y no duplica el pago |

Backend completo: **530/530**. Angular ChromeHeadless: **398/398**. MySQL ETAPA 9: **45/45**. Regresiones MySQL: ETAPA 8 **36/36**, ETAPA 7 **18/18**, ETAPA 6 **21/21**.

## Builds y regresión

Backend restore/build/test/publish: **OK**. Frontend npm run build, SEO y tests: **OK**. Las compilaciones limpias mantienen advertencias previas de nullable/código generado y CommonJS; no hay errores pendientes.

| Área | Resultado y evidencia |
|---|---|
| ETAPA 1 | OK: suites existentes de modalidades y alcance académico |
| ETAPA 2 | OK: salas, validaciones y autorización |
| ETAPA 3 | OK: instructores y asignaciones |
| ETAPA 4 | OK: clases y horarios |
| ETAPA 5 | OK: enrollments, sesiones y zona de academia |
| ETAPA 6 | OK: asistencia y 21 verificaciones MySQL |
| ETAPA 7 | OK: planes/membresías y 18 verificaciones MySQL |
| ETAPA 8 | OK: cargos, snapshots, mensualidad, PER_CLASS, idempotencia, morosidad y 36 verificaciones MySQL |
| Eventos y legacy | OK: suites existentes de eventos, categorías, competidores, inscripciones, teams, fixtures/brackets, resultados/scoreboard y pagos competitivos |

La regresión de eventos corresponde a las pruebas automatizadas existentes, no a una sesión manual de producción ni una nueva certificación externa de TicketFactor. Su lógica, RegistrationPricing, CompetitionSchedule e invitaciones no se modificaron. Los helpers de comprobantes legacy se reutilizan sin modificar PaymentsController.

Evidencias locales: `stage9-restore.log`, `stage9-backend-build.log`, `stage9-backend-tests.log`, `stage9-backend-publish.log`, `stage9-mysql-publish.log`, `stage9-regression-publish.log`, `stage9-frontend-build.log`, `stage9-frontend-tests.log` y `stage9-package.log`.

Evidencias MySQL: `/root/bte-stage9/stage9-results-final.log`, `stage8-regression.log`, `stage7-regression.log` y `stage6-regression.log`. Los fixtures se limpian al terminar, conservando los datos originales. Los DELETE utilizados por runners son exclusivamente limpieza de datos temporales de prueba.

La última ejecución de las cuatro suites usó el binario final con fechas UTC de auditoría. Su SHA256 en la réplica coincide con el release local. Consulta final de limpieza: cero cargos, pagos, allocations, planes, clases y asistencias, igual que antes de las pruebas.

Entrega: `release/stage9-backend/`, `dist-stage9/` y `entregables/bte-frontend-app-20261018-etapa-9.zip`, preparado para `/bte/`. Antes de publicar en otro entorno se debe auditar su información financiera y aplicar solo el incremental pendiente. La migración en esta entrega se limita a la réplica autorizada.

SHA256 bte.api.dll final: `02ab57356b89cedb0866dfb8a3152112b8d5b4cdd316a36467822dfcdb364400`. SHA256 frontend: `33ca25c198cb730ab859c05038b191741ecb6f4ecbd945c3b00cea9db1febef7`. El empaquetador verificó scripts, estilos, fuentes, iconos y manifest para `/bte/`.

**ETAPA 9 COMPLETA**. Se detiene el desarrollo antes de ETAPA 10.
