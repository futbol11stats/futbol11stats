# Petición al pipeline — DIGEST de la home

> **BUG DETECTADO EN EL DIGEST (bloque='categoria') — corregir en el pipeline:**
> el líder por PF de una categoría NO está cogiendo el máximo, sino el **segundo**. Caso comprobado en
> 3ª RFEF (grupo 7, temporada 21): el digest publicó `cat:aficionados:1` = **BARRIOS SABORIDO (147 PF)**,
> que es el **rank 2**; el máximo real es **PACHECO PEREZ, ESTEBAN (153 PF), con ficha, rank 1**. No es el
> filtro de ficha (ambos la tienen). Revisar la selección del mejor PF por categoría (parece off-by-one o
> que descarta indebidamente al rank 1). La web pinta el digest tal cual, así que se corrige en origen.

> **IMPLEMENTADO (2026-09) — el pipeline lo publicó así, y la web consume ESTO:**
> No hay `web_home_lideres_categoria`. **Todo está en `web_home_lideres`**, con una columna `bloque`:
> - `bloque='metrica'` → 6 filas, `tipo` ∈ goleador/portero/pf/media_pf/elo/tarjetas.
> - `bloque='categoria'` → 10 filas (una por categoría), mejor PF; `tipo='cat:<rama>:<nivel>'`.
> Columnas: `tipo, codjugador, nombre, codequipo, equipo_nombre, escudo, codgrupo, nombre_comp,
> grupo_nombre, categoria_nivel, codtemporada, valor, bloque, categoria_rama, orden`.
> **El nivel es RAMA-RELATIVO** (aficionados y juvenil comparten 1-5), así que el bloque de categorías se
> ordena por **`orden`** (aficionados 1-5, juvenil 101-105), no por `categoria_nivel`. Cifras aparte en
> `web_home_cifras`. La web hace **dos lecturas** (una por tabla). Lo de abajo es la petición original.
>
> **FALTAN en `web_home_cifras`** (la web ya las pinta en cuanto existan; hoy salen ocultas): **`equipos`**
> (nº de equipos), **`elo_medio`** (ELO medio por equipo) y **`porterias_cero`** (total). Completan los
> bloques "Competición" (Equipos + ELO medio) y "Goles" (Porterías a cero), como en la ficha de competición.

---


## Por qué
La home es la página más visitada. Queremos mostrar, reutilizando el aspecto de las fichas de competición,
**dos bloques de líderes** + las **cifras totales** de la RFFM. Calcular eso en la web en cada regeneración
sería barrer ~100 grupos, filtrar por ficha y agregar todo `web_resultados` — caro y justo lo que nos tumbó
la BD. Solución: el pipeline publica un **digest minúsculo** (precalculado en el ciclo) y la web solo lo lee
y lo pinta. **Los dos bloques CONVIVEN** (cuentan cosas distintas), no se sustituye ninguno.

## Qué se necesita — TRES tablas

### A) `web_home_lideres_categoria` — el mejor por PF de CADA categoría  ·  (bloque 1, arriba)
Quién MANDA EN CADA DIVISIÓN. **Una fila por nivel de categoría** (3ª RFEF, 1ª Aficionada, 2ª Aficionada,
Nacional Juvenil, …): el mejor jugador por **PUNTOS FANTASY** de esa categoría en la temporada activa
(acumulado a la fecha). La web las ordena de la categoría más alta a la más baja, una tarjeta por cada una.

| Columna | Descripción |
|---|---|
| `categoria_nivel` | nivel de categoría (la web ordena por él, de más alta a más baja) |
| `nombre_comp` | nombre de la categoría/competición (cabecera de la tarjeta + sello) |
| `codjugador`, `nombre` | el mejor PF de esa categoría **con ficha** |
| `codequipo`, `equipo_nombre`, `escudo` | su equipo |
| `codgrupo`, `grupo_nombre` | su grupo (contexto bajo el líder + enlace) |
| `valor` | sus **puntos fantasy** totales de la temporada |

> Solo **PF** en este bloque: es el dato propio y el más justo (recoge goles, minutos, porterías a cero y
> tarjetas; puede encabezarlo un central o un portero). Como cada tarjeta es de UNA categoría, **no** hace
> falta desempate entre categorías; empates dentro de una categoría, a criterio del pipeline (p. ej. menos
> partidos = mejor por partido).

### B) `web_home_lideres` — los 6 líderes de toda la RFFM por métrica  ·  (bloque 2, debajo)
Quién es EL MEJOR DE MADRID EN CADA FACETA. **6 filas, una por métrica**, agregando todas las competiciones.

| Columna | Descripción |
|---|---|
| `tipo` | `'goleador'` · `'portero'` · `'pf'` · `'media_pf'` · `'elo'` · `'tarjetas'` |
| `codjugador`, `nombre` | el líder |
| `codequipo`, `equipo_nombre`, `escudo` | su equipo |
| `codgrupo`, `nombre_comp`, `grupo_nombre` | su competición y grupo (**sello + nombre + grupo** bajo el líder + enlace) |
| `categoria_nivel` | nivel de categoría (para el DESEMPATE; ver reglas) |
| `valor` | la cifra que se muestra (goles, p. a cero, PF, media, ELO, tarjetas) |

### C) `web_home_cifras` — 1 fila
Totales de **todas** las competiciones de la RFFM en la temporada activa: partidos disputados, goles, media
de goles, % local / empate / visitante, amarillas, dobles, rojas. (Mismos campos que las cifras de la ficha
de competición, agregados a nivel federación.)

## Reglas (imprescindibles)

1. **SOLO jugadores con ficha publicada**, en A y en B. Un líder que no se puede enlazar es una tarjeta
   muerta —y en juvenil la mayoría son menores sin ficha—: elegir siempre el mejor **de entre los que
   tienen ficha** (saltar a los que no la tienen).
2. **Desempate por CATEGORÍA SUPERIOR — SOLO en el bloque B.** Al empatar el `valor`, gana el de categoría
   más alta (20 goles en 3ª RFEF valen más que 20 en 2ª Aficionado); ordenar por `categoria_nivel`. En el
   bloque A no aplica (cada tarjeta es de una sola categoría). En las fichas de competición tampoco (una sola
   categoría).
3. **Métrica de A = puntos fantasy totales de la temporada** (mismo criterio que el ranking general).
4. **Temporada activa con jornadas dispares.** No hay una jornada global. Cada categoría/competición aporta
   su líder **acumulado a su jornada actual** de la temporada que tiene en juego; el digest es una **foto del
   último ciclo** de re-export. Una competición que aún no ha empezado su nueva temporada no aporta (o aporta
   su última en juego) — a criterio del pipeline, pero que quede documentado y sea consistente.

## Cómo lo consume la web (orden en la home)
1. **Bloque A** primero (el hallazgo, lo que nadie más ofrece): una tarjeta por categoría (sello + nombre de
   cabecera; jugador, equipo, grupo y su PF), ordenadas por `categoria_nivel`. Cabecera que explica la
   métrica sin tecnicismo: **"Mejor jugador de cada categoría · por puntos fantasy"**.
2. **Bloque B** debajo: los 6 líderes por métrica (se reutiliza `Panorama`), con **sello + nombre + grupo**
   bajo cada uno.
3. Debajo, las **cifras totales** (`web_home_cifras`).

La home hace **tres lecturas diminutas**; caché ISR larga + invalidación on-demand (tag `home`) tras el
re-export. Cero regeneración por visita. Piezas de catálogo (`Sello`, `PlayerRow`, `Panorama`), sin inventar
nada nuevo.
