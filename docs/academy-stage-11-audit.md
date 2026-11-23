# Auditoría inicial ETAPA 11

Auditoría de solo lectura completada el 18-10-2026 antes de editar código o BD. Réplica: athena_stage4_test. No se procesaron mensajes ni se alteró producción.

| Componente | Capa | Estado | Evidencia | Riesgo | Acción |
|---|---|---|---|---|---|
| Grados/permisos | DB/backend/API/UI | COMPLETO | Migración ETAPA 10 aplicada, servicios y evidencia 554/414 + 54 casos MySQL previos | ALTO | Conservar y ejecutar baseline/regresión |
| person_contact_channels | DB/backend/API | PARCIAL | Canal EMAIL/WHATSAPP/SMS, verificación y primario; cero filas. UNIQUE duplicado de person/channel/value | MEDIO | Reutilizar, no duplicar emails de users; eliminar solo índice redundante |
| app_devices | DB/backend/API | PARCIAL | person_id/user_id/token/plataforma/actividad; cero filas; UNIQUE completo y prefijo redundantes | MEDIO | Reutilizar; resolver propietario desde usuario autenticado |
| notification_templates | DB/backend/API/UI | PARCIAL | Canal, variables, academia nullable y activo; cero filas; no se renderiza desde pipeline | ALTO | Código estable por tipo de evento y fallback global controlado |
| notification_preferences | DB/backend/API | PARCIAL | Persona/academia/tipo/canal/is_enabled; cero filas; UNIQUE nullable y duplicado | ALTO | Scope global generado, canales ampliados, política central de consentimiento |
| notification_rules | DB/backend/API/UI | PARCIAL | Triggers legacy, offsets y tres canales; cero filas | ALTO | Eventos nuevos, IN_APP, uso real en pipeline |
| notifications | DB/backend | INCORRECTO | 64 PENDING TRANSFER_RECEIPT/TRANSFER_REVIEW; idempotency_key UNIQUE; destinatario CASCADE | CRÍTICO | Preservar filas e idempotency; RESTRICT y lectura IN_APP separada |
| notification_deliveries | DB/backend | INCORRECTO | 64 EMAIL PENDING; FK CASCADE; CHECK no admite PROCESSING aunque el código lo guarda | CRÍTICO | Preservar historial; claim atómico, estados compatibles y retry |
| EmailService | infraestructura | PARCIAL | SMTP existente; configuración presente en appsettings del servidor, sin valores expuestos | ALTO | Reutilizar; no añadir proveedor ni enviar mensajes reales en pruebas |
| WhatsApp/Push | infraestructura | PARCIAL | UnconfiguredWhatsAppProvider y UnconfiguredPushProvider lanzan excepción | ALTO | Mantener no configurados, registrar SKIPPED sin simular envío |
| NotificationService/Worker | backend/infraestructura | INCORRECTO | Take(100) sin claim, preferencias solo en scheduler, retries automáticos solo legacy | CRÍTICO | Reemplazar selección insegura y centralizar decisiones |
| Eventos/outbox | backend/DB | FALTANTE | Sin MediatR/DomainEvent/Hangfire/Quartz/colas equivalentes; notifications es cola lógica existente | ALTO | Captura durable mínima de hechos, consumo posterior al commit; reutilizar cola de mensajes |
| Timezone | backend | COMPLETO | AcademyTimeZoneService por país/override | ALTO | Reutilizar en recordatorios; no existen quiet hours |
| Autorización | seguridad | PARCIAL | AcademyScopeAuthorizationFilter y relaciones DB; solo 18 grading y 4 scoreboard permissions | CRÍTICO | Diez permisos concretos antes de bypass Admin; scope real |
| Mantenedor | frontend | PARCIAL | Ruta, service y tabs existentes; tipos legacy y sin permiso concreto | MEDIO | Ampliar, no duplicar |
| Campana | frontend | INCORRECTO | Dropdown Vex con ejemplos New Order/New customer | BAJO | Datos persistentes propios y contador |
| Centro personal/preferencias | frontend/API | PARCIAL | Preferencias por personId; falta /me y centro persistente | ALTO | Propiedad resuelta en servidor |

DB se inspeccionó con SHOW CREATE TABLE y consultas de information_schema, separada de entities. Existen las siete tablas; no hay tablas equivalentes de email_queue/messages/outbox/providers. Personas: users.person_id, student.person_id, attorney.person_id y legal_representatives.person_id; academia por legal_representative. Emails en users.email, teléfono en persons.phone_number. Sin preferencias horarias existentes.

Los datos revisados no tienen preferencias duplicadas ni notificaciones con destinatarios huérfanos. No hay reglas ni templates a migrar. Hay 64 comprobantes históricos que deben conservarse. No se observan credenciales SMTP versionadas en backend-production: runtime usa appsettings del servidor; no se copian secretos ni se cambia ese archivo.

## Plan incremental

1. BD: respaldo de réplica; ALTER de estados, canales, FK e índices; outbox de hechos solo porque no existe equivalente. Riesgo alto, probar con los datos legacy preservados.
2. Entities/EF: ampliar modelos existentes y mapeos; DTOs explícitos. Riesgo medio.
3. Permissions: diez permisos por nombre real de rol (Director=academy_admin), sin wildcard. Riesgo alto.
4. Core: Notification != Delivery, templates controlados, preferencias y destinatarios por academia, dedupe usando idempotency_key. Riesgo alto.
5. Providers: conservar SMTP/comprobantes, adapters no configurados y provider IN_APP local. Sin credenciales nuevas ni envío real. Riesgo alto.
6. Worker: lotes configurables, claim/commit antes del provider, backoff y máximo configurable, historial preservado. Riesgo crítico.
7. API: reutilizar rutas, agregar me/read/preview/deliveries; permisos DB y scopes antes del bypass Admin. Riesgo alto.
8. Angular: ampliar mantenedor y reemplazar ejemplos Vex por centro propio y preferencias. Riesgo medio.
9. Tests: providers falsos, JWT/API, MySQL/concurrencia/idempotencia/rollback. Riesgo bajo; fixtures aislados.
10. Regresión: ETAPAS 1–10 y eventos; builds, informe y paquetes; sin publicar ni avanzar a ETAPA 12.
