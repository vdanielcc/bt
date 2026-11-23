# F1 — Etapa 1: cierre de escrituras antiguas

## Alcance

Primera etapa del listado de pendientes principales de la auditoría F1:
cerrar los caminos antiguos que omiten validaciones financieras.

Se retiran las escrituras directas de pagos de eventos y competidores. Las
rutas permanecen identificables, pero devuelven HTTP `410 Gone` a un usuario
autorizado, con `estado: error`, `codigo: 410` y un mensaje que indica el flujo
vigente. No hay excepción para el administrador global.

| Ruta retirada | Flujo vigente |
|---|---|
| `POST /api/Payments` | `POST /api/Payments/transfer`, multipart con comprobantes, RequestId y lote cuando corresponda |
| `POST /api/Competitors` | `POST /api/Competitors/enroll` o `POST /api/Competitors/enroll-team` |
| `PUT /api/Competitors/{id}` | Los mismos endpoints de inscripción para actualizar categorías |

Los endpoints conservan sus contratos de entrada para identificar las llamadas
antiguas. Un cuerpo no válido todavía puede recibir `400` del model binding de
ASP.NET Core antes de alcanzar la acción. Se mantienen autenticación y ámbito
de academia: una solicitud anónima recibe `401`; un usuario autenticado sin
permiso sobre el recurso recibe `403`. El `410` se devuelve después de esos
controles, sin consultas ni escrituras desde las acciones retiradas.

## Motivo

La creación antigua de pagos aceptaba importe y rutas de comprobantes enviados
por el cliente sin pasar por las validaciones de carga, tarifas, lotes e
idempotencia. Las escrituras de la entidad Competitor permitían modificar
identidad, academia, evento y TicketFactor fuera de la inscripción validada,
especialmente en eventos legacy sin snapshot tarifario.

Se opta por retirar esos contratos porque no contienen la información necesaria
para delegar con seguridad: rutas arbitrarias de archivos no equivalen a una
carga autenticada de comprobantes; una entidad de competidor no representa una
solicitud de inscripción individual o de equipo.

## Consumidores y compatibilidad

La búsqueda en el frontend actual no encontró consumidores de las tres
escrituras retiradas. Los servicios existentes utilizan `/Payments/transfer`,
`/Competitors/enroll` y `/Competitors/enroll-team`. Se conservan las consultas de
competidores y pagos. Los clientes externos que usen las rutas retiradas deberán
migrar a los contratos vigentes; la respuesta `410` indica el destino.

Esta etapa no modifica reglas monetarias, conteos, plazos, exportaciones ni
conciliación. No requiere cambios de frontend ni migración de base de datos.
Los cobros de academias (`billing-payments`) son un flujo diferente y no se
retiran.

## Archivos

- `backend-production/bte.api.Controllers/PaymentsController.cs`.
- `backend-production/bte.api.Controllers/CompetitorsController.cs`.
- `backend-production/tests/bte.api.Tests/LegacyFinancialWriteHttpTests.cs`.

## Validación

Se ejecutaron **113 pruebas: 113 correctas, 0 fallidas, 0 omitidas**.

Filtro de ejecución:

```powershell
dotnet test backend-production/tests/bte.api.Tests/bte.api.Tests.csproj --no-restore --filter 'FullyQualifiedName~LegacyFinancialWriteHttpTests|FullyQualifiedName~RegistrationPaymentTests|FullyQualifiedName~EventEnrollmentTests|FullyQualifiedName~AcademyScopeTests|FullyQualifiedName~EventPricingTests|FullyQualifiedName~EventPricingConfigurationTests' --verbosity quiet -clp:ErrorsOnly
```

Las 7 pruebas HTTP nuevas usan Kestrel local, JWT firmados con una clave de
prueba aleatoria, validación JWT y el filtro de ámbito de academia productivos.
La persistencia es EF InMemory aislada; no se accede a producción.

Se verifican:

- `410` para administrador y administrador de la academia propietaria.
- Rechazo de importes negativos, cero o positivos por la ruta retirada.
- Imposibilidad de registrar rutas arbitrarias o forzar aprobación.
- `401` sin autenticación y `403` para otra academia o instructor.
- Imposibilidad de sobrescribir identidad, evento, academia y TicketFactor.
- Conservación de pagos aprobados, inscripciones y totales existentes.
- Cero intentos de `SaveChanges`, mediante interceptor armado después del seed.
- Regresiones existentes de carga/revisión de pagos, tarifas, inscripción y
  autorización.

La base de prueba incluye un pago aprobado y un competidor legacy sin snapshot
ni regla activa, para cubrir el escenario que antes dejaba disponible la
escritura directa. Estas pruebas no sustituyen una prueba de MySQL para
operaciones financieras que sí persisten; las rutas retiradas no ejecutan
operaciones de persistencia.

## Publicación

Cambios preparados y probados localmente. Esta etapa no publicó binarios,
reinició servicios ni alteró la base productiva. La etapa 2 queda pendiente.
