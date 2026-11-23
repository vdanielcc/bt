# Resumen de eventos: JKA y edición de llaves

En kumite de eventos con `asociation_type = JKA`, el resumen y el PDF usan AKA rojo y AO blanco. La asociación continúa almacenada como texto.

La botonera del resumen muestra solo iconos, con descripciones emergentes y etiquetas accesibles. Las categorías se buscan por código y nombre mediante Angular Material Autocomplete, ignorando acentos. Los botones de exportación se llaman N-Pro y N-Pro — Todas.

Eliminar o mover una inscripción quita al deportista de todas las posiciones y resultados del borrador actual, conservando la versión de origen y los enlaces entre encuentros para guardar una nueva versión. La acción no recarga la versión anterior ni regenera las llaves. Las versiones históricas permanecen guardadas. En round robin se conservan los encuentros entre los participantes restantes y se distribuyen en rondas válidas. Los formatos independientes requieren al menos dos competidores para guardar encuentros.

Validación: 32 pruebas de resumen, formatos y PDF aprobadas; compilación de producción aprobada con base `/app/`.

Artefacto: `.release-event-associations/bte-frontend-app-20261007-resumen-jka.zip`. Incluye `.htaccess` y `_redirects` para las rutas de `/app/`.

Descarga: https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261007-resumen-jka.zip

SHA-256: `aad5199984aede9d847fa9355c4292ef9cfb1866665a2489ab2829811045419e`. Tamaño: 9.075.710 bytes.

Esta entrega publica el paquete descargable del frontend. No requiere cambios adicionales en MySQL ni backend.
