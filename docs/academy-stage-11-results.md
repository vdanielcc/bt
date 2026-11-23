# ETAPA 11 — Notificaciones multicanal

Implementación realizada sobre la auditoría de solo lectura [inicial](academy-stage-11-audit.md). Producción no fue publicada ni modificada. La migración y las pruebas de integración se ejecutaron exclusivamente en `athena_stage4_test`. No se inició ETAPA 12.

## Comportamiento entregado

Se reutilizan las siete tablas existentes de contactos, dispositivos, templates, preferencias, reglas, notificaciones y entregas. Se corrigen checks, índices únicos con scope global y relaciones de historial. Los 64 avisos y 64 entregas EMAIL históricos permanecen pendientes, sin procesarlos durante las pruebas.

`notification_events` registra hechos de pagos confirmados/reembolsados, cancelación de sesión y promoción dentro de la transacción del negocio. El worker solo observa hechos confirmados y crea las notificaciones después del commit. No se añadió un bus ni un proveedor externo. Fallar un envío no revierte pagos, reembolsos ni grados; un rollback también revierte el hecho pendiente.

Los siete eventos son PAYMENT_CONFIRMED, PAYMENT_REFUNDED, CHARGE_DUE_SOON, CHARGE_OVERDUE, CLASS_REMINDER, SESSION_CANCELLED y GRADE_PROMOTED. Los recordatorios usan cargos con saldo y sesiones reales con matrículas activas. OVERDUE sigue siendo calculado, con la gracia existente. Apoderados solo se incluyen cuando la regla lo indica. Antes de enviar se revisan consentimiento, destino, pertenencia y vigencia del recordatorio: un cargo pagado o una clase cancelada deja de ser elegible.

Las claves de idempotencia separan evento, entidad, destinatario, regla y período; los vencimientos incluyen fecha y los recordatorios de clase incluyen horario. El outbox y la creación lógica se serializan en MySQL. El claim condicional de entrega evita que dos workers invoquen el proveedor por la misma entrega. Ninguna llamada externa mantiene una transacción abierta.

El lote predeterminado es 25, máximo 200; el presupuesto predeterminado es 5 intentos, máximo 20. Hay backoff exponencial y recuperación conservadora de claims abandonados. Un resultado externo incierto queda FAILED/DELIVERY_OUTCOME_UNKNOWN, sin reenvío automático ni retry manual inseguro. SMTP no proporciona garantía de entrega exactamente una vez tras un fallo de red ambiguo. El historial conserva intentos y errores normalizados sin secretos.

EMAIL reutiliza EmailService/SMTP existente. IN_APP persiste entregas y lectura por destinatario. WhatsApp y Push continúan sin proveedor configurado y producen SKIPPED; no se simula SENT. Las pruebas usan un proveedor de correo controlado, sin enviar mensajes externos. No se verificó entrega SMTP real. WhatsApp requiere consentimiento explícito y contacto verificado; la ausencia de destino se registra como SKIPPED.

Templates propios de academia tienen prioridad sobre el global. El código de evento es estable; se conserva historial mediante desactivación. Solo se admiten studentName, guardianName, academyName, amount, balance, dueDate, className, sessionDate, gradeName y eventName. No se evalúan expresiones; los valores de EMAIL se codifican como HTML. Preview utiliza datos ficticios y nunca envía. La campana muestra subject/body renderizados de IN_APP, no el texto genérico del evento.

Las preferencias se resuelven desde el usuario autenticado, con scope global o academia y prioridad de cualquier exclusión explícita. EMAIL/IN_APP están habilitados por defecto si son operativos; PUSH requiere dispositivo; WhatsApp requiere opt-in. No se acepta un personId arbitrario para modificar preferencias ajenas. Los timestamps se leen como UTC y el navegador localiza su visualización; los recordatorios usan AcademyTimeZoneService.

## Permisos efectivos

Los diez permisos no existían en la auditoría y fueron creados. Se consultan roles/permisos de la BD y las relaciones reales con academias, incluso para Admin. Claims de rol falsificados no conceden acceso. Director corresponde a `academy_admin`; Estudiante a `alumno`; Apoderado a `apoderado`.

| Permiso creado | Admin | Director | Instructor | Estudiante | Apoderado |
|---|---|---|---|---|---|
| notification.view | Sí | Sí | Propias | Propias | Propias |
| notification.manage | Sí | Sí | No | No | No |
| notification.template.view | Sí | Sí | No | No | No |
| notification.template.manage | Sí | Sí | No | No | No |
| notification.rule.view | Sí | Sí | No | No | No |
| notification.rule.manage | Sí | Sí | No | No | No |
| notification.preference.view | Propias | No | No | Propias | Propias |
| notification.preference.update | Propias | No | No | Propias | Propias |
| notification.delivery.view | Sí | Sí | No | No | No |
| notification.delivery.retry | Sí | Sí | No | No | No |

