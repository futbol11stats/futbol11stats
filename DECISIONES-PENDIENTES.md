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

---

# FICHA DE EQUIPO v2 (rutas paralelas /madrid/equipo/[slug]/v2)

## E1 · Fuente del gráfico: web_clasificacion (fantasy ACUMULADO)
- `web_clasificacion` tiene una fila por (codgrupo, jornada, codequipo) con pos, mov (string "↑2"/"→"),
  elo, pj, gf, gc, pg, pe, pp y `pts_fantasy` **ACUMULADO**. El fantasy de UNA jornada = diferencia con
  la jornada anterior (la 1ª = su valor). Es la fuente de la barra del gráfico, la posición/movimiento,
  los KPIs (Pos/Pts/DG/Media F.) y la mini-clasificación. El marcador/rival/localía se cruzan con
  web_resultados por nombre + jornada (getResultadosGrupo).

## E-perc · No existen percentiles de equipo (degradado)
- `web_percentiles` solo tiene métricas de JUGADOR (elo_jugador, media_partido, puntos_partido). NO hay
  percentiles de equipo, al contrario de lo indicado en el encargo. Por eso el Nivel de equipo degrada la
  batería/percentil y "Mejor que el X%": se muestra ELO + sparkline + posición en el grupo, nada inventado.
- Los cortes de color de equipo (fantasy jornada, media fantasy, ELO) van FIJOS en equipoV2.ts
  (CORTES_EQUIPO), calibrados como en la maqueta, hasta que el pipeline publique percentiles de equipo.
  Se validarán con cortesValidos() cuando lleguen.

## E-rank · Rankings de equipo: solo posición en el grupo
- No existen rankings de equipo por categoría ni por Comunidad. Se usa solo la posición dentro del grupo
  (web_clasificacion.pos / posicion_actual). Las facetas del Análisis (GF/GC/Pts F./Juego limpio) se
  rankean DENTRO DEL GRUPO (honesto), no por categoría.

## E-copa · Copa en el gráfico: pendiente
- El fantasy por jornada solo existe para LIGA (web_clasificacion). La copa no tiene serie de fantasy ni
  posición. En el primer incremento el ámbito de competición muestra solo la liga. Copa pendiente: o se
  degrada (marcador/rival sin barra de fantasy) o se documenta que no aplica. Ver al construir el ámbito
  completo.

## E-reval · Revalidación on-demand de fichas (Fase 1a HECHA; resto pendiente)
- **Estado (actualizado):** Fase 1a IMPLEMENTADA y validada end-to-end en preview:
  - `POST /api/revalidate` protegido por `REVALIDATE_SECRET` en cabecera `x-revalidate-secret` (401 sin
    match), body `{ tags?, paths? }`, deduplica, máx **1000 ítems/lote** (>1000 → 413, el pipeline trocea),
    responde `{ revalidated, tags, paths }`. `revalidateTag(tag, 'max')` (firma de Next 16).
  - Etiquetado de la capa **v2** de competición (`src/lib/cacheComp.ts` envuelve las lecturas de
    `competicionV2.ts` en `unstable_cache` con `comp:<codgrupo>` + `temporada:<cod>`, TTL 30d). El global
    cuelga de `comp:<codgrupo>` de cada grupo miembro. `getEquiposMapV2`/`getPartidosJornadaV2` NO se
    envuelven (devuelven `Map`, que `unstable_cache` serializaría a `{}`); su ruta se invalida igual porque
    se leen junto a funciones etiquetadas.
  - Prueba: cambio de `pts` en Supabase → `POST` con `comp:24037458` → la ficha /v2 pasó de 82 a 92. 200 OK.
- **PRODUCCIÓN (estado):**
  - **Regla de bypass del firewall para `/api/revalidate`: RESUELTA.** Es una WAF custom rule de PROYECTO y
    cubre también Production — verificado: `POST https://www.futbol11stats.com/api/revalidate` con el secreto
    → **200** `{"revalidated":true,"tags":1,"paths":0}`. No hace falta system bypass rule ni nada específico
    de prod. (Contexto: sin esa regla, un cliente máquina choca con el *Vercel Security Checkpoint* / Attack
    Challenge Mode → 429 con HTML y nunca llega al endpoint.)
  - `REVALIDATE_SECRET` **ya creada en Production**. (Ojo: los env vars solo los coge un deploy nuevo.)
  - **Reactivar *Vercel Authentication* en previews** (se desactivó temporalmente para la prueba) — PENDIENTE.
- **CÓDIGO — estado por fases (LADO WEB COMPLETO):**
  - Fase 1a (competición /v2) + 1b (competición no-v2): **HECHAS**.
  - Fase 2 (equipo + índices): **HECHA**.
  - Fase 3 (jugador): **HECHA** con **etiqueta fina `jugador:<cod>`** (opción A, decidida). NO se cuelga de
    `comp:<codgrupo>`: la ficha es de carrera y un fichaje dejaría la etiqueta con el grupo antiguo → rancia.
    El coste (~10k tags/noche) es del pipeline, que ya conoce los jugadores tocados por las actas; con el
    límite de 1000/lote son ~10-20 peticiones. Los cortes de percentil/ELO (por categoría+temporada, no
    jugador) cuelgan de `temporada:<cod>`.
  - Tags en uso: `comp:<codgrupo>` · `temporada:<cod>` · `equipo:<codequipo>` · `jugador:<codjugador>` ·
    `indices`. Helpers en `src/lib/cacheComp.ts` (cacheComp/cacheEquipo/cacheJugador/cacheIndices/cacheTagged).
    Cautela recurrente: las funciones que DEVUELVEN `Map`/`Set` NO se envuelven (unstable_cache las
    serializa a `{}`).
  - **ÚNICO PENDIENTE: el llamador desde el pipeline** (`C:\rffm-pipeline`) que POSTee a
    `POST https://www.futbol11stats.com/api/revalidate` (cabecera `x-revalidate-secret`) las tags de las
    entidades tocadas al terminar cada tanda: `comp:<codgrupo>` de los grupos con jornada nueva (refresca
    competición + equipos del grupo, que cuelgan de comp) + `equipo:<cod>` y `jugador:<cod>` de los tocados +
    `indices` si cambian portadas. Trocear a ≤1000 ítems/petición.
- **Diseño propuesto (original):**
  - Endpoint de revalidación en la web (route handler, p.ej. `/api/revalidate`) **protegido por un secreto**
    (header o query con un token en variable de entorno; rechazar si no coincide).
  - El endpoint hace `revalidatePath` de **las fichas tocadas** en ese export (equipo y jugador afectados,
    y sus variantes /v2 y [temporada]/v2), no un rebuild global. Alternativa: `revalidateTag` si se etiquetan
    los fetch por entidad.
  - La **llamada** sale del propio export del pipeline (`C:\rffm-pipeline`) al terminar cada tanda: envía la
    lista de fichas cambiadas al endpoint con el secreto.
  - Fallback opcional: un Vercel Deploy Hook post-export (reconstruye todo) para cuando el cambio sea masivo.
- **RIESGO si no se monta (con todas las letras):** hoy no hay revalidación on-demand (ni ruta, ni
  `revalidatePath`, ni webhook). Los datos viven en Supabase, desacoplados del deploy, así que actualizar
  datos NO refresca la página cacheada. Con `revalidate = 2592000` (30 días) y sin `generateStaticParams`,
  **una ficha ya visitada puede servirse hasta 30 días desactualizada tras una jornada nueva.** Ahora mismo
  solo lo enmascaran los deploys frecuentes de desarrollo (cada deploy resetea el caché ISR); en cuanto el
  ritmo de deploys baje, el problema aflora. Ver memoria `isr-sin-revalidacion-ondemand`.

---

# FICHA DE COMPETICIÓN v2 (rutas paralelas con sufijo /v2)

## Inventario de las rutas actuales (para comprobar al terminar)
- **Rutas:** `[categoria]/[slug_comp]/[slug_grupo]/[temporada]/[jornada]/[tab]/page.tsx` (grupo) y
  `.../[slug_comp]/global/[temporada]/[jornada]/[tab]/page.tsx` (global). Las /v2 cuelgan con sufijo al
  final: `.../[tab]/v2/page.tsx` (patrón de jugador/equipo).
- **Componentes de pestaña (`@/components/tablas.tsx`):** ClasificacionTab, ResultadosTab, JugadoresTab,
  EloTemporadaTab, PorterosTemporadaTab, TarjetasTemporadaTab, XiOptimoTemporadaTab, GoleadoresJornadaTab,
  TarjetasJornadaTab, Top5JugadoresTab, Top5EquiposTab, XiOptimoJornadaTab, SuspendidosTab. Más
  JornadaSelector, TabScroller, Sello, JsonLd. NINGUNO se toca (la /v2 crea los suyos).
- **Datos (funciones en la propia page):** getGrupoBySlug, getVariantesPorTemporada, getGruposCompeticion,
  getClasificacion (web_clasificacion), getResultados (web_resultados), getEquiposMap, getDestacadosJornada
  (web_top_jugadores por tipo), getEquiposForma (web_equipos_forma), getTopJugadores (temp), fetchSnapshot
  (time-machine), getAlertasTarjetas (web_alertas_tarjetas), getJuegoLimpio (web_juego_limpio),
  getXiOptimoTemporada (web_xi_optimo), getSuspendidosJornada (web_suspendidos).
- **IDs de tab (URL, se conservan):** jornada = clasificacion · resultados · goleadores-jornada ·
  tarjetas-jornada · top5-jugadores-jornada · top5-equipos-jornada · once-optimo-jornada. Temporada =
  top10-goleadores-temporada · top10-porteros-temporada · top10-tarjetas-temporada · top10-fantasy-temporada ·
  top10-elo-jugadores-temporada · once-optimo-temporada. Copa degrada tabs (sin clasificación ni Top-5 Equipos).

