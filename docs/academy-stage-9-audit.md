# ETAPA 9: auditoría inicial

Inspeccionados código, rutas, autorización y esquema real de `athena_stage4_test` antes de migrar. La réplica tiene cero cargos, pagos y allocations de negocio. Se conserva la corrección final de ETAPA 8; no se reejecutan scripts aplicados.

| Componente | Estado inicial | Acción necesaria |
|---|---|---|
| Cargo, snapshots, generación e idempotencia | COMPLETO | Conservar y verificar regresión |
| OVERDUE calculado y zona por país | COMPLETO | Reutilizar proyección central existente |
| Saldo confirmado | PARCIAL | Retirar atajo PAID=0; calcular max(total-confirmado,0), preservando VOID=0 |
| billing_payments y entidad | PARCIAL | Campos existentes adecuados; default CONFIRMED incorrecto; agregar auditoría de transiciones |
| Métodos y estados en CHECK | COMPLETO | Reutilizar cinco métodos y cinco estados existentes |
| allocations, DECIMAL y UNIQUE(payment,charge) | COMPLETO | Reutilizar tabla, columna amount y UNIQUE existentes |
| FK payment→allocations | INCORRECTO | Sustituir ON DELETE CASCADE por RESTRICT |
| FK student/payer | PARCIAL | RESTRICT para preservar referencias financieras |
| Distribución existente | INCORRECTO | Permite asignar CONFIRMED; sustituir por PUT del conjunto completo solo PENDING |
| Creación y edición de pago | INCORRECTO | Binding directo de entidad permite estado; usar DTO y PENDING obligatorio |
| Confirmación | FALTANTE | Transacción READ COMMITTED, locks de payment y cargos ordenados, suma exacta y validación final |
| Reject/Void/Refund | INCORRECTO | State machine definitiva; refund total conserva allocations y recalcula cargos atómicamente |
| Listado/detalle agregado | PARCIAL | Paginación, filtros, nombres y montos agregados, sin N+1 |
| Estado de cuenta | PARCIAL | Contrato de cargos/pagos/saldos reales e historial de VOID/refund |
| Comprobantes | PARCIAL | Hay storage y validación de archivos existentes; reutilizar con autorización financiera |
| Autorización | PARCIAL | Reutilizar AcademyAuthorizationService y filtro; declarar alcance de nuevas acciones |
| Angular pagos | INCORRECTO | Formulario envía RECEIVED; asignador incompleto; falta página, edición, confirmación y refund |
| Menú y perfil alumno | PARCIAL | Agregar Pagos y estado de cuenta sobre rutas/componentes existentes |
| Pagos competitivos/TicketFactor | COMPLETO | Conservar sin cambios y ejecutar regresión existente |

Índices reales existentes: (academy_id,paid_at), (student_id,paid_at), referencia, payer y created_by; allocations tiene UNIQUE(payment_id,charge_id) e índice charge_id. No se duplican. Se necesitan índices con status y paid_at como primera columna.

No se encontró infraestructura general de auditoría financiera reutilizable; se utilizarán columnas nullable de actor/fecha en las entidades existentes. El patrón de archivos utiliza Storage:BasePath y paths; no binarios en BD.
