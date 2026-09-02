'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import EntityCard from '@/components/ui/EntityCard'

export type CampoCard = { codigo: string; nombre: string; localidad: string | null; provincia: string | null; nEquipos: number; href: string }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Directorio de campos: filtro por LOCALIDAD (dropdown, lo más natural — la gente piensa en municipios) + buscador
// de texto por nombre. CP no se filtra (menos intuitivo), se muestra en la ficha. Sin nombres de persona.
export default function CamposLista({ campos }: { campos: CampoCard[] }) {
  const [q, setQ] = useState('')
  const [loc, setLoc] = useState('')

  // Pre-selección por ?loc= (miga de la ficha de campo -> "campos de esa población"). Se lee tras montar
  // para no romper la hidratación de la página estática (el primer render coincide con el servidor: sin filtro).
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('loc') || ''
    if (v) setLoc(v)
  }, [])

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
            <EntityCard
              href={c.href}
              icon={<span className="w-[34px] h-[34px] rounded-md bg-pitch-700 flex-none inline-flex items-center justify-center text-chalk-500"><MapPin size={17} strokeWidth={2.25} /></span>}
              title={c.nombre}
              subtitle={[c.localidad, `${c.nEquipos} equipo${c.nEquipos !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
            />
          </li>
        ))}
      </ul>
      {filtrados.length === 0 && <p className="text-chalk-600 mt-4">No hay campos que coincidan.</p>}
    </>
  )
}