## C1 · Dos barras vs zonasw de la maqueta
- La maqueta usa un toggle (zonasw) Jornada/Temporada + un solo raíl que cambia. La orden pide "Dos barras".
  Se resuelve así: se pinta el toggle (dos botones-enlace, modo activo = el del tab actual) y DEBAJO el raíl
  del modo activo (pestañas = rutas reales). El rótulo del selector de jornada cambia: "Jornada" (modo
  jornada) / "Acumulado hasta" (modo temporada). Coherente con la maqueta y con "tabs = rutas".

## C2 · Selector de jornada como ruta
- El segmento [jornada] es ruta. En liga = `jornada-N`; en copa (familia) = slug de ronda. El raíl de
  jornadas enlaza a `.../jornada-N/[tab]/v2` conservando tab y modo.

## C3 · Sistema de diseño reutilizado
- Se reutiliza `ficha.css` (.fjv2) de jugador/equipo (tokens, hero, kpis, scope, s-head, .tramo espejo,
  .rr rankings, .pitch XI, etc.). La maqueta de competición usa las MISMAS clases base (kpis, scope, hero,
  pill) que ya existen en .fjv2. Se añaden clases específicas de competición prefijadas .fjv2.

## C4 · Clasificación: base la actual, no la maqueta
- Se parte de ClasificacionTab actual (conserva comentario de forma web_clasificacion.forma y marcas de
  zona por web_clasificacion.zona — NO se cablean posiciones). Se añade del diseño nuevo: columna fija
  sticky + scroll horizontal de columnas numéricas. Racha desde web_clasificacion.racha.

## C5 · Escudos reales en jugadores (todas las pestañas)
- La maqueta usa iniciales de color. El SITIO manda: EscudoBox del equipo del jugador en TODOS los sitios
  donde se pinta un jugador (rankings, Top-5, XI, etc.), como en equipo v2. El avatar de iniciales por
  demarcación (AVA_POS) se mantiene donde la maqueta pone avatar de posición (XI).

## C6 · Construcción incremental
- Increment 1: data module (competicionV2.ts) + rutas /v2 (grupo + global) + shell (hero · KpiBar con
  iconos · scope · toggle+raíl de tabs · jbar · aside Líderes+cifras) + Clasificación. Resto de paneles:
  placeholder "Próximamente" que se rellena en commits siguientes, uno por pestaña.

## C-dudas pendientes (a confirmar con datos al construir cada pestaña)
- Resultados: campo/fecha/hora — ¿en qué columnas de web_resultados? (degradar si faltan).
- Estadísticas: "goles por tramos de toda la competición" — ¿existe una tabla agregada por grupo o hay
  que sumar web_goles_tramos de todos los equipos del grupo? Verificar al llegar a Estadísticas.
- Fantasy: integración de "media destacada" — propuesta al construir la pestaña.

## C-dudas RESUELTAS por el pipeline (2026-08)
- **Resultados** (campo/fecha/hora): se AÑADEN a web_resultados como TEXT (aún NULL). Consumo tolerante:
  fecha en 99,9%, hora falta en 22% (aplazados/sin designar), campo en 8%. Si falta un dato, se OMITE
  (ni hueco ni placeholder). Escrito para no romper mientras vengan NULL.
- **Goles por equipo y jornada**: no hay tabla; se deriva de web_resultados (goles_local/goles_visitante +
  codequipo_local/codequipo_visitante).
- **Suspendidos**: tabla web_suspendidos (codtemporada, codgrupo, jornada, codjugador, nombre, codequipo,
  equipo, motivo, partidos_sancion). Filtrar por la jornada SIGUIENTE a la seleccionada.
- **Gap Top5/Fantasy**: web_top_jugadores NO trae minutos/titular/tarjetas -> la fila de datos degrada a
  los campos existentes (goles/P0, pts fantasy, posición). web_equipos_forma solo pts_fantasy+forma
  (sin "jugadores que puntuaron" ni eventos de jornada) -> Top5 Equipos degrada.

## C-lideres · Líder "Más tarjetas" degradado
- La maqueta pone 4 tarjetas de líder (goleador, portero, mejor ELO, más tarjetas). web_top_jugadores NO
  tiene ranking de tarjetas por jugador de temporada (tipos: goleadores/porteros/fantasy/elo_temp + los de
  jornada). web_alertas_tarjetas solo lista SANCIONADOS (ciclos/expulsiones), no el recuento de amarillas de
  todos. Se muestran 3 tarjetas (Goleador/Portero/Mejor ELO) y se omite "Más tarjetas" hasta que el pipeline
  publique un tarjetas_temp de jugador. Estado degradado, no dato falso.

## C-mov · Columna "mov" de clasificación vacía (aparcado)
- web_clasificacion.mov (variación de puestos entre jornadas) viene vacía en el dato. La ficha v2 no la
  pinta (no bloquea; hay pendientes mayores). Cuando el pipeline la pueble, se añade una columna Mov a la
  clasificación como en la ficha actual. Aparcado por decisión de Fernando (2026-08).

## E-menores · Plantilla de aficionados omite a los menores — RESUELTO (2026-08-14)
- **RESUELTO:** el pipeline creó `web_equipo_plantilla_aficionado` (98.052 filas, adultos + menores, réplica
  literal de la juvenil: pts_fantasy, goles_encajados, porterias_cero; sin ELO). `getPlantillaEquipoV2` (v2)
  ahora lee la tabla de plantilla por rama —juvenil → `web_equipo_plantilla_juvenil`, aficionado →
  `web_equipo_plantilla_aficionado`— en vez de `web_jugador_carrera`. Los menores se listan con nombre y datos
  sin enlace (fichasExistentes). "Top de la plantilla" reactivado en ambas ramas (ambas traen pts_fantasy).
  Verificado codequipo=10633447 T21: 48 jugadores, 9 menores. NOTA: el NO-v2 (`getPlantillaAfic` en
  `[slug]/page.tsx`) sigue leyendo `web_jugador_carrera` → pendiente de portar ahí también si se quiere paridad
  antes de la migración. La política/hueco original queda abajo como histórico.
- **Política del sitio:** los menores SÍ se listan (Top de la plantilla, Plantilla, rankings, XI) con nombre
  y datos, pero SIN enlace a ficha (no la tienen). Verificado que competición ya lo cumple: `web_top_jugadores`
  (34.780 menores), `web_xi_optimo` (3.632), `web_alertas_tarjetas` (12.730) los incluyen, y el render enlaza
  solo si hay ficha.
- **El hueco:** la **plantilla de EQUIPO de aficionados** los omite. `getPlantillaEquipoV2` (v2) y
  `getPlantillaAfic` (no-v2) leen `web_jugador_carrera`, que tiene **0 menores** (38.173 distintos = solo
  adultos). **No existe una tabla `web_equipo_plantilla` de aficionados** (solo `web_equipo_plantilla_juvenil`).
  Así que un equipo de aficionados con menores no los muestra en su plantilla — **en las dos fichas** (no es
  regresión de la v2; el no-v2 ya lo hacía). Los juveniles SÍ se arreglaron (v2 ahora ramifica por rama y lee
  `web_equipo_plantilla_juvenil`).
- **Arreglo:** requiere PIPELINE — que exista una plantilla de aficionados con menores (equivalente al
  `web_equipo_plantilla_juvenil`: codequipo, codtemporada, codjugador, nombre, posicion_pastilla, pj, goles,
  minutos, ta/td/tr). En cuanto exista, `getPlantillaEquipoV2` rama aficionado leería de ahí igual que juvenil.
  Incoherencia real con la política, pero de dato, no de web. Llevar a `C:\rffm-pipeline` cuando toque.

## E-jornada-menores · "Sin datos del partido" para menores en pestañas de jornada (degradación parcial)
- En las pestañas de JORNADA de competición (Top 5, Goleadores de jornada, XI de jornada), el jugador SÍ
  aparece en la lista (el ranking sale de `web_top_jugadores`, que incluye menores), pero la línea de datos
  del partido (titular/min/goles/tarjetas) se enriquece con `getPartidosJornadaV2` → `web_jugador_partidos`,
  que tiene **0 menores**. Para un menor, esa línea sale "Sin datos del partido".
- Es **degradación parcial, no omisión** (el menor aparece con su nombre y su chip de puntos). Merece mirarse
  con calma: o una fuente de partidos no filtrada por edad, o construir una línea reducida para menores con lo
  que `web_top_jugadores` sí trae (goles, etc.). No urgente.

## D-ultimos-partidos · "Últimos partidos" NO se porta a la v2 (decisión, no carencia)
- La ficha ACTUAL tiene un bloque "Últimos partidos" (3 más recientes con rival, marcador, goles/GC, puntos).
- La v2 NO lo lleva a propósito: el componente `Jornadas` (sección "Jornadas") ya pinta, por CADA jornada de
  la temporada, la barra de puntos + goles (balón) + titular/suplente + minutos + escudo del rival + marcador
  coloreado + casa/fuera. Cubre lo mismo que "Últimos partidos" pero para TODAS las jornadas y con más detalle.
  Portar los 3 recientes duplicaría un subconjunto. Decisión: fuera. Si algún día se quiere el resumen "3
  últimos" compacto, se saca de ahí sin fetch nuevo (`ultimosDePartidos` existe en jugadorV2, sin usar).

## E-migracion-v2-seo · Plan: portar el andamiaje SEO a los componentes v2 (competicion)
Estado: RESUELTO (2026-08-15). Los componentes v2 (jugador, equipo, competicion grupo/global) renderizan
ya las URLs canonicas, con su andamiaje SEO. Cierre final (commit 105a9be):

