# Integración del Medallero — análisis previo

Fecha: 2026-10-30. Registro del análisis inicial. La implementación y sus verificaciones actuales se describen en [la entrega](medallero-integracion.md).

## Fuentes revisadas

- Origen: `../../MEDALLERO/MedalleroOlimpico`.
- Destino frontend: `src/app`, Angular 17, Material y @vex.
- Destino backend: `backend-production`, fuente permanente recuperada según su README; .NET 8, EF Core 8, Pomelo/MySQL y migraciones existentes.

## Funcionalidad del origen

- `ManagementComponent` y `TournamentDialogComponent`: configuración, podios por categoría, edición/eliminación, clubes/logos, limpieza y respaldos.
- `TournamentStore`: estado, validación, clasificación y respaldo local. Orden oro/plata/bronce/nombre; solo clubes con medallas. Bronces configurables de 1 a 10.
- `MedalTableComponent`: pantalla externa, líder, totales, logos y pantalla completa.
- `ReportExportService`: Excel con ExcelJS y PDF con jsPDF/AutoTable, con marca y detalle por categoría.
- API original: contexto SQLite, torneo único, importación de catálogos y espejo JSON. Estas decisiones de persistencia no se trasladarán.
- La comunicación por evento `storage` del original funciona entre ventanas del mismo navegador, no entre equipos.

## Entidades y mecanismos reutilizables

- `Event`, `EventOrganizer` y `EventOrganizerAccess`: organizador principal por academia y coorganizadores; autorización respaldada por `AcademyAuthorizationService`.
- `Academy`: club/dojo y logo maestro; `AcademiesController` ya almacena imágenes JPG/PNG en Assets (máximo 1 MB). La edición desde Medallero necesita validar ámbito del evento y limitar campos; no basta reutilizar una llamada sin autorización de recurso.
- `CategoryEvent`, `CategoryCompetitor`, `Competitor`, `Student/Person` y `Team`: catálogo, inscripción por evento/categoría, identidad y academia del participante.
- `CategoryResult`/`CategoryResultPosition`, `BracketVersionParticipant`: posiciones y medallas por categoría/versionado.
- `ScoreboardResult`, `MatchResult`, `CompetitionMatch`: resultados confirmados por combate. `ScoreboardService.ConfirmAsync` guarda estos resultados de forma transaccional y publica `ResultConfirmed`.
- `EventResultSnapshotService`: publicación histórica de resultados. No sustituye un medallero vivo ni las correcciones independientes.
- `Fixture`/`FixtureScore` y `FixtureVersion`/`FixtureMatch`: existen además otros modelos de llaves. No generar ni regenerar llaves al consultar el medallero.
- SignalR ya está instalado en ambos extremos; existe `/hubs/scoreboard`. El canal del medallero deberá revalidar acceso, especialmente al cambiar a privado.
- Navegación y acceso directo comparten `canAccessRoute`; añadir el módulo para perfiles autorizados no sustituye controles en backend.

## Decisiones confirmadas por el usuario

1. La edición de clubes/logos modifica datos maestros, sin personalizaciones por medallero.
2. Cada medallero comienza privado.
3. Agregar una acción explícita «Volver al resultado automático».
4. Actualización inmediata entre equipos mediante SignalR.
5. Resultados desde Scoreboard web o escritorio; selección manual exclusivamente entre inscritos en la categoría del campeonato. La academia procede del competidor, no de un club arbitrario enviado por el cliente.
6. Eliminar un podio manual elimina la corrección y muestra inmediatamente el resultado automático disponible. No se mantiene una exclusión de la categoría. La acción explícita «Volver al resultado automático» también estará disponible.
7. Scoreboard de escritorio vigente: `D:\budodev\bte\src\2025\ScoreBoard\scoreboard.bte`. La generación del podio todavía no existe y debe implementarse para web y escritorio según el desarrollo de cada categoría.

## Integración propuesta

- Módulo independiente por evento con selección de campeonatos autorizados, gestión @vex y pantalla externa de marca.
- Configuración propia por evento y correcciones separadas de resultados oficiales del Scoreboard. La corrección manual prevalece por categoría y nunca modifica la llave ni se suma con el automático que reemplaza.
- Totales calculados desde el resultado efectivo; no almacenar agregados paralelos.
- Persistir actor y fecha de cada operación; guardado transaccional y protección ante reintentos/concurrencia.
- API de lectura pública mínima, sujeta a visibilidad en cada consulta; gestión siempre autenticada y autorizada por evento.
- Respaldo JSON versionado con evento, fecha, configuración y correcciones; referencias a entidades existentes. Restauración validada y atómica, sin crear catálogos ni restaurar maestros compartidos por accidente.
- Copia local por usuario/evento para exportar JSON sin conexión, identificada como última información disponible. No implementar escritura offline ni colas.
- Migraciones aditivas MySQL 8 con relaciones e índices; no ejecutar en producción.

## Definiciones resueltas después del análisis

- Bronces según la llave/reglamento existente: definición por tercer puesto, semifinalistas, puntajes o repechaje. Un desajuste con la configuración exige alerta y ajuste de configuración o resultados.
- Empates pendientes de decisión del operador, por votación o nuevo encuentro.
- Publicación automática de podios completos; corrección manual posterior disponible.
- Round Robin pendiente del operador hasta incorporar reglamentos por federación/asociación en una etapa posterior.

## Implementación base

`MedalTableCalculation` resuelve un único podio efectivo por categoría con prioridad manual, sin mezclar medallas automáticas y manuales. Al quitar una corrección vuelve a utilizar el automático. Calcula clasificación por oro, plata, bronce y nombre (cultura española), excluyendo academias sin medallas; los totales son derivados. Rechaza entradas duplicadas, procedencia inválida y mezcla de eventos. No infiere podios deportivos ni valida inscripciones en base de datos: esa responsabilidad queda en el futuro servicio transaccional autorizado.

Se agregaron pruebas para prioridad manual ante recálculo, retorno al automático, clasificación, total, exclusión de clubes sin medallas y rechazo de entradas inconsistentes.

Validación ejecutada: `dotnet test tests/bte.api.Tests/bte.api.Tests.csproj --no-restore --filter FullyQualifiedName~MedalTableCalculationTests --verbosity quiet`, desde `backend-production`: 4 pruebas correctas, 0 fallidas. La compilación muestra advertencias preexistentes. No se ejecutaron migraciones ni pruebas contra producción.

## Verificación pendiente

La implementación posterior y los resultados actualizados de validación están en [medallero-integracion.md](medallero-integracion.md). Sigue pendiente la verificación integral contra MySQL 8 local y con dos equipos. No se modificó producción ni se ejecutaron migraciones.
