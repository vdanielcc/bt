# Candidatos a instructor por escuela o dojo

El formulario de instructores consume `GET /api/academies/{academyId}/instructor-candidates` con autenticación. La API aplica el alcance de academia mediante `AcademyScopeAuthorizationFilter` y devuelve el envelope habitual con `id`, `firstName`, `lastName` y `rol`.

Solo devuelve personas con `Rol` igual a `Coach` o `Sportman` y una asociación `StudentAcademy` activa (`IsActive == true`) a la academia solicitada. Las asociaciones históricas, inactivas o sin estado confirmado no habilitan el registro. Una persona con varias asociaciones aparece una sola vez. La respuesta contiene exclusivamente los datos necesarios para el selector.

La API revalida rol y pertenencia en POST y en PUT de instructores activos o cuando cambia la persona, rechazando incumplimientos con 422. No permite trasladar un instructor cambiando `AcademyId`. Se permite desactivar un instructor histórico cuya persona ya no cumpla las condiciones, conservando su persona y academia.

El frontend muestra los candidatos recibidos y permite buscarlos por nombre; no decide su elegibilidad. El listado de instructores usa la misma consulta por academia para resolver los nombres disponibles, sin consultar el catálogo global de personas. Los registros históricos que ya no sean candidatos muestran su ID como alternativa.

La fecha de ingreso es obligatoria al registrar y no puede ser anterior a un mes calendario desde el día actual de la academia. La fecha de término puede ser nula; si existe debe ser estrictamente posterior al ingreso. Las fechas futuras de ingreso están permitidas. Las mismas validaciones se aplican cuando se modifican las fechas; se conservan los datos históricos cuando permanecen iguales. La interfaz mantiene `dd-mm-yyyy` y filtra el selector mientras se escribe, pero obliga a elegir una opción de la lista antes de guardar.

No requiere migraciones. Publicar la API con el nuevo endpoint antes del frontend. Los cambios se verifican en una copia local aislada en `.backend-instructor-candidates`; las pruebas utilizan EF en memoria, sin conectar a bases reales. Las copias previas del controlador y pruebas de alcance quedan en `.instructor-candidates-backup`.