- Las rutas /v2 quedaron RETIRADAS. Eran duplicados del contenido canonico (que se sirve en la ruta sin
  sufijo). No se borraron a secas: viven SOLO como redirects 308 permanentes en next.config.js (`redirects()`,
  `permanent:true`), uno por patron —jugador, jugador+temporada, equipo, equipo+temporada, competicion grupo
  y global—, para que URLs guardadas/compartidas de /v2 no den 404. Cada destino solo quita el /v2; el slug
  no canonico encadena un segundo 308 (el de la propia ruta canonica). `global` va antes que `grupo` (ambos
  de 8 segmentos). Verificacion HTTP de los 308 solo en navegador real: el WAF (Attack Challenge Mode)
  responde 429 a curl/fetch desde el entorno local.
- El prop `suf` se RETIRO con ellas. Existia para hacer los 4 componentes Ficha*V2 URL-aware (servir el
  mismo componente en la URL canonica con suf='' y en /v2 con suf='/v2'). Una vez desaparece el sufijo,
  siempre valia '' -> codigo muerto: fuera el prop/tipo y los ~21 `${suf}` de los enlaces internos.

Lo de abajo es el plan original (ya ejecutado), se conserva como registro historico.

### Decision de URL (cerrada)
La v2 HEREDA la URL actual, SIN sufijo /v2. Indexar bajo /v2 significaria tirar el posicionamiento
de miles de URLs y redirigir la web entera; la v2 no es un sitio nuevo, es la misma web mejor hecha.
Consecuencia: NO se reescribe sitemap.ts ni se montan 308 de /v2 -> canonica. El dia del cambio, la
ruta actual pasa a renderizar el componente nuevo y su SEO debe estar ya intacto en el componente v2.

### Alcance: portar a FichaCompeticionV2 / FichaCompeticionGlobalV2 (y sus page.tsx v2) lo que hoy
solo vive en las rutas actuales. Cuatro BLOQUEANTES + dos recomendables:

BLOQUEANTES (precondicion para que la v2 sustituya a la actual sin perder SEO):
1. generateMetadata dinamica (title/description por pestaña/comp/temporada + OpenGraph). Hoy la v2 es
   un stub fijo `{ title:'Competicion...', robots:{index:false,follow:false} }`. Plantillas en la ruta
   actual: grupo page.tsx:296-297,312 ; global page.tsx:228-229,238.
2. canonical jornada->jornada_actual (mata la duplicacion del time-machine, conservando la pestaña).
   Actual: grupo page.tsx:298-304 ; global page.tsx:230. Sin esto, indexable = cientos de duplicados.
4. Sitemap: NO hay que reescribirlo (misma URL). Solo asegurar que el dia del cambio las rutas que ya
   emite (sin /v2) rendericen el componente v2. (Deja de ser bloqueante-de-reescritura por la decision
   de URL; queda como verificacion.)
5. noindex selectivo juvenil con follow:true (solo juveniles y solo pestañas que listan menores). Hoy
   la v2 va noindex,nofollow GLOBAL. Portar noindexJuvenil (seo.ts:86-87) + follow:true; quitar el
   noindex de las pestañas indexables.

RECOMENDABLES:
2b. canonical de slugs viejos de copa -> familia (actual grupo page.tsx:287-288).
3.  JSON-LD BreadcrumbList (graphLd(breadcrumbLd(...))): actual grupo page.tsx:514, global :391. La v2
    de competicion no emite ningun schema (equipo v2 y jugador v2 si). Portar el breadcrumb.
6.  308 slugs viejos de copa -> familia (actual grupo page.tsx:335-338). La v2 solo hace notFound.

### Nota tecnica del dia del cambio
El SEO por-pestaña (metadata/robots) vive en el page.tsx de cada ruta, no en el componente. Al heredar
la URL, ese page.tsx actual seguira siendo el que corre; hay que decidir si (a) el page.tsx actual pasa
a renderizar el componente v2 conservando su generateMetadata, o (b) se traslada la generateMetadata al
patron v2. Opcion (a) es la de menor riesgo: el andamiaje SEO ya probado se queda, solo cambia el
componente de render. Confirmar antes de ejecutar.

### Hecho ya (regresion aparte, no era de competicion)
- 308 al slug canonico en la ficha de JUGADOR v2: la v2 lo habia perdido (la actual lo tiene,
  page.tsx:243-245). Repuesto en jugador/[slug]/v2/page.tsx (redirige a .../{canonico}/v2 mientras
  la v2 vive en /v2). La v2 de competicion NO tiene el 308 tipo-slug-nombre porque la actual tampoco
  (ahi no hay regresion).

## E-temporada-activa · Resolución de temporada data-driven por competición (HECHO 2026-08-15)
- Antes: "temporada viva" hardcodeada en 5 sitios (LIVE_COD en jugador.ts y buscador.ts, LIVE_SEASON en
  seo.ts, y `.eq('codtemporada',21)`+`'2025-26'` en los índices home/aficionados/juveniles). Flip manual y
  todo-o-nada.
- Ahora: FUENTE ÚNICA = vista Postgres `web_temporada_activa` (max codtemporada con partido jugado en
  web_resultados, por categoria+slug_comp) + `@/lib/temporadas.ts` (ventana [T_top-1, T_top], getGruposIndice,
  getSueloVivo, esTemporadaActiva, mapaActivas). Cada competición muestra su temporada activa; badge
  activo/inactivo usa el suelo (min activa en ventana). Índices, competición (badge EN JUEGO), sitemap y
  badge (jugador/equipo/buscador) derivan de ahí. Verificado: hoy (todo en T21) el set mostrado es idéntico
  (los 6 grupos de diferencia son slugs esViejaCopa que el índice ya filtraba).
- PENDIENTE / evolución (NO construir ahora, decisión de Fernando): mover la señal al PIPELINE, emitiendo un
  flag `arrancada`/`temporada_activa` en web_grupos, y que la web lo lea en vez de escanear web_resultados en
  la vista. Sería más barato (sin el EXISTS sobre 106k filas) y explícito. La vista funciona y no requiere
  mantenimiento, así que es opcional; el flag sería la versión definitiva si el escaneo llega a pesar.

### Addendum (2026-08-16): conversión codtemporada<->slug también data-driven (fórmula) — commit 8532024
La migración de arriba resolvió QUÉ temporada muestra cada competición, pero la conversión codtemporada<->slug
de URL seguía en CINCO mapas estáticos topados a mano en T21 (competición TEMPORADA_MAP/COD_TO_LABEL/
TEMPORADAS_ORD, seo TEMP_LABEL_BY_COD, jugador TEMP_LABEL + su inverso COD_FROM_LABEL en jugadorV2). Al publicar
la Copa RFEF T22 (fam-copa-rfef-t22, 2026-2027) el enlace del índice salía con `undefined` (TEMP_LABEL_BY_COD[22])
y la ruta daba 404 (TEMPORADA_MAP['2026-27'] -> notFound); mismo bug latente en /jugador|equipo/x/2026-27.
- FUENTE ÚNICA: `src/lib/temporadaSlug.ts` con la relación LINEAL verificada contra web_grupos.nombre_temporada
  (cod 17 = 2021-2022 ... 22 = 2026-2027, secuencial sin gaps): codToSlug/slugToCod (startYear = cod + 2004),
  sin lista que mantener -> una temporada nueva funciona sola en cuanto el pipeline la carga.
- El selector de temporadas de competición usa `universoTemporadas(top)` con techo DATA-DRIVEN: en grupo, la
  temporada más nueva de `variantes` (getVariantesV2); en global, `getTemporadasCompV2` (distinct codtemporada
  por slug_comp). El global ahora grisea las temporadas sin dato (antes enlazaba todas -> una liga sin T22
  habría dado enlace vivo a un global vacío). Suelo del universo = TEMP_COD_MIN (17, inicio de datos).
- Test: src/lib/temporadaSlug.test.ts (round-trip 17..25, T22, rechazo de 'undefined'/forma larga/malformados).
- Verificado en producción: la copa T22 carga desde el índice, 12 partidos con hora/campo, selector conecta con
  T17-21 (enlaces vivos); las ligas siguen en T21 (no asoman en T22 hasta tener dato).

## E-nivel-percentil-temporada · Percentil de ELO por temporada en el bloque Nivel (PENDIENTE de dato)
Contexto: los rankings, la etiqueta y el ELO de Nivel ya son por temporada (fila rank_principal de
web_jugador_carrera). El PERCENTIL sigue siendo el de web_jugador (snapshot de HOY) -> al ver un año
histórico muestra el percentil de hoy. No se cambia de métrica (el percentil mide ELO; los rankings miden
puntos fantasy: son KPI distintos, no tienen por qué cuadrar). El problema es solo su dimensión temporal.
Opciones para un percentil de ELO POR TEMPORADA con precisión real:
- (1) PIPELINE (recomendado): que emita `elo_percentil_temp` por jugador-temporada en la fila rank_principal,
  igual que hizo con rank_*_temp. Tiene la distribución completa de ELO por categoria+temporada (de ahí sale
  web_percentiles), así que puede dar percentil fino (0-99). Es el parche limpio y paralelo a los rankings.
- (2) web_percentiles: YA tiene métrica `elo_jugador` por categoria+temporada, pero con cortes de DECIL
  (p10..p90 = 9 cortes -> 10 buckets) + n. Se podría derivar un percentil por temporada AHORA bucketeando el
  elo_final contra esos deciles, pero solo con precisión de decil (pasos de 10), un bajón visible frente al
  0-99 fino de hoy.
- (3) Cortes necesarios: para precisión de entero harían falta ~99 cortes o la distribución cruda; guardar 99
  cortes es impráctico. Con los 9 deciles actuales -> decil. Conclusión: mejor que el pipeline emita el
  percentil directo (opción 1); mientras, el percentil se deja como está (de hoy).
- IMPORTANTE (criterio del percentil): debe calcularse sobre el ELO de la ÚLTIMA etapa de la temporada (el
  que muestra la ficha, valor propio del jugador) y contra la distribución de la categoría de ESA etapa
  (categoriaElo), no la de rank_principal. Es decir: mismo ELO y misma población que usa hoy el coloreado.

