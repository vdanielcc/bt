# Motor de precios por evento — BTE

Implementación del 21 de septiembre de 2026. Backend activo: `D:/budodev/bte/src/2025/API`. Frontend: `D:/budodev/bte/2026/BTE/FRONT/bte`.

## 1. Análisis inicial

El frontend utiliza Angular 17, componentes standalone, Angular Material/Vex, formularios reactivos y `unwrapApiResponse`. Se reutilizó esa interfaz existente sin agregar Bootstrap ni otra librería visual.

La API utiliza .NET 8, EF Core, Pomelo y `BteV1Context` con configuración parcial. Los nombres reales encontrados son `event`, `category`, `category_event`, `modality`, `competitor`, `category_competitor`, `ticket_factor`, `guests` y `payment`. Se revisaron los modelos y configuraciones de equipos y miembros; un equipo se inscribe mediante un `Competitor` con `TeamId`. No se modificó la asociación deportiva ni el Scoreboard.

Dependencias encontradas:

| Ubicación | Uso previo y tratamiento |
| --- | --- |
| `CompetitorsController` | Inscripción individual, equipos, masiva y cancelación. Conserva TicketFactor como dato legacy e incorpora snapshots dentro de la transacción. |
| `RegistrationPricingService` | Tarifa y preventa legacy, con `RegistrationPricing.IsLocked`. Se conserva para su contrato legacy; rechaza su uso con reglas nuevas para evitar importes incorrectos. Los flujos actuales de inscripción y reporte utilizan `EventPricingService`. |
| `PaymentsController.Registration` | Calculaba importes desde TicketFactor. Ahora obtiene importes centralizados, con prioridad al snapshot. |
| `EventsController` | Dos reportes calculaban valores por factor. Ahora consultan snapshots o compatibilidad legacy; se separan categorías deportivas, unidades y modo tarifario. |
| `GuestsController` | Cache de totales por academia. Usa el mismo servicio y conserva decimales. |
| DTO y UI de eventos | `FeeTicket` y la tabla informativa de TicketFactor se conservan. |
| `Category.IsFree` | Propiedad global existente; no se usa para determinar gratuidad en el motor nuevo. |

## 2–6. Persistencia y modelos

Tablas nuevas: `pricing_calculation_types`, `event_price_rules`, `event_price_groups`, `event_category_pricing`, `event_modality_pricing`, `competitor_charges`.

Script: `Scripts/20260921_event_pricing_engine.sql`, en el backend. SQL independiente para MySQL 8.0.16+, InnoDB y `utf8mb4_spanish_ci`; no se generaron migraciones EF. Los únicos seeds son `BY_CATEGORY` y `BY_GROUP`.

La única modificación estructural de una tabla existente es `guests.total_tickets`: de entero a `DECIMAL(18,2)`, necesaria para no truncar la suma de cargos decimales. Se actualizaron modelo, configuración EF y DTO asociados. Las transferencias siguen usando su contrato CLP de pesos enteros.

Las relaciones a datos deportivos se conservan. Los cobros usan FK con `RESTRICT` para proteger el historial. Una FK compuesta impide asociar una categoría tarifaria a un grupo de otra regla. Índices únicos con columnas generadas garantizan una regla activa por evento, un grupo base activo por regla y un snapshot actual por competidor. No hay eliminación de TicketFactor ni conversión automática de eventos existentes.

Modelos creados en `Models/EventPricingModels.cs`: `PricingCalculationType`, `EventPriceRule`, `EventPriceGroup`, `EventCategoryPricing`, `EventModalityPricing`, `CompetitorCharge`, con propiedades de navegación y colecciones inversas. Mapeo en `Models/BteV1Context.EventPricing.cs`, invocado desde el parcial existente. Incluye nombres SQL, precisión, JSON, FK, índices, collation y columnas calculadas.

## 7–9. Contratos, servicios y endpoints

DTO en `DTO/EventPricing/EventPricingDto.cs`: configuración completa, regla, catálogo, grupos, categorías, modalidades, selección, resultado, detalle por categoría/grupo, opciones y snapshot. `Mapping/EventPricingProfile.cs` integra los contratos con AutoMapper. El backend registra los servicios en `Program.cs`.

`IEventPricingService` / `EventPricingService`: previsualización sin persistencia, cálculo, confirmación, protección de cambios y lectura de importes de reportes. `EventPricingConfigurationService`: valida y guarda una configuración completa de forma atómica, con auditoría mediante `IRequestLogService`.

Base de endpoints: `/api/events/{eventId}/pricing`.

| Método | Sufijo | Función |
| --- | --- | --- |
| GET / POST | raíz | Leer configuración / crear regla |
| PUT / DELETE | `/{ruleId}` | Actualizar / desactivar regla |
| GET / POST | `/groups` | Leer / crear grupos |
| PUT / DELETE | `/groups/{groupId}` | Actualizar / desactivar grupo |
| GET / PUT | `/categories` | Leer / guardar asignaciones |
| GET / PUT | `/modalities` | Leer / guardar gratuidad por modalidad |
| POST | `/calculate` | Simular sin persistir |
| GET | `/summary` | Indicadores calculados del evento |

