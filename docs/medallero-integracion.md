# Medallero integrado — entrega de desarrollo

Fecha: 30 de octubre de 2026 (America/Santiago).

## Alcance implementado

- Menú Medallero y accesos desde Mis Eventos; selección de campeonatos según organizador principal/coorganizador y administrador global.
- Gestión Angular Material/@vex en `/medallero` y `/medallero/:eventId`.
- Pantalla externa en `/medallero/:eventId/pantalla`, con marca, logos, líder, clasificación, totales y pantalla completa. Comienza privada. La lectura pública no habilita gestión.
- Correcciones por categoría exclusivamente con competidores inscritos; la academia se obtiene de la inscripción.
- Edición de nombre, comuna y logo de la academia maestra, limitada a academias participantes del campeonato autorizado. JPG/PNG de hasta 1 MB, almacenamiento en Assets siguiendo la estructura existente. No se crean catálogos paralelos.
- PDF y XLSX con clasificación y detalle publicado, identidad de marca; JSON de configuración y correcciones, con copia local por usuario/campeonato para exportar sin conexión. No se agregó edición offline.
- Canal SignalR `/hubs/medal-table`. Difunde invalidaciones sin datos privados; cada cliente vuelve a consultar con permisos y visibilidad vigentes. Se separan los grupos de gestores y lectores públicos: al pasar a privado se emite una última invalidación pública para retirar la pantalla y los cambios posteriores se notifican solo al grupo de gestores. Se reconsulta también al suscribirse/reconectarse. El transporte Long Polling de SignalR permite usar el encabezado Bearer existente sin introducir tokens en URLs.

## Scoreboard y podios automáticos

La nueva página `/scoreboard/events/:eventId/categories/:categoryId/results` confirma resultados sobre encuentros oficiales guardados. Está enlazada desde la mesa de control, el dashboard y la selección de categoría del Medallero. Para el flujo de fixtures numéricos, «Confirmar resultado» lleva el total de Kata disponible al panel de categoría. El operador selecciona un participante del encuentro y confirma su resultado oficial.

En escritorio se agregó `Views/CategoryResultsWindow.cs`, accesible con «Resultados de categoría» desde la selección de campeonato/categoría. Consulta versiones almacenadas, confirma ganadores o totales oficiales de Kata y admite la decisión y el orden de un desempate. No reemplaza ni recalcula las reglas de puntuación de los paneles deportivos existentes: la confirmación usa el resultado del operador. Se corrigió el setter de selección de categoría necesario para ese flujo.

La sincronización se ejecuta al confirmar resultados y al guardar/generar versiones desde los servicios existentes. También puede solicitarse desde Medallero. Las lecturas del nuevo panel y del fallback del Scoreboard consultan el historial de versiones; no llaman a `fixtures/latest`, que podía generar una llave cuando no existía.

Fuentes utilizadas:

- `CategoryResult` confirmado de la versión vigente, cuando existe.
- Resultados confirmados de `CompetitionMatch`: final, combate explícito por tercer lugar, finales explícitas de repechaje o perdedores de semifinal cuando la versión admite dos terceros.
- `FixtureVersion/FixtureMatch`: ganadores existentes y nuevas confirmaciones en `medal_fixture_results`. Eliminación sigue las conexiones oficiales; para un tercer puesto exige el encuentro real entre los semifinalistas correspondientes.
- Kata por puntajes: total oficial de las planillas terminales; no se desempatan resultados por nombre o ID. Un empate requiere decisión explícita de votación o nuevo encuentro y un orden del operador.
- Mejor de tres reconoce el cierre al alcanzar dos encuentros ganados. Si la cantidad de bronces no es aplicable/coincide, no publica un podio inconsistente.
- Si dos modelos de llaves producen podios completos diferentes, se devuelve `source-conflict` y se requiere revisión del operador, sin elegir silenciosamente uno.

**Round Robin:** por decisión del usuario queda pendiente del operador hasta implementar las tablas por federación/asociación. Pueden registrarse encuentros; el podio se ingresa como corrección manual. No se introdujo una tabla genérica de puntos.

Una categoría incompleta, con empate pendiente, sin un tercer puesto definido en su llave o con bronces incompatibles permanece sin publicación automática. Un desajuste de bronces devuelve `bronze-mismatch` y se presenta para ajustar configuración o resultados. No se generan encuentros de tercer puesto ni repechajes adicionales.

## Prioridad y clasificación

Cada categoría tiene como máximo un conjunto automático y uno manual. Si existe corrección manual, reemplaza **todo** el podio automático de esa categoría. Nunca se suman ambos. Recalcular solo modifica el conjunto automático. Tanto eliminar la corrección como «Volver al resultado automático» quitan el conjunto manual y revelan el automático disponible.

