# Scoreboard Kudo · Chile 2023

Implementación del reglamento entregado por el organizador y de sus aclaraciones. No se incorporaron reglas distintas de versiones internacionales posteriores.

## Uso

En un campeonato con asociación de texto `KUDO`, seleccionar su área y categoría en Scoreboard abre el componente Kudo. También está disponible desde «Resultados de categoría → Abrir Scoreboard Kudo», o en `/scoreboard/events/{evento}/categories/{categoria}/kudo`.

En escritorio, seleccionar campeonato y categoría y pulsar «Scoreboard Kudo». Se instaló la ventana WPF nativa en `D:\budodev\bte\src\2025\ScoreBoard\scoreboard.bte\Views\KudoScoreboardWindow.cs`. Sus fuentes de integración y script reproducible están en `desktop-integration`. Los archivos anteriores de la ventana principal y su ViewModel quedaron respaldados en `desktop-integration/backup-kudo-20261031-025023`.

Ambos clientes leen exclusivamente la última versión **guardada** de la llave. No generan ni regeneran encuentros. Solo admiten los dos competidores inscritos y definidos en ese encuentro. Si cambia la versión o sus participantes, el servidor exige resolver el conflicto antes de continuar.

«Abrir pantalla» muestra el combate sin controles de edición. El control y la pantalla requieren sesión autorizada y conexión a la API. El servidor conserva el estado; la actualización entre clientes se consulta cada segundo. El cronómetro se interpola localmente con la hora del servidor. No se aceptan acciones offline en este componente.

## Reglas implementadas

- Round de 180 segundos; máximo dos rounds en finales. El segundo se habilita por campeonato/categoría y se prepara manualmente después de agotar el primero. Se inicia mediante «Iniciar / reanudar».
- Por defecto se mantienen puntajes y faltas entre rounds. Ambos comportamientos pueden configurarse por separado. Las instancias de Ne-waza se reinician en cada round. La configuración queda fijada para un combate cuando recibe su primera acción; editarla afecta los combates todavía sin acciones.
- Koka 1, Double Koka 2, Yuko 2, Waza-ari 4. El total es informativo: **no determina ganador** mientras el organizador define la regla por puntos.
- Incapacidad de 2 a 4 segundos inclusive: Yuko; más de 4 hasta 6 inclusive: Waza-ari; más de 6: Ippon. Para menos de 2 segundos se solicita la decisión técnica del árbitro. También existen botones de asignación técnica directa, incluido Ippon por KO o rendición permitida.
- Hansoku del rival: el segundo añade Yuko; el tercero añade Waza-ari manteniendo aquel Yuko; el cuarto genera Shikkaku, Ippon y victoria del oponente. Los premios derivados se calculan desde las faltas y están separados de los puntajes técnicos. Quitar una falta revierte exclusivamente su efecto derivado.
- Shikkaku directo exige elegir una de las siete causas del prompt, incluido retraso de ingreso de al menos 50 segundos. La mesa registra esa decisión; no se infiere mediante sensores. Puede corregirse y revertir la victoria derivada.
- Ne-waza: dos instancias **por competidor y round**. La tercera se rechaza con el texto indicado por el organizador. A los 30 segundos se emite una señal visual/sonora en el controlador; el cronómetro principal continúa. El operador termina suelo o pausa manualmente el combate. La señal web requiere interacción previa para habilitar audio del navegador.
- Ippon y Shikkaku detienen el cronómetro y determinan ganador automáticamente. Al agotar tiempo sin ellos, queda pendiente la decisión del operador. Hantei se registra en un modal, también al terminar el segundo round. Puede corregirse.
- El registro de cada acción utiliza los cuatro encabezados solicitados. El historial persistente registra operador, revisión, operación, acción y fecha.

## Resultados y medallero

Después de revisar el ganador, «Confirmar resultado en la llave» guarda el resultado oficial, avanza el ganador al lugar ya definido por la llave y dispara la sincronización automática del medallero. No existe una confirmación adicional del podio. Los bronces inconsistentes o podios pendientes se notifican mediante modal.

Se puede corregir el combate y volver a confirmar. Se conserva la protección existente que impide cambiar un ganador cuando el encuentro siguiente ya tiene resultado. Una revisión del combate también se verifica **dentro** de la transacción que confirma el resultado, evitando confirmar un estado obsoleto de otro controlador. Las acciones y confirmaciones admiten reintentos con el mismo `operationId` y el mismo contenido; reutilizarlo con otra solicitud se rechaza.

## API y MySQL

Base autenticada: `/api/scoreboard/kudo/events/{evento}/categories/{categoria}`. Se utiliza la autorización de organizadores/administradores existente del campeonato.

| Método | Ruta | Uso |
|---|---|---|
| GET / PUT | `/configuration` | Configuración por categoría y revisión |
| GET | `/matches/{fixtureMatchId}` | Estado y hora del servidor |
| POST | `/matches/{fixtureMatchId}/actions` | Acción con `operationId` y `expectedRevision` |
| POST | `/matches/{fixtureMatchId}/confirm` | Confirmar resultado oficial |

Migración EF Core: `20261030000200_AddKudoChile2023`, posterior a `20261030000100_AddMedalTables`. Crea `kudo_category_configuration`, `kudo_combats` y `kudo_combat_operations` con claves foráneas restrictivas. El estado deportivo se almacena en JSON versionado del reglamento `CHILE-2023`. La migración añade `KUDO` al catálogo textual existente mediante `INSERT IGNORE`; no crea un identificador de asociación para resolver Scoreboard.

La reversión elimina primero operaciones, después combates y finalmente configuración. Conserva deliberadamente el código de catálogo `KUDO`, que puede haber sido utilizado por eventos. El 31 de octubre de 2026 se publicó el backend y se aplicaron las migraciones en producción, después de respaldar la instalación y probar Up/Down/Up sobre una copia restaurada de MySQL. Ver [registro del despliegue](despliegue-kudo-medallero-20261031.md).

## Verificación

- Pruebas dirigidas de backend: **37 aprobadas** entre Kudo y Medallero. Cubren límites de incapacidad, faltas acumulativas y sus correcciones, Ippon, tiempos, Hantei, segundo round y Ne-waza por competidor.
- Pruebas del servicio: inscripción, campeonato, cambios de participantes, revisiones, idempotencia, configuración fijada y rechazo de victoria por puntos. Confirmación/corrección se prueba sobre la llave existente.
- Además de los tests EF InMemory y de generación de SQL, el despliegue verificó las migraciones y el backend sobre MySQL 8.0.46 real. La prueba HTTP comprobó Hansoku, reversión y reintentos de acciones y confirmaciones. Se corrigió la comparación de solicitudes para tolerar la normalización de JSON de MySQL.
- Compilación de producción Angular, comprobación final de plantillas y compilación WPF verificadas. **4 pruebas web aprobadas** en Chrome Headless: aceptación del servidor, rechazo de Ne-waza, selección modal Hantei y pantalla sin acciones.
- Suite general del backend: 689 aprobadas y un fallo previo en `StudentUpdateTests.SharedFormPayloadDeserializesAndValidatesWithoutLegacyContactFields`, relacionado con la validación decimal `0.01` bajo la cultura chilena; no se modificó ese formulario.

Pendiente antes de uso en campeonato: instalar manualmente el nuevo frontend y validar control web/escritorio y pantalla simultáneos con dispositivos reales. La regla de victoria por puntos continúa pendiente por decisión del organizador.
