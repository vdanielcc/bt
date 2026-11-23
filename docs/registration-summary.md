# Resumen de inscripciones y comprobantes

El botón **Confirmar** de la pestaña Inscripciones abre `/campeonatos/invitaciones/:id/resumen` dentro de Angular. No usa la sesión ni la página PHP anterior.

El resumen muestra deportistas/equipos inscritos de la academia de la sesión, sus categorías, tarifas y total. Los datos bancarios se leen de `event.method_of_payment` y se presentan con el saneamiento HTML de Angular. La pasarela permanece deshabilitada como «Próximamente».

## API

- `GET /api/Payments/registration-summary?eventId=35&academyId=9`: resumen, datos de transferencia, total, montos aprobados y pendientes, saldo e historial.
- `POST /api/Payments/transfer`: multipart con `eventId`, `academyId`, `amount`, `requestId` (UUID) y de 1 a 5 `files` JPG/PNG/PDF de hasta 5 MB cada uno. El monto corresponde a una transferencia completa, no a cada archivo.
- `GET /api/Payments/{id}/receipt`: descarga autenticada por ID de pago. El filtro de autorización comprueba la academia propietaria.

Se reutilizan las tablas `competitors`, `category_competitor`, `ticket_factor`, `guests` y `payment`; no hay migraciones. Las tarifas se calculan en backend según el factor y tipo de inscripción. Cuando falta una tarifa se muestra «Por definir» y se bloquea el envío de comprobantes.

Cada comprobante tiene una fila `payment` con el mismo GUID y monto de transferencia, respetando el modelo existente. El resumen agrupa por GUID para contar el monto una sola vez. Solo se considera aprobado cuando todos los comprobantes de la transferencia tienen `vb_organizer=true`. Los montos pendientes no reducen el saldo. No se implementa una nueva pantalla de aprobación en este cambio.

La escritura usa transacción y bloqueo del evento en MySQL. Un reintento con el mismo UUID, monto y archivos devuelve el resultado previo; un UUID reutilizado con otro contenido devuelve 409.

Los archivos nuevos se guardan en `Storage:BasePath/receipts/{eventId}/{academyId}/{requestId}/{uuid}.{ext}`. La API no acepta rutas del cliente y la descarga no es pública. Comprobantes históricos que sigan almacenados fuera de esta estructura requieren migración de archivos/rutas para descargarlos desde la nueva API; sus montos sí se incluyen en el historial.

## Publicación y validación

Publicar backend y frontend juntos. El usuario del servicio debe poder escribir en `Storage:BasePath`. Si hay un proxy inverso, debe admitir solicitudes de al menos 27 MB para permitir cinco comprobantes de 5 MB más el multipart. No publicar la carpeta de comprobantes como directorio estático público.

Validado con pruebas en memoria del resumen, transferencia, idempotencia, rechazo de archivos y alcance de academia; pruebas Angular del formulario y contrato HTTP; compilación AOT y production. No se crearon pagos de prueba en producción.
