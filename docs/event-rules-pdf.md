# Bases de eventos en PDF

En `/app/admin/events`, seleccionar un evento y adjuntar las bases en la sección «Bases del evento». Solo se aceptan PDF de hasta 15 MB. El archivo se envía al pulsar «Actualizar evento»; seleccionar un archivo no modifica todavía el evento.

La actualización de eventos, exclusiva de administradores, recibe `rulesDocumentBase64`. La API verifica el límite de tamaño, la cabecera `%PDF-` y la marca final `%%EOF`. Guarda el archivo bajo `Storage:BasePath` y persiste una ruta relativa `/events/{id}/{año}/{mes}/rules/rules-{guid}.pdf` en `event.rules_document`. No requiere migraciones de base de datos. Al editar otros campos sin adjuntar otro PDF, conserva las bases actuales.

La descarga pública devuelve `application/pdf`, admite solicitudes por rango y comprueba que la ruta corresponda a las bases actuales del evento. Los enlaces del mantenedor y del detalle público se resuelven contra el dominio de la API. Al reemplazar un PDF, la ruta anterior deja de estar disponible mediante ese endpoint.

Verificación: pruebas de administración de eventos con persistencia y lectura del PDF, conservación al editar otros datos, reemplazo, aislamiento entre eventos, rechazo de rutas arbitrarias, contenido inválido y archivos mayores al límite. Compilar frontend para `/app/` y publicar la API antes de instalar el frontend manualmente. Respaldar la publicación existente y verificar el carrusel público con `Origin` y `X-FRONT` después del reinicio.

## Publicación del 9 de noviembre de 2026

API publicada y servicio activo. Carrusel público con `Origin` y `X-FRONT`: 200; consulta autenticada del evento 51: 200; actualización con contenido PDF inválido: 400, conservando las bases anteriores. Se preservaron entorno, configuración y dependencias. Pasaron las 15 pruebas locales de administración y la compilación de producción del frontend.

Respaldo: `/root/bte-event-rules-20261109/backup/`. Evidencias remotas: `deployment-success.json` y `frontend-download.json` en el mismo directorio de despliegue. El primer intento se revirtió al comprobar Swagger, deshabilitado en producción; el segundo validó directamente el endpoint de actualización.

Frontend para instalación manual en `/app/`: https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261109-bases-pdf.zip. SHA-256: `039e56eb657c388f204c283b4459df4654ae99c652acddc9ad33974fc553e51f`. Descarga HTTPS verificada. La publicación del ZIP no instala el frontend en el hosting de budotournaments.net.

## Confirmación de persistencia del PDF

El usuario informó que el evento 59 mostraba éxito al guardar, sin bases visibles. Se confirmó una petición PUT con respuesta 204 en producción, mientras `event.rules_document` seguía en NULL. No se registran cuerpos de petición, por lo que este dato no permite determinar si el navegador envió el archivo. No se ha reproducido todavía el fallo con el PDF del usuario.

Se reforzó el frontend: después de enviar un PDF, vuelve a consultar el evento y exige una ruta no vacía y diferente de la anterior antes de anunciar éxito. Si la confirmación falla, conserva el PDF para reintentar. Un archivo rechazado bloquea el guardado y el botón espera a que termine la lectura del PDF. Pasaron 16 pruebas de frontend, incluidas selección, transmisión, respuesta 204 sin persistencia y reemplazo sin cambio de ruta, junto con la compilación de producción.

## Corrección del selector PDF

Las capturas del usuario mostraron el rechazo previo al envío y el borrado del nombre del archivo. Se separaron los errores de extensión, archivo vacío, tamaño y contenido. El selector conserva el nombre y no depende del MIME proporcionado por Windows: permite metadatos genéricos si la extensión y el contenido corresponden a PDF. El límite aumentó de 3 a 15 MB en frontend y API. La petición de actualización admite hasta 26 MB para incluir el PDF codificado en Base64 y un póster de hasta 3 MB, dentro de los límites existentes de nginx y Kestrel.

Pasaron 18 pruebas de frontend y 17 de administración de eventos en la API, incluidas las cargas de PDF de 4 MB y 15 MB y el rechazo por encima de 15 MB. Se conserva la comprobación de persistencia antes de mostrar éxito. El tamaño y MIME del archivo original del usuario no se obtuvieron a partir de las capturas, por lo que no se atribuye su rechazo a una causa específica.