Orden: oros descendente, platas descendente, bronces descendente y nombre alfabético (cultura española). Se muestran solo academias con medallas. Total = oro + plata + bronce; no se persisten agregados. Un podio cuya cantidad de bronces dejó de coincidir con la configuración aparece pendiente en gestión y no se incluye en clasificación, pantalla externa ni detalle exportado.

Los guardados usan transacción serializable, revisión optimista y `operationId` auditado y único por campeonato. Repetir la misma operación no duplica filas; reutilizar su identificador con otro contenido o actor se rechaza. Las correcciones guardan usuario y fecha.

## Persistencia

Migración: `20261030000100_AddMedalTables`.

| Tabla nueva | Contenido |
| --- | --- |
| `medal_table_settings` | Visibilidad, cantidad de bronces, revisión y último autor/fecha por evento |
| `medal_table_podiums` | Podio por evento/categoría/procedencia, autor y fecha |
| `medal_table_awards` | Competidor inscrito y medalla; oro/plata únicos por conjunto |
| `medal_table_audits` | Operación, actor, fecha y detalle JSON para auditoría/idempotencia |
| `medal_fixture_results` | Confirmación de un encuentro/planilla existente, total, decisión de desempate, versión y auditoría |

Se reutilizan `event`, `event_organizers`, `academy`, `category_event`, `category_competitor`, `competitor`, personas/equipos y ambos modelos existentes de fixtures/resultados. Se agregan claves alternativas a inscripciones, competidores y fixtures para las FK compuestas. Una medalla exige tanto inscripción en el evento/categoría como pertenencia del competidor al evento. La confirmación de un fixture exige además que encuentro, versión y campeonato coincidan.

Las tablas nuevas comienzan vacías. La migración no borra ni reemplaza registros existentes. Incluye Down y metadatos del snapshot. No se ejecutó la migración en ninguna base de producción.

## API

Base: `/api/medal-tables`. Salvo `GET /{evento}/display`, todas las operaciones exigen autenticación; recursos por evento usan `EventOrganizerAccess` y la autorización de academias existente. El listado filtra sus resultados con esa misma política. La identidad del actor procede de los claims y se verifica el ámbito con los datos del servidor.

| Método y ruta relativa | Capacidad |
| --- | --- |
| `GET /events` | Campeonatos accesibles |
| `GET /{evento}` | Gestión, inscritos, categorías, podios y clasificación |
| `GET /{evento}/display` | Lectura externa, pública solo si está habilitada |
| `PUT /{evento}/configuration` | Visibilidad y bronces |
| `PUT /{evento}/categories/{categoria}/manual` | Guardar/reemplazar corrección completa |
| `DELETE /{evento}/categories/{categoria}/manual` | Quitar corrección y revelar automático |
| `POST /{evento}/categories/{categoria}/restore-automatic` | Acción explícita de retorno al automático |
| `POST /{evento}/synchronize` | Recalcular desde resultados oficiales disponibles |
| `GET /{evento}/backup` | Respaldo del módulo |
| `POST /{evento}/restore` | Restauración validada y transaccional |
| `POST /{evento}/clear-manual` | Limpiar correcciones solo del evento seleccionado |
| `PUT /{evento}/clubs/{academia}` | Actualizar nombre, comuna y logo maestros |
| `GET /{evento}/categories/{categoria}/fixture-results` | Confirmaciones de la versión vigente |
| `POST /{evento}/categories/{categoria}/fixtures/{encuentro}/result` | Confirmar resultado del encuentro/planilla |

Las mutaciones del medallero requieren `operationId` y `expectedRevision`. La confirmación deportiva requiere `operationId` y `expectedVersion` del resultado. Se devuelven errores 401/403 de acceso, 409 de concurrencia/idempotencia y 422 de referencias o podios inválidos. Las respuestas usan `ApiResponder`. Las lecturas del módulo tienen `Cache-Control: no-store`.

## Respaldo JSON

Formato versión 1:

```json
{
  "formatVersion": 1,
  "eventId": 10,
  "exportedAt": "2026-10-30T20:00:00Z",
  "revision": 4,
  "isPublic": false,
  "bronzeCount": 1,
  "podiums": [{
    "categoryId": 20,
    "awards": [
      { "competitorId": 101, "medal": "gold" },
      { "competitorId": 102, "medal": "silver" },
      { "competitorId": 103, "medal": "bronze" }
    ]
  }]
}
```

`podiums` contiene correcciones manuales. Los resultados deportivos oficiales y los maestros pertenecen a los módulos existentes: no se sobrescriben restaurando un respaldo del medallero; los automáticos se reconstruyen desde esas fuentes. El formato del prototipo con catálogos propios no se importa.

