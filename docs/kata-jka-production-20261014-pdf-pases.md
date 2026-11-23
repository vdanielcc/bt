# Publicación Kata JKA — PDF y pases automáticos

Fecha: 14 de octubre de 2026, Chile.

Backend publicado en `apidemo.budotournaments.net`. Incluye:

- Pases automáticos sin repetir al deportista en posiciones anteriores.
- Proyección de versiones antiguas sin duplicar nombres, conservando sus registros y conexiones oficiales.
- PDF compacto en una página cuando cabe y división por pools para categorías mayores.
- Configuración de página conservada y fichas de solo puntajes al 50% del ancho.
- Reordenamiento manual de Kata JKA con el comportamiento de eliminación directa.

No se ejecutaron migraciones ni se regeneraron fixtures durante la publicación.

## Respaldos

Servidor: `/opt/bte-api/deploy-kata-jka-20261014-pdf-pases/backup`.

Incluye base de datos completa `zeuz`, publicación anterior, `/etc/bte-api.env` y manifiesto con hashes. Se comprobaron los archivos comprimidos antes de instalar.

SHA-256 de la DLL instalada:

```text
d876c8f6d4dc7a162640aad6cbe062b2ce2b7a5b15cab27b28544011a4962a3b
```

## Frontend manual

`entregables/bte-frontend-app-20261014-kata-jka-pdf-pases.zip`

Tamaño: 9.480.819 bytes. Base de despliegue: `/app/`.

SHA-256:

```text
57355b5d8023ebcbc8454c3a4f498ef4a4dd26d3c1858e60b0ff8027b01d16b5
```

Respaldar el frontend actual y extraer el contenido del ZIP dentro de `app/`, incluyendo `.htaccess` y `assets/`. Consultar `LEEME.txt` para los archivos de la raíz del hosting. No se publicó automáticamente el frontend.

Compilación de producción y validación SEO correctas. El ZIP se comprobó tras empaquetar y no contiene mapas de código fuente.
