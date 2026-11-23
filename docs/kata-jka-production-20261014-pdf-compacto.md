# Publicación PDF compacto — 14/10/2026

Backend instalado y servicio activo. Swagger y carrusel público: HTTP 200; carrusel verificado con Origin y X-FRONT. Configuración del servicio preservada y clave frontend/backend coincidente.

Respaldo de API, base de datos y configuración: `/opt/bte-api/deploy-kata-jka-20261014-pdf-compacto/backup`.

DLL publicada SHA-256: `816336c90579a3294403baaf39ed1768680bff4db7fb4702ed0bfc2ebfd22dca`.

Sin migraciones ni regeneración de fixtures. Se conserva el formato de página anterior.

Se prioriza una sola hoja para hasta tres etapas y diez recuadros por columna. Casos 6–3–3, 9–5–5 y 10–5–5 verificados en una página. Categorías mayores mantienen división por pools y conexiones oficiales. Las fichas de solo puntajes conservan el máximo del 50% del ancho.

Pruebas: 30 .NET y 26 Angular correctas. Se generó `entregables/kata-jka-ejemplo-20-una-hoja.pdf` y se comprobó una página de 330 × 216 mm.

Frontend manual: `entregables/bte-frontend-app-20261014-kata-jka-pdf-compacto.zip` (9.480.843 bytes).

SHA-256 ZIP: `56cd053cef061c6273cb8c35443eb89669fe7d269466169cd46529cb318bc268`.

Compilación de producción, SEO y contenido del ZIP verificados. Runtime nuevo: `runtime.feb64f8a2a74e85b.js`. Extraer el nuevo ZIP dentro de `/app/` incluyendo `.htaccess` y `assets/`, y recargar con Ctrl+F5 para utilizar los nuevos módulos.