La copia local está separada por usuario y evento. Al exportarla se añade `localCopy: true` y `lastServerConfirmedAt`, conservando la revisión de la última copia obtenida; no se presenta como estado actual confirmado. No hay escritura offline ni cola nueva de cambios. Restaurar exige conexión, autorización, versión de formato compatible, campeonato coincidente e inscripciones válidas. Se valida todo el respaldo antes de reemplazar las correcciones. No se escriben archivos JSON como persistencia del servidor.

## Validación realizada

- Backend del medallero: 17 pruebas correctas, incluyendo prioridad manual, idempotencia, ámbito de organizador/coorganizador/admin, visibilidad, referencias cruzadas, restauración rechazada sin reemplazo parcial, extracción desde fixtures, avance sobre un encuentro existente y empate de Kata pendiente del operador.
- Se generó el SQL de la migración usando el proveedor MySQL 8 sin conexión y se comprobaron sus FK y carácter aditivo.
- Navegador Chrome Headless: 3 pruebas correctas (XLSX, exportación JSON al perder conexión y separación de copia local).
- TypeScript y plantillas Angular: compilación correcta.
- Compilación de producción frontend y verificación SEO: correctas, con salida en `.medal-validation/dist`.
- Escritorio: `dotnet build scoreboard.bte.csproj --no-restore`, correcto con advertencias existentes.
- Suite completa del backend: 670 correctas y 1 fallida de 671. La falla aislada es `StudentUpdateTests.SharedFormPayloadDeserializesAndValidatesWithoutLegacyContactFields`: `RangeAttribute` intenta convertir `0.01` a decimal con la cultura del entorno. No pertenece al medallero y no se modificaron esos archivos para ocultar la falla.

Pendiente de verificación integral: aplicación de Up/Down en MySQL 8 local con un esquema representativo, atomicidad y concurrencia reales del motor, dos equipos conectados y revisión visual de pantallas/PDF. Docker no pudo iniciar las pruebas de base porque su daemon no está disponible. Las pruebas InMemory no sustituyen estas comprobaciones. No se conectó una base productiva para validar.

## Aplicar y revertir en desarrollo

1. Crear respaldo de la base de **desarrollo**, de Assets y de los archivos modificados antes de aplicar el esquema.
2. Configurar `ConnectionStrings__bteConnection` con la conexión de desarrollo. La factoría EF acepta variables de entorno y usa MySQL 8 explícito, sin autodetectar conectándose a una base.
3. Desde `backend-production`, generar y revisar el script: `dotnet ef migrations script <migracion-anterior> 20261030000100_AddMedalTables --context BteV1Context --output medallero-up.sql`. No usar una conexión productiva.
4. Aplicar en desarrollo: `dotnet ef database update 20261030000100_AddMedalTables --context BteV1Context`. Iniciar la API local con su configuración existente y apuntar el frontend/escritorio a esa API para la prueba integral. No cambiar el entorno productivo.
5. Compilar frontend con `node _script/build-production.cjs --output-path .medal-validation/dist`; compilar API/escritorio con los proyectos existentes. El script conserva su base de publicación configurada actualmente (`/app/`); no se cambió por asumir que debía publicarse en otra ruta.
6. El escritorio ya tiene aplicado el cambio en la carpeta indicada por el usuario. Los originales de `MainViewModel.cs` y `MainWindow.xaml` están en `desktop-integration/backup-20261031-020147` (marca UTC). La fuente del panel y el script aplicado están en `desktop-integration`.

Para revertir en desarrollo: exportar primero los respaldos necesarios del módulo y conservar auditoría/resultados. Detener las aplicaciones locales; ejecutar `dotnet ef database update <migracion-anterior> --context BteV1Context` después de revisar Down. Esto elimina las cinco tablas nuevas y sus claves alternativas, sin borrar catálogos o resultados anteriores. Los datos guardados en las tablas nuevas deben recuperarse desde su respaldo si se reinstala el módulo. Las ediciones maestras realizadas por un operador no se revierten mediante Down; requieren el respaldo de los maestros/Assets.

Para revertir el escritorio, restaurar los dos archivos desde la carpeta de respaldo y retirar únicamente `Views/CategoryResultsWindow.cs`. Revertir los cambios de navegación/rutas y los archivos nuevos del frontend/backend conservando cualquier trabajo ajeno. No usar un reset general del repositorio: la copia de trabajo ya contenía numerosos archivos sin seguimiento antes de esta integración.

No se desplegó, reinició un servicio productivo ni ejecutó una migración en producción.
