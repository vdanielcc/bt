# Auditoría de encuentros WKF

La mesa registra las acciones de combate en IndexedDB (`bte-wkf-audit`, almacén `entries`) antes de enviarlas. Conserva encuentro, categoría, evento, operador, fecha, ID de operación, payload, estado anterior, intentos, error y confirmación. La escritura espera el commit de la transacción. No se almacenan credenciales.

Estados: pendiente, confirmada por API, rechazada, conflicto y acción de interfaz local. Solo un POST exitoso con snapshot válido confirma el envío. Si se pierde la respuesta, el reintento mantiene el ID y la API evita duplicados. Las pendientes sobreviven a la reapertura de la mesa, con reintento automático cada cinco segundos y al recuperar conexión, además del manual. Un error de autenticación requiere recuperar la sesión. Las pendientes de otro operador no se envían bajo una nueva identidad. Los conflictos no se reaplican automáticamente sobre una revisión distinta.

Existe una acción de combate pendiente por categoría. Hasta resolverla se bloquean nuevas acciones y el cambio de encuentro; no se simula el combate sin conexión. Se conservan contexto de llaves oficiales, snapshots y desfase horario del servidor para recuperar la visualización. La API aplica cada acción cuando la recibe; la fecha de clic se registra para auditoría, sin alterar las reglas de los cronómetros.

El historial se consulta y exporta en JSON desde la mesa. Abrir pantalla, cambiar encuentro, abandonar la mesa, cancelar reinicio, exportar y solicitar reintento son registros locales de interfaz: no se envían como reglas deportivas a la API. Expandir o contraer el historial no genera registros ni aumenta su contador. Los controles deshabilitados no ejecutan acciones. Borrar los datos del navegador elimina el respaldo local. No se reconstruyen clics anteriores a esta implementación.

La API conserva las acciones aceptadas en `wkf_scoreboard_bouts.operations_json`, con usuario autenticado, fecha de recepción, fecha declarada del cliente, payload, revisiones y estados antes/después. `UNDO` no borra esta auditoría. El endpoint autorizado `GET /api/v1/scoreboard/events/{eventId}/categories/{categoryId}/wkf/matches/{matchId}/history` permite exportarla. Los rechazos y las acciones nunca recibidas quedan registrados localmente.

No se requiere migración de tabla: el JSON admite GUID históricos y nuevos objetos de auditoría. Los GUID históricos no contienen detalles de acciones pasadas. Un rollback del backend debe conservar el lector de ambos formatos; el lector antiguo de `List<Guid>` no admite los objetos nuevos.

## Publicación del 5 de noviembre de 2026

API instalada en `159.223.129.162`, en `/opt/bte-api/publish`, con reinicio de `bte-api.service`. SHA-256 de `bte.api.dll`: `46688c89b1784ba59cfc31646c465db19199787ffccccb17cd694994dcaa9354`.

Se verificó el esquema existente sin ejecutar DDL. Se conservaron los conteos: 2 estados WKF, 18.552 encuentros de llaves, 2.525 versiones de llaves y 15.960 registros de categorías/competidores. No se alteró `/etc/bte-api.env`: `FrontAccess__Key` ya coincidía con el frontend. Se verificaron respuestas 200 en salud, carrusel público con `Origin: https://budotournaments.net` y `X-FRONT`, catálogo WKF, snapshot e historial autenticados. Las comprobaciones no escribieron resultados de encuentros.

Respaldos completos de base de datos, publicación, entorno y unidad systemd, con manifiesto de checksums: `/root/bte-wkf-audit-20261105/backup/`. Evidencias locales: `.release-wkf-audit-20261105/deployment-result.json` y `frontend-download.json`.

Frontend compilado y empaquetado para `/app/`, disponible en [ZIP de WKF y auditoría](https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261105-wkf-auditoria.zip). Tamaño: 9.616.749 bytes. SHA-256: `76ccf19130c981c8f3f37744ce74f6c8608ce323f4495ea202ed396fbe4fe34e`. La descarga HTTPS se verificó contra ese checksum. La instalación del frontend en hosting sigue siendo manual.
