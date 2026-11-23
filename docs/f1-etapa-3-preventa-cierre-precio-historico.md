# F1 — Etapa 3: preventa, cierre e importes históricos

Estado: implementado localmente; pendiente de aplicar la migración y publicar backend y frontend juntos. No se modificó producción.

## Reglas confirmadas

- La preventa se obtiene si el servidor recibe el comprobante válido **antes** del fin de preventa. En el instante exacto del vencimiento corresponde tarifa normal.
- Cada transferencia debe seleccionar un lote y cubrir su importe completo. Una academia puede pagar una parte de sus inscripciones seleccionando un subconjunto que quede íntegramente cubierto; no se admite abonar una fracción del lote.
- Crear una inscripción o un lote sin comprobante no asegura el precio. Se recalcula con la tarifa vigente y se rechaza la carga si el lote cambió de importe, categorías o período.
- El comprobante oportuno reserva el precio mientras se revisa. Aprobarlo conserva el cálculo del lote; rechazarlo libera esa reserva. Aprobar después del vencimiento conserva la preventa recibida a tiempo.
- Las inscripciones individuales, de equipos, masivas y las bajas comprueban el cierre en el backend. Organizadores, coorganizadores y administradores pueden efectuar una excepción indicando un motivo obligatorio de hasta 1000 caracteres.
- Una excepción al cierre no permite alterar un cobro aprobado o pendiente de revisión. Los cambios que afecten esos cobros requieren ajuste; en combinaciones se permite agregar categorías conservando íntegramente las partes pagadas.

## Implementación

`EventDeadline` interpreta las fechas sin zona como hora de `America/Santiago`, conserva los instantes UTC explícitos y rechaza horas ambiguas o inexistentes por cambios de horario. Crear y editar eventos compara preventa y cierre como instantes. La API entrega `registrationClosesAtUtc` y `presaleEndsAtUtc`, evitando que el cierre dependa de la zona horaria del navegador.

`EventPricingService` comparte el período de preventa con el adaptador antiguo y aplica las tarifas por cantidad de categorías a individuos, equipos y seminarios. Cuenta categorías deportivas reales, excluye coaches por nombre o modalidad y no confunde el identificador de una tarifa con la cantidad de categorías.

Los lotes existentes (`tariff_payment_batches`, sus ítems y `competitor_charges`) almacenan el detalle histórico para todos los modelos: antiguo, por categoría, por grupo y por combinación. Las cargas verifican el importe completo, la vigencia y el detalle antes de escribir comprobantes. Las consultas de resumen y detalle toman el precio vigente para lo pendiente y el cálculo original para lo cubierto. El historial guardado se presenta por separado del cálculo actual.

`EnrollmentDeadlineService` comprueba permisos contra la base de datos y guarda las excepciones en `enrollment_exception_audit`, dentro de la misma transacción que la inscripción. Registra evento, actor, motivo, operación, participantes/categorías solicitadas, vencimiento y fecha de ejecución. No utiliza los cuerpos del registro HTTP, que el sistema elimina deliberadamente.

El frontend permite indicar el motivo en el diálogo de inscripción; para las bajas después del cierre lo solicita antes de enviarlas. Los lotes están habilitados también para tarifas antiguas y cobran el saldo de las partes pendientes, excluyendo lo aprobado.

## Datos históricos

Se respetan los precios bloqueados de `registration_pricing`, las versiones guardadas asociadas a pagos antiguos y los cálculos de lotes aprobados. No se reescriben pagos ni se atribuyen retrospectivamente precios de preventa sin evidencia.

Un pago antiguo sin asignación por inscripción impide crear otro lote para esa academia hasta conciliarlo, evitando cobrar nuevamente inscripciones ya cubiertas. Si además falta un cálculo histórico, el importe queda pendiente de conciliación en vez de sustituirse por el precio actual. La conciliación corresponde a la etapa 4.

## Base de datos y publicación

Migración EF: `20261022000200_AddEnrollmentExceptionAudit`, posterior a `20261022000100_RevokeUserSessions`. Agrega únicamente la tabla de auditoría; no modifica tarifas, pagos o inscripciones existentes. El snapshot del modelo se actualizó.

Antes de publicar: respaldar la base de datos, aplicar la migración con el procedimiento habitual y publicar backend y frontend de esta etapa juntos. Las cargas sin lote ahora responden 422; un frontend anterior no ofrece la selección de lotes para todos los modelos.

No se ejecutó esta migración contra MySQL real. Se verificó la generación del SQL mediante el proveedor MySQL, sin conexión a servidores. Para producción se mantienen las comprobaciones de servicio y del carrusel descritas en `AGENTS.md`.

## Validación

- Suite backend: 633 pruebas aprobadas, incluida la generación de SQL. Se excluyó la prueba preexistente `StudentUpdateTests.SharedFormPayloadDeserializesAndValidatesWithoutLegacyContactFields`, que depende del formato decimal regional de Windows.
- Casos agregados: carga obligatoria por lote completo; preventa antes y en el instante del vencimiento; conservación pendiente/aprobada y liberación al rechazar; cambio de tarifa sin pago; protección solo del grupo cubierto; los cuatro modelos de precio; adición de categorías por combinación; pagos antiguos sin precio reconstruible; permisos y motivo de excepciones; horario de verano/invierno; consulta del precio actual sin sobrescribir versiones guardadas.
- Frontend: 73 pruebas aprobadas de inscripción, límites, cierre y excepciones, pago por lotes, contadores, exportaciones y cobro actual frente al historial; compilación Angular sin emisión aprobada.

La etapa 4 (conciliación, trazabilidad ampliada y tratamiento adicional de pagos parciales) queda pendiente.
