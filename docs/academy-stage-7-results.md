# ETAPA 7 — Planes / Membresías

Entrega del 17/10/2026 (America/Santiago). Implementación incremental sobre las tablas y rutas existentes. Validación en la réplica `athena_stage4_test`; esta entrega no publica cambios en producción.

## 1. Consolidación de ETAPA 6

La revisión confirmó que la implementación actual ya cumple las reglas definitivas:

- GET construye la nómina desde sesión, inscripción, estudiante y asistencia existente, sin crear filas.
- DTO con attendanceId/status/horas/notas null para alumnos aún sin registrar. No hay PENDING persistido ni estados nuevos.
- PUT único bulk, INSERT/UPDATE por sesión/alumno, transacción y control de versión. Solo IN_PROGRESS permite cambios.
- SCHEDULED permite vista previa; COMPLETED es histórico e inmutable; CANCELLED no genera ausencias ni participa en porcentajes.
- Cierre exige asistencia válida de todos los esperados; permite cero alumnos. Nuevas inscripciones afectan la nómina abierta; cambios posteriores no reconstruyen sesiones cerradas.
- Marcar todos presentes solo altera el formulario; Guardar persiste.
- `initialize` ya existía como preparación sin escrituras. Se conserva por compatibilidad; el registro operativo usa GET/PUT.
- Fórmula: (PRESENT + LATE) / (PRESENT + LATE + ABSENT), con EXCUSED separado y denominador cero tratado como null.

No fue necesario reescribir estas reglas. Se agregaron pruebas explícitas del GET SCHEDULED sin escrituras y de cambios de nómina antes/después del cierre. La regresión focalizada pasó 19/19 backend y 8/8 frontend; la regresión MySQL sobre el backend final pasó 21/21.

Limitación histórica conservada: no hay intervalos de pausa de las inscripciones; no se inventan períodos PAUSED pasados.

## 2. Auditoría inicial de ETAPA 7

Ver `docs/academy-stage-7-audit.md`, generado antes de implementar planes.

| Componente | BD | Backend | Frontend | Estado inicial |
|---|---|---|---|---|
| Catálogo billing_plans | EXISTE | Entity/DbSet y CRUD, validación incompleta | Listado/dialog incompletos | PARCIAL |
| class_billing_plans | EXISTE | Relación disponible, sin default transaccional ni protección de uso | Dialog sin tab operativo | PARCIAL |
| class_enrollments.billing_plan_id | EXISTE | Validación básica de plan y bloqueo de clase | Selector existente, sin default visual, columna condicional | PARCIAL |
| DTOs/servicio de planes | Tablas reutilizadas | FALTABA contrato de escritura seguro/servicio específico | Interfaces y servicios existentes | PARCIAL |
| Historial | updated_at; sin auditoría general encontrada | Inscripciones terminadas preservadas | Nombre de plan disponible | PARCIAL |

La inspección posterior de la réplica confirmó el esquema existente: billing_plans y class_billing_plans presentes, sin planes ni clases operativas de prueba al comenzar.

## 3. Base de datos

Script SQL First: `_script/bte_stage_7_billing_plans.sql`.

- Reutiliza billing_plans, class_billing_plans y class_enrollments.billing_plan_id; no recrea tablas.
- Mantiene DECIMAL(12,2), FK e índices existentes, PK compuesta (class_id,billing_plan_id) y el unique previo (academy_id,name).
- Agrega unique (academy_id,code) e índice (academy_id,is_active).
- Agrega `default_guard`, calculada como 1 cuando is_default=true y NULL en otro caso, y unique (class_id,default_guard). No cambia las FK de borrado en cascada de la relación existente.
- Agrega CHECK amount>0 y CHECK de vencimiento: MONTHLY exige día 1..28; PER_CLASS/ONE_TIME usan NULL.
- Preflight rechaza importes/vencimientos incompatibles, códigos duplicados, múltiples defaults y asociaciones entre academias diferentes. No corrige datos financieros automáticamente.
- Los códigos legacy NULL siguen permitidos en BD; las nuevas escrituras API exigen código.
- DDL MySQL auto-confirma. El script es repetible, pero su despliegue requiere respaldo previo y revisar datos legacy si el preflight rechaza la operación.

Aplicado dos veces con éxito únicamente en `athena_stage4_test`. Respaldo previo: `/root/bte-stage7/before-stage7.sql`, SHA256 `74bba8778e716bb356e0b015e5f01ef625a537d6284bb470ae8eb4a522befd34`.

SHA256 del script ejecutado: `bfd55c9739cfe318c0234597849ffe9fca835e0fafc763af86d1e4e9d0b8d8a2`.

## 4. Backend

