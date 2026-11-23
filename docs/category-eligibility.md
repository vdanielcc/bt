# Categorías disponibles por deportista

La API filtra `GET /api/Categories/available-categories` usando las modalidades de `student_modalities`. Si el deportista no tiene registros en esa tabla, no se filtra por modalidad. Se conservan el evento y el género (incluido Mixto).

Se muestran categorías cuyo rango incluya la edad del deportista, incluidas las abiertas. También se permiten categorías que comiencen hasta cuatro años sobre su edad, aunque terminen después. Para 7 años se muestran 6–7, 8–9, 10–12 y 11–99; se excluye 12–13. Los rangos invertidos se excluyen.

Coach se muestra a todos los deportistas cuya edad sea estrictamente mayor que el umbral configurado, independientemente de sus modalidades deportivas. Con 14, aparece desde los 15 años. Las personas con rol Coach conservan acceso a sus categorías Coach.

Configuración en el `appsettings.json` del backend:

```json
{
  "CategoryEligibility": {
    "CoachAgeThreshold": 14
  }
}
```

También puede configurarse mediante `CategoryEligibility__CoachAgeThreshold` en el entorno del servicio. Si no se define la clave, se usa 14. Después de cambiar la configuración del entorno, reiniciar la API. Esta regla solo muestra categorías Coach asociadas al evento consultado y no modifica el máximo de categorías permitido por inscripción.
