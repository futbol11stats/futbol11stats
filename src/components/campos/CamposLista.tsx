'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MapPin } from 'lucide-react'

export type CampoCard = { codigo: string; nombre: string; localidad: string | null; provincia: string | null; nEquipos: number; href: string }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Directorio de campos: filtro por LOCALIDAD (dropdown, lo más natural — la gente piensa en municipios) + buscador
// de texto por nombre. CP no se filtra (menos intuitivo), se muestra en la ficha. Sin nombres de persona.
export default function CamposLista({ campos }: { campos: CampoCard[] }) {
  const [q, setQ] = useState('')
  const [loc, setLoc] = useState('')

  const localidades = useMemo(
    () => Array.from(new Set(campos.map((c) => c.localidad).filter((l): l is string => !!l))).sort((a, b) => a.localeCompare(b, 'es')),
    [campos],
  )
  const filtrados = useMemo(() => {
    const nq = norm(q.trim())
    return campos.filter((c) =>
      (!loc || c.localidad === loc) &&
      (!nq || norm(c.nombre).includes(nq) || (c.localidad && norm(c.localidad).includes(nq))))
  }, [campos, q, loc])

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar campo…" autoComplete="off" spellCheck={false}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-pitch-700 bg-pitch-800 text-base text-white placeholder:text-chalk-600 focus:outline-none focus:border-grass-500 transition-colors"
        />
        <select
          value={loc} onChange={(e) => setLoc(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-pitch-700 bg-pitch-800 text-sm text-white focus:outline-none focus:border-grass-500 transition-colors"
          aria-label="Filtrar por localidad">
          <option value="">Todas las localidades</option>
          {localidades.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtrados.map((c) => (
          <li key={c.codigo}>
            <Link href={c.href} className="flex items-center gap-3 p-2.5 rounded-lg bg-pitch-800 border border-pitch-700 hover:border-grass-500/50 transition-colors">
              <span className="w-[34px] h-[34px] rounded-md bg-pitch-700 flex-none inline-flex items-center justify-center text-chalk-500"><MapPin size={17} strokeWidth={2.25} /></span>
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
      {filtrados.length === 0 && <p className="text-chalk-600 mt-4">No hay campos que coincidan.</p>}
    </>
  )
}
