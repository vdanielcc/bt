# Corrección final de estados de BillingCharge

> Evolución posterior: [ETAPA 9](academy-stage-9-results.md) incorpora pagos operativos y sustituye el saldo simplificado por el cálculo real desde allocations confirmadas. Se conserva la separación entre estado financiero y morosidad calculada.

Resultado: **AJUSTE DE ESTADOS DE BILLING_CHARGE COMPLETO**.

Verificación realizada sobre código local y MySQL 8 real en `athena_stage4_test`. No se publicó producción. ETAPA 9 no se desarrolló. Este informe sustituye la semántica de estados y vencimiento descrita en la entrega inicial de ETAPA 8.

## Auditoría inicial

| Componente | Estado inicial | Corrección aplicada |
|---|---|---|
| Estados financieros en servicio y CHECK | INCORRECTO | Retirar OVERDUE; admitir exclusivamente PENDING, PARTIAL, PAID y VOID |
| Lecturas de cargos | INCORRECTO | Eliminar RefreshOverdue y sus UPDATE; GET no cambia estado ni updated_at |
| DTO calculado | FALTANTE | Agregar isOverdue y effectiveStatus, sin columnas nuevas |
| Gracia del cargo | COMPLETO | Conservar grace_days como snapshot; no crear grace_days_snapshot duplicado |
| Monto, origen, período y vencimiento | COMPLETO | Conservar snapshots y fórmulas existentes; due_date no incorpora gracia |
| Zona horaria de Billing | INCORRECTO | Reutilizar IAcademyTimeZoneService y Academy → representante → Person.Country → TimeZone |
| Regla reusable de morosidad | PARCIAL | Una proyección central SQL en BillingChargeStateRules, utilizada por listados, totales y paneles |
| Paneles y perfil financiero anteriores | INCORRECTO | Sustituir comparaciones directas due_date < UTC por la condición central con gracia y fecha local |
| Saldo PENDING sin pagos | COMPLETO | Conservar total_amount calculado como amount-discount+surcharge |
| Saldo VOID y PAID | PARCIAL | Ambos devuelven saldo cobrable cero, tanto en servicio como en vista existente |
| Anulación e historial | PARCIAL | Únicamente PENDING → VOID; VOID terminal, sin borrado físico ni regeneración de la misma clave |
| Edición manual y automática | PARCIAL | Conservar validaciones; rechazar miembros JSON ajenos al contrato, incluidos origen, período y status |
| Generación mensual y PER_CLASS | COMPLETO | Conservar elegibilidad, snapshots, transacciones, locks e idempotencia; verificar regresión |
| Filtro y presentación Angular | INCORRECTO | Separar filtro de estado financiero de isOverdue; mostrar effectiveStatus del backend |
| Acciones Angular | PARCIAL | Editar/anular solamente PENDING, incluso si está vencido; VOID/PARTIAL/PAID históricos o de consulta |
| Pagos competitivos y fixtures oficiales | COMPLETO | Sin cambios de lógica; ejecutar regresión existente |

## Base de datos

Inspección previa: `billing_charges` estaba vacía; no había filas OVERDUE, pagos académicos ni allocations. El campo status era VARCHAR(20), default PENDING, y el CHECK admitía PENDING/PARTIAL/PAID/OVERDUE/VOID. `grace_days` ya era SMALLINT UNSIGNED snapshot. Los importes eran DECIMAL(12,2); due_date y referencias de origen ya existían. Total se calcula, no se agregó otra columna.

Se aplicó una sola vez el nuevo script [_script/bte_stage_8_charge_state_corrections.sql](../_script/bte_stage_8_charge_state_corrections.sql), exclusivamente en la réplica. No se reejecutó ninguna migración de etapas anteriores ni se recrearon tablas.

El script audita valores inesperados y se detiene si un OVERDUE tiene cualquier allocation, sin presumir PENDING. Solo convierte OVERDUE sin allocations a PENDING, conservando importes, due_date, gracia y origen. Después restringe el CHECK a los cuatro estados financieros y actualiza el comentario. En esta réplica se convirtieron **cero filas**, porque no existían cargos. La vista `vw_student_billing_balance` conserva su contrato y suma de asignaciones confirmadas; su balance ahora devuelve cero para VOID/PAID.

