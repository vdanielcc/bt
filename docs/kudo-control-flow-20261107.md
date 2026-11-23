# Mesa de Kudo: avance, desempates y podio

## Comportamiento

- Máximo tres rounds en total: uno principal y hasta dos de desempate, tanto en eliminatorias como en finales.
- Se mantiene la duración existente de tres minutos por round. El operador conserva la corrección manual del reloj en pausa.
- Al terminar sin un ganador confirmado se pregunta si hace falta otro round o si se registra Hantei. La pregunta no se repite en cada actualización y no aparece en la pantalla de visualización.
- Confirmar otro round prepara un descanso de sesenta segundos. El backend impide iniciar o alterar el combate durante ese descanso. Al terminar queda preparado; el operador inicia el round manualmente.
- Tras el tercer round no se permite otro desempate; se registra Hantei si todavía no hay ganador.
- Puntajes y faltas se conservan o reinician según las opciones existentes de la categoría.
- Se mantiene el límite global de dos Ne-waza por encuentro, sin reiniciarlo entre rounds.

## Encuentros y podio

La mesa confirma el ganador en la llave oficial, vuelve a consultar los encuentros disponibles y ofrece «Siguiente encuentro». No permite avanzar sobre un resultado corregido que aún no fue confirmado otra vez.

Se siguen exclusivamente las conexiones guardadas, incluidos los pases libres. No se crean ni regeneran encuentros ni versiones desde el Scoreboard. Los combates ya iniciados o confirmados se protegen frente a cambios de participantes provocados por correcciones anteriores.

El endpoint autorizado `GET /api/scoreboard/kudo/events/{eventId}/categories/{categoryId}/progress` consulta la versión vigente y devuelve encuentros preparados y podio derivado de resultados oficiales. No crea una versión si no existe.

Al cerrar la categoría se muestran oro, plata y los bronces definidos por la llave. La pantalla externa abierta desde la mesa sigue los cambios de encuentro mediante comunicación local entre ventanas. Los descansos oficiales se calculan con la hora del servidor.

La demo tiene una categoría fija de cuatro deportistas con semifinales y final. Permite confirmar, avanzar y mostrar el podio sin llamadas de escritura a producción.

## Validación y publicación

44 pruebas de Kudo en backend y 14 del frontend correctas, incluidas navegación completa demo, podio, pases libres, límite de rounds y descanso obligatorio. Los estados anteriores conservan compatibilidad; el descanso se guarda en el JSON del encuentro y no requiere migración SQL.

API publicada en producción el 7 de noviembre de 2026. Esquema de zeuz verificado, sin migración adicional; datos deportivos conservados y comprobados antes del reinicio. Respaldos de base, publicación y entorno en `/root/bte-kudo-control-20261107/backup/`.

Las comprobaciones de salud, carrusel con X-FRONT, WKF, Kudo y progreso de categoría respondieron HTTP 200. SHA-256 de la API: `9d0e5a936357030b2fe76509e67e79cc4868c0bebce430dd979512c25d34c9b8`.

Frontend para instalación manual en `/app/`: `entregables/bte-frontend-app-20261107-kudo-control.zip`. Incluye estos cambios y Ne-waza global. SHA-256: `5049e54a0e24b83dd4f31d4c6fe5da4985493514e13614b15f8c7b9992e53f48`. La publicación de la API no instala el frontend en el hosting.
