# Perfiles y menús de la aplicación

Fecha de revisión: 18 de septiembre de 2026.

Este documento describe el comportamiento del código local actual. No confirma que esta versión esté publicada en producción.

## Perfiles definidos

| Perfil          | Función                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------- |
| `admin`         | Administración global y gestión de usuarios de las distintas academias.                  |
| `academy_admin` | Administración de su academia y de usuarios con perfiles instructor, apoderado y alumno. |
| `instructor`    | Consulta de sesiones asignadas y registro de asistencia autorizado.                      |
| `apoderado`     | Consulta de información de los alumnos asociados activamente a su persona.               |
| `alumno`        | Consulta de su propia información académica y financiera.                                |

## Matriz de menú y acceso

Leyenda:

- **Sí**: el enlace aparece y el perfil puede abrir la ruta; la API verifica los permisos sobre los registros y operaciones.
- **No**: el enlace no aparece y la política de rutas no permite acceder a esa sección.
- **Propia**: aparece y permite acceder a la academia asociada a la sesión.
- **Redirige**: el enlace aparece, pero termina redirigiendo a Mi cuenta; no concede acceso a Analytics.

`{academia}` corresponde a `academieId` de la sesión. Las rutas son internas de Angular, relativas a `/bte/` en producción.

| Ítem del menú              | Ruta                        | admin | academy_admin | instructor | apoderado | alumno |
| -------------------------- | --------------------------- | ----- | ------------- | ---------- | --------- | ------ |
| Mi cuenta                  | `/mi-cuenta`                | Sí    | Sí            | Sí         | Sí        | Sí     |
| Administración → Usuarios  | `/admin/users`              | Sí    | No            | No         | No        | No |
| Campeonatos → Invitaciones | `/campeonatos/invitaciones` | Sí    | Sí            | No         | No        | No |
| Campeonatos → Mis Eventos  | `/campeonatos/mis-eventos`  | Sí    | Sí            | No         | No        | No |
| Campeonatos → Cronograma   | `/campeonatos/cronograma`   | Sí    | Sí            | No         | No        | No |
| Campeonatos → Scoreboard → Dashboard | `/scoreboard`     | Sí    | Sí            | No         | No        | No |
| Campeonatos → Scoreboard → Mesas de Control | `/scoreboard/control-tables` | Sí | Sí | No     | No        | No |
| Campeonatos → Scoreboard → Tatamis | `/scoreboard/tatamis` | Sí  | Sí            | No         | No        | No |
| Campeonatos → Scoreboard → Combates | `/scoreboard/matches` | Sí | Sí            | No         | No        | No |
| Campeonatos → Scoreboard → Historial | `/scoreboard/history` | Sí | Sí           | No         | No        | No |
| Academia → Dashboard       | `/academia/dashboard`          | Sí | Sí            | No         | No        | No |
| Academia → Gestión de clases → Clases       | `/academies/{academia}/classes` | Sí | Propia | No | No     | No |
| Academia → Gestión de clases → Modalidades  | `/academies/{academia}/training-modalities` | Sí | Propia | No | No | No |
| Academia → Gestión de clases → Salas        | `/academies/{academia}/rooms` | Sí | Propia | No | No | No |
| Academia → Gestión de clases → Instructores | `/academies/{academia}/instructors` | Sí | Propia | No | No | No |
| Academia → Finanzas → Panel financiero      | `/academies/{academia}/billing` | Sí | Propia | No | No | No |
| Academia → Finanzas → Planes / Membresías   | `/academies/{academia}/billing-plans` | Sí | Propia | No | No | No |
| Academia → Finanzas → Cargos                | `/academies/{academia}/charges` | Sí | Propia | No | No | No |
| Academia → Finanzas → Pagos | `/academies/{academia}/payments` | Sí | Propia | No | No | No |
| Academia → Grados → Estilos | `/academies/{academia}/styles` | Sí | Propia | No | No | No |
| Academia → Grados → Sistemas de grado | `/academies/{academia}/grading-systems` | Sí | Propia | No | No | No |
| Academia → Notificaciones | `/academies/{academia}/notifications` | Sí | Propia | No | No | No |
| Academia → Dojo/Escuela   | `/academia/dojo-escuela` | Sí | Sí | No | No | No |
| Academia → Deportistas/Coach | `/campeonatos/deportistas` | Sí | Sí | No | No | No |
| Academia → Usuarios       | `/academies/{academia}/users` | No (*) | Propia (**) | No | No | No |
| Dashboards → Analytics    | `/` → `/dashboards/analytics` | Sí | Sí | Redirige (***) | Redirige (***) | Redirige (***) |

(*) `admin` utiliza **Administración → Usuarios**, donde puede seleccionar la academia. El guard específico de `/academies/{academia}/users` exige `academy_admin`, por lo que esa ruta tampoco está habilitada directamente para `admin`.

