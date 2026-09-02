'use client'

import type { ReactNode } from 'react'
import { useComp } from './compStore'
import { fmtNum } from '@/lib/formato'

export type CompPct = { pct: number | null; nombreComp: string | null; selloSm?: ReactNode }

// Bloque ELO / Percentil del Nivel. El ELO (valor propio del jugador al cierre de la temporada = última etapa)
// NO cambia con el selector. El PERCENTIL SÍ: es el elo_percentil_temp de la etapa SELECCIONADA, medido en SU
// pool (categoría de liga, o la familia de la copa) -> con la copa activa, el percentil es el del pool de la
// copa. La batería y la frase (nombrando la competición) lo acompañan. `maxLbl` (techo histórico) va fijo,
// entre el ELO y la batería, como en el original.
export default function NivelElo({ elo, eloColor, comps, maxLbl }: {
  elo: number | null; eloColor: string; comps: CompPct[]; maxLbl?: ReactNode
}) {
  const sel = useComp()
  const c = comps.length ? comps[Math.min(sel, comps.length - 1)] : null
  const pct = c?.pct ?? null
  const llenos = pct != null ? Math.min(10, Math.round(pct / 10)) : 0
  return (
    <>
      <div className="elo-top">
        <div><div className="cap">ELO F11S</div><div className="elo-v" style={{ color: eloColor }}>{elo != null ? fmtNum(elo) : '—'}</div></div>
        <div style={{ textAlign: 'right' }}><div className="cap">Percentil</div><div className="elo-v" style={{ color: eloColor }}>{pct != null ? pct : '—'}</div></div>
      </div>
      {maxLbl}
      <div className="batt">{Array.from({ length: 10 }).map((_, i) => <i key={i} style={i < llenos ? { background: eloColor } : undefined} />)}</div>
      {pct != null && (
        <div className="batt-lbl">Mejor que el <b>{pct} %</b> de los jugadores de {c && c.nombreComp
          ? <span className="cat-inline">{c.selloSm} {c.nombreComp}</span>
          : 'su categoría'}</div>
      )}
    </>
  )
}
