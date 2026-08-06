# Decisiones pendientes de revisión — ficha de jugador v2

Lista de dudas de diseño/dominio resueltas por mi cuenta para no parar. Formato: **qué dudé → qué elegí → por qué → cómo cambiarlo**.

> Ruta: `/madrid/jugador/[slug]/v2` y `/madrid/jugador/[slug]/[temporada]/v2`. No se ha tocado la ficha
> actual (`[slug]/page.tsx`) ni sus componentes. Todo lo nuevo vive en `src/lib/jugadorV2.ts`,
> `src/components/ficha/v2/*` y las dos rutas `/v2`.

---

## D1 · Fetchers duplicados en `jugadorV2.ts`
- **Dudé:** los fetchers de la ficha actual (`getJugador`, `getCarrera`, `getUltimosPartidos`…) están
  definidos DENTRO de `[slug]/page.tsx` y no se exportan.
- **Elegí:** reimplementarlos en `src/lib/jugadorV2.ts` reutilizando las constantes de columnas ya
  exportadas (`COLS_JUGADOR`, `COLS_CARRERA`, …) y los tipos de `@/lib/jugador`.
- **Por qué:** importarlos exigiría exportarlos desde `page.tsx` → tocar un archivo existente (prohibido).
- **Cambio:** si se consolida, extraer esos fetchers a `@/lib/jugador` y que ambas fichas los compartan.

## D2 · Unión con `web_percentiles`
- **Dudé:** con qué clave se une el jugador a la tabla de percentiles.
- **Elegí:** `metrica='elo_jugador'`, `categoria = carrera.nombre_comp` de la etapa de la temporada
  seleccionada, `codtemporada = int(temporada)`. Cortes ELO = `[p20,p40,p60,p80]`.
- **Por qué:** verificado en BD — `web_percentiles.categoria` toma valores idénticos a `nombre_comp`
  ("3ª RFEF", "Preferente", "1ª Autonómica"…). Métricas disponibles: `elo_jugador`, `media_partido`,
  `puntos_partido`.
- **Cambio:** si el pipeline cambia la clave, ajustar `getPercentilCortes()`.

## D3 · Cruce de ausencias (jornadas no jugadas)
- **Dudé:** cómo saber en qué jornadas jugó el EQUIPO para pintar los huecos, si `web_jugador_partidos`
  solo tiene partidos jugados.
- **Elegí:** `getResultadosGrupo(equipo_nombre, codgrupo)` (helper ya existente en `@/lib/equipo`), que
  devuelve los partidos del equipo en ese grupo-temporada filtrando por NOMBRE. Las jornadas del equipo
  que no estén en los partidos del jugador se pintan como `{tipo:'no_jugo'}`.
- **Por qué:** `codgrupo` es único por (temporada, competición) y acota a una sola rama; el filtro por
  nombre basta.
- **Cambio:** si aparece `codequipo` en `web_resultados`, filtrar por él (más robusto que por nombre).
- **Nota:** cuando el pipeline inserte las convocatorias sin jugar con columna `jugado`, este cruce
  sobra: bastará leer las filas `jugado=false`. Hoy esa columna NO existe → NO se filtra por ella.

## D4 · Formato de `[temporada]` en la URL
- **Dudé:** usar el código interno ('21') o la etiqueta ('2025-26').
- **Elegí:** la etiqueta legible (`2025-26`), mapeada a codtemporada con `TEMP_LABEL`.
- **Por qué:** coherente con el resto de URLs del sitio (las vistas de grupo usan `2025-26`).
- **Cambio:** si se prefiere el código, ajustar el mapeo en las dos páginas `/v2`.

## D5 · Color de la Media (KpiBar y Forma)
- **Dudé:** la Media, ¿con percentiles por categoría (como el ELO) o con umbrales fijos?
- **Elegí:** `CORTES_FIJOS.mediaPartido` (provisional) para la media; el ELO sí usa percentiles por
  categoría (lo exige la sección Nivel).
- **Por qué:** `mediaPartido` sigue marcado como provisional en `escala.ts` hasta conectar percentiles;
  mantengo una sola fuente de verdad para la media en toda la ficha.
- **Cambio:** cuando `media_partido` de `web_percentiles` se dé por bueno, sustituir en `jugadorV2`.
