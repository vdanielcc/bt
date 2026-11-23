# Comprobantes de transferencia y revisión por dojo

Referencia de verificación: evento **34**. Las rutas de invitación y organizador deben usar el mismo ID de evento; el evento 50 mantiene sus propios pagos.

## Almacenamiento

- Carpeta base de producción: `/opt/bte-api/publish/Assets` (`Storage:BasePath`, relativa al ContentRootPath).
- Archivos: `receipts/{eventId}/{academyId}/{requestId:N}/{fileId:N}.{pdf|png|jpg}`.
- Para el evento 34: `/opt/bte-api/publish/Assets/receipts/34/`. En la inspección inicial se encontraron 21 archivos.
- Tabla `payment`, columna `receipt_path`: ruta relativa del archivo. `academy_id` identifica al dojo; `guest_id` referencia `guest.event_id`; `guid` agrupa los documentos de una transferencia.
- Existe una fila por archivo; el monto se repite en esas filas y se contabiliza una sola vez por transferencia.
- La visualización y descarga usan `GET /api/Payments/{id}/receipt` con autorización. No se publican rutas físicas ni enlaces directos a la carpeta.

## Organizador

En **Total calculado** del resumen de Mis eventos se puede buscar y seleccionar un dojo inscrito, consultar tarifas oficiales, inscritos, total, aprobado, pendiente de revisión y saldo, visualizar/descargar documentos y aprobar o rechazar la transferencia completa. El rechazo requiere motivo.

Endpoints:

- `GET /api/Payments/events/{eventId}/academies`
- `GET /api/Payments/events/{eventId}/academies/{academyId}/registration-summary`
- `POST /api/Payments/events/{eventId}/academies/{academyId}/transfers/{reference}/review`

La autorización valida la academia organizadora del evento. Cada resumen y revisión queda limitado al evento y dojo de la ruta. Las revisiones repetidas con la misma decisión son idempotentes; cambiar una decisión ya realizada devuelve 409.

## Dojo inscrito

El resumen de invitación muestra **Pendiente de aprobación**, **Aprobado** o **Rechazado**, junto con el motivo cuando corresponde. Se refresca cada 20 segundos mientras la pestaña está visible, sin interrumpir una carga o eliminación. Solo lo aprobado reduce el saldo; los rechazados no se contabilizan como pendientes de aprobación.

## Correo al organizador

La carga guarda una notificación y una entrega EMAIL dentro de la misma transacción que los pagos. El worker existente envía un único correo por carga con el detalle de inscritos/categorías/montos y todos los documentos adjuntos, usando `Smtp` de appsettings/variables de entorno.

El destinatario es el correo activo del representante legal de la academia organizadora, con respaldo en su cuenta activa o en la cuenta `academy_admin` de esa academia. Sin correo válido, la carga se rechaza con 422 y no se conservan archivos nuevos.

La repetición de una carga con el mismo RequestId no genera otro aviso. Una falla SMTP conserva el pago y programa reintento exponencial, hasta cinco intentos. Las notificaciones, destinatario, estado y errores quedan en `notifications` y `notification_deliveries`. El detalle de inscritos se guarda como snapshot en `notifications.payload_json`; los adjuntos se recuperan desde los archivos privados de esa transferencia.

## Correo de aprobación o rechazo al dojo

Cada nueva revisión genera un aviso `TRANSFER_REVIEW` dirigido al representante legal o cuenta administradora activa del dojo pagador. El correo incluye evento, dojo, referencia, monto, decisión, total, aprobado y saldo; el rechazo incluye su motivo. El HTML escapa los textos del evento, dojo y motivo.

La decisión y el aviso se guardan en la misma transacción. El registro `notifications` conserva el contenido y un snapshot de la decisión en `payload_json`; `notification_deliveries` conserva destinatario EMAIL, intentos, errores y estado de envío. Se utiliza el mismo SMTP y worker que los avisos de carga, con hasta cinco intentos. La clave `TRANSFER_REVIEW:{eventId}:{academyId}:{reference}` evita duplicados al repetir una revisión. Los pagos ya revisados antes de esta implementación no generan correos retroactivos.

El dojo debe tener un email válido configurado para completar una nueva revisión; de lo contrario, la operación devuelve 422 y la transacción no modifica la decisión del pago. Un fallo posterior del servidor SMTP no revierte la decisión: la entrega queda registrada para reintento.

