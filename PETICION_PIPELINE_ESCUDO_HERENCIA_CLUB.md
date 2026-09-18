# PETICIÓN AL PIPELINE — El escudo es del CLUB: los equipos deben HEREDARLO (origen único)

**Resumen:** hoy guardamos una copia del escudo por equipo (`web_equipo.escudo`) y la replicamos denormalizada en ~18 tablas. El del **club** (`web_club.escudo`) se refresca en su ciclo; las copias de equipo solo con `refrescar_escudos` **a mano** (no hay ciclo), así que se desincronizan entre pasadas. La web ya arregló las superficies de club (leen `web_club.escudo`, deploy `d516cf6`), pero **las de equipo siguen leyendo copias que envejecen**. Petición: **origen único = `web_club.escudo`, propagado a todas las columnas de escudo de equipo en el ciclo donde ya se refresca el club**; y **retirar `refrescar_escudos` para equipos** (queda redundante).

## Por qué
El escudo es un atributo del CLUB; el que mostramos por equipo es una **copia denormalizada** de la misma referencia, replicada en ~18 tablas. `web_club.escudo` se refresca en su ciclo; las copias de equipo solo con `refrescar_escudos` **a mano** → entre pasadas se desincronizan (110 fichas de club divergentes antes del fix; 184 clubes incoherentes entre sus propios equipos). El problema **no es la herramienta** —`refrescar_escudos` consulta `/fichaequipo`, que devuelve el `escudo_club` actualizado, y refresca bien— sino que **hay ~2.000 copias que mantener sincronizadas a mano**. Heredar del club elimina la sincronización entera: una sola referencia, poblada donde ya se refresca el club.

> **Nota factual (corrige una versión anterior de este doc):** el `0 cambios` de `refrescar_escudos --equipos 3347325` fue un **re-run POSTERIOR** a haberlo aplicado ya (el dry-run detectó y aplicó `Logo_Atl_tico… → IMG_1134.png`). NO prueba que la herramienta no sirva — **sí sirve**. `refrescar_escudos` es *innecesaria* con la herencia desplegada, **no inútil**.

## El problema, en números
- **110 clubes**: `web_club.escudo` (nuevo) ≠ escudo del primer equipo (lo que mostraba la ficha antes del fix).
- **184 clubes (31,3% de 587 con escudo)**: sus propios equipos tienen escudos **distintos entre sí** (hasta 4 en un club) — desincronización, no variedad legítima: copias de equipo actualizadas en momentos distintos (solo con `refrescar_escudos` a mano, sin ciclo).
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
**Redundante** con la herencia: si cada copia de equipo se puebla desde `web_club.escudo`, ya no hay copia que sincronizar a mano. `refrescar_escudos` **funciona** (consulta `/fichaequipo` → `escudo_club` actualizado; en 3347325 detectó y aplicó `Logo_Atl_tico… → IMG_1134.png`), pero deja de tener sentido mantener una pasada manual sobre ~2.000 copias cuando el origen único las cubre solo.

**Matiz operativo (importante mientras tanto):** hasta que la herencia esté desplegada, `refrescar_escudos` **SIGUE siendo una opción válida** para arreglar casos visibles — es *innecesaria a futuro, no inútil hoy*. Lo que NO se lanza es la **pasada masiva de 1.567**: no compensa mantener a mano un modelo que va a desaparecer (y un solo caso detectado no justifica barrer 1.567).

### 5 · Hallazgo sistémico (regla, no solo este caso)
La denormalización **club → equipo** existe en varios atributos: **nombre**, **campo**, **escudo**. Nombre y campo están copiados **Y** mantenidos (funcionan); el escudo se copió y **nadie lo mantenía sincronizado** → se rompió. **Regla: cuando se copia un atributo de padre a hijo, la pregunta no es si copiarlo, sino QUIÉN LO MANTIENE.** Sugerencia: auditar el resto de atributos denormalizados padre→hijo y confirmar que cada copia tiene un dueño de sincronización; el escudo era el que no lo tenía.

## Estado de la web (para coordinar)
- **Ya desplegado (`d516cf6`):** ficha de club e índice `/clubes` leen `web_club.escudo` (con fallback al del primer equipo). Esas dos superficies ya muestran el escudo correcto.
- **Pendiente de esta petición:** fichas de equipo, clasificaciones, resultados, trayectorias de jugador y home — siguen leyendo las copias de equipo. Cuando el pipeline las pueble desde el club, quedan al día solas (se revalidan por su tag al cambiar el dato) y no habrá nada que sincronizar.

---
_Generado desde el repo web (2026-09-18). Contraparte del arreglo web `d516cf6` y del retiro de `refrescar_escudos` para equipos._
