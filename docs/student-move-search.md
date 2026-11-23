# Buscar alumnos para traslado — 2026-10-09

En `/app/admin/students`, «Mover Alumnos» presenta directamente el buscador por identificación, nombres o apellidos. La búsqueda es global, paginada y no envía filtro `academyId`; ya no exige elegir el dojo de origen. El backend existente admite este contrato y no requiere cambios.

Al seleccionar un alumno con una única asociación, su dojo de origen se obtiene del resultado y se muestra como texto. Si existen varias asociaciones, botones permiten indicar de cuál se realiza el traslado, sin seleccionar entre dojos ajenos. Si no hay asociación, el traslado se bloquea. El destino mantiene su buscador y excluye los dojos a los que el alumno ya pertenece.

Cambiar la búsqueda o el alumno elimina la selección y el destino anteriores. Las respuestas de búsquedas anteriores no reemplazan el estado actual.

Validación: 13/13 pruebas de gestión de alumnos correctas; compilación Angular de producción y comprobaciones SEO correctas; ZIP íntegro. No se modificaron backend ni MySQL ni se realizaron traslados reales.

[Descargar frontend](https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261009-mover-alumnos.zip). Instalar manualmente en `/app/`, incluyendo `.htaccess` y `assets/`, después de respaldar la carpeta actual. Incluye las mejoras SEO e iconos anteriores.

SHA256: `46d90bd497ef7a8eaf5fffab9cb604c64ddc5e5f1eff5c1c8e3dc0d6fb40e506`.