Son 25 asociaciones nuevas de rol/permisos. Solo Admin real puede administrar templates globales. No se alteran roles existentes ni los permisos de grados.

| PERMISSION | EXISTÍA | CREADO | ROLES ASIGNADOS |
|---|---|---|---|
| notification.view | No | Sí | admin, academy_admin, instructor, alumno, apoderado |
| notification.manage | No | Sí | admin, academy_admin |
| notification.template.view | No | Sí | admin, academy_admin |
| notification.template.manage | No | Sí | admin, academy_admin |
| notification.rule.view | No | Sí | admin, academy_admin |
| notification.rule.manage | No | Sí | admin, academy_admin |
| notification.preference.view | No | Sí | admin, alumno, apoderado |
| notification.preference.update | No | Sí | admin, alumno, apoderado |
| notification.delivery.view | No | Sí | admin, academy_admin |
| notification.delivery.retry | No | Sí | admin, academy_admin |

## Componentes modificados

- Entities: Notification, NotificationDelivery, NotificationRule, NotificationPreference, NotificationTemplate, nuevo NotificationEvent; mapeos, índices y conversores UTC en BteV1Context.
- DTOs y validadores: NotificationRuleWrite, NotificationTemplateWrite, NotificationPreferenceWrite/NotificationPreferencesWrite; eventos, canales, offsets, variables y scope se validan en el controlador/policy.
- Services y handlers: NotificationService (core, Events y Relevance), NotificationPolicy, NotificationAuthorizationService; registro de hechos en BillingService.Payments, GradingService y ClassSessionService.Operations.
- Providers: EmailService existente, IWhatsAppProvider/IPushProvider existentes; adaptadores Unconfigured conservados. Ningún SDK ni proveedor nuevo.
- Worker: NotificationWorker existente con preparación aislada del despacho; configuración BatchSize/MaxAttempts/RetryBaseSeconds y activación BackgroundJobs.NotificationsEnabled.
- Controllers/Authorization: NotificationsController y Reads, AcademyScopeAuthorizationFilter; rutas antiguas de preferencias también verifican propietario y permiso efectivo.
- Frontend: NotificationManagementService y sus interfaces, mantenedor y formularios de templates/reglas, NotificationInboxComponent, dropdown/campana y toolbar badge, route/sectionGuard y NavigationLoader. Las acciones usan formularios y preview existentes en la página; no se añadió un diálogo de envío manual.

Notification es el mensaje lógico; Delivery es cada intento de canal y el único punto de invocación de provider. COMPLETED resume el procesamiento lógico, sin afirmar entrega externa. SENT indica aceptación por el adaptador; no se inventa DELIVERED. La lectura IN_APP se conserva en read_at, separada del estado del transporte. Los estados históricos compatibles se mantienen para los comprobantes anteriores.

## API y UI

| Ruta / operación | Permiso y alcance |
|---|---|
| GET /api/notifications/permissions | Usuario activo; capacidades reales, academias, canales y variables |
| GET /api/me/notifications | notification.view; bandeja propia y contador |
| POST /api/notifications/{id}/read; /read-all | notification.view; destinatario propio |
| GET /api/notifications/{id} | notification.view; propio o academia administrada |
| GET/PUT /api/me/notification-preferences | notification.preference.view/update; propia persona |
| GET /api/academies/{academyId}/notifications y /history | notification.view; academia administrada, filtros y paginación |
| GET /api/academies/{academyId}/notification-deliveries; /notifications/dashboard | notification.delivery.view; academia administrada |
| GET/POST /api/academies/{academyId}/notification-rules | notification.rule.view/manage; academia administrada |
| GET/PUT/DELETE /api/notification-rules/{id} | notification.rule.view/manage; academia de la regla; baja lógica |
| GET/POST /api/academies/{academyId}/notification-templates | notification.template.view/manage; academia administrada |
| GET/PUT/DELETE /api/notification-templates/{id} | notification.template.view/manage; scope propio o Admin global |
| POST /api/notification-templates/global | notification.template.manage y Admin real |
| POST /api/academies/{academyId}/notification-templates/preview | notification.template.view; datos ficticios |
| POST /api/notification-deliveries/{id}/retry | notification.delivery.retry; academia propia, FAILED y presupuesto disponible |

Se reutiliza el mantenedor con resumen, templates, reglas y entregas; preview, filtros, intentos y retry controlado. El centro personal `/mi-cuenta/notifications` incluye recibidos, leídos y preferencias. La campana y su badge consultan datos persistidos; navegación y acciones dependen de capacidades efectivas. No hay campañas, chat, marketing ni configuración de proveedores ficticios.

