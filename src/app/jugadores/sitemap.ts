import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/seo'
import { jugadorSlug } from '@/lib/jugador'

export const revalidate = 2592000 // ISR 30d: solo cambia al reexportar el catálogo de jugadores.

// Sitemap PROPIO de fichas de jugador (~38k URLs), particionado con generateSitemaps para no
// meter las 25k+ URLs en el sitemap.ts principal. Genera /jugadores/sitemap/[id].xml; robots.ts
// enumera cada partición junto al sitemap.xml principal.
export const JUGADORES_SITEMAP_CHUNK = 10000  // URLs por partición (límite Google: 50k/sitemap)
const PAGE = 1000                             // tope de filas por query en PostgREST

export async function generateSitemaps() {
  const { count } = await supabase.from('web_jugador').select('*', { count: 'exact', head: true })
  const n = Math.max(1, Math.ceil((count || 0) / JUGADORES_SITEMAP_CHUNK))
  return Array.from({ length: n }, (_, i) => ({ id: i }))
}

export default async function sitemap({ id }: { id: Promise<number> | number }): Promise<MetadataRoute.Sitemap> {
  // Next 16 pasa `id` como Promise; lo resolvemos antes de calcular el rango.
  const idNum = Number(await id) || 0
  const inicio = idNum * JUGADORES_SITEMAP_CHUNK
  const filas: { codjugador: string; nombre: string }[] = []
  // Paginado interno de 1000 en 1000 para sortear el max-rows de PostgREST y llenar la partición.
  for (let off = 0; off < JUGADORES_SITEMAP_CHUNK; off += PAGE) {
    const from = inicio + off
    const { data } = await supabase
      .from('web_jugador')
      .select('codjugador, nombre')
      .order('codjugador')
      .range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    filas.push(...(data as any))
    if (data.length < PAGE) break
  }
  return filas.map((j) => ({
    url: `${SITE_URL}/madrid/jugador/${jugadorSlug(j.codjugador, j.nombre)}`,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))
}
