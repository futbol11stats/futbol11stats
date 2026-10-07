// Utilidades SEO compartidas (metadata, sitemap, robots).

// Host canónico: el apex hace 308 -> www, así que www es el canónico (metadataBase, canonicals, sitemap, robots).
export const SITE_URL = 'https://www.futbol11stats.com'

// El sitio es Madrid-céntrico hoy pero crecerá a otras federaciones. Las competiciones de LIGA ya
// llevan "Madrid" en nombre_comp; las copas/playoffs no. Añade "Madrid" solo si falta (sin duplicar).
export function ensureMadrid(name: string): string {
  if (!name) return 'Madrid'
  return /madrid/i.test(name) ? name : `${name} Madrid`
}

// Etiqueta humana de cada pestaña (para títulos y descripciones únicos por página).
export const TAB_LABELS: Record<string, string> = {
  clasificacion: 'Clasificación',
  resultados: 'Resultados',
  'goleadores-jornada': 'Goleadores de la jornada',
  'tarjetas-jornada': 'Tarjetas de la jornada',
  'top5-jugadores-jornada': 'Top 5 jugadores de la jornada',
  'top5-equipos-jornada': 'Top 5 equipos de la jornada',
  'once-optimo-jornada': 'XI óptimo de la jornada',
  'top10-goleadores-temporada': 'Goleadores',
  'top10-porteros-temporada': 'Porteros',
  'top10-tarjetas-temporada': 'Tarjetas',
  'top10-fantasy-temporada': 'Fantasy',
  'top10-elo-jugadores-temporada': 'ELO de jugadores',
  'once-optimo-temporada': 'XI óptimo',
  estadisticas: 'Estadísticas',   // faltaba: acertaba por el valor por defecto de tabLabel, no por estar declarada
}
export function tabLabel(tab: string): string {
  return TAB_LABELS[tab] ?? 'Estadísticas'
}

// ---------------------------------------------------------------------------------------------------
// LISTA BLANCA DE PESTAÑAS (una por vista). Es la que convierte en 404 cualquier otro segmento.
//
// Antes, un `tab` desconocido NO era un error: el componente lo degradaba a la primera pestaña
// (`tabEf = tabsActivas.some(...) ? tab : tabsActivas[0][0]`) y generateMetadata construía el canonical
// con el tab CRUDO. Resultado medido: `/…/jornada-4/pestana-inventada-xyz` devolvía 200, con la
// clasificación dentro y un canonical AUTOREFERENTE — es decir, un universo infinito de URLs
// indexables, cada una declarándose canónica de sí misma. El eje de jornada no tenía ese problema
// porque su canonical sí colapsa a la jornada actual.
//
// Las listas replican EXACTAMENTE los arrays de navegación de los componentes (no se inventan ids):
// FichaCompeticionV2 → TABS_JORNADA_LIGA/COPA + TABS_TEMP_LIGA/COPA; FichaCompeticionGlobalV2 → G_TABS_J/T.
// Si se añade una pestaña a la navegación hay que añadirla aquí o devolverá 404.
export const TABS_GRUPO_LIGA = new Set([
  'clasificacion', 'resultados', 'goleadores-jornada', 'tarjetas-jornada',
  'top5-jugadores-jornada', 'top5-equipos-jornada', 'once-optimo-jornada',
  'top10-goleadores-temporada', 'top10-porteros-temporada', 'top10-tarjetas-temporada',
  'top10-fantasy-temporada', 'top10-elo-jugadores-temporada', 'once-optimo-temporada', 'estadisticas',
])
// COPA: 11, no 10. Las 10 "estables" más `clasificacion`, que SÍ existe en la ronda de fase de grupos
// (la pone `hayClasifCopa`). Dejarla fuera convertiría en 404 una pestaña que hoy funciona; en las
// eliminatorias el componente la degrada a `resultados`, que es el comportamiento actual.
export const TABS_GRUPO_COPA = new Set([
  'clasificacion', 'resultados', 'goleadores-jornada', 'tarjetas-jornada',
  'top5-jugadores-jornada', 'once-optimo-jornada',
  'top10-goleadores-temporada', 'top10-porteros-temporada', 'top10-tarjetas-temporada',
  'top10-fantasy-temporada', 'once-optimo-temporada',
])
export const TABS_GLOBAL = new Set([
  'clasificacion', 'top5-jugadores-jornada', 'top5-equipos-jornada', 'once-optimo-jornada',
  'top10-goleadores-temporada', 'top10-porteros-temporada', 'top10-tarjetas-temporada',
  'top10-fantasy-temporada', 'top10-elo-jugadores-temporada', 'once-optimo-temporada', 'estadisticas',
])

