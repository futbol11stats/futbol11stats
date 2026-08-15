'use client'

import type { ReactNode } from 'react'
import { useComp } from './compStore'
import RankFila from './RankFila'

// Filas de ranking de CATEGORÍA y POSICIÓN del bloque Nivel. Siguen la pastilla de competición activa
// (compStore, el mismo store que filtra el gráfico de jornadas). El ranking GENERAL no está aquí: no cambia
// con el selector (va en servidor, fijo). La POSICIÓN del jugador es la misma en todas las etapas (su
// demarcación); lo que cambia con la pastilla es el rank/total de esa etapa.
export type CompRank = {
  nombreComp: string; sello: ReactNode; selloSm?: ReactNode
  rankCat: number | null; rankCatTotal: number | null
  rankPos: number | null; rankPosTotal: number | null
}

export default function NivelRankings({ comps, posInsignia, posLabel }: {
  comps: CompRank[]; posInsignia: ReactNode; posLabel: string
}) {
  const sel = useComp()
  const c = comps.length ? comps[Math.min(sel, comps.length - 1)] : null
  if (!c) return null
  return (
    <>
      <RankFila insignia={c.sello} label={c.nombreComp} rank={c.rankCat} total={c.rankCatTotal} />
      <RankFila insignia={posInsignia} label={posLabel} rank={c.rankPos} total={c.rankPosTotal} />
    </>
  )
}