## E-rank-general-temporada · PETICIÓN AL PIPELINE: ranking general agregado por temporada
Problema: hoy `web_jugador_carrera.rank_general_temp` se calcula POR ETAPA, sobre los puntos de esa etapa.
Un jugador a caballo entre dos categorías queda mal rankeado: Raúl 971620 en T21 sale 14.936/19.578 sobre
sus 10 pts de 3ª RFEF, cuando la KpiBar (suma) muestra 115. Los rankings de CATEGORÍA y POSICIÓN sí deben
seguir siendo por etapa (un puesto necesita una población homogénea); el GENERAL no.

Petición concreta:
- CAMPO: dos columnas nuevas en web_jugador_carrera -> `rank_general_season` + `rank_general_season_total`
  (nombre a gusto; NO reutilizar rank_general_temp, que sigue siendo el por-etapa para otros usos).
- UNIDAD: por (codjugador, codtemporada) — un único valor por jugador-temporada (mismo en todas las etapas
  de esa temporada; basta poblarlo al menos en la fila rank_principal, que es la que lee la ficha).
- MÉTRICA: puntos fantasy TOTALES de la temporada (suma de todas las etapas del jugador esa temporada),
  rankeado contra el total de temporada de TODOS los jugadores (la misma población de rank_general_temp:
  ~19.578 en T21). rank_general_season_total = esa N.
Mientras tanto, la web usa como INTERINO el rank_general_temp de la etapa con más puntos (fijo, no sigue la
pastilla). Cuando lleguen las columnas nuevas, se cambia la ficha a rank_general_season (una línea).

## E-nivel-percentil-temporada — RESUELTO
El pipeline recalculó web_percentiles.elo_jugador (de elo_actual a elo_final por temporada) y añadió
elo_percentil_temp a web_jugador_carrera. La ficha (bloque Nivel) ya lee elo_percentil_temp de la última
etapa cronológica (etapaUltima), la misma de la que sale el ELO. Añadidas la columna a COLS_CARRERA/CarreraRow.

## E-alcance-rfef · GATILLO: si se amplía a competiciones RFEF, revisar TODOS los textos de alcance
**Anotado 2026-09-12 (decisión de Fernando). Entra en el alcance del trabajo del proyecto RFEF; no descubrir después.**

Hoy el sitio cubre solo la RFFM (federación de Madrid) y los textos lo dicen explícitamente. Si se hace el
proyecto RFEF —**División de Honor Juvenil, 1ª y 2ª Federación**, que dependen de la RFEF, no de la RFFM—, esos
textos quedarían **inexactos** (dirían menos de lo que hay, justo lo que evitamos): hay que revisarlos como parte
de ese trabajo.

Sitios a revisar (los de "alcance" hoy conocidos):
- **Home, hero** (`src/app/page.tsx`): "…de **todas las competiciones RFFM**." → dejaría de ser solo RFFM.
- **Home, metadata** (`generateMetadata` en `page.tsx`): "Todas las competiciones de la **RFFM (Madrid)**: …".
- **/sobre, metadata + cuerpo** (`src/app/sobre/page.tsx`): "…fútbol aficionado y juvenil **de Madrid**… **de la
  Comunidad de Madrid**… competiciones de la **Real Federación de Fútbol de Madrid (RFFM)**… los torneos que
  gestionan otras federaciones —la División de Honor Juvenil, o la 2ª y 1ª RFEF— **quedan fuera por ahora**". Este
  último párrafo se INVIERTE de sentido (pasarían a estar DENTRO); reescribir, no solo el número.
- Cualquier mención futura de "Madrid"/"RFFM" como delimitador del ámbito (buscar antes de publicar).

Ojo también: el badge de edad y el "huecos entre temporadas" de /sobre se explican HOY por quedar esas
competiciones fuera; si entran, esa explicación cambia. Y las cifras de volumen ([[cifras-alcance-fuente-unica]] /
`src/lib/alcance.ts`, y la futura tabla `web_alcance`) subirían de golpe: revisar que los redondeos "+" sigan
siendo ciertos tras la primera carga RFEF. El nº de temporadas ya es derivado (no requiere tocarse).

## E-cache · Cache-miss GLOBAL tras cambios de esquema/dato (patrón)
Contexto: las lecturas van por unstable_cache (cacheJugador/cacheComp/cacheTagged). En Vercel el Data Cache
PERSISTE entre deploys: un redeploy vacía el full-route cache (regenera el HTML) pero al regenerar sigue
leyendo el Data Cache viejo. Para refrescar TODAS las fichas sin revalidar 38k tags:
- Bumpear la VERSIÓN en los keyParts de la función (p.ej. ['getCarreraV2','v2',cod]) -> cambia la clave ->
  cache-miss global -> datos frescos en la primera visita post-deploy. Es lo que se usó al añadir
  elo_percentil_temp (getCarreraV2) y al recalcular los cortes (getPercentilCortes).
- La revalidación por tag (temporada:/jugador:) sigue sirviendo para cambios acotados (el pipeline la usa).
- Un redeploy "a secas" NO invalida el Data Cache: no confiar en él para cambios de dato cacheado.

### E-cache-2 · hashCols: derivar la clave del select (opción 2, POR FASES)
El bump MANUAL de versión recayó 3 veces (getCarreraV2, flag `jugado`, fecha_fin): añadir columna al
select sin bumpear -> Data Cache sirve filas sin la columna. Solución: `keyParts = [fn, 'v1', hashCols(select), args]`.
`hashCols` (src/lib/cacheComp.ts) deriva la versión del PROPIO select -> alta/baja de columna = cache-miss
automático, sin recordar. `'v1'` = versión de LÓGICA (bump manual solo si cambia la transformación post-fetch).
- **Fase 1 HECHA** (commit f027033, 2026-09-16): getCarreraV2, getPartidosTemporada, getHitosV2 (los 3 que recayeron).
- **Fase 2 HECHA** (commit 218822a, 2026-09-16, un solo lote): propagado a los 36 getters cacheados con select de
  columnas passthrough (jugadorV2 5, equipo 2, equipoV2 10, competicionV2 17, club 1, alcance 1). Se adelantó del
  2026-09-20 porque no había NADA que verificar por espera (determinista, dato idéntico; 0 errores runtime en 24h) →
  esperar era aplazar. Revisado el diff getter a getter (cada hashCols casa con su .select) + tsc exit 0 + un solo deploy.
- **NO convertidos (skip correcto):** chequeos de existencia, lecturas de blob JSONB (`copas`), y composiciones/
  agregados (líderes, cifras, índices, getPartido, temporadas.ts, campo.ts) donde un cambio de columna es cambio de
  LÓGICA → su token manual `vN` sigue haciendo el bump. Ahí NO aplica hashCols (el output no es el select).
- Variante `cachedSelect` (helper que construye query+clave juntas): anotada, más adelante.

### E-vacio-silencio · Helper sel() (lanza ante error) — POR FASES
Familia "devuelve vacío sin error" (ver PROTOCOLO / memoria). `sel()` (src/lib/supabase.ts) lanza ante error
en vez de tragar `data=null` como "0 filas".
- **Tiempo 1 HECHO** (commit f629faf, 2026-09-16): modo por defecto (lanzar ante error). Adoptado en getGrupoInfo
  (equipo.ts, único sitio quemado aún sin comprobar error) y getMediasPorTemporada (equipoV2.ts, patrón).
- **PENDIENTE — a partir del 2026-09-20: opt-in `sel(q,{noVacio:true})`** para lecturas donde el vacío es IMPOSIBLE
  (comp sin grupos, vista vacía). Exige criterio de dominio (equivocarse rompe una lectura legítima) -> por eso va
  después. **Qué verificar del Tiempo 1:** SÍ tiene contenido real — una lectura que antes erraba en silencio y
  devolvía vacío ahora LANZA -> observable como error de runtime en fichas de jugador/equipo. 0 en 24h (2026-09-16);
  revisar de nuevo el 2026-09-20. Si 0 -> aplicar Tiempo 2. Si aparece error, es sel() haciendo su trabajo (fallo
  real que antes se ocultaba), no una regresión que revertir.
- **APARTE — RLS silencioso (a comprobar, sin fecha fija):** anon key en lectura de SERVIDOR -> un filtro de permisos
  devuelve 0 filas SIN error -> ningún helper lo caza (sel() no; solo {noVacio} o usar la clave adecuada en servidor).
  Fue el mecanismo del count del sitemap. Merece auditoría propia de las lecturas de servidor.

### E-lint-muertos · Linter de exports muertos (knip/ts-prune) — a partir del 2026-09-20
Contra "existir ≠ renderizarse" (construir sobre superficie muerta: equipo/, tablas.tsx). Añadir knip o ts-prune
en CI para avisar de componentes/rutas sin importadores. Posterior a las dos fases de arriba.

### E-prime-extras · Prime en dos sitios más — cuando el de la ficha/listado esté rodado
Aprobados por Fernando el 2026-09-22, a la espera de que el Prime lleve tiempo en producción:
- **"Top de la plantilla" de la ficha de EQUIPO.** Misma `PlayerRow`, así que es el hueco `pre` otra vez
  (px=2, mismo motivo de altura de fila). Responde una pregunta que hoy no tiene respuesta en la web:
  **quién del equipo está en su mejor momento**, que no es quién es mejor.
- **Tarjeta "Ha jugado con"** de la ficha de jugador, a px=2: ya pinta el ELO de cada compañero, así que
  la llama entra al lado sin tocar la maqueta.
- **El buscador NO** (decidido, no pendiente): obligaría a meter `elo_min` en `COLS_J` y engordar un
  payload que se sirve en cada tecleo, para un dato que pide contexto para significar algo.

