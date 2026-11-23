# SEO, iconos y enlaces compartidos

La URL de producción es `https://budotournaments.net/app/`, coincidente con `baseHref` de Angular. `src/index.html` incluye título, descripción, canonical, idioma, Open Graph, Twitter Cards y datos estructurados de la plataforma. Los metadatos se entregan directamente en HTML; no necesitan ejecutar Angular ni autenticarse.

La tarjeta general de Budo Tournaments se usa también al compartir rutas de la SPA. No se implementó una tarjeta específica de cada evento. Cada servicio decide si muestra vistas previas y cuándo renueva su caché; los metadatos no pueden imponer ese comportamiento, por ejemplo en todos los contextos de Instagram.

## Archivos permanentes

- `src/favicon.ico`: resoluciones 16, 32 y 48 para navegadores.
- `src/favicon.png`: 96 píxeles, cuadrado.
- `src/assets/seo/`: favicon PNG de 32, icono Apple de 180, Android de 192/512, icono adaptable de 512 y tarjeta social JPEG de 1200 × 630.
- `src/site.webmanifest`: nombre e iconos; rutas relativas a la aplicación y sin prometer funcionamiento offline.
- `src/sitemap.xml`: entrada pública de la aplicación.
- `hosting-root/robots.txt`: reglas para combinar con las del dominio, preservando otras aplicaciones. Permite la entrada, login, eventos y recursos, y evita el rastreo del resto de la aplicación. No sustituye los permisos ni la autenticación.

Angular copia estos archivos en cada compilación. Los iconos y la tarjeta están guardados en la fuente: compilar no requiere Python ni Pillow. Se reutiliza el logo existente, sin modificar su identidad.

## Compilación y mantenimiento

`npm run build` ejecuta validación de fuente antes de compilar y validación del HTML producido después. Ambas comprueban metadatos estáticos, URLs, existencia de recursos, dimensiones de iconos, manifest, datos estructurados y sitemap.

Si se usa Angular CLI directamente con otra carpeta de salida, verificarla con:

```text
node _script/check-seo.cjs RUTA_DE_SALIDA
```

Para regenerar derivados cuando cambie el logo:

```text
python _script/generate-seo-assets.py
```

Este comando de mantenimiento requiere Pillow y Arial o DejaVu Sans. Si cambia la tarjeta social, incrementar su nombre `v1` y las referencias en HTML y generador; actualizar también la versión de enlaces a iconos para renovar cachés. Conservar todos los archivos de fuente y scripts en el repositorio.

## Instalación manual

Respaldar la carpeta web actual y extraer el ZIP del frontend en `app/`, incluidos `.htaccess`, `favicon.ico`, `favicon.png`, `site.webmanifest`, `sitemap.xml` y `assets/`.

Combinar `hosting-root/robots.txt` con el archivo de la raíz del dominio, servido en `https://budotournaments.net/robots.txt`. No basta con ponerlo en `/app/robots.txt`, y no se deben sobrescribir reglas de otros sitios.

Google utiliza un favicon por dominio. Si la página de la raíz utiliza la misma marca, instalar los iconos de `hosting-root/` también allí y actualizar su etiqueta `rel="icon"`, según `hosting-root/LEEME.txt`. Cambiar solo `/app/` no modifica la cabecera de otra página alojada en la raíz del dominio.

Comprobar con acceso público y sin sesión que el HTML inicial contiene `og:image`, que la imagen JPEG y los iconos responden `200` con el tipo correcto y que el hosting no exige desafíos de seguridad a los rastreadores sociales. Se puede solicitar una nueva lectura con [Sharing Debugger de Meta](https://developers.facebook.com/tools/debug/).

Esta entrega modifica la fuente y genera un paquete descargable; el frontend se instala manualmente en su hosting, conforme a lo acordado.

## Entrega verificada — 2026-10-09

[Descargar ZIP](https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261009-seo.zip). Copia local en `entregables/bte-frontend-app-20261009-seo.zip`.

SHA256: `d7e52b4ebba864ff9dd1ec7141190c4fbd54f41fc4a0dede74401440540e49d5`.

Pasaron la compilación productiva, el flujo predeterminado `npm run build`, la validación del HTML generado, las dimensiones y recursos, la integridad del ZIP y la descarga pública con checksum. Permanecen únicamente las advertencias CommonJS anteriores. La imagen social se revisó visualmente. No se declara una prueba real de WhatsApp o Instagram ni la publicación en el hosting frontend: ambas requieren que el usuario instale el paquete.

Referencias: [Open Graph](https://ogp.me/), [favicon en Google](https://developers.google.com/search/docs/appearance/favicon-in-search).
