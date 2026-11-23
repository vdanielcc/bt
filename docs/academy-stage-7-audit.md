# ETAPA 7 — Auditoría inicial

Revisión local del 17/10/2026, antes de implementar planes. Fuente BD: esquema de referencia SQL y mapeo EF actuales; no equivale a inspección de una BD remota.

| Componente | BD | Backend | Frontend | Estado inicial |
|---|---|---|---|---|
| billing_plans | EXISTE: DECIMAL(12,2), vigencia, estado, código nullable; unique academia/nombre; vencimiento 1..31 | Entity/DbSet y CRUD existentes; actualización copia entidad completa, validación incompleta | Listado/dialog existentes, monto cero, día 31, CLP fijo | PARCIAL |
| class_billing_plans | EXISTE: PK compuesta clase/plan, FK e índice de plan | GET pierde isDefault; POST sin control de default/uso/vigencia | Dialog existente sin tab operativo en detalle | PARCIAL |
| class_enrollments.billing_plan_id | EXISTE: nullable, FK, índice | Valida academia, asociación, estado y vigencia; preserva inscripciones terminadas | Selector clase existente; no preselecciona default, columna se oculta | PARCIAL |
| DTOs y servicio de planes | Entidades existentes reutilizables | FALTA contrato de escritura seguro y servicio específico | Interfaces/services existentes, faltan detalle y default | PARCIAL |
| Seguridad | Relaciones academia existentes | Filtro de autorización central; mutaciones requieren admin/academy_admin; conservar y cubrir | Faltan restricciones de acciones financieras en listado | PARCIAL |
| Historial operativo | updated_at existente; sin auditoría general ni intervalos de cambio de plan encontrados | No crear versionado financiero; documentar limitación | Nombre actual del plan disponible sin N+1 | PARCIAL |

## ETAPA 6 revisada primero

GET combina inscripción/estudiante/asistencia y no inserta. DTO admite attendanceId/status/horas/notas null. Los únicos estados persistibles son PRESENT, ABSENT, LATE, EXCUSED. Bulk transaccional con UPSERT, versión y bloqueo de clase; solo IN_PROGRESS editable. Cierre comprueba todos los esperados; cero esperados permitido. COMPLETED consulta únicamente registros guardados. CANCELLED excluida de estadísticas. Marcar todos presentes modifica solo memoria local.

`POST attendance/initialize` existe y ya es una lectura sin escrituras. Se conserva para compatibilidad. Flujo principal usa GET/PUT. No existe historial de intervalos PAUSED: no se reconstruyen pausas pasadas. Moneda explícita de academia no encontrada: mantener montos neutros y formato por locale existente, sin asignar moneda por suposición.

## Decisiones incrementales

- Reutilizar tablas, entidades, rutas y filtro existentes. No alterar eventos ni pagos legacy.
- Mantener unique academia/nombre de la BD, además de incorporar código único por academia; no imponer unicidad global de nombre.
- Nueva escritura exige código y vencimiento mensual 1..28; migración debe detectar datos legacy incompatibles antes de añadir constraints, sin corregir importes o fechas silenciosamente.
- Serializar asociaciones/default/desasociación en la misma clase que las inscripciones; un default por clase y rechazo al quitar planes usados.
- Ya existen tablas y endpoints billing de etapas futuras en el repositorio. No se amplían ni se invocan desde planes o asistencia; se documenta su existencia.
- Plan es configuración. Cargos futuros deben conservar snapshots de concepto, monto, período y vencimiento; editar un plan no debe reescribir cargos existentes.
