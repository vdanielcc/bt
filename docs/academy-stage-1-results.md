# ETAPA 1 — Gestión de Academia: resultados

Informe inicial del 9 de octubre de 2026. Las secciones 1–8 documentan la implementación y las pruebas anteriores al despliegue.

Actualización: la API ya está publicada, se verificó el respaldo mediante restauración aislada y la fuente productiva recuperada está en `backend-production`. El resultado vigente se documenta en [academy-stage-1-production.md](academy-stage-1-production.md).

## 1. Auditoría inicial

La auditoría se realizó antes de modificar código y está en `academy-stage-1-audit.md`.

| Funcionalidad | BD de referencia | API | Frontend | Estado inicial |
|---|---|---|---|---|
| Modalidades de entrenamiento | EXISTE | PARCIAL | PARCIAL | CRUD sin selección de estilo y validaciones incompletas |
| Salas | EXISTE | PARCIAL | PARCIAL | CRUD, capacidad validada solo al crear, confirmación nativa |
| Instructores | EXISTE | PARCIAL | PARCIAL | Personas existentes, búsqueda local y edición histórica limitada |
| Estilos / disciplinas | EXISTE | PARCIAL | PARCIAL | Endpoints genéricos y servicio, sin mantenedor de catálogo |
| Academia + estilo + federación | EXISTE | PARCIAL | PARCIAL | Listado de IDs; sin principal único transaccional ni baja |

Evidencia BD: `_script/production_schema_reference_20260922.sql`. El estado actual de una instancia MySQL no se verificó directamente. Se encontraron también las tablas legacy `academies`, `sports_associations`, `persons`, `users`, `student`, `student_academy` y `modality`.

Arquitectura conservada: .NET 8, EF Core 8/Pomelo, contexto parcial, controllers/services y ApiResponder; JWT con filtro global de autorización por academia. El repositorio ya contiene migraciones EF y SQL: no se convirtió a otra estrategia. AutoMapper existe en otros módulos; estos mantenedores usan mappings explícitos, conforme al patrón local de DTOs. Angular 17 standalone, Material/Vex, servicios HTTP e interceptor existente.

## 2. Base de datos

Encontradas: `training_modalities`, `academy_rooms`, `academy_instructors`, `martial_arts_styles`, `academy_styles`, con los campos solicitados, claves foráneas e índices de unicidad existentes.

- Tablas creadas: ninguna.
- Columnas agregadas: ninguna.
- Índices agregados: ninguno.
- Collation existente conservada: `utf8mb4_spanish_ci`.
- Script generado: `_script/bte_stage_1_academy_configuration.sql`.

El script es de validación y contiene únicamente consultas: existencia/columnas/collation/índices, múltiples principales, asociaciones duplicadas y modalidades vinculadas a estilos de otra academia. No se aplicó a ninguna base.

La unicidad de principal y los duplicados de asociación con federación NULL se controlan en transacción serializable, bloqueando la fila de la academia mediante `SELECT ... FOR UPDATE`. Todos los escritores de asociaciones de esta API usan ese bloqueo. Los índices únicos existentes siguen siendo la defensa final para nombres/códigos/personas; duplicidades MySQL se convierten a 409. La concurrencia real en MySQL está pendiente de prueba en una base aislada.

## 3. Backend

Archivos creados, relativos al backend:

- `Controllers/AcademyManagementController.Configuration.cs`: operaciones de ETAPA 1, validación, mappings y transacciones.
- `DTO/Academy/AcademyConfigurationDtos.cs`: cinco contratos Write y cinco DTO de respuesta, sin entidades EF en estas respuestas.
- `tests/bte.api.Tests/AcademyConfigurationTests.cs`: 14 casos de configuración.

Archivos modificados:

