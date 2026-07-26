'use client'

import { useState } from 'react'
import Link from 'next/link'

// Plantilla del equipo (colapsada a ~6 + "ver completa"). Filas ya normalizadas por la página:
// aficionados llevan href a la ficha del jugador; juvenil NO (menores) y muestra `nota` al pie.
export type PlantillaRow = {
  key: string
  dorsal: number | null
  pos: string | null
  nombre: string
  href: string | null
  pj: number | null
  goles: number | null
  minutos: number | null
  ta: number | null
  tr: number | null
}

const POS_COLOR: Record<string, string> = {
  POR: 'text-orange-300', DEF: 'text-blue-300', MED: 'text-grass-300', DEL: 'text-red-300',
}

export default function Plantilla({
  filas, nota, inicial = 6,
}: {
  filas: PlantillaRow[]; nota?: string; inicial?: number
}) {
  const [abierto, setAbierto] = useState(false)
  const visibles = abierto ? filas : filas.slice(0, inicial)
  const hayMas = filas.length > inicial
  if (filas.length === 0) return <p className="text-sm text-chalk-600">Sin plantilla registrada.</p>
  return (
    <div>
      <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-x-auto">
        <table className="w-full tabla-clasificacion">
          <thead>
            <tr className="border-b border-pitch-700">
              <th className="text-left w-8">#</th>
              <th className="text-left w-10">Pos</th>
              <th className="text-left">Jugador</th>
              <th>PJ</th>
              <th>G</th>
              <th className="hidden sm:table-cell">Min</th>
              <th className="hidden sm:table-cell">TA</th>
              <th className="hidden sm:table-cell">TR</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((r) => (
              <tr key={r.key} className="border-b border-pitch-700/50 last:border-0">
                <td className="text-chalk-600 font-mono text-xs tabular-nums">{r.dorsal ?? ''}</td>
                <td className={`font-mono text-xs font-semibold ${r.pos ? (POS_COLOR[r.pos] || 'text-chalk-500') : 'text-chalk-600'}`}>{r.pos || '—'}</td>
                <td className="col-nombre font-medium text-white">
                  {r.href ? (
                    <Link href={r.href} className="hover:text-grass-300 hover:underline decoration-grass-500/60 underline-offset-2 transition-colors">{r.nombre}</Link>
                  ) : r.nombre}
                </td>
                <td className="text-center text-chalk-400 tabular-nums">{r.pj ?? 0}</td>
                <td className="text-center text-white font-medium tabular-nums">{r.goles ?? 0}</td>
                <td className="text-center text-chalk-600 tabular-nums hidden sm:table-cell">{r.minutos != null ? r.minutos.toLocaleString('es-ES') : ''}</td>
                <td className="text-center text-chalk-600 tabular-nums hidden sm:table-cell">{r.ta ?? 0}</td>
                <td className="text-center text-chalk-600 tabular-nums hidden sm:table-cell">{r.tr ?? 0}</td>
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
