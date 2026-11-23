# Perfiles y alcance de información

Implementación local del 18 de septiembre de 2026. Requiere publicar **API y frontend**; ocultar un menú no sustituye la autorización del servidor.

| Perfil | Interfaz | Alcance |
| --- | --- | --- |
| `admin` | Administración y módulos de academias | Todas las academias; gestión de los cinco perfiles |
| `academy_admin` | Academia, usuarios subordinados y campeonatos | Academia de `academy_users`; representante legal como compatibilidad cuando no existe esa asociación |
| `instructor` | Mi cuenta y registro de asistencia | Sesiones con asignación activa permanente o de sustitución, respetando fechas y academia |
| `apoderado` | Mi cuenta | Alumnos asociados mediante `student_attorneys` activo |
| `alumno` | Mi cuenta | Alumno cuya persona corresponde a la cuenta autenticada |

## Cómo se asigna el acceso

- El mantenedor de usuarios existente asigna cuenta, persona, academia y perfil. El administrador global selecciona la academia; el administrador de academia sólo crea `instructor`, `apoderado` y `alumno`.
- Asignar el perfil de instructor no asigna clases automáticamente. Utilizar los mantenedores existentes de instructores y asignaciones de clases/sesiones.
- Asignar el perfil de apoderado no concede acceso a todos los alumnos de la academia. Debe existir una relación activa con el alumno en `student_attorneys`, creada mediante el flujo de apoderados del alumno.
- La cuenta del alumno debe utilizar la misma persona que su registro de alumno. Una persona nueva sin ese registro mostrará la vista personal vacía hasta completar la asociación.
- Los roles y el estado activo se comprueban en la base, además de validar el JWT. Una cuenta desactivada o con un rol revocado pierde acceso en las solicitudes siguientes.

## Autorización

`AcademyAuthorizationService` resuelve la identidad y las relaciones; `AcademyScopeAuthorizationFilter`, ya registrado globalmente, valida operaciones y recursos. No se crea un segundo sistema de autorización.

Se distinguen consulta y modificación. Se revisan identificadores directos, identificadores indirectos (planes, salas, perfiles de grado, inscripciones, notificaciones) y propietarios enviados en formularios. Una relación de apoderado o alumno no concede permisos para generar cargos, promover grados o retirar inscripciones.

Los listados de cargos, pagos, saldos, grados, inscripciones y asistencia del alumno filtran por academia antes de devolver resultados o paginar. Un administrador de academia puede consultar su parte de un alumno compartido, sin consultar los movimientos de otras academias. Las modificaciones de la persona/alumno compartido y los flujos antiguos de inscripción que no seleccionan academia explícitamente exigen control de todas las academias involucradas; de lo contrario se reservan al administrador global.

Los endpoints legacy de listados globales de personas, alumnos, apoderados y asociaciones alumno-academia quedan reservados al administrador global. La gestión ordinaria utiliza los flujos con academia y alumno explícitos. Los endpoints de pagos, competidores, equipos y participantes de eventos comprueban el alcance de academia. Los datos descriptivos de eventos siguen disponibles para los administradores de academia y el carrusel público conserva su acceso existente.

El registro de asistencia valida la inscripción para la fecha de la sesión, rechaza alumnos duplicados o ajenos y registra el usuario que realizó el cambio. La API de vista personal deriva la persona del JWT; no acepta un identificador de persona enviado por el navegador.

Los cuerpos HTTP dejan de copiarse automáticamente a logs. El registro conserva método, ruta, estado, duración e IP; se desactiva el registro de datos sensibles de EF. Esto no elimina registros históricos ya existentes ni sustituye una revisión de logs específicos de otros módulos.

## Menú y rutas

La política compartida está en `src/app/core/auth/route-access.ts`. La utiliza tanto el menú como `sectionGuard`, incluyendo URL directas. Para agregar una sección, definir su acceso en esa política y la autorización correspondiente en la API. Las rutas sin permiso redirigen a `/mi-cuenta`; una sesión vencida redirige al login. Un `403` no cierra una sesión válida.

La vista `/mi-cuenta` muestra saldos, grados y asistencia para alumnos/apoderados, y las sesiones de los próximos 30 días para instructores. No permite editar información administrativa.

## Publicación manual

1. Respaldar las versiones de frontend y API actualmente desplegadas.
2. Integrar los fuentes del paquete backend en la versión actual de la API, compilar y publicar con su procedimiento habitual. El paquete de fuentes **no es una API compilada**. Conservar la configuración y secretos del servidor.
3. Este cambio no introduce tablas ni migraciones nuevas. Requiere el esquema del módulo integral de academias y `academy_users` ya existente. Se corrigió la doble implementación de `OnModelCreatingPartial` para registrar ambos módulos en el mismo modelo EF.
4. Publicar el contenido del ZIP frontend en `/bte/`. El build utiliza `<base href="/bte/">`.
5. Conservar el fallback SPA y la política de caché de [nginx-bte-routing.md](nginx-bte-routing.md). No cachear respuestas autenticadas de la API; `index.html` debe revalidarse. No se modificó nginx ni se vació su caché desde esta ejecución.
6. Comprobar con cuentas de prueba de cada perfil: acceso permitido, URL de otra academia, modificación rechazada para alumno/apoderado, revocación de asignación del instructor y expiración de sesión.

No se ejecutaron migraciones ni pruebas sobre la base de producción. La prueba de MySQL sólo genera SQL sin abrir una conexión. Las pruebas unitarias utilizan bases en memoria; sigue siendo necesaria la validación del despliegue con la base y configuración del ambiente de destino.

## Validación local

- 53 pruebas backend: autorización por alcance, mantenedor de usuarios y reglas del módulo de academias.
- 23 pruebas frontend: permisos de rutas, guardias de usuarios, manejo de `401/403` y expiración de sesión.
- Compilación Angular de producción con AOT correcta.
- Compilación de la API en la copia aislada correcta. Persisten advertencias previas de nulabilidad y código inalcanzable en otros módulos.

Esta entrega cubre los flujos indicados; no representa una auditoría exhaustiva de todos los endpoints, hubs, archivos públicos y logs históricos del sistema.
