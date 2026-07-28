import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { JUGADORES_SITEMAP_CHUNK, contarKeyset } from '@/app/jugadores/sitemap'
import { EQUIPOS_SITEMAP_CHUNK } from '@/app/equipos/sitemap'

export const revalidate = 2592000 // ISR 30d: el nº de particiones solo cambia al reexportar los catálogos.

// robots enumera el sitemap principal + las particiones de los sitemaps de jugadores y equipos
// (generateSitemaps produce /{jugadores,equipos}/sitemap/[id].xml). Google descubre ~40k fichas sin inflar sitemap.xml.
export default async function robots(): Promise<MetadataRoute.Robots> {
  // Recuento por KEYSET (no count:'exact', que fallaba en silencio con la anon key) -> mismo nº de
  // particiones que generateSitemaps, así el índice anuncia EXACTAMENTE las rutas que existen.
  const [nJug, nEq] = await Promise.all([
    contarKeyset('web_jugador', 'codjugador'),
    contarKeyset('web_equipo', 'codequipo'),
  ])
  const parts = (base: string, count: number, chunk: number) =>
    Array.from({ length: Math.max(1, Math.ceil(count / chunk)) }, (_, i) => `${SITE_URL}/${base}/sitemap/${i}.xml`)
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
