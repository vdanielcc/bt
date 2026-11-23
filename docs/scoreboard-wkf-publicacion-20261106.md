# Publicación WKF del 6 de noviembre de 2026

Se compiló nuevamente la API y se comparó su SHA-256 con `/opt/bte-api/publish/bte.api.dll` en `159.223.129.162`: ambos coinciden en `46688c89b1784ba59cfc31646c465db19199787ffccccb17cd694994dcaa9354`. La API ya contenía los cambios de auditoría instalados el 5 de noviembre; no hay modificaciones posteriores del backend ni migraciones de esquema pendientes en esta entrega.

Se verificó la tabla `wkf_scoreboard_bouts` y sus columnas de estado, revisión, historial, operaciones y operador. La comprobación autenticada y de solo lectura confirmó 200 en salud, carrusel público con el origen y encabezado frontend configurados, catálogo WKF, snapshot e historial. No se alteraron datos, llaves ni configuración de producción.

El frontend incluye selector y avance de categorías del tatami, categorías finalizadas en rojo suave, display que sigue el cambio de categoría, modal de tiempo médico, controles laterales, faltas acumulativas y marcas blancas/doradas. Compilación de producción para `/app/` y verificación del paquete completadas.

Paquete: `bte-frontend-app-20261106-wkf-categorias.zip`, 9.621.629 bytes. SHA-256: `e45305259211b6aece761bb32115ef1a0be277716142f8bd8f865b10b9263c70`.

La evidencia de publicación y verificación HTTPS queda en `.release-wkf-app-20261106-categorias/publication-result.json`, obtenida desde `/root/bte-wkf-categorias-20261106/publication-result.json` al finalizar la publicación. La instalación del frontend en el hosting es manual: extraer todo el ZIP directamente en `/app/`, incluyendo `.htaccess` y `assets/`.