(**) El enlace Academia → Usuarios se agrega únicamente cuando el usuario es `academy_admin` y tiene un `academieId` mayor que cero.

(***) Existe una diferencia en el código actual: la política permite `/` a cualquier sesión y el enlace Analytics apunta a `/`. Por eso el enlace queda visible para instructor, apoderado y alumno. Al resolver la redirección a `/dashboards/analytics`, el guard rechaza esa ruta y envía a `/mi-cuenta`. Este documento registra ese comportamiento; no modifica la aplicación.

## Contenido de Mi cuenta por perfil

| Perfil | Contenido y acciones |
| --- | --- |
| `admin` | Identificación de la cuenta, acceso a Administrar usuarios y acceso a Mi academia si tiene academia asociada. |
| `academy_admin` | Identificación de la cuenta y acceso a Mi academia si tiene academia asociada. |
| `instructor` | Sesiones asignadas de los próximos 30 días y enlace Registrar asistencia en cada sesión autorizada. |
| `apoderado` | Alumnos vinculados: academias, saldo pendiente, grados y asistencia reciente. |
| `alumno` | Sus academias, saldo pendiente, grados y asistencia reciente. |

Una cuenta de alumno o apoderado sin relaciones configuradas muestra un mensaje indicando que debe solicitar la asociación al administrador de la academia. El perfil, por sí solo, no crea esas relaciones.

## Accesos que no son ítems independientes del menú

| Pantalla | Ruta | Perfiles y condiciones |
| --- | --- | --- |
| Registro de asistencia | `/academies/{academia}/class-sessions/{sesion}/attendance` | `admin`; `academy_admin` dentro de su academia; `instructor` mediante Mi cuenta y sujeto a asignación activa verificada por la API. |
| Detalle de clase | `/academies/{academia}/classes/{clase}` | `admin` y `academy_admin` de la academia correspondiente. |
| Perfil del alumno | `/students/{alumno}` | La ruta administrativa admite `admin` y `academy_admin`; la API valida el alcance del alumno. Alumnos y apoderados consultan su información desde Mi cuenta. |
| Dashboard por academia | `/academies/{academia}/dashboard` | `admin` y `academy_admin` de la academia correspondiente. |
| Niveles de un sistema de grado | `/academies/{academia}/grading-systems/{sistema}/levels` | `admin` y `academy_admin` de la academia correspondiente; las operaciones de la API pueden exigir permisos adicionales. |

El instructor puede abrir la ruta de asistencia con un ID de academia distinto al de su cuenta, por ejemplo para una sustitución. Esto no autoriza la sesión: el backend verifica la asignación real y vigente antes de devolver o modificar información.

## Elementos ocultos para todos los perfiles

- Apps.
- Pages.
- UI Elements.
- Documentation.
- Customize, porque no contiene hijos visibles.
- Configuration, porque su navegación está definida como una función y el filtro actual sólo conserva enlaces con rutas de texto.
- Academia → Instructor/Sensei, por el mismo filtro de rutas; es un enlace externo definido como función.

Que una sección de la plantilla esté oculta no significa que todas sus rutas estén deshabilitadas. La política general permite las rutas al perfil `admin`, salvo que exista otro guard específico. Los demás perfiles sólo tienen las rutas admitidas expresamente por la política.

## Condiciones de acceso

1. Todos los accesos administrativos requieren una sesión válida. Si vence, se redirige al login.
2. El menú utiliza la academia de la sesión para construir enlaces. Cuando no hay academia asociada, los enlaces generados mediante `academyRoute(...)` apuntan a `/academia/dojo-escuela`, aunque conservan sus etiquetas de clases, finanzas o grados.
3. `admin` tiene alcance global en la API, pero el menú de academia no incluye un selector global en cada sección. El selector de academia está disponible en Administración → Usuarios.
4. `academy_admin` no puede acceder a rutas `/academies/{academia}/...` de otra academia.
5. Abrir una pantalla no concede automáticamente permiso para todas sus acciones. La API valida el perfil actual, la academia, la persona y las relaciones de cada recurso.
6. Un rechazo `403` conserva la sesión y no concede acceso al registro solicitado.

## Fuentes revisadas

- `src/app/core/navigation/navigation-loader.service.ts`: construcción, filtrado y visibilidad del menú.
- `src/app/core/auth/route-access.ts`: política compartida de rutas y menú.
- `src/app/core/auth/auth.guard.ts`: guardias de sesión, sección y administración de usuarios.
- `src/app/app.routes.ts`: rutas principales y redirecciones.
- `src/app/pages/academy-management/academy-management.routes.ts`: rutas del módulo de academias.
- `src/app/pages/academy-management/account/account-overview.component.ts`: contenido de Mi cuenta.

Para el detalle de autorización y despliegue, consultar [profile-security.md](profile-security.md).
