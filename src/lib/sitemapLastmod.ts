import { supabase } from '@/lib/supabase'

// Datos por grupo para los sitemaps (RPC web_sitemap_grupos, de solo lectura): última fecha de partido JUGADO
// (lastmod real), nº de partidos jugados y nº de filas de ranking. De aquí sale:
//   - el LASTMOD (por grupo; equipos/jugadores usan el nivel-temporada = max por temporada),
//   - el GATE anti-thin (una pestaña entra al sitemap cuando su tabla tiene datos suficientes).
// ISO 'YYYY-MM-DD' -> comparación lexicográfica = cronológica. Todo es OPCIONAL y DEFENSIVO: si el RPC falla o
// viene vacío, el gate se DESACTIVA (se incluye todo, comportamiento anterior) y no hay lastmod. Nunca se
// vacía el sitemap por esta señal (su fiabilidad manda; está endurecido para GSC).

export type GrupoStat = { iso?: string; jugados: number; ranking: number }
export type SitemapDatos = {
  grupo: Map<string, GrupoStat>       // codgrupo -> stats
  porTemporada: Map<number, string>   // codtemporada -> ISO (último partido de la temporada)
  maxIso?: string                     // fecha más reciente de todo el sitio (home/landings)
}

// Umbrales del gate = los mismos que se usaron para MEDIR el thin content:
//   - pestañas de ranking (top-10, XI): la tabla entra con >= RANKING_MIN filas de ranking,
//   - pestañas básicas (clasificación, resultados): con >= JUGADOS_MIN partidos jugados.
export const RANKING_MIN = 10
export const JUGADOS_MIN = 1
const TABS_BASICAS = new Set(['clasificacion', 'resultados'])

export async function getSitemapDatos(): Promise<SitemapDatos> {
  const grupo = new Map<string, GrupoStat>()
  const porTemporada = new Map<number, string>()
  let maxIso: string | undefined
  try {
    const { data, error } = await supabase.rpc('web_sitemap_grupos')
    if (error || !Array.isArray(data)) return { grupo, porTemporada, maxIso }
    for (const r of data as { codgrupo: string; codtemporada: number; jugados: number; n_ranking: number; last_iso: string | null }[]) {
      const iso = r.last_iso ?? undefined
      grupo.set(String(r.codgrupo), { iso, jugados: Number(r.jugados) || 0, ranking: Number(r.n_ranking) || 0 })
      if (iso) {
        const t = Number(r.codtemporada)
        const prev = porTemporada.get(t)
        if (!prev || iso > prev) porTemporada.set(t, iso)
        if (!maxIso || iso > maxIso) maxIso = iso
      }
    }
  } catch {
    /* opcional: no romper el sitemap */
  }
  return { grupo, porTemporada, maxIso }
}

// ¿Entra esta pestaña en el sitemap? Básicas -> >=1 jugado; ranking -> >=RANKING_MIN filas. Se resuelve solo
// sobre el dato (en septiembre y cada temporada). st = stats de UN grupo (o la SUMA de una competición, para
// las vistas globales). Si st es undefined (grupo sin datos) -> false.
export function tabTieneDatos(tab: string, st: GrupoStat | undefined): boolean {
  if (!st) return false
  return TABS_BASICAS.has(tab) ? st.jugados >= JUGADOS_MIN : st.ranking >= RANKING_MIN
}
