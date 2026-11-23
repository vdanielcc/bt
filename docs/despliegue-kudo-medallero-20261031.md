# Publicación Kudo y Medallero · 31 de octubre de 2026

Backend y base de datos publicados en producción a las **00:41 de Chile** (03:41 UTC). El frontend se entregó para instalación manual en **`/app/`**, destino confirmado expresamente por el usuario.

## Instalación

- API: `https://apidemo.budotournaments.net/`.
- Servicio: `bte-api.service`, usuario `bteapi`, instalación `/opt/bte-api/publish`.
- Base: `zeuz`, MySQL 8.0.46.
- Migraciones aplicadas y verificadas en `__EFMigrationsHistory`: `20261030000100_AddMedalTables` y `20261030000200_AddKudoChile2023`.
- Ocho tablas nuevas; registros de las 119 tablas existentes conservados durante la migración. Las únicas altas esperadas en tablas anteriores fueron el catálogo textual `KUDO` y el historial EF.
- SHA-256 de `bte.api.dll`: `4bc1f7e20e6d24d060272724c6b0ad7e2e79dee8bde463c58d7c2af70d06973c`.
- `appsettings.json`, `/etc/bte-api.env`, claves y archivos cargados se conservaron. Los checksums de configuración se compararon antes y después. El estado previo del worker de notificaciones se mantuvo.

## Respaldos privados

Ubicación en el servidor: `/root/bte-kudo-medallero-20261031/backup/`. No se publicaron para descarga anónima.

| Archivo | Contenido | Tamaño |
|---|---|---:|
| `zeuz.sql.gz` | Copia completa inicial de MySQL | 18.436.366 bytes |
| `zeuz-before-deploy.sql.gz` | Copia completa final, con API detenida antes de migrar | 18.436.380 bytes |
| `installation.tar.gz` | Instalación anterior completa, Assets, configuración de Nginx y servicio systemd | 48.346.529 bytes |
| `bte-api.env` | Entorno anterior del servicio | 633 bytes |
| `bte-api.service` | Definición efectiva del servicio | 477 bytes |
| `baseline.json` / `manifest.json` | Versión anterior, tamaños y checksums SHA-256 | — |

Se verificaron los checksums y la integridad gzip. La copia inicial de base fue restaurada en una base temporal para probar migración, reversión y reaplicación.

También quedaron `/root/bte-kudo-medallero-20261031/originals/`, con los archivos de runtime reemplazados, y los paquetes/SQL originales de la entrega. Ante un problema del runtime, restaurar los archivos anteriores con el servicio detenido y reiniciarlo; el esquema añadido es compatible con el backend previo y no exige restaurar datos de forma automática. Restaurar el dump completo solo como recuperación explícita, pues reemplazaría modificaciones posteriores al respaldo. Probar cualquier reversión de esquema primero en una copia.

## Comprobaciones

- 37 pruebas dirigidas de backend aprobadas después de corregir la comparación semántica de JSON para los reintentos de MySQL.
- Runtime nuevo probado contra una copia aislada de MySQL: configuración Kudo, puntajes, cuatro Hansoku, reversión, victoria, confirmación y reintentos sin duplicados. No se introdujeron resultados de prueba en producción.
- Servicio de producción activo; `/health/live` y `/health/ready`: `200`.
- Carrusel `GET /api/Events/upcoming`: `200` con `Origin: https://budotournaments.net` y el `X-FRONT` configurado; cabecera CORS verificada.
- Acceso autenticado a Medallero: `200`; acceso anónimo a medallero privado y controlador Kudo: `401`.
- Checksums de respaldos e instalación final verificados. Evidencias JSON en `release/kudo-medallero-20261031/server-*.json` y en el directorio privado de despliegue del servidor.

## Frontend para instalación manual

[Descargar ZIP](https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261031-kudo-medallero.zip) · [Checksum SHA-256](https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261031-kudo-medallero.zip.sha256).

Tamaño: 9.595.651 bytes. SHA-256: `0f786dd2de83ffaaec53a1aca8b8c30f433f0fef4433bf20f1d7772adaa7b852`.

El ZIP se descargó por HTTPS y se comprobó contra su checksum. Incluye instrucciones `LEEME.txt`, `.htaccess`, recursos, iconos y SEO; está compilado para `https://budotournaments.net/app/` y no incluye source maps. Respaldar el frontend actual y extraer el contenido directamente en `/app/`, sin una carpeta contenedora adicional. Subir recursos y bundles primero e `index.html` al final; conservar temporalmente los bundles anteriores y recargar con Ctrl+Shift+R.

No se instaló el frontend en el hosting ni se publicó una nueva versión del ejecutable de escritorio en este despliegue.
