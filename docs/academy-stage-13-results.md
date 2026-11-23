Actualización de publicación 18/10/2026: BD y backend desplegados por solicitud expresa; frontend publicado para descarga. Ver `docs/production-20261018.md`. El cierre de seguridad continúa pendiente por dependencias altas.

# ETAPA 13 — Hardening, observabilidad y preparación de despliegue

Fecha: 18-10-2026. Fuentes: backend-production y src. Entorno de escritura/prueba: athena_stage4_test. Producción no fue publicada, reiniciada ni reconfigurada. No se añadieron módulos de negocio, proveedores, bus, migrations EF ni servicios externos.

**ETAPA 13 NO COMPLETA: el cierre está bloqueado por alertas altas de dependencias que requieren migraciones mayores.** Los cambios funcionales y su validación se entregan para revisión; el paquete no se declara listo para producción.

La [auditoría inicial](academy-stage-13-audit.md) se realizó en lectura y se comunicó AUDITORÍA INICIAL COMPLETA antes de implementar. La revisión detallada confirmó el dashboard de academia existente en AcademyManagementController; no se reconstruyó ETAPA 12. La detección inicial de una contraseña en activate_zeuz fue un falso positivo: el script ensamblaba configuración externa. Se restauró la expresión, se comprobó su sintaxis y se ajustó el detector. No se retiró ni rotó una contraseña literal de ese script.

## Matriz de auditoría y resultado

| Componente | Capa | Estado inicial | Evidencia | Riesgo | Acción | Estado final |
|---|---|---|---|---|---|---|
| JWT | Backend | PARCIAL | Validación existente sin algoritmo explícito/fail-fast | ALTO | HS256 exclusivamente; firma/issuer/audience/exp/skew30s; claves externas mínimas; errores 401/403 con wrapper | Corregido; HTTP real validado |
| Login | Backend | INCORRECTO | Retorno anticipado omitía failed attempts y lockout | ALTO | Restaurar registro y bloqueo; mantener BCrypt y refresh existentes | Corregido; MySQL validado |
| Reset | Backend/DB | PARCIAL | Consumo sin bloqueo; token texto de 36 caracteres | ALTO | Token aleatorio, digest SHA256, SELECT FOR UPDATE parametrizado, commit único y revocación refresh | Corregido; concurrencia validada |
| Interceptor | Angular | INCORRECTO | Bearer a cualquier URL | CRÍTICO | Origen y segmento /api exactos | Corregido; prueba de destino ajeno y ruta hermana |
| Descripción/mapa | Angular | INCORRECTO | bypass HTML y URL desde datos | CRÍTICO | HTML pasa por sanitización Angular; embeds HTTPS Google/OSM en allowlist | Corregido; pruebas de URL |
| Catálogos/categorías | Backend | INCORRECTO | Mutaciones públicas y recursos de alumno/equipo sin ownership | CRÍTICO | Filtro existente: escrituras Admin real; recurso propio/representado/academia o evento organizado | Corregido; HTTP real denegado |
| Dashboards | Backend/DB | PARCIAL | Shortcut Admin global; N+1 y fechas de pago comparadas con UTC | ALTO | Scope real antes del shortcut; consultas en bloques; límites locales convertidos a UTC; secciones según permisos | Corregido; MySQL validado |
| Logging | Backend/DB | INCORRECTO | Contexto compartido, cuerpos legacy y archivo paralelo Teams | CRÍTICO | Contexto separado; sin cuerpos ni excepciones crudas; tolerante a fallo; eliminar archivo paralelo | Corregido; pruebas de aislamiento |
| Errores | Backend | PARCIAL | Algunos ex.Message y catches que convertían conflictos a 500 | ALTO | Reutilizar ApiExceptionMiddleware/ApiResponder; repropagar conflictos conocidos desde controllers | Corregido; 409/422 seguros |
| Historial | DB/EF | INCORRECTO | Ocho relaciones legacy CASCADE | CRÍTICO | RESTRICT y mapeos EF coherentes | Aplicado en réplica; ocho FK verificadas |
| Concurrencia financiera/grados/asistencia | Backend/DB | COMPLETO sujeto a regresión | Transacciones y locks existentes | ALTO | Conservar contratos y repetir suites | Regresión ejecutada |
| Notificaciones | Backend/DB | PARCIAL | Claim correcto; agregado incompleto y retry read/save | ALTO | PARTIAL, PROCESSING, retry condicional atómico | Corregido; suites existentes y nuevas |
| Health/rate/correlación | Backend | FALTANTE | Sin mecanismos en Program | ALTO | Health checks/rate limiter nativos, RequestId e instrumentos .NET | Integrado; HTTP real validado |
| Uploads | Backend | COMPLETO | MIME/extensión/firma/tamaño y ownership existentes | BAJO | Conservar FileValidationService | Tests existentes aprobados |
| CORS/SQL/CSRF | Backend | COMPLETO en patrón revisado | Orígenes concretos; valores SQL parametrizados; bearer en Authorization | BAJO | Conservar; no usar origen como autenticación | Sin degradación |
| Configuración | Backend/scripts | PARCIAL | Config externa válida; outputs/versiones/config no protegidos de inclusión | ALTO | Ignore de secretos/artefactos, scanner, fail-fast, Swagger opt-in Production; dialecto MySQL8 real | Código preparado |
| CI/recuperación | Operación | PARCIAL | Sin pipeline único ni restore demostrado | ALTO | Pipeline de calidad, runbook y restore en copia aislada | Preparado y restore ejecutado |

