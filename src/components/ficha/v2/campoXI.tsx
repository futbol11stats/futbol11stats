import type { ReactNode } from 'react'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import { partirNombre } from '@/lib/nombre'

// XI Óptimo sobre campo, compartido por ficha de grupo y global: colores por demarcación (maqueta) +
// formación deducida contando posiciones. El pipeline entrega la posición (POR/DEF/MED/DEL) y el orden.
export const POSC: Record<string, string> = { POR: '#f0b429', DEF: '#9ac4f1', MED: '#8cefa5', DEL: '#f2a3c0' }
const LINE_Y: Record<string, number> = { POR: 88, DEF: 70, MED: 48, DEL: 24 }

export function campoXI(players: { posicion: string; nombre: string; valor: number | string }[]) {
  const byLine: Record<string, typeof players> = { POR: [], DEF: [], MED: [], DEL: [] }
  players.forEach((p) => { (byLine[p.posicion] || byLine.MED).push(p) })
  const dots: ReactNode[] = []
  ;(['POR', 'DEF', 'MED', 'DEL'] as const).forEach((line) => {
    const arr = byLine[line], k = arr.length
    arr.forEach((p, i) => {
      const x = k === 1 ? 50 : ((i + 1) / (k + 1)) * 100
      const col = POSC[line] || '#9ac4f1'
      dots.push(
        <div className="xi-p" style={{ left: `${x}%`, top: `${LINE_Y[line]}%` }} key={`${line}-${i}`}>
          {/* La MISMA pastilla de iniciales del héroe de la ficha de jugador (PlayerAvatar), con el nombre de
              pila debajo (como estaba). No es una variante nueva: es el componente compartido. */}
          <PlayerAvatar nombre={p.nombre} pos={p.posicion} size={34} style={{ margin: '0 auto' }} />
          <div className="nm">{partirNombre(p.nombre).pila}</div>
          <div className="vv" style={{ color: col }}>{p.valor}</div>
        </div>,
      )
    })
  })
  return (
    <div className="pitch">
      <div className="ln" style={{ left: '5%', right: '5%', top: '2%', bottom: '2%', borderRadius: 6 }} />
      <div className="ln" style={{ left: '5%', right: '5%', top: '50%', height: 0 }} />
      <div className="ln" style={{ left: '28%', width: '44%', top: '2%', height: '14%' }} />
      <div className="ln" style={{ left: '28%', width: '44%', bottom: '2%', height: '14%' }} />
      <div className="ln" style={{ left: '36%', width: '28%', top: '39%', height: '22%', borderRadius: '50%' }} />
      {dots}
    </div>
  )
}
