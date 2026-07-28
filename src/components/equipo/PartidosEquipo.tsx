'use client'

import { useEffect, useState } from 'react'
import { Swords, Loader2 } from 'lucide-react'
import { supabase, escudoUrl } from '@/lib/supabase'
import EscudoImg from '@/components/EscudoImg'
import NombreEquipo from '@/components/NombreEquipo'
import Sello from '@/components/Sello'
import IndicadorLocal from '@/components/IndicadorLocal'
import { useTemporada } from './TemporadaContext'
import { tempLabel, fechaCortaDMY } from '@/lib/equipo'
import { fechaISO } from '@/lib/jugador'

// Bloque PARTIDOS de la ficha de equipo: reactivo a la temporada seleccionada (TemporadaContext), con
// fetch perezoso + caché por temporada. Fuente: web_resultados (no trae codequipo -> se filtra por
// NOMBRE y se resuelven los codequipos del rival aparte). Perspectiva del equipo; liga + copas.
type Partido = {
  codacta: string; jornada: number; fecha: string | null
  esLocal: boolean; golesFav: number | null; golesCon: number | null
  golesLocal: number | null; golesVisitante: number | null
  rivalNombre: string; rivalEscudo: string | null; rivalCod: string | undefined
  compNombre: string | null; esCopa: boolean
}

async function fetchPartidos(nombre: string, codtemporada: string): Promise<Partido[]> {
  const cols = 'codgrupo, jornada, codacta, nombre_local, escudo_local, goles_local, goles_visitante, nombre_visitante, escudo_visitante, fecha'
  const [loc, vis] = await Promise.all([
    supabase.from('web_resultados').select(cols).eq('codtemporada', Number(codtemporada)).eq('nombre_local', nombre),
    supabase.from('web_resultados').select(cols).eq('codtemporada', Number(codtemporada)).eq('nombre_visitante', nombre),
  ])
  const uniq = new Map<string, any>()
  for (const r of [...((loc.data || []) as any[]), ...((vis.data || []) as any[])]) uniq.set(r.codacta, r)
  const list = Array.from(uniq.values())
  if (list.length === 0) return []
  const rivalNames = Array.from(new Set(list.map((r) => (r.nombre_local === nombre ? r.nombre_visitante : r.nombre_local))))
  const codgrupos = Array.from(new Set(list.map((r) => String(r.codgrupo))))
  const [eq, gr] = await Promise.all([
    supabase.from('web_equipo').select('codequipo, nombre').in('nombre', rivalNames),
    supabase.from('web_grupos').select('codgrupo, tipo, nombre_comp').in('codgrupo', codgrupos),
  ])
  const codMap = new Map<string, string>()
  for (const x of (eq.data || []) as any[]) if (!codMap.has(x.nombre)) codMap.set(x.nombre, String(x.codequipo))
  const grMap = new Map<string, any>((gr.data || []).map((g: any) => [String(g.codgrupo), g]))
  return list
    .map((r): Partido => {
      const local = r.nombre_local === nombre
      const rival = local ? r.nombre_visitante : r.nombre_local
      const g = grMap.get(String(r.codgrupo))
      return {
        codacta: r.codacta, jornada: r.jornada, fecha: r.fecha, esLocal: local,
        golesFav: local ? r.goles_local : r.goles_visitante,   // para el COLOR (perspectiva del equipo)
        golesCon: local ? r.goles_visitante : r.goles_local,
        golesLocal: r.goles_local, golesVisitante: r.goles_visitante,   // para MOSTRAR (orden absoluto)
        rivalNombre: rival, rivalEscudo: local ? r.escudo_visitante : r.escudo_local, rivalCod: codMap.get(rival),
        compNombre: g?.nombre_comp ?? null, esCopa: !!(g && g.tipo && g.tipo !== 'LIGA'),
      }
    })
    // Orden de CALENDARIO: por fecha (ISO, no el string DD/MM/YYYY), desempate por jornada.
    .sort((a, b) => fechaISO(a.fecha).localeCompare(fechaISO(b.fecha)) || a.jornada - b.jornada)
}

