import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/seo'
import { JUGADORES_SITEMAP_CHUNK } from '@/app/jugadores/sitemap'

export const revalidate = 2592000 // ISR 30d: el nº de particiones de jugadores solo cambia al reexportar el catálogo.

// robots enumera el sitemap principal + cada partición del sitemap de jugadores (generateSitemaps
// produce /jugadores/sitemap/[id].xml). Así Google descubre las ~38k fichas sin inflar sitemap.xml.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { count } = await supabase.from('web_jugador').select('*', { count: 'exact', head: true })
  const n = Math.max(1, Math.ceil((count || 0) / JUGADORES_SITEMAP_CHUNK))
  const jugadores = Array.from({ length: n }, (_, i) => `${SITE_URL}/jugadores/sitemap/${i}.xml`)
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: [`${SITE_URL}/sitemap.xml`, ...jugadores],
    host: SITE_URL,
  }
}