Detalle de snapshot: `GET /api/events/{eventId}/competitors/{competitorId}/charge`.

La selección admite `categoryIds`, `competitorId` opcional, `studentId` opcional y `registrationType` para la compatibilidad legacy. La identidad del estudiante se autoriza y se resuelve al competidor existente; una selección sin cambios devuelve el snapshot confirmado, aunque la tarifa actual haya cambiado.

JWT y `IAcademyAuthorizationService` se reutilizan: sólo el administrador global o quien administra la academia organizadora modifica reglas. Quien inscribe puede cotizar; el detalle financiero se restringe a la academia del competidor o al organizador. Los errores de dominio conservan los HTTP 400/403/404/409/422 mediante el middleware existente, con pruebas específicas.

## 10–11. Inscripciones y compatibilidad

Inscripción individual, equipos y masiva guardan sus categorías deportivas, calculan el importe y persisten el snapshot antes del commit. La cancelación crea un snapshot de cero y conserva al competidor cuando tiene historial. Un fallo revierte la transacción. Los endpoints genéricos de entidades no permiten saltarse el flujo tarifario de eventos con motor.

La configuración y las inscripciones serializan cambios mediante bloqueo de la fila del evento (`FOR UPDATE`). Las transferencias y el endpoint de pago legacy toman ese mismo bloqueo. Los índices únicos constituyen la defensa adicional ante concurrencia. Una confirmación repetida con las mismas categorías no crea otro snapshot ni aplica precios nuevos.

`competitor_charges.is_current` es el único campo funcional adicional al diseño solicitado: permite sustituir el cobro vigente sin sobrescribir sus importes ni su JSON histórico. El ID identifica cada revisión; no se añadieron status, payment_id ni superseded_by porque las transferencias actuales se asocian a la academia/evento y no se distribuyen por competidor.

Cambiar categorías antes de tener pagos crea un nuevo snapshot y marca el anterior como no actual. Con cualquier transferencia asociada a la academia/evento, o un precio legacy bloqueado, se rechaza el cambio con 409: requiere un flujo explícito de ajuste. La configuración posterior nunca recalcula los cargos existentes.

Un evento sin regla activa usa TicketFactor. La excepción Coach se conserva exclusivamente dentro de la compatibilidad legacy. El motor nuevo no reconoce nombres especiales de categorías ni modalidades. No se permite activar automáticamente el motor sobre inscripciones legacy pendientes de revisión, ni desactivarlo para volver a legacy cuando ya tiene historial de cargos.

Los reportes priorizan el snapshot actual; después los importes legacy bloqueados; finalmente las tarifas legacy si el evento no tiene regla activa. Un cargo ausente bajo el motor se muestra incompleto, no como una tarifa legacy válida. El monto calculado se diferencia del pagado/aprobado.

## 12–15. Angular y validaciones

Archivos nuevos en `src/app/pages/championships/pricing`:

- `event-pricing.models.ts`: contratos tipados, sin `any`.
- `event-pricing.service.ts`: configuración, CRUD, simulación, snapshots y resumen.
- `event-pricing.component.ts/html`: formulario, grupos, modalidades gratuitas, asignación de categorías y simulador.
- `price-detail.component.ts`: categorías, gratuidad, unidades e importes devueltos por la API.
- `enrollment-price-preview.component.ts`: debounce, cancelación de solicitudes anteriores y bloqueo de confirmación mientras no exista una cotización válida.
- `pricing-summary-card.component.ts`: indicadores para el organizador.
- `competitor-charge.component.ts`: consulta del cobro histórico desde el resumen de pagos.
- `event-pricing.spec.ts`: validaciones, requests HTTP, simulación y cancelación de cotizaciones obsoletas.

Rutas: `/admin/events/:eventId/pricing` y `/campeonatos/mis-eventos/:eventId/tarifas`. Se enlazan desde administración de eventos y resumen del organizador. El diálogo existente de inscripción muestra la cotización antes de guardar. Se amplió el resumen de pagos para consultar el detalle del snapshot.

Angular no calcula precios. Los valores de requests son numéricos; se presentan en formato CLP. Se valida tanto en cliente como en API: precios no negativos, hasta dos decimales, pertenencia al evento, asignación a una sola regla/grupo, grupos activos, categorías cobrables con grupo y un máximo de un grupo base activo. Una modalidad gratuita prevalece sobre la configuración de su categoría.

En BY_GROUP se elige entre los grupos efectivamente inscritos: primero el marcado base, luego `group_order`, luego ID. Si el grupo marcado base no está inscrito, el primer grupo participante ocupa esa posición. Los adicionales usan el precio propio del grupo o, si es null, la tarifa general. En el detalle se atribuye el importe del grupo a una sola categoría para no duplicar el total.

