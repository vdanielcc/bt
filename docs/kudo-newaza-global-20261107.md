# Ne-waza global del encuentro

Se reemplazaron los controles por competidor por un único contador y cronómetro de Ne-waza, junto al control del tiempo principal. La pantalla externa muestra el mismo estado, sin botones de operación.

- Máximo dos usos entre ambos competidores durante todo el encuentro, incluso si hay segundo round.
- No se puede iniciar otro mientras haya uno activo ni con el encuentro detenido o finalizado.
- Cada uso mantiene su cronómetro de 30 segundos. El tiempo principal continúa y el aviso de vencimiento se emite una sola vez.
- El backend aplica el mismo límite; no depende de deshabilitar el botón del frontend.
- Los estados JSON anteriores se interpretan sumando los contadores de ambos lados y conservando el inicio más antiguo si había Ne-waza activo. No se reinician los usos guardados.
- No requiere modificar el esquema de zeuz. API publicada en producción el 7 de noviembre de 2026; frontend incluido en `entregables/bte-frontend-app-20261107-kudo-control.zip` para instalación manual. Detalles de respaldos y validación en `kudo-control-flow-20261107.md`.

Las reglas y la interfaz permanecen dentro de los componentes específicos de Kudo. No se modifican llaves, fixtures ni resultados oficiales.
