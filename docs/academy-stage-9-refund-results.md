# ETAPA 9: contrato definitivo de refund

Corrección incremental del refund académico. Se conservan las implementaciones correctas de ETAPA 9 y no se inicia ETAPA 10. Validación sobre código local y MySQL real en `athena_stage4_test`; producción no publicada.

## Auditoría inicial

La tabla completa Componente | Estado inicial | Corrección aplicada está en [academy-stage-9-refund-audit.md](academy-stage-9-refund-audit.md). La transacción, state machine, recálculo compartido, locks, historial de allocations y vista de saldo estaban COMPLETOS. El motivo y su almacenamiento estaban FALTANTES. El request vacío era INCORRECTO para el contrato nuevo. La integridad previa, respuesta agregada, diálogo y pruebas de rollback/doble refund estaban PARCIALES.

## Base de datos

Se verificaron las columnas reales: refunded_by INT y refunded_at DATETIME ya existían; refund_reason no existía. Antes de probar había cero pagos y allocations.

Script aplicado una vez exclusivamente en la réplica: [_script/bte_stage_9_refund_transaction_corrections.sql](../_script/bte_stage_9_refund_transaction_corrections.sql).

```sql
ALTER TABLE billing_payments ADD COLUMN refund_reason VARCHAR(500) NULL;
```

No se recrearon tablas ni se modificaron índices, FK, UNIQUE o constraints existentes. No se reejecutaron migraciones anteriores. La columna es nullable para no inventar motivos de refunds históricos; toda operación nueva exige motivo en el backend. La longitud coincide con la convención de notas financieras existente: máximo 500 caracteres.

Respaldo previo: `/root/bte-stage9-refund/before-refund.sql`. SHA256: `ce9ee7abb7c5b86ca34f84eef1058688b56511b1bbff9e4db883a9c230a29d04`.

SHA256 del incremental ejecutado: `aac760dd7865a02314ea41844fbbe2ff96393c5419b386000e2da25002835e71`.

La vista `vw_student_billing_balance` ya suma solo allocations de CONFIRMED. Se conserva y se verificó que el refund elimina automáticamente su efecto financiero sin borrar ni modificar filas.

## Backend

Se modificaron las entidades/DTO existentes y `BillingService.Payments.cs`, conservando la clase BillingService. No se agregó un servicio financiero paralelo ni otra implementación de recálculo.

- `BillingPayment.RefundReason`: campo nuevo mapeado a refund_reason con longitud 500.
- `PaymentRefundRequest`: motivo requerido, límite 500 y rechazo de propiedades desconocidas. No admite amount, allocationId, refund parcial ni selección de estado.
- `BillingPaymentRead`: expone el motivo histórico junto con refundedBy/refundedAt existentes.
- `BillingPaymentDetail`: conserva payment/allocations y agrega academyTimeZone, affectedCharges y accountStatement.
- `BillingAndGradingController.RefundPayment`: usa el request nuevo, autorización existente y ámbito de academias legibles del alumno para el resumen.
- `BillingChargeService`: conserva la prohibición de anular cargos con allocations; cuando hay dinero confirmado devuelve un mensaje específico indicando que primero deben regularizarse o reembolsarse esos pagos.

Refund permite exclusivamente CONFIRMED→REFUNDED y requiere motivo no nulo, no vacío ni compuesto de espacios, de hasta 500 caracteres. Se guarda sin espacios exteriores. PENDING, REJECTED, VOID y REFUNDED se rechazan. El segundo refund no altera el motivo, actor o fecha del primero.

La operación conserva una única transacción READ COMMITTED. Primero bloquea el pago con SELECT FOR UPDATE y recarga su estado; luego bloquea los cargos de sus allocations en orden ascendente de ID. Antes de mutar valida que existan allocations, importes positivos, IDs de cargo válidos y coherencia de alumno/academia. Un cargo VOID con una allocation confirmada se trata como inconsistencia y se aborta, sin cambiar su estado ni reparar datos silenciosamente. Un confirmado sin allocations también se aborta. No se vuelve a exigir SUM(allocations)=payment.amount como si fuera una confirmación nueva.

Dentro de esa misma transacción se escribe REFUNDED, refunded_by, refunded_at UTC y refund_reason. Se conservan íntegros los IDs, importes, fechas y actores de las allocations históricas. No se borran pagos ni allocations, ni se crean cargos o pagos negativos.

Confirmación y refund siguen usando `RecalculateLocked` y `ConfirmedPaidAsync` como fuente única de recálculo. Solo suman pagos CONFIRMED restantes. No se restauran estados históricos:

