'use client'

import { useState } from 'react'
import {
  Flag, Goal, Flame, CalendarCheck, Target, ShieldCheck, Shield, CircleCheckBig, Milestone, Sparkles,
} from 'lucide-react'
import EscudoImg from '@/components/EscudoImg'
import { HITO_CONFIG, fechaCorta, tempLabel, type HitoRow } from '@/lib/jugador'

// Timeline vertical de hitos (spec v3): iconos Lucide, cero emojis. Los hitos del MISMO día (debut
// equipo + debut categoría + primer gol de la misma acta, etc.) se agrupan en UN bloque: títulos
// apilados (icono pequeño + texto por línea, escala mejor a 390px) y el momento cronológico una sola
// vez debajo (fecha · rival · resultado, o categoría/temporada si no hay rival). El nodo del timeline
// usa el icono del hito si el día tiene uno solo, o Sparkles si tiene varios ("gran día"). Las series
// siguen colapsando en `curados`; "Ver todos los hitos (N)" revela `todos`. Portero -> acento naranja.

const ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Flag, Goal, Flame, CalendarCheck, Target, ShieldCheck, Shield, CircleCheckBig,
}
const iconOf = (h: HitoRow) => (HITO_CONFIG[h.tipo_hito] && ICONS[HITO_CONFIG[h.tipo_hito].icon]) || Milestone
const labelOf = (h: HitoRow) => (HITO_CONFIG[h.tipo_hito] ? HITO_CONFIG[h.tipo_hito].label(h) : h.tipo_hito)

type Grupo = { fecha: string; hitos: HitoRow[] }

// Agrupa hitos consecutivos con la MISMA fecha (la lista llega ya ordenada cronológicamente).
function agrupar(lista: HitoRow[]): Grupo[] {
  const grupos: Grupo[] = []
  for (const h of lista) {
    const ult = grupos[grupos.length - 1]
    if (ult && ult.fecha === h.fecha) ult.hitos.push(h)
    else grupos.push({ fecha: h.fecha, hitos: [h] })
  }
  return grupos
}

function GrupoDia({ grupo, portero, last }: { grupo: Grupo; portero: boolean; last: boolean }) {
  // Títulos únicos del día (dedup por etiqueta: colapsa el par equipo/categoría en una línea).
  const vistos = new Set<string>()
  const titulos: { label: string; Icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = []
  for (const h of grupo.hitos) {
    const l = labelOf(h)
    if (!vistos.has(l)) { vistos.add(l); titulos.push({ label: l, Icon: iconOf(h) }) }
  }
  const Nodo = titulos.length > 1 ? Sparkles : titulos[0].Icon
  const acento = portero ? 'text-orange-300 bg-orange-500/15 ring-orange-500/25' : 'text-grass-300 bg-grass-500/15 ring-grass-400/25'
  const iconoLinea = portero ? 'text-orange-300' : 'text-grass-300'

  // Contexto del momento: escudo+equipo si algún hito es de ámbito equipo; si no, la categoría.
  const teamHito = grupo.hitos.find((h) => h.ambito === 'equipo' && h.escudo)
  const catHito = grupo.hitos.find((h) => h.ambito === 'categoria')
  const ctxNombre = teamHito?.contexto_nombre ?? catHito?.contexto_nombre
  const detalle = grupo.hitos.find((h) => h.detalle)?.detalle
  const codtemp = grupo.hitos[0]?.codtemporada

  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-pitch-700" aria-hidden="true" />}
      <span className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-inset ${acento}`}>
        <Nodo className="w-4 h-4" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        {/* Títulos apilados: icono pequeño + texto por línea */}
        <div className="space-y-0.5">
          {titulos.map((t, i) => {
            const TIcon = t.Icon
            return (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <TIcon className={`w-3.5 h-3.5 flex-shrink-0 ${iconoLinea}`} strokeWidth={2.25} />
                <span className="text-sm font-semibold text-white leading-tight truncate">{t.label}</span>
              </div>
            )
          })}
        </div>
        {/* Momento cronológico, una sola vez */}
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0 text-[length:var(--t-micro)] text-chalk-600">
          {teamHito ? (
            <span className="inline-flex items-center justify-center w-4 h-4 bg-white rounded-sm flex-shrink-0 p-px">
              <EscudoImg escudo={teamHito.escudo} nombre={teamHito.contexto_nombre ?? undefined} />
            </span>
          ) : catHito ? (
            <span className="text-[length:var(--t-micro)] text-chalk-600 bg-pitch-700 rounded px-1 py-px flex-shrink-0">categoría</span>
          ) : null}
          {ctxNombre && <span className="text-chalk-500 truncate max-w-[55%]">{ctxNombre}</span>}
          <span className="tabular-nums flex-shrink-0">{fechaCorta(grupo.fecha)}</span>
          {detalle ? <span className="truncate">· {detalle}</span> : (codtemp ? <span>· {tempLabel(codtemp)}</span> : null)}
        </div>
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
  const grupos = agrupar(abierto ? todos : curados)
  const hayMas = todos.length > curados.length
  if (todos.length === 0) return <p className="text-sm text-chalk-600">Sin hitos registrados.</p>
  return (
    <div>
      <ol className="relative">
        {grupos.map((g, i) => (
          <GrupoDia key={`${g.fecha}-${i}`} grupo={g} portero={portero} last={i === grupos.length - 1} />
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
