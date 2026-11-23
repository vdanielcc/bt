# Propuesta de tarifas por combinación

Estado: implementado localmente, con migración SQL preparada. La base productiva y los servicios publicados no se han modificado para esta mejora.

## Requisitos confirmados

- El organizador configura las combinaciones necesarias de cantidades por modalidad y su precio total.
- La coincidencia exige la misma cantidad por modalidad que la selección completa; el orden no afecta.
- Las configuraciones de inscripción individual y de equipo son independientes.
- Cada tarifa tiene un indicador «Es preventa». La fecha `event.presale_end_at` determina la vigencia.
- La preventa requiere pagar antes del cierre. Las categorías agregadas después deben cobrarse a precio normal.
- Los pagos cubren lotes de inscripciones de una academia, separados por período: por ejemplo, cinco deportistas en un lote de preventa y tres en otro normal requieren dos pagos diferenciados.
- Cada lote debe conservar los deportistas, categorías y versiones de cálculo incluidos. Un pago de la academia no acredita automáticamente inscripciones ajenas a su lote.
- La cobertura del lote de preventa debe verificarse antes de la fecha de cierre. Las incorporaciones posteriores no deben incorporarse retrospectivamente al lote pagado en preventa.
- Todas las categorías participan del conteo, incluidas las gratuitas. Cada categoría marcada gratuita tiene importe cero.
- Una combinación sin tarifa no bloquea la inscripción: genera una advertencia para el administrador y queda pendiente de cálculo.
- Los cálculos se versionan y pueden recalcularse por incorporación, retiro, cambio de categorías o instrucción administrativa.
- Si no existen reglas nuevas activas, se usa el cálculo antiguo.

## Configuración propuesta

Una fila de tarifa contiene:

1. Tipo de inscripción: individual o equipo.
2. Uno o más términos: modalidad y cantidad entera positiva.
3. Precio total.
4. Es preventa.
5. Activa.

No se deben permitir dos tarifas activas con la misma combinación, tipo de inscripción y período. La validación debe existir tanto en el backend como en una restricción de base de datos.

La identidad canónica de una combinación utiliza identificadores de modalidad y cantidades ordenadas por identificador. No depende de nombres ni del orden de selección del deportista.

## Cálculo y estados

- Sin reglas nuevas activas en el evento: flujo antiguo.
- Con reglas nuevas activas: buscar la coincidencia exacta correspondiente al tipo y período.
- Sin coincidencia: estado `PENDING_RATE`, con total desconocido; nunca interpretar la ausencia como gratuidad ni reemplazarla silenciosamente por el precio antiguo.
- Con coincidencia: estado calculado y registro de la tarifa y de su configuración utilizada.
- Con selección vacía por retiro: nuevo cálculo que registra el retiro; conserva los anteriores y los pagos recibidos.

Si falta la tarifa de preventa durante su vigencia, se recomienda advertir y dejar pendiente el precio de preventa, sin elegir automáticamente otro período. Esta política debe mostrarse explícitamente al organizador.

## Versionado

Cada cálculo persistido debe incluir:

- Evento, competidor y versión consecutiva.
- Fecha y hora del cálculo; usuario o proceso responsable.
- Motivo: inscripción, cambio de categorías, retiro, recálculo administrativo, cambio de período o validación de pago.
- Selección completa con modalidad y gratuidad de cada categoría.
- Tarifa aplicada, período y copia de los términos/precios usados.
- Desglose, total o estado pendiente con advertencia.
- Referencias a pagos y al cálculo anterior cuando corresponda.

La modificación de una tarifa no altera los registros anteriores. Un recálculo explícito crea otra versión aun cuando conserve el importe. Las simulaciones no generan cobros ni versiones financieras.

La escritura del cálculo, su marcador vigente y los cambios de inscripción deben ser transaccionales. Reintentar la misma operación de confirmación no debe duplicar versiones. Un identificador de operación permite distinguir un reintento de un recálculo solicitado nuevamente.

## Impactos detectados en el código revisado