- Reutilizados: BillingPlan, ClassBillingPlan, ClassEnrollment y DbSets existentes. No se duplican entidades ni modelos financieros.
- Nuevo `bte.api.DTO.Academy/BillingPlanDtos.cs`: BillingPlanWrite, ClassPlanWrite, BillingPlanRead, PlanClassRead.
- Nuevo `bte.api.Services/BillingPlanService.cs`: catálogo/filtros, detalle, create/update seguro, validación, desactivación, asociaciones, default y desasociación protegida.
- Modificado `bte.api.Controllers/BillingAndGradingController.cs`: las rutas existentes delegan al servicio, aceptan DTOs y agregan la operación default.
- Modificado `AcademyOperationsController.Enrollments.cs`: incluye billingCycle y billingPlanAmount por proyección, bloquea el plan durante validación financiera y conserva el plan al terminar una inscripción.
- Modificado `BteV1Context.cs`: precisión, longitudes, relaciones e índices compatibles con el esquema. Se mantienen las proyecciones DTO explícitas del proyecto; no se expone un grafo EF.
- Modificado `AcademyScopeAuthorizationFilter.cs`: lectura de planes de clase para instructor autorizado a esa clase; las mutaciones siguen restringidas a admin/academy_admin y al recurso de su academia.
- Validación de duplicados de código/nombre por academia y preservación de academia, ID y creación. La actualización no copia libremente la entidad enviada por el cliente.
- Corregido el proyecto web para excluir contenido de tests: su inclusión accidental podía sobrescribir archivos de dependencias del ejecutor .NET.

## 5. Endpoints

Se conservan las rutas existentes; DELETE de plan continúa significando desactivación.

| Método | Endpoint | Descripción |
|---|---|---|
| GET | /api/academies/{academyId}/billing-plans | Catálogo; search, billingCycle, isActive |
| GET | /api/billing-plans/{id} | Detalle y clases asociadas |
| POST | /api/academies/{academyId}/billing-plans | Crear plan validado |
| PUT | /api/billing-plans/{id} | Editar configuración, conservando academia |
| DELETE | /api/billing-plans/{id} | Desactivar sin borrar historial |
| GET | /api/classes/{classId}/billing-plans | Planes de clase con isDefault |
| POST | /api/classes/{classId}/billing-plans | Asociar plan válido, opcionalmente default |
| POST | /api/classes/{classId}/billing-plans/{planId}/default | Cambiar predeterminado en transacción |
| DELETE | /api/classes/{classId}/billing-plans/{planId} | Quitar relación si no la usa una inscripción ACTIVE/PAUSED |
| POST | /api/classes/{classId}/enrollments | Inscribir con plan explícito opcional |
| PUT | /api/class-enrollments/{id} | Cambiar plan en ACTIVE/PAUSED mediante update existente |

## 6. Frontend

- Se reutiliza Academia → Finanzas → Planes / Membresías y `/academies/:academyId/billing-plans`; no se duplica menú ni ruta.
- `billing-plan-list.component.ts`: descripción, resumen con una solicitud, filtros locales, código, tipo, monto, vencimiento/gracia, clases, vigencia, estado, detalle/editar/desactivar. Acciones financieras según rol.
- `billing-plan-dialog.component.ts`: Reactive Forms, validaciones, campos según ciclo, monto positivo y dos decimales, día mensual 1..28, fechas ordenadas y protección de guardado.
- Nuevo `billing-plan-detail.component.ts`: plan y enlaces a clases asociadas.
- Nuevo `billing-plan.util.ts`: etiquetas centralizadas, vigencia y formatter monetario neutro por locale, sin CLP fijo.
- Nuevo `class-billing-plans.component.ts`: tab en detalle de clase, asociación, chip textual Predeterminado, cambio de default y desasociación con confirmación y errores de negocio.
- `class-plan-dialog.component.ts`: solo planes activos/vigentes aún no asociados, con manejo de errores.
- `class-enrollment-dialog.component.ts`: planes de la clase; default válido preseleccionado visualmente y enviado explícitamente; conserva el plan histórico aunque esté inactivo.
- `class-enrollments.component.ts`: columna Plan / Membresía siempre visible.
- Servicios ClassManagement/BillingManagement e interfaces ampliados para default, detalle, contadores y datos del plan del enrollment, sin GET individual por alumno.

## 7. Reglas financieras e historial

MONTHLY, PER_CLASS y ONE_TIME implementados como configuración. Default único protegido por transacción, bloqueo de clase e índice único. Nuevas asociaciones/asignaciones requieren plan activo, vigente, de la misma academia y asociado a la clase. No se permite quitar relaciones usadas por inscripciones ACTIVE/PAUSED ni cambiar el plan de inscripciones terminadas. El plan sigue siendo opcional para datos legacy.

Se conserva updated_at de plan e inscripción. No se encontró auditoría general ni updated_by en estos modelos; no se inventó versionado ni una tabla de historial financiero. Los nombres y la configuración disponible del plan permanecen visibles aunque se desactive; no representan un snapshot de precio por alumno.

