# Scoreboard: selección de eventos para admin

Se corrigió el filtro del componente compartido por `/scoreboard`, `/scoreboard/events/:eventId`, mesas de control, tatamis, combates e historial. Una sesión activa con `rol: admin` conserva todos los eventos recibidos aunque tenga `academieId` asociado. Los perfiles de academia mantienen el filtro anterior; una sesión delegada `academy_admin` utiliza el alcance de su academia.

Los mensajes de selección, lista vacía y error distinguen el alcance global del administrador. La selección de áreas y categorías sigue usando el cronograma del evento seleccionado.

La comprobación autenticada de producción confirmó que `GET /api/Events` devuelve los **55 eventos** existentes para un administrador. La causa era el filtro adicional del frontend, por lo que esta corrección no requiere modificar el backend ni la base de datos.

Validación: tres pruebas de regresión aprobadas en Chrome Headless para administrador con academia, administrador de academia y sesión delegada. Se generó el build de producción y el paquete completo para `/app/`.

[Descargar frontend corregido](https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261031-scoreboard-admin.zip). Instalar su contenido directamente en `/app/` siguiendo `LEEME.txt` y recargar con Ctrl+Shift+R. El paquete anterior se conserva y la instalación del frontend continúa siendo manual.

Paquete: 9.595.699 bytes. SHA-256: `e94b5d437e8434960e885d9d6a46c6a4becbcf64e44f617ad77e56c6e58f65f7`. La descarga pública se verifica por HTTPS contra el mismo checksum; el bundle verificado del dashboard es `4261.a406055c4350f095.js`.
