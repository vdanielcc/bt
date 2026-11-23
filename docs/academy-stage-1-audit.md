# Auditoría inicial — ETAPA 1 (2026-10-09)

Inspección previa a cambios. Backend: `D:/budodev/bte/src/2025/API`.
La evidencia de BD es el esquema de referencia del 22 de septiembre; no se ha conectado a producción.

| Funcionalidad | BD de referencia | API | Frontend | Estado inicial |
|---|---|---|---|---|
| Modalidades | EXISTE, campos y unicidad por academia/nombre | PARCIAL: CRUD y edades; faltan validaciones de actualización y DTO | PARCIAL: CRUD, sin selector de estilo, sin estados vacíos | PARCIAL |
| Salas | EXISTE, capacidad y unicidad | PARCIAL: capacidad solo validada al crear | PARCIAL: CRUD, confirm nativo, sin estados vacíos | PARCIAL |
| Instructores | EXISTE, Person y unicidad | PARCIAL: candidatos limitados a miembros Coach/Sportman; sin búsqueda acotada | PARCIAL: autocomplete local, edición histórica problemática | PARCIAL |
| Estilos | EXISTE, código/nombre únicos | PARCIAL: CRUD genérico con entidades | PARCIAL: servicio disponible sin mantenedor | PARCIAL |
| Academia/estilo/federación | EXISTE, asociación opcional | PARCIAL: sin principal único transaccional ni DELETE | PARCIAL: solo listado de IDs | PARCIAL |

Se reutilizan `academies`, `sports_associations`, `persons`, `users`, `student`, `student_academy` y las cinco entidades existentes. `modality`, `areas` y el motor de eventos quedan fuera del cambio.

Arquitectura: .NET 8, EF Core/Pomelo, contexto parcial, migraciones EF y SQL existentes, controllers y services, ApiResponder, JWT y filtro global AcademyScopeAuthorizationFilter. Estas operaciones actualmente acceden directamente al contexto; no hay que introducir repositorios. AutoMapper existe en otros módulos, pero no en los mantenedores inspeccionados.

Frontend: Angular 17 standalone, Material/Vex, rutas `/academies/:academyId`, servicios HTTP y unwrapApiResponse. Menú existente con modalidades/salas/instructores/estilos. Se conserva su estructura.

Cambios previstos: completar estos mantenedores; DTO y validación de etapa 1; preservar identidad/academia/fecha de creación; principal transaccional; búsqueda de candidatos limitada y nombres agregados; pruebas unitarias y compilaciones. No se aplicarán migraciones ni pruebas sobre una conexión productiva.
