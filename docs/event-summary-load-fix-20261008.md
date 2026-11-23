# Corrección de carga de llaves

El filtrado agregado al cargar una categoría comparaba `competitorId` de las llaves con los inscritos del endpoint `categoria-con-deportistas`. Este endpoint devuelve `studentId` o `teamId`, nombre y academia, sin `competitorId`. Como consecuencia, todos los puestos se consideraban ausentes y se vaciaban, incluso al mostrar una versión oficial o la primera versión automática.

Se retiró exclusivamente ese filtrado durante la carga. La respuesta de las llaves se muestra completa y el listado de inscritos conserva su estructura original. La eliminación del deportista seleccionado sigue ejecutándose después de confirmar Eliminar o Mover, sobre el borrador actual.

Validación: 34 pruebas aprobadas, incluidas dos regresiones con el DTO real de inscritos y versiones 1 y 4. Se conservan las pruebas de colores JKA, PDF, traslado, eliminación y round robin.

Paquete para `/app/`: `.release-event-associations/bte-frontend-app-20261008-carga-llaves.zip`.

Descarga: https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261008-carga-llaves.zip

Compilación de producción aprobada. Tamaño: 9.075.632 bytes. SHA-256: `1b255e0cfe983628012b0cc50236e3a6a5a66a4d7755033074402c25699c119c`.
