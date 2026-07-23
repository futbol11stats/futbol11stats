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

// Temporadas: cod -> slug de URL. La viva es la de número más alto.
export const TEMP_LABEL_BY_COD: Record<number, string> = {
  17: '2021-22',
  18: '2022-23',
  19: '2023-24',
  20: '2024-25',
  21: '2025-26',
}
export const LIVE_SEASON = 21

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
