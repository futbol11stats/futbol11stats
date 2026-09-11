import { getTemporadasActivas } from '@/lib/temporadas'
import { cacheTagged } from '@/lib/cacheComp'
import { supabase } from '@/lib/supabase'

// ALCANCE DEL PROYECTO — fuente ÚNICA de las cifras "de escaparate" (home, /sobre, metadatos SEO). Ningún
// número de este tipo se escribe ya a mano: el nº de temporadas se DERIVA y los volúmenes se LEEN de la BD.

// TEMPORADAS: DERIVADO del dato. La primera temporada publicada es T17 (2021-22); el número = la más reciente
// con juego (T_top, de la vista web_temporada_activa) menos T16. Sube SOLO cada temporada nueva. getTemporadasActivas
// ya está cacheada (vista diminuta, tag 'indices').
const PRIMERA_TEMPORADA_COD = 17
export async function getNumTemporadas(): Promise<number> {
  const activas = await getTemporadasActivas()
  const tTop = activas.reduce((m, a) => Math.max(m, a.temporada_activa), 0)
  return tTop >= PRIMERA_TEMPORADA_COD ? tTop - PRIMERA_TEMPORADA_COD + 1 : 0
}

// VOLÚMENES: se LEEN de web_alcance (fila única id=1, la publica el pipeline en el re-export completo y --home,
// no en el publish ligero). Son CRUDOS; el redondeo a la baja y el "+" se aplican aquí en la web (ver floorAprox).
export type Alcance = { jugadores: number; equipos: number; clubes: number; partidos: number; campos: number }

// Fallback CONSERVADOR (a la baja) por si faltara la fila: nunca romper la portada por una cifra de escaparate.
const ALCANCE_FALLBACK: Alcance = { jugadores: 39000, equipos: 1900, clubes: 500, partidos: 105000, campos: 300 }

// Cacheado con el tag `alcance` (SUELTO, no 'indices'): el pipeline emite revalidateTag('alcance') en el
// re-export y la home + /sobre se refrescan. Si el tag no casara, las cifras se quedarían rancias — confirmado
// que es exactamente 'alcance'.
export async function getAlcance(): Promise<Alcance> {
  return cacheTagged(async () => {
    const { data, error } = await supabase.from('web_alcance')
      .select('jugadores, equipos, clubes, partidos, campos').eq('id', 1).limit(1).maybeSingle()
    if (error) throw error   // no cachear un fallback por un error transitorio (el resto de la home ya falla-fuerte si la BD cae)
    return (data as Alcance | null) ?? ALCANCE_FALLBACK
  }, ['getAlcance', 'v1'], ['alcance'])
}

// Redondeo A LA BAJA a una cifra "de escaparate": paso 1000 si ≥10k, 100 si ≥1k, 10 si menos. floor(n) ≤ n, así
// que "más de floor(n)" / "floor(n)+" nunca miente (fue el bug del "110.000+" cuando solo había 106.869).
export function floorAprox(n: number): number {
  const paso = n >= 10000 ? 1000 : n >= 1000 ? 100 : 10
  return Math.floor(n / paso) * paso
}
