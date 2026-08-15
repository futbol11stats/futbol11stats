'use client'

import type { ReactNode } from 'react'
import { useComp } from './compStore'

// Frase del percentil del bloque Nivel. El NÚMERO (pct) NO cambia con el selector (es el percentil de ELO de
// hoy, otro KPI). La CATEGORÍA nombrada (la etiqueta del bloque) SÍ sigue la pastilla de competición activa.
export default function PercentilLbl({ pct, comps }: {
  pct: number; comps: { nombreComp: string; selloSm?: ReactNode }[]
}) {
  const sel = useComp()
  const c = comps.length ? comps[Math.min(sel, comps.length - 1)] : null
  return (
    <div className="batt-lbl">Mejor que el <b>{pct} %</b> de los jugadores de {c
      ? <span className="cat-inline">{c.selloSm} {c.nombreComp}</span>
      : 'su categoría'}</div>
  )
}