Respaldo previo: `/root/bte-charge-state/before-charge-state.sql`.

- SHA256 respaldo: `e2fcf750ac2dc9415fa2fa83384abce51deddfceef9034204d38769f02c486ee`.
- SHA256 script local y ejecutado: `5801f9973be7af59989d11efad56b5af53482e7ad406bd095ccb87db82a06894`.

Para una publicación posterior, realizar respaldo y detener escritores de cargos durante esta migración; MySQL DDL tiene commit implícito. Las filas OVERDUE con allocations requieren auditoría antes de ejecutar la corrección. La rama de conversión de datos legacy está preparada, pero no se ejerció sobre filas reales porque la réplica estaba vacía.

El CHECK final se consultó en information_schema y se probó con un UPDATE directo inválido: MySQL rechazó OVERDUE con error 3819. Al terminar las pruebas, cargos, planes, clases, asistencia, pagos y allocations temporales quedaron en cero, como al inicio. Los borrados de limpieza pertenecen exclusivamente a fixtures de prueba; no existe endpoint de borrado físico de cargos de negocio.

## Backend

La entidad y los snapshots se conservan. `BillingChargeRead` expone status, effectiveStatus, isOverdue y balance. `BillingChargeQuery` incorpora `bool? IsOverdue`; status=OVERDUE se rechaza con validación 422. Los contratos de creación y edición rechazan miembros JSON desconocidos, por lo que no aceptan status ni cambios de origen ocultos en el body.

La única regla, en `BillingChargeStateRules.Project`, es:

```text
status != VOID && status != PAID && balance > 0
&& due_date != null
&& academyLocalDate > due_date + grace_days
```

Se compone como expresión traducible por EF/MySQL antes de filtros, agregaciones y paginación. Cada academia resuelve su fecha con el servicio horario existente; no hay nueva configuración Billing ni una zona global para todas las academias. Se retiró la escritura temporal de OVERDUE del servicio principal y de la rutina financiera académica preexistente.

Prioridad efectiva: VOID → PAID → OVERDUE cuando isOverdue → PARTIAL → PENDING. No se persiste effectiveStatus. Sin fecha o sin saldo positivo, no hay morosidad. VOID y PAID tienen balance cero. La lectura conserva compatibilidad con allocations confirmadas ya existentes, sin añadir pagos ni workflows de ETAPA 9.

`BillingChargeService`, `AcademyManagementController`, `AcademyInsightsController` y `RoleDashboardsController` utilizan esa proyección para morosidad. Los endpoints de cargos conservan rutas y autorización. Los consumidores de academia y alumno mantienen su ámbito antes de resolver fechas y consultar saldos.

Edición: manual PENDING permite descripción, monto, descuento, recargo y vencimiento. Automático PENDING conserva monto base y origen; permite descripción, descuento, recargo y vencimiento. Se validan importes no negativos, dos decimales, total no negativo y rango de fecha/gracia. PARTIAL, PAID, VOID o cargos con allocations no admiten edición/anulación ordinaria. Un automático incorrecto se anula conservando historial; cambiar plan/período/origen no está permitido. La misma clave de generación anulada no se revive ni duplica.

## Frontend

- Cargos muestra effectiveStatus recibido; el detalle muestra además el estado financiero cuando difiere.
- El filtro Estado ofrece los cuatro estados financieros. El filtro Vencimiento envía isOverdue=true para Vencidos; no envía status=OVERDUE.
- No se calcula morosidad en Angular ni se introduce selección editable de estado, marcar pagado o marcar parcial.
- Editar y Anular dependen del estado persistido PENDING; un PENDING vencido conserva ambas acciones.
- VOID mantiene detalle e historial y oculta acciones de mutación.
- Morosidad y perfil financiero consumen los cálculos del backend. Se retiró OVERDUE de la selección por estado del consumidor académico de asignaciones preexistente, sin desarrollar nuevos pagos.

## Pruebas y escenarios

