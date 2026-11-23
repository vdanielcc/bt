# Mantenedor de usuarios de academia

Accesos:

- **Administración → Usuarios**, ruta `/admin/users`, para `admin`.
  Permite buscar y seleccionar una academia antes de listar o crear cuentas.
- **Academia → Usuarios**, ruta `/academies/:academyId/users`, para `academy_admin`
  de la academia indicada.

El backend revalida usuario activo y perfil actual en la base de datos.
`admin` puede gestionar todas las academias. `academy_admin` solo puede gestionar
su academia asignada en `academy_users`; para cuentas anteriores sin esa asignación,
se mantiene la validación mediante el representante legal.

## Operaciones

- Listar, buscar y paginar usuarios de la academia.
- Crear persona y cuenta en una única transacción, con contraseña cifrada con BCrypt.
- Seleccionar una persona registrada de la academia sin cuenta y asignarle usuario.
- `admin` puede asignar `admin`, `academy_admin`, `instructor`, `apoderado` o `alumno`.
- `academy_admin` puede asignar únicamente `instructor`, `apoderado` o `alumno`.
- Modificar correo, perfil y estado activo/inactivo. No se eliminan personas.
- Bloquear el inicio de sesión de cuentas inactivas y rechazar tokens de cuentas
  desactivadas o cuyo perfil cambió en las rutas autenticadas.

La selección incluye personas vinculadas mediante alumnos activos, apoderados
activos de esos alumnos, el representante y las nuevas cuentas de la academia.
El selector de personas siempre se limita a la academia seleccionada, incluso para
`admin`. No permite apropiarse de una cuenta existente ni duplicar una cuenta.
La búsqueda devuelve hasta 50 resultados; puede refinarse por nombre o documento.

Las personas nuevas usan el país del representante y la comuna de la academia,
tal como indica el formulario. El perfil de acceso no crea inscripciones a clases,
una ficha de instructor ni vínculos entre un apoderado y sus alumnos.
El registro público continúa asignando `academy_admin`.

El `academy_admin` creado por `admin` obtiene acceso a la academia seleccionada
sin cambiar su representante legal. Al iniciar sesión se prioriza esa asignación.
El perfil `admin` tiene alcance global, aunque su cuenta se vincule a una academia.
Un administrador no puede desactivar su propia cuenta ni quitarse el perfil `admin`
desde este mantenedor.

## API

Prefijo: `/api/academies/{academyId}/users`. Requiere JWT de `admin` o `academy_admin`.
`GET /api/admin/user-academies` devuelve IDs y nombres de academias y exige `admin`.

| Método | Ruta | Uso |
|---|---|---|
| GET | `/` | Listado sin contraseñas ni hashes |
| GET | `/people?search=...` | Personas elegibles de la academia |
| GET | `/options` | País y tipos de documento para el alta |
| POST | `/` | Crear cuenta con `personId` o con objeto `person` |
| PUT | `/{userId}` | Actualizar `email`, `role`, `isActive` |

Los endpoints genéricos `/api/Users` y `/api/Roles` quedan reservados a `admin`;
el mantenedor usa exclusivamente los endpoints acotados por academia.
Los cuerpos de solicitudes del mantenedor se excluyen del log para no almacenar
contraseñas. Un 403 muestra un error de permisos; un 401 retorna al login.
Este cambio controla el acceso al mantenedor, no implementa una matriz completa
de permisos para los demás módulos o endpoints históricos.

## Publicación

Frontend y API deben publicarse juntos. La actualización no se ha aplicado a producción.
La ampliación para `admin` reutiliza la tabla `academy_users`; no requiere una
migración adicional si ya se publicó el mantenedor de academia anterior.

1. Respaldar base de datos, frontend y publicación vigente de la API.
2. Ejecutar `_script/20260914_academy_users.sql` del backend en la base de datos de BTE.
   Crea `academy_users`, garantiza los tres perfiles e incorpora cuentas anteriores
   solo cuando la persona tiene una cuenta y pertenece a una única academia, con
   perfiles administrables. Los casos ambiguos requieren revisión manual.
3. Compilar/publicar `D:/budodev/bte/src/2025/API/bte.api.csproj` con su procedimiento
   habitual, conservando configuración y archivos de producción.
4. Reiniciar `bte-api.service`. Mantener `FrontAccess__Key` en `/etc/bte-api.env`;
   respaldar este archivo antes de cualquier modificación y verificar el carrusel
   con `Origin: https://budotournaments.net` y el encabezado `X-FRONT` configurado.
5. Extraer el ZIP del frontend en `/bte/`, publicando `index.html` al final.
   Conservar los bundles anteriores durante la transición para las pestañas abiertas.
6. Verificar con una cuenta de prueba: ambos tipos de alta, inicio de sesión con
   la cuenta creada, rechazo de correo/persona duplicados, edición y desactivación,
   y rechazo de otro perfil o de un ID de academia distinto.
   Para `admin`, verificar selección y cambio de academia, los cinco perfiles y
   el acceso del `academy_admin` recién creado a la academia asignada.

La tabla es aditiva. Para revertir, restaurar frontend/API anteriores conservando
la tabla y las cuentas creadas; no borrar datos de usuarios durante la reversión.

## Validación local

Se ejecutaron pruebas de guard, interceptor, vencimiento de sesión y formularios
en Chrome Headless, además de pruebas del controlador y de validación de tokens
con EF InMemory. Estas últimas no reemplazan la comprobación de transacciones y
restricciones SQL en MySQL durante el despliegue.
