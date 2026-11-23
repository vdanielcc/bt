# Organización de archivos de base de datos

- Guardar los nuevos scripts, exportaciones y resultados de consultas de base de datos en `artifacts/`, junto a `production-event-category-20261113.sql` (SHOW CREATE TABLE). No dejarlos en la raíz del proyecto.

# Entorno de producción

- Publicación de producción: https://budotournaments.net/bte/
- API: https://apidemo.budotournaments.net/

# Requisitos de despliegue del carrusel público

- El carrusel del login consume `GET /api/Events/upcoming` y envía el encabezado `X-FRONT` con el valor configurado en `environment.production.ts` (`frontAccessKey`).
- En producción, el backend lee esa clave desde `FrontAccess:Key`. Para el servicio systemd debe existir `FrontAccess__Key` en `/etc/bte-api.env`, con el mismo valor que `frontAccessKey` del frontend.
- Después de publicar o modificar el entorno del backend, reiniciar `bte-api.service` y comprobar que el endpoint responda `200 OK` al enviar `Origin: https://budotournaments.net` y el encabezado `X-FRONT`. Una respuesta `503` con `El acceso frontend no está configurado` indica que falta `FrontAccess__Key`.
- Antes de modificar `/etc/bte-api.env`, crear una copia de respaldo que permita revertir el despliegue.

# Decisiones de arquitectura del Scoreboard

- La asociación deportiva del evento se mantiene como texto (`WKF`, `JKA`, `WUKF`). No se debe crear ni utilizar `sportAssociationId` para resolver el Scoreboard.
- El Scoreboard debe utilizar las llaves/fixtures oficiales previamente generados. Nunca debe regenerar las llaves.
- Las reglas de competencia se implementan dentro de cada componente web específico por asociación y modalidad; no deben centralizarse ni compartirse entre reglamentos cuando no sean realmente comunes.
