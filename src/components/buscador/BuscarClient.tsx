'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { buscarJugadores, buscarEquipos, highlightTokens, normFull, type JugadorHit, type EquipoHit } from '@/lib/buscador'
import { ResultadoJugador, ResultadoEquipo } from './Resultados'

const PAGE = 20

// Página /buscar: caja editable + pestañas EQUIPOS | JUGADORES con recuentos + listas con "cargar más".
export default function BuscarClient({ initialQ }: { initialQ: string }) {
  const [q, setQ] = useState(initialQ)
  const [tab, setTab] = useState<'jugadores' | 'equipos'>('jugadores')
  const [jug, setJug] = useState<JugadorHit[]>([])
  const [eq, setEq] = useState<EquipoHit[]>([])
  const [nJug, setNJug] = useState(0)
  const [nEq, setNEq] = useState(0)
  const [loading, setLoading] = useState(false)
  const [masLoading, setMasLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const tokens = highlightTokens(q)
  const valida = normFull(q).length >= 2

  useEffect(() => { inputRef.current?.focus() }, [])

  // Consulta (debounce) + sincroniza la URL sin recargar.
  useEffect(() => {
    const url = q ? `/buscar?q=${encodeURIComponent(q)}` : '/buscar'
    window.history.replaceState(null, '', url)
    if (!valida) { setJug([]); setEq([]); setNJug(0); setNEq(0); setLoading(false); return }
    setLoading(true)
    const id = setTimeout(async () => {
      const query = q
      const [re, rj] = await Promise.all([buscarEquipos(query, PAGE), buscarJugadores(query, PAGE)])
      if (query !== q) return
      setEq(re.rows); setNEq(re.count); setJug(rj.rows); setNJug(rj.count)
      // Pestaña por defecto: la que tenga resultados (jugadores si ambas).
      setTab(rj.count > 0 ? 'jugadores' : re.count > 0 ? 'equipos' : 'jugadores')
      setLoading(false)
    }, 250)
    return () => clearTimeout(id)
  }, [q, valida])

  const cargarMas = async () => {
    setMasLoading(true)
    if (tab === 'jugadores') { const r = await buscarJugadores(q, PAGE, jug.length); setJug((x) => [...x, ...r.rows]) }
    else { const r = await buscarEquipos(q, PAGE, eq.length); setEq((x) => [...x, ...r.rows]) }
    setMasLoading(false)
  }

  const lista = tab === 'jugadores' ? jug : eq
  const total = tab === 'jugadores' ? nJug : nEq

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-white mb-4">Buscar</h1>

      {/* Caja */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-pitch-700 bg-pitch-800 focus-within:border-grass-500 transition-colors">
        <Search className="w-5 h-5 text-chalk-600 flex-shrink-0" strokeWidth={2.25} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar jugador o equipo…"
          className="flex-1 min-w-0 bg-transparent text-base text-white placeholder:text-chalk-600 focus:outline-none font-display"
          autoComplete="off"
          spellCheck={false}
        />
        {loading && <Loader2 className="w-4 h-4 text-chalk-600 animate-spin flex-shrink-0" />}
      </div>

      {valida && (
        <>
          {/* Pestañas */}
          <div className="flex gap-1 border-b border-pitch-700 mt-5 mb-2">
            {(['jugadores', 'equipos'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t ? 'border-grass-400 text-white' : 'border-transparent text-chalk-600 hover:text-white'
                }`}
              >
                {t === 'jugadores' ? 'Jugadores' : 'Equipos'} <span className="text-chalk-600">({t === 'jugadores' ? nJug : nEq})</span>
              </button>
            ))}
          </div>

          {/* Lista */}
          <div className="bg-pitch-800 rounded-xl border border-pitch-700 divide-y divide-pitch-700/60 overflow-hidden">
            {lista.length === 0 && !loading && (
              <p className="px-3 py-8 text-center text-sm text-chalk-600">Sin {tab} para «{q}»</p>
            )}
            {tab === 'jugadores'
              ? jug.map((j) => <ResultadoJugador key={j.codjugador} j={j} tokens={tokens} />)
              : eq.map((e) => <ResultadoEquipo key={e.codequipo} e={e} tokens={tokens} />)}
          </div>

          {lista.length < total && (
            <button
              type="button"
              onClick={cargarMas}
              disabled={masLoading}
              className="mt-3 mx-auto flex items-center gap-1.5 text-xs font-medium text-grass-400 hover:text-grass-300 transition-colors disabled:opacity-50"
            >
              {masLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Cargar más ({lista.length} de {total})
            </button>
          )}

          <p className="mt-6 text-[11px] text-chalk-600 text-center">Ordenados por partidos jugados.</p>
        </>
      )}

      {!valida && (
        <p className="mt-6 text-sm text-chalk-600 text-center">Escribe al menos 2 caracteres para buscar.</p>
      )}
    </div>
  )
}
