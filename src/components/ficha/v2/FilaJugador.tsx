import type { ReactNode } from 'react'
import PlayerRow from '@/components/ui/PlayerRow'

// Fila de jugador de rankings / top plantilla. Ahora es un wrapper fino sobre el componente ÚNICO PlayerRow
// (mantiene esta API por los sitios que ya la importan, p.ej. RankingComp). `datos` va envuelto en .pl-stats.
export type FilaJugadorProps = {
  rank?: ReactNode
  rankColor?: string
  codjugador?: string | null
  nombre: string
  pos?: string | null
  escudo?: string | null
  nombreEquipo?: string | null
  datos?: ReactNode
  valor: ReactNode
  valorColor?: string
  fichas?: { has(k: string): boolean } | null
}

export default function FilaJugador({ rank, rankColor, codjugador, nombre, pos, escudo, nombreEquipo, datos, valor, valorColor, fichas }: FilaJugadorProps) {
  return (
    <PlayerRow
      rank={rank}
      rankColor={rankColor}
      cod={codjugador}
      nombre={nombre}
      pos={pos}
      escudo={escudo}
      equipo={nombreEquipo}
      meta={datos ? <span className="pl-stats">{datos}</span> : undefined}
      valor={valor}
      valorStyle={valorColor ? { background: valorColor } : undefined}
      fichas={fichas}
    />
  )
}
