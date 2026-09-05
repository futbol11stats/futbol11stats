# Petición al pipeline — rankings SUB-23 y JUVENIL por temporada

## Por qué
En el bloque de rankings de la ficha de jugador (junto al global "Fútbol11Stats · Madrid", el de categoría y
el de posición) queremos **dos filas más**: el puesto del jugador entre los **sub-23** y entre los
**juveniles** de su temporada. Para un jugador joven es probablemente el dato más significativo (ser el 13º
de todos los sub-23 dice más que su puesto absoluto entre 40.000, donde lo tapan los veteranos).

Es **exactamente el mismo cálculo que el ranking general** (`rank_general_season`), solo que restringiendo
el universo a un tramo de edad. La web no puede derivarlo (la carrera no trae año de nacimiento, y habría
que reordenar ~18.000 jugadores por ficha — la consulta que nos tiró la BD). Por eso se pide precalculado,
como en su día "Mejor Media PF".

## Qué se necesita
Cuatro columnas en **`web_jugador_carrera`**, pobladas en la fila `rank_principal` (igual que
`rank_general_season`):

| Columna | Universo |
|---|---|
| `rank_sub23_season`, `rank_sub23_season_total` | jugadores **19-22 años** en esa temporada |
| `rank_juvenil_season`, `rank_juvenil_season_total` | jugadores **≤18 años** en esa temporada |

## Criterio (idéntico al general, solo cambia el universo)
- **Métrica y orden:** los mismos que `rank_general_season` — puntos fantasy **totales de la temporada**.
- **Sin mínimo de partidos** (igual que el general: hoy `min(pj)=1`).
- **Ámbito:** por temporada (unidad `codjugador + codtemporada`).
- **Tramo de edad por AÑO DE NACIMIENTO** relativo al año de inicio de la temporada `Y` (el mismo corte que
  el badge de la ficha; `edad = Y − año_nacimiento`):
  - **Sub-23** = `edad` 19-22 (universo separado; **no** incluye juveniles).
  - **Juvenil** = `edad ≤ 18` (universo propio).
  - Son **tramos distintos y no se mezclan**: un juvenil rankea entre juveniles, un sub-23 entre sub-23.
- **`NULL`** para quien no cae en ese tramo esa temporada (un veterano no tiene `rank_sub23`; un sub-23 no
  tiene `rank_juvenil`).

## Cómo lo consume la web
Una `RankFila` más por cada par, **solo si el valor no es null** (así se pinta la del tramo que le
corresponda al jugador esa temporada, y nada a los veteranos). Ámbito por temporada, como el resto del
bloque. Cero pieza nueva.
