# Respuesta del pipeline — Líder "Mejor PF" de la ficha de competición

> Responde a `PETICION_PIPELINE_HOME_DIGEST.md` (bloque de líderes) y al hallazgo de que el líder de 3ª RFEF
> de la ficha no coincidía con el de la home. **Conclusión: el digest de la home estaba BIEN; quien mostraba
> el líder viejo era la ficha de competición.** Abajo, la causa y el arreglo (lado web, coste cero).

## El problema (en una línea)

La ficha de competición elige el líder de PF con `pick('fantasy_temp')` = **rank 1 de la jornada MÁS ALTA**
(un snapshot por jornada). Pero **los snapshots por jornada se CONGELAN cuando la temporada deja de estar
"viva"**, mientras que la **foto-final** (`fantasy_temp`, `jornada IS NULL`) se recomputa en cada ciclo. Si
tras el cierre hay una corrección (rebaremo, re-escrapeo, curación), la foto-final la recoge y el snapshot
NO → divergen **sin dar error**, y ambas cifras parecen plausibles.

## Evidencia (T21, 3ª RFEF Madrid Grupo 7)

- Fuente de verdad (`puntuacion_jornada`): **Barrios 147 pts** (30 partidos), **Esteban 126** (33 partidos).
- Foto-final (`jornada IS NULL`) = lo que lee el **digest de la home** = **Barrios 147** ✓ correcto.
- Snapshot de la última jornada (j34) = lo que lee la **ficha** = **Esteban 153** ✗ (su total real es 126).
- Causa del 153→126: el **rebaremo de agosto 2026** (commit `503de61`) recalculó `puntuacion_jornada`; la
  foto-final lo absorbió, el snapshot congelado de T21 se quedó con el valor anterior. **No es mezcla de
  copa/temporada** (el `pj` del snapshot = 33 = el de la fuente; si sumara la copa de T22 sería 36+).

## El arreglo (lado WEB)

Para el líder **"final"** (la vista por defecto, sin tocar el deslizador), leer la **foto-final**
(`jornada IS NULL`) en vez del rank 1 de la última jornada. En `getLideresV2` / `getGlobalTopTemporadaV2`,
en el `pick`/orden de `fantasy_temp` (y por coherencia `goleadores_temp` / `porteros_temp` / `elo_temp`):
**preferir la fila `jornada IS NULL` cuando exista**; usar los snapshots por jornada SOLO para las posiciones
intermedias del time-machine.

### Qué NO hace falta
- **Nada del pipeline:** el dato correcto ya está en Supabase (fila `jornada IS NULL` de `web_top_jugadores`).
  No hay que reexportar.
- **Revalidación:** el propio deploy regenera las páginas; se corrige solo en la siguiente regeneración.
  Opcional para inmediatez: revalidar `comp:<codgrupo>` de los 2 grupos de abajo.

### Fichas afectadas hoy: exactamente 2 (ambas T21)

Goleadores: 0 grupos. T17–T20 no tienen snapshots por jornada → ya leen la foto-final, sin desfase.

| Competición · grupo | La ficha muestra ahora (snapshot viejo) | Pasará a mostrar (foto-final, correcto) |
|---|---|---|
| **3ª RFEF Madrid · Grupo 7** | `3015446` Pacheco (153) | `15579825` **Barrios (147)** |
| **1ª Aficionados Madrid · Grupo 5** | `1095180` (177) | `228269` **(186)** |

Tras el cambio, la ficha coincide con la home y con la fuente **por construcción**.

## Límite conocido que ESTE arreglo NO cubre (info)

El **deslizador time-machine** de una temporada cerrada sigue mostrando valores **pre-corrección en TODAS las
jornadas**, no solo la última (en el caso de arriba: +3 pts en la j1 creciendo hasta +27 en la j34). La opción
de arriba arregla el **líder final** (vista por defecto); los números intermedios del slider solo se corrigen
**re-generando los snapshots** de esa temporada tras la corrección, hoy limitado en el pipeline a temporadas
"vivas". Queda anotado en el `PENDIENTES.md` del pipeline; no se arregla ahora (son unos puntos en el slider
histórico de temporadas cerradas que sufrieron un rebaremo).

---
*Generado por el pipeline (rffm) el 2026-09-06.*