### E-lint-roto · `npm run lint` no funciona desde el bump a Next 16
Detectado el 2026-09-22. `next lint` se retiró en Next 16 (el script de package.json lo interpreta como
un directorio: *"Invalid project directory provided, no such directory: .../lint"*) y **no hay configuración
de ESLint en el repo**, así que `npx eslint` tampoco corre. O sea: el proyecto lleva sin linter desde el
commit 1096cf4. Hoy la red son `tsc --noEmit` y los tests, que no cubren reglas de React/hooks.
Arreglo: migrar a `eslint.config.mjs` con `eslint-config-next` (v16 trae el flat config) y apuntar el
script ahí. Encaja con [[E-lint-muertos]], que añadiría knip/ts-prune en el mismo sitio.

### E-fechas-tres-formatos · Conviven TRES formatos de fecha en el esquema
Anotado el 2026-09-28. No es una tarea: es un **aviso previo** a cualquiera que toque una ordenación por fecha.

| Formato | Dónde | ¿Ordena bien como texto? |
|---|---|---|
| `DD/MM/YYYY` (texto) | `web_resultados.fecha` (la de MOSTRAR), `web_jugador_partidos.fecha` (3,5 M filas, 100%) | **NO** — ordena por día |
| `DATE` | `web_resultados.fecha_iso` (la de ORDENAR) | Sí |
| `YYYYMMDD` (texto compacto) | `web_equipo_movimientos.fecha` (116.130 filas, `20210919`…) | **Sí**, por suerte |

**El mismo `.sort()` sobre la cadena cruda es correcto en una tabla e incorrecto en otra**, y nada avisa: ordena mal y ya está. `getMovimientosEquipo` ordena por la cadena en crudo y parecía un bug; no lo es, porque esa tabla usa el formato compacto. `fechaCortaYMD` (equipo.ts) también espera ese tercero.

**Antes de tocar un orden por fecha, mira el formato de ESA columna**, no lo deduzcas del nombre del campo. Para `web_resultados` está `claveFecha()` / `claveFechaDesc()` en `src/lib/fechaOrden.ts`, que toman `fecha_iso` o convierten `fecha` y dejan siempre al final lo que no tiene fecha.

**SI ALGÚN DÍA SE UNIFICAN LOS FORMATOS, revisar estos sorts ANTES**: los que hoy aciertan por el formato compacto empezarían a fallar en silencio.

### E-event-estado · `eventStatus` desde `estado_partido` (2026-10-03, HECHO con una salvedad)
Abierto el 2026-10-03 por falta de dato; **resuelto el mismo día**: el pipeline publicó `web_resultados.estado_partido` con valores `suspendido` | `resuelto` | `programado` | NULL.

**Mapeo:** `suspendido` → `EventPostponed` (no se jugó y queda pendiente de resolución, que es lo que postponed significa). Todo lo demás — incluido NULL — → `EventScheduled`. **No se usa `EventCancelled`** (un suspendido no está anulado) **ni `EventCompleted`, que no existe en schema.org**: un partido jugado se queda en `EventScheduled` con su marcador en `name`. Las reglas de emisión no cambian: sin hora, sin campo o con incidencia no hay evento.

**NULL no se deduce.** 128.764 filas de 130.265 lo tienen vacío, así que deducir el estado del marcador habría cambiado el comportamiento de casi toda la base. Vacío = se actúa como hasta hoy.

**SALVEDAD — la ficha de jugador va por detrás:** `web_jugador_partidos` **no tiene** `estado_partido` (3,5 M filas). El historial de partidos lo pide en un select de TRES niveles (`+ es_local, estado_partido` → `+ es_local` → pelado), así que hoy cae al segundo nivel y pinta el resultado como siempre; el día que el ciclo publique la columna, aparece "Susp." sin tocar código. Mismo patrón que ya usaba `es_local` cuando era la columna pendiente. **No se añadió al select a secas** porque una columna inexistente es un 400 de PostgREST y tumbaría la trayectoria entera.

**Y un aviso sobre las actas de verificación:** 5582166 (T22) sí está `suspendido` — es **el único** registro con ese estado en toda la tabla —, pero **5150242 (T20) tiene `estado_partido` NULL** y un 0-0 publicado, así que seguirá mostrando 0-0. Si se espera verla como suspendida, falta que el pipeline la marque.

### E-event-performer · La línea roja de datos estructurados, ACOTADA
Hecho el 2026-10-03. La decisión de 2026-08 prohibía `performer` **por su nombre**, junto a `athlete` y `attendee`, para que no entrara la entidad-persona en páginas indexables en juvenil.

Ahora se emite `performer` y `competitor` **con los dos EQUIPOS** (`SportsTeam`, que son organizaciones), porque lo pidió Fernando para completar el marcado. El motivo del veto era **la persona, no la propiedad**, y con equipos la protección real se mantiene. **Sigue vetado meter personas** en `performer`/`competitor`, y siguen vetados `athlete` y `attendee` sin excepción. El comentario de `jsonld.ts` lleva la acotación fechada para que no parezca que alguien se saltó la regla.

### E-event-organizer · `organizer` derivado de la competición, sin valor por defecto
Reescrito el 2026-10-03 (antes: "es siempre la RFFM").

**Regla:** `organizadorCompeticion(nombre_comp)` (en `lib/jsonld.ts`) consulta una **tabla explícita** y devuelve `{ name, url }` o **null**. Si es null, el `SportsEvent` se emite **SIN `organizer`**. **No hay valor por defecto**, y eso es la decisión: antes era una constante RFFM para todo evento, así que la primera competición ajena que entrara se le habría atribuido a la RFFM sin que nadie lo notara.

Hoy la tabla tiene las **15 competiciones publicadas** (las 9 de aficionados y las 6 de juveniles de `web_grupos`), todas → Real Federación de Fútbol de Madrid, `https://www.rffm.es`. URL comprobada el 2026-10-03: responde 200 y `rffm.es` sin www devuelve 301 hacia ella, así que la forma con www es la canónica; es además la que el pipeline usa para scrapear. Incluye **3ª RFEF Madrid** y **Copa RFEF Fase Autonómica**, cuya fase madrileña organiza la RFFM.

**AL INCORPORAR UNA COMPETICIÓN NUEVA HAY QUE AÑADIR SU LÍNEA.** Si no, sale sin `organizer` — incompleto pero cierto — en vez de con uno falso. El caso que viene: la **División de Honor Juvenil** la organiza la **RFEF** (`https://www.rfef.es`), no la RFFM; hoy está fuera de alcance (ver /sobre).

La clave de la tabla es el `nombre_comp` **crudo** de `web_grupos`, no un título decorado con grupo o temporada: por eso los emisores pasan `competicionNombre` aparte del texto de `description`. Solo se recorta el nombre; un nombre que no casa cae a null y no se adivina.

**Test** (`src/lib/jsonld.test.ts`): competición conocida → organizer con name y url; desconocida y sin nombre → evento emitido **sin** organizer.

### E-event-superevent · Fuera `superEvent` (2026-10-03, HECHO)
`sportsEventLd` anidaba la competición como `superEvent: { '@type': 'SportsEvent', name: '3ª RFEF Madrid · 2026-27' }`. Google la validaba como un **Event propio** y le exigía `startDate` y `location`, que una liga no tiene — y que no se van a inventar. **Era la causa real de los avisos**, por encima de la zona horaria y de los eventos sin location que ya se habían corregido el mismo día. La competición sigue publicada en `description` ("Jornada N · Competición · Local vs Visitante").

Comprobado de paso: tras quitarlo, el grafo tiene **UN SOLO nivel de SportsEvent por partido**. Ningún otro nodo es de tipo Event — los demás son `Organization`, `WebSite`, `SearchAction`/`EntryPoint`, `BreadcrumbList`/`ListItem`, `SportsTeam`, `SportsOrganization`, `Place`, `PostalAddress` y `GeoCoordinates` —, así que no hay ningún otro sitio donde falten `startDate`/`location`.

### E-event-administrativo · Partidos no disputados: sin marcado y con rótulo (2026-10-03, HECHO)
`web_resultados.incidencia` (`local`/`visitante`/`ambos`) marca los partidos resueltos **sin jugarse**. Dos consecuencias:

1. **No se emite `SportsEvent`**, aunque tengan fecha, hora y campo. Un partido no disputado no es un evento, y marcarlo como tal afirma que ocurrió algo que no ocurrió. Las migas de pan se mantienen. El filtro va en `sportsEventLd`, así que cubre los dos emisores a la vez.
2. **Rótulo único en la vista**: `NO_DISPUTADO` ("No disputado · resultado administrativo"), exportado desde `lib/partido.ts` y usado por la ficha de partido y por la lista de resultados, para que el mismo hecho se cuente igual en los dos sitios.

**Decisión de copy que va más allá del encargo, y conviene saberla:** el párrafo de Alineaciones de la ficha decía *"Resultado por incomparecencia o retirada. No compareció {equipo}"*. Usaba las dos palabras que el encargo prohíbe y además afirmaba la causa. `incidencia` dice **quién** (el lado), no **por qué**. Reescrito a *"Resultado administrativo: lo resolvió la federación sin que el partido se jugara. {equipo} no lo disputó"*, que es cierto en los dos casos. Se tocó porque, si no, la misma página afirmaba en un párrafo lo que el rótulo nuevo se cuida de no afirmar.

**Nota para `E-event-estado`:** `incidencia` NO sirve para `eventStatus`. Un partido con incidencia tiene resultado válido (0-3), así que no es `EventCancelled`; y ahora, además, ni siquiera emite evento. Sigue faltando un estado de partido (programado/aplazado/suspendido) del pipeline.

