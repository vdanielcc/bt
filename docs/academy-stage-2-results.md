# ETAPA 2 — Gestión de clases

## Auditoría inicial

Ver [auditoría](academy-stage-2-audit.md): tabla completa; entidad, DbSet, rutas, menú, service y componentes existentes; CRUD, formulario, listado y detalle parcialmente implementados. Faltaban DTOs/servicio backend, filtros, validaciones y acciones consistentes de estado.

## Base de datos

Se reutiliza `academy_classes` con las 14 columnas auditadas, sus claves foráneas, índice único `(academy_id, name)` y CHECK de estados/capacidad/fechas. No se alteran tablas, no se requiere `bte_stage_2_classes.sql` y no se ejecutan migraciones. Se conserva la estructura de ETAPA 1 y eventos.

## Backend

- Entidad `AcademyClass`: reutilizada; DbSet existente.
- `BteV1Context`: límites 30/120/1000/20, índice único existente, fechas de auditoría y relaciones academia/modalidad/sala según el esquema real.
- `AcademyClassDtos.cs`: escritura, lectura, referencias resumidas, cambio de estado y conteos reales.
- `IAcademyClassService`, `AcademyClassService`: consultas, filtros, creación, edición y estados, con validaciones de negocio.
- `AcademyManagementController.Classes.cs`: delegación al servicio; conserva rutas y envoltorio `ApiResponder`.
- `Program.cs`: registro del servicio.
- `AcademyScopeAuthorizationFilter`: reconoce el cambio de estado por propietario de la clase. Reutiliza roles `admin` y `academy_admin` y permisos vigentes de BD.

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/academies/{academyId}/classes` | Lista con `search`, `status`, `trainingModalityId`, `roomId` |
| GET | `/api/academies/{academyId}/classes/summary` | Total, activas, inactivas y cerradas en una agregación |
| GET | `/api/classes/{id}` | Detalle con referencias resumidas y nombres |
| POST | `/api/academies/{academyId}/classes` | Crear |
| PUT | `/api/classes/{id}` | Editar campos permitidos |
| PUT | `/api/classes/{id}/status` | Activar, desactivar o cerrar |
| DELETE | `/api/classes/{id}` | Desactivar sin eliminar; una cerrada conserva CLOSED |

El listado trae nombres de modalidad y sala en una consulta con joins. No hay llamadas por fila ni conteos ficticios de alumnos. El detalle devuelve DTO, no navegación completa de EF.

## Frontend

Se reutilizan el menú **Gestión de clases → Clases**, rutas lazy, guards, componentes Vex y service Angular.

| Ruta dentro de `/app/` | Página |
|---|---|
| `/academies/:academyId/classes` | Listado, filtros, tarjetas reales, vigencia y acciones |
| `/academies/:academyId/classes/new` | Crear |
| `/academies/:academyId/classes/:classId` | Detalle / Resumen |
| `/academies/:academyId/classes/:classId/edit` | Editar |

`ClassEditorComponent` es el único formulario de creación/edición; `ClassFormPageComponent` lo aloja en página y el diálogo anterior lo reutiliza para conservar posibles callers. `ClassStatusActionsComponent` comparte acciones entre listado y detalle. Se amplían interfaces con solicitudes, referencias, filtros, estados y resumen tipados; `ClassManagementService` procesa el envoltorio estándar también al crear y actualizar.

Filtros del servidor con debounce de 300 ms y cancelación de solicitudes anteriores. Se distinguen carga, error con reintento, academia vacía y búsqueda sin resultados. Las tarjetas reflejan todas las clases de la academia. Formulario y detalle incluyen breadcrumbs; las tablas permiten desplazamiento horizontal y formularios se adaptan a desktop/tablet.

El detalle muestra solo Resumen. No consulta ni presenta como terminados los flujos de horarios, instructores, alumnos, sesiones, asistencia o planes. Sus endpoints/modelos preexistentes permanecen disponibles, sin desarrollar nuevas funciones de esas etapas.

## Validaciones

- Academia existente y autorización JWT por academia propietaria.
- Nombre obligatorio y normalizado; límites reales de nombre/código/descripción.
- Modalidad obligatoria y sala opcional, existentes y de la misma academia.
- Referencias activas para nuevas clases o reactivación. Al editar se conserva una referencia histórica inactiva ya asignada; no se puede seleccionar otra inactiva.
- Capacidad nullable o entero mayor que cero; fechas opcionales con inicio ≤ término.
- Estados exclusivamente ACTIVE/INACTIVE/CLOSED; `isActive` coherente con el estado.
- Nombre único por academia, incluida una clase histórica; errores 409/422 útiles.
- PUT no modifica academia, ID ni fecha de creación. Los campos extra del cliente no se copian a la entidad.
- Desactivación y cierre conservan la fila y el historial; confirmación Material para cierre. No hay `window.confirm` en el flujo de clases.
- Guardado deshabilita formulario/botón, evita doble envío y conserva datos ante errores.

## Verificación y límites

Backend restore/build: OK. Frontend producción y comprobación SEO: OK. Pruebas backend globales: 302 correctas / 303, con el fallo decimal preexistente de `StudentUpdateTests.SharedFormPayloadDeserializesAndValidatesWithoutLegacyContactFields`, reproducido antes de estas etapas y documentado en ETAPA 1. Todas las pruebas nuevas de clases pasan.

Pruebas frontend específicas: 9 del formulario/listado más un recorrido de crear → detalle → editar → desactivar → activar → cerrar con routes/guards reales en ChromeHeadless y respuestas HTTP controladas. La prueba usa un usuario autorizado de academia y no escribe en producción.

Suite frontend final: 246 correctas / 249, con los mismos tres fallos preexistentes. El recorrido de clases también pasó dentro de la suite completa. Compilación de todas las rutas de eventos, categorías, inscripciones y Scoreboard: correcta; sus archivos de implementación no se modifican.

Ensayo relacional: respaldo restaurado en `bte_academy_stage2_20261009_test`, separado de producción, con el ensamblado exacto de publicación. Pasaron la regresión de ETAPA 1, CRUD de federaciones, creación/edición de clase, filtros y agregación SQL reales, duplicados, capacidad/fechas inválidas, modalidad/sala de otra academia, propietario inmutable y activación/desactivación/cierre con fila histórica conservada. Se compararon los tipos, propiedades y métodos públicos de la API anterior, excepto las firmas de `AcademyManagementController` modificadas intencionalmente.

Los tres fallos frontend preexistentes documentados en ETAPA 1 pertenecen a `auth.service.spec.ts` (URL), `student-document.spec.ts` (argumentos de llamada) y `schedule-times.spec.ts` (texto de horario). No se modifica lógica ajena a ETAPA 2 para cambiar esos resultados.

La aceptación en el hosting público requiere instalar manualmente la entrega del frontend y recorrer el flujo autenticado con la API publicada. Este paso no se sustituye por pruebas con HTTP controlado.

## Entrega

Frontend: `entregables/bte-frontend-app-20261009-academia-etapa2.zip`, base `/app/`; incluye ETAPA 1, mantenedor admin de estilos/federaciones, SEO/favicons y buscador de traslado de alumnos.

Descarga: https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261009-academia-etapa2.zip. SHA256 `e3e1f23682c558052c3b1f58c020b36355f9cffd924c06358226c34f6f8d16c0`, 9.448.141 bytes.

Backend publicado desde `backend-production`: SHA256 `6e4518908407e4adb397dfd2df1d81eb5be99f8bf787276fd5b093c10c94ee8e`. El respaldo nuevo está en `/opt/bte-api/deploy-academy-stage2-20261009/backup`: API completa, dump MySQL, entorno y servicio systemd, con checksum y restauración de ensayo comprobados. Solo se actualizan el ensamblado y sus símbolos, después de verificar las dependencias existentes. Se conserva `/etc/bte-api.env` y existe reversión automática ante fallo.

Servicio `bte-api.service` activo después del reinicio; carrusel público `200 OK` con `Origin: https://budotournaments.net` y `X-FRONT`. Listado/resumen/detalle/cambio de estado de clases sin JWT: `401`. Se conservan todas las rutas y métodos previos de Swagger, incluidos eventos, categorías, participantes y Scoreboard. No se alteran datos de eventos ni se regeneran fixtures.

## Pendientes y estado

1. Instalar manualmente el frontend en `/app/`, respaldando la versión web actual e incluyendo `.htaccess`.
2. Realizar la aceptación autenticada con frontend y API publicados. El recorrido del frontend pasó en Chrome con HTTP controlado y las operaciones de backend pasaron en MySQL aislado; no se presenta esa verificación como aceptación en el hosting público.
3. Corregir por separado los cuatro fallos preexistentes de suites globales (uno backend y tres frontend), ajenos al código de ETAPA 2.

**ETAPA 2 PARCIAL** según el criterio definitivo de cierre: implementación y validación técnica completadas, backend publicado y frontend entregado; falta la instalación manual y aceptación en el hosting público. No falta funcionalidad de clases en el código entregado.

No avanzar a ETAPA 3.
