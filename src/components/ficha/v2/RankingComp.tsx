import type { ReactNode } from 'react'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreJugador from '@/components/NombreJugador'
import NombreEquipo from '@/components/NombreEquipo'
import { inicialesJugador, avaStyle } from '@/components/ficha/v2/jugadorFila'

const iniciales = inicialesJugador

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

// Ranking en el estilo .rr de la maqueta de competición, con escudo real (EscudoBox) en TODAS las filas
// de jugador (línea extra) o como avatar en las de equipo. Coherente con jugador/equipo v2.
export default function RankingComp({ items, fichas, barColor }: {
  items: RankItem[]; fichas?: { has(k: string): boolean } | null; barColor?: string
}) {
  return (
    <div className="rank">
      {items.map((r, i) => {
        const esJugador = r.codjugador != null
        return (
          <div className={`rr${i === 0 ? ' top' : ''}`} key={i}>
            <div className="rp" style={r.rankColor ? { color: r.rankColor, fontSize: 'var(--t-cap)' } : undefined}>{r.rank}</div>
            {esJugador
              ? <div className="rav" style={avaStyle(r.pos)}>{iniciales(r.nombre)}</div>
              : <EscudoBox escudo={r.escudo ?? null} nombre={r.nombreEquipo ?? r.nombre} size={34} radius={9} />}
            <div className="rm">
              <div className="rn">
                {esJugador
                  ? <NombreJugador codjugador={r.codjugador} nombre={r.nombre} fichas={fichas} />
                  : (r.codequipo ? <NombreEquipo codequipo={r.codequipo} nombre={r.nombre} /> : r.nombre)}
              </div>
              {(r.extra || (esJugador && r.escudo)) && (
                <div className="re">
                  {esJugador && r.escudo && <EscudoBox escudo={r.escudo} nombre={r.nombreEquipo ?? undefined} size={16} radius={4} />}
                  {r.extra}
                </div>
              )}
              {r.barPct != null && <div className="rbar"><span style={{ width: `${r.barPct}%`, background: barColor || 'var(--e3)' }} /></div>}
            </div>
            <div className="rv" style={{ background: r.valorColor || 'var(--e3)' }}>{r.valor}</div>
          </div>
        )
      })}
    </div>
  )
}