### E-suspendido-barrido · "Suspendido" como estado nuevo: barrido completo (2026-10-04)
`estado_partido = 'suspendido'` es un estado que **ninguna superficie contemplaba**: el código partía de un único booleano `p.jugado`, y con él solo hay dos mundos — jugado o por jugarse —. Un suspendido **no es ninguno de los dos**, y por eso cada sitio que miraba `jugado` lo trataba como futuro.

Revisados **15 usos** de `p.jugado` y equivalentes (marcador no nulo, fecha pasada) en vistas, listas, OG/meta, JSON-LD, sitemap, ICS y textos generados. **Cuatro mostraban algo falso** y se corrigieron; el resto ya acertaba o su omisión no afirma nada.

| Sitio | Hoy | Correcto | Acción |
|---|---|---|---|
| Título y OG de la ficha | "Local **vs** Visitante" | No se va a jugar: "vs" es falso | Guión + "· Suspendido" |
| `description` de la ficha | "fecha, hora, campo **y añadir a tu calendario**" | Ni futuro ni calendario | Texto propio: suspendido, pendiente, sin resultado |
| `/api/ics/<codacta>` | **Servía el evento** (sin marcador + con fecha y hora = pasaba el filtro) | No hay evento | 404 |
| Feed `.ics` de equipo | Entraba como partido **próximo** en el calendario del abonado | No debe estar | Excluido (los clientes lo borran al sondear) |
| `noindex` de la ficha | noindex por `!p.jugado` | Correcto: es thin | — |
| Sitemap de partidos | excluido por `goles_local is not null` | Correcto | — |
| Marcador, colores, MVP, "Tras el partido", botón de calendario, chip | ya resueltos los días 3 y 4 | | — |
| Gráfico de jornadas y `muted` del jugador | usan `web_jugador_partidos.jugado`, que es **convocatoria**, otro flag | No aplica | — |

**PENDIENTE DE DECISIÓN (no es falso, pero puede ser incompleto):** la pestaña de **Alineaciones** se oculta (`show: p.jugado`), y resulta que el suspendido **sí tiene 30 jugadores con minutos y puntos** (§8.24: cuentan mientras el acta exista, ver [[suspendido-los-puntos-cuentan]]). Hoy no se ven. Ocultarlas no afirma nada falso, así que no se tocó; mostrarlas sería más informativo y coherente con que los puntos cuenten. Decisión de Fernando.

**Y la lección de fondo:** el problema no era ningún `if` mal escrito, era que **`p.jugado` es un booleano para un dominio de tres estados**. Mientras la pregunta sea "¿jugado?" en vez de "¿qué estado tiene?", cada superficie nueva volverá a asumir dos mundos. Si aparece un cuarto caso (aplazado con nueva fecha, por ejemplo), lo barato es convertirlo en un estado explícito antes de repartirlo por la vista.


### E-sitemap-slug-caducado · El sitemap debe revalidarse por tag cuando cambia un slug (2026-10-07, ANOTADO, NO TOCADO)
Los sitemaps tienen `revalidate` de 30 días como el resto. Cuando el pipeline **renombra** un equipo o un club, su slug cambia, la ruta vieja pasa a redirigir a la nueva… y el sitemap sigue publicando la vieja hasta 30 días. Resultado: Googlebot encuentra en el sitemap URLs que responden 301, y eso es exactamente lo que explica las **15 "página con redirección"** de Search Console: no son enlaces internos roídos, es nuestro propio sitemap listando slugs pre-renombrado.

Lo correcto es que el renombrado **revalide el sitemap por tag**, igual que revalida la ficha: hoy `/api/revalidate` acota tags a `comp:` y `temporada:`, y ningún tag cubre los sitemaps. No se toca ahora porque cada tag nuevo regenera una página ISR y el cupo está en revisión hasta la factura del 6 de noviembre (ver [[revalidacion-coste-vercel]]). Cuando se abra: un tag `sitemap` emitido solo por el paso de renombrado, no por el ciclo nocturno — si lo emite el ciclo, se regeneran los sitemaps cada noche sin que haya cambiado ningún slug.

### E-429-challenge · El 429 "Security Checkpoint" es de plataforma y NO depende del user agent (2026-10-07)
**Qué devuelve el 429.** La página `Vercel Security Checkpoint`, con cabeceras `x-vercel-mitigated: challenge` y `x-vercel-challenge-token: 2.<ts>.60.…`. No es nuestro código ni una regla nuestra: el proyecto **no tiene configuración de WAF** (`GET /v1/security/firewall/config/active` → 404 "Seawall Config not found"), así que la mitigación la pone la plataforma, no un rule que hayamos escrito.

**Con qué user agent se dispara: con todos.** Matriz medida sobre `/sobre`:

| Cliente | Resultado |
|---|---|
| curl por defecto | 429 |
| UA de Googlebot | 429 |
| UA de Chrome completo | 429 |
| UA de Chrome + `Accept: text/html` | 429 |
| UA vacío | 429 |

El discriminante **no es el user agent**: es **ejecutar el desafío**. La página pide JavaScript (`Enable JavaScript to continue`), arranca un `Worker` contra `/.well-known/vercel/security/static/challenge.v2.min.js` y mide movimiento de ratón. Un navegador real lo resuelve y sigue de forma invisible — por eso Fernando navega el sitio sin ver nada —; cualquier cliente que no ejecute JS se queda en el 429.

**No es nuestra IP.** Es la prueba que lo cierra: pedida la misma URL **desde la infraestructura de Vercel** (`x-vercel-id: iad1::…`, otra región que la de este equipo, `cdg1`) devuelve el **mismo 429** con su propio token. El 429 es del sitio para clientes sin JS, no de este terminal. Queda corregida la lectura anterior (ver [[waf-challenge-tapa-get-en-prod]]).

**Qué pasa y qué no pasa.** Los artefactos estáticos salen limpios: `/robots.txt` 200, `/sitemap.xml` 200, `/api/calendario/equipo/2002.ics` 200 — coherente con que `web_calendario_hits` siga contando suscripciones a diario. Lo que se desafía es el **HTML dinámico**.

**Y aquí está el riesgo de indexación.** Si Googlebot recibe 429 en el HTML: (a) 429 es "servidor saturado", y Google responde **bajando la tasa de rastreo**, que es literalmente el frenazo observado; (b) el sitemap sí se le sirve, así que **descubre** URLs que luego no puede rastrear — el patrón exacto de las 13.816 "descubiertas, actualmente sin rastrear".

**Lo que NO se puede concluir desde aquí.** Que el UA de Googlebot reciba 429 **no prueba nada**: Vercel verifica a los rastreadores por IP y DNS inverso, no por la cadena del UA, así que un UA falsificado desde nuestra IP está *bien* desafiado. Y la documentación de Vercel dice que Attack Mode "challenges browser traffic **while allowing known bots through**" — los bots verificados se permiten. En contra del escenario catastrófico: 8.456 URLs procesadas en Search Console y 5,8M de peticiones que **llegan a las funciones** (un request desafiado en el edge no llega, luego ese tráfico pasa el desafío).

**La prueba que lo zanja, y solo la puede hacer Fernando:** Search Console → Inspección de URL → **Probar URL publicada** sobre una ficha. Eso pide la página como Googlebot real, desde IP de Google, y muestra el HTML obtenido. Si aparece `Vercel Security Checkpoint`, estamos desafiando a Googlebot y es urgente; si aparece la ficha, el bot está en la lista de permitidos y el frenazo tiene otra causa.

**Primer sospechoso: Bot Protection, no Attack Mode.** Esto ya pasó el 30 de agosto, con el mismo síntoma y la misma prueba de que no era nuestra IP, y entonces se midió la causa: **Bot Protection = Challenge** en Vercel → Firewall, con *Attack Challenge Mode* en OFF. Se resolvió el 31 de agosto pasándolo a **Log**. Así que lo primero que hay que mirar es Bot Protection, y solo después Attack Mode. Ver [[waf-challenge-tapa-get-en-prod]].

Como dato, por si fuera Attack Mode: su `--duration` admite `1h` (por defecto), `6h` y `24h`, y la API tiene `attackModeActiveUntil`; que el desafío siga activo nueve días no encaja con una activación manual de 1-24 h. No se propone ninguna regla de firewall: ese frente lo abre Fernando con los user agents en la mano.

**Y una pieza de instrumentación que se cae con esto:** `web_calendario_hits` se habia usado como prueba de que el sitio se servía con normalidad. Hoy ya no vale, porque la ruta `.ics` **no está retada** mientras el HTML sí: un contador propio solo prueba lo de su propia ruta.

### E-competicion-universo · Inventario de la ruta combinatoria de competición (2026-10-07, MEDIDO, NADA TOCADO)

**(a) El inventario real: 14 pestañas, no 13, y hay un segundo eje que no estaba contado.**

Las pestañas salen de los arrays de navegación de los dos componentes, no de `TAB_LABELS` (donde falta `estadisticas`, que por eso coge el rótulo por defecto — y acierta por casualidad). Son **14 identificadores distintos**, en tres repartos:

| Vista | De jornada | De temporada | Total |
|---|---|---|---|
| Grupo · LIGA | `clasificacion`, `resultados`, `goleadores-jornada`, `tarjetas-jornada`, `top5-jugadores-jornada`, `top5-equipos-jornada`, `once-optimo-jornada` (7) | `top10-goleadores-temporada`, `top10-porteros-temporada`, `top10-tarjetas-temporada`, `top10-fantasy-temporada`, `top10-elo-jugadores-temporada`, `once-optimo-temporada`, `estadisticas` (7) | **14** |
| Grupo · COPA | 5 (sin clasificación ni Top-5 Equipos; +`clasificacion` solo en la ronda de grupos) | 5 (sin ELO de jugadores) | **10** |
| Global · LIGA | `clasificacion`, `top5-jugadores-jornada`, `top5-equipos-jornada`, `once-optimo-jornada` (4) | las 7 de temporada | **11** |

