'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, X, Loader2 } from 'lucide-react'
import { buscarJugadores, buscarEquipos, buscarClubes, highlightTokens, normFull, type JugadorHit, type EquipoHit, type ClubHit } from '@/lib/buscador'
import { jugadorHref } from '@/lib/jugador'
import { equipoHref } from '@/lib/equipo'
import { clubSlug } from '@/lib/clubSlug'
import { ResultadoJugador, ResultadoEquipo, ResultadoClub } from './Resultados'

// Buscador del header (client): lupa siempre visible; al abrir despliega caja + resultados agrupados.
// Consulta directa a Supabase con debounce 250ms y mínimo 2 caracteres. Teclado (flechas+Enter) en
// desktop; cierre con X/Escape/click fuera. "Ver los N resultados" -> /buscar.
export default function Buscador({ suelo }: { suelo: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [jug, setJug] = useState<JugadorHit[]>([])
  const [eq, setEq] = useState<EquipoHit[]>([])
  const [clu, setClu] = useState<ClubHit[]>([])
  const [nJug, setNJug] = useState(0)
  const [nEq, setNEq] = useState(0)
  const [nClu, setNClu] = useState(0)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const tokens = highlightTokens(q)
  const valida = normFull(q).length >= 2
  // Lista plana para navegación con teclado: equipos primero, luego jugadores (orden de la maqueta).
  const hits = [
    ...eq.map((e) => ({ href: equipoHref(e.codequipo, e.nombre) || '#' })),
    ...clu.map((c) => ({ href: `/clubes/${clubSlug(c.codclub, c.nombre_club)}` })),
    ...jug.map((j) => ({ href: jugadorHref(j.codjugador, j.nombre) })),
  ]

  // Debounce de la consulta.
  useEffect(() => {
    if (!valida) { setJug([]); setEq([]); setClu([]); setNJug(0); setNEq(0); setNClu(0); setLoading(false); return }
    setLoading(true)
    const id = setTimeout(async () => {
      const query = q
      const [re, rc, rj] = await Promise.all([buscarEquipos(query, 4), buscarClubes(query, 4), buscarJugadores(query, 8)])
      // Evita pisar con una respuesta vieja si la query ya cambió.
      if (query !== q) return
      setEq(re.rows); setNEq(re.count); setClu(rc.rows); setNClu(rc.count); setJug(rj.rows); setNJug(rj.count)
      setActive(-1); setLoading(false)
    }, 250)
    return () => clearTimeout(id)
  }, [q, valida])

  // Foco al abrir.
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  // Cierre con click fuera.
  useEffect(() => {
    if (!open) return
    const onDown = (ev: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(ev.target as Node)) cerrar() }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const cerrar = useCallback(() => { setOpen(false); setQ(''); setJug([]); setEq([]); setClu([]); setActive(-1) }, [])

  const irABuscar = () => { if (valida) { router.push(`/buscar?q=${encodeURIComponent(q)}`); cerrar() } }

  const onKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === 'Escape') { cerrar(); return }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)) }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setActive((a) => Math.max(a - 1, -1)) }
    else if (ev.key === 'Enter') {
      ev.preventDefault()
      if (active >= 0 && hits[active]) { router.push(hits[active].href); cerrar() }
      else irABuscar()
    }
  }

  const total = nEq + nClu + nJug

  return (
    <div ref={boxRef} className="relative flex items-center">
      <button
        type="button"
        aria-label="Buscar"
        onClick={() => setOpen((v) => !v)}
        className="p-2 -mr-1 text-chalk-400 hover:text-white transition-colors"
      >
        <Search className="w-5 h-5" strokeWidth={2.25} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[calc(100vw-2rem)] max-w-sm md:w-[26rem] rounded-xl border border-pitch-700 bg-pitch-800 shadow-2xl shadow-black/40 overflow-hidden">
          {/* Caja de texto */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-pitch-700">
            <Search className="w-4 h-4 text-chalk-600 flex-shrink-0" strokeWidth={2.25} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscar jugador, equipo o club…"
              className="flex-1 min-w-0 bg-transparent text-base text-white placeholder:text-chalk-600 focus:outline-none font-display"
              autoComplete="off"
              spellCheck={false}
            />
            {loading && <Loader2 className="w-4 h-4 text-chalk-600 animate-spin flex-shrink-0" />}
            <button type="button" aria-label="Cerrar" onClick={cerrar} className="p-0.5 text-chalk-600 hover:text-white flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Resultados */}
          {valida && (
            <div className="max-h-[70vh] overflow-y-auto">
              {total === 0 && !loading && (
                <p className="px-3 py-6 text-center text-sm text-chalk-600">Sin resultados para «{q}»</p>
              )}

              {eq.length > 0 && (
                <div>
                  <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-chalk-600">Equipos ({nEq})</p>
                  {eq.map((e, i) => (
                    <ResultadoEquipo key={e.codequipo} e={e} tokens={tokens} active={active === i} onNavigate={cerrar} />
                  ))}
                </div>
              )}

              {clu.length > 0 && (
                <div>
                  <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-chalk-600">Clubes ({nClu})</p>
                  {clu.map((c, i) => (
                    <ResultadoClub key={c.codclub} c={c} tokens={tokens} active={active === eq.length + i} onNavigate={cerrar} />
                  ))}
                </div>
              )}

              {jug.length > 0 && (
                <div>
                  <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-chalk-600">Jugadores ({nJug})</p>
                  {jug.map((j, i) => (
                    <ResultadoJugador key={j.codjugador} j={j} tokens={tokens} active={active === eq.length + clu.length + i} onNavigate={cerrar} suelo={suelo} />
                  ))}
                </div>
              )}

              {total > 0 && (
                <Link href={`/buscar?q=${encodeURIComponent(q)}`} onClick={cerrar}
                  className="block px-3 py-2.5 text-center text-xs font-medium text-grass-400 hover:text-grass-300 border-t border-pitch-700 transition-colors">
                  {total === 1 ? 'Ver el resultado' : `Ver los ${total} resultados`}
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
