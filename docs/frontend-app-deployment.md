# Destino obligatorio del frontend

El frontend de producción se compila y se empaqueta siempre para `https://budotournaments.net/app/`, por indicación del usuario. Esta decisión sustituye las referencias anteriores a `/bte/`.

`angular.json` establece `/app/`. La compilación, la validación SEO y el empaquetador rechazan bases distintas; no se debe corregir únicamente el HTML después de compilar. Apache, redirecciones, canonical, imágenes sociales, sitemap y reglas sugeridas de robots usan `/app/`.

```powershell
npm run build
npm run package:front
```

Para instalar, respaldar la carpeta `app` del hosting y extraer allí todo el ZIP, incluidos archivos ocultos. Subir primero los assets y los bundles, y sustituir `index.html` al final. No dejar una subcarpeta adicional dentro de `app`. La API continúa en `https://apidemo.budotournaments.net/api`.

La corrección del 18/10/2026 se entrega en `bte-frontend-app-20261018-etapa-13-app.zip`, que sustituye para instalación al paquete anterior de ETAPA 13 preparado para `/bte/`.
