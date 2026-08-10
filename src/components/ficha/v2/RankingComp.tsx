import type { ReactNode } from 'react'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreEquipo from '@/components/NombreEquipo'
import FilaJugador from '@/components/ficha/v2/FilaJugador'

export type RankItem = {
  rank: number | string
  rankColor?: string                // color del número/etiqueta de rango (p. ej. la posición en el XI)
  codjugador?: string | null        // presente -> fila de JUGADOR (avatar de iniciales + escudo en la línea extra)
  nombre: string
  pos?: string | null
  escudo?: string | null
  codequipo?: string | null
  nombreEquipo?: string | null
  valor: ReactNode
  valorColor?: string
  extra?: ReactNode                 // línea de contexto bajo el nombre (PJ · ratio · …)
  barPct?: number | null            // barra de progreso (0-100) opcional
}

// Listas de jugadores -> FilaJugador (la MISMA fila de "Top de la plantilla" de la ficha de equipo, con
// escudo + equipo añadidos). Listas de equipos -> fila .rr con escudo real. Coherente con jugador/equipo v2.
export default function RankingComp({ items, fichas, barColor }: {
  items: RankItem[]; fichas?: { has(k: string): boolean } | null; barColor?: string
}) {
  const listaJugadores = items.length > 0 && items.every((r) => r.codjugador != null)
  if (listaJugadores) {
    return (
      <div>
        {items.map((r, i) => (
          <FilaJugador key={i} rank={r.rank} rankColor={r.rankColor} codjugador={r.codjugador} nombre={r.nombre}
            pos={r.pos} escudo={r.escudo} nombreEquipo={r.nombreEquipo} datos={r.extra} valor={r.valor} valorColor={r.valorColor} fichas={fichas} />
        ))}
      </div>
    )
  }
  return (
    <div className="rank">
      {items.map((r, i) => (
        <div className={`rr${i === 0 ? ' top' : ''}`} key={i}>
          <div className="rp" style={r.rankColor ? { color: r.rankColor, fontSize: 'var(--t-cap)' } : undefined}>{r.rank}</div>
          <EscudoBox escudo={r.escudo ?? null} nombre={r.nombreEquipo ?? r.nombre} size={34} radius={9} />
          <div className="rm">
            <div className="rn">{r.codequipo ? <NombreEquipo codequipo={r.codequipo} nombre={r.nombre} /> : r.nombre}</div>
            {r.extra && <div className="re">{r.extra}</div>}
            {r.barPct != null && <div className="rbar"><span style={{ width: `${r.barPct}%`, background: barColor || 'var(--e3)' }} /></div>}
          </div>
          <div className="rv" style={{ background: r.valorColor || 'var(--e3)' }}>{r.valor}</div>
        </div>
      ))}
    </div>
  )
}