El Admin global explícito se conserva en operaciones legacy que ya lo requieren; no se convierte en acceso implícito a dashboards de otra academia. Grading y notifications conservan permisos concretos y scope incluso para Admin. No se usa el rol del JWT como sustituto de las relaciones/permisos de BD.

## Seguridad y contratos

ProductionHardening centraliza la validación JWT y los eventos de autenticación reutilizados por Program y las pruebas HTTP. No hay nueva autenticación. Se conserva rotación/replay detection del refresh hasheado, usuario activo y validación de rol actual de AccountSessionValidator. La longitud/diversidad mínima de una clave no demuestra su entropía de generación: el runbook exige una clave aleatoria externa. No se imprimieron claves, passwords ni cadenas de conexión.

Login vuelve a acumular intentos inválidos y respeta LockoutUntil aun con contraseña correcta. Reset requiere la política de contraseña existente en Angular, limita el tamaño compatible con BCrypt, guarda hash del token y serializa su consumo. Los tokens antiguos de 36 caracteres se aceptan únicamente si tienen formato GUID D y no expiraron; los nuevos tienen digest de 64. Se verificó que presentar ese digest almacenado como credencial se rechaza. Forgot-password evita respuestas distintas por cuenta inexistente o solicitud activa. No se envió correo real durante las pruebas.

El rate limiter es local por proceso: auth 10/min por IP de conexión y mutaciones sensibles 30/min por usuario autenticado. Cubre login/forgot/reset/refresh, payment/refund, promote, retry y roles/permisos. Devuelve 429 con Retry-After. No confía en X-Forwarded-For del cliente. Tras un reverse proxy se debe configurar su confianza explícita o la cuota anónima puede compartirse entre usuarios. No se añadió infraestructura distribuida.

Se limita el cuerpo HTTP a 32 MiB y se alinea el multipart por defecto con los 5 MiB de DocumentFileOptions. Los logs de Hosting.Diagnostics se filtran para evitar query strings crudas; el logger propio registra plantillas de ruta.

Los catálogos globales permiten lecturas públicas existentes y reservan escrituras a Admin real. Consultas de categorías por alumno/equipo comprueban ownership/representación/academia. Los dashboards comprueban academia y permisos de sección antes de devolver datos: revocar notification.delivery.view o grading.student.view oculta esos datos. La respuesta personal no expone PayloadJson completo.

