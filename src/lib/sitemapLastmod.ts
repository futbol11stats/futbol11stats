import { supabase } from '@/lib/supabase'

// lastmod REAL para los sitemaps: última fecha de partido JUGADO, por grupo (RPC web_sitemap_lastmod).
// De ahí se deriva el nivel-temporada (max por temporada) para equipos/jugadores, que no tienen fecha propia
// en su catálogo. ISO 'YYYY-MM-DD' -> comparación lexicográfica = cronológica. El lastmod es OPCIONAL: si el
// RPC falla o viene vacío se devuelven mapas vacíos y el sitemap se sirve SIN lastmod (nunca se rompe: el
// sitemap está endurecido para GSC y su fiabilidad manda sobre esta señal).
export type LastmodMaps = {
  porGrupo: Map<string, string>       // codgrupo -> ISO (última jornada de esa competición/grupo)
  porTemporada: Map<number, string>   // codtemporada -> ISO (último partido de la temporada)
  maxIso?: string                     // fecha más reciente de todo el sitio (home/landings)
}

export async function getLastmodMaps(): Promise<LastmodMaps> {
  const porGrupo = new Map<string, string>()
  const porTemporada = new Map<number, string>()
  let maxIso: string | undefined
  try {
    const { data, error } = await supabase.rpc('web_sitemap_lastmod')
    if (error || !Array.isArray(data)) return { porGrupo, porTemporada, maxIso }
    for (const r of data as { codgrupo: string; codtemporada: number; last_iso: string | null }[]) {
      const iso = r.last_iso
      if (!iso) continue
      porGrupo.set(String(r.codgrupo), iso)
      const t = Number(r.codtemporada)
      const prev = porTemporada.get(t)
      if (!prev || iso > prev) porTemporada.set(t, iso)
      if (!maxIso || iso > maxIso) maxIso = iso
    }
  } catch {
    /* lastmod opcional: no romper el sitemap */
  }
  return { porGrupo, porTemporada, maxIso }
}