- `Controllers/AcademyManagementController.cs`: se extrajeron únicamente las operaciones de ETAPA 1 al archivo parcial; la búsqueda de candidatos ahora acepta query/limit.
- `Services/AcademyScopeAuthorizationFilter.cs`: reconocimiento de DTOs, alcance de nuevos DELETE y preservación de comprobaciones legacy.
- `tests/bte.api.Tests/AcademyScopeTests.cs`: una prueba adicional de DTOs, bajas y restricciones de catálogo.

Entidades reutilizadas: `TrainingModality`, `AcademyRoom`, `AcademyInstructor`, `MartialArtStyle`, `AcademyStyle`, `Person`, `Academy`, `SportsAssociation`. No se crearon entidades duplicadas ni servicios paralelos. Las operaciones conservan el acceso al contexto dentro del controller; se reutiliza la autorización y zona horaria existentes.

Cambios funcionales:

- Validaciones de nombre, longitudes, edades/capacidad y duplicados en creación/edición.
- IDs y fecha de creación controlados por servidor; no se permite cambiar la academia de un registro al editar.
- Relación modalidad/estilo validada contra la academia, también para admin global.
- Principal único y baja lógica de asociaciones; desactivar un principal elimina su marca.
- Baja lógica de modalidades, salas, estilos e instructores, conservando las relaciones e historial.
- Instructores con nombre agregado en listado/detalle, sin consultas frontend por cada instructor.
- Búsqueda acotada de personas de la academia, sin crear Person ni exigir login.
- Se conserva la regla existente: candidatos Coach/Sportman con pertenencia activa a escuela/dojo. No se amplió silenciosamente el acceso a personas ajenas.
- Se permite conservar la fecha de ingreso histórica al editar otros campos o la fecha de término.
- DTOs y esquemas de respuesta documentados para ETAPA 1 en OpenAPI.
- Catálogo global de estilos: escritura restringida al rol admin existente; administradores de academia gestionan sus asociaciones.

Respaldo de originales y hashes: `.tmp/stage1-backend-backup/manifest.json` en el frontend. Se verificaron los seis archivos integrados mediante SHA-256. Se comprobó que el código de clases, horarios, sesiones, asistencia y dashboard posterior al bloque extraído permanece igual al respaldo.

## 4. Endpoints finales

Todas las rutas están bajo `/api` y conservan ApiResponder/JWT. DELETE realiza baja lógica.

| METHOD | ENDPOINT | DESCRIPCIÓN |
|---|---|---|
| GET | `/api/academies/{academyId}/training-modalities` | Listar modalidades |
| GET | `/api/training-modalities/{id}` | Consultar modalidad |
| POST | `/api/academies/{academyId}/training-modalities` | Crear modalidad |
| PUT | `/api/training-modalities/{id}` | Editar/activar/desactivar |
| DELETE | `/api/training-modalities/{id}` | Desactivar |
| GET | `/api/academies/{academyId}/rooms` | Listar salas |
| GET | `/api/rooms/{id}` | Consultar sala |
| POST | `/api/academies/{academyId}/rooms` | Crear sala |
| PUT | `/api/rooms/{id}` | Editar/activar/desactivar |
| DELETE | `/api/rooms/{id}` | Desactivar |
| GET | `/api/academies/{academyId}/instructors` | Listar con nombres |
| GET | `/api/instructors/{id}` | Detalle con nombre |
| POST | `/api/academies/{academyId}/instructors` | Asociar Person existente |
| PUT | `/api/instructors/{id}` | Editar/activar/desactivar |
| DELETE | `/api/instructors/{id}` | Desactivar |
| GET | `/api/academies/{academyId}/instructor-candidates?query=...&limit=25` | Buscar candidatos; mínimo 2 caracteres con query, máximo 50 resultados |
| GET | `/api/martial-art-styles` | Listar catálogo |
| GET | `/api/martial-art-styles/{id}` | Consultar estilo |
| POST | `/api/martial-art-styles` | Crear estilo, admin global |
| PUT | `/api/martial-art-styles/{id}` | Editar/activar/desactivar, admin global |
| DELETE | `/api/martial-art-styles/{id}` | Desactivar, admin global |
| GET | `/api/academies/{academyId}/styles` | Listar asociaciones |
| POST | `/api/academies/{academyId}/styles` | Asociar estilo/federación |
| PUT | `/api/academies/{academyId}/styles/{id}` | Editar, principal o estado |
| DELETE | `/api/academies/{academyId}/styles/{id}` | Desactivar y quitar principal |
| GET | `/api/SportsAssociations` | Catálogo de federaciones existente, reutilizado |

