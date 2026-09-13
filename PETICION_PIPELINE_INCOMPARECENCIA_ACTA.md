# Pipeline · Capturar el flag de INCOMPARECENCIA/RETIRADA que YA VIENE en el acta (no inventarlo)

**Fecha:** 2026-09-13 · **Origen:** ficha de partido (distinguir "no hubo partido" de "detalle aún sin procesar").

## Qué y por qué
En la ficha de partido, un partido con resultado pero **sin detalle de acta** (0 filas en
`web_jugador_partidos`) hoy no se puede explicar bien: no sabemos si es una **incomparecencia** (3-0
administrativo, sin partido → NUNCA habrá detalle) o un **acta aún sin procesar** (llegará). Medido hoy:
**2.665** partidos jugado-sin-detalle, de los que **1.324 son 3-0/0-3** (la heurística de walkover que uso
ahora, imperfecta) y solo **1 en T22**. Con un flag real, el mensaje de la web se ramifica y cada caso dice la
verdad exacta.

## La clave: el dato YA ESTÁ EN LA FUENTE — solo hay que CAPTURARLO
No es "inventa un flag". Al analizar las actas para el proyecto DH, el pipeline encontró en el acta campos de
**estado** y de **RETIRADA/INCOMPARECENCIA** (`Retirado_local`/`Retirado_visitante` y similares) que **el parseo
DESCARTA hoy**. Es la enésima vez de la misma familia: **la fuente lo dice y no lo guardamos** — merece, de
paso, barrer el parseo por otros campos permanentes que se estén tirando.

## Alcance (precisión que lo simplifica)
- Los **ESTADOS** del acta son **transitorios** (por eso se aparcaron, con razón): NO se piden.
- La **INCOMPARECENCIA / RETIRADA** NO es transitoria: **queda en el acta final para siempre**. Ese sí se puede
  capturar ya, con lo que viene en la fuente.

## Qué exponer (propuesta)
Una columna en **`web_resultados`** que marque el resultado como administrativo (sin partido). Propuesta,
de más simple a más rica —cualquiera sirve para la web—:
- Mínimo: booleano `incomparecencia` (o `sin_partido`) — true si el resultado viene de incomparecencia/retirada.
- Mejor: `incidencia` TEXT/enum nullable con el motivo — p.ej. `'incomparecencia'` / `'retirada'`; y, si el acta
  da el lado (`Retirado_local`/`_visitante`), el lado (`'local'`/`'visitante'`/`'ambos'`). `NULL` = partido normal.
- La web solo NECESITA distinguir "administrativo vs partido real"; el motivo/lado es enriquecimiento (permite
  redactar "incompareció el visitante" en vez de un genérico).
- Convenciones habituales: poblar en el re-export; no hace falta en el publish ligero (es dato de acta cerrada).

## Lado web (lo hago yo cuando llegue la columna)
`getPartido` añade la columna al `select` (ya lee `web_resultados`), y el aviso de la sección Alineaciones se
ramifica:
- **incomparecencia/retirada** → "Resultado por incomparecencia — no se disputó, no hay acta que detallar."
- **jugado-sin-detalle normal** → "Detalle del acta pendiente" (ahora sí honesto el "llegará").
Sustituye a la heurística del 3-0 y al mensaje neutral provisional (que hoy cubre ambos casos sin mentir).

## No urge
El mensaje neutral actual ("puede tratarse de una incomparecencia o de un acta aún sin procesar") es honesto
mientras tanto; esto lo afina, no lo desbloquea.
