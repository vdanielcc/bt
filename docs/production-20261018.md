# Publicación de producción — 18/10/2026

Corrección posterior del destino del frontend: por indicación del usuario, todas las entregas deben compilarse para `/app/`. Usar `bte-frontend-app-20261018-etapa-13-app.zip` (9.560.651 bytes, SHA256 `dd24eae6f12642a37c823bc6913a42e5b50703b3be1645efe8203b93d412c077`) en lugar del paquete anterior para `/bte/`. Descarga: https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261018-etapa-13-app.zip. Base, assets, Apache, redirecciones, SEO y sitemap validados. Ver `docs/frontend-app-deployment.md`. No se modifica nuevamente BD ni backend por esta corrección.

Por solicitud expresa del usuario se publicaron la base `zeuz` y el backend hasta ETAPA 13 en `159.223.129.162`. API: https://apidemo.budotournaments.net/. La publicación no resuelve las alertas altas de dependencias ya documentadas; el cierre de seguridad de ETAPA 13 sigue pendiente.

Se creó un respaldo consistente de MySQL (rutinas, triggers y eventos), backend completo, entorno y unidad systemd en `/root/bte-production-stage13-20261018/backup/`, fuera del árbol web. El directorio de despliegue tiene permisos 700 y la copia del entorno permisos 600. `manifest.json` registra SHA256. Se restauró el dump en una base nueva `zeuz_stage13_predeploy_20261018`; las trece migraciones pasaron allí antes de modificar producción y conservaron los conteos de negocio.

Se aplicaron en orden los scripts `bte_stage_7_billing_plans`, `8_billing_charges`, `8_charge_state_corrections`, `9_billing_payments`, `9_refund_transaction_corrections`, `10_grading`, `10_grading_permissions`, `11_notifications`, `11_notification_permissions`, `13_history_restrict`, `13_request_audit`, `13_reset_token` y `13_reset_token_index`. No se regeneraron llaves, fixtures ni sesiones y no se realizaron operaciones financieras de prueba.

El primer intento volvió automáticamente al binario anterior porque una comparación contra el respaldo detectó una persona adicional creada mientras producción seguía activa. No se restauró la base ni se perdió esa fila. Se corrigió la comprobación para usar conteos tomados al detener el servicio y permitir altas concurrentes; se retomó la publicación sin repetir DDL. La publicación definitiva y sus verificaciones quedaron registradas en `deployment-success.json` y `postdeploy.json` del directorio remoto.

Backend instalado desde `release/stage13-backend-final`, SHA256 de `bte.api.dll`: `c4b5d8d2dfaa36d765edf379065af0d8cda5ddc348b9c73b6f3427def568e59a`. Se conservaron configuración de aplicación y archivos persistentes. Las DLL antiguas que no pertenecen al nuevo paquete se trasladaron al directorio protegido `retired-runtime`, con listado para reversión. Se reinició `bte-api.service`.

Antes de editar `/etc/bte-api.env` se guardó su respaldo. `FrontAccess__Key` coincide con el frontend y `BackgroundJobs__NotificationsEnabled=false` mantiene deshabilitado el worker. La cola histórica conserva 64 entregas: 63 PENDING y una PROCESSING, con último intento durante la ventana de despliegue y sin `sent_at`. No se reintentó ni se canceló esa entrega de resultado indeterminado. Revisar la cola y el proveedor antes de habilitar envíos.

## Verificaciones

- `/health/live`, `/health/ready` y `/api/Events/upcoming`: HTTP 200; carrusel comprobado con Origin y X-FRONT configurados.
- Quince consultas autenticadas de lectura: permisos de notificaciones y grados; conceptos de cobro; clases, sesiones, dashboard, planes, cargos, pagos, vencidos, opciones y sistemas de grados, reglas, historial y entregas de notificaciones: HTTP 200.
- Swagger público: 404. Conceptos de cobro sin credencial: 401.
- Ocho claves foráneas de historial con ON DELETE RESTRICT.
- No se guardó ni imprimió el token temporal de verificación del administrador existente; no se modificaron cuentas para realizar las consultas.

El limitador de autenticación sigue usando la IP de conexión detrás de nginx: la configuración de proxies confiables queda pendiente, por lo que los clientes anónimos pueden compartir cuota. Las alertas altas de Angular y AutoMapper siguen abiertas y no deben presentarse como corregidas por publicar.

## Frontend descargable

Se publicó y descargó por HTTP 200 verificando integridad:

https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261018-etapa-13.zip

Checksum: https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261018-etapa-13.zip.sha256

Tamaño: 9.560.656 bytes. SHA256: `5146a131eae6fe605d93ebedcd5664e1de2c5bd9b3f14ea7b5f5059807360d0c`. ZIP sin source maps y con base `/bte/`.

La instalación en https://budotournaments.net/bte/ queda pendiente de una conexión al hosting de ese dominio, distinto del servidor de la API. La descarga pública no sustituye esa instalación. Se solicitó identificar una conexión existente; no se dispone de credenciales de ese hosting en los scripts revisados. Antes de instalar, respaldar la carpeta web, incluir archivos ocultos y conservar los archivos de otras aplicaciones.
