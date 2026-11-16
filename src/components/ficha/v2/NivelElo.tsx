import type { ReactNode } from 'react'
import { fmtNum } from '@/lib/formato'
import { ELO_METODO } from '@/lib/rotulos'

export type CompPct = { pct: number | null; nombreComp: string | null; selloSm?: ReactNode }

// Bloque ELO / Percentil del Nivel. ELO y percentil salen de la MISMA etapa (la última de la temporada, ver
// lib/eloEtapa.ts) y no cambian con el selector de competición: el percentil es el elo_percentil_temp de esa etapa,
// medido en SU pool, y la frase nombra esa competición. `maxLbl` (techo histórico) va fijo, entre el ELO y la
// batería, como en el original.
export default function NivelElo({ elo, eloColor, comp, maxLbl }: {
  elo: number | null; eloColor: string; comp: CompPct | null; maxLbl?: ReactNode
}) {
  const c = comp
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
      {/* Qué mide el ELO, AL FINAL del bloque y no bajo el valor: la línea del percentil explica la batería
          que tiene justo encima y debe quedarse pegada a ella; esto es lo más general y por eso va abajo.
          Se pinta siempre, haya percentil o no: la pregunta "¿qué es este número?" no depende de que haya
          pool con el que comparar. El texto vive en lib/rotulos.ts. */}
      <div className="batt-lbl elo-metodo">{ELO_METODO}</div>
    </>
  )
}