**`global` multiplica por categoría, sí, pero no por grupo:** sustituye el segmento `[slug_grupo]` por el literal `global`, así que su eje es categoría × competición × temporada = **60 combinaciones**, con un techo de jornadas que es el `max(total_jornadas)` de sus grupos: **2.012 jornadas** en total.

Censo (coincide con el de Fernando: 529 combinaciones grupo×temporada y 15.967 jornadas):

| | combos | jornadas | × pestañas | URLs |
|---|---|---|---|---|
| Grupo LIGA aficionados | 211 | 6.770 | 14 | 94.780 |
| Grupo LIGA juveniles | 293 | 9.146 | 14 | 128.044 |
| Grupo COPA aficionados | 20 | 46 | 10 | 460 |
| Grupo COPA juveniles | 5 | 5 | 10 | 50 |
| **Global** (solo ligas) | 60 | 2.012 | 11 | **22.132** |
| | | | | **≈ 245.500** |

Contra las 207.571 de Fernando: **+18%**. La diferencia es el eje `global` que no estaba contado (+22.132) y una pestaña de más en liga (+15.916); en contra, la copa tiene 10 pestañas y no 13 (−150). El universo rastreable del sitio sube de 312.700 a **del orden de 550.000**, y esta ruta es el **44%**.

**Y la cifra de 245.500 es solo la alcanzable por navegación. El universo que responde 200 no tiene techo** (ver (b)).

**(b) La ruta NO tiene freno. Medido en local, no deducido:**

| URL | Respuesta | Canonical |
|---|---|---|
| `jornada-4/clasificacion` (actual, jugada) | **200** · 223.964 B | `…/jornada-4/clasificacion` |
| `jornada-29/clasificacion` (en calendario, sin jugar) | **200** · 223.371 B | `…/jornada-4/clasificacion` |
| `jornada-999/clasificacion` (fuera del calendario) | **200** · 223.437 B | `…/jornada-4/clasificacion` |
| `jornada-abc/clasificacion` (no numérica) | **200** · 222.941 B | `…/jornada-4/clasificacion` |
| `jornada-4/pestana-inventada-xyz` | **200** · 223.725 B | **`…/jornada-4/pestana-inventada-xyz`** |
| `global/…/jornada-999/pestana-falsa` | **200** · 272.444 B | **`…/jornada-2/pestana-falsa`** |
| `grupo-999`, `slug_comp` inventado, temporada imposible | **404** | — |

Dos causas en el código, ninguna accidental-de-un-`if`:
- `jornadaNum = parseInt(jornadaSeg.replace('jornada-','')) || grupo.jornada_actual` — **sin tope**. Cualquier número entra, las consultas vuelven vacías o con el último snapshot, y la página se pinta igual (de ahí que los seis cuerpos midan lo mismo).
- `tabEf = tabsActivas.some(t => t[0] === tab) ? tab : tabsActivas[0][0]` — **el tab desconocido cae a la primera pestaña** en vez de 404.

**La asimetría es lo que importa:** el eje de jornada **sí** tiene freno de indexación, porque `generateMetadata` colapsa el canonical a `jornada_actual`; el eje de pestaña **no**, porque el canonical se construye con el `tab` **crudo** → cada cadena inventada es una URL 200 **autocanónica e indexable** que sirve la clasificación. Ahí sí se fabrica universo infinito. Los 404 están solo en grupo, competición y temporada.

**(c) Qué es indexable y cómo se descubre.**

`noindex` solo lo pone `noindexJuvenil`: categoría juvenil y pestaña que no esté en `{clasificacion, resultados, top5-equipos-jornada}`. Aplicado al inventario:

- **indexables ≈ 135.800** (todo aficionados + las 3 pestañas sin jugadores de juvenil)
- **con `noindex` ≈ 109.700** (45% de la ruta) — pero **se rastrean igual**: el `noindex` va en la respuesta, así que Google tiene que descargar las 109.700 para enterarse.

El **sitemap declara 1.032 URLs de competición** (937 de grupo + 95 de global): de la temporada viva solo la jornada actual y solo 8 de las 14 pestañas (las de jornada están excluidas a propósito), y de las temporadas cerradas solo la vista final. Es decir, **el sitemap declara el 0,4% de la ruta**.

**Confirmado: el descubrimiento es 100% la navegación**, y el mecanismo exacto es la barra de jornadas:
```
Array.from({ length: grupo.total_jornadas }, …).map((j) =>
  <Link href={`${base}/jornada-${j}/${tab}`}>J{j}</Link>)
```
Emite **J1…total_jornadas conservando la pestaña activa**, con dos consecuencias: (1) en la temporada en curso publica enlaces a jornadas que no se han jugado — de ahí `grupo-9/2026-27/jornada-29` (calendario de 30, va por la 4) y `grupo-16/2026-27/jornada-19` (calendario de 30, va por la 2) de las listas de Search Console; y (2) desde una pestaña **de temporada** ofrece N enlaces al **mismo contenido**, porque esas 7 pestañas no dependen de la jornada aunque la lleven en la URL. Ese es el multiplicador: la mitad de las 245.500 son duplicados exactos por construcción.

**(d) No tengo señal real de visitas, y conviene decirlo sin adornos.**

Vercel Web Analytics responde **404 "Web Analytics not found"** a `visits/count` y 400 a `visits/aggregate`, pese a que `<Analytics />` y `<SpeedInsights />` están montados en `layout.tsx` y los paquetes instalados. Lo más probable es que el producto no esté activado en el panel — pero después de haber leído un 404 de API como "no existe configuración de firewall" y equivocarme, esto se queda como **"la API dice que no hay; verificar en el panel"**, no como hecho.

No hay ninguna otra fuente interna: `web_calendario_hits` solo cuenta calendarios, y los runtime logs tienen un día de retención y no sobreviven al edge-cache.

**La única fuente real es Search Console → Rendimiento → Resultados de búsqueda**, filtrando por URL que contenga `/jornada-`, y contrastando con el filtro de `/clasificacion` y de `top10-…-temporada`. Eso da clics e impresiones por URL, que es exactamente la señal que hace falta, y solo la puede sacar Fernando. **Si no sale de ahí, se decide por criterio editorial y se dice que es criterio, no dato.**

### E-competicion-recorte · Recorte de la ruta de competición por audiencia medida (2026-10-07, HECHO EN LOCAL, SIN DESPLEGAR)

Criterio de Fernando a partir de Vercel Analytics (30 días): de las 14 pestañas solo tres tienen visitas —`clasificacion` (dominante), `resultados` (segunda, volumen real) y `top10-fantasy-temporada` (una instancia, 16 visitas, mismo orden que una clasificación de grupo medio)—. Las otras once están a cero **también en aficionados**, donde sí son indexables: ésa es la comparación limpia. Siguen funcionando para quien las abra; salen del índice y del rastreo.

**1. Lista blanca de pestañas, con 404.** `TABS_GRUPO_LIGA` (14), `TABS_GRUPO_COPA` (11) y `TABS_GLOBAL` (11) en `lib/seo.ts`, replicando los arrays de navegación de los componentes. Cierra el agujero infinito: un tab inventado devolvía 200 con canonical autoreferente. **La copa lleva 11, no 10:** las 10 estables más `clasificacion`, que existe en la ronda de fase de grupos; dejarla fuera convertiría en 404 una pestaña que funciona hoy. `estadisticas` añadida a `TAB_LABELS`, donde faltaba (acertaba por el valor por defecto).

**2. Tope del eje de jornada.** `jornadaSegValida` (`lib/competiciones.ts`, 17 tests): no numérico → 404, por encima del total de jornadas (o del nº de rondas en copa) → 404, slug de ronda inexistente → 404. **Una jornada futura que sí está en el calendario sigue en 200**, porque existe y tiene visitas reales. El `0` se acepta: es el valor histórico del time-machine, su canonical ya colapsa, y un 404 rompería enlaces viejos sin ganar nada.

**3. `noindex` por audiencia, SUMADO al de privacidad — no sustituyéndolo.** `noindexTab = noindexJuvenil(cat, tab) || !TABS_CON_AUDIENCIA.has(tab)`. Tiene que ser un OR: si el criterio de audiencia *sustituyera* al de privacidad, `top10-fantasy-temporada` quedaría **indexable en juvenil**, y esa pestaña lista jugadores — publicaríamos nombres de menores en el índice como efecto colateral de un recorte de rastreo.

| | URLs | indexables ANTES | indexables DESPUÉS | bloqueadas en robots |
|---|---|---|---|---|
| grupo liga aficionados | 94.780 | 94.780 | 20.310 | 74.470 |
| grupo liga juveniles | 128.044 | 27.438 | 18.292 | 100.606 |
| grupo copa (ambas) | 561 | 516 | 148 | 408 |
| global aficionados | 11.088 | 11.088 | 2.016 | 9.072 |
| global juveniles | 11.044 | 2.008 | 1.004 | 9.036 |
| **TOTAL** | **245.517** | **135.830** | **41.770** | **193.592** |

Indexables **−69%**. Con `noindex`: 109.687 → 203.747. Bloqueadas en robots: **193.592 (79% del universo)**. Quedan **10.155 con noindex pero rastreables**: son juvenil en pestaña permitida (clasificación/resultados/fantasy), donde el `noindex` es de privacidad y el robots no debe taparlo.

**4. Patrón de robots.** Once reglas `Disallow: /madrid/*/<pestaña>$`. El nombre va **completo** a propósito: `/madrid/*/top10-*` sería más corto pero se comería `top10-fantasy-temporada`, que es la que hay que conservar. Verificado con el algoritmo de Google (prefijo, `*` que cruza `/`, `$` de fin de URL, gana el patrón más largo y el Allow en empate) sobre **25 URLs reales: 0 fallos** — las tres conservadas permitidas en grupo, copa, global, juvenil, temporada viva, temporada cerrada y jornada futura; las once bloqueadas en todas sus variantes; y las rutas ajenas (jugador, partido, e incluso un slug de jugador que acaba en `-estadisticas`) intactas.

