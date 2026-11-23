# Refund definitivo: auditoría inicial

Se inspeccionó la implementación y la réplica `athena_stage4_test`. No se reejecutan scripts anteriores ni se inicia ETAPA 10.

| Componente | Estado inicial | Corrección aplicada |
|---|---|---|
| CONFIRMED → REFUNDED, refund total | COMPLETO | Conservar state machine y ausencia de montos negativos/refund parcial |
| Transacción READ COMMITTED y locks ordenados | COMPLETO | Conservar lock del pago, luego cargos por ID; recálculo en la misma transacción |
| Allocations históricas | COMPLETO | No modificar ni eliminar filas/importes durante refund |
| Fuente de verdad y recálculo compartido | COMPLETO | Conservar ConfirmedPaidAsync y RecalculateLocked usados por confirmar y reembolsar |
| OVERDUE, snapshots y fecha de academia | COMPLETO | Conservar proyección central; no persistir OVERDUE |
| refunded_by / refunded_at | COMPLETO | Reutilizar campos y timestamps UTC existentes |
| refund_reason en BD/entidad/DTO | FALTANTE | Agregar solo VARCHAR(500) nullable para historia; exigir motivo en nuevas operaciones |
| Request del endpoint | INCORRECTO | Antes aceptaba body vacío; ahora motivo obligatorio y sin campo de monto |
| Integridad de allocations confirmadas | PARCIAL | Rechazar pago sin allocations, owners incoherentes, IDs inválidos o cargo VOID |
| Respuesta del refund | PARCIAL | Incluir cargos recalculados y estado de cuenta autorizado antes del commit |
| Anular cargo con dinero confirmado | COMPLETO | Ya se rechazaba; añadir mensaje específico y pruebas explícitas |
| Diálogo de refund | PARCIAL | Reutilizar confirmador existente con campo de motivo obligatorio |
| Actualización de resumen/cargos Angular | PARCIAL | Consumir respuesta agregada sin reconstruir contabilidad ni requests por fila |
| Visualización de fecha de refund | PARCIAL | Mostrarla en zona de la academia, no en zona del navegador |
| Rollback y doble refund simultáneo | PARCIAL | Añadir pruebas MySQL con error forzado durante segundo recálculo y dos requests concurrentes |
| Vista de balance, UNIQUE y FK RESTRICT | COMPLETO | Conservar; ya cuentan solo CONFIRMED y protegen historia |

La réplica tenía cero pagos y allocations y ya poseía refunded_by INT / refunded_at DATETIME. Faltaba refund_reason. No se necesitan tablas, índices ni constraints adicionales para el motivo. Los motivos legacy permanecen null, sin inventar información histórica.