Actualización de correos de revisión publicada: servicio activo y 44 resúmenes por dojo del evento 34 verificados. Respaldo: `/opt/bte-api/backups/payment-review-mail-20261005T023055Z`. Sin migración adicional ni cambios del frontend. Las 238 pruebas del backend pasan, incluyendo destinatario del dojo, registro de aprobación/rechazo, idempotencia y reintento SMTP simulado.

## Esquema y publicación

### Switch de destinatarios para pruebas

La configuración `PaymentEmails:Mode` admite exclusivamente `Debug` o `Production`, sin distinguir mayúsculas. Un valor inválido impide iniciar la API. El valor por defecto es `Production`; el backend local declara `Production` en appsettings.json y `Debug` en appsettings.Development.json.

```json
"PaymentEmails": { "Mode": "Debug" }
```

- `Debug`: todos los avisos de carga de comprobantes (`TRANSFER_RECEIPT`) y decisiones de revisión (`TRANSFER_REVIEW`) se envían únicamente a `daniel.contreras@budodevelopers.cl`.
- `Production`: la carga se notifica al organizador; la aprobación o rechazo, al dojo pagador.

El worker vuelve a comprobar el modo antes de cada envío, incluyendo reintentos y avisos que estaban pendientes antes de cambiar la configuración. `notification_deliveries.destination` registra la dirección efectivamente utilizada. `notifications.payload_json.emailRouting` conserva `intendedDestination` y `mode`, permitiendo volver al destinatario correcto al cambiar de Debug a Production.

En producción, el switch puede controlarse con `PaymentEmails__Mode=Debug` o `PaymentEmails__Mode=Production` en `/etc/bte-api.env`. Antes de modificarlo, respaldar el archivo; luego reiniciar `bte-api.service`. Los demás tipos de correo conservan su configuración existente. No requiere migración de base de datos ni nueva compilación del frontend.

Switch publicado y verificado en el proceso de la API: `PaymentEmails__Mode=Production`, servicio activo y 44 resúmenes de dojos del evento 34 con respuesta 200. Respaldo de la publicación y del entorno: `/opt/bte-api/backups/payment-email-mode-20261005T030642Z`. Las 246 pruebas del backend pasan; cubren Debug/Production para cargas, aprobaciones y rechazos, cambio de modo con correos pendientes y registro del destinatario utilizado.

**Estado actual para pruebas iniciales:** backend recompilado y publicado con `PaymentEmails__Mode=Debug`, confirmado en el entorno del proceso. Los correos de pagos y revisión se dirigen a `daniel.contreras@budodevelopers.cl`. Servicio activo; carrusel, resúmenes de los 44 dojos del evento 34 y descarga de comprobante verificados. No hubo cambios adicionales de MySQL porque las columnas necesarias ya estaban aplicadas. Respaldo: `/opt/bte-api/backups/payment-email-debug-20261005T031405Z`. Frontend recompilado y empaquetado en `bte-frontend-app-20261005-pagos-debug.zip`, con base y reescrituras `/app/`.

El script `Scripts/20261004_transfer_review.sql` agrega `payment.review_status`, `review_reason` y `reviewed_by`. Las aprobaciones históricas se mantienen; una fecha `vb_date` preexistente no implica rechazo.

El despliegue respalda publicación, configuración y tabla payment, verifica hashes, aplica únicamente la migración aditiva, reinicia `bte-api.service` y comprueba el carrusel con Origin/X-FRONT, resúmenes del evento 34 y descarga de un comprobante. Si falla la comprobación, restaura los binarios anteriores y mantiene las columnas aditivas compatibles; no restaura ni elimina datos de negocio automáticamente.

El ZIP del frontend contiene `base href="/app/"`, `.htaccess` y `_redirects` para `/app/`. Debe publicarse su contenido en la carpeta `app` del sitio.

Las pruebas utilizan base en memoria y SMTP simulado. En producción se comprueba configuración y consultas de solo lectura; no se aprueban/rechazan pagos ni se envían correos de prueba a personas reales.

Publicación realizada el 5 de octubre de 2026 (UTC): servicio activo, migración aplicada, 43 resúmenes por dojo del evento 34 comprobados con respuesta 200 y descarga de un comprobante existente validada. Configuración SMTP y worker habilitados. Respaldo: `/opt/bte-api/backups/payments-20261005T011726Z`. Validación local: 238 pruebas del backend y 16 del frontend aprobadas.
