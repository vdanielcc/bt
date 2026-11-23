# Publicación del 08/10/2026

Se publicó la migración aditiva de tarifas por combinación en la base activa `zeuz`, obtenida desde la configuración protegida del servicio. Se conservaron las 52 filas de eventos, 9544 inscripciones, 337 filas de pagos y 259 cálculos previos. No se activaron reglas de combinaciones en eventos existentes.

Antes de aplicar la migración se respaldaron y verificaron la base completa, los archivos de la API y `/etc/bte-api.env`. Los archivos permanecen privados en `/opt/bte-api/deploy-combination-pricing-20261008/backup`. El manifiesto contiene tamaños y SHA-256. Se restauró el respaldo en `bte_combination_20261008_test`, se comprobaron los conteos de 109 tablas y se validó la migración completa.

El backend publicado coincide con el artefacto local: SHA-256 `ea18eb31cf5c50572e04ebcd915eff14b450f53c5c09a02f502c2ee9b72d4cbe`. Se reinició `bte-api.service`, que quedó activo. `GET /api/Events/upcoming` respondió 200 usando Origin y X-FRONT; se verificó CORS y se conservó la configuración del servicio.

Pasaron 66 pruebas de backend, 26 de frontend, la validación AOT y la compilación Angular de producción.

Frontend compilado con base `/app/`, API de producción y reglas de navegación Apache. Descarga verificada mediante HTTP 200 y SHA-256:

- https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261008-tarifas.zip
- SHA-256: `dfc766ac674c24b57ee1ea4da1434baef7cf00357f5d9c8abd9c6305996179cd`
- Tamaño: 9086056 bytes.

La sustitución de los archivos en `https://budotournaments.net/app/` está pendiente del acceso al alojamiento de ese dominio. El servidor SSH recibido aloja la API y las descargas; no aloja ese sitio.

## Corrección del selector de tipo de cálculo

El formulario de tarifas observa el control `calculationTypeId` y actualiza un estado reactivo que determina las secciones visibles. El cambio entre categorías, grupos y combinaciones conserva las reglas aún no guardadas. Pasaron las 11 pruebas de tarifas, incluida una prueba con el selector Angular Material real, la validación AOT y la compilación de producción.

Paquete actualizado para `/app/`: `bte-frontend-app-20261008-selector-tarifas.zip`. Sustituye al paquete anterior para instalar esta corrección; el paquete anterior permanece disponible.

Descarga: https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261008-selector-tarifas.zip

SHA-256: `83aee95486551d149278da5b846315a0ec249a85c95bca8c8cc954c565b8243e`.

## Corrección del bloqueo al agregar combinaciones

Se detectó que el getter de modalidades creaba un nuevo arreglo con objetos nuevos en cada revisión de la vista. Los selectores de modalidad reconstruían continuamente sus opciones. La lista ahora se calcula al cargar la configuración y las opciones se identifican por su ID mediante `trackBy`.

La prueba de interfaz hace clic en «Agregar combinación», espera la estabilidad de la pantalla, comprueba que las opciones conservan su identidad y recorre los tres tipos de cálculo. También cubre 74 categorías, tres modalidades y detección automática de cambios.

Paquete corregido: `bte-frontend-app-20261008-tarifas-sin-bloqueo.zip`, compilado para `/app/`. Debe sustituir las versiones anteriores del frontend en el alojamiento del sitio.

La fecha de recepción del comprobante en el sistema determina si llegó antes del cierre de preventa; requiere aprobación del organizador. Los pagos históricos sin lote se conservan en el resumen global y no reciben asignación automática por deportista.

Para revertir la versión del backend puede restaurarse el archivo `api.tar.gz` y reiniciar el servicio, manteniendo las columnas y tablas aditivas. Una restauración completa de la base requiere una ventana de mantenimiento y conservar primero cualquier dato nuevo posterior al respaldo.
