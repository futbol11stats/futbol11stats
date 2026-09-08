# Pipeline · `web_equipo.elo_serie` coge el ELO de la fila de mayor JORNADA, no del último partido por FECHA

**Fecha:** 2026-09-09 · **Origen:** ficha de equipo (caso México F.C. 'A', cod 2002, T22).

## Síntoma
La ficha de equipo pinta el ELO de la temporada seleccionada desde `web_equipo.elo_serie[t]`
(cabecera KPI y tarjetas del bloque Temporadas). En equipos que **juegan liga y copa a la vez** al
principio de temporada, muestra un ELO desactualizado: el de **cierre de la copa**, no el del último
partido jugado (la liga, que se disputó después).

### Ejemplo (México 'A', 2002, T22)
| Fuente | Valor T22 | ¿Correcto? |
|---|---|---|
| `web_resultados.elo_post` (liga J1, 0-0 vs Fuenlabrada) | 1086,48 | ✅ el partido restó ~6 |
| `web_clasificacion` liga J1 (codgrupo_familia NULL) | 1086,5 | ✅ |
| `web_equipo.elo_actual` | **1086,5** | ✅ (lo calculas bien, por fecha) |
| **`web_equipo.elo_serie[t=22]`** | **1092,2** | ❌ es el cierre de la COPA |

Orden cronológico real del equipo esta temporada: **copa (3 partidos → 1092,2) → liga J1 (1092,2 → 1086,5)**.
En `web_resultados` se ve encadenado: el `elo_pre_local` de la liga J1 (1092,21) = el `elo_post` de la
última ronda de copa (1092,21). O sea, la liga se jugó **después** de la copa. El ELO actual real es 1086,5
—y `elo_actual` lo tiene bien—, pero `elo_serie[t=22]` guardó 1092,2.

## Causa
El punto por temporada de `elo_serie` se elige por la fila de **mayor número de jornada** de esa temporada.
Pero las rondas de copa (`codgrupo_familia = 'fam-copa-*'`, jornadas 1/2/3…) tienen número de jornada
**mayor** que la J1 de una liga recién empezada → se escoge la fila de copa (jornada 3) en vez de la de
liga (jornada 1), que es **posterior por fecha**. **La jornada no es una cronología entre competiciones**:
en copa es un contador de ronda; en liga, la jornada de calendario.

## Arreglo pedido
Construir cada punto de `elo_serie[t]` con el ELO del **último partido por FECHA** de esa temporada
(exactamente el criterio que ya usa `elo_actual`, pero acotado por temporada), **no** por `MAX(jornada)`.
Para la temporada viva, `elo_serie[t_actual]` debería coincidir con `elo_actual`.

## Esto NO es un caso suelto — es la 4ª vez del mismo patrón (anótalo con esta referencia)
"Elegir la fila por número de jornada" nos ha dado la fila equivocada ya **cuatro** veces:
1. **ELO de cierre de temporada del jugador** (mismo error, versión jugador).
2. **Contador de rondas de la copa** (la jornada de copa = ronda, no matchday).
3. **Emparejamiento del pronóstico** (cruzar por jornada emparejaba mal liga/copa).
4. **`elo_serie` del equipo** (este).
Conviene anotarlo como **familia de bug** ("no ordenar/elegir por `jornada` cuando el conjunto mezcla
liga y copa; usar FECHA"), no como incidencia aislada, y barrer el export con esa lente.

## Pregunta para el pipeline
Si `elo_actual` ya lo calcula bien **por fecha**, ¿por qué `elo_serie` usa otro criterio (max jornada)?
Puede que haya **más campos del mismo export con la misma mezcla** — cualquier "último/cierre por
temporada" que ordene por `jornada` en vez de por `fecha`. Merece una revisión del export completo.

## Alcance (medido hoy, antes del arreglo)
- **8 equipos afectados en T22** — los que juegan liga + copa a la vez ahora (3ª RFEF grupo 7 + copa-rfef-t22).
  Desvíos de −24,2 a +13,7 ELO:
  366 Navalcarnero (−24,2), 1592 Unión Adarve (−22,8), 85 Colonia Moscardó (−13,7),
  2363 Torrejón (+13,7), 1532 Boadilla (+6,5), 2002 México (+5,7), 2172 Fuenlabrada (−5,7), 293 Las Rozas (−1,7).
- Es un **puñado**, no cientos: el fallo solo aparece cuando la liga lleva pocas jornadas (números de jornada
  bajos) frente a las rondas de copa ya jugadas; en temporadas cerradas la liga (J34) domina el número de
  jornada y el criterio actual acierta por casualidad. La medición directa `elo_serie` vs `web_resultados.elo_post`
  entre temporadas NO es fiable (referencias de cálculo distintas entre ambas tablas), por eso el alcance se
  midió contra `elo_actual`, que es la verdad por fecha.
- **Republicación tras el arreglo:** revalidar las ~8 fichas de equipo (tag `equipo`) tras el re-export.
  La clasificación por grupo ya está bien; no hay nada más que republicar.
