import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/seo'
import { equipoSlug } from '@/lib/equipo'
import { getSitemapDatos } from '@/lib/sitemapLastmod'

export const revalidate = 2592000 // ISR 30d: solo cambia al reexportar el catálogo de equipos.

// Sitemap propio de fichas de equipo (~1.9k URLs). generateSitemaps -> /equipos/sitemap/[id].xml;
// robots.ts lo enumera junto al sitemap principal y al de jugadores. Misma robustez que el de
// jugadores: KEYSET (sin count:'exact' ni OFFSET) + guard ruidoso contra particiones vacías.
export const EQUIPOS_SITEMAP_CHUNK = 10000
const PAGE = 1000

type Fila = { codequipo: string; nombre: string; codtemporada: number | string | null }

// Solo fichas de AFICIONADOS: las JUVENILES llevan noindex (nombres de menores en la plantilla) -> fuera
// del sitemap. El filtro se aplica en la query (keyset por codequipo compatible) para que el recuento de
// particiones y las URLs cuadren.
async function todasLasFilas(): Promise<Fila[]> {
  const filas: Fila[] = []
  let ultimo = ''
  for (;;) {
    let q = supabase.from('web_equipo').select('codequipo, nombre, codtemporada').neq('rama', 'juvenil').order('codequipo', { ascending: true }).limit(PAGE)
    if (ultimo) q = q.gt('codequipo', ultimo)
    const { data, error } = await q
    if (error) throw new Error(`[sitemap equipos] fallo paginando web_equipo tras ${filas.length} filas: ${error.message || 'error sin mensaje'}`)
    if (!data || data.length === 0) break
    filas.push(...(data as Fila[]))
    ultimo = (data[data.length - 1] as Fila).codequipo
    if (data.length < PAGE) break
  }
  return filas
}

// Igual que jugadores: un recuento fallido NO debe abortar el deploy -> degradar RUIDOSO con fallback holgado.
// Techo = FALLBACK_PARTICIONES_EQ × EQUIPOS_SITEMAP_CHUNK = 3 × 10.000 = 30.000 equipos (hoy ~1.9k -> 1 partición).
const FALLBACK_PARTICIONES_EQ = 3
export async function generateSitemaps() {
  // Recuento SOLO de aficionados (mismo filtro que las URLs) para que n particiones cuadre.
  let n: number
  try {
    const total = (await todasLasFilas()).length
    if (total === 0) throw new Error('web_equipo (aficionados) devolvió 0 filas')
    n = Math.max(1, Math.ceil(total / EQUIPOS_SITEMAP_CHUNK))
  } catch (e) {
    console.error(`[sitemap equipos] NO se pudo contar web_equipo: ${(e as Error).message}. `
      + `Fallback de ${FALLBACK_PARTICIONES_EQ} particiones (techo ${FALLBACK_PARTICIONES_EQ * EQUIPOS_SITEMAP_CHUNK} equipos). REVISAR si se ha superado.`)
    n = FALLBACK_PARTICIONES_EQ
  }
  return Array.from({ length: n }, (_, i) => ({ id: i }))
}

export default async function sitemap({ id }: { id: Promise<number> | number }): Promise<MetadataRoute.Sitemap> {
  const idNum = Number(await id) || 0
  // Igual que el recuento (generateSitemaps): un ERROR de BD (timeout/522 en build) NO debe abortar el deploy.
  // Se degrada RUIDOSO a partición vacía; la ruta es ISR (revalidate 30d) y se regenera con datos reales en la
  // próxima revalidación/deploy con la BD sana. La distinción es importante: solo se degrada ante EXCEPCIÓN (BD
  // caída); un resultado vacío SIN error sigue lanzando (guard anti-sitemap-fantasma más abajo).
  let filas: Fila[]
  try {
    filas = await todasLasFilas()
  } catch (e) {
    console.error(`[sitemap equipos] partición ${idNum}: BD no disponible, se sirve VACÍA y se regenerará por ISR. ${(e as Error).message}`)
    return []
  }
  const total = filas.length
  if (total === 0) throw new Error(`[sitemap equipos] partición ${idNum}: web_equipo devolvió 0 filas`)

  const n = Math.max(1, Math.ceil(total / EQUIPOS_SITEMAP_CHUNK))
  const inicio = idNum * EQUIPOS_SITEMAP_CHUNK
  const trozo = filas.slice(inicio, inicio + EQUIPOS_SITEMAP_CHUNK)
  if (trozo.length === 0 && idNum < n) {
    throw new Error(`[sitemap equipos] partición ${idNum} vacía (de ${n}; total ${total})`)
  }

  // El lastmod tampoco debe tumbar el build: si falla, se emiten las URLs sin fecha (mejor que abortar).
  let porTemporada: Awaited<ReturnType<typeof getSitemapDatos>>['porTemporada']
  try {
    ({ porTemporada } = await getSitemapDatos())
  } catch (e) {
    console.error(`[sitemap equipos] lastmod no disponible, URLs sin fecha: ${(e as Error).message}`)
    porTemporada = new Map()
  }
  return trozo.map((eq) => ({
    url: `${SITE_URL}/madrid/equipo/${equipoSlug(eq.codequipo, eq.nombre)}`,
    lastModified: porTemporada.get(Number(eq.codtemporada)),   // último partido de la última temporada del equipo
    changeFrequency: 'monthly',
    priority: 0.5,
  }))
}
