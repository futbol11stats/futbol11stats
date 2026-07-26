import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/seo'
import { equipoSlug } from '@/lib/equipo'

export const revalidate = 2592000 // ISR 30d: solo cambia al reexportar el catálogo de equipos.

// Sitemap propio de fichas de equipo (~1.9k URLs). generateSitemaps -> /equipos/sitemap/[id].xml;
// robots.ts lo enumera junto al sitemap principal y al de jugadores.
export const EQUIPOS_SITEMAP_CHUNK = 10000
const PAGE = 1000

export async function generateSitemaps() {
  const { count } = await supabase.from('web_equipo').select('*', { count: 'exact', head: true })
  const n = Math.max(1, Math.ceil((count || 0) / EQUIPOS_SITEMAP_CHUNK))
  return Array.from({ length: n }, (_, i) => ({ id: i }))
}

export default async function sitemap({ id }: { id: Promise<number> | number }): Promise<MetadataRoute.Sitemap> {
  const idNum = Number(await id) || 0
  const inicio = idNum * EQUIPOS_SITEMAP_CHUNK
  const filas: { codequipo: string; nombre: string }[] = []
  for (let off = 0; off < EQUIPOS_SITEMAP_CHUNK; off += PAGE) {
    const from = inicio + off
    const { data } = await supabase
      .from('web_equipo')
      .select('codequipo, nombre')
      .order('codequipo')
      .range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    filas.push(...(data as any))
    if (data.length < PAGE) break
  }
  return filas.map((eq) => ({
    url: `${SITE_URL}/madrid/equipo/${equipoSlug(eq.codequipo, eq.nombre)}`,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))
}
