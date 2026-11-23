# Integración visual de horarios e instructores

Se completa el frontend en /academies/:academyId/classes/:classId. El detalle ahora incluye Resumen, Horarios, Instructores y Alumnos. Los tabs nuevos cargan datos al abrirse.

## Cambios

- ClassSchedulesComponent: listado ordenado por día/hora, sala por catálogo de academia, vigencia y estado; agregar/editar/desactivar con confirmación. Incluye estados loading/error/empty y reintento. Explica la necesidad de horario activo para inscribir alumnos. Impide en la interfaz desactivar el último horario activo de una clase ACTIVE, también dentro del formulario de edición.
- ScheduleFormDialogComponent: reutilizado y completado; fechas locales, normalización de horas para input time, vigencias válidas, salas de la academia, guardado único, formulario deshabilitado durante envío y mensajes reales de conflictos sin cerrar el diálogo.
- ClassInstructorsComponent: muestra nombre, rol, principal, vigencia y estado; asignar/editar/desvincular con confirmación y actualización del listado.
- ClassInstructorDialogComponent: selecciona instructores existentes de la academia, excluye duplicados activos, valida principal único/fechas, soporta edición y conserva el formulario ante errores.
- AcademyOperationsService: incorpora updateClassInstructor sobre PUT /api/class-instructors/{id}; tipa los cuerpos con ClassInstructorRequest. Conserva endpoints existentes.
- ClassDetailComponent: integra los tabs y oculta las acciones de administración de la clase a roles de consulta.

## Contratos y límites

No se cambian backend, BD ni despliegue. La API sigue validando permisos y conflictos. Las acciones nuevas están restringidas visualmente a admin/academy_admin, y las clases cerradas se consultan sin editar horarios/asignaciones.

GET /api/classes/{id}/instructors devuelve solo asignaciones ACTIVE: el listado presenta esas asignaciones, sin simular un historial que el endpoint no devuelve. Desvincular utiliza el DELETE lógico existente, que conserva la asignación inactiva en BD.

Los nombres se resuelven por catálogo de academia en una sola consulta, sin solicitudes por fila. Para usuarios de consulta se respeta el acceso disponible en API: no se solicita el catálogo administrativo; si falta nombre descriptivo en la respuesta, se muestra el identificador. Actualmente la autorización del backend permite horarios a instructor asignado, pero el endpoint de instructores de clase puede denegar ese rol. El frontend presenta el error y no evade la autorización. Ampliar ese permiso exige un cambio de backend fuera de esta solicitud de frontend.

La protección del último horario es visual; esta entrega no modifica las validaciones de concurrencia/activación del backend.

## Verificación

Build de producción: OK, dist-stage-3-visual, SEO OK. Pruebas del área de clases: 25/25 correctas en ChromeHeadless. Incluyen apertura diferida de tabs mediante rutas/servicios HTTP reales con respuestas controladas, nombres/salas, protección del último horario, confirmación y error de desvinculación, permisos de consulta, edición de asignación, rangos inválidos, conflictos, doble submit y regresión del flujo anterior de clases. No se publica en hosting en esta tarea.
