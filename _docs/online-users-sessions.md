# Usuarios en linea

El boton de la tarjeta de analitica esta disponible para admin. Consulta GET /api/analytics/online/users y permite POST /api/analytics/online/users/{userId}/logout con confirmacion. El cierre afecta todos los dispositivos de esa cuenta; no desactiva al usuario ni permite cerrar la propia cuenta desde la lista.

El tiempo mostrado transcurre desde el inicio de la sesion de analitica activa mas antigua de cada usuario (no representa necesariamente la hora de login). La presencia mantiene la ventana configurada en Analytics:OnlineWindowSeconds. El dialogo consulta cada 15 segundos.

Antes de desplegar el backend, aplicar la migracion EF 20261022000100_RevokeUserSessions (columna nullable users.sessions_revoked_at). Publicar frontend y backend. Los JWT anteriores al cierre quedan rechazados en la siguiente solicitud autenticada y los refresh tokens quedan revocados. Una nueva autenticacion permite volver a ingresar.

Migracion y backend publicados el 22/10/2026. Respaldo verificado: /root/bte-cronograma-sesiones-20261022/backup. Frontend disponible para descarga manual: https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261022-cronograma-sesiones.zip
