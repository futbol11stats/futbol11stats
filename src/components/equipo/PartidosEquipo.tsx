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
//
// DEUDA (septiembre): web_resultados no trae codequipo_local/visitante. El juvenil y el aficionado de
// un club se llaman IGUAL, así que un filtro por nombre a lo ancho de la temporada pesca la OTRA rama.
// Parche web: acotamos la query a los codgrupos PROPIOS del equipo en la temporada (liga de
// web_equipo_temporadas + copas del JSONB), donde el nombre ya es unívoco. Cuando el pipeline añada
// codequipo_local/visitante a web_resultados, este filtro por nombre+codgrupo se puede retirar.
type TipoComp = 'liga' | 'copa' | 'playoff'
type Partido = {
  codacta: string; jornada: number; fecha: string | null
  esLocal: boolean; golesFav: number | null; golesCon: number | null
  golesLocal: number | null; golesVisitante: number | null
  rivalNombre: string; rivalEscudo: string | null; rivalCod: string | undefined
  compNombre: string | null; tipo: TipoComp
}

const tipoDeGrupo = (t: string | null | undefined): TipoComp =>
  t === 'PLAYOFF' ? 'playoff' : t && t !== 'LIGA' ? 'copa' : 'liga'

async function fetchPartidos(nombre: string, rama: string, codtemporada: string, grupos: string[]): Promise<Partido[]> {
  if (!grupos || grupos.length === 0) return []
  const cols = 'codgrupo, jornada, codacta, nombre_local, escudo_local, goles_local, goles_visitante, nombre_visitante, escudo_visitante, fecha'
  const [loc, vis] = await Promise.all([
    supabase.from('web_resultados').select(cols).eq('codtemporada', Number(codtemporada)).in('codgrupo', grupos).eq('nombre_local', nombre),
    supabase.from('web_resultados').select(cols).eq('codtemporada', Number(codtemporada)).in('codgrupo', grupos).eq('nombre_visitante', nombre),
  ])
  const uniq = new Map<string, any>()
  for (const r of [...((loc.data || []) as any[]), ...((vis.data || []) as any[])]) uniq.set(r.codacta, r)
  const list = Array.from(uniq.values())
  if (list.length === 0) return []
  const codgrupos = Array.from(new Set(list.map((r) => String(r.codgrupo))))
  const pares = list.map((r) => ({ codgrupo: String(r.codgrupo), rival: (r.nombre_local === nombre ? r.nombre_visitante : r.nombre_local) as string }))
  // Resolución rival -> codequipo. El nombre choca entre ramas (juvenil/aficionado homónimos), así que
  // NO se resuelve contra web_equipo global. (1) Clasificación del PROPIO grupo (codgrupo+nombre es
  // unívoco: un grupo de liga = una sola rama). (2) Copa/Playoff no tienen tabla -> se resuelve por
  // nombre + RAMA del equipo (copas y playoffs son intra-rama, así que el par nombre+rama es único).
  const [clasi, gr] = await Promise.all([
    supabase.from('web_clasificacion').select('codgrupo, nombre_equipo, codequipo').in('codgrupo', codgrupos),
    supabase.from('web_grupos').select('codgrupo, tipo, nombre_comp').in('codgrupo', codgrupos),
  ])
  const codPorGrupoNombre = new Map<string, string>()
  for (const x of (clasi.data || []) as any[]) {
    const k = `${x.codgrupo}|${x.nombre_equipo}`
    if (!codPorGrupoNombre.has(k)) codPorGrupoNombre.set(k, String(x.codequipo))
  }
  const faltan = Array.from(new Set(pares.filter((p) => !codPorGrupoNombre.has(`${p.codgrupo}|${p.rival}`)).map((p) => p.rival)))
  const codPorNombreRama = new Map<string, string>()
  if (faltan.length) {
    const { data: eqs } = await supabase.from('web_equipo').select('codequipo, nombre').in('nombre', faltan).eq('rama', rama)
    for (const x of (eqs || []) as any[]) if (!codPorNombreRama.has(x.nombre)) codPorNombreRama.set(x.nombre, String(x.codequipo))
  }
  const grMap = new Map<string, any>((gr.data || []).map((g: any) => [String(g.codgrupo), g]))
  return list
    .map((r): Partido => {
      const local = r.nombre_local === nombre
      const rival = local ? r.nombre_visitante : r.nombre_local
      const g = grMap.get(String(r.codgrupo))
      const rivalCod = codPorGrupoNombre.get(`${r.codgrupo}|${rival}`) ?? codPorNombreRama.get(rival)
      return {
        codacta: r.codacta, jornada: r.jornada, fecha: r.fecha, esLocal: local,
        golesFav: local ? r.goles_local : r.goles_visitante,   // para el COLOR (perspectiva del equipo)
        golesCon: local ? r.goles_visitante : r.goles_local,
        golesLocal: r.goles_local, golesVisitante: r.goles_visitante,   // para MOSTRAR (orden absoluto)
        rivalNombre: rival, rivalEscudo: local ? r.escudo_visitante : r.escudo_local, rivalCod,
        compNombre: g?.nombre_comp ?? null, tipo: tipoDeGrupo(g?.tipo),
      }
    })
    // Orden de CALENDARIO: por fecha (ISO, no el string DD/MM/YYYY), desempate por jornada.
    .sort((a, b) => fechaISO(a.fecha).localeCompare(fechaISO(b.fecha)) || a.jornada - b.jornada)
}

