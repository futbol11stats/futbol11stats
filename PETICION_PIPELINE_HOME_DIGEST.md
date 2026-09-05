# Petición al pipeline — DIGEST de la home

## Por qué
La home es la página más visitada. Queremos mostrar, reutilizando los bloques que el usuario ya conoce de
las fichas de competición, **los líderes de TODA la RFFM** y **las cifras totales**. Calcular eso en la web
en cada regeneración sería barrer ~100 grupos y agregar todo `web_resultados`/`web_clasificacion` — caro y
justo lo que nos tumbó la BD. Solución: el pipeline publica un **digest minúsculo** (precalculado en el
ciclo) y la web solo lo lee y lo pinta con el componente `Panorama` que ya existe.

## Qué se necesita

### Tabla `web_home_lideres` — 6 filas (una por métrica)
Los seis líderes GLOBALES de la temporada activa (acumulado a la fecha), **agregando todas las
competiciones de Madrid** (aficionado + juvenil).

| Columna | Descripción |
|---|---|
| `tipo` | `'goleador'` · `'portero'` · `'pf'` · `'media_pf'` · `'elo'` · `'tarjetas'` |
| `codjugador`, `nombre` | el líder |
| `codequipo`, `equipo_nombre`, `escudo` | su equipo |
| `codgrupo`, `nombre_comp`, `grupo_nombre` | su competición y grupo (para pintar **sello + nombre + grupo** bajo el líder y poder enlazar) |
| `categoria_nivel` | nivel de categoría (para el desempate; ver abajo) |
| `valor` | la cifra que se muestra (goles, p. a cero, PF, media, ELO, tarjetas) |

### Tabla `web_home_cifras` — 1 fila
Totales de **todas** las competiciones de la RFFM en la temporada activa: partidos disputados, goles,
media de goles, % local / empate / visitante, amarillas, dobles, rojas. (Mismos campos que las cifras de la
ficha de competición, pero agregados a nivel federación.)

## Reglas (imprescindibles)

1. **SOLO jugadores con ficha publicada.** Un líder que no se puede enlazar es una tarjeta muerta —y en
   juvenil la mayoría son menores sin ficha—. Para cada métrica, elegir el **top-1 de entre los jugadores
   con ficha** (saltar a los que no la tienen). Es decir: no es "el máximo goleador de Madrid" sino "el
   máximo goleador **enlazable**".
2. **Desempate por CATEGORÍA SUPERIOR.** Al empatar el `valor`, gana el de categoría más alta (20 goles en
   3ª RFEF valen más que 20 en 2ª Aficionado). Ordenar por `categoria_nivel` (según vuestra convención de
   niveles). Esto solo aplica aquí (la home mezcla categorías); en las fichas de competición no, porque son
   de una sola categoría.
3. **Temporada activa con jornadas dispares.** No hay una jornada global. Cada competición aporta su líder
   **acumulado a su jornada actual** de la temporada que tiene en juego; el digest es una **foto del último
   ciclo** de re-export. Una competición que aún no ha empezado su nueva temporada no aporta (o aporta su
   última en juego) — a criterio del pipeline, pero que quede documentado y sea consistente.

## Cómo lo consume la web
`Panorama` (el bloque de líderes + cifras de las fichas de competición) se reutiliza tal cual, alimentado
por estas dos tablas. Bajo cada líder se pinta el **sello de competición + nombre + grupo** (mismo trío que
en las fichas). La home hace **dos lecturas diminutas**; caché ISR larga + invalidación on-demand (tag
`home`) tras el re-export. Cero regeneración por visita.
