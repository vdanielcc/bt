# Publicación de producción — 17/10/2026

## Base de datos y backend

Servidor autorizado: 159.223.129.162. Base: `zeuz`. Servicio: `bte-api.service`. API: https://apidemo.budotournaments.net/.

Se publicaron los cambios acumulados del backend hasta ETAPA 6. SHA256 instalado y comprobado: `fc9ae38bfb1d97670d5a89db2e2f092b9437f9193ddbb73ca73753b934465e5b`. Las 231 dependencias idénticas se verificaron por hash; se sustituyeron cinco archivos diferentes, sin reemplazar configuración, archivos cargados ni datos persistentes.

Se aplicaron a producción:

- `_script/bte_stage_5_class_sessions.sql`: origen de sesiones generadas e índice único.
- `_script/bte_stage_6_class_attendance.sql`: índice sesión/estado, FKs que protegen historial y corrección de la vista existente.

ETAPAS 1–4 no requerían otro cambio DDL según las auditorías previas. No se recrearon tablas ni se generaron sesiones o asistencias de prueba en producción.

Respaldo completo verificado antes de modificar producción: `/opt/bte-api/deploy-academy-stage6-20261017/backup/`.

- `zeuz.sql.gz`: dump consistente, incluye rutinas, triggers y eventos; 100.874.173 bytes de SQL descomprimido comprobados.
- `api.tar.gz`: backend anterior completo, integridad de archivos comprobada.
- `bte-api.env` y `bte-api.service`: configuración y unidad anteriores.
- `manifest.json`: tamaños y SHA256 de los respaldos.

El directorio del despliegue tiene permisos 700; el respaldo del entorno tiene permisos 600. No se modificaron `/etc/bte-api.env` ni `appsettings.json`. Se verificó que FrontAccess__Key coincide con frontAccessKey. Se reinició el servicio después de aplicar los cambios.

Resultado: **publicación correcta**, servicio active/running, NRestarts=0 en la comprobación final. No se necesitó revertir. El procedimiento tiene restauración automática de binarios si falla la validación; la restauración completa de la BD queda disponible como respaldo y no se ejecutó sobre datos vivos.

## Comprobaciones contra producción

Se verificó HTTP 200 con `Origin: https://budotournaments.net` y `X-FRONT` configurado:

- `/api/Events/upcoming`.
- `/api/academies/1/classes`.
- `/api/academies/1/classes/summary`.
- `/api/academies/1/class-sessions`.
- `/api/academies/1/dashboard`.
- Historial y resumen de asistencia de un alumno existente.

Las consultas privadas usaron una credencial de verificación temporal de un administrador activo existente; no se guardó ni imprimió el token y no se modificó ninguna cuenta. También se comprobaron columna, índice y FKs de producción. Sesiones y asistencias continuaron con cero filas, como antes de publicar.

Se comprobó por HTTP el formato de hora contra un ID de sesión verificado como inexistente: `17:05` recibe 400 de binding; `17:05:00` llega a validación de dominio y recibe 404. No se creó ningún registro. El frontend ahora normaliza los campos de hora a HH:mm:ss sin conversión a UTC; las ocho pruebas de asistencia pasan nuevamente.

Logs y confirmación remotos: `/opt/bte-api/deploy-academy-stage6-20261017/deploy.log` y `deployment-success.json`. Procedimiento permanente: `_script/deploy_academy_stage6.py`.

## Frontend descargable

Se ajustaron baseHref, metadatos SEO, sitemap, reescrituras y documentación para instalar en **https://budotournaments.net/bte/**. Incluye los cambios acumulados hasta ETAPA 6 y la normalización de horas de asistencia.

Paquete: `entregables/bte-frontend-bte-20261017-etapas-1-6.zip`. Incluye index.html, bundles, assets, .htaccess, manifest, sitemap, archivos de dominio raíz e instrucciones LEEME.txt. Sin source maps. Backend y entorno de producción compatibles con este paquete.

Build final: `cb30bf36cc69218f`, 17/10/2026 03:31 UTC. Tamaño del ZIP: 9.519.604 bytes. SHA256: `c9166a71e5391d988dcaab95004b7d4cfb1b36b97c336134e296b5fd5b5a3c6a`.

Descarga publicada y verificada por HTTP 200 con integridad SHA256:

- https://apidemo.budotournaments.net/downloads/bte-frontend-bte-20261017-etapas-1-6.zip
- Checksum: https://apidemo.budotournaments.net/downloads/bte-frontend-bte-20261017-etapas-1-6.zip.sha256

Se reutilizó el directorio de descargas existente de nginx, sin modificar su configuración. Confirmación remota: `/opt/bte-api/deploy-academy-stage6-20261017/frontend-download.json`.

El frontend se ofrece para descarga e instalación manual en el hosting web solicitado; esta operación no sustituye la aplicación web alojada en budotournaments.net. Antes de extraerlo en la carpeta bte, respaldar esa carpeta; incluir archivos ocultos y assets. Combinar las instrucciones de hosting-root con la raíz del dominio conservando otras aplicaciones.

Las suites anteriores mantienen tres fallos globales documentados; el build de producción y las pruebas focalizadas de asistencia no presentan errores nuevos. La aceptación visual con una cuenta real corresponde al frontend una vez instalado en el hosting.
