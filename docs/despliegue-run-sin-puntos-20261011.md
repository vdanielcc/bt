# RUN sin puntos — 11/10/2026

El formato canónico para RUN/RUT es cuerpo sin puntos, guion y dígito verificador
en mayúscula: `10.382.978-k` se envía y guarda como `10382978-K`.

El servicio de documentos compara los RUN/RUT y CPF ignorando puntos, guiones
y diferencias de mayúsculas, antes de resolver personas y comprobar duplicados.
Esto permite reconocer documentos históricos con formato sin modificar esos registros.
Los nuevos documentos y las ediciones explícitas se normalizan como parte del guardado.
La sincronización de las columnas históricas de persons usa también el formato normalizado.

El registro de cuentas resuelve el tipo de documento antes de buscar la persona existente.
Los formularios de cuentas, apoderados y usuarios de academia normalizan el documento
antes de enviarlo. El registro de deportistas ya lo hacía y se agregó cobertura
para el ejemplo `10.382.978-K`.

Backend publicado: SHA-256 `23b6f246790f5e00ffd270e95ba739fa024544efc7d85cc8bb7db82cc17b31bb`.
Respaldo privado: `/opt/bte-api/backups/run-normalization-20261011T213728Z`.
Servicio activo, rutas Swagger previas conservadas, listados de academias 14, 16 y 17
verificados contra consultas de solo lectura, y carrusel con HTTP 200 y CORS correcto.
Se comprobó que la clave del servicio coincide con la del frontend de producción.

No se ejecutaron migraciones ni correcciones de datos existentes.
No se modificaron llaves oficiales guardadas.

Frontend de producción compilado para `/app/`, empaquetado con sus recursos y configuración Apache:
https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261011-run-sin-puntos.zip

SHA-256: `959a08d2725751f81d6e422cc78ac38ae033df9183329d3aeb56da70201243a6`.
Tamaño: 9.474.581 bytes. Descarga HTTPS con HTTP 200 y contenido verificado contra ese hash.
La instalación del frontend en el alojamiento del sitio queda a cargo del usuario.

71 pruebas de backend aprobadas, incluyendo búsquedas y rechazo de duplicados
con formato histórico, actualización explícita, validadores, cuentas y relaciones activas.
27 pruebas de frontend aprobadas en Chrome Headless, incluyendo el envío sin puntos
desde los formularios de deportistas, cuentas y usuarios de academia.

## Corrección SQL al editar deportistas

El proveedor generaba SQL inválido al encadenar dos llamadas a Replace:
`REPLACE(REPLACE(TRIM(document_number), '.', ''), -, )`.
Se reprodujo el error 1064 en MySQL de producción (8.0.46) mediante una consulta
en transacción de solo lectura.

La comparación usa ahora un solo REPLACE para quitar puntos y compara contra
dos valores normalizados, con y sin guion. Mantiene la búsqueda de documentos
históricos y la exclusión del documento actual al comprobar duplicados.
El SQL generado se verificó con el proveedor relacional y se ejecutó correctamente
en el motor productivo, sin editar deportistas ni documentos existentes.
63 pruebas locales aprobadas, incluida la regresión de generación SQL.

Backend corregido: SHA-256 `e2be2d916f851d42bb750f2499ab7ead0b956947e58092bae1295e8d9c324881`.
Respaldo previo: `/opt/bte-api/backups/document-sql-fix-20261011T232812Z`.
No requiere un nuevo paquete de frontend.
