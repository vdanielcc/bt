# Invitaciones y asociaciones deportivas

## Cambios

- `/app/campeonatos/invitaciones/{id}`: Inscripciones continúa disponible al vencer `eventDateCheckin`. Se oculta Inscribir y se impide abrir una nueva inscripción. La vista se actualiza al alcanzar el plazo sin recargar la página.
- Información: Evento y Academia tienen su etiqueta en negrita sobre el dato, conservando las tarjetas y el diseño responsive.
- `/app/admin/events`: Asociación deportiva usa un selector del catálogo. Los valores históricos ajenos al catálogo se conservan al editar otros datos.
- Inicio, término, cierre de inscripciones, fin de preventa y envío de llaves usan el input nativo `datetime-local`, ya presente en la pantalla. Se normalizan también las fechas con espacio entre fecha y hora para que el navegador las muestre. Al guardar otros campos se conserva la fecha original.
- `/app/admin/event-associations`: catálogo con nomenclatura y descripción, creación y edición de descripción. Solo el administrador puede acceder por menú, URL y API. Las nomenclaturas son estables después de crearlas.

## Backend

Fuente principal: `D:/budodev/bte/src/2025/API`. Copia de compilación aislada: `.backend-event-associations`.

`GET /api/EventAssociations`, `POST /api/EventAssociations` y `PUT /api/EventAssociations/{code}` requieren el rol JWT `admin` y comprueban su vigencia en base de datos. El catálogo es distinto de `sports_associations`, que representa organizaciones legales de academias. No agrega relaciones por ID al evento ni reglas de competencia.

La tabla `event_associations` tiene `code` como clave primaria y `description` obligatoria. La migración SQL aditiva carga WKF, JKA y WUKF sin sobrescribir descripciones existentes. Sigue el mecanismo de scripts SQL existente; no ejecutar `dotnet ef database update` para aplicar este script.

Scripts en `API/Migrations`:

- `20261007_EventAssociations.sql`
- `20261007_EventAssociations.validate.sql`

## Publicación realizada

Validación local completada: compilación AOT Angular (`ngc`), TypeScript de pruebas, build Angular de producción, compilación/publicación .NET, 18 pruebas frontend en Chrome Headless y 21 pruebas backend seleccionadas. Estas últimas incluyen catálogo, autorización vigente, administración de eventos e inscripciones. Se ejecutaron con base en memoria, sin conectar a producción.

Artefactos compilados: `.build-event-associations` (frontend `/app/`) y `.release-event-associations/api` (API .NET 8, sin configuración productiva). Los archivos del catálogo y sus pruebas ya están sincronizados con el backend principal.

Backend publicado en `/opt/bte-api/publish` y `bte-api.service` reiniciado. La migración se aplicó en `zeuz` usando MySQL root local mediante socket, después de la autorización explícita del usuario. Se verificaron WKF, JKA y WUKF; la columna `event.asociation_type` continúa siendo texto y los conteos de eventos, inscripciones y llaves no cambiaron.

Respaldos verificados con tamaño, lectura de archivos comprimidos y SHA-256 en `/opt/bte-api/deploy-event-associations-20261007/backups-tables`. Incluyen datos y esquema de tablas base, publicación anterior de la API, configuración y unidad systemd. El respaldo de base de datos excluye vistas, rutinas almacenadas y triggers por los permisos de la cuenta de aplicación; la migración no modifica esos objetos.

Se conservaron `/etc/bte-api.env`, `appsettings.json` y archivos subidos. El encabezado `X-FRONT` configurado coincide con `frontAccessKey` del frontend. `GET /api/Events/upcoming` devolvió 200 en la API local y pública con `Origin: https://budotournaments.net`; el catálogo devolvió 401 sin autenticación y la cuenta de la API pudo consultar sus tres registros.

Frontend recompilado expresamente con `--base-href /app/`, empaquetado con `.htaccess` y `_redirects` para rutas internas. El usuario solicitó dejarlo para descarga, sin publicarlo en el hosting del frontend.

Paquete local: `.release-event-associations/bte-frontend-app-20261007.zip`.
Descarga publicada y verificada con HTTP 200 (9.074.599 bytes): [frontend para /app/](https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261007.zip).
SHA-256: `1685ca1857b0ea0460b3a5ef7afe22d095df5260d3518c7dfb79c6fd8bc18ec3`.

No se modifican eventos, inscripciones, llaves, resultados ni reglas del Scoreboard mediante esta migración.

## Selector visible de fecha y hora

Los cinco campos de `/app/admin/events` usan `datetime-local` con precisión de minutos y un botón visible de calendario que abre el selector nativo del campo. El botón es de tipo `button`, para no enviar el formulario al abrir el selector. Se conserva la representación y persistencia de las fechas existentes.

La validación AOT y el build de producción para `/app/` finalizaron correctamente. Pasaron las nueve pruebas de administración de eventos, incluida una prueba sobre la pantalla renderizada que comprueba los cinco inputs de fecha y hora y sus botones de calendario.

Paquete actualizado: `.release-event-associations/bte-frontend-app-20261007-fecha-hora.zip`.
Descarga verificada con HTTP 200: [frontend con selector de fecha y hora](https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261007-fecha-hora.zip).
SHA-256: `967de3df56156a7996be959d62a4d46f3f3f805ef49231626f10d037da3b7c37`.