const signoCls = (fav: number | null, con: number | null) =>
  fav == null || con == null ? 'text-chalk-700' : fav > con ? 'text-grass-400' : fav < con ? 'text-red-400' : 'text-chalk-500'

// Prefijo del nº de jornada según el tipo: liga = J (jornada), copa = R (ronda), playoff = PO.
const PREFIJO: Record<TipoComp, string> = { liga: 'J', copa: 'R', playoff: 'PO' }

function Fila({ p }: { p: Partido }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm border-b border-pitch-700/50 last:border-0">
      <span className="w-8 flex-shrink-0 text-center text-[11px] text-chalk-600 tabular-nums">{PREFIJO[p.tipo]}{p.jornada}</span>
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

type Filtro = 'todas' | TipoComp

export default function PartidosEquipo({ nombre, rama, gruposPorTemporada }: { nombre: string; rama: string; gruposPorTemporada: Record<string, string[]> }) {
  const { sel } = useTemporada()
  const [cache, setCache] = useState<Record<string, { loading: boolean; partidos: Partido[] }>>({})
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const key = String(sel)

  useEffect(() => {
    if (cache[key]) return
    setCache((m) => ({ ...m, [key]: { loading: true, partidos: [] } }))
    fetchPartidos(nombre, rama, key, gruposPorTemporada[key] || []).then((partidos) => setCache((m) => ({ ...m, [key]: { loading: false, partidos } })))
  }, [key, nombre, rama, cache, gruposPorTemporada])

  const box = cache[key]
  // El Playoff NO es copa: pestaña propia (nunca se lo engulle [Copa]). Cada pestaña solo si hay.
  const hayCopa = !!box?.partidos.some((p) => p.tipo === 'copa')
  const hayPlayoff = !!box?.partidos.some((p) => p.tipo === 'playoff')
  const filtros: Filtro[] = ['todas', 'liga', ...(hayCopa ? ['copa'] as const : []), ...(hayPlayoff ? ['playoff'] as const : [])]
  const filtrados = (box?.partidos || []).filter((p) => filtro === 'todas' || p.tipo === filtro)

  return (
    <section>
      <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
        <Swords className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Partidos
        <span className="text-chalk-600 font-normal normal-case tracking-normal">· {tempLabel(sel)}</span>
      </h2>

      {/* Filtros Todas / Liga / Copa / Playoff (Copa y Playoff solo si hay) */}
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