```text
paidAmount = SUM(allocations cuyo payment.status = CONFIRMED)
balance = MAX(totalAmount - paidAmount, 0)
paidAmount = 0                → PENDING
0 < paidAmount < totalAmount  → PARTIAL
paidAmount = totalAmount      → PAID
```

VOID permanece terminal. OVERDUE no se persiste: se sigue calculando con balance, vencimiento, gracia snapshot y fecha local de academia. Los cargos relacionados con el pago son los únicos que se recalculan; la lectura del resumen no modifica otros cargos de la academia.

Después de guardar el recálculo se prepara la respuesta agregada **antes del COMMIT**. Así, también un error al calcular el resultado revierte cambios financieros. Cualquier excepción dentro del scope produce rollback del estado, auditoría y cargos. No hay una segunda transacción independiente para recalcular.

La autorización sigue siendo la de AcademyAuthorizationService/AcademyScopeAuthorizationFilter. Se valida la academia del pago y el permiso financiero; el cliente no elige el alcance del resumen ni otros propietarios desde el body.

## Endpoint y contrato

Ruta principal:

```http
POST /api/billing-payments/{paymentId}/refund
Content-Type: application/json
Authorization: Bearer ...
```

La ruta académica anterior `/api/billing/payments/{id}/refund` es alias de la misma acción y exige el mismo motivo. Se retira la aceptación de `{}` para refund; confirmación/rechazo/anulación conservan sus contratos.

Request:

```json
{"reason":"Transferencia registrada por error"}
```

Respuesta: wrapper ApiResponder real, `estado="success"`, `codigo=200`, `message="Pago reembolsado correctamente."`. Data sigue siendo BillingPaymentDetail; estos son sus campos relevantes en un ejemplo de refund de 15000 que deja otro pago confirmado de 20000:

```json
{
  "estado": "success",
  "codigo": 200,
  "message": "Pago reembolsado correctamente.",
  "data": {
    "payment": {
      "id": 58,
      "academyId": 1,
      "studentId": 120,
      "amount": 15000,
      "status": "REFUNDED",
      "allocatedAmount": 15000,
      "remainingToAllocate": 0,
      "refundedBy": 7,
      "refundedAt": "2026-10-18T20:00:00Z",
      "refundReason": "Transferencia registrada por error"
    },
    "allocations": [{"id": 9, "chargeId": 101, "amount": 15000}],
    "academyTimeZone": "America/Santiago",
    "affectedCharges": [{
      "id": 101,
      "paidAmount": 20000,
      "balance": 15000,
      "status": "PARTIAL",
      "effectiveStatus": "OVERDUE",
      "isOverdue": true
    }],
    "accountStatement": {
      "studentId": 120,
      "totalCharged": 35000,
      "totalPaid": 20000,
      "totalPending": 15000,
      "totalOverdue": 15000,
      "balance": 15000,
      "charges": [{"id": 101, "status": "PARTIAL", "balance": 15000}],
      "payments": [{"id": 57, "status": "CONFIRMED"}, {"id": 58, "status": "REFUNDED"}]
    }
  }
}
```

El ejemplo abrevia los campos ya existentes de payment, allocations, charges y payments; el endpoint devuelve sus DTO completos. academyTimeZone se resuelve con Academy→Country→TimeZone; Santiago en este ejemplo no es una zona global para todas las academias. El resumen incluye únicamente academias autorizadas del alumno.

## Frontend

Se reutiliza `AcademyConfirmDialogComponent`, ampliándolo con un campo de motivo opcional para otros usos y obligatorio para refund. No se crea un segundo confirmador. Los diálogos de desactivación/confirmación anteriores mantienen su comportamiento.

Reembolsar aparece únicamente en CONFIRMED. El diálogo pide Motivo del reembolso, impide blancos/espacios/más de 500 y explica: “El pago dejará de aplicarse a los cargos relacionados y sus saldos serán recalculados. Esta operación conserva el historial financiero.” Aclara que es total. Se bloquea la apertura de dos confirmaciones simultáneas y el submit mientras está en curso.

BillingPaymentDetail consume el resultado devuelto: estado REFUNDED, motivo, cargos recalculados y totales del alumno. Muestra refundedAt en la zona de la academia indicada por backend usando formato de fecha, sin lógica contable en Angular.

BillingManagementService publica el resultado del refund. El listado actualiza el pago y el estado de cuenta reemplaza su resumen, cargos y pagos con el DTO autorizado del servidor. No recalcula saldos ni hace requests por fila. Una respuesta tardía de una consulta anterior no puede sobrescribir el resumen posterior al refund. El detalle no necesita volver a consultarse tras un refund exitoso.