const signoCls = (fav: number | null, con: number | null) =>
  fav == null || con == null ? 'text-chalk-700' : fav > con ? 'text-grass-400' : fav < con ? 'text-red-400' : 'text-chalk-500'

function Fila({ p }: { p: Partido }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm border-b border-pitch-700/50 last:border-0">
      <span className="w-8 flex-shrink-0 text-center text-[11px] text-chalk-600 tabular-nums">{p.esCopa ? 'R' : 'J'}{p.jornada}</span>
      <span className="hidden md:block w-20 flex-shrink-0 text-[11px] text-chalk-600 tabular-nums">{fechaCortaDMY(p.fecha)}</span>
      <span className="w-4 flex-shrink-0 flex justify-center"><IndicadorLocal esLocal={p.esLocal} /></span>
      {escudoUrl(p.rivalEscudo)
        ? <span className="inline-flex items-center justify-center w-5 h-5 bg-white rounded-sm flex-shrink-0 p-px"><EscudoImg escudo={p.rivalEscudo} nombre={p.rivalNombre} /></span>
        : <span className="w-5 h-5 flex-shrink-0" />}
      <span className="flex-1 min-w-0 truncate font-display uppercase text-white"><NombreEquipo codequipo={p.rivalCod} nombre={p.rivalNombre} /></span>
      {p.compNombre && <span className="hidden md:inline-flex flex-shrink-0"><Sello nombreComp={p.compNombre} size={18} /></span>}
      {/* Marcador en orden ABSOLUTO local-visitante; color por la perspectiva del equipo (fav/con). */}
      {p.golesFav != null
        ? <span className={`w-10 flex-shrink-0 text-right font-display font-bold tabular-nums ${signoCls(p.golesFav, p.golesCon)}`}>{p.golesLocal}-{p.golesVisitante}</span>
        : <span className="w-10 flex-shrink-0 text-right text-chalk-700 text-xs">—</span>}
    </div>
  )
}

export default function PartidosEquipo({ nombre }: { nombre: string }) {
  const { sel } = useTemporada()
  const [cache, setCache] = useState<Record<string, { loading: boolean; partidos: Partido[] }>>({})
  const [filtro, setFiltro] = useState<'todas' | 'liga' | 'copa'>('todas')
  const key = String(sel)

  useEffect(() => {
    if (cache[key]) return
    setCache((m) => ({ ...m, [key]: { loading: true, partidos: [] } }))
    fetchPartidos(nombre, key).then((partidos) => setCache((m) => ({ ...m, [key]: { loading: false, partidos } })))
  }, [key, nombre, cache])

  const box = cache[key]
  const hayCopa = !!box?.partidos.some((p) => p.esCopa)
  const filtros: ('todas' | 'liga' | 'copa')[] = hayCopa ? ['todas', 'liga', 'copa'] : ['todas', 'liga']
  const filtrados = (box?.partidos || []).filter((p) => filtro === 'todas' || (filtro === 'copa' ? p.esCopa : !p.esCopa))

  return (
    <section>
      <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
        <Swords className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Partidos
        <span className="text-chalk-600 font-normal normal-case tracking-normal">· {tempLabel(sel)}</span>
      </h2>

      {/* Filtros Todas / Liga / Copa (Copa solo si hay) */}
      <div className="flex items-center gap-1.5 mb-2">
        {filtros.map((f) => (
          <button key={f} type="button" onClick={() => setFiltro(f)}
            className={`text-xs px-2.5 py-1 rounded-md capitalize transition-colors ${filtro === f ? 'bg-grass-500 text-white font-semibold' : 'bg-pitch-700 text-chalk-600 hover:text-white'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-pitch-800 rounded-xl border border-pitch-700">
        {box?.loading && (
          <p className="flex items-center gap-2 px-3 py-3 text-xs text-chalk-600"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando partidos…</p>
        )}
        {box && !box.loading && filtrados.length === 0 && (
          <p className="px-3 py-3 text-xs text-chalk-600">Sin partidos en {tempLabel(sel)}.</p>
        )}
        {box && !box.loading && filtrados.map((p) => <Fila key={p.codacta} p={p} />)}
      </div>
    </section>
  )
}
