'use client'

import { useComp } from './compStore'
import { Reloj, Balon, Guante } from '@/components/iconos'
import Badge11 from '@/components/ui/Badge11'
import { fmtNum } from '@/lib/formato'

const med1 = (v: number | null) => (v == null ? '—' : v.toFixed(1).replace('.', ','))

export type CompKpi = { pj: number; minutos: number; goles: number; porterias_cero: number; ptsFantasy: number; media: number | null; mediaColor: string }

// KpiBar de la cabecera: PJ/Min/Goles(o P.a0)/Pts F./Media siguen la COMPETICIÓN seleccionada (compStore, el
// mismo índice que filtra el gráfico de jornadas y el bloque Nivel). Cada competición trae sus cifras propias en
// la fila de carrera (la copa NO se suma con la liga). El ELO NO cambia con el selector: es el valor del jugador
// al cierre de la temporada (última etapa), pasado ya coloreado. `fallback` = temporada sin competiciones.
export default function KpiJugador({ comps, fallback, portero, elo, eloColor }: {
  comps: CompKpi[]; fallback: CompKpi; portero: boolean; elo: number | null; eloColor: string
}) {
  const sel = useComp()
  const c = comps.length ? comps[Math.min(sel, comps.length - 1)] : fallback
  return (
    <div className="kpis">
      <div className="kpi"><div className="kpi-i" /><div className="v num">{fmtNum(c.pj)}</div><div className="k">PJ</div></div>
      <div className="kpi"><div className="kpi-i"><Reloj size={14} /></div><div className="v num">{fmtNum(c.minutos)}</div><div className="k">Min</div></div>
      <div className="kpi kpi-goles">
        <div className="kpi-i">{portero ? <Guante size={14} /> : <Balon size={14} />}</div>
        <div className="v num">{portero ? fmtNum(c.porterias_cero) : fmtNum(c.goles)}</div>
        <div className="k">{portero ? 'P. a cero' : 'Goles'}</div>
      </div>
      <div className="kpi"><div className="kpi-i"><Badge11 /></div><div className="v num">{fmtNum(c.ptsFantasy)}</div><div className="k">PF</div></div>
      <div className="kpi"><div className="kpi-i"><Badge11 /></div><div className="v num" style={{ color: c.mediaColor }}>{c.media != null ? med1(c.media) : '—'}</div><div className="k">Media PF</div></div>
      <div className="kpi"><div className="kpi-i"><Badge11 /></div><div className="v num" style={{ color: eloColor }}>{elo != null ? fmtNum(elo) : '—'}</div><div className="k">ELO</div></div>
    </div>
  )
}
