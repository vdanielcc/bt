> Actualización posterior: la semántica de estados y morosidad de este informe histórico queda sustituida por [la corrección final](academy-charge-state-results.md). OVERDUE es calculado, nunca persistido.

# Auditoría previa a ETAPA 8

17/10/2026. Inspección de código y réplica athena_stage4_test. No se volvió a ejecutar SQL de ETAPA 7.

| Componente | Estado inicial | Acción |
|---|---|---|
| billing_plans | COMPLETO | Conservar campos, validaciones, DECIMAL y restricciones comprobadas en réplica |
| class_billing_plans | COMPLETO | Conservar PK, default_guard, índice único y default transaccional |
| Plan de enrollment | COMPLETO | Conservar nullable, validación de academia/vigencia/asociación e historial terminado |
| Pantallas de planes/clase/alumnos | COMPLETO | Conservar rutas, componentes y selección explícita |
| Generación anticipada por planes/enrollment | COMPLETO | No existe; estos flujos solo configuran planes |
| billing_concepts | COMPLETO | Tabla equivalente y seis semillas activas existentes; no recrear |
| billing_charges | PARCIAL | Campos y constraints financieros existen; faltan gracia congelada y clave idempotente |
| vw_student_billing_balance | COMPLETO | Conservar vista existente, que calcula total y saldo con allocations confirmadas |
| Generador mensual | INCORRECTO | Consulta fuera de transacción, sin vigencias suficientes y sin clave única; reemplazar incrementalmente |
| Generador PER_CLASS | INCORRECTO | No exige COMPLETED ni PRESENT/LATE; período SESSION incompatible con CHAR(7)/CHECK existente |
| Escritura/edición/anulación | PARCIAL | Usa entidades sin contrato seguro, sin edición limitada ni protección ante allocations |
| Consulta de cargos/morosidad | PARCIAL | Listados básicos sin paginación, agregados ni gracia; completar en backend |
| UI finanzas/cargos | PARCIAL | Reutilizar diálogos/menú; falta tabla operativa y morosidad; ocultar pagos académicos hasta ETAPA 9 |

Decisiones: snapshot de grace_days en cada cargo; importe/fecha/descripción no dependen posteriormente del plan. Clave mensual por inscripción/período y clave por clase por alumno/sesión, independientes del plan para impedir un segundo cargo tras cambiarlo. VOID conserva la clave: regenerar no revive cargos anulados. No prorratear; genera mensualidad completa si inscripción ACTIVE y plan se solapan con el mes. PAUSED no genera. Sin intervalos históricos de pausa ni de cambio de plan, no se reconstruyen estados pasados.

La fecha de mora se evaluará con configuración de zona horaria por academia (fallback configurable y documentado), sin desplazar el vencimiento por los días de gracia. Los estados persistidos se actualizan desde el servicio al consultar/operar finanzas. No se agregan pagos, allocations, comprobantes ni conciliación. Flujos legacy de eventos quedan separados.
