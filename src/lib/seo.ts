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
}
export function tabLabel(tab: string): string {
  return TAB_LABELS[tab] ?? 'Estadísticas'
}

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
export const GROUP_TABS_LIGA = [
  'clasificacion',
  'resultados',
  'top10-goleadores-temporada',
  'top10-porteros-temporada',
  'top10-tarjetas-temporada',
  'top10-fantasy-temporada',
  'top10-elo-jugadores-temporada',
  'once-optimo-temporada',
]
export const GROUP_TABS_COPA = [
  'resultados',
  'top10-goleadores-temporada',
  'top10-tarjetas-temporada',
  'top10-fantasy-temporada',
  'once-optimo-temporada',
]
export const GLOBAL_TABS = [
  'clasificacion',
  'top10-goleadores-temporada',
  'top10-porteros-temporada',
  'top10-tarjetas-temporada',
  'top10-fantasy-temporada',
  'top10-elo-jugadores-temporada',
  'once-optimo-temporada',
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
