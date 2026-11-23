# Validación de documentos y relaciones activas — 11/10/2026

Backend publicado en `/opt/bte-api/publish` del servidor de la API.
SHA-256 de `bte.api.dll`: `923bfb9b566789bc4ab9325a0b7ce5230a81984a1500103ba91dfae8d874cf60`.

El servicio de documentos valida y normaliza RUN/RUT y CPF al crear o actualizar.
Los listados por academia, género, categorías disponibles y usuarios de academia requieren
`student_academy.is_active = 1`. Los valores NULL no se consideran activos.
La selección de deportistas para nuevas llaves exige una relación activa con la academia
de su inscripción. Las consultas antiguas de llaves evitan duplicar atletas por relaciones históricas.
Las versiones oficiales ya guardadas siguen disponibles sin regeneración ni modificación.

No se ejecutaron migraciones ni correcciones de datos. Las consultas SQL de verificación
se ejecutaron dentro de transacciones de solo lectura. No hubo cambios de frontend.

Validación local: 22 pruebas de documentos y 114 pruebas de relaciones activas,
llaves, traslados, inscripciones, tarifas, usuarios y alcance de academias aprobadas.

Verificación en producción: `bte-api.service` activo, rutas Swagger previas conservadas,
endpoint público `/api/Events/upcoming` con HTTP 200 y listados general y por género
de academias 14, 16 y 17 coincidentes con sus relaciones activas en la base de datos.

Respaldo privado de aplicación y configuración:
`/opt/bte-api/backups/membership-20261011T212147Z`.
SHA-256 de `application.tar.gz`:
`c048fa34ce16e8c275692b275ce238fc49473977f694f72f78a77f5a8695e228`.
El manifiesto remoto `deployment-result.json` registra las comprobaciones.

Reversión: detener `bte-api.service`, restaurar `bte.api.dll` y `bte.api.pdb` del respaldo
en `/opt/bte-api/publish`, conservando propietario `bteapi:bteapi` y permisos `640`,
y reiniciar el servicio. El despliegue no cambió `/etc/bte-api.env`, dependencias ni esquema.
