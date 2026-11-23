# Analítica de visitas

Tablas propias en el MySQL existente: `analytics_sessions` y `analytics_page_views`.
La migración aditiva está en `backend-production/sql/analytics.sql`; no modifica tablas del negocio.

## Definición de métricas

- Visitantes únicos: una persona autenticada (ID de usuario) o navegador anónimo (UUID persistente) por día calendario de `America/Santiago`.
- Regresos: sesiones distintas tras 30 minutos sin actividad. Navegar o recargar dentro de ese período conserva la sesión. Tres sesiones de un visitante se almacenan separadas y cuentan como un visitante diario.
- Recorrido: una fila por entrada a una ruta, con orden temporal. Se excluyen los parámetros de consulta y fragmentos de URL.
- Permanencia: tiempo con la página visible, detenido al ocultarla o superar 30 minutos sin interacción. Se envía acumulado cada 15 segundos y en cambios de visibilidad/navegación; los reintentos no incrementan dos veces el tiempo.
- Tiempo promedio: suma del tiempo activo de las páginas del día dividida por sus sesiones distintas, incluidas las sesiones con tiempo cero.
- Gráfica: distribución horaria de la primera visita de cada visitante en ese día. La suma de las barras coincide con el contador diario.
- Una sesión que atraviesa medianoche registra nuevas páginas para el día siguiente. El cambio de día se detecta en el siguiente envío o interacción.

## API y frontend

`POST /api/analytics/visit` recibe UUID de visitante/sesión/página, ruta y milisegundos acumulados. Requiere la clave frontend y origen de producción. Si hay JWT válido, el ID de usuario se obtiene exclusivamente del token; el cliente no puede declarar el usuario.

`GET /api/analytics/today` exige autenticación y devuelve fecha, zona horaria, visitantes únicos, sesiones, permanencia promedio y 24 valores horarios. Solo expone agregados; no hay endpoint público para consultar recorridos individuales.

`AnalyticsService` se inicia una vez desde `AppComponent`. Usa peticiones independientes del flujo funcional, con `keepalive`; un fallo de registro no impide navegar. El UUID de visitante sobrevive al cierre de sesión. Los datos en memoria sirven como alternativa si el almacenamiento del navegador está bloqueado.

La tarjeta de Analytics consulta los agregados cada minuto. Presenta visitantes únicos, sesiones y permanencia promedio; elimina los datos de ejemplo de esa tarjeta.

## Límites prácticos

La permanencia es aproximada: cierres abruptos, pérdida de conexión, bloqueadores o suspensión del dispositivo pueden impedir el último envío. El tiempo visible no prueba atención humana. Sin identificación de usuario, dispositivos o navegadores distintos cuentan por separado. No se guardan IP, correo, contenido de formularios ni cada clic.

Los registros comienzan cuando se instale la próxima compilación del frontend. No hay datos históricos anteriores al seguimiento. Esta entrega no compila ni publica el frontend.

## Operación

El despliegue crea un respaldo completo de MySQL, API, servicio y entorno en `/opt/bte-api/deploy-analytics-20261010/backup`. La migración y las pruebas de integración se ejecutan primero en `bte_analytics_20261010_test`, restaurada desde ese respaldo. La API se revierte automáticamente si falla la comprobación del despliegue; las tablas aditivas se conservan para evitar perder registros.

No se instala otra base de datos ni se requiere un servicio adicional. Por ahora se conservan los recorridos sin eliminación automática; antes de introducir una política de retención debe definirse cuánto historial necesita el negocio.

## Usuarios en línea y configuración

La segunda tarjeta muestra la fecha actual de Chile y los usuarios autenticados en línea, deduplicados por ID aunque tengan varias sesiones o pestañas. Solo cuentan cuentas activas con un envío activo durante los últimos 90 segundos. El margen permite detectar cierres abruptos: ocultar la página, cerrar sesión o perder conexión deja de renovar la presencia y el usuario desaparece cuando vence ese margen. Los visitantes anónimos siguen participando en la métrica diaria, pero no en usuarios autenticados en línea.

