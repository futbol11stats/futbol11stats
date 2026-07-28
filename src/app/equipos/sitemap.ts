import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/seo'
import { equipoSlug } from '@/lib/equipo'
import { contarKeyset } from '@/app/jugadores/sitemap'

export const revalidate = 2592000 // ISR 30d: solo cambia al reexportar el catálogo de equipos.

// Sitemap propio de fichas de equipo (~1.9k URLs). generateSitemaps -> /equipos/sitemap/[id].xml;
// robots.ts lo enumera junto al sitemap principal y al de jugadores. Misma robustez que el de
// jugadores: KEYSET (sin count:'exact' ni OFFSET) + guard ruidoso contra particiones vacías.
export const EQUIPOS_SITEMAP_CHUNK = 10000
const PAGE = 1000

type Fila = { codequipo: string; nombre: string }

async function todasLasFilas(): Promise<Fila[]> {
  const filas: Fila[] = []
  let ultimo = ''
  for (;;) {
    let q = supabase.from('web_equipo').select('codequipo, nombre').order('codequipo', { ascending: true }).limit(PAGE)
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

export async function generateSitemaps() {
  const total = await contarKeyset('web_equipo', 'codequipo')
  if (total === 0) throw new Error('[sitemap equipos] web_equipo devolvió 0 filas al particionar')
  const n = Math.max(1, Math.ceil(total / EQUIPOS_SITEMAP_CHUNK))
  return Array.from({ length: n }, (_, i) => ({ id: i }))
}

export default async function sitemap({ id }: { id: Promise<number> | number }): Promise<MetadataRoute.Sitemap> {
  const idNum = Number(await id) || 0
  const filas = await todasLasFilas()
  const total = filas.length
  if (total === 0) throw new Error(`[sitemap equipos] partición ${idNum}: web_equipo devolvió 0 filas`)

  const n = Math.max(1, Math.ceil(total / EQUIPOS_SITEMAP_CHUNK))
  const inicio = idNum * EQUIPOS_SITEMAP_CHUNK
  const trozo = filas.slice(inicio, inicio + EQUIPOS_SITEMAP_CHUNK)
  if (trozo.length === 0 && idNum < n) {
    throw new Error(`[sitemap equipos] partición ${idNum} vacía (de ${n}; total ${total})`)
  }

  return trozo.map((eq) => ({
    url: `${SITE_URL}/madrid/equipo/${equipoSlug(eq.codequipo, eq.nombre)}`,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))
}
