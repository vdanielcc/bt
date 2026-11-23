# Mantenedor de eventos

Acceso: **Administración → Eventos**, ruta `/bte/admin/events`, exclusivamente para `admin`.

El selector muestra `ID — Nombre` de todos los eventos retornados por `GET /api/Events`. La selección carga `GET /api/Events/{id}` y permite actualizar los campos del contrato `EventUpdateDto`: nombre, modalidad, fechas, dirección, ubicación, enlaces, academia organizadora, tipo, comuna, entrada, asociación deportiva, exponente, examinador, expositor y reglamento. Estado, número de áreas y competidores se muestran como referencia; este flujo no altera llaves ni resultados.

El guard y la política del menú restringen el acceso en Angular. `PUT /api/Events/{id}` requiere el rol `admin`; el filtro de autorización también comprueba el rol vigente en la base de datos, por lo que una asignación revocada no conserva acceso mediante un JWT anterior. Las consultas existentes de invitaciones y carrusel conservan su acceso.

## Póster

- El PUT acepta `posterBase64` opcional, JPG o PNG, hasta 3 MB; también admite un data URL Base64.
- El archivo se guarda bajo `Storage:BasePath` (por defecto `Assets`), en `events/{id}/{año}/{mes}/poster-{guid}.png` o `.jpeg`.
- La propiedad `Event.Poster` guarda la ruta `/events/{id}/{año}/{mes}/{archivo}` en la columna `poster` de la tabla existente, mapeada como `event`. No se crea otra tabla ni se guardan los bytes en la base de datos.
- Esa ruta se sirve mediante la API como imagen pública, verificando que coincida con el póster vigente del evento. No habilita acceso general a otras carpetas de `Assets`.
- Si no se envía otra imagen, se conserva el póster. Si falla la persistencia, se elimina el archivo nuevo. Los archivos anteriores no se borran automáticamente.
- Las invitaciones y el carrusel resuelven las nuevas rutas contra el host de la API; los enlaces externos existentes se conservan.

## Publicación

Requiere publicar backend y frontend; no requiere migración de base de datos. El usuario del servicio debe poder escribir en `Storage:BasePath`, y se deben conservar las imágenes al sustituir la publicación. El límite de petición del endpoint es 5 MB para admitir la codificación Base64 de una imagen de 3 MB; el proxy debe aceptar ese tamaño.

La implementación y sus pruebas se ejecutaron localmente. No se publicaron estos cambios ni se modificaron eventos productivos durante su desarrollo.