Se conserva compatibilidad de búsqueda sin query, pero se limita a 50 resultados. El frontend nuevo siempre envía búsqueda y límite.

## 5. Frontend

Rutas:

- `/academies/:academyId/training-modalities`
- `/academies/:academyId/rooms`
- `/academies/:academyId/instructors`
- `/academies/:academyId/instructors/:instructorId` (nueva)
- `/academies/:academyId/styles` (mantenedor conectado al acceso existente)

Páginas/componentes creados:

- `grading/academy-styles.component.ts`: asociaciones y catálogo global para admin.
- `grading/academy-style-dialog.component.ts`: estilos/disciplina y asociación con federación.
- `instructors/instructor-detail.component.ts`: nombre, título, licencia, estado y fechas.
- `shared/academy-confirm-dialog.component.ts`: confirmación Material para bajas.
- `catalog/academy-catalog.validators.ts`: validación de rango y nombre no vacío.

Modificados en `src/app/pages/academy-management`:

- `catalog/academy-catalog.component.ts`: búsqueda, estados loading/error/empty/data, estilo y edades en tabla, descripción de sala y acciones de estado.
- `catalog/academy-catalog-dialog.component.ts`: estilo opcional, capacidad/edades/longitudes y mensajes de error.
- `instructors/instructor-list.component.ts`: nombres de API, búsqueda, estados, detalle y activación/desactivación.
- `instructors/instructor-form-dialog.component.ts`: búsqueda remota con debounce/cancelación, selección obligatoria, fechas históricas y longitudes.
- `models/academy-management.models.ts`: nombre de instructor y opción de federación tipados.
- `services/academy-management.service.ts`: búsqueda filtrada/detalle y lectura correcta del envelope al crear.
- `services/grading-management.service.ts`: federaciones/baja de asociación y envelope de creación.
- `academy-management.routes.ts`: ruta de detalle y mantenedor de estilos.

Se regeneró `src/app/core/icons/material-icons.generated.ts` para incluir los iconos de acciones nuevos. No se duplicaron entradas del menú. Estilos continúa bajo el acceso existente `Academia > Grados > Estilos`.

Servicios reutilizados: AcademyManagementService y GradingManagementService; no se agregó un servicio que centralice dominios distintos. Se conserva el academyId de ruta/contexto y el guard/interceptor actual. Todas las bajas, también desde formularios, solicitan confirmación Material.

Pruebas nuevas: `catalog/academy-catalog.validators.spec.ts`, `catalog/academy-catalog-dialog.component.spec.ts`, `grading/academy-styles.component.spec.ts`. Se actualizó `instructors/instructor-form-dialog.component.spec.ts` para búsqueda remota.

## 6. Build

| Verificación | Resultado |
|---|---|
| Backend restore, copia de validación | OK |
| Backend build, copia de validación | OK, 0 errores |
| Backend build, carpeta original tras integración | OK, 0 errores |
| Frontend AOT `ngc -p tsconfig.app.json` | OK |
| Frontend producción, equivalente a prebuild + build | OK |

Se ejecutó generación de iconos y Angular CLI con Node directamente porque el lanzador npx encontró un EPERM de sandbox. Salida de frontend: `.tmp/stage1-frontend-build`. Salidas de compilación del backend original se dirigieron al workspace; no se inició ni reinició la API. Persisten advertencias existentes de nullable/backend y CommonJS/frontend.

