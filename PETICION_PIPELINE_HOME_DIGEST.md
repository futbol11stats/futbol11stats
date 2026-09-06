# Petición al pipeline — DIGEST de la home

## Por qué
La home es la página más visitada. Queremos mostrar **el mejor jugador de cada categoría por PUNTOS
FANTASY** y las **cifras totales** de la RFFM, reutilizando el aspecto de las fichas. Calcular eso en la web
en cada regeneración sería barrer ~100 grupos, filtrar por ficha y agregar todo `web_resultados` — caro y
justo lo que nos tumbó la BD. Solución: el pipeline publica un **digest minúsculo** (precalculado en el
ciclo) y la web solo lo lee y lo pinta.

## Qué se necesita

### Tabla `web_home_lideres` — UNA fila por NIVEL DE CATEGORÍA
No son 6 métricas: es **el mejor jugador por PUNTOS FANTASY de CADA categoría** (3ª RFEF, 1ª Aficionada,
2ª Aficionada, Nacional Juvenil, …), en la temporada activa (acumulado a la fecha). La web las ordena de la
categoría más alta a la más baja y pinta una tarjeta por cada una.

| Columna | Descripción |
|---|---|
| `categoria_nivel` | nivel de categoría (la web ordena por él, de más alta a más baja) |
| `nombre_comp` | nombre de la categoría/competición (cabecera de la tarjeta + sello) |
| `codjugador`, `nombre` | el mejor PF de esa categoría **con ficha** |
| `codequipo`, `equipo_nombre`, `escudo` | su equipo |
| `codgrupo`, `grupo_nombre` | su grupo (contexto bajo el líder + enlace) |
| `valor` | sus **puntos fantasy** totales de la temporada |

> Solo **PUNTOS FANTASY**. Se descartan goleador, portero, media, ELO y tarjetas para la home: PF es el dato
> propio y el más justo (recoge goles, minutos, porterías a cero y tarjetas, así que puede encabezarlo un
> central o un portero). El ELO queda fuera a propósito (mide nivel, no rendimiento de esta temporada).

### Tabla `web_home_cifras` — 1 fila
Totales de **todas** las competiciones de la RFFM en la temporada activa: partidos disputados, goles,
media de goles, % local / empate / visitante, amarillas, dobles, rojas. (Mismos campos que las cifras de la
ficha de competición, pero agregados a nivel federación.)

## Reglas (imprescindibles)

1. **SOLO jugadores con ficha publicada.** Un líder que no se puede enlazar es una tarjeta muerta —y en
   juvenil la mayoría son menores sin ficha—. En cada categoría, elegir el mejor PF **de entre los que
   tienen ficha** (saltar a los que no la tienen).
2. **Métrica: puntos fantasy TOTALES de la temporada** (mismo criterio que el ranking general). Un líder por
   categoría; como cada tarjeta es de UNA categoría, ya no hace falta desempate entre categorías. Empates
   dentro de una categoría, a criterio del pipeline (p. ej. menos partidos = mejor por partido).
3. **Temporada activa con jornadas dispares.** No hay una jornada global. Cada categoría aporta su líder
   **acumulado a su jornada actual** de la temporada que tiene en juego; el digest es una **foto del último
   ciclo** de re-export. Una competición que aún no ha empezado su nueva temporada no aporta (o aporta su
   última en juego) — a criterio del pipeline, pero que quede documentado y sea consistente.

## Cómo lo consume la web
Una tarjeta por fila de `web_home_lideres` (sello de competición + nombre como cabecera; jugador, equipo,
grupo y su cifra PF), ordenadas por `categoria_nivel`. La cabecera del bloque explica la métrica sin
tecnicismo: **"Mejor jugador de cada categoría · por puntos fantasy"**. Debajo, las cifras totales
(`web_home_cifras`). La home hace **dos lecturas diminutas**; caché ISR larga + invalidación on-demand (tag
`home`) tras el re-export. Cero regeneración por visita. Piezas de catálogo (`Sello` + fila tipo
`PlayerRow`), sin inventar nada nuevo.
