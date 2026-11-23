# Formato de llaves: Solo Puntaje

Nueva opción `SOLOPUNTAJE` en el selector del resumen de evento y en la administración de categorías. La planilla muestra un participante por fila, su academia y cinco casillas J1–J5 para anotación manual. No calcula totales ni clasifica ganadores, ni introduce reglas de una asociación deportiva.

Se conserva el comportamiento de versiones oficiales: cambiar el formato no reescribe las llaves guardadas. Seleccionar **Solo Puntaje**, confirmar el cambio de categoría y usar **Refrescar** para crear explícitamente una nueva versión. Abrir o exportar una versión existente utiliza sus filas guardadas. La opción de formato continúa siendo global a la categoría compartida, con los permisos y confirmación existentes.

## Implementación

- `ScoreOnlyFixture` genera una sola ronda con una fila individual por inscrito; admite uno o más participantes, también grupos de más de cinco. Sin rivales, enlaces, BYE ni ganador automático.
- Validación de guardado impide participantes duplicados, ajenos o faltantes y estructuras eliminatorias. Se reutilizan el servicio de versiones y los permisos del organizador.
- `ScoreOnlyFixtureComponent` presenta tabla accesible, casillas con etiquetas y menú existente de participantes. También se muestra en la consulta de invitados.
- PDF individual y del torneo: tabla con N.º, participante, academia, J1–J5; veinte participantes por página y encabezados repetidos. El PDF del endpoint backend ofrece el mismo formato de planilla.
- Se amplían los enums existentes de category.type y fixture_versions.fixture_type; no se agregan tablas de puntajes ni se modifican categorías o versiones ya guardadas. Script: `_script/bte_score_only_fixture.sql`; migración EF equivalente: `AddScoreOnlyFixtureType`.

## Verificación

- Backend: 61/61 pruebas focalizadas de fixtures, PDF, formatos y tercer lugar.
- Frontend: 127/127 pruebas del resumen, versiones, formatos, exportación, participantes e invitaciones. Incluye comprobación de cinco casillas por participante y paginación sin pérdidas ni duplicaciones.
- MySQL real en athena_stage4_test: 6/6 comprobaciones; enum persistido, siete participantes sin eliminación, guardado versionado, PDF y lectura histórica sin regeneración. Categoría y versiones temporales eliminadas al terminar.
- Build/publish backend correcto. SHA256: `8ffa6a9755c34c49a3e4e3ff82026539e1385e00f913b86b63fc4584dce535c8`.
- Build producción frontend correcto, hash `0f459b832e61711d`.

## Paquete

`entregables/bte-frontend-bte-20261017-solo-puntaje.zip`, para instalar en `/bte/`, con todas las actualizaciones anteriores incluidas.

SHA256: `5ac399822e31e37c8f77f37cc968239ec233a99b4b491e5614ced86e3a2f4963`.

La interfaz conserva casillas de anotación manual como los formatos de planilla existentes. Esta entrega no almacena calificaciones digitales de jueces.

## Producción

Backend y ampliación de enums publicados en zeuz. Respaldo completo verificado previo: `/opt/bte-api/deploy-score-only-20261017/backup/`. Se comprobaron los recuentos de category, fixture_versions y fixture_matches antes/después del DDL, con el servicio detenido: sin cambios en registros oficiales. No se cambió el formato de ninguna categoría ni se regeneraron sus llaves.

Servicio reiniciado y activo; comprobaciones autenticadas y públicas HTTP 200, esquema y DTO publicado con SOLOPUNTAJE verificados. Entorno y clave frontend conservados. Registro remoto: `/opt/bte-api/deploy-score-only-20261017/deploy.log`.

Descarga pública verificada por HTTP 200 y SHA256:

https://apidemo.budotournaments.net/downloads/bte-frontend-bte-20261017-solo-puntaje.zip

El paquete se instala manualmente en el hosting del frontend; no se reemplazó el sitio web alojado en budotournaments.net. En producción no se seleccionó automáticamente Solo Puntaje en ninguna categoría.
