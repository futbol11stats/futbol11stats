'use client'

import { useState } from 'react'
import Link from 'next/link'
import Pastilla from '@/components/Pastilla'

// Plantilla del equipo (colapsada a ~6 + "ver completa"). Filas ya normalizadas por la página:
// aficionados llevan href a la ficha del jugador + pts/elo; juvenil NO (menores, sin pts/elo).
export type PlantillaRow = {
  key: string
  codtemporada?: string | null   // para el filtro por temporada (pastillas)
  codjugador?: string | null
  dorsal: number | null
  pos: string | null
  estimada?: boolean | null
  nombre: string
  href: string | null
  pj: number | null
  goles: number | null
  minutos: number | null
  ta: number | null
  dobles: number | null
  tr: number | null
  pts?: number | null
  elo?: number | null
}

// `completa` (aficionados): set completo PJ·MIN·G·TA·TR·PTS·ELO como la ficha de jugador. En móvil, el
// subconjunto medido que cabe a 390px con la condensada: #·Pos·Jugador·PJ·G·PTS·ELO (MIN/TA/TR ocultas).
export default function Plantilla({
  filas, nota, inicial = 6, completa = false,
}: {
  filas: PlantillaRow[]; nota?: string; inicial?: number; completa?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const visibles = abierto ? filas : filas.slice(0, inicial)
  const hayMas = filas.length > inicial
  if (filas.length === 0) return <p className="text-sm text-chalk-600">Sin plantilla registrada.</p>
  return (
    <div>
      <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-x-auto">
        <table className="w-full tabla-clasificacion tabla-partidos">
          <thead>
            <tr className="border-b border-pitch-700">
              <th className="text-left w-8">#</th>
              <th className="text-left w-10">Pos</th>
              <th className="text-left">Jugador</th>
              <th>PJ</th>
              <th className="hidden sm:table-cell">Min</th>
              <th>G</th>
              <th className="hidden sm:table-cell">TA</th>
              <th className="hidden sm:table-cell">2A</th>
              <th className="hidden sm:table-cell">TR</th>
              {completa && <th className="text-grass-400">PTS</th>}
              {completa && <th className="text-grass-400">ELO</th>}
            </tr>
          </thead>
          <tbody>
            {visibles.map((r) => (
              <tr key={r.key} className="border-b border-pitch-700/50 last:border-0">
                <td className="text-chalk-600 font-mono text-xs tabular-nums">{r.dorsal ?? ''}</td>
                <td className="whitespace-nowrap"><Pastilla pos={r.pos} estimada={r.estimada} size="mini" /></td>
                <td className="col-nombre font-medium text-white uppercase">
                  {r.href ? (
                    <Link href={r.href} className="hover:text-grass-300 hover:underline decoration-grass-500/60 underline-offset-2 transition-colors">{r.nombre}</Link>
                  ) : r.nombre}
                </td>
                <td className="text-center text-chalk-400 tabular-nums">{r.pj ?? 0}</td>
                <td className="text-center text-chalk-600 tabular-nums hidden sm:table-cell">{r.minutos != null ? r.minutos.toLocaleString('es-ES') : ''}</td>
                <td className="text-center text-white font-medium tabular-nums">{r.goles ?? 0}</td>
                <td className="text-center text-chalk-600 tabular-nums hidden sm:table-cell">{r.ta ?? 0}</td>
                <td className="text-center text-chalk-600 tabular-nums hidden sm:table-cell">{r.dobles ?? 0}</td>
                <td className="text-center text-chalk-600 tabular-nums hidden sm:table-cell">{r.tr ?? 0}</td>
                {completa && <td className="text-center text-grass-400 font-medium tabular-nums">{r.pts != null ? Math.round(r.pts) : ''}</td>}
                {completa && <td className="text-center text-grass-400 tabular-nums">{r.elo != null ? Math.round(r.elo) : ''}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hayMas && (
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="mt-1.5 text-xs font-medium text-grass-400 hover:text-grass-300 transition-colors"
        >
          {abierto ? 'Ver menos' : `Ver plantilla completa (${filas.length})`}
        </button>
      )}
      {nota && <p className="mt-2 text-[11px] text-chalk-600 leading-snug">{nota}</p>}
    </div>
  )
}
