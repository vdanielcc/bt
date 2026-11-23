# Rutas de Angular en producción

El 404 de nginx al abrir o recargar `/bte/dashboards/analytics` ocurre antes
de ejecutar Angular. El servidor debe entregar `/bte/index.html` para las
rutas de la aplicación; entonces el guard valida la sesión y muestra el login.

Integrar este bloque en el `server` HTTPS de `budotournaments.net`, conservando
la configuración de las otras aplicaciones. Este ejemplo usa `root` y supone
que el directorio `bte` está dentro del root existente del sitio. Si el sitio
usa `alias`, adaptar la ruta física antes de aplicar el bloque.

```nginx
location = /bte {
    return 301 /bte/;
}

location /bte/ {
    try_files $uri $uri/ /bte/index.html;
}
```

Antes de editar, respaldar el archivo de configuración activo. Confirmar que
`/bte/index.html` existe en el root configurado y revisar que ningún bloque
más específico intercepte las rutas de Angular. Ejecutar `sudo nginx -t` y,
solo si es correcto, `sudo systemctl reload nginx`.

Validar tras publicar el frontend:

- `/bte/`, `/bte/login` y `/bte/dashboards/analytics` entregan el HTML con HTTP 200.
- Sin sesión o con JWT vencido, abrir y recargar la ruta del dashboard muestra el login.
- Con sesión válida, el dashboard sigue disponible al recargar.
- Con el dashboard abierto, al vencer el JWT vuelve al login sin recargar el documento.
- Al regresar a una pestaña suspendida con sesión vencida, aparece el login.

Esta configuración está preparada para su integración; no se ha aplicado al servidor.
