'use client'

import Link from 'next/link'
import { Estrella } from '@/components/iconos'
import { useTemporada } from './TemporadaContext'
import { tempLabel } from '@/lib/equipo'
import Pastilla from '@/components/Pastilla'
import { type PlantillaRow } from './Plantilla'

// Top 5 de la plantilla de la TEMPORADA SELECCIONADA (reactivo al mismo selector, vía TemporadaContext).
// Ordenados por PTS fantasy (desempate por ELO). Formato "Ha jugado con": nombre enlazado + pastilla +
// PTS y ELO, sin escudo (todos son del equipo). Solo aficionados.
export default function Top5Plantilla({ plantilla }: { plantilla: PlantillaRow[] }) {
  const { sel } = useTemporada()
  const top = plantilla
    .filter((r) => String(r.codtemporada) === String(sel))
    .sort((a, b) => (b.pts ?? -1e9) - (a.pts ?? -1e9) || (b.elo ?? -1e9) - (a.elo ?? -1e9))
    .slice(0, 5)
  if (top.length === 0) return null
  return (
    <div>
      <h2 className="flex items-center gap-1.5 text-[length:var(--t-micro)] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
        <Estrella className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Top 5 de la plantilla
        <span className="text-chalk-600 font-normal normal-case tracking-normal">· {tempLabel(sel)}</span>
      </h2>
      <div className="bg-pitch-800 rounded-xl border border-pitch-700">
        {top.map((r, i) => (
          <div key={r.key} className="flex items-center gap-2 px-3 py-2 border-b border-pitch-700/50 last:border-0">
            <span className="w-3 text-center text-[length:var(--t-micro)] text-chalk-600 tabular-nums flex-shrink-0">{i + 1}</span>
            <span className="w-9 flex-shrink-0"><Pastilla pos={r.pos} estimada={r.estimada} size="mini" /></span>
            <span className="flex-1 min-w-0 truncate text-sm font-display uppercase text-white">
              {r.href ? <Link href={r.href} className="hover:text-grass-300 transition-colors">{r.nombre}</Link> : r.nombre}
            </span>
            <span className="flex-shrink-0 text-xs text-grass-400 font-medium tabular-nums">{r.pts != null ? Math.round(r.pts) : ''}<span className="text-chalk-600 font-normal"> pts</span></span>
            <span className="flex-shrink-0 w-9 text-right text-xs text-chalk-500 tabular-nums">{r.elo != null ? Math.round(r.elo) : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
