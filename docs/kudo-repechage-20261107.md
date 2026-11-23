# Eliminación directa (Kudo-repechage)

Formato `KUDOREPECHAGE`: doble eliminación independiente de `ELIMINACIONKUDO`.

## Funcionamiento

- Primera derrota: pasa al repechaje. Segunda derrota: eliminado.
- El ganador del repechaje disputa el título contra el finalista invicto.
- Si gana el invicto, termina el torneo. Si gana el repechaje, ambos tienen una derrota y se habilita una final decisiva.
- El último eliminado del repechaje recibe bronce. Con dos competidores solo hay oro y plata; el medallero debe configurar la cantidad de bronces correspondiente.
- Se requieren dos o más participantes. Los pases libres no cuentan como derrotas.
- Para N participantes se disputan 2N−2 encuentros, o 2N−1 si se necesita la final decisiva. El cronograma reserva el máximo.

## Versiones oficiales

Las conexiones de ganador y perdedor se guardan en cada versión. El Scoreboard consume estos encuentros y propaga resultados sin generar ni regenerar llaves.

El formato aparece en administración de categorías y resumen del evento. Seleccionarlo conserva las versiones anteriores; «Refrescar» genera explícitamente una versión nueva. No se cambia automáticamente ninguna categoría de producción.

Invitaciones y resumen muestran las rondas de ganadores, repechaje y finales, el origen de los participantes pendientes y los colores AO azul / SHIRO blanco. La exportación PDF incluye todas las fases.

Las conexiones de esta variante no se editan mediante arrastre ni «Guardar nueva versión». Para otra distribución se usa «Refrescar», conservando la versión anterior. Los resultados se registran en el Scoreboard o en confirmación de resultados.

Una corrección se rechaza si altera los participantes de un combate posterior iniciado o confirmado. Los resultados y las reglas de combate Kudo permanecen en su componente específico; no se introduce `sportAssociationId`.

## Instalación

1. Respaldar zeuz y la publicación actual de backend y frontend.
2. Aplicar la migración EF `20261107000100_AddKudoRepechageFixture`: amplía los ENUM de `category.type` y `fixture_versions.fixture_type` y añade cinco columnas nullable a `fixture_matches`. No borra categorías, versiones ni resultados.
3. Publicar el backend y reiniciar `bte-api.service`.
4. Verificar el endpoint público de eventos con Origin y X-FRONT según `agents.md`, además de las versiones históricas y el Scoreboard.
5. Publicar el frontend para `/app/`. Requiere la migración y el backend anteriores.
6. Seleccionar el formato en una categoría Kudo y generar una nueva versión explícitamente.

## Validación

Las pruebas simulan torneos de 2, 3, 4, 5, 7, 8, 9, 17 y 32 deportistas, con veinte secuencias de resultados por tamaño. Comprueban segunda derrota, campeón procedente del repechaje, final decisiva, pases libres, podio único, propagación oficial, reintentos idempotentes, protección de combates iniciados y migración aditiva.

Resultado: 27 pruebas relacionadas del backend y 7 del frontend correctas. Compilación optimizada de producción y verificación SEO completadas. Salida frontend: `.release-kudo-repechage-20261107/`.

## Publicación de producción

El 2026-11-07 se aplicó `20261107000100_AddKudoRepechageFixture` a zeuz y se publicó el backend Linux, reiniciando `bte-api.service`.

- Respaldo completo de base, publicación, entorno y unidad: `/root/bte-kudo-repechage-20261107/backup/`.
- Antes de migrar producción se comprobó la misma modificación en una copia aislada de las tres tablas afectadas.
- Se conservaron por conteo y SHA-256 los datos de categorías, asociaciones de categorías a eventos, versiones, encuentros, inscritos por categoría y configuración Kudo. Permanecieron 2.561 versiones y 18.732 encuentros.
- Salud, eventos públicos con Origin/X-FRONT, evento 58, catálogo/estado/historial WKF y lectura/historial/configuración Kudo respondieron HTTP 200.
- El entorno del servidor no cambió.
- SHA-256 de la API publicada: `af4cae6a83ceb899fab35d115b6c6f15293a82565155e08c4a268d0ca8a71ec6`.
- El frontend se entrega para instalación manual; no se instala automáticamente en el hosting web.
- Descarga verificada por HTTP 200 y SHA-256: https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261107-kudo-repechage.zip (9.623.733 bytes).
- SHA-256 del ZIP: `deedcc0ff2011c3535ab69e45b6f6b07369806e476e49ee68e16718e63f99945`.

La suite completa mostró un fallo ajeno a los cambios: `StudentUpdateTests.SharedFormPayloadDeserializesAndValidatesWithoutLegacyContactFields`, por conversión de un límite decimal en DataAnnotations bajo la configuración regional local. Los archivos del formulario de alumnos no se modificaron.