// Pestañas CON AUDIENCIA MEDIDA (Vercel Analytics, 30 días): de las 14, solo estas tres aparecen.
// `clasificacion` domina, `resultados` es segunda con volumen real y `top10-fantasy-temporada` tiene una
// sola instancia con 16 visitas — que es el mismo orden que una clasificación de grupo medio, así que
// cuenta. Las otras once están a cero TAMBIÉN en aficionados, donde sí son indexables: ésa es la
// comparación limpia (en juvenil el cero está contaminado por noindexJuvenil, que lo causamos nosotros).
// Las once siguen existiendo y funcionando; solo salen del índice y del presupuesto de rastreo.
export const TABS_CON_AUDIENCIA = new Set(['clasificacion', 'resultados', 'top10-fantasy-temporada'])

// Meta description PROPIA por pestaña: cada una describe lo que realmente muestra (goleadores habla de
// goleadores, tarjetas de tarjetas), en vez del boilerplate idéntico que compartían las 8 pestañas de un grupo.
// `compGrp` = "{competición}{ grupo}" ya compuesto; `global` marca la vista de todos los grupos.
export function descripcionCompeticion(tab: string, compGrp: string, temp: string, global = false): string {
  const ent = global ? `${compGrp} (todos los grupos)` : compGrp
  const M = 'del fútbol aficionado de Madrid en Fútbol11Stats'
  switch (tab) {
    case 'clasificacion': return `Clasificación de ${ent}, temporada ${temp}: posiciones, puntos, victorias, empates, derrotas y goles ${M}.`
    case 'resultados': return `Resultados y calendario de ${ent}, temporada ${temp}: todos los partidos y marcadores, jornada a jornada, ${M}.`
    case 'top10-goleadores-temporada': return `Máximos goleadores de ${ent}, temporada ${temp}: el pichichi y el top-10 de artilleros ${M}.`
    case 'top10-porteros-temporada': return `Mejores porteros de ${ent}, temporada ${temp}: porterías a cero y goles encajados, top-10 ${M}.`
    case 'top10-tarjetas-temporada': return `Ranking de tarjetas de ${ent}, temporada ${temp}: amarillas, rojas y los jugadores más sancionados ${M}.`
    case 'top10-fantasy-temporada': return `Ranking de Puntos Fantasy de ${ent}, temporada ${temp}: los jugadores con mejor rendimiento ${M}.`
    case 'top10-elo-jugadores-temporada': return `Ranking ELO de jugadores de ${ent}, temporada ${temp}: los mejor valorados por el sistema ELO de Fútbol11Stats.`
    case 'once-optimo-temporada': return `XI óptimo de ${ent}, temporada ${temp}: el once ideal de la temporada por rendimiento ${M}.`
    case 'goleadores-jornada': return `Goleadores de la jornada en ${ent}, temporada ${temp}, ${M}.`
    case 'tarjetas-jornada': return `Tarjetas y sancionados de la jornada en ${ent}, temporada ${temp}, ${M}.`
    case 'top5-jugadores-jornada': return `Los 5 mejores jugadores de la jornada en ${ent}, temporada ${temp}, ${M}.`
    case 'top5-equipos-jornada': return `Los 5 mejores equipos de la jornada en ${ent}, temporada ${temp}, ${M}.`
    case 'once-optimo-jornada': return `XI óptimo de la jornada en ${ent}, temporada ${temp}, ${M}.`
    default: return `${tabLabel(tab)} de ${ent}, temporada ${temp}. Clasificación, resultados y estadísticas ${M}.`
  }
}

