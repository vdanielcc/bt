# Cómo configurar tarifas por evento en Budo Tournaments

Cada evento tiene su propia configuración de tarifas, con una sola regla activa. Puedes cobrar por categoría o por grupos de categorías.

## Requisito previo

La API del motor tarifario ya fue publicada. En el despliegue del 21 de septiembre de 2026, el frontend quedó compilado como ZIP para su instalación manual. Si todavía no instalaste ese ZIP, la nueva pantalla no aparecerá.

Archivo: `release/pricing-production-20260921-150845/bte-frontend-pricing-production.zip`.

## 1. Abrir las tarifas del evento

En **Mis eventos**, entra al resumen del evento y pulsa **Tarifas de inscripción**. También puedes acceder desde la administración de eventos.

Necesitas ser administrador global o administrar la academia organizadora.

## 2. Completar los datos de la tarifa

- **Nombre de la tarifa:** por ejemplo, “Inscripción Copa Primavera”.
- **Tipo de cálculo:** “Por categoría” o “Por grupo tarifario”.
- **Precio primera unidad (CLP):** por ejemplo, `20000`.
- **Precio unidad adicional (CLP):** por ejemplo, `10000`.

| Tipo | Cómo cobra | Ejemplo con primera unidad de $20.000 y adicional de $10.000 |
| --- | --- | --- |
| Por categoría | Cada categoría cobrable cuenta como una unidad. | Una categoría: $20.000; dos: $30.000; tres: $40.000. |
| Por grupo tarifario | Cada grupo distinto cuenta una sola vez, aunque incluya varias categorías inscritas. | Kata y Kumite del mismo grupo: $20.000; agregar una categoría de otro grupo: $30.000. |

## 3. Configurar grupos, si corresponde

Si elegiste **Por grupo tarifario**:

1. Pulsa **Crear grupo**.
2. Define su nombre y orden, y deja marcado **Activo**.
3. Asigna cada categoría cobrable a un grupo en la tabla **Categorías del evento**.

Por ejemplo, crea los grupos **Junior** y **Sub21**, y asigna las categorías de Kata y Kumite correspondientes a cada uno.

Puedes marcar un único **Grupo base**, que tendrá prioridad para recibir el precio inicial. Si el competidor no participa en ese grupo, otro de sus grupos ocupará esa posición según el orden configurado; en caso de empate, se utiliza el identificador del grupo.

El campo **Adicional propio (opcional)** permite fijar un precio adicional especial para ese grupo cuando se cobra como unidad adicional. Si lo dejas vacío, se utiliza el precio adicional general.

Cada categoría cobrable debe tener un grupo activo asignado. Una categoría no puede pertenecer a varios grupos dentro de la regla.

## 4. Configurar inscripciones gratuitas

Puedes marcar una modalidad completa en **Modalidades sin costo**, o categorías individuales con **Sin costo**.

Las categorías gratuitas no cuentan como unidades cobrables. Si toda la selección es gratuita, el total es $0.

La gratuidad por modalidad prevalece sobre la configuración individual de sus categorías.

## 5. Activar y guardar

Marca **Activar motor tarifario** y pulsa **Guardar configuración**.

Sin activarlo, el evento continúa usando el cálculo anterior, basado en TicketFactor.

## 6. Simular una inscripción

En **Simular inscripción**, selecciona las categorías que quieras comprobar y pulsa el botón del mismo nombre.

La simulación utiliza la configuración **guardada y activa**. Guarda cualquier cambio pendiente antes de simular. La simulación no crea una inscripción ni un cobro.

Ejemplos con precio inicial de $20.000 y adicional de $10.000:

| Selección | Configuración | Total esperado |
| --- | --- | ---: |
| Una categoría cobrable | Por categoría | $20.000 |
| Dos categorías cobrables | Por categoría | $30.000 |
| Kata y Kumite de Junior | Ambas en el grupo Junior | $20.000 |
| Kata Junior y Kata Sub21 | Grupos distintos, sin adicionales propios | $30.000 |
| Sólo categorías gratuitas | Cualquiera de los dos tipos | $0 |
| Una categoría gratuita y una cobrable | Cualquiera de los dos tipos | $20.000 |

## Eventos con inscripciones existentes

Si el evento ya tiene inscritos con el sistema anterior, la activación se bloquea hasta revisar su migración. Lo ideal es configurar la regla antes de abrir inscripciones.

Cambiar una tarifa no modifica automáticamente los cobros ya confirmados: estos conservan el importe registrado. Tampoco se permite volver al sistema anterior cuando el evento ya tiene historial de cobros del motor nuevo.

Repite estos pasos para cada evento. Las reglas y las gratuidades se configuran de forma independiente.
