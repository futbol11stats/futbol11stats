import type { ReactNode } from 'react'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreJugador from '@/components/NombreJugador'
import Pastilla from '@/components/Pastilla'
import { inicialesJugador, avaStyle } from '@/components/ficha/v2/jugadorFila'

export type FilaJugadorProps = {
  rank?: ReactNode
  rankColor?: string
  codjugador?: string | null
  nombre: string
  pos?: string | null
  escudo?: string | null
  nombreEquipo?: string | null
  datos?: ReactNode          // contenido de la línea de datos (va dentro de .pl-stats); varía por pestaña
  valor: ReactNode
  valorColor?: string
  fichas?: { has(k: string): boolean } | null
}

// Fila de jugador COMPARTIDA — la misma de "Top de la plantilla" de la ficha de equipo (mismas clases .pl,
// mismo avatar coloreado por demarcación, mismo chip de puntos). Lo único que se añade en competición es el
// escudo y el nombre del equipo al principio de la línea de datos. La estructura no cambia entre pestañas;
// solo el contenido de `datos`.
export default function FilaJugador({ rank, rankColor, codjugador, nombre, pos, escudo, nombreEquipo, datos, valor, valorColor, fichas }: FilaJugadorProps) {
  return (
    <div className="pl">
      {rank != null && <div className="pl-rk" style={rankColor ? { color: rankColor } : undefined}>{rank}</div>}
      <div className="pl-av" style={avaStyle(pos)}>{inicialesJugador(nombre)}</div>
      <div className="pl-mid">
        <div className="pl-nm">{codjugador != null ? <NombreJugador codjugador={codjugador} nombre={nombre} fichas={fichas} /> : nombre}</div>
        <div className="pl-me">
          {pos && <Pastilla pos={pos} size="mini" />}
          {(escudo || nombreEquipo) && (
            <span className="pl-eq"><EscudoBox escudo={escudo ?? null} nombre={nombreEquipo ?? undefined} size={16} radius={4} /><span>{nombreEquipo}</span></span>
          )}
          {datos && <span className="pl-stats">{datos}</span>}
        </div>
      </div>
      <div className="pl-val" style={{ background: valorColor || 'var(--e2)' }}>{valor}</div>
    </div>
  )
}
