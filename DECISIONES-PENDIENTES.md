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

## D6 · ELO de las tarjetas de temporada con cortes fijos
- **Dudé:** colorear el ELO de cada `SeasonCard` con percentiles de SU categoría+temporada exigiría una
  query por etapa (N queries).
- **Elegí:** `CORTES_FIJOS.elo` (provisional) para el ELO de las tarjetas del carrusel. El ELO de las
  secciones KpiBar y Nivel sí usa percentiles por categoría de la temporada seleccionada.
- **Cambio:** si se quiere fidelidad total, precargar los percentiles de todas las etapas en un lote.

## D7 · Escudo en `SeasonCard`
- **Dudé:** la spec pide "escudo y año" en cada tarjeta de temporada, pero `SeasonCard` no tiene ranura
  de escudo (su `titulo` es string).
- **Elegí:** omitir el escudo; el equipo va en el subtítulo. (Descarté un overlay con margen negativo por
  frágil.)
- **Cambio:** añadir una prop `escudo?: ReactNode` a `SeasonCard` (tocar componente compartido) o construir
  una tarjeta propia para el carrusel.

## D8 · Dimensiones de ranking (Nivel)
- **Dudé:** la spec pide "grupo, categoría, edad, Madrid", pero `web_jugador` solo trae `rank_general`
  (Madrid), `rank_categoria` y `rank_posicion`. No hay ranking por grupo ni por edad.
- **Elegí:** mostrar Madrid (general) / categoría / posición.
- **Cambio:** si el pipeline exporta `rank_grupo` y `rank_edad`, añadir esas dos filas.

## D9 · Trayectoria: reutilizo el componente existente
- **Dudé:** la spec pide renderizar en SERVIDOR la etapa más reciente (para indexar) y cargar las demás
  al desplegar.
- **Elegí:** reutilizar el `Trayectoria` actual (cliente, acordeón por etapa, carga perezosa de TODAS al
  desplegar) para no duplicar ni tocar nada.
- **Por qué:** cumple la función (acordeón por etapa) sin reescribir; la diferencia es solo que la etapa
  más reciente no llega pre-renderizada en el HTML inicial.
- **Cambio:** para SEO, escribir un `TrayectoriaV2` que pinte en servidor los partidos de la etapa más
  reciente y deje el resto en carga cliente.

## D10 · Agregados de KpiBar = temporada seleccionada
- **Dudé:** los KPIs (PJ, Goles, Pts, Media, ELO) ¿de toda la carrera o de la temporada seleccionada?
- **Elegí:** de la TEMPORADA seleccionada (suma de etapas de esa temporada). Los totales de carrera van en
  la sección "Totales" (marcada «Todas las temporadas»).
- **Por qué:** la barra de ámbito selecciona temporada; el KpiBar debe reflejar esa selección. ELO = ELO
  final de la etapa principal; Media = pts fantasy / PJ.
- **Cambio:** si se prefieren totales de carrera arriba, mover el cálculo a `j.*`.

## D11 · "Últimos partidos" = de la temporada seleccionada
- **Dudé:** ¿los últimos 3 globales (como la ficha actual) o de la temporada seleccionada?
- **Elegí:** los últimos 3 JUGADOS de la temporada seleccionada.
- **Cambio:** para últimos globales, usar un fetch por temporada+jornada desc sin filtrar temporada.

## D12 · Ventanas de Forma dentro de la temporada; delta vs media de temporada
- **Dudé:** "últimas 5 / 10" ¿globales o de la temporada? y el delta ¿respecto a qué?
- **Elegí:** dentro de la temporada seleccionada; delta = media de la ventana − media de la temporada.
- **Cambio:** si se quiere forma "de carrera", quitar el filtro de temporada y recalcular la base del delta.

## D13 · Carriles del gráfico
- **Dudé:** la spec lista cuatro carriles, incluido "etiqueta de jornada".
- **Elegí:** 3 carriles configurables (eventos / rol / rival) + la fila de etiquetas de jornada INTEGRADA
  de `BarChartJornadas` (su prop `etiqueta`), que ya cumple ese cuarto rol.
- **Cambio:** ninguno necesario; si se quiere como carril explícito, añadirlo a `carriles`.

## D14 · Batería de nivel y frase de percentil
- **Dudé:** cuántos segmentos llenar y qué % citar.
- **Elegí:** `round(elo_percentil / 10)` segmentos llenos (0-10); la frase cita `elo_percentil` tal cual
  ("mejor que el X %").
- **Cambio:** si `elo_percentil` fuese "peor que", invertir a `100 - percentil`.

## D15 · Alerta disciplinaria = fila más reciente
- **Dudé:** `web_alertas_tarjetas` es por jornada; ¿cuál mostrar?
- **Elegí:** la más reciente del jugador (orden temporada+jornada desc). Se pinta la franja solo si existe
  y tiene `estado`.
- **Cambio:** si debe ceñirse a la temporada seleccionada, filtrar por `codtemporada`.
