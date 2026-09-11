# Pipeline · Publicar los VOLÚMENES DE ALCANCE (all-time) para que la web no los tenga a mano

**Fecha:** 2026-09-12 · **Contexto:** las cifras de escaparate de la home y /sobre ("39.000 jugadores ·
1.900 equipos · 105.000+ partidos") viven hoy en un módulo web (`src/lib/alcance.ts`, constantes a mano). El
nº de temporadas ya se DERIVA del dato. Falta cerrar el círculo con los volúmenes: que los publique el pipeline
y la web los lea de la BD → no se tocan nunca más a mano.

## OJO — matiz que cambia el diseño: son ALL-TIME, no de la temporada
`web_home_cifras` NO sirve para esto tal cual: es **por temporada** (tiene `codtemporada`;
`partidos_disputados` = partidos de la TEMPORADA ACTIVA, que en pretemporada son cuatro). Las cifras de
escaparate son **acumuladas de todo el histórico** (T17→hoy): "39.000 jugadores que han pasado por el sistema",
"106.000 partidos jugados en 6 temporadas". Reusar `partidos_disputados` daría un número diminuto y falso.

## Qué se pide (all-time, una sola fila)
Un puñado de totales acumulados. **Recomendado: tabla nueva `web_alcance` de UNA fila** (sin `codtemporada`),
más limpio que mezclar all-time con lo per-temporada de `web_home_cifras`:

| columna | qué cuenta | valor real 2026-09-12 (baseline) |
|---|---|---:|
| `jugadores` | `count(*)` de `web_jugador` | 39.517 |
| `equipos` | `count(*)` de `web_equipo` | 1.930 |
| `clubes` | `count(DISTINCT codclub)` de `web_equipo` | 593 |
| `partidos` | `count(*)` de `web_resultados` con `goles_local IS NOT NULL` (JUGADOS, todas las temporadas) | 106.869 |

- `campos` (opcional, si es barato): nº de campos con ≥1 equipo. Hoy no se usa en texto de usuario, pero lo
  dejaría preparado por si se añade.
- **Temporadas NO hace falta**: la web ya lo deriva (T_top − T16, primera = T17). Si prefieres publicarlo también
  por consistencia, bienvenido, pero no es necesario.
- Mismas convenciones que el resto de `web_*`: **RLS de lectura anon** y en el **INIT_SQL** (sobrevive a recreate).
- (Alternativa si no quieres tabla nueva: columnas `*_historico` en `web_home_cifras` con nombre inequívoco que
  las distinga de las per-temporada. Pero la tabla dedicada es más clara.)

## Cuándo y cómo se refresca
- Sincronizar en el **re-export** (--all), como el resto de agregados. No hace falta en el publish ligero (estas
  cifras se mueven despacio).
- Emitir un tag que la web escuche para refrescar: vale **`indices`** (la web puede colgar la lectura de ese tag)
  o uno nuevo `alcance` si prefieres acotarlo. Dímelo y lo alineo en la web (mismo cuidado que con `club:<cod>`:
  si el tag no coincide, la cifra se queda rancia).

## Lado web (lo hago yo cuando exista la tabla)
- Nueva lectura cacheada (una fila diminuta) que sustituye a `ALCANCE` en `src/lib/alcance.ts`. `getNumTemporadas()`
  se queda como está (derivado).
- **El redondeo y el "+" se quedan en la web**: publica los EXACTOS; la web redondea A LA BAJA para que el "+"
  sea siempre cierto (así no repetimos el "110.000+" inflado: hoy hay 106.869 jugados → se muestra "105.000+").
- Con eso, ni `ALCANCE` ni ningún texto se tocan a mano: los números suben solos con cada re-export.