- `EventPricingService` cobra por categoría/adicional o por grupo; necesita selección de combinaciones.
- Actualmente hay una única regla activa por evento. Las filas de combinaciones requieren una estructura específica o una configuración que contenga múltiples filas, sin mezclarla con grupos tarifarios.
- `CompetitorCharge` ya conserva cálculos anteriores, pero faltan versión explícita, motivo, responsable y consulta del historial.
- `EnsureEditableAsync` bloquea cambios cuando la academia tiene pagos asociados. Se necesita un flujo de ajuste autorizado que preserve pagos y registre el cambio.
- Los pagos se registran por academia/evento y referencia de transferencia, con varios comprobantes que repiten el monto. Cualquier cálculo de cobertura debe agrupar por referencia y evitar contar un pago varias veces.
- No existe asignación de estos pagos a deportistas ni fecha estructurada de transferencia bancaria. La fecha de carga y la de aprobación son distintas.
- Los resúmenes de inscripciones/pagos excluyen deportistas sin categorías. Para conservar créditos y saldos después de retiros, deben considerar también sus ajustes e historial.
- Los totales incompletos se presentan actualmente como suma de valores disponibles. Debe conservarse la indicación de incompletitud y distinguir claramente total conocido de total definitivo.
- El frontend de tarifas contiene comportamientos que difieren de la copia de backend revisada: precio base propio por grupo y recálculo automático al activar. Antes de implementar se debe reconciliar la fuente actual y conservar cambios anteriores.

## Decisiones resueltas

1. Cobertura de pagos resuelta: lotes de deportistas inscritos de una academia, diferenciados entre preventa y período normal. Debe añadirse una relación explícita entre lote, inscripciones/versiones y referencia de transferencia, ya que el modelo actual sólo relaciona academia/evento. Los pagos históricos sin lote no deben asignarse automáticamente por inferencia.
2. Las categorías agregadas después del cierre se cobran con la tarifa normal de su propia combinación y se suman al paquete ya pagado en preventa.
3. El precio total del paquete ya contempla la gratuidad. Todas las categorías participan en la coincidencia; las gratuitas tienen importe cero en el desglose. Si todas son gratuitas, el importe aplicado es cero.
4. Cada deportista tiene detalle, historial e importe pagado asignado a través de su lote; la academia dispone de totales, pagos pendientes, saldo y saldo a favor.

El sistema actual no registra una fecha bancaria estructurada. La implementación toma la fecha de recepción del comprobante en el sistema y exige aprobación del organizador. Un comprobante recibido a tiempo y aprobado después del cierre conserva la preventa; un comprobante rechazado no la acredita. La fecha de cierre del evento se interpreta en `America/Santiago` y se convierte a UTC para compararla con la recepción del pago.

## Implementación local

- Nueva estrategia `BY_COMBINATION` con configuración serializada dentro de la regla del evento y validación de coincidencias duplicadas.
- Motor en `Services/EventPricingService.Combinations.cs`.
- Historial, recálculo individual/global y lotes en `Controllers/EventPricingController.Combinations.cs`.
- Migración `Migrations/20261008_CombinationTariffs.sql`: configuración, metadatos de versiones, lotes, detalles y relación con pagos.
- Formularios de combinaciones y recálculo; historial por deportista; selección de grupos y comprobantes por lote.
- Un pago debe cubrir el total del lote seleccionado. No se permiten dos transferencias aprobadas/pendientes sobre el mismo lote.
- Un lote sin pagos pendientes o aprobados puede cancelarse sin eliminar sus inscripciones ni su historial; después puede crearse un lote actualizado.
- Las simulaciones y consultas muestran el precio vigente. Los cambios de inscripción, recálculos explícitos, creación de lotes y revisión de pagos guardan los cálculos financieros correspondientes.

Las 66 pruebas de backend usan EF InMemory. El 08/10/2026 se restauró el respaldo productivo en una base MySQL aislada (`bte_combination_20261008_test`), se verificaron los conteos de las 109 tablas originales y se ejecutó correctamente la migración completa, incluidas sus claves foráneas y restricciones. También pasaron 26 pruebas de frontend, la validación AOT y la compilación de producción para `/app/`.

Los pagos históricos sin lote se conservan en el resumen global, pero no se asignan automáticamente a deportistas ni acreditan preventa bajo el nuevo motor. Su asignación debe revisarse al migrar eventos existentes.

## Validaciones necesarias antes del despliegue

- Coincidencia exacta, selección desordenada y número arbitrario de modalidades.
- Tarifas separadas para individuales y equipos; rechazo de duplicados activos.
- Categorías gratuitas incluidas en conteo y con importe cero.
- Falta de tarifa permite inscripción y produce advertencia y total pendiente.
- Fecha de corte de preventa en hora del evento; ausencia de fecha; pago pendiente/rechazado/parcial.
- Incorporaciones posteriores, retiros, reintegros y ajustes administrativos.
- Historial inmutable, versión vigente única y reintentos sin duplicados.
- Totales y saldos consistentes sin alterar pagos aprobados.
- Compatibilidad con eventos que permanecen en el flujo antiguo.

Para publicar: respaldar y verificar base/API/frontend, probar la migración en MySQL aislado, aplicar la migración aditiva, desplegar backend y frontend y comprobar pagos, historial y el endpoint público `Events/upcoming` con `Origin` y `X-FRONT`.