El pago permanece visible históricamente como REFUNDED; totalPaid vigente proviene de las allocations confirmadas restantes. No se suma todo el historial de payments.

## Pruebas ejecutadas

| Escenario | Resultado |
|---|---|
| Refund de único payment 35000 | OK: PENDING, paid=0, balance=35000; conserva allocation |
| Refund de 15000 dejando confirmado 20000 | OK: PARTIAL, paid=20000, balance=15000 |
| Payment repartido entre dos cargos | OK: recalcula ambos en la misma transacción |
| Refund recupera deuda vencida | OK: status financiero PENDING/PARTIAL, isOverdue=true, effectiveStatus=OVERDUE |
| Motivo nulo, vacío, espacios o >500 | OK: rechazo, sin mutación |
| Motivo válido con espacios exteriores | OK: se guarda trim y aparece con actor/fecha UTC |
| Refund desde PENDING/REJECTED/VOID/REFUNDED | OK: rechazo |
| Dos refunds simultáneos MySQL | OK: exactamente uno tiene éxito; conserva un motivo y un historial |
| Error forzado durante recálculo del segundo cargo | OK: rollback; pago CONFIRMED, auditoría de refund null y ambos cargos PAID con saldos anteriores |
| Reintento después del error forzado | OK: refund completo de ambos cargos |
| Historial de allocations | OK: mismos IDs, importes, fechas y actores antes/después |
| Confirmado sin allocations | OK: inconsistencia; aborta |
| Cargo inexistente, alumno/academia ajenos o VOID | OK: inconsistencia; aborta sin arreglos silenciosos |
| Anular cargo con dinero confirmado | OK: rechazo explícito |
| Vista de balance tras refund | OK: deja de contar automáticamente el pago reembolsado |
| Respuesta agregada | OK: cargos y estado de cuenta coinciden con backend y respetan academias autorizadas |
| Body con monto parcial | OK: DTO rechaza propiedad desconocida |
| Diálogo de refund y actualización Angular | OK: razón requerida, no doble diálogo, usa respuesta sin contabilidad propia |
| Respuesta antigua de cuenta llega tarde | OK: no reemplaza el resultado del refund |
| Confirmación y allocations PENDING/CONFIRMED | OK: regresión completa de ETAPA 9 |

Backend completo: **546/546**. Angular ChromeHeadless: **405/405**. MySQL ETAPA 9 ampliada: **66/66**.

Regresiones MySQL con este backend: cargos ETAPA 8 **36/36**, planes ETAPA 7 **18/18**, asistencia ETAPA 6 **21/21**. Las suites completas también verifican modalidades, salas, instructores, clases, horarios, enrollments, sesiones, planes, cargos, mensualidades, PER_CLASS, morosidad y estado de cuenta.

Regresión legacy: **OK en las suites automatizadas existentes** de eventos, categorías, competidores, inscripciones, teams, fixtures/brackets, resultados/scoreboard y pagos legacy. No se modificaron sus reglas, TicketFactor, RegistrationPricing, CompetitionSchedule ni el flujo competitivo. Esto no representa una prueba manual nueva en producción o una certificación de proveedores externos.

## Builds y entrega

Backend restore/build/test/publish: **OK**. Frontend npm run build, SEO y tests: **OK**. Se conservan las advertencias previas de nullable/código generado y CommonJS; no hay errores pendientes.

Evidencias locales: refund-restore.log, refund-backend-build.log, refund-backend-tests.log, refund-backend-publish.log, refund-mysql-publish.log, refund-frontend-build.log, refund-frontend-tests.log y refund-package.log.

Evidencias MySQL: `/root/bte-stage9-refund/refund-results.log`, stage8-regression.log, stage7-regression.log y stage6-regression.log. El interceptor de fallo existe únicamente en el runner de pruebas; no se incorporaron puntos de fallo a producción.

Entrega local: `release/refund-backend/`, `dist-refund/` y `entregables/bte-frontend-app-20261018-refund.zip`, para `/bte/`. La publicación queda pendiente. Partial refund no soportado todavía. ETAPA 10 no iniciada.

SHA256 del backend local y probado en la réplica: `a92d4dac0fc76a32397f5a1387cb5a6ea1204e94930d95b048701522aa2342df`. Verificación final de limpieza: cero cargos, pagos, allocations, planes, clases y asistencias, igual que al iniciar las pruebas.

SHA256 frontend: `30a83cac3f492e8b6088a61818384c5bd505d4ed1018102620f53a8237157fa3`. El paquete pasó las verificaciones de SEO y de scripts, estilos, fuentes, iconos y manifest para `/bte/`.
