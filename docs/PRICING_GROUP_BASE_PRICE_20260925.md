# Precio base propio por grupo

En el cálculo por grupos, el primer grupo cobrable usa `basePrice` del grupo cuando tiene un valor; si es nulo, usa el precio base general. Los grupos siguientes siguen utilizando su adicional propio o el adicional general. El orden y la prioridad de grupo base no cambian.

Ejemplo: precio general $20.000, grupo Equipos con base propia $30.000. Una inscripción en Equipos cuesta $30.000 aunque sea el único grupo seleccionado. Las inscripciones individuales en grupos sin base propia continúan usando $20.000. Cero es un valor explícito; vacío significa heredar. Las modalidades y categorías gratuitas conservan su prioridad. Cada grupo se cobra una sola vez.

El motor devuelve la base efectiva en `basePrice` y `baseAmount`; los adicionales y el total mantienen un desglose consistente. Guardar una regla activa conserva los cobros ya confirmados. El recálculo al activar una regla también usa la base propia.

## Publicación

1. Respaldar y aplicar `.backend-pricing-recalculation/Scripts/20260925_event_price_group_base_price.sql` en la base del backend.
2. Verificar que `event_price_groups.base_price` sea `DECIMAL(10,2)`, nullable. Los grupos existentes quedan en NULL y conservan su comportamiento anterior.
3. Publicar el backend actualizado y después el frontend.
4. En Tarifas, asignar $30.000 a Precio base propio del grupo Equipos y guardar. El campo Adicional propio sigue teniendo su función anterior.

No se aplicó el script ni se modificaron tarifas productivas durante el desarrollo. Los cambios de backend están en la copia aislada `.backend-pricing-recalculation`.
