# PETICIÓN AL PIPELINE — El escudo es del CLUB: los equipos deben HEREDARLO (origen único)

**Resumen:** hoy guardamos una copia del escudo por equipo (`web_equipo.escudo`) y la replicamos denormalizada en ~18 tablas. El del **club** (`web_club.escudo`) se refresca con el rebrand; las copias de equipo **no**, y se desincronizan. La web ya arregló las superficies de club (leen `web_club.escudo`, deploy `d516cf6`), pero **las de equipo siguen leyendo copias que envejecen**. Petición: **origen único = `web_club.escudo`, propagado a todas las columnas de escudo de equipo en el ciclo donde ya se refresca el club**; y **retirar `refrescar_escudos` para equipos**.

## Por qué (el hallazgo que lo cierra)
`refrescar_escudos.py --equipos 3347325 --apply` → **0 cambios**. La propia RFFM sirve para el **equipo** 3347325 el escudo viejo (pre-rebrand); el nuevo **solo existe en el nivel CLUB** de la RFFM (→ `web_club.escudo`). Es decir: **`refrescar_escudos` es INÚTIL justo para los rebrands**, que son los casos que importan. No se re-scrapea el equipo: no hay de dónde sacar el nuevo por esa vía.

## El problema, en números
- **110 clubes**: `web_club.escudo` (nuevo) ≠ escudo del primer equipo (lo que mostraba la ficha antes del fix).
- **184 clubes (31,3% de 587 con escudo)**: sus propios equipos tienen escudos **distintos entre sí** (hasta 4 en un club) — desincronización pura, no variedad legítima (la RFFM expone un escudo por equipo que envejece por su cuenta).
- No hay casos legítimos de escudo distinto por equipo: lo único que diferenciaría sería temporal (crest de una época), y el sitio no usa escudos por época.

## La petición

### 1 · Origen único
`web_club.escudo` (hash rehospedado, ya se refresca con el rebrand del club). **No se añade un ciclo nuevo**: se propaga desde donde ya se refresca el escudo del club.

### 2 · Alcance real — TODAS las copias (no solo `web_equipo`)
Cada escudo de EQUIPO que publicamos es una copia de la misma referencia y envejece por su cuenta. Resolver **por `codequipo → codclub → web_club.escudo`** y poblar todas:

- **Escudo del propio equipo:** `web_equipo.escudo`, `web_clasificacion.escudo`, `web_equipos_forma.escudo`, `web_juego_limpio.escudo`, `web_suspendidos.escudo`, `web_xi_optimo.escudo`, `web_top_jugadores.escudo`, `web_home_lideres.escudo`, `web_alertas_tarjetas.escudo`, `web_jugador_carrera.escudo`, `web_jugador_actuaciones.escudo`, `web_jugador_partidos.escudo`, `web_jugador_hitos.escudo`.
- **Escudo del RIVAL** (equipo rival → su club): `web_resultados.escudo_local` + `escudo_visitante`, `web_jugador_actuaciones.rival_escudo`, `web_jugador_partidos.rival_escudo`, `web_jugador_hitos.rival_escudo`, `web_equipo_hitos.rival_escudo`, `web_equipo_movimientos.equipo_rel_escudo`.
- **Escudo del equipo ACTUAL del jugador:** `web_jugador.escudo_actual` (equipo actual → su club).

Si alguna de estas tablas no lleva `codclub`/`codequipo` resoluble, decidlo y lo vemos.

### 3 · Fallback (número + criterio, para no inventarlo)
De **1.933 equipos**: **1.768 (91,5%)** tienen club con escudo válido → heredan. Necesitan fallback **165**:
- **6 equipos sin `codclub`**.
- **159 equipos cuyo club no tiene escudo válido** (de **101 clubes** con equipos y `web_club.escudo` NULL o ruta cruda `/…`).

**Criterio propuesto:** si el equipo no tiene club, o el club no tiene escudo válido → **conservar el escudo scrapeado del propio equipo** (lo de hoy) como fallback; si tampoco hay, `null`. Así nadie pierde imagen y el 91,5% pasa a fuente única.

### 4 · Retiro de `refrescar_escudos` para equipos
No solo sobra: **no funciona para el caso que la justificaba**. Los escudos de equipo se pedían para captar cambios de crest, pero en un rebrand la RFFM deja el escudo del EQUIPO desfasado y solo actualiza el del CLUB (probado en 3347325: 0 cambios). Con herencia del club, el refresco por equipo no aporta nada. **La pasada de 1.567 no se lanza** — no habría arreglado nada.

### 5 · Hallazgo sistémico (regla, no solo este caso)
La denormalización **club → equipo** existe en varios atributos: **nombre**, **campo**, **escudo**. Nombre y campo están copiados **Y** mantenidos (funcionan); el escudo se copió y **nadie lo mantenía sincronizado** → se rompió. **Regla: cuando se copia un atributo de padre a hijo, la pregunta no es si copiarlo, sino QUIÉN LO MANTIENE.** Sugerencia: auditar el resto de atributos denormalizados padre→hijo y confirmar que cada copia tiene un dueño de sincronización; el escudo era el que no lo tenía.

## Estado de la web (para coordinar)
- **Ya desplegado (`d516cf6`):** ficha de club e índice `/clubes` leen `web_club.escudo` (con fallback al del primer equipo). Esas dos superficies ya muestran el escudo correcto.
- **Pendiente de esta petición:** fichas de equipo, clasificaciones, resultados, trayectorias de jugador y home — siguen leyendo las copias de equipo. Cuando el pipeline las pueble desde el club, quedan al día solas (se revalidan por su tag al cambiar el dato) y no habrá nada que sincronizar.

---
_Generado desde el repo web (2026-09-18). Contraparte del arreglo web `d516cf6` y del retiro de `refrescar_escudos` para equipos._
