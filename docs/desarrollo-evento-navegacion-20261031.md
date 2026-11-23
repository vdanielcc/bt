# Desarrollo Evento · navegación

El grupo «Scoreboard» se renombró a «Desarrollo Evento» y quedó con dos accesos:

- Mesa de control → `/scoreboard/control-tables`.
- Medallero Olímpico → `/medallero`, trasladado desde el acceso independiente de Campeonatos.

Se retiraron del menú Dashboard, Tatamis, Combates e Historial. `/scoreboard` y los accesos anteriores `/scoreboard/tatamis`, `/scoreboard/matches` y `/scoreboard/history` redirigen a Mesa de control. Las rutas específicas de encuentros, resultados de categoría, Kudo y pantallas permanecen disponibles.

La página principal muestra el título «Mesa de control». Se conservan los permisos de navegación y la corrección previa que permite al perfil admin seleccionar todos los eventos.

[Frontend completo para instalación manual en /app/](https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261031-desarrollo-evento.zip). Respaldar el frontend actual e instalar según `LEEME.txt`, publicando recursos y bundles antes de `index.html`. Después recargar con Ctrl+Shift+R.

Build de producción, SEO y recursos verificados. Se inspeccionó el bundle compilado para comprobar el grupo «Desarrollo Evento», la mesa de control y el enlace al medallero sin los enlaces duplicados anteriores.

Tamaño del ZIP: 9.595.670 bytes. SHA-256: `22c7fe92e8329fc7ca2c365e7a661270a1f6692398c4140ed06d9660f44dea2c`.
