# F1 — Etapa 4: conciliación, trazabilidad y abonos por lote

Estado: implementado localmente. No se modificó producción ni se ejecutó la migración contra una base de datos real.

## Decisiones confirmadas

- Un lote admite múltiples transferencias y comprobantes. La suma aprobada y pendiente de revisión limita el siguiente abono; no se permiten nuevos sobrepagos.
- La preventa requiere completar el lote con comprobantes recibidos antes del vencimiento. Si los abonos oportunos no alcanzan el total, se recalcula el precio vigente y se descuentan los importes aprobados. La aprobación posterior al vencimiento conserva una cobertura completa recibida a tiempo.
- Organizadores, coorganizadores y administradores pueden conciliar pagos antiguos y confirmar precios históricos, con motivo obligatorio e historial. La academia consulta solamente sus propios movimientos.

Esta etapa amplía la etapa 3: ya no se exige cubrir el lote entero con una única transferencia. La selección del lote sigue siendo obligatoria.

## Abonos y saldos

`EventPaymentLedger` cuenta una transferencia una sola vez aunque tenga varios comprobantes. Las filas antiguas sin GUID mantienen su referencia individual `legacy-ID`; no se inventan agrupaciones que los datos no acreditan.

Cada lote expone importe aprobado, pendiente de revisión, saldo pendiente, disponible para un nuevo abono, sobrepago y estado. El disponible descuenta tanto lo aprobado como lo pendiente; rechazar una transferencia libera únicamente su importe. Los sobrepagos preexistentes se muestran como crédito y no habilitan más cargas.

Los lotes incompletos se actualizan con las tarifas vigentes al consultar los lotes o intentar un abono. Un vencimiento o cambio de fecha queda registrado con el total, período y fecha de corte anteriores y nuevos. Se guardan nuevas versiones de los cálculos sin eliminar las anteriores. Un lote completamente cubierto y reservado conserva el cálculo recibido a tiempo.

No se permite cancelar, reemplazar ni cambiar categorías de un lote con abonos pendientes de completar. Debe continuarse pagando el mismo lote. Las categorías nuevas en combinaciones conservan las partes ya pagadas.

Los importes por inscripción solo se atribuyen cuando se conocen: un lote parcial con varios inscritos mantiene el detalle financiero por lote, sin distribuir el abono arbitrariamente entre deportistas. Si el lote tiene un solo inscrito, su abono sí puede reflejarse en esa inscripción.

## Conciliación administrativa

La nueva sección de la revisión del organizador permite:

1. Consultar transferencias originales, estado, revisión e importes aprobados sin asignar.
2. Asignar todo o parte de una transferencia antigua aprobada a un lote de la misma academia y evento.
3. Distribuir una transferencia entre varios lotes, mediante asignaciones independientes, sin superar el importe disponible ni los saldos de destino.
4. Confirmar documentalmente los precios originales cuando faltan cálculos históricos. Se crea un lote histórico con los inscritos, sus precios, períodos, responsable y motivo; después se asignan los fondos.
5. Revertir una asignación con motivo, liberando nuevamente su importe. La reversa no elimina ni modifica la transferencia original y conserva la asignación anterior marcada como revertida. Si existen pagos posteriores dependientes de esa asignación, la API exige revisar la conciliación completa antes de revertirla.

Confirmar un precio histórico es una intervención explícita del organizador basada en el registro original; no deduce una preventa de un abono incompleto. Los cálculos históricos confirmados se conservan al asignar el pago comprobado.

Los pagos antiguos no asignados bloquean nuevos abonos para evitar volver a cobrar dinero ya recibido. Los créditos remanentes siguen visibles y disponibles para asignarlos a otros lotes de ese mismo evento y academia. No se crea una pasarela de pagos ni se efectúan devoluciones automáticas.

## Trazabilidad y acceso

`event_payment_allocations` almacena origen, destino, importe, actor, motivo, fecha y referencia idempotente. Conserva los datos de la reversa.

`event_payment_audit` registra cargas, revisiones, creación/cancelación de lotes, actualización de precios, confirmación histórica, asignaciones y reversas. Las cargas registran también los hashes SHA-256 de los comprobantes. El historial diferencia acciones del usuario de actualizaciones automáticas, conserva los detalles anteriores y posteriores y enlaza la transferencia de origen.

Los endpoints verifican permisos contra la base de datos. Las operaciones financieras se serializan mediante el bloqueo del evento dentro de una transacción relacional; las referencias de operación tienen índices únicos y los reintentos con contenido distinto se rechazan. El servidor comprueba propiedad de academia y evento, estado aprobado del origen, saldo sin asignar y saldo disponible de destino.

Rutas nuevas, bajo `/api/events/{eventId}/payments`, con `academyId` en query:

- `GET ledger`: consulta de transferencias, asignaciones e historial.
- `POST allocations`: asignación administrativa.
- `POST allocations/{allocationId}/reverse`: reversa con motivo.
- `POST historical-batches`: confirmación de precios históricos y creación de lote.

Las academias ven el historial en su resumen; las acciones administrativas aparecen en la revisión del organizador.

## Base de datos y publicación

Migración: `20261022000300_AddEventPaymentReconciliation`, posterior a la migración de auditoría de excepciones de la etapa 3.

Agrega las tablas `event_payment_allocations` y `event_payment_audit`, y las columnas `is_historical` y `version` de `tariff_payment_batches`. No cambia importes ni vínculos de los comprobantes originales. Se actualizó el snapshot del modelo y se verificó la generación de SQL con el proveedor MySQL sin conectarse a un servidor.

La publicación debe realizarse con respaldo previo, aplicación de las migraciones pendientes y actualización conjunta de backend y frontend. Siguen aplicando las instrucciones de producción y del carrusel en `AGENTS.md`.

## Validación

Resultado: 643 pruebas de backend y 39 pruebas de frontend aprobadas; compilación Angular sin emisión correcta.

Se verificaron abonos consecutivos, límites con pagos pendientes, idempotencia, aprobación/rechazo independiente, sobrepagos preexistentes, cierre completo e incompleto de preventa, cambios explícitos del vencimiento, conservación de cálculos anteriores, asignaciones y reversas, confirmación histórica, permisos por academia y generación de SQL. Las pruebas de frontend incluyen pagos inferiores al total, límites por saldo disponible, reintentos y revisión administrativa.

Las pruebas relacionales contra MySQL real y el despliegue quedan pendientes. Se mantiene excluida la prueba preexistente de deserialización decimal de `StudentUpdateTests.SharedFormPayloadDeserializesAndValidatesWithoutLegacyContactFields`, afectada por la configuración regional de Windows.

La corrección de permisos del logo del organizador en exportaciones corresponde a la etapa 5.
