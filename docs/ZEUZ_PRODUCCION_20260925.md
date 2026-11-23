# Base de datos zeuz en producción

El backend publicado en `https://apidemo.budotournaments.net/` utiliza ahora **zeuz**. Se activó el 26/09/2026 UTC (25/09/2026 en Chile), a partir de `_script/20260925_baco.sql`.

## Conservación y actualización

- Respaldo original: 2.556.265 bytes; SHA-256 `3c6f074724a3850e776f19bb7cb28c18e4f4b0d510511bc61c07436eb24750eb`.
- Restauración original conservada en `zeuz_original_20260925`: 45 tablas y 53.764 filas.
- Destino: 108 tablas y 3 vistas. Incluye las 105 tablas de producción y conserva `areas`, `fixtures` y `fixture_scores` del respaldo.
- Se compararon los valores de las 309 columnas originales y se verificaron las 236 claves foráneas del destino. Las definiciones de columnas, restricciones y vistas coinciden con producción para las tablas actuales, exceptuando contadores AUTO_INCREMENT y representación redundante del juego de caracteres.
- Se incorporaron los catálogos técnicos de roles, permisos, conceptos de cobro, reglas de competencia, reglas del Scoreboard y tipos de cálculo tarifario, conservando las filas originales.
- La corrección previamente solicitada para Olympic se aplicó después de verificar la copia: persona 2481, país 34 → 133 (Perú), con DNI como documento para nuevos alumnos. El valor anterior está en `zeuz.backup_olympic_country_20260925` y en la restauración original.
- La base anterior `baco` no se borró ni modificó. Sus conteos se verificaron después del cambio contra los registrados con el servicio detenido.
- Los datos de negocio activos proceden del respaldo entregado. Las configuraciones de eventos, fixtures y operaciones exclusivas de la anterior `baco` permanecen allí; no se mezclaron por IDs ni se regeneraron llaves.

Entidades restauradas: 389 usuarios, 4.918 personas, 4.710 alumnos, 372 academias y 48 eventos.

## Activación y comprobaciones

Se respaldó `/etc/bte-api.env`, se cambió únicamente la base de la cadena de conexión a `zeuz` y se habilitaron permisos DML para la cuenta existente de la API. El binario publicado no cambió.

Dos IDs de usuario representaban cuentas distintas entre `baco` y el respaldo. Para impedir que una sesión anterior se aceptara como otra cuenta, se renovó la clave de firma JWT durante el cambio. Los usuarios deben iniciar sesión nuevamente; sus contraseñas del respaldo se conservaron.

El servicio `bte-api.service` quedó activo. Se verificaron mediante HTTPS:

- `GET /api/Countries`: 200.
- `GET /api/Events/upcoming` con `Origin: https://budotournaments.net` y `X-FRONT`: 200.
- `GET /api/Academies/194/student-document`: 200, Perú/DNI.
- `GET /api/Students/academie/194`: 200.
- `GET /api/academies/194/classes`: 200.
- `GET /api/events/{id}/pricing` para un evento restaurado: 200.

Las comprobaciones autenticadas utilizaron una credencial de 120 segundos creada en memoria en el servidor con la identidad y rol existentes de Olympic. No se crearon alumnos, pagos, inscripciones ni cuentas de prueba. Las cuentas temporales de migración fueron eliminadas.

## Respaldos y recuperación

Directorio protegido del servidor: `/root/bte-zeuz-20260926/`.

- `20260925_baco.sql`: archivo original con hash verificado.
- `before-cutover/baco.sql.gz`: respaldo completo inicial de producción.
- `cutover/baco-final.sql.gz`: respaldo completo final, tomado con el servicio detenido, con integridad gzip y SHA-256 verificados.
- `cutover/bte-api.env`: configuración exacta anterior, incluyendo sus claves.
- `cutover/baco-final-counts.json`: conteos de la base anterior al cambio.
- `migration-report.json`: evidencia de preservación, catálogos, corrección de país y salud del backend.
- `migrate-zeuz.sql`: SQL ejecutado para construir el destino.

Una recuperación posterior debe considerar primero los datos nuevos que se hayan escrito en `zeuz`. Para volver al estado de conexión anterior, conservar una copia protegida del entorno actual y de `zeuz`, restaurar `cutover/bte-api.env` sobre `/etc/bte-api.env` y reiniciar `bte-api.service`. Esto vuelve a conectar a `baco`; no fusiona operaciones realizadas después del cambio. Comprobar nuevamente el carrusel con Origin y X-FRONT. No borrar ninguna de las tres bases.

Los scripts de creación y activación fallan si encuentran destinos o respaldos previos: no deben ejecutarse nuevamente sobre estas bases ya activadas.
