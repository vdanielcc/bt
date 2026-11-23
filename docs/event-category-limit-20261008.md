# Límite de categorías en el mantenedor de eventos

En `/app/admin/events` se agregó el campo «Máximo de categorías por deportista», conectado con `event.max_categories_per_registration`. Cero significa sin límite. El formulario exige un entero no negativo, carga el valor existente y lo envía como `maxCategoriesPerRegistration` al actualizar. Se corrigieron en UTF-8 la etiqueta «Días de competencia» y su mensaje de validación.

`EventUpdateDto` y `EventsController.UpdateEvent` aceptan y persisten el campo. Si se omite, conservan el valor existente. La columna ya existe; esta entrega no requiere una migración de esquema.

Validación: 9 pruebas de administración de eventos en backend, 10 en frontend, validación AOT y compilaciones de producción. La prueba del frontend verifica el campo visible, los acentos, la carga del límite, rechazo de fracciones/negativos y guardado de cero.

Paquete frontend para `/app/`: `bte-frontend-app-20261008-limite-categorias.zip`. Incluye también la corrección anterior del selector de tarifas. Debe instalarse en el alojamiento de `budotournaments.net/app/`, cuyo acceso sigue pendiente.

Respaldos privados del servidor: `/opt/bte-api/deploy-event-category-limit-20261008/backup`. Incluyen base activa completa, archivos de la API y configuración del servicio, con manifiesto SHA-256 y verificación de integridad.

La API se publicó y reinició correctamente: `Events/upcoming` respondió 200 con Origin y X-FRONT. Se conservó la configuración del servicio. SHA-256 del backend: `412222b1faf40d9a5e19e88626b19e6310e7c0232b0078701df7c24dffee5bbd`.

Descarga verificada mediante HTTP 200 y SHA-256: https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261008-limite-categorias.zip

SHA-256 del frontend: `5d8efbf1eedb0b852f592d29d507caa289de67f5c35ee9998c0b0c1572b944b8`.
