import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/seo'
import { JUGADORES_SITEMAP_CHUNK } from '@/app/jugadores/sitemap'
import { EQUIPOS_SITEMAP_CHUNK } from '@/app/equipos/sitemap'

export const revalidate = 2592000 // ISR 30d: el nº de particiones solo cambia al reexportar los catálogos.

// robots enumera el sitemap principal + las particiones de los sitemaps de jugadores y equipos
// (generateSitemaps produce /{jugadores,equipos}/sitemap/[id].xml). Google descubre ~40k fichas sin inflar sitemap.xml.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const [{ count: nJug }, { count: nEq }] = await Promise.all([
    supabase.from('web_jugador').select('*', { count: 'exact', head: true }),
    supabase.from('web_equipo').select('*', { count: 'exact', head: true }),
  ])
  const parts = (base: string, count: number | null, chunk: number) =>
    Array.from({ length: Math.max(1, Math.ceil((count || 0) / chunk)) }, (_, i) => `${SITE_URL}/${base}/sitemap/${i}.xml`)
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      ...parts('jugadores', nJug, JUGADORES_SITEMAP_CHUNK),
      ...parts('equipos', nEq, EQUIPOS_SITEMAP_CHUNK),
    ],
    host: SITE_URL,
  }
}
