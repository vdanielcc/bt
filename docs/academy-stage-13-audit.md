# Auditoría inicial ETAPA 13

Auditoría exclusivamente de lectura completada antes de modificar archivos o BD. Estado: 18-10-2026. Fuente backend-production, frontend src y réplica athena_stage4_test. Producción se consultó solo para comprobar presencia de configuración y estado del servicio, sin mostrar secretos.

| Componente | Capa | Estado inicial | Evidencia | Riesgo | Acción |
|---|---|---|---|---|---|
| JWT/sesiones | Backend | PARCIAL | Program valida firma/issuer/audience/lifetime y skew 30s; AuthenticationService rota refresh hasheado y detecta replay; sin algoritmo explícito/fail-fast | ALTO | Restringir HS256, validar configuración |
| Login | Backend | INCORRECTO | AuthController.Login retorna 423 antes de registrar fallo; no comprueba lockout futuro correctamente | ALTO | Recuperar lockout y prueba real |
| Reset | Backend | PARCIAL | Expira, marca IsUsed y revoca refresh; consulta+save sin transacción | ALTO | Consumo serializado, token aleatorio/hasheado compatible |
| Interceptor | Angular | INCORRECTO | AuthInterceptor agrega bearer a cualquier URL | CRÍTICO | Limitar origen y ruta API |
| XSS | Angular | INCORRECTO | PublicEventDetail bypass HTML y resource URL provenientes de datos | CRÍTICO | Sanitización Angular y allowlist HTTPS de mapas |
| Logging | Backend | INCORRECTO | RequestLogService usa contexto del negocio; controllers envían cuerpos completos; Teams escribe DTO/excepción a archivo | CRÍTICO | Contexto separado, metadata y escritura tolerante a fallos |
| Errores | Backend | PARCIAL | ApiExceptionMiddleware y ApiResponder existen; Students/Regions retornan ex.Message | ALTO | Reutilizar contrato y sanear errores |
| Autorización | Backend/DB | PARCIAL | AcademyScopeAuthorizationFilter y servicios verifican roles reales; grading/notifications permisos concretos antes del shortcut Admin legacy | ALTO | Regresión multiacademia/IDOR; conservar Admin global explícito legacy |
| Transacciones | Backend/DB | COMPLETO sujeto a regresión | Locks parametrizados en billing/grading/attendance; claim condicional fuera de provider | ALTO | Repetir pruebas MySQL existentes |
| Historial nuevo | DB | COMPLETO | billing/grading/attendance/notifications tienen RESTRICT | BAJO | Conservar |
| Historial legacy | DB | INCORRECTO | Cascades payment.guest_id/academy_id, resultados/snapshots/event, brackets/event, schedule/event, match_results/match | CRÍTICO | Cambiar ocho relaciones a RESTRICT sin borrar datos |
| Notificaciones | Backend | PARCIAL | CHECK ya permite PARTIAL, agregado actual usa FAILED para mezcla SENT/FAILED | ALTO | Corregir agregado y pruebas |
| Dashboard | Backend/UI | PARCIAL | RoleDashboards.Instructor hace dos consultas por sesión y usa UTC; Guardian consulta por alumno; no hay evidencia de ETAPA12 integral terminada | MEDIO | Corregir N+1 existente, acotar, documentar alcance |
| Uploads | Backend | COMPLETO | FileValidationService MIME+extensión+firma+tamaño; permisos en servicios | BAJO | Conservar y probar |
| CORS/SQL | Backend | COMPLETO en revisión estática | Orígenes concretos; raw SQL con parámetros para valores; tablas dinámicas son constantes internas | BAJO | Conservar y validar |
| Health/correlación/rate limit | Backend | FALTANTE | Sin registros ni endpoints en Program | ALTO | Mecanismos nativos simples |
| Configuración | Backend/scripts | PARCIAL | Runtime clave JWT longitud108, issuer/audience y FrontAccess en env; detector marcó inicialmente una expresión de configuración como literal, descartada en revisión manual | ALTO | Prevenir inclusión de configuración/artefactos sensibles y corregir falso positivo |
| CI/backup | Operación | PARCIAL | Scripts SQL-first y seis dumps previos; sin pipeline único ni evidencia de restauración periódica | ALTO | Pipeline verificable y runbook restauración sin borrar datos |

AUDITORÍA INICIAL COMPLETA. Plan: secretos/JWT/XSS/logs → auth/errores/health/rate limit → backup y SQL compatible en réplica → agregados notificaciones/dashboard → pruebas/build/regresión → informe final con pendientes reales. No publicar producción ni crear módulos de negocio. No reconstruir ETAPA12: la revisión detallada confirmó un dashboard existente dentro de AcademyManagementController, sin informe de cierre previo.

Revisión del detector: `password=` en activate_zeuz ensambla un archivo cliente desde configuración externa; no era una credencial literal. Se restauró la expresión y se comprobó su sintaxis con ast.parse. No se retiró ni rotó una contraseña de ese script.
