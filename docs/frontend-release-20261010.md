# Frontend de producción para /app/ — 10 de octubre de 2026

Archivo: `entregables/bte-frontend-app-20261010-analytics.zip` (9.473.660 bytes).
SHA-256: `a5ccdc36b72a24d2ce27e729780a1f3c739ac2a6897dc059433b02dde51298c9`.
URL: https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261010-analytics.zip

## Contenido

Incluye los cambios anteriores de academias y clases (ETAPAS 1 y 2), mantenedor administrativo de estilos/federaciones, búsqueda para mover alumnos y SEO/favicon/vistas previas. Incluye las nuevas tarjetas de Analytics: saludo con first_name y enlaces a los próximos eventos a finalizar; visitantes únicos diarios con sesiones/permanencia; fecha de Chile y usuarios autenticados en línea con actualización configurable por backend.

## Instalación manual

1. Respaldar la carpeta `app/` publicada.
2. Extraer el contenido del ZIP directamente en `app/`, incluyendo `.htaccess`, `assets/`, los archivos JavaScript/CSS y los iconos. El ZIP no contiene una carpeta `app/` adicional.
3. Revisar las instrucciones de `hosting-root/LEEME.txt` para combinar robots.txt y mantener los iconos en la raíz del dominio.
4. Abrir `https://budotournaments.net/app/` y actualizar el navegador para cargar los recursos nuevos.

El seguimiento de visitas comenzará al instalar este frontend. Los endpoints de analítica y sus tablas ya están disponibles en producción. El intervalo de usuarios en línea se toma de `Analytics:OnlineRefreshSeconds` (actualmente 300 segundos) en appsettings.

## Verificación

Compilación de producción correcta con base `/app/` y API de producción. Verificación SEO de HTML compilado, favicon/manifest e imagen social correcta. ZIP íntegro, sin mapas de fuente, con rutas de instalación y archivos requeridos. Seis pruebas de Analytics pasaron en Chrome Headless: navegación, visibilidad, inactividad, cierre de sesión, actualización/configuración y recuperación ante errores; se comprobó también que las consultas se detienen al destruir el componente.

Logs: `.tmp/analytics-front-build.log`, `.tmp/analytics-front-tests.log` y `.tmp/analytics-front-package.log`.