| Escenario | Resultado |
|---|---|
| PENDING con vencimiento futuro | OK: isOverdue=false, effectiveStatus=PENDING |
| PENDING vencido con saldo | OK: permanece PENDING en BD; effectiveStatus=OVERDUE |
| Due 2026-10-05, gracia 3, fecha local 08 | OK: no moroso |
| Mismo cargo, fecha local 09 | OK: moroso |
| Sin vencimiento o con saldo cero | OK: nunca moroso |
| VOID vencido | OK: balance=0, isOverdue=false, effectiveStatus=VOID |
| PAID histórico vencido | OK: balance=0, isOverdue=false, effectiveStatus=PAID |
| PARTIAL vigente / vencido | OK: prioridad PARTIAL / OVERDUE sin modificar estado financiero |
| Plan cambia gracia 3 a valor posterior | OK: cargo conserva gracia 3 |
| Plan cambia monto 35000 a 40000 | OK: cargo conserva 35000 y descripción/origen/vencimiento |
| Automático intenta cambiar monto | OK: rechazo de negocio |
| PUT intenta billingPlanId/referencePeriod/status/concepto | OK: contrato JSON rechaza el campo |
| PENDING vencido editable y anulable | OK; la morosidad no cambia el estado financiero |
| PENDING → VOID, posterior edición/anulación | OK: anulación inicial; operaciones posteriores rechazadas |
| GET y agregados | OK: no cambian status ni updated_at |
| Perú y Chile con fechas locales distintas | OK: una consulta de varias academias filtra con la fecha de cada país |
| Filtro isOverdue y resumen SQL | OK: filtra antes de paginar; montos y días incluyen gracia |
| Angular recibe OVERDUE con fecha futura deliberada | OK: muestra el valor del backend, sin fórmula local |
| Concurrencia mensual y PER_CLASS | OK: una generación por clave; sin duplicados |
| VOID y repetición del generador | OK: se conserva historial y no se recrea el cargo |
| UPDATE directo status=OVERDUE | OK: CHECK MySQL lo rechaza |

Backend completo: **489/489**. Angular ChromeHeadless: **377/377**. MySQL ETAPA 8 ampliada: **36/36**. MySQL ETAPA 7: **18/18**. MySQL ETAPA 6: **21/21**.

Las suites backend y Angular completas incluyen regresión de modalidades, salas, instructores, clases, horarios, enrollments, sesiones, asistencia, planes y cargos. También incluyen los tests existentes de eventos, categorías, competidores/inscripciones, teams, brackets/fixtures, resultados/scoreboard y pagos competitivos legacy. Resultado de regresión ETAPAS 1–8: **OK**. Regresión de eventos: **OK en las pruebas automatizadas existentes**; no equivale a una sesión manual en producción ni a una auditoría nueva de TicketFactor.

## Builds y evidencias

Backend restore, build, test y publish: **OK**. Frontend npm run build, verificación SEO, tests y empaquetado: **OK**. Permanecen advertencias preexistentes de compilación y dependencias CommonJS; no hay errores de build.

Evidencia local:

- `charge-state-restore.log`, `charge-state-backend-build.log`, `charge-state-backend-tests.log`.
- `charge-state-backend-publish.log`, `charge-state-mysql-publish.log`.
- `charge-state-frontend-build.log`, `charge-state-frontend-tests.log`, `charge-state-package.log`.

Evidencia en réplica:

- `/root/bte-charge-state/stage8-results.log`.
- `/root/bte-charge-state/stage7-regression.log`.
- `/root/bte-charge-state/stage6-regression.log`.

Entrega local: `release/charge-state-backend/` y `entregables/bte-frontend-app-20261018-estados-cargos.zip`, preparado para `/bte/`. SHA256 de bte.api.dll, coincidente con el binario probado en réplica: `5919120fea8650ea2a0a699e4e9a130f48562d98a53a97810b531cfa6d32af5b`.

SHA256 frontend: `b4317e2d3f91835fce225b11d73de119f16a6ad0223b25aa93c007ec4c79a699`. El empaquetador verificó scripts, estilos, fuentes, iconos y manifest para `/bte/`.

## Preparación documental de ETAPA 9

Estados futuros determinados exclusivamente por backend a partir de asignaciones confirmadas: balance==total → PENDING; 0<balance<total → PARTIAL; balance==0 → PAID. Transiciones previstas: PENDING→PARTIAL/PAID y PARTIAL→PAID/PENDING. VOID permanece terminal. Estos casos se documentan; esta entrega no añade endpoints ni tablas ni flujos de pagos, comprobantes, refunds o conciliación.
