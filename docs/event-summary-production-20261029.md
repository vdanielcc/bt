# Resumen del evento: corrección de producción

El resumen de los eventos 48 y 52 devolvía HTTP 500 al consultar los importes: faltaban columnas y tablas de la migración `20261022000300_AddEventPaymentReconciliation`. El despliegue anterior de categorías había incorporado código que dependía de esa estructura pendiente.

Se respaldaron las tablas de lotes e historial de migraciones y el esquema completo. La migración se ensayó en `bte_event_summary_20261029_test`, sin registros productivos, antes de aplicar su actualización aditiva. Los lotes productivos estaban vacíos; no se reescribieron importes, pagos ni inscripciones. Se registró la migración aplicada en `__EFMigrationsHistory`.

El endpoint `GET /api/Events/detalle` ahora requiere autenticación y comprueba el acceso mediante el evento: administrador global, academia organizadora o coorganizadora autorizada. El parámetro heredado `academyId` no restringe a estos usuarios ni concede acceso a terceros.

Validación: 84 pruebas aprobadas de permisos, contadores y categorías. En producción, administrador y organizador obtuvieron HTTP 200 para los eventos 48 y 52, incluso con `academyId=999`. Salud de API y carrusel con `Origin` y `X-FRONT`: HTTP 200. Se conservaron las categorías individuales y la exclusión de equipos.

Respaldo y evidencias: `/opt/bte-api/deploy-event-summary-20261029/`. Ensamblado publicado SHA256: `cb2ae43eb14600fe31a080f7df09dc574cb79045d117ff38477da4d6762ddd68`.

No se modificó `/etc/bte-api.env`. Se reinició `bte-api.service`.
