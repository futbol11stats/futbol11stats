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

---

# Corrección contra la maqueta aprobada (maquetas/ficha-jugador.html)

## D16 · La maqueta NO tiene sección "Trayectoria" (acordeón)
- **Dudé:** la spec anterior pedía una sección Trayectoria (acordeón por etapa); la maqueta no la incluye
  (su nav es Jornadas/Forma/Análisis/Nivel/Totales/Temporadas/Partidos/Hitos/Compañeros) y usa el carrusel
  de **Temporadas** como vista de trayectoria.
- **Elegí:** eliminar la sección Trayectoria de /v2 (gana la maqueta). El bug "Trayectoria solo muestra
  liga / debe obedecer al selector" queda resuelto por eliminación; el selector de competición filtra el
  gráfico de Jornadas (única sección cuyos datos varían por competición con datos reales).
- **Cambio:** si se quiere recuperar el acordeón, reañadir `TrayectoriaV2` y gatearlo al selector.

## D17 · CSS de la ficha en archivo propio (no CSS Module)
- **Dudé:** Tailwind vs CSS Module vs CSS global.
- **Elegí:** un `ficha.css` nuevo con TODO el CSS de la maqueta, cada regla prefijada con `.fjv2` (para no
  colisionar), importado por el componente. Permite clases dinámicas (`res-G/E/P`, barras) y fidelidad 1:1
  con las magnitudes de la maqueta (--plotH, --laneH, --colW, --pad, escala tipográfica). No toca globals.css.

## D18 · Selector de competición y "scope-echo"
- **Dudé:** en la maqueta el selector de competición es casi cosmético (solo cambia el texto "echo"); con
  datos reales el gráfico de Jornadas sí varía por competición.
- **Elegí:** estado de competición en cliente (contexto) que controla el gráfico de Jornadas y los subtítulos
  "echo". Temporada por ruta (enlaces server).

## D19 · Dorsales (bug f)
- **Dudé:** el bullet pedía "camiseta con el número dentro"; la maqueta pinta una LÍNEA de texto
  "**Dorsal** · último 7 · habitual 7 · otros 15, 8" (y el dorsal-camiseta va en el avatar del hero).
- **Elegí:** seguir la maqueta (línea "Dorsal · …" en Totales + badge de dorsal en el avatar).
- **Cambio:** si se quiere el icono camiseta con número en Totales, sustituir la línea.

## D20 · Pastilla de competición en tarjeta de temporada (bug g)
- **Dudé:** la maqueta muestra la categoría como texto `.s-cat`; el bullet pide "pastilla de competición
  con el mismo estilo que el resto del sitio".
- **Elegí:** usar el `Sello` del sitio + nombre de competición en el pie de cada tarjeta (estilo del sitio),
  manteniendo el resto de la tarjeta como la maqueta.

## D21 · Percentil y batería (bug d)
- **Elegí:** mostrar `Math.floor(elo_percentil)` (rank 358/38.173 -> 99, no 100). Batería = `min(10,
  round(pct/10))`; con pct 100 se llena entera.

## D22 · Casilla "P. a 0" condicional (bug b)
- **Elegí:** ocultar la casilla de porterías a cero si el jugador no tiene ninguna fila con
  `goles_encajados` no nulo (delantero como Bosco). Se detecta con una query de existencia.

## D23 · Estados de disciplina (bug a)
- **Elegí:** mapear los códigos crudos (`CICLO_COMPLETADO`, `EN_CICLO`, `SANCIONADO`, ...) a texto humano y
  no decir "completado" con 2/5 amarillas. Si `amarillas_ciclo < ciclo_umbral` es "en ciclo (N de M)";
  "completado"/"sanción" solo cuando corresponde.

---

# Corrección de criterio: maqueta = estructura; sitio = componentes

Las maquetas eran bocetos con placeholders (círculos con iniciales, pastillas simuladas). Donde la maqueta
dibujaba un placeholder de algo que YA existe como componente del sitio, se usa el componente real.

## D16 REVERTIDA · Trayectoria vuelve
- Antes la quité porque la maqueta no la tenía. La maqueta era incompleta; la ficha actual sí la lleva.
- Ahora: sección Trayectoria con el componente real `@/components/ficha/Trayectoria` (acordeón por etapa).
  Al desplegar una etapa muestra TODOS sus partidos (liga y copa), lo que resuelve el "solo liga".
- Marcada «Todas las temporadas»: no se filtra por el selector de competición del ámbito (es multi-temporada,
  como en la ficha actual). Si se quisiera filtrar, habría que gatear cada etapa por codgrupo.

## D24 · Rankings de Nivel: 3 ámbitos, no 4
- El punto pedía cuatro (Madrid, competición, categoría, posición). `web_jugador` solo expone tres rangos:
  `rank_general` (Fútbol11Stats/Madrid), `rank_categoria` (competición/categoría — un único campo) y
  `rank_posicion`. No hay rango por "grupo" ni separación competición/categoría.
- Elegí: tres filas (Fútbol11Stats·Madrid / Competición / Posición), cada una con número + barra de percentil
  + el icono del sitio (badge 11, Sello, Pastilla). Percentil = floor((1 − rank/total)·100), tope 99.
- Cambio: si el pipeline exporta `rank_grupo` o separa competición/categoría, añadir esas filas.

## D25 · Scroll-spy con dos columnas
- Problema: el aside (Nivel/Totales/Compañeros) es sticky y siempre visible; un IntersectionObserver oscilaba
  entre una sección del aside y otra del main.
- Solución: scroll-spy determinista por posición (última sección cuyo top ya pasó la línea de disparo, en
  orden de DOM) y, en desktop, se IGNORAN las secciones del aside (marcadas `aside:true`) para el cálculo del
  activo, ya que están siempre a la vista. El array de secciones va en orden de aparición del DOM.

## D26 · Componentes deliberadamente NO reutilizados (rediseño de la maqueta, no placeholders)
- `Medidores` → sustituido por la caja "Nivel" de la maqueta (ELO + percentil + batería + rankings).
- `Hitos` (componente) → timeline inline de la maqueta.
- `FormaHero` → chips de racha inline de la maqueta.
- `AvisoDato` → pie con botones "Compartir ficha / Corregir datos" de la maqueta.
- Si se prefieren los componentes, son sustituciones directas.

## D27 · Ancho de columna del gráfico > maqueta (desviación consciente)
- La maqueta fija --colW 40px (móvil) / 50px (desktop), pero dibujaba solo 12 jornadas; un jugador real
  tiene hasta 34. Para dar aire se sube a **46px (móvil) / 56px (desktop)**. Desviación consciente de la
  maqueta, aprobada. El resto de magnitudes del gráfico siguen siendo las de la maqueta.

## D28 · Rankings: la ficha ACTUAL también muestra 3 (no 4)
- Verificado en [slug]/page.tsx: la ficha actual pinta 3 RankRow (general=Fútbol11Stats con badge 11,
  categoria=competición con Sello, posicion con Pastilla). `JugadorFicha`/`COLS_JUGADOR` solo tienen
  rank_general/categoria/posicion. No existe un 4º ranking en el dato ni en la ficha actual; la v2 ya
  reproduce esos 3 con sus iconos. Si el pipeline exporta rank_grupo, se añade la 4ª fila.