Se mantiene el wrapper ApiResponder. Los errores de negocio/fixtures conservan su código. Duplicados, concurrencia, deadlocks/lock timeout y eliminación con historial se traducen a 409; FK inválida/check a 422; inesperados a 500 genérico. Los catches legacy repropagan esos conflictos conocidos para que no terminen en un 500 local. No se devuelve SQL, stack ni paths internos.

El navegador usa JWT en Authorization, sin cookies de autenticación de esta API. No se encontró código PHP de bridge en src para ejecutar una prueba CSRF de ese componente externo; ese alcance se marca NO EJECUTADO, no se certifica un bridge ausente. CORS mantiene orígenes explícitos y no combina wildcard con credenciales. Los archivos conservan comprobación de firma binaria, tamaño, MIME, extensión y autorización del recurso.

## Integridad y notificaciones

Se mantienen confirmación/reembolso y allocations en la misma transacción, sin overpayment concurrente; REFUNDED conserva allocations y recalcula cargos. Grados mantiene history + profile atómicos y protección frente a doble promoción. Asistencia y sesiones conservan sus locks e idempotencia. No se persiste OVERDUE. Importes siguen siendo decimal/DECIMAL.

Notification resume el mensaje; Delivery es cada canal. SENT+SKIPPED y todo SKIPPED terminan COMPLETED; SENT+FAILED termina PARTIAL; FAILED+SKIPPED termina FAILED; una entrega pendiente o en curso mantiene PROCESSING. Los estados persistidos ya admitían PARTIAL, por lo que no se reescribieron filas ni checks. Retry ahora hace update condicional atómico y no puede devolver a PENDING un claim ya tomado por un worker. El claim y las llamadas externas siguen separados de transacciones largas. El agregado final toma un lock corto sobre Notification después de enviar, para que dos workers que finalizan canales distintos no dejen un estado PROCESSING obsoleto. Los resultados inciertos no se reenvían automáticamente. SMTP sigue sin poder garantizar exactly-once tras un fallo de red ambiguo.

## Observabilidad

Se reutiliza api_log con actor_user_id y request_id; no hay un segundo audit system. El servicio crea un contexto separado y nunca guarda entidades pendientes del negocio. Descarta cuerpos, query strings y detalles de excepciones enviados por callers legacy. Un fallo del log no reemplaza una respuesta correcta ni revierte una operación. Los endpoints /health se excluyen de la escritura DB del request log, de modo que liveness no dependa indirectamente de MySQL. Teams deja de escribir su archivo paralelo con DTO y excepción completos. El logger de errores no controlados/personas/worker registra tipos y contexto seguro.

X-Request-ID se genera en el servidor y se propaga mediante scopes de ILogger y header. Se registran método, plantilla de ruta, estado y duración. Los instrumentos Bte.Api ofrecen duración y contador de errores sin cardinalidad por persona/ID. No hay exporter nuevo ni Prometheus/Grafana. El monitoreo de pendientes/fallidas sigue en el mantenedor y dashboard existentes; WhatsApp/Push sin configurar siguen SKIPPED.

| Endpoint | Dependencia | Comportamiento |
|---|---|---|
| GET /health/live | Proceso | 200 aunque MySQL esté caído |
| GET /health/ready | MySQL | 200 disponible, 503 indisponible, sin detalles de conexión |
| GET /health | Alias readiness | Mismo criterio |

La configuración crítica se valida antes de aceptar tráfico. Proveedores opcionales no bloquean readiness. La autenticación omite /health para que un header bearer tampoco introduzca una dependencia de BD en liveness. Swagger en Production requiere Swagger:Enabled explícito. La generación OpenAPI se comprobó en el host de prueba; se corrigió una duplicidad real de GET billing/overdue retirando el registro antiguo de AcademyInsights y conservando BillingAndGrading como canónico. El inventario exportado contiene 404 entradas de endpoints de controllers/health, sin duplicados método/ruta normalizada; excluye rutas de prueba. Los hubs se documentan aparte.

