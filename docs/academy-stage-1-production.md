# Producción de ETAPA 1 — 2026-10-09

Backend publicado en https://apidemo.budotournaments.net/. El frontend se entrega para instalación manual en `/app/`.

## Respaldo

Directorio privado del servidor: `/opt/bte-api/deploy-academy-stage1-20261009/backup`.

Incluye MySQL completo (`database.sql.gz`, 7.061.334 bytes), API completa (`api.tar.gz`, 43.894.253 bytes), entorno, unidad systemd, Swagger anterior y manifiesto SHA256. Se verificaron checksums y restauración del dump. El entorno se conservó.

No fue necesaria una migración: las cinco tablas de ETAPA 1 ya existían. Las pruebas de escritura se ejecutaron exclusivamente en `bte_academy_stage1_20261009_test`.

## Recuperación de fuente

La fuente local previa no contenía todas las funciones publicadas. La comprobación detectó un endpoint administrativo ausente y revirtió el primer despliegue. Se recuperó la fuente desde el ensamblado productivo con ILSpy y dependencias resueltas; se reutilizó el código original donde su descompilación coincidía y se incorporó ETAPA 1.

Se conservaron categorías administrativas, tarifas combinadas, pagos por lotes y días del evento. La comparación de tipos, propiedades y métodos públicos preservó los contratos anteriores, excepto las firmas de configuración de academia modificadas intencionalmente. Los endpoints anteriores de academia también se conservaron y se verificaron mediante Swagger.

Fuente permanente: `backend-production/bte.api.csproj`. **Conservar `backend-production` y su ZIP; no tratarlos como carpetas de compilación.** La recuperación puede cambiar formato y nombres locales respecto de la fuente original. `backend-production/recovery-manifest.json` documenta la procedencia.

## Verificación

- Compilación Release de la fuente recuperada: sin errores.
- Suite backend: 264 pruebas correctas y un fallo decimal preexistente; mismo resultado que antes de la recuperación.
- Contratos públicos de la API anterior: preservados.
- Restauración aislada y pruebas MySQL con el ensamblado exacto publicado: correctas.
- Servicio `bte-api.service`: reiniciado y activo.
- Carrusel `GET /api/Events/upcoming`, con `Origin` y `X-FRONT`: `200 OK`.
- Mantenedores sin autenticación: `401`.
- Rutas y métodos anteriores de Swagger: disponibles; nuevos endpoints de ETAPA 1 presentes.
- Esquema y consistencia de datos de academia: válidos.
- ZIP frontend descargable: `200 OK` y SHA256 verificado.

Ensamblado desplegado SHA256: `79c71f3f154f83dd0a60ea66206e0c925fee5c6681f91a064a2e622b87f713ea`.

Queda pendiente instalar el frontend manualmente y realizar el recorrido autenticado en navegador. Los resultados de pruebas frontend y los fallos anteriores se documentan en `academy-stage-1-results.md`.

## Entrega

[Descargar frontend](https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261009-academia-etapa1.zip).

Respaldar la carpeta web actual y extraer el ZIP en `app/`, incluyendo `.htaccess`. La base es `/app/`, conforme a la configuración de producción existente. Hay copias locales en `entregables/`, junto con el ZIP de la fuente backend recuperada.

Frontend SHA256: `53caf5c48d4b499df22f64a2f91f6464abd120943e2a7fccc21f33e3b3adaf8d`.