## SQL, respaldo y publicación

Scripts: `_script/bte_stage_11_notifications.sql` y `_script/bte_stage_11_notification_permissions.sql`, también incluidos en `release/stage11-sql`. Ya aplicados en la réplica: no volver a ejecutarlos allí. Durante la aplicación se corrigió academy_scope de STORED a VIRTUAL por compatibilidad con FK CASCADE; se continuó desde la sentencia fallida, sin repetir cambios exitosos. La unicidad de templates activos se aplicó posteriormente como ALTER explícito y quedó incluida en el script definitivo.

Respaldo previo: `/root/bte-stage11/before-stage11.sql`, SHA256 `3ea341cf681f41f4aa225d73193c7e348078762c0fde38da207b7f9726fd2ed8`.

La auditoría final confirmó 41 TRANSFER_RECEIPT y 23 TRANSFER_REVIEW PENDING, con 64 entregas EMAIL PENDING intactas; contactos, dispositivos, reglas, templates, preferencias, outbox y las cuatro tablas de grados quedaron sin fixtures. Se retiraron 36 hechos huérfanos creados por los runners anteriores, cuyos pagos/sesiones/grados de prueba ya habían sido eliminados; el cleanup se limitó por fecha, entidad ausente y nombre exacto de la réplica. Los permisos de grados conservan sus 18 entradas y 50 asociaciones. Véase `replica/final-db-audit.log`.

Para un futuro despliegue, detener el worker anterior antes de migrar: corregir los checks puede desbloquear su cola histórica. Revisar los 64 pendientes antes de habilitar el worker nuevo. `backend-production/config/notifications.example.json` deja BackgroundJobs.NotificationsEnabled=false como ejemplo de publicación controlada. Preservar la configuración SMTP y los secretos reales. No se modificó `/etc/bte-api.env`, systemd ni producción.

## Validación

Build backend y publish Release correctos; 567 pruebas backend aprobadas. Build Angular de producción y controles SEO/assets `/bte/` correctos; 422 pruebas frontend aprobadas. El baseline de ETAPA 10 pasó antes de los cambios: 554 pruebas backend y build frontend.

La integración MySQL/API/JWT aprobó 68 comprobaciones: permisos reales y scope, templates/fallback, preferencias, pagos/reembolsos/promoción con proveedor fallando, rollback de promoción, deduplicación, dos workers concurrentes, presupuesto de retry, resultado incierto, sesiones reales, cargos con saldo, lectura propia y conservación del historial. El runner espera la precisión de segundos del almacenamiento antes de comprobar envíos inmediatos; las entregas futuras mantienen intento cero. La evidencia final y los conteos están en `docs/validation/stage11/`.

Regresiones MySQL repetidas con el binario definitivo y aprobadas: ETAPA 10, 54 casos; ETAPA 9, 66; ETAPA 8, 36; ETAPA 7, 18; ETAPA 6, 21. Las suites generales cubren además componentes existentes de eventos/fixtures/Scoreboard; no se hizo un recorrido manual de producción. No se regeneraron llaves ni se cambió la arquitectura del Scoreboard.

| Regresión | Resultado y alcance |
|---|---|
| ETAPA 1 | OK: suites AcademyManagement, AcademyUsers, AcademyConfiguration y AcademyScope |
| ETAPA 2 | OK: AcademyClass y frontend existente |
| ETAPA 3 | OK: suites de alumnos, documentos y membresía activa |
| ETAPA 4 | OK: ClassEnrollment y frontend existente |
| ETAPA 5 | OK: ClassSession y frontend existente |
| ETAPA 6 | OK: ClassAttendance y 21 comprobaciones MySQL |
| ETAPA 7 | OK: planes de cobro y 18 comprobaciones MySQL |
| ETAPA 8 | OK: cargos y 36 comprobaciones MySQL |
| ETAPA 9 | OK: pagos/allocations/refunds y 66 comprobaciones MySQL |
| ETAPA 10 | OK: grados y 54 comprobaciones MySQL |
| Eventos | OK: suites existentes de administración, inscripciones, precios, asociaciones, fixtures y Scoreboard |

OK expresa las comprobaciones automatizadas descritas, no una certificación manual de todos los flujos en producción.

Artefactos: `entregables/bte-frontend-app-20261018-etapa-11.zip`, `release/stage11-backend` y `release/stage11-sql`. Los hashes y resultados finales se registran en `docs/validation/stage11/artifacts.json`.

ETAPA 11 COMPLETA en el código y la réplica verificados, con WhatsApp/Push manejados expresamente como no configurados. Producción permanece sin publicar. Trabajo detenido antes de ETAPA 12.
