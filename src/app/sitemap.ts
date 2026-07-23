import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import {
  SITE_URL,
  TEMP_LABEL_BY_COD,
  CATEGORIA_SLUG,
  LIVE_SEASON,
  GROUP_TABS_LIGA,
  GROUP_TABS_COPA,
  GLOBAL_TABS,
} from '@/lib/seo'

export const revalidate = 21600 // ISR 6h

// Estrategia:
//  - Temporada viva (T21): todas las combinaciones grupo×tab + globales×tab, SOLO en su jornada
//    máxima (jornada_actual). No se incluyen las 34 jornadas del time-machine (casi duplicadas;
//    canonicalizan a la jornada máxima).
//  - Temporadas anteriores: solo la vista final por grupo y por global.
//  - Home + landings.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabase
    .from('web_grupos')
    .select('codtemporada, categoria, slug_comp, slug_grupo, jornada_actual, tipo')

  const grupos = data || []

  const urls: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/madrid/aficionados`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/madrid/juveniles`, changeFrequency: 'weekly', priority: 0.8 },
  ]

  const globalsSeen = new Set<string>()

  for (const g of grupos) {
    const temp = TEMP_LABEL_BY_COD[g.codtemporada]
    const cat = CATEGORIA_SLUG[g.categoria]
    if (!temp || !cat) continue

    const j = g.jornada_actual || 1
    const isLiga = !g.tipo || g.tipo === 'LIGA'
    const isLive = g.codtemporada === LIVE_SEASON
    const base = `${SITE_URL}/madrid/${cat}/${g.slug_comp}/${g.slug_grupo}/${temp}/jornada-${j}`

    if (isLive) {
      for (const t of isLiga ? GROUP_TABS_LIGA : GROUP_TABS_COPA) {
        urls.push({ url: `${base}/${t}`, changeFrequency: 'weekly', priority: 0.7 })
      }
    } else {
      urls.push({
        url: `${base}/${isLiga ? 'clasificacion' : 'resultados'}`,
        changeFrequency: 'yearly',
        priority: 0.4,
      })
    }

    // Vista global de la competición (solo ligas; una vez por temporada+categoria+slug_comp).
    if (isLiga) {
      const key = `${g.codtemporada}|${cat}|${g.slug_comp}`
      if (!globalsSeen.has(key)) {
        globalsSeen.add(key)
        const gbase = `${SITE_URL}/madrid/${cat}/${g.slug_comp}/global/${temp}/jornada-${j}`
        if (isLive) {
          for (const t of GLOBAL_TABS) {
            urls.push({ url: `${gbase}/${t}`, changeFrequency: 'weekly', priority: 0.6 })
          }
        } else {
          urls.push({ url: `${gbase}/clasificacion`, changeFrequency: 'yearly', priority: 0.4 })
        }
      }
    }
  }

  return urls
}
