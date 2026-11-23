# Publicación de “Ingresar como” — 20/10/2026

## Corrección del botón lateral “Cambiar de cuenta”

El botón lateral conservaba el elemento visual de la plantilla sin un evento de
clic. Se conectó al mismo selector de academias del menú superior y se convirtió
en un botón accesible, disponible únicamente para `admin`.

Nueve pruebas de navegador aprobadas, incluyendo clic real sobre el botón,
apertura del diálogo, carga y búsqueda de academias y ocultación para otros roles.
Compilación de producción y validación del paquete para `/app/` aprobadas.
Esta corrección solo cambia el frontend; no reemplaza el backend desplegado.

Paquete corregido:
https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261020-cambiar-cuenta-fix.zip

Tamaño: 9.559.718 bytes. SHA256:
`167bb661595af7748f5d9c0ef11265740b0566c86aa8971574ef929b5b902f08`.
Instalar el contenido completo en `/app/` del hosting del frontend y recargar
sin caché. Los archivos anteriores de descarga se conservan.

## Publicación inicial

Backend publicado por solicitud expresa del usuario en `159.223.129.162`, servicio
`bte-api.service`, API `https://apidemo.budotournaments.net/`.

Compilación Release de .NET 8 y frontend Angular de producción con base `/app/`.
Pasaron 61 pruebas de autenticación, acceso delegado y permisos de academia; las
15 pruebas de frontend de autenticación, interceptor y búsqueda también pasaron.
El empaquetador verificó recursos, fuentes, iconos, SEO, redirecciones y ausencia
de source maps.

El respaldo del backend completo, base `zeuz`, entorno y unidad systemd está en
`/root/bte-admin-impersonation-20261020/backup/`, fuera del directorio público.
El dump consistente se descomprimió y validó; el archivo del backend se leyó por
completo. `manifest.json` registra tamaños y hashes. No se ejecutaron migraciones
ni se modificaron configuración, contraseñas, fixtures o variables de entorno.

El primer intento revirtió automáticamente porque el verificador intentaba
interpretar la respuesta textual `Healthy` como JSON. Se corrigió el verificador
y la publicación definitiva terminó correctamente a las 17:45:32 UTC
(14:45:32 en America/Santiago). Se preservaron la configuración y los archivos
persistentes del servidor.

SHA256 de `bte.api.dll` desplegado:
`3d906e2757eb6a905c61fb6c91964247cd6e158c7b59b11a9c9ae5512f20474a`.
Versión anterior:
`c4b5d8d2dfaa36d765edf379065af0d8cda5ddc348b9c73b6f3427def568e59a`.

La auditoría de acceso delegado usa metadata persistente: `ActorUserId`, ID de
solicitud y una ruta con academia y usuario destino. No depende de cuerpos HTTP,
que el servicio de logs elimina deliberadamente. Se verificó en la base productiva
que el acceso de prueba quedó registrado con su actor.

Comprobaciones HTTPS de producción:

- `/health/live`, `/health/ready` y `/api/Events/upcoming`: 200. Carrusel con
  `Origin: https://budotournaments.net` y `X-FRONT` configurado.
- Selector de academias autenticado como administrador: 200.
- Acceso delegado sin autenticación: 401; academia inexistente: 404.
- Sesión real `academy_admin` emitida por el endpoint: dashboard 200.
- Intento de nuevo acceso delegado desde `academy_admin`: 403.
- Renovación del token delegado y consulta posterior de dashboard: 200.
- Revocación del refresh token de verificación al terminar: 200.

La credencial temporal de verificación se mantuvo exclusivamente en memoria del
servidor. No se guardaron tokens ni claves en los artefactos o reportes.
El reporte remoto definitivo está en
`/root/bte-admin-impersonation-20261020/deployment-success.json`.

## Frontend para `/app/`

Paquete: `entregables/bte-frontend-app-20261020-ingresar-como.zip`.
Tamaño: 9.559.521 bytes.
SHA256: `734028adb381ec30dfbe66d42bbd7a06f7a922bf53461996912ca51e76e5a89c`.

Descarga pública:
https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261020-ingresar-como.zip

Descarga HTTP 200 verificada desde el servidor y desde una conexión externa;
ambas verificaciones coincidieron con el tamaño y SHA256 local. El checksum
también está disponible añadiendo `.sha256` a la URL del ZIP.

El ZIP contiene `.htaccess`, recursos y `LEEME.txt`. Extraer su contenido completo
directamente en la carpeta `/app/` del hosting del frontend, después de respaldar
la instalación existente. Publicar `index.html` al final.

El servidor recibido aloja API y descargas, sin un virtual host de
`budotournaments.net`. La disponibilidad del ZIP no instala el frontend en ese
hosting separado.
