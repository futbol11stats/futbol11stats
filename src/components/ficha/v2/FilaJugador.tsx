import type { ReactNode } from 'react'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreJugador from '@/components/NombreJugador'
import Pastilla from '@/components/Pastilla'
import { escudoUrl, formatNombre } from '@/lib/supabase'
import { abreviaNombre } from '@/lib/nombre'
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
// mismo tamaño, mismo chip de puntos). Único cambio en competición: el avatar de iniciales se sustituye por
// el ESCUDO del equipo (mismo tamaño y posición, con alt/title del club), porque los jugadores vienen de
// muchos clubes. El nombre del equipo se mantiene en la línea de datos (identificador real en aficionado);
// el escudo pequeño de esa línea se elimina por redundante. La estructura no cambia entre pestañas.
export default function FilaJugador({ rank, rankColor, codjugador, nombre, pos, escudo, nombreEquipo, datos, valor, valorColor, fichas }: FilaJugadorProps) {
  // El escudo acompaña al JUGADOR (persona): alt/title = "{jugador} en {equipo}", no solo el club. Ver EscudoImg.
  const personaEq = nombreEquipo ? `${formatNombre(nombre)} en ${nombreEquipo}` : formatNombre(nombre)
  return (
    <div className="pl">
      {rank != null && <div className="pl-rk" style={rankColor ? { color: rankColor } : undefined}>{rank}</div>}
      {escudoUrl(escudo ?? null)
        ? <span className="pl-esc" title={personaEq}><EscudoBox escudo={escudo ?? null} nombre={nombreEquipo ?? undefined} altText={personaEq} size={34} radius={8} /></span>
        : <div className="pl-av" style={avaStyle(pos)}>{inicialesJugador(nombre)}</div>}
      <div className="pl-mid">
        <div className="pl-nm">{codjugador != null ? <NombreJugador codjugador={codjugador} nombre={nombre} fichas={fichas} /> : abreviaNombre(nombre)}</div>
        <div className="pl-me">
          {pos && <Pastilla pos={pos} size="mini" />}
          {nombreEquipo && <span className="pl-eq">{nombreEquipo}</span>}
          {datos && <span className="pl-stats">{datos}</span>}
        </div>
      </div>
      <div className="pl-val" style={{ background: valorColor || 'var(--e2)' }}>{valor}</div>
    </div>
  )
}
