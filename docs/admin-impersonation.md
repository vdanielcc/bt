# Ingresar como una academia

El menú superior de perfil de `admin` incluye **Ingresar como**; el menú lateral
abre el mismo selector mediante **Cambiar de cuenta**. Esta opción solo se muestra
para `admin`. El selector carga todas las
academias desde `/api/admin/user-academies` y filtra por nombre o ID mientras se
escribe, sin distinguir mayúsculas ni tildes. Es necesario seleccionar un resultado.

`POST /api/auth/impersonate/{academyId}` exige JWT de `admin` y revalida en la base
de datos que el administrador siga activo, desbloqueado y conserve ese rol.
La cuenta principal es el `academy_admin` del representante legal; cuando no hay
una cuenta de representante elegible, se utiliza el primer `academy_admin` creado
para la academia, con desempate por ID. Se respeta la asociación explícita en
`AcademyUsers` antes de la asociación histórica por representante legal.
No se permite ingresar mediante una cuenta que tenga otros roles, esté inactiva
o bloqueada. Una academia sin cuenta disponible devuelve 409.

Se emiten tokens reales del usuario seleccionado mediante el servicio habitual de
autenticación. No se consultan ni modifican contraseñas. El registro de acceso
incluye administrador, academia, usuario destino e IP, sin tokens ni contraseñas.

La sesión de academia se conserva en `sessionStorage` de la pestaña actual.
La sesión de administrador permanece en `localStorage`. HTTP y SignalR utilizan
el token de la academia durante este acceso. La página se recarga al cambiar de
identidad para reiniciar menús y datos cargados. Una franja permanente identifica
al usuario y academia, con **Volver a administrador**. Al volver se revoca el
refresh token delegado y, si es necesario, se renueva la sesión del administrador.
Cerrar sesión mantiene el comportamiento habitual de limpieza de sesiones.

No requiere migraciones de base de datos. Backend publicado el 20/10/2026 por
solicitud del usuario; frontend para `/app/` entregado como ZIP descargable.
Ver `production-admin-impersonation-20261020.md` para verificaciones y respaldo.