El binario real publicable también se inició temporalmente en Production sobre loopback, con conexión a la réplica, JWT efímero y workers deshabilitados. Pasó cinco comprobaciones: live, ready, wrapper 401, capabilities autenticadas (resolución completa de DI) y Swagger deshabilitado. Se detuvo únicamente ese proceso temporal. Readiness puede devolver 503 durante la inicialización fría del modelo EF; luego quedó 200. El servicio de producción no se tocó.

## Performance: evidencia revisada y medida

- Instructor: dos consultas por sesión se reemplazan por dos consultas agregadas para el conjunto. Se acota la lista de hoy a 200; próximas y pendientes a 10.
- Apoderado: se eliminan consultas de alumno/academia/asistencia/saldo/grado dentro del foreach; se cargan por conjuntos y se agregan saldos en SQL. Los historiales siguen acotados a diez por alumno.
- Próximas clases usan fecha/hora local de la academia correspondiente y matrícula vigente, sin hardcodear una zona global.
- Dashboard de academia: montos se agregan en SQL en vez de materializar todos los cargos; conteos de canales se agrupan en una consulta; SENDING se incluye en procesamiento. Pagos usan intervalos UTC derivados de día/mes local, incluyendo medianoche inexistente/repetida por DST.
- Se agregó un solo índice por performance: ix_password_reset_token, no redundante. EXPLAIN antes: ALL, estimación 225 filas; después: ref, estimación 1 fila, Using index. Son estimaciones del optimizador, no mediciones de latencia.
- No se inventan benchmarks ni porcentajes de mejora. Se conservaron paginación/filtros financieros y de notificaciones existentes. No se añadieron índices financieros duplicados.

## SQL, backup y recuperación

Scripts incrementales, en orden: bte_stage_13_history_restrict.sql, bte_stage_13_request_audit.sql, bte_stage_13_reset_token.sql, bte_stage_13_reset_token_index.sql. Ya aplicados una vez en athena_stage4_test. No volver a ejecutarlos allí sin inspección. El esquema operativo sigue SQL-first.

Respaldo `/root/bte-stage13/before-stage13.sql`, SHA256 `77157727e58fed5d14187b46beea9e60c03cb6a5e9dc3134e097dbfd368b4965`. Directorio 700/dump 600. Restaurado en la base NUEVA `athena_stage13_restore_20261018`, sin sobrescribir una existente: 119 tablas, 32 permisos, 64 notificaciones y 64 entregas. La copia de restauración permanece aislada para revisión. No demuestra una política periódica automatizada ni un RPO/RTO contractual.

La [guía de despliegue](academy-stage-13-deployment.md) detalla orden, preservación de secretos/FrontAccess__Key, workers deshabilitados hasta revisar la cola histórica, comprobaciones de health/carrusel y rollback compatible. No se tocó /etc/bte-api.env ni bte-api.service. Las relaciones RESTRICT no deben revertirse automáticamente a CASCADE para volver a un binario anterior.

## Builds, pruebas y regresión

Comandos ejecutados: dotnet restore/build/test, publish Release, npm ci, npm run build, ng test ChromeHeadless, package frontend y runners MySQL/API/JWT. Node local 20.19.0; SDK local 9.0.315 compilando target net8.0; runtime remoto .NET8. .nvmrc y CI quedan en Node20; CI instala SDK8. El primer npm ci falló por atributos ReadOnly en dependencias; se corrigieron los atributos dentro de node_modules y la repetición terminó correctamente. La actualización compatible dejó inicialmente una mezcla de parches que hizo fallar el bundle de tests; se alineó el núcleo Angular/compiler-cli/language-service en 17.3.12, se repitió npm ci y pasaron build y las 427 pruebas.

Backend: 587 pruebas (567 existentes + 20 nuevas) aprobadas. Frontend: 427 (422 existentes + 5 nuevas) aprobadas. Build frontend de producción y SEO/assets /bte/ aprobados. Persisten warnings de compilación previos; no se hizo limpieza cosmética. Una optimización de cache de timezone fue retirada al detectar la prueba existente de cambio de país/override; la suite completa vuelve a respetar esa regla.

