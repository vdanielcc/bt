# F1 — Etapa 2: contadores de inscripciones

## Definiciones confirmadas por el usuario

| Contador API | Significado |
|---|---|
| `totalCompetitors` | Personas únicas con al menos una inscripción deportiva individual. No incluye integrantes de equipos sin inscripción individual. |
| `totalCoaches` | Personas únicas con al menos una categoría de coach. Una persona que también compite aparece una vez en ambos contadores. |
| `totalTeams` | Equipos distintos con al menos una inscripción deportiva. Un equipo en varias categorías cuenta una vez. |
| `totalRegistrations` | Participaciones deportivas por categoría: persona/categoría o equipo/categoría. Excluye categorías de coach. No multiplica una participación de equipo por sus integrantes. |

Ejemplo: una persona inscrita en kata y kumite y además como coach, otro coach
sin participación deportiva y un equipo en una categoría producen:
**1 deportista, 2 coaches, 1 equipo y 3 inscripciones deportivas**.

Los integrantes del equipo no aumentan el primer contador. Los deportistas se
identifican por `PersonId`, con `StudentId` como respaldo para datos históricos
sin identidad de persona disponible; nunca se agrupan por nombre.

Las relaciones históricas duplicadas de la misma persona/categoría o del mismo
equipo/categoría no aumentan el total de inscripciones. El total global se
calcula directamente y no sumando los totales por academia: ante una duplicación
histórica entre academias, esa suma puede contar la misma persona dos veces.

## Implementación

`RegistrationCountsService` concentra estas métricas. No calcula precios ni
reglas de competencia. Cuenta exclusivamente relaciones del evento solicitado
y permite limitar a una academia. Excluye registros sin categorías activas,
aunque tengan historial de cobro, y relaciones de otro evento.

La categoría de coach se reconoce por el criterio ya existente del motor:
nombre de categoría que contiene `COACH`, o nombre de modalidad `Coach`.
La modalidad se resuelve desde el catálogo; una modalidad histórica ausente no
debe eliminar la categoría del conjunto leído.

Se agregan los cuatro campos a:

- `GET /api/Events/detalle`, en la raíz y en cada academia.
- `GET /api/Events/academydetalle`, en la raíz y en la academia.
- Resumen propio y resumen del organizador en `PaymentsController`.
- `GET /api/events/{eventId}/pricing/summary`.
- Respuestas de `GuestsController`.

Se conserva `TotalCompetidores` como alias del contador corregido en las
respuestas antiguas de eventos. `TotalCategorias` sigue indicando categorías
disponibles del evento y no inscripciones realizadas.

Las entradas identifican `IsAthlete`, `IsCoach`, `IsTeam` cuando corresponde,
`SportingRegistrations` y `CoachRegistrations`. Las categorías del resumen
financiero incluyen modalidad y clasificación de coach.

`Guests.TotalStudents` se actualiza con el criterio individual durante las
operaciones que ya actualizaban ese registro. La consulta de un guest histórico
devuelve el conteo actual sin reescribir su fila ni sus importes.

## Frontend y exportaciones

- Componente compartido `RegistrationCountsComponent` con cuatro indicadores.
- Resumen general, detalle de academia seleccionada, resumen propio y revisión
  de pagos del organizador muestran los contadores oficiales de la API.
- Las filas distinguen deportista, coach, ambos roles y equipo.
- Las categorías deportivas y los registros de coach se presentan separados.
- Excel y PDF incorporan los cuatro indicadores; la cantidad por fila del Excel
  refleja participaciones deportivas.
- La etiqueta de modalidades prioriza el nombre de la API. Se corrigen los
  fallbacks de kata/kumite por equipo y equipos mixtos.
- Un campo ausente se presenta como no disponible, sin deducir personas únicas
  a partir de la cantidad de filas del frontend.

## Validación

**119 pruebas backend correctas, 0 fallidas, 0 omitidas**, mediante:

```powershell
dotnet test backend-production/tests/bte.api.Tests/bte.api.Tests.csproj --no-restore --filter 'FullyQualifiedName~RegistrationCountsTests|FullyQualifiedName~RegistrationPaymentTests|FullyQualifiedName~EventPricingTests|FullyQualifiedName~LegacyFinancialWriteHttpTests|FullyQualifiedName~EventEnrollmentTests|FullyQualifiedName~AcademyScopeTests|FullyQualifiedName~EventPricingConfigurationTests' --verbosity quiet -clp:ErrorsOnly
```

Cobertura añadida:

- Persona con varias categorías y condición simultánea de coach.
- Coach exclusivo registrado en más de una categoría.
- Equipos, integrantes y duplicados históricos de equipo/categoría.
- Identidad de persona repetida en registros históricos de estudiante.
- Ámbitos de evento y academia; relación inconsistente con otro evento.
- Evento vacío y cobro histórico sin inscripción activa.
- Paridad entre respuestas de eventos, academias, pagos y tarifas.
- Guest con conteo almacenado antiguo; importes e historial conservados.
- Clasificación por nombre de categoría o modalidad de coach.

Las nuevas pruebas usan EF InMemory aislado. No se ejecutaron contra MySQL
productivo. Se conservan las regresiones de pagos, inscripción, tarifas y el
cierre de rutas antiguas de la etapa 1.

**55 pruebas Angular correctas** en Chrome Headless, seleccionando:

- `registration-counts.component.spec.ts`.
- `registration-summary-export.spec.ts`.
- `registration-summary.component.spec.ts`.
- `event-summary.component.spec.ts`.
- `event-payment-review.component.spec.ts`.

La validación de tipos y plantillas Angular también pasó.

## Entrega

No requiere migración ni cambios de esquema. Las reglas tarifarias, importes,
estados de pagos y fixtures no se modifican en esta etapa.

Implementado y probado localmente. Pendiente publicar backend y frontend; no se
desplegó ni se alteraron datos de producción. La etapa 3 no se inició.
