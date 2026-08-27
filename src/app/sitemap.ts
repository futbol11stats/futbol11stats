import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { esViejaCopa, segRondaActual } from '@/lib/competiciones'
import {
  SITE_URL,
  CATEGORIA_SLUG,
  GROUP_TABS_LIGA,
  GROUP_TABS_COPA,
  GLOBAL_TABS,
  noindexJuvenil,
} from '@/lib/seo'
import { codToSlug } from '@/lib/temporadaSlug'
import { getTemporadasActivas, mapaActivas } from '@/lib/temporadas'
import { getSitemapDatos, tabTieneDatos, type GrupoStat } from '@/lib/sitemapLastmod'
import { getClubesIndex, clubSlug } from '@/lib/club'

export const revalidate = 2592000 // ISR 30d (Fluid CPU): se regenera con cada deploy/re-export; el sitemap solo cambia al añadir grupos/temporadas nuevas

// Estrategia:
//  - Temporada viva (T21): todas las combinaciones grupo×tab + globales×tab, SOLO en su jornada
//    máxima (jornada_actual). No se incluyen las 34 jornadas del time-machine (casi duplicadas;
//    canonicalizan a la jornada máxima).
//  - Temporadas anteriores: solo la vista final por grupo y por global.
//  - Home + landings.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabase
    .from('web_grupos')
    .select('codtemporada, codgrupo, categoria, slug_comp, slug_grupo, jornada_actual, tipo, rondas')

  // Copa por FAMILIA: no listar las páginas viejas por competición (redirigen 308 a la familia).
  const grupos = (data || []).filter((g: any) => !esViejaCopa(g.slug_comp))

  // Temporada activa por competición (data-driven, dentro de la ventana). Sustituye a `codtemporada === LIVE_SEASON`:
  // el grupo que está en la temporada activa de su competición recibe todas las pestañas; el resto (histórico), la
  // vista final. Con todo en T21 hoy, la activa es 21 para todas -> idéntico al comportamiento anterior.
  const activas = mapaActivas(await getTemporadasActivas())

  // Datos por grupo (RPC web_sitemap_grupos): lastmod real + contadores para el GATE anti-thin.
  // gateOn=false si el RPC falló/vino vacío -> NO se filtra nada (comportamiento anterior): el gate NUNCA
  // vacía el sitemap. maxIso = fecha más reciente del sitio (home/landings).
  const datos = await getSitemapDatos()
  const gateOn = datos.grupo.size > 0
  const maxIso = datos.maxIso

  // Suma por COMPETICIÓN para el gate de las vistas GLOBALES (agregan todos los grupos): jugados+ranking
  // sumados y la fecha más reciente.
  const statComp = new Map<string, GrupoStat>()
  for (const g of grupos) {
    const cat0 = CATEGORIA_SLUG[g.categoria]
    const st0 = cat0 ? datos.grupo.get(String(g.codgrupo)) : undefined
    if (!cat0 || !st0) continue
    const key = `${g.codtemporada}|${cat0}|${g.slug_comp}`
    const acc = statComp.get(key) || { jugados: 0, ranking: 0, iso: undefined as string | undefined }
    acc.jugados += st0.jugados
    acc.ranking += st0.ranking
    if (st0.iso && (!acc.iso || st0.iso > acc.iso)) acc.iso = st0.iso
    statComp.set(key, acc)
  }

  const urls: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: maxIso, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/madrid/aficionados`, lastModified: maxIso, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/madrid/juveniles`, lastModified: maxIso, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/sobre`, changeFrequency: 'yearly', priority: 0.6 },   // legales van con noindex y fuera
  ]

  const globalsSeen = new Set<string>()

  for (const g of grupos) {
    const temp = codToSlug(g.codtemporada)
    const cat = CATEGORIA_SLUG[g.categoria]
    if (!temp || !cat) continue
    const st = datos.grupo.get(String(g.codgrupo))
    const lm = st?.iso   // última jornada jugada de este grupo (lastmod real)

    const j = g.jornada_actual || 1
    const isLiga = !g.tipo || g.tipo === 'LIGA'
    const isLive = activas.get(`${g.categoria}|${g.slug_comp}`) === g.codtemporada
    // Copa por familia: el segmento es el slug de la ronda por defecto; liga: jornada-N.
    const seg = isLiga ? `jornada-${j}` : segRondaActual(g)
    const base = `${SITE_URL}/madrid/${cat}/${g.slug_comp}/${g.slug_grupo}/${temp}/${seg}`

    if (isLive) {
      for (const t of isLiga ? GROUP_TABS_LIGA : GROUP_TABS_COPA) {
        if (noindexJuvenil(cat, t)) continue                 // juvenil: fuera las pestañas con nombres de menores
        if (gateOn && !tabTieneDatos(t, st)) continue        // GATE anti-thin: la pestaña entra cuando su tabla tiene datos
        urls.push({ url: `${base}/${t}`, lastModified: lm, changeFrequency: 'weekly', priority: 0.7 })
      }
    } else {
      // Histórico: solo la vista final (clasificación/resultados). Temporadas completas -> jugados>=1 -> pasa el gate.
      const ft = isLiga ? 'clasificacion' : 'resultados'
      if (!gateOn || tabTieneDatos(ft, st)) {
        urls.push({ url: `${base}/${ft}`, lastModified: lm, changeFrequency: 'yearly', priority: 0.4 })
      }
    }

    // Vista global de la competición (solo ligas; una vez por temporada+categoria+slug_comp). El gate usa la
    // SUMA de la competición (statComp), no un solo grupo.
    if (isLiga) {
      const key = `${g.codtemporada}|${cat}|${g.slug_comp}`
      if (!globalsSeen.has(key)) {
        globalsSeen.add(key)
        const cst = statComp.get(key)
        const glm = cst?.iso ?? lm
        const gbase = `${SITE_URL}/madrid/${cat}/${g.slug_comp}/global/${temp}/jornada-${j}`
        if (isLive) {
          for (const t of GLOBAL_TABS) {
            if (noindexJuvenil(cat, t)) continue
            if (gateOn && !tabTieneDatos(t, cst)) continue
            urls.push({ url: `${gbase}/${t}`, lastModified: glm, changeFrequency: 'weekly', priority: 0.6 })
          }
        } else if (!gateOn || tabTieneDatos('clasificacion', cst)) {
          urls.push({ url: `${gbase}/clasificacion`, lastModified: glm, changeFrequency: 'yearly', priority: 0.4 })
        }
      }
    }
  }

  // Clubes: índice + página por club (solo los que tienen equipos -> anti-thin, un club sin equipos no entra).
  // lastmod REAL: la jornada jugada más reciente entre los grupos del club (last_iso del RPC por grupo), no la
  // fecha de generación ni una fecha por temporada. Fallback a la fecha de su última temporada si no hay grupo.
  const clubes = await getClubesIndex()
  urls.push({ url: `${SITE_URL}/clubes`, lastModified: maxIso, changeFrequency: 'weekly', priority: 0.7 })
  for (const cl of clubes) {
    const isoClub = cl.codgrupos.map((cg) => datos.grupo.get(cg)?.iso).filter(Boolean).sort().pop()
    urls.push({
      url: `${SITE_URL}/clubes/${clubSlug(cl.codclub, cl.nombre)}`,
      lastModified: isoClub ?? (cl.maxTemp ? datos.porTemporada.get(cl.maxTemp) : undefined),
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  }

  return urls
}
