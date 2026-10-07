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
    rules: {
      userAgent: '*',
      allow: '/',
      // Las ONCE pestañas de competición con CERO visitas en 30 días (Vercel Analytics). Salen del
      // presupuesto de rastreo; siguen funcionando para quien las abra. Las tres con audiencia
      // —clasificacion, resultados, top10-fantasy-temporada— NO aparecen aquí, en ninguna variante.
      //
      // Forma de los patrones, con el algoritmo de Google (prefijo + `*` + `$`, NO expresiones regulares):
      //  - `/madrid/*/` cubre las tres rutas de una vez (grupo, global y cualquier categoría/temporada),
      //    porque `*` casa también con `/`.
      //  - el nombre de la pestaña va COMPLETO y con `$` al final. Es deliberado: un patrón como
      //    `/madrid/*/top10-*` sería más corto pero se comería `top10-fantasy-temporada`, que es
      //    justamente la que hay que conservar. Ninguna pestaña conservada es prefijo ni sufijo de
      //    ninguna de estas once, así que no hay solape posible.
      //  - `$` ancla el final de la URL, así que una variante con query string no quedaría cubierta.
      //    Es inocuo aquí: ninguna de estas páginas se enlaza con parámetros.
      disallow: [
        '/madrid/*/goleadores-jornada$',
        '/madrid/*/tarjetas-jornada$',
        '/madrid/*/top5-jugadores-jornada$',
        '/madrid/*/top5-equipos-jornada$',
        '/madrid/*/once-optimo-jornada$',
        '/madrid/*/once-optimo-temporada$',
        '/madrid/*/top10-goleadores-temporada$',
        '/madrid/*/top10-porteros-temporada$',
        '/madrid/*/top10-tarjetas-temporada$',
        '/madrid/*/top10-elo-jugadores-temporada$',
        '/madrid/*/estadisticas$',
      ],
    },
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      ...parts('jugadores', nJug),
      ...parts('equipos', nEq),
    ],
    host: SITE_URL,
  }
}
