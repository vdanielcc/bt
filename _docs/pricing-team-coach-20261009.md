# Tarifas de equipos y Coach — 2026-10-09

El simulador identifica EQUIPO mediante las modalidades de equipo del catálogo (4, 5, 6 y 7), igual que el servicio de categorías. No permite mezclar categorías deportivas individuales y de equipo en una simulación.

Coach se mantiene en el detalle de inscripción, con valor cero, y se excluye de las cantidades utilizadas para buscar combinaciones. También queda exento en los motores por categoría, grupo y antiguo. Las categorías deportivas gratuitas siguen contando para las combinaciones. El límite de categorías de la inscripción conserva su comportamiento existente.

Validación: 60 pruebas de backend y 12 de frontend aprobadas; compilación Angular AOT y publicación Release del backend aprobadas.

Respaldo de producción: `/opt/bte-api/deploy-team-coach-pricing-20261009/backup` (base de datos, API y entorno). Sin migración de esquema ni modificación de cálculos históricos.

Frontend: `bte-frontend-app-20261009-equipos-coach.zip`, configurado para `/app/`. SHA256: `6b0068a374acaac0c8459fed3995d3a97d6a615de48b66df71de1c31c1e130cc`.

API ZIP SHA256: `0474028dc2bb0eaff3a3aaa9ff74211b582c17a90f4ae93d54f429e75fe26c70`.

La instalación del ZIP en el hosting del frontend requiere el acceso correspondiente; las credenciales disponibles son las del servidor de API.