// Temporadas: cod -> slug de URL con codToSlug (fórmula lineal, fuente única en '@/lib/temporadaSlug'; sin
// lista topada -> T22 y siguientes solas). La viva es la de número más alto.
// LIVE_SEASON eliminado: la temporada activa es data-driven por competición ('@/lib/temporadas'). El sitemap
// usa getTemporadasActivas()+mapaActivas() para marcar qué grupo está en su temporada activa (vs histórico).

// categoria de BD -> segmento de URL.
export const CATEGORIA_SLUG: Record<string, string> = {
  AFICIONADO: 'aficionados',
  JUVENIL: 'juveniles',
}

// Pestañas indexables por tipo de página (para el sitemap; no incluye los tabs por-jornada,
// que son duplicados casi idénticos del time-machine).
// RECORTADAS a las de audiencia medida (TABS_CON_AUDIENCIA). Antes el sitemap declaraba 8/5/7 pestañas,
// de las que cinco o seis pasan ahora a `noindex`: un sitemap que declara URLs con noindex se contradice
// a sí mismo y gasta rastreo en pedir páginas que luego dicen "no me indexes". Deben moverse juntas.
export const GROUP_TABS_LIGA = [
  'clasificacion',
  'resultados',
  'top10-fantasy-temporada',
]
export const GROUP_TABS_COPA = [
  'resultados',
  'top10-fantasy-temporada',
]
export const GLOBAL_TABS = [
  'clasificacion',
  'top10-fantasy-temporada',
]

// Pestañas que NO listan nombres de jugador (solo equipos): clasificación, resultados y forma de equipos.
// Siguen indexables aun en JUVENIL (valor SEO real, sin exponer menores). El RESTO (goleadores, porteros,
// tarjetas, fantasy, ELO jugadores, XI óptimo, top5 jugadores, sancionados/suspendidos de la pestaña de
// tarjetas) sí muestran jugadores -> en juvenil, noindex.
export const TABS_SIN_JUGADOR = new Set(['clasificacion', 'resultados', 'top5-equipos-jornada'])

// ¿Debe llevar noindex esta página de competición? Solo en JUVENIL y solo en pestañas con nombres de
// jugador (menores). "follow" se mantiene aparte. Aficionados nunca; clasificación/resultados nunca.
export const noindexJuvenil = (categoria: string, tab: string): boolean =>
  categoria === 'juveniles' && !TABS_SIN_JUGADOR.has(tab)

// Regla DEFINITIVA de noindex de una pestaña de competición. Son DOS criterios distintos que se SUMAN,
// no uno que sustituye al otro:
//   - privacidad (noindexJuvenil): juvenil + pestaña que lista nombres de menores.
//   - audiencia (TABS_CON_AUDIENCIA): las once pestañas con cero visitas en 30 días, en TODAS las
//     temporadas y categorías.
// Tiene que ser un OR. Si el criterio de audiencia SUSTITUYERA al de privacidad, `top10-fantasy-temporada`
// quedaría indexable también en JUVENIL —y esa pestaña lista jugadores—, así que estaríamos publicando
// nombres de menores en el índice como efecto colateral de un recorte de rastreo. Con el OR, el fantasy
// juvenil sigue noindex por privacidad y el fantasy de aficionados queda indexable por audiencia.
export const noindexTab = (categoria: string, tab: string): boolean =>
  noindexJuvenil(categoria, tab) || !TABS_CON_AUDIENCIA.has(tab)
