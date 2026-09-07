import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { JUGADORES_SITEMAP_CHUNK, FALLBACK_PARTICIONES, contarKeyset } from '@/app/jugadores/sitemap'
import { EQUIPOS_SITEMAP_CHUNK, FALLBACK_PARTICIONES_EQ } from '@/app/equipos/sitemap'

export const revalidate = 2592000 // ISR 30d: el nº de particiones solo cambia al reexportar los catálogos.
export const maxDuration = 120 // cuenta filas de 2 tablas grandes; se sube sobre el default global (60s). Baja frecuencia.

// nº de particiones de un sitemap, con el MISMO fallback que su generateSitemaps: un timeout de BD durante el
// build (la instancia va justa y el propio build la satura) NO debe abortar el deploy -> se degrada RUIDOSO al
// fallback holgado, coherente con las rutas que generateSitemaps sí produce (sobre-anunciar es inocuo: la
// partición de más sirve vacía; sub-anunciar perdería URLs). Es ISR: se corrige en la próxima revalidación.
async function nParticiones(tabla: string, key: string, chunk: number, fallback: number): Promise<number> {
  try {
    const total = await contarKeyset(tabla, key)
    if (total === 0) throw new Error(`${tabla} devolvió 0 filas`)
    return Math.max(1, Math.ceil(total / chunk))
  } catch (e) {
    console.error(`[robots] no se pudo contar ${tabla}: ${(e as Error).message}. Fallback ${fallback} particiones.`)
    return fallback
  }
}

// robots enumera el sitemap principal + las particiones de los sitemaps de jugadores y equipos
// (generateSitemaps produce /{jugadores,equipos}/sitemap/[id].xml). Google descubre ~40k fichas sin inflar sitemap.xml.
export default async function robots(): Promise<MetadataRoute.Robots> {
  // Recuento por KEYSET (no count:'exact', que fallaba en silencio con la anon key) -> mismo nº de
  // particiones que generateSitemaps, así el índice anuncia EXACTAMENTE las rutas que existen.
  const [nJug, nEq] = await Promise.all([
    nParticiones('web_jugador', 'codjugador', JUGADORES_SITEMAP_CHUNK, FALLBACK_PARTICIONES),
    nParticiones('web_equipo', 'codequipo', EQUIPOS_SITEMAP_CHUNK, FALLBACK_PARTICIONES_EQ),
  ])
  const parts = (base: string, n: number) =>
    Array.from({ length: n }, (_, i) => `${SITE_URL}/${base}/sitemap/${i}.xml`)
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      ...parts('jugadores', nJug),
      ...parts('equipos', nEq),
    ],
    host: SITE_URL,
  }
}