| Módulo | Test / validación | Resultado | Observaciones |
|---|---|---|---|
| ETAPA 1 configuración | AcademyConfiguration/Management/Users/Scope/Country/Logo | OK | Suites backend y frontend |
| ETAPA 2 clases | AcademyClass/InstructorCandidate | OK | Scope y estructura existentes |
| ETAPA 3 horarios | ClassSession: generación/reglas de timezone/conflictos | OK | Sin reconstruir agendas |
| ETAPA 4 enrollments | ClassEnrollment/ActiveAcademyMembership | OK | Cupos y membresía |
| ETAPA 5 sesiones | ClassSession | OK | Estado, cancelación, conflictos |
| ETAPA 6 asistencia | ClassAttendance + runner MySQL | OK | 21 comprobaciones MySQL |
| ETAPA 7 planes | BillingPlan + runner MySQL | OK | 18 comprobaciones MySQL |
| ETAPA 8 cargos | BillingCharge + runner MySQL | OK | 36 comprobaciones MySQL |
| ETAPA 9 pagos | BillingPayment + runner MySQL | OK | 66 comprobaciones MySQL |
| ETAPA 10 grados | GradingCalendar + runner MySQL/API | OK | 54 comprobaciones MySQL/API |
| ETAPA 11 avisos | NotificationPipeline + runner ampliado | OK | Runner compartido de 80 comprobaciones con dashboard |
| ETAPA 12 dashboard | Runner ampliado de ETAPA11 | OK | Scope, representados de dos academias, consultas reales, permiso revocado, totales independientes, ruta financiera y timezone |
| Hardening | ProductionHardeningTests + runner ETAPA13 + binario real | OK | 28 comprobaciones MySQL/API, más cinco del binario publicable |
| Legacy eventos/inscripciones/pagos | EventAdministration/Association/Enrollment/Pricing, RegistrationPayment, AvailableCategory | OK | Pruebas disponibles |
| Legacy categorías/brackets/resultados/podios/Scoreboard | CompetitionEngine, FixtureContract/Format/ParticipantAccess, JkaKata, CategoryThirdPlace, Scoreboard, ScoreOnly | OK | Además seis pruebas MySQL fixture/PDF sobre fixtures temporales |
| TicketFactor/RegistrationPricing aislados | No hay runner específico independiente | NO EXISTE TEST | Cobertura indirecta por precios/inscripciones/pagos; no se inventa una prueba dedicada |
| Bridge PHP externo | No disponible en fuente revisada | NO EJECUTADO | No se certifica componente externo |
| Pipeline GitHub | Workflow preparado | NO EJECUTADO en GitHub | Comandos locales ejecutados; gate de dependencias ERROR/BLOCKED por alertas altas reales |
| Producción | Deploy y smoke de producción nuevo | NO EJECUTADO | Preparación y réplica únicamente |

Los logs finales, inventario API, auditoría DB, conteos e hashes se encuentran en `docs/validation/stage13/`. El ZIP es `entregables/bte-frontend-app-20261018-etapa-13.zip`; backend definitivo en `release/stage13-backend-final`, SQL en `release/stage13-sql`. Las carpetas de publicación intermedias no son el artefacto final.

La auditoría DB final conserva 41 TRANSFER_RECEIPT y 23 TRANSFER_REVIEW PENDING, con sus 64 entregas EMAIL PENDING. Outbox, contactos, dispositivos, reglas, templates, preferencias y tablas de grados quedan sin fixtures; se eliminaron solo 36 hechos huérfanos generados por los runners anteriores, limitando el cleanup a la réplica/fecha/entidad inexistente. Grading conserva 18 permisos y 50 asociaciones. Los diez permisos de notificaciones y sus asignaciones siguen intactos. No se borraron logs históricos.

## Dependencias: correcciones y pendientes de cierre

Se ejecutaron npm audit de producción y completo, y dotnet list package --vulnerable --include-transitive contra sus registros. Son alertas de versiones, no explotación demostrada de cada ruta del producto.