No hay campo de moneda de academia en el contrato actual. Los importes permanecen neutros y se formatean con el locale configurado; no se asigna una moneda basándose en una suposición. Soporte explícito de currency e historial financiero por período quedan documentados para su diseño futuro.

BillingPlan es configuración. BillingCharge debe ser un snapshot de concepto, monto, período y vencimiento: editar planes no modifica cargos existentes. La prueba backend verifica esta separación. Ya existían tablas/endpoints billing de etapas futuras; esta entrega no los amplía ni invoca desde planes/asistencia. No se generaron cargos, pagos ni mora.

## 8. Pruebas

| Conjunto | Resultado |
|---|---|
| Backend completo | 436/436 OK, cero omitidas, EXIT_CODE=0 |
| Frontend completo | 365/365 OK, EXIT_CODE=0 |
| Asistencia focalizada inicial backend/frontend | 19/19 y 8/8 OK |
| MySQL planes | 18/18 OK, repetido con éxito |
| MySQL regresión asistencia | 21/21 OK |
| Migración MySQL | Dos ejecuciones consecutivas OK |

Nuevos tests: `BillingPlanTests.cs`, ampliaciones de `AcademyScopeTests.cs` y `ClassAttendanceTests.cs`, `billing/billing-plans.spec.ts`, y ejecutor `tests/stage7-mysql/Program.cs`.

La suite Angular inicialmente detectó dos expectativas obsoletas ya documentadas: URL localhost fija y rango horario esperado donde la tarjeta muestra solo inicio. Se corrigieron exclusivamente esos tests para usar environment y comprobar inicio/fin por sus contratos actuales; autenticación y cronograma no cambiaron.

MySQL verificó ciclos, código duplicado, restricciones, detalle, asociación duplicada, cambio de default, dos transacciones concurrentes definiendo default, protección de planes usados, ACTIVE/PAUSED, histórico inactivo, inmutabilidad de inscripción terminada, vigencia y ausencia de cargos generados. Asistencia verificó atomicidad, versiones concurrentes, cierre/guardado concurrentes, horas locales, porcentaje 80%, paginación, historial y FK protectora.

Logs locales: `stage7-backend-tests-verified.log`, `stage7-frontend-tests-verified.log`, `stage7-backend-build.log`, `stage7-backend-release.log`, `stage7-frontend-build-final.log`.

Logs remotos: `/root/bte-stage7/stage7-first-results.log`, `/root/bte-stage7/stage7-results.log`, `/root/bte-stage7/stage6-regression.log`. Todos los fixtures temporales fueron eliminados; planes/clases/asociaciones/asistencia/cargos/pagos volvieron a cero en la réplica.

## 9. Build y artefactos

- Backend: OK, restore/build/publish; artefacto `release/stage7-backend/`. Advertencias preexistentes de nullable y compilación, sin errores.
- API verificada en réplica, SHA256: `ed60584f2f51c775c53ddc6f09000ccc8b1acb6713f97f3525f76abfcb609d81`.
- Frontend: OK, `npm run build`, sin errores TypeScript, EXIT_CODE=0. Artefacto `dist-stage-7/`, hash Angular `72a11d7af6c88a01`, validación SEO incluida. Advertencias CommonJS heredadas de canvg/jspdf.
- Paquete frontend para `/bte/`: `entregables/bte-frontend-app-20261017-etapa-7.zip`, con checksum `.sha256` y comprobación de archivos/SEO del empaquetador existente.
- Ejecutores reproducibles: `release/stage7-mysql/` y `release/stage7-attendance-mysql/`; requieren BTE_TEST_MYSQL_CONNECTION y rechazan bases distintas de athena_stage4_test.

## 10. Regresión

ETAPAS 1, 2, 3, 4 y 5: OK en suites automáticas de configuración, modalidades, salas, estilos, instructores, clases, horarios, inscripciones y sesiones. ETAPA 6: OK en suites y MySQL real. Eventos: OK en suites existentes de listado/detalle, categorías, competidores, inscripciones, brackets y resultados. No se modificó el motor competitivo ni pagos legacy.

## 11. Pendientes y publicación

Sin faltantes de implementación de ETAPA 7 detectados en las comprobaciones ejecutadas. Esta entrega no despliega producción: una publicación posterior debe aplicar primero la migración con respaldo, publicar backend/frontend compatibles y comprobar el acceso frontend según AGENTS.md. No se ha realizado aceptación visual en el hosting productivo.

No se avanza a ETAPA 8. Currency explícita y auditoría financiera detallada son limitaciones de modelo documentadas; no se amplía su alcance en esta etapa.

## 12. Estado

**ETAPA 7 COMPLETA — implementación y validación técnica en réplica.**
