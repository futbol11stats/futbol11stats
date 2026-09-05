# Petición al pipeline — badge de edad de MENORES en la plantilla

## Qué se necesita
Una **columna nueva** en la tabla que ya existe **`web_equipo_plantilla_aficionado`**:

| Columna | Tipo | Valores |
|---|---|---|
| `badge_edad` | `text` (o enum) | `'juvenil'` · `'sub23'` · `NULL` |

- **Una sola columna, un valor corto por fila.** Nada de tabla nueva. Frente a los ~3,5 M de filas de `web_jugador_partidos` es despreciable.
- La fila de plantilla **ya es por (equipo, temporada)**, así que la columna es **automáticamente un dato por temporada**: el mismo jugador en T21 y T22 son dos filas, cada una con su badge correcto. No se guarda "es juvenil" como propiedad del jugador (cambiaría cada año), sino "era juvenil en ESTA plantilla".

## Por qué (el caso que lo motiva)
El badge marca en las plantillas de **equipos adultos** quién es **Sub-23** y quién es **Juvenil compitiendo por encima de su edad**. La web ya lo calcula para los **adultos** (el año de nacimiento está en `web_jugador`), pero **los menores no tienen ficha ni año accesible en la web**, así que hoy no se puede marcar al chaval de 16-17 jugando con los mayores — que es justo el caso interesante. El pipeline **sí** tiene el año de nacimiento de la federación, así que puede derivar el badge sin exponer la fecha.

## Criterio EXACTO (el mismo que aplica la web para adultos)
Sea `Y` = **año en que empieza la temporada** de la fila (2025-26 → `Y = 2025`).
Sea `edad = Y − año_de_nacimiento`.

- `edad ≤ 18` → **`'juvenil'`**
- `19 ≤ edad ≤ 22` → **`'sub23'`**
- `edad ≥ 23` → **`NULL`** (sin badge)
- Sin año de nacimiento fiable → **`NULL`** (nunca inventar)

Ejemplos: en 2025-26, `'juvenil'` = nacidos 2007+, `'sub23'` = 2003–2006. En 2026-27, `'juvenil'` = 2008+, `'sub23'` = 2004–2007.

## Regla de privacidad (imprescindible)
**Nunca el año de nacimiento de un menor. Solo el badge derivado.** "Es juvenil" es un hecho de categoría, no una fecha. La columna no debe permitir reconstruir la edad exacta (juvenil abarca 3 años; sub-23, cuatro).

## Cómo lo consume la web (ya está enganchado — no hay que tocar nada más)
`src/lib/equipoV2.ts` (`getPlantillaEquipoV2`) ya pide `badge_edad` de forma resiliente: mientras la columna **no exista**, la query falla con `42703` y reintenta sin ella (badge web-side solo para adultos). El día que el pipeline **publique la columna**, se usa automáticamente: `badge = fila.badge_edad ?? cálculo_web_por_año`. Mismo corte en ambos lados, así que los adultos no cambian y **los menores aparecen solos**, sin desplegar nada nuevo por parte de la web.

> Nota: solo hace falta en `web_equipo_plantilla_aficionado`. En `web_equipo_plantilla_juvenil` no se pinta el badge (allí todos son juveniles), así que no se necesita la columna.
