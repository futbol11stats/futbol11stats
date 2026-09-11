import { getTemporadasActivas } from '@/lib/temporadas'

// ALCANCE DEL PROYECTO — fuente ÚNICA de las cifras "de escaparate" (home, /sobre, metadatos SEO). Existe para
// que no vuelvan a quedar desfasadas escritas a mano en varios sitios (pasó con "5 temporadas" cuando ya eran 6).

// TEMPORADAS: DERIVADO del dato, no se escribe a mano. La primera temporada publicada es T17 (2021-22); el
// número = la más reciente con juego (T_top, de la vista web_temporada_activa) menos T16. Así sube SOLO cada
// temporada nueva sin tocar ningún texto. getTemporadasActivas ya está cacheada (vista diminuta, tag 'indices').
const PRIMERA_TEMPORADA_COD = 17
export async function getNumTemporadas(): Promise<number> {
  const activas = await getTemporadasActivas()
  const tTop = activas.reduce((m, a) => Math.max(m, a.temporada_activa), 0)
  return tTop >= PRIMERA_TEMPORADA_COD ? tTop - PRIMERA_TEMPORADA_COD + 1 : 0
}

// CIFRAS DE VOLUMEN: aproximadas ("+"), en UN SOLO SITIO. Se redondean A LA BAJA para que el "+" sea siempre
// cierto. Se actualizan AQUÍ tras un re-export grande (nada más las usa a mano). Reales 2026-09-11:
// 39.517 jugadores · 1.930 equipos · 593 clubes · 106.869 partidos jugados.
// PENDIENTE (a futuro, para que tampoco estas se toquen a mano): que el pipeline publique estos totales en el
// digest (web_home_cifras o una meta) y la web los lea de la BD. Mientras, este módulo es la fuente única.
export const ALCANCE = {
  jugadores: 39000,
  equipos: 1900,
  partidos: 105000,
} as const
