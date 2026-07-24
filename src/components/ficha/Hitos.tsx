'use client'

import { useState } from 'react'
import {
  Flag, Goal, Flame, CalendarCheck, Target, ShieldCheck, Shield, CircleCheckBig, Milestone,
} from 'lucide-react'
import EscudoImg from '@/components/EscudoImg'
import { HITO_CONFIG, fechaCorta, tempLabel, type HitoRow } from '@/lib/jugador'

// Timeline vertical de hitos (spec v3): iconos Lucide, cero emojis. Las series (partidos/goles/
// porterías acumulados) llegan ya colapsadas al último de cada serie en `curados`; el botón
// "Ver todos los hitos (N)" revela la lista completa `todos`. Portero -> acento naranja.

const ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Flag, Goal, Flame, CalendarCheck, Target, ShieldCheck, Shield, CircleCheckBig,
}

function HitoItem({ h, portero, last }: { h: HitoRow; portero: boolean; last: boolean }) {
  const cfg = HITO_CONFIG[h.tipo_hito]
  const Icon = (cfg && ICONS[cfg.icon]) || Milestone
  const label = cfg ? cfg.label(h) : h.tipo_hito
  const acento = portero ? 'text-orange-300 bg-orange-500/15 ring-orange-500/25' : 'text-grass-300 bg-grass-500/15 ring-grass-400/25'
  const esEquipo = h.ambito === 'equipo'
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {/* línea vertical */}
      {!last && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-pitch-700" aria-hidden="true" />}
      <span className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-inset ${acento}`}>
        <Icon className="w-4 h-4" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-white leading-tight">{label}</span>
          <span className="text-[11px] text-chalk-600 flex-shrink-0 tabular-nums">{fechaCorta(h.fecha)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
          {esEquipo && h.escudo && (
            <span className="inline-flex items-center justify-center w-4 h-4 bg-white rounded-sm flex-shrink-0 p-px">
              <EscudoImg escudo={h.escudo} nombre={h.contexto_nombre ?? undefined} />
            </span>
          )}
          <span className="text-xs text-chalk-500 truncate">{h.contexto_nombre}</span>
          {!esEquipo && (
            <span className="text-[10px] text-chalk-600 bg-pitch-700 rounded px-1 py-px flex-shrink-0">categoría</span>
          )}
        </div>
        {h.detalle && <p className="text-[11px] text-chalk-600 mt-0.5 truncate">{h.detalle}</p>}
      </div>
    </li>
  )
}

export default function Hitos({
  curados, todos, portero,
}: {
  curados: HitoRow[]; todos: HitoRow[]; portero: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const lista = abierto ? todos : curados
  const hayMas = todos.length > curados.length
  if (todos.length === 0) return <p className="text-sm text-chalk-600">Sin hitos registrados.</p>
  return (
    <div>
      <ol className="relative">
        {lista.map((h, i) => (
          <HitoItem key={`${h.tipo_hito}-${h.ambito}-${h.fecha}-${h.valor}-${i}`} h={h} portero={portero} last={i === lista.length - 1} />
        ))}
      </ol>
      {hayMas && (
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="mt-1 text-xs font-medium text-grass-400 hover:text-grass-300 transition-colors"
        >
          {abierto ? 'Ver menos' : `Ver todos los hitos (${todos.length})`}
        </button>
      )}
    </div>
  )
}
