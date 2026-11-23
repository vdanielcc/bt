# Publicación Kata JKA — 13 de octubre de 2026 (Chile)

Backend publicado en `https://apidemo.budotournaments.net/`. Servicio `bte-api.service` activo tras el reinicio.

## Respaldo

Directorio del servidor: `/opt/bte-api/deploy-kata-jka-20261013/backup`.

- `database.sql.gz`: respaldo completo de `zeuz`, con rutinas, eventos y triggers.
- `api.tar.gz`: publicación anterior completa.
- `bte-api.env`: copia de la configuración, sin cambios durante la publicación.
- `baseline.json` y `manifest.json`: conteos de referencia, tamaños y SHA-256 de los respaldos.

Los respaldos se verificaron antes de actualizar el esquema y el servicio.

## Base de datos y backend

Se añadió `KATAJKA` a los ENUM de `category.type` y `fixture_versions.fixture_type`, y se registró `20261014010000_AddKataJkaFixtureType` en `__EFMigrationsHistory`. No se ejecutaron otras migraciones ni se convirtieron categorías o llaves a otro formato.

Se verificaron los conteos por formato y el número de encuentros antes y después de la ampliación. Se conservaron las 1.451 versiones de llaves.

SHA-256 de `bte.api.dll`:

```text
Anterior: e2be2d916f851d42bb750f2499ab7ead0b956947e58092bae1295e8d9c324881
Publicado: 65e44eb5277875e70f6e71073807aaaa4b0e56912256139ed93dedde1f4a7c69
```

Comprobaciones de producción:

- Servicio activo y nueva DLL verificada.
- Swagger público incluye `KATAJKA` en la validación de formato.
- `GET /api/Events/upcoming` respondió 200 con `Origin: https://budotournaments.net` y `X-FRONT`.
- `FrontAccess__Key` coincide con `frontAccessKey` del frontend compilado.
- `/etc/bte-api.env` mantiene el mismo hash que su copia de respaldo.

## Frontend para descarga

Archivo: `entregables/bte-frontend-app-20261013-kata-jka.zip` (9.479.684 bytes).

SHA-256:

```text
b58bcc277990d49db70f0b2b2fa53020317eca60b3cd74f1e48295f3d5c0c459
```

Compilación de producción para `/app/`, validación SEO y comprobación del contenido del ZIP correctas. Incluye `.htaccess`, assets, archivos de hosting y `LEEME.txt`. No se publicó el frontend en el hosting; queda disponible para descarga.

Antes de activar este formato en una categoría que ya tiene llaves, seleccionar Kata JKA y pulsar Refrescar desde el frontend actualizado. Las versiones anteriores se conservan.

## Reversión

Para volver al backend anterior, detener el servicio y restaurar la publicación desde `api.tar.gz`, conservando el propietario `bteapi`, y reiniciar el servicio. La ampliación del ENUM es compatible con los valores anteriores y puede mantenerse. No retirar `KATAJKA` si ya existen categorías o versiones que lo utilicen.

El respaldo completo de base está disponible para recuperación; restaurarlo requiere evaluar primero los datos creados después de esta publicación.
