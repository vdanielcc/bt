# Formato Kata JKA

Código persistido: `KATAJKA`. Se configura en el formato de llaves de la categoría.

- Entre 1 y 5 inscritos: una ficha individual por deportista, con casillas vacías J1–J5.
- Desde 6 inscritos: rondas AKA rojo / SHIRO blanco hasta quedar 5 o menos. Un participante libre avanza sin combatir.
- Ejemplos: 6 → 3 fichas de puntajes; 7 → 4 (incluye un libre); 11 → 6 → 3; 17 → 9 → 5.
- No se calculan notas, ganadores por puntaje ni desempates. Las cinco casillas son para anotación manual.
- Las vistas del resumen y de invitaciones usan el mismo componente de presentación. Las exportaciones PDF representan los mismos encuentros y fichas oficiales, con referencias al encuentro de origen cuando aún no hay un clasificado identificado.
- El formato y las conexiones se guardan por versión. Abrir invitaciones o exportar una versión existente no reconstruye sus encuentros.

## Publicación

Cambios preparados localmente; no se ejecutó ninguna migración ni despliegue en el servidor durante este trabajo.

La API y el frontend deben publicarse junto con la migración `20261014010000_AddKataJkaFixtureType`, que añade el valor `KATAJKA` a `category.type` y `fixture_versions.fixture_type`. Respaldar ambas tablas antes de aplicarla en producción. La migración no convierte versiones existentes. Su reversión automática se rechaza para evitar eliminar formatos de versiones oficiales.

Para una categoría con una versión anterior, seleccionar Kata JKA y usar Refrescar crea una nueva versión. Las versiones anteriores se conservan.

## Verificación

- 22 pruebas .NET de formatos, generación, avance de libres, validación de clasificados, guardado y PDF: correctas.
- 21 pruebas Angular de presentación Kata JKA, guardado de conexiones, PDF, formatos existentes e invitaciones: correctas en Chrome Headless.
- Compilación Angular con `ngc --noEmit`: correcta.

Comandos:

```powershell
dotnet test backend-production/tests/bte.api.Tests/bte.api.Tests.csproj --no-restore --filter 'FullyQualifiedName~FixtureFormatTests|FullyQualifiedName~JkaKataFixtureTests' --verbosity quiet -p:WarningLevel=0
node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadlessKata --karma-config=_script/karma-kata-jka.cjs --include=src/app/pages/championships/my-events/kata-jka-fixture.spec.ts --include=src/app/pages/championships/my-events/fixture-formats.spec.ts --include=src/app/pages/championships/my-events/tournament-fixture-pdf.spec.ts --include=src/app/pages/championships/invitations/event-detail-fixture.spec.ts
node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js --noEmit -p tsconfig.app.json
```