`GET /api/analytics/online` exige autenticación y entrega `onlineUsers`, `date`, `asOf`, `timeZone`, `refreshSeconds` y `onlineWindowSeconds`. La gráfica conserva hasta 12 muestras reales tomadas mientras la tarjeta está abierta; no representa un historial anterior a abrirla.

En `/opt/bte-api/publish/appsettings.json`, la sección configurable es:

```json
"Analytics": {
  "OnlineRefreshSeconds": 300,
  "OnlineWindowSeconds": 90
}
```

`OnlineRefreshSeconds` admite de 5 a 86400 segundos; `OnlineWindowSeconds`, de 30 a 3600. Valores ausentes o inválidos usan 300 y 90 respectivamente. Cada respuesta comunica el intervalo vigente y el frontend programa la siguiente consulta con ese valor. Un cambio de configuración se adopta en la siguiente consulta, sin recompilar el frontend. Se conserva la precedencia estándar de ASP.NET: la configuración específica del entorno y las variables `Analytics__OnlineRefreshSeconds`/`Analytics__OnlineWindowSeconds` pueden sobrescribir appsettings.

No requiere tablas ni columnas nuevas. `analytics_sessions.last_seen_at` representa ahora el último envío activo; los pulsos ocultos o inactivos no lo renuevan. Las páginas conservan su fecha de último registro y permanencia acumulada como antes. El respaldo de este cambio se guarda en `/opt/bte-api/deploy-online-users-20261010/backup` e incluye el appsettings anterior.

## Validación

La prueba reproducible está en `backend-production/tests/analytics-smoke`. Exige `BTE_ANALYTICS_TEST_CONNECTION` con la base exacta `bte_analytics_20261010_test` y las tablas de analítica inicialmente vacías. Comprueba validación de clave/origen/ruta, visitantes únicos, sesiones separadas, recorrido, permanencia acumulada idempotente y unión de identidad autenticada entre navegadores.

El frontend se revisó por sintaxis, imports y enlaces de datos de la tarjeta, sin compilarlo. La validación de tipos y navegador se realizará cuando se autorice su compilación.

## Resultado productivo (10 de octubre de 2026)

API publicada: SHA-256 `04ca569f8d15f189876d271d82f4810db18b51d3a482a1fa444e43b491f30705`.
Respaldo completo verificado y restaurado en la base de pruebas. La prueba relacional pasó. Se comprobaron el servicio activo, la conservación de los endpoints previos, el carrusel público (`200` con Origin/X-FRONT), la protección de agregados (`401` sin sesión) y el rechazo de una clave de seguimiento inválida (`401`). Una visita real de verificación recibió `204`, creó su registro y fue eliminada junto con su sesión.

La migración se aplicó con la cuenta administrativa local de MySQL; la cuenta de la aplicación conserva sus permisos existentes. No se modificó el archivo de entorno. El frontend queda pendiente de compilación e instalación manual por instrucción del usuario.

La mejora posterior de usuarios en línea se publicó con API SHA-256 `5f42a46e5fcb6e997e9d8a82897bc7b57a931182d00f2c41a039a8ea1f9b4cdb`. El respaldo está en `/opt/bte-api/deploy-online-users-20261010/backup`. Se agregó la sección `Analytics` al appsettings existente conservando los valores de las demás secciones; se normalizó el formato con comentarios a JSON estándar. Se verificaron los endpoints previos, el carrusel público, el seguimiento real y la protección del nuevo endpoint. Las pruebas aisladas incluyen presencia deduplicada, vencimiento, reactivación, pulsos inactivos/anónimos y configuración dinámica con valores válidos e inválidos. No se modificó el esquema de MySQL ni se compiló el frontend.
