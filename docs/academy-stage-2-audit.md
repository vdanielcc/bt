# Auditoría inicial — ETAPA 2: Clases

Fecha: 2026-10-09. Auditoría de código y consultas de solo lectura sobre MySQL productivo antes de implementar.

| Componente | BD | Backend | Frontend | Estado inicial |
|---|---|---|---|---|
| Dependencias ETAPA 1 | Cinco tablas existentes | Configuración implementada y publicada | Mantenedores disponibles | EXISTE |
| Clases permanentes | `academy_classes`, 14 columnas completas | `AcademyClass`, `DbSet`, mapeo de columnas existente | Interfaces y service existentes | EXISTE |
| Integridad | FK academia/modalidad/sala, unique academia/nombre, CHECK capacidad/fechas/estados | Filtro de autorización por academia; PUT genérico permite copiar propiedad de academia y auditoría | Selectores básicos | PARCIAL |
| DTOs y servicio de clases | Sin cambios necesarios | Endpoints reciben/devuelven entidad; falta servicio específico y DTO | Contrato array y envoltorio estándar existentes | PARCIAL |
| Listado y filtros | Índices de academia/modalidad/sala existentes | GET básico sin filtros ni nombres | Ruta, menú y tabla existentes; sin filtros, vigencia, métricas ni estados vacío/error persistentes | PARCIAL |
| Crear/editar | Restricciones existentes | CRUD genérico, sin normalización ni errores de negocio suficientes | Diálogo sin validación de capacidad/fechas/longitudes, incluye `PAUSED` incompatible con BD y toggle independiente | PARCIAL |
| Activar/desactivar/cerrar | Estados `ACTIVE`, `INACTIVE`, `CLOSED` | DELETE conserva fila pero la marca INACTIVE | Dice cerrar, ejecuta desactivación y usa confirm nativo; falta reactivar | PARCIAL |
| Detalle | Relaciones futuras ya existentes | GET entidad básica | Resumen incompleto y seis llamadas a funciones de etapas posteriores; falta edición | PARCIAL |
| Pruebas ETAPA 2 | Base de ensayo aislada disponible | Suite existente; falta cobertura específica de CRUD de clases | Karma/Chrome existentes; falta cobertura de clases | PARCIAL |

## Tabla encontrada

Columnas: `id`, `academy_id`, `training_modality_id`, `code` (30), `name` (120), `description` (1000), `default_room_id` nullable, `capacity` nullable, `start_date` nullable, `end_date` nullable, `status` (20), `is_active`, `created_at`, `updated_at` nullable.

Restricciones: `uq_academy_class_name`, `fk_academy_classes_academy`, `fk_academy_classes_training_modality`, `fk_academy_classes_default_room`, `chk_academy_class_capacity`, `chk_academy_class_dates`, `chk_academy_class_status`. Relaciones futuras: horarios, instructores, inscripciones, sesiones y planes. Cero clases al auditar; cero vínculos inválidos y cero nombres duplicados.

No se requiere script de alteración ni recrear tablas. El mapeo EF se completará para reflejar las relaciones y límites reales. No ejecutar migraciones automáticas.

## Alcance de implementación

Reutilizar entidad, tabla, rutas `/academies/:academyId/classes`, menú, autorización JWT, service Angular, respuesta estándar, componentes Vex y diálogo de confirmación Material. Completar DTOs, servicio backend, filtros, resumen agregado, formulario reutilizable de página, detalle y acciones de estado. DELETE seguirá siendo desactivación histórica por compatibilidad; el cierre tendrá acción explícita.

Solo el resumen de clase se mostrará como flujo de ETAPA 2. No desarrollar horarios, instructores, inscripciones, sesiones, asistencia, cobros ni notificaciones. Se conservarán los endpoints y modelos existentes de esas áreas y del motor de eventos.
