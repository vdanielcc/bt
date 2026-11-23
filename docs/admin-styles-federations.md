# Mantenedor de estilos y federaciones de academias

Ruta: `/app/admin/styles-federations`, menú **Administración → Estilos y federaciones**.

- Acceso exclusivo al rol `admin`, con guard de ruta y filtrado del menú.
- Estilos: búsqueda por código/nombre, creación, edición y activación/desactivación mediante el diálogo existente. La desactivación conserva el historial.
- Federaciones: búsqueda por nombre, email o RUT; creación, edición y eliminación confirmada. Nombre, email, dirección, comuna y representante legal son obligatorios según el modelo existente. Teléfono, RUT/DV y ruta del logo son opcionales. El representante se puede buscar por nombre o identificación.
- No se pueden eliminar federaciones utilizadas por academias, estilos de academias o sistemas de grados, incluso si las relaciones están inactivas.
- La asignación de estilos/federaciones a cada academia continúa en su configuración. Este mantenedor administra los catálogos globales.

## API y datos

Fuente del backend: `backend-production/`. No usar la versión antigua de `src/2025/API`.

`POST /api/SportsAssociations`, `PUT /api/SportsAssociations/{id}` y `DELETE /api/SportsAssociations/{id}` requieren JWT con rol administrador y la verificación del rol vigente en base de datos. La nueva ruta `GET /api/SportsAssociations/editor-options` tiene las mismas restricciones y entrega comunas y representantes para el formulario. Se conservan las consultas existentes del catálogo.

Las escrituras normalizan espacios, validan longitudes, email y referencias, rechazan nombres/email/RUT duplicados y copian exclusivamente campos editables. Identificadores, fecha de creación y relaciones anidadas del cliente no se aplican. Los conflictos de unicidad y de eliminación por claves foráneas devuelven `409`.

No requiere migración ni cambios de esquema. Estas federaciones son las entidades legales de academias; las asociaciones de eventos `WKF`, `JKA`, `WUKF` continúan como texto y tienen su mantenedor independiente. El Scoreboard y sus llaves oficiales no se modifican.

## Entrega y comprobaciones

Frontend: `entregables/bte-frontend-app-20261009-estilos-federaciones.zip`, para instalación manual en `/app/`. Incluye ETAPA 1, SEO/favicons y buscador de mover alumnos.

Pruebas: 39 verificaciones de backend sobre permisos de academia y CRUD de federaciones; 5 verificaciones de política de acceso del frontend y 3 del formulario; compilación de producción y comprobación SEO. Ensayo relacional sobre una copia aislada de MySQL antes de desplegar.

Respaldo privado de API, MySQL y configuración: `/opt/bte-api/deploy-admin-styles-20261009/backup`. El despliegue conserva `/etc/bte-api.env` y valida el carrusel público con `Origin` y `X-FRONT`.

Backend publicado: SHA256 `2c6a4803fc4b121d64a799165254b37b88678b1ea730ccd0da61e3fa9575318d`. Servicio activo, carrusel `200 OK`, operaciones de federaciones y opciones de edición sin JWT `401`. Se conservan las rutas y métodos anteriores de Swagger.

Frontend: SHA256 `e4b910b9e4838d183aaf7f060733514dd9ff7b99a480a9f199bfab235d839c4c`, 9.440.591 bytes. Descarga: https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261009-estilos-federaciones.zip.

La instalación del frontend y el recorrido autenticado en el hosting público quedan a cargo del usuario, conforme al despliegue manual acordado.