- Las actualizaciones compatibles de npm redujeron las alertas de dependencias declaradas de producción de 13 altas/11 moderadas a 9 altas/7 moderadas. Los reportes completos incluyen herramientas de build.
- Piscina se fijó en 4.9.4 y tar en 7.5.21 mediante overrides: el audit completo pasó de dos críticas a cero. Esos pins requieren conservar los builds/pruebas en cada actualización del lockfile. Tar cambia de rama mayor como dependencia de tooling; la instalación y los builds se validan explícitamente.
- Se retiró Microsoft.VisualStudio.Web.CodeGeneration.Design, que no era utilizado por el código de ejecución, junto con tres imports Humanizer sin uso. Esto eliminó Microsoft.Build/System.Text.Json antiguos y las alertas NuGet.Packaging/Protocol del grafo publicable. El backend se publicó en un directorio nuevo para no arrastrar DLL viejas. El scaffolding CLI, si se vuelve a necesitar, debe instalarse como herramienta de desarrollo separada y actualizada.
- NuGet pasó de tres alertas altas y dos bajas a una alta: AutoMapper 12.0.1. Los nueve mapas existentes quedaron con MaxDepth(32), además del límite JSON existente, como mitigación del DoS por recursión. La alerta de versión permanece. El [advisory de AutoMapper](https://github.com/advisories/GHSA-rvv3-g6hj-g44x) indica versiones corregidas 15.1.1/16.1.1; su migración exige revisar API y licencia.
- El audit completo final de npm informa 56 paquetes con alertas: 4 bajas, 24 moderadas, 28 altas, **0 críticas**. El subconjunto omit=dev informa 16: 7 moderadas, 9 altas, 0 críticas. Tailwind y varias transitivas declaradas de producción son herramientas de compilación, no necesariamente código ejecutado en el navegador.

| Pendiente | Severidad | Impacto / alcance | Acción recomendada |
|---|---|---|---|
| Angular common/compiler/core/router 17 | ALTA | Advisories de la rama instalada; la corrección del bypass propio no sustituye el parche del framework | Migrar Angular/CDK/Material/CLI a una rama corregida compatible; npm propone Angular21.2.x; validar Vex y regresión visual |
| Tailwind3 y cadena braces/chokidar/micromatch/fast-glob | ALTA | Principalmente compilación; npm propone cambios mayores de tooling | Migración revisada a Tailwind4/configuración PostCSS compatible, seguida de build y revisión visual |
| AutoMapper12 | ALTA, mitigación aplicada | DoS por recursión de la biblioteca; mapas acotados, paquete aún reportado | Adoptar versión corregida tras revisar API/licencia y validar los mapas |
| Otras alertas de tooling/paquetes | ALTAS/MODERADAS/BAJAS según JSON | Reporte completo disponible; no se certifica exposición de cada advisory | Resolver por cadena de dependencia, sin npm audit fix --force indiscriminado |

El nuevo gate `_script/audit_dependencies.py` recoge ambos feeds y termina con código 1 si quedan alertas HIGH/CRITICAL o falla la consulta. Fue ejecutado y bloquea por las altas pendientes; no se oculta con continue-on-error. La migración mayor de framework/tema no se mezcla silenciosamente con esta corrección incremental.

## Cierre y límites operativos

**ETAPA 13 NO COMPLETA**, conforme al criterio del prompt: las alertas altas de dependencias siguen pendientes y el gate de seguridad no está verde. Builds y pruebas funcionales aprobados no sustituyen ese cierre. No se presenta una certificación de penetración ni de infraestructura externa. La captura/exportación de métricas, ejecución del workflow remoto, rotación de credenciales si hubieran sido divulgadas históricamente y publicación son tareas operativas posteriores; no se ejecutaron silenciosamente. La clave X-FRONT pública del carrusel se conserva y no se considera autenticación de usuario.

No se regeneraron llaves oficiales, no se centralizaron reglamentos y no se introdujo sportAssociationId en Scoreboard. No se avanza a otra etapa ni se crean funcionalidades de negocio.
