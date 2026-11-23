# Gestión Alumnos

Acceso: **Administración → Gestión Alumnos**, ruta `/app/admin/students`, únicamente para el perfil `admin`.

Las tarjetas permiten inscribir un alumno en el dojo elegido, editar por documento/nombres/apellidos y trasladar desde un dojo de origen a un destino. Los selectores de escuelas permiten búsqueda por texto. La búsqueda de alumnos es paginada en el servidor.

El modelo legacy no contiene un estado activo/inactivo para academias. En este módulo se considera activo un dojo si tiene una cuenta activa de su representante o de un administrador de academia asignado. El backend aplica ese criterio al listado y valida el destino de inscripción/traslado.

La inscripción y edición reutilizan los formularios y reglas existentes. El contexto de inscripción es la academia seleccionada, no la academia de la sesión del administrador. Al editar después de un traslado se conserva la configuración original del documento del alumno.

El traslado desactiva la asociación de origen y crea o reactiva la de destino, conservando el mismo ID de alumno y las asociaciones históricas. Las participaciones, equipos, clases, pagos y fixtures previamente registrados no se reescriben. El backend verifica el perfil admin contra la cuenta activa en BD, aplica transacción serializable y rechaza un destino ya asociado o un origen que haya cambiado.

## Endpoints

- `GET /api/admin/students/academies`
- `GET /api/admin/students/search?criterion=documentNumber|firstName|lastName&query=...&academyId=...&page=1&pageSize=25`
- `GET /api/admin/students/{id}`
- `GET /api/admin/students/{id}/document-configuration`
- `POST /api/admin/students` (contrato existente `StudentCreateDto`)
- `PUT /api/admin/students/{id}` (contrato existente `StudentUpdateDto`)
- `POST /api/admin/students/{id}/move` con `sourceAcademyId` y `destinationAcademyId`

No requiere cambios de esquema ni migraciones.

## Publicación 04/10/2026

Backend instalado en producción. Respaldo: `/opt/bte-api/backups/20261004T051058Z-student-management`. Versión anterior: `/opt/bte-api/publish.previous-20261004T051058Z-student-management`.

Se comprobaron el servicio activo, Swagger, listado/búsqueda administrativos autenticados (`200`), rechazo de acceso anónimo (`401`) y carrusel con Origin/X-FRONT (`200`). Las pruebas de creación y traslado se ejecutaron exclusivamente sobre una BD aislada en memoria.

Frontend final: `release/student-management-final-20261004/bte-frontend-app-20261004.zip`. Extraer su contenido directamente en la carpeta `/app/` del hosting, incluyendo `assets` y `.htaccess`, después de respaldar la versión anterior. El ZIP contiene `base href="/app/"` y todos los recursos referenciados por el índice; su integridad y checksum se verificaron.