**5. El sitemap, recortado en la misma tanda.** `GROUP_TABS_LIGA` 8→3, `GROUP_TABS_COPA` 5→2, `GLOBAL_TABS` 7→2. Un sitemap que declara URLs con `noindex` se contradice y gasta rastreo en pedir páginas que luego dicen "no me indexes".

**6. Fallo latente arreglado de paso (vista global).** `getCompeticion` usaba `.limit(1).maybeSingle()`: el canonical y el título salían de **un grupo arbitrario** mientras el componente usa `Math.max(...)`. Con grupos de 26 y 34 jornadas en la misma competición eso ya descuadraba, y ahora descuadraría el **tope de jornada**: el 404 caería sobre jornadas que la propia navegación enlaza. Ahora agrega el máximo.

**CORRECCIÓN MÍA, Y ES LOAD-BEARING.** Dije que las siete pestañas de temporada no dependen de la jornada y que por eso media ruta eran duplicados. **Falso: cinco de las siete sí dependen.** `getTopTemporadaV2` rebobina goleadores/porteros/fantasy a la jornada pedida, `getXiTemporadaV2` igual y `getJuegoLimpioV2` hace `.lte('jornada', jornada)`; el subtítulo lo dice, "acumulado hasta J4". Es un time-machine real. Solo **dos** la ignoran: `top10-elo-jugadores-temporada` (lee `elo_temp` con `.is('jornada', null)`) y `estadisticas` (`getTramosCompeticionV2` no recibe jornada). Duplicados exactos reales ≈ **34.700**, no ~122.000 — y las dos están entre las once que el robots bloquea, así que el coste de rastreo ya queda resuelto sin tocar la navegación.

**ORDEN DE DESPLIEGUE — IMPORTANTE, Y NO ES COSMÉTICO.** `Disallow` y `noindex` se estorban: una URL bloqueada en robots **no se puede rastrear, así que Google nunca lee su `noindex`**. Las que ya estén indexadas se quedarían como "Indexada aunque bloqueada por robots.txt" en vez de salir del índice. La secuencia correcta son **dos despliegues**: primero `noindex` + lista blanca + tope de jornada + sitemap recortado, se espera a que Google recorra y las suelte, y **solo después** el `Disallow`. Si se sube todo junto se congela en el índice lo que se quería sacar de él. Decisión de Fernando; el patrón queda escrito y probado para el segundo.

### E-competicion-fase1-desplegada · Fase 1 verificada en producción (2026-10-07)

Despliegue `dpl_5QbammifGL95RAUEWvZDo83rvBxx`, commit `148c8f0`, READY en 45 s, alias `www.futbol11stats.com`. El `[desplegar]` funcionó: el commit de prueba sin marca quedó CANCELED, así que el `ignoreCommand` hace lo que debe por defecto.

**Verificado contra producción con navegador real** (curl recibe 429 del Bot Protection; ver [[waf-challenge-tapa-get-en-prod]]). 16 códigos de respuesta, 16 correctos:

| | |
|---|---|
| 404 | tab inventada (grupo **y** global), `jornada-999` (grupo y global), `jornada-abc`, slug de ronda inventado en copa |
| 200 | `clasificacion`/`resultados`/`fantasy` en **grupo**, `clasificacion`/`fantasy` en **global**, los tres en **copa**, jornada futura del calendario (`jornada-29`) y el tope exacto (`jornada-30`) |

Y 12 comprobaciones del `noindex`, 12 correctas. Importante: **va en `<meta name="robots">`, no en la cabecera `X-Robots-Tag`** — mirar la cabecera da un falso negativo. Las tres conservadas salen sin meta; las once descartadas con `noindex, follow`; **el fantasy JUVENIL sale `noindex`** y la clasificación juvenil sin meta: el OR de privacidad+audiencia se comporta en producción como se diseñó.

**Cuántas de las 193.592 pueden estar indexadas hoy (para el criterio de salida de la fase 2).** No tengo Search Console, así que doy una cota, no un recuento:

- El sitemap antiguo declaraba 1.032 URLs de competición, y de ellas **unas 317 eran de las once descartadas** (287 de grupo + ~30 de global): 5 de las 6 pestañas de ranking en liga y 3 de las 4 en copa, y **solo en aficionados**, porque en juvenil ya salían por `noindexJuvenil`. Las históricas no aportan ninguna (solo declaraban la vista final).
- Todo lo demás de las 193.592 era descubrible **solo por navegación**, y las 13.816 "descubiertas, actualmente sin rastrear" dicen que Google en su mayoría no las pidió.
- Ninguna de las once tuvo **una sola visita en 30 días**, tampoco en aficionados.

**Conclusión: el orden de magnitud son centenares, no millares** — techo de unas 317 declaradas más lo poco que haya entrado por navegación, sobre un total de 34.781 indexadas que son casi todas fichas. La espera de la fase 2 se mide en días. Se confirma en Search Console filtrando por las once rutas.

### E-enlace-partido-sin-acta · Enlaces a 404 desde la ficha del jugador (2026-10-07, PROPUESTA, SIN IMPLEMENTAR)

**El hecho.** `FichaJugadorV2.tsx:714` enlaza con `a.codacta ? href : null`: la única condición es que la fila del jugador traiga `codacta`, sin mirar `web_resultados`. Y el destino **no es una ficha vacía: es un 404** (`lib/partido.ts` arranca leyendo `web_resultados`, devuelve `null` si no hay fila, y `page.tsx:56` lo convierte en `notFound()`).

**El tamaño real, medido.** De **106.394 actas** referenciadas por filas de jugador, **8 no tienen fila en `web_resultados`**: 226 filas y 191 jugadores, **todas de T17**, y son exactamente las ocho ya conocidas. Es decir: la *clase* existe y seguirá existiendo mientras nada la impida, pero su *población de hoy* no esconde nada más.

**Dos problemas distintos, y conviene no confundirlos:**

1. **El dato.** Que ocho actas tengan filas de jugador publicadas y ningún tablón de partido es un hueco de ingesta del pipeline. El arreglo de fondo es publicar las filas que faltan (o no publicar las del jugador). Eso no lo arregla la web.
2. **La estructura.** Que la web pueda emitir un enlace a una página que no existe, sin forma de saberlo. Eso sí es nuestro, y es lo que hay que cerrar para que la clase no vuelva a producir enlaces rotos.

**Propuesta, por orden de preferencia:**

**(A) La señal viene del pipeline, en la propia fila. Es la que haría.** Una columna booleana en `web_jugador_partidos` — `tiene_ficha`, o el nombre que prefiera el pipeline — que diga si esa acta tiene fila en `web_resultados`. La web la lee **en el select que ya hace**: cero consultas extra, cero latencia extra, y la condición pasa a `a.codacta && a.tiene_ficha`. El pipeline lo calcula con un anti-join **una vez, al exportar**, en lugar de que la web lo deduzca en cada render. Coste: un booleano por fila, despreciable. Y es seguro respecto a la caché: añadir la columna cambia el select, y `hashCols` provoca el cache-miss solo (ver [[cache-key-derivada-del-select-hashcols]]).

Es además lo correcto conceptualmente: que una acta tenga página es una propiedad del conjunto publicado, no algo que el lector deba inferir.

**(B) Si el pipeline no puede, la web lo deriva con UNA consulta por ficha, no por fila.** La ficha ya carga los partidos del jugador; basta un `in` sobre `codacta` contra `web_resultados` y un `Set`. Es **una** consulta por render, no cuarenta, y con búsqueda por índice. Coste: un viaje extra en cada regeneración de ficha de jugador — unas 40.000 fichas, y son ISR, así que una vez por llenado de caché. Funciona, pero duplica un trabajo que el pipeline ya tiene hecho. Lo propondría como puente explícito, no como solución.

**(C) Descartada: hacer que el destino no sea 404.** Renderizar algo en la ficha de partido cuando no hay fila de resultados pero sí filas de jugador fabricaría una página delgada donde hoy hay un 404 honesto, y necesitaría su propio `noindex`. Sería crear justo el tipo de página que acabamos de sacar del índice.

**Urgencia: baja.** El sitemap ya excluye esos partidos (exige `goles_local` no nulo), así que Google no los ve y no hay coste SEO. El coste es que 191 fichas tienen un enlace que no lleva a nada.

### E-tope-destapa-agregado · Un tope nuevo destapa un agregado mal calculado (2026-10-07, lección)

Al poner el tope de jornada en la vista global hubo que mirar de dónde salía el número de jornadas, y ahí estaba el fallo: `getCompeticion` usaba `.limit(1).maybeSingle()` sobre `web_grupos`, es decir **una fila arbitraria**, mientras el componente que pinta la página usa `Math.max(...)` de todos los grupos de la competición.

Llevaba tiempo escondido y **ya estaba haciendo daño en silencio**: con grupos de 26 y de 34 jornadas en la misma competición, el canonical apuntaba a la jornada actual de un grupo cualquiera, no a la de la competición. Un canonical incorrecto no rompe nada visible; simplemente consolida mal.

Lo que lo convierte en lección es el segundo efecto: **el tope nuevo lo habría transformado de "canonical raro" en "404 sobre jornadas que la propia navegación enlaza"**. Un agregado mal calculado es inocuo mientras solo decora; en cuanto algo lo usa para decidir, se vuelve un fallo duro.

**Regla:** antes de usar un número existente como **límite** (tope, gate, condición de 404), comprobar cómo se calcula — no que exista, ni que venga saliendo bien. Un valor que nadie validaba porque solo se mostraba pasa a ser load-bearing en el momento en que decide un código de respuesta. Familia de [[pgstat-no-es-count-y-campos-loadbearing]].
