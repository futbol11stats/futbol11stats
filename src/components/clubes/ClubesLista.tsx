'use client'

import { useState } from 'react'
import Link from 'next/link'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import type { ClubIndexRow } from '@/lib/club'

type ClubCard = ClubIndexRow & { href: string }
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function inicial(n: string): string {
  const c = (n.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '')[0]) || '#'
  return /[A-Z]/.test(c) ? c : '#'
}

// Índice alfabético con selector de letra (filtra en cliente). Cada club -> su página. Solo nombre de EQUIPO en
// la ficha destino: aquí, solo el club. Sin nombres de persona en ninguna superficie.
export default function ClubesLista({ clubes }: { clubes: ClubCard[] }) {
  const [letra, setLetra] = useState<string | null>(null)
  const presentes = new Set(clubes.map((c) => inicial(c.nombre)))
  const filtrados = letra ? clubes.filter((c) => inicial(c.nombre) === letra) : clubes

  const btn = (activo: boolean, dis = false) =>
    `px-2.5 py-1 rounded-md text-sm font-semibold transition-colors ${
      dis ? 'text-chalk-700 cursor-default'
      : activo ? 'bg-grass-500 text-white'
      : 'bg-pitch-800 text-chalk-400 hover:bg-pitch-700 hover:text-white'}`

  return (
    <>
      <div className="flex flex-wrap gap-1 mb-6" role="tablist" aria-label="Filtrar clubes por letra">
        <button className={btn(letra === null)} onClick={() => setLetra(null)}>Todos</button>
        {LETRAS.map((L) => (
          <button key={L} className={btn(letra === L, !presentes.has(L))} disabled={!presentes.has(L)}
            onClick={() => setLetra(L)} aria-pressed={letra === L}>{L}</button>
        ))}
      </div>

      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtrados.map((c) => (
          <li key={c.codclub}>
            <Link href={c.href} className="flex items-center gap-3 p-2.5 rounded-lg bg-pitch-800 border border-pitch-700 hover:border-grass-500/50 transition-colors">
              {c.escudo
                ? <EscudoBox escudo={c.escudo} nombre={c.nombre} size={34} radius={7} />
                : <span className="w-[34px] h-[34px] rounded-md bg-pitch-700 flex-none inline-flex items-center justify-center text-[11px] font-bold text-chalk-500">{inicial(c.nombre)}</span>}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white truncate">{c.nombre}</span>
                <span className="block text-xs text-chalk-600 truncate">
                  {[c.localidad, `${c.nEquipos} equipo${c.nEquipos !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {filtrados.length === 0 && <p className="text-chalk-600 mt-4">No hay clubes con esa inicial.</p>}
    </>
  )
}
