# Activación del motor y recálculo

Al pasar una regla de inactiva a activa, se recalculan las inscripciones existentes del evento, incluidos equipos. La presencia de inscripciones anteriores o pagos no bloquea esta activación. La pantalla advierte que las diferencias y saldos requieren revisión manual.

La activación y los nuevos cobros se guardan dentro de la misma transacción y bajo el bloqueo del evento. Los registros anteriores del motor se conservan como historial; los pagos y registros de tarifas legacy no se modifican. Los totales calculados por academia se actualizan. Las inscripciones canceladas sin categorías no se reactivan.

Guardar nuevamente una regla ya activa conserva los cobros confirmados: no repite el recálculo. Las validaciones de configuración, categorías y permisos siguen vigentes.

El botón Contraer categorías afecta exclusivamente la tabla Categorías del evento de esta pantalla; mantiene los valores editados.

Backend: copia aislada `.backend-pricing-recalculation`, rama `fix/pricing-activation-recalculation`, basada en `bte_v2` (940714c). La carpeta original del backend permanece en su rama y conserva sus cambios locales. Requiere integrar/publicar el backend y frontend para habilitar el cambio en producción. No requiere cambios de esquema.

Esta decisión reemplaza el bloqueo de activación legacy documentado el 21/09/2026. No se han recalculado eventos productivos durante el desarrollo.
