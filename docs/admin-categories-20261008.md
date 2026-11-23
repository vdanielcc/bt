# Administrador de categorías

Acceso desde `/app/admin/events`, después de elegir un evento, mediante «Ver Categorías». Ruta: `/app/admin/events/{eventId}/categories`. Requiere administrador del sistema.

El selector con autocompletado muestra código y nombre, filtra mientras se escribe y admite búsqueda sin distinguir mayúsculas ni acentos. Sólo incluye categorías asociadas al evento seleccionado.

Campos editables de `category`: código, nombre, género, formato de competencia, edades inicial/final, categoría abierta (incluido NULL), pesos inicial/final (incluido NULL), tipo, modalidad, gratuidad, orden, cupo máximo y duración del combate. El ID se muestra como referencia. Las relaciones con eventos, deportistas y categorías relacionadas se conservan; no se regeneran llaves.

Las categorías compartidas muestran la cantidad de eventos y requieren confirmación al guardar. El backend exige también dicha confirmación. Las tarifas configuradas por evento mantienen su propia configuración; esta edición no recalcula cargos históricos.

API: GET `/api/admin/events/{eventId}/categories` entrega categorías completas y catálogos de tipo/modalidad. PUT `/api/admin/events/{eventId}/categories/{categoryId}` guarda todos los campos editables. Ambos endpoints requieren rol `admin`; la escritura comprueba pertenencia al evento, referencias y rangos. No se necesita migración de base de datos.

Validaciones: cinco pruebas de backend, tres de frontend con autocompletado Angular Material, compilación AOT y versiones de producción.

Respaldo privado: `/opt/bte-api/deploy-admin-categories-20261008/backup`, con base completa, API, configuración y manifiesto verificado. Backend SHA-256: `1c00b955e53b7b4d5f2d20488f3398fc6f3c32e8bbcadc380d845e6326d393f4`.

Paquete `/app/`: https://apidemo.budotournaments.net/downloads/bte-frontend-app-20261008-admin-categorias.zip

SHA-256 frontend: `5a8a9982be71d50076d1a0a6582b907fed8246ac28becd2301519a37bf2ec482`.

La instalación del frontend en el dominio principal requiere extraer el paquete en su carpeta pública `app/`. El acceso al alojamiento de ese dominio continúa pendiente; el servidor SSH autorizado publica la API y las descargas.