## 16–19. Validación ejecutada

Resultados definitivos registrados al cierre de la implementación:

- `dotnet restore`: correcto en el backend activo.
- `dotnet build`: correcto, 0 errores; persisten advertencias del proyecto.
- `dotnet test`: 180 correctas, 0 fallidas, en el backend activo. Registro: `.tmp/pricing-backend-final-tests.log` del frontend.
- `npm install --ignore-scripts --no-audit --no-fund`: correcto, dependencias al día; no se añadieron librerías.
- `npx ngc -p tsconfig.app.json`: correcto.
- `npm run build -- --output-path .tmp/event-pricing-build`: correcto, artefacto de producción generado.
- Pruebas Angular relevantes en ChromeHeadless: 29 correctas, 0 fallidas.
- `npm run lint`: no ejecutable; el `package.json` tiene el comando pero `angular.json` no define target lint. No se instaló un linter adicional.

Las pruebas incluyen los casos solicitados, selección vacía/duplicada, orden determinista, grupo base ausente, precio propio del adicional, modalidades/categorías gratuitas, grupo sin configurar, duplicidad activa, grupo ajeno, mapeo de IDs temporales, decimales, bloqueo por pago, preservación de snapshots y autorización de la academia organizadora, códigos HTTP de negocio y cotización de deportistas compartidos sin acceso a cobros de otras academias.

| Escenario | Esperado | Resultado de prueba |
| --- | ---: | ---: |
| BY_CATEGORY 1 categoría | $20.000 | $20.000 |
| BY_CATEGORY 2 categorías | $30.000 | $30.000 |
| BY_CATEGORY 3 categorías | $40.000 | $40.000 |
| BY_GROUP Kata + Kumite mismo grupo | $20.000 | $20.000 |
| BY_GROUP Junior + Sub21 | $30.000 | $30.000 |
| Para-Karate únicamente FREE | $0 | $0 |
| Para-Karate FREE + Junior | $20.000 | $20.000 |
| Para-Karate FREE + Junior Kata/Kumite BY_GROUP | $20.000 | $20.000 |
| Para-Karate FREE + Junior Kata/Kumite BY_CATEGORY | $30.000 | $30.000 |
| Grupo adicional con precio propio de $15.000 | $35.000 | $35.000 |

## 20. Despliegue productivo y límites

MySQL y el backend se publicaron el 21/09/2026 a las 21:07 de Chile (22/09/2026 00:07:21 UTC). El servicio quedó activo. Carrusel con Origin y X-FRONT, Swagger, consulta autenticada de tarifas y resumen respondieron 200; la consulta sin autenticación respondió 401. Los eventos existentes mantienen compatibilidad legacy.

Respaldos completos verificados: `/opt/bte-api/backups/pricing-production-20260921-211500`. El respaldo anterior al primer intento permanece en `/opt/bte-api/backups/pricing-production-20260921-150845`. Se conservaron conteos e importes existentes. El primer intento creó dos tablas vacías y se detuvo por una FK incompatible con columnas generadas. Se corrigió la relación de grupos a RESTRICT en SQL y EF, se recompiló y pasaron nuevamente las 180 pruebas. La continuación completó las cuatro tablas pendientes sin borrar las existentes. La tabla real modificada es `guests`, en plural.

Las pruebas locales usan EF en memoria con `BTE_TEST_MYSQL_CONNECTION` deshabilitado. Quedan pendientes pruebas relacionales de concurrencia en MySQL aislado. No se ejecutaron pruebas de integración ni se crearon datos ficticios en producción.

Frontend compilado y ZIP validado: `release/pricing-production-20260921-150845/bte-frontend-pricing-production.zip`. No se publicó automáticamente. El informe `deployment-report.json` y los hashes `sha256.json` están junto al ZIP.

El script debe aplicarse una sola vez, con respaldo verificado, antes de iniciar la API actualizada. MySQL DDL hace commits implícitos; si falla parcialmente, revisar el esquema antes de repetirlo. La nueva API consulta las tablas tarifarias también para resolver compatibilidad legacy, por lo que no debe desplegarse antes del SQL.

No existe todavía un flujo de ajustes/reembolsos por competidor: las modificaciones con pagos se rechazan explícitamente y preservan el historial. La activación de eventos ya inscritos requiere revisión/migración acordada; no se inventaron reglas para esos eventos. FLAT_RATE, BY_MODALITY, BY_TEAM y CUSTOM no se implementaron.

El backend local se aplicó mediante verificación de hashes y respaldo de los archivos anteriores en `.tmp/event-pricing-backend-originals` del frontend. En producción se preservaron los secretos, claves X-FRONT y la definición de systemd; el servicio se reinició durante el despliegue.
