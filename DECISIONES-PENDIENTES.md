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
Estado: PLANIFICADO. No ejecutar todavia (Fernando quiere revisar las tres fichas en pantalla antes).

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