## 7. Tests

| Grupo | Resultado |
|---|---|
| Backend configuración + candidatos + alcance | 58/58 OK |
| Backend suite completa | 264 OK, 1 fallo, total 265 |
| Frontend Gestión de Academia, ChromeHeadless | 29/29 OK |
| Frontend suite completa, ChromeHeadless | 228 OK, 3 fallos, total 231 |

Fallo backend preexistente: `StudentUpdateTests.SharedFormPayloadDeserializesAndValidatesWithoutLegacyContactFields`, conversión de `0.01` en RangeAttribute bajo la cultura local. Se reprodujo también ejecutando el ensamblado original anterior al cambio.

Fallos frontend en archivos no modificados, presentes desde la primera ejecución completa:

- `auth.service.spec.ts`: espera URL localhost; environment utiliza apidemo.
- `student-document.spec.ts`: espera llamada de un argumento, implementación usa tres con opcionales undefined.
- `schedule-times.spec.ts`: espera texto de rango de horas; implementación entrega hora de inicio.

No se corrigieron contratos/assertions ajenos al alcance de ETAPA 1 ni se cambió lógica de eventos para hacer pasar esas pruebas.

Los tests de academia cubren creación, edición, duplicados, edades, capacidad, baja lógica, Person/academia válidos, nombres, histórico, federación, principal, aislamiento, JWT ausente y permisos de catálogo. El frontend verifica selección de estilo, validación, búsqueda de personas, mensajes backend, estados y solicitud de principal sin recalcular la regla localmente.

Chrome no pudo iniciarse dentro del sandbox; las pruebas se ejecutaron con revisión automática aprobada fuera del sandbox. No se utilizaron credenciales productivas ni se realizaron peticiones reales de los mocks HTTP.

## 8. Regresión eventos

Compilaron todas las áreas del frontend: listado/detalle de eventos, categorías, competidores e inscripciones, junto al resto de la aplicación. La suite backend completa ejecutó las pruebas existentes de estos dominios; el único fallo fue la prueba de validación decimal de alumnos antes descrita. La suite frontend completa ejecutó sus pruebas y detectó las tres inconsistencias preexistentes enumeradas.

No se modificaron controllers/services de eventos, categorías, fixtures, equipos, resultados, pagos legacy ni invitaciones. El filtro global solo agrega normalización de DTOs de academia y reconoce las bajas nuevas; las pruebas existentes de alcance también pasan. No se avanzó a ETAPA 2.

Verificación técnica del flujo disponible: formularios Material en ChromeHeadless y controller/filter con EF InMemory. No equivale a un recorrido con login real, API HTTP y persistencia MySQL.

## 9. Pendientes

1. Instalar manualmente el frontend en `/app/` y realizar el recorrido autenticado en navegador. La restauración aislada y las pruebas de mantenedores con MySQL ya pasaron usando el ensamblado exacto publicado; no se realizó una prueba concurrente de carga.
2. Completar el recorrido funcional de creación/edición/baja/reactivación después de la instalación manual.
3. Resolver por separado el fallo decimal backend y las tres assertions frontend ajenas al cambio, para contar con suites globales completamente verdes.

No falta implementación de los mantenedores de ETAPA 1 en el código entregado. Estos pendientes son validación del entorno e inconsistencias previas de la suite.

## 10. Estado ETAPA 1

**Implementada y backend desplegado; cierre funcional pendiente de la instalación manual del frontend y el recorrido autenticado.** Los mantenedores, DTOs, validaciones y permisos están publicados. Se verificaron respaldo restaurable, persistencia MySQL aislada, conservación de contratos productivos, autenticación requerida y carrusel público. Las suites globales mantienen los fallos preexistentes documentados. La fuente permanente está en `backend-production`.
