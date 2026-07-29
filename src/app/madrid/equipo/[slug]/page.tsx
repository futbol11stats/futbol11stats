export const revalidate = 2592000   // ISR 30d (Fluid CPU): ~1.9k fichas de contenido congelado.
export const dynamicParams = true   // no se pre-renderizan en build; on-demand + cacheadas.

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import { supabase, escudoUrl, formatNombre } from '@/lib/supabase'
import { SITE_URL } from '@/lib/seo'
import { jugadorHref } from '@/lib/jugador'
import JsonLd from '@/components/JsonLd'
import { graphLd, breadcrumbLd, sportsTeamLd } from '@/lib/jsonld'
import EscudoImg from '@/components/EscudoImg'
import { Suspense } from 'react'
import NombreEquipo from '@/components/NombreEquipo'
import Sello from '@/components/Sello'
import MedidoresEquipo from '@/components/equipo/MedidoresEquipo'
import { type PlantillaRow } from '@/components/equipo/Plantilla'
import EquipoTemporadas from '@/components/equipo/EquipoTemporadas'
import { TemporadaProvider } from '@/components/equipo/TemporadaContext'
import Top5Plantilla from '@/components/equipo/Top5Plantilla'
import CopasLinea from '@/components/CopasLinea'
import LigaPastilla from '@/components/LigaPastilla'
import FormaHero from '@/components/equipo/FormaHero'
import PartidosEquipo from '@/components/equipo/PartidosEquipo'
import {
  COLS_EQUIPO, COLS_EQUIPO_TEMPORADAS, COLS_EQUIPO_MOV, COLS_EQUIPO_HITOS, COLS_PLANTILLA_JUVENIL,
  codFromSlug, equipoSlug, tempLabel, fechaCortaDMY, LIVE_COD, RAMA_SLUG, BADGE, HITO_EQUIPO,
  getCopasEquipo, getResultadosGrupo, resumenForma, getGruposPorTemporada,
  type EquipoFicha, type MovimientoRow, type FichaMov,
} from '@/lib/equipo'
import { Trophy, Flame, Swords, CalendarCheck, ListOrdered, ChevronRight, ArrowUpRight } from 'lucide-react'

// --- Fetchers ---
async function getEquipo(cod: string): Promise<EquipoFicha | null> {
  const { data } = await supabase.from('web_equipo').select(COLS_EQUIPO).eq('codequipo', cod).limit(1).maybeSingle()
  return (data as unknown as EquipoFicha) || null
}
async function getTemporadas(cod: string) {
  const { data } = await supabase.from('web_equipo_temporadas').select(COLS_EQUIPO_TEMPORADAS).eq('codequipo', cod)
  return ((data || []) as any[]).sort((a, b) => String(b.codtemporada).localeCompare(String(a.codtemporada)))
}
async function getMovimientos(cod: string): Promise<MovimientoRow[]> {
  const { data } = await supabase.from('web_equipo_movimientos').select(COLS_EQUIPO_MOV).eq('codequipo', cod)
  // Recientes primero (fecha YYYYMMDD; fallback por temporada).
  return ((data || []) as any[]).sort((a, b) =>
    String(b.fecha || b.codtemporada || '').localeCompare(String(a.fecha || a.codtemporada || '')))
}
async function getHitos(cod: string) {
  const { data } = await supabase.from('web_equipo_hitos').select(COLS_EQUIPO_HITOS).eq('codequipo', cod)
  return (data || []) as any[]
}
async function getGrupoSlug(codgrupo: string) {
  const { data } = await supabase.from('web_grupos')
    .select('slug_comp, slug_grupo, jornada_actual, categoria, total_jornadas')
    .eq('codgrupo', codgrupo).limit(1).maybeSingle()
  return data as any
}
async function getMiniClasif(codgrupo: string, jornada: number) {
  const { data } = await supabase.from('web_clasificacion')
    .select('pos, codequipo, nombre_equipo, escudo, pj, pts')
    .eq('codgrupo', codgrupo).eq('jornada', jornada).order('pos')
  return (data || []) as any[]
}
// Plantilla aficionados de TODAS las temporadas del equipo: stats por (jugador, temporada) de
// web_jugador_carrera + nombre/dorsal/pos (y existencia de ficha) de web_jugador. Cada fila lleva su
// codtemporada; las pastillas filtran client-side. Todos los codjugador de carrera están en web_jugador.
async function getPlantillaAfic(cod: string): Promise<PlantillaRow[]> {
  const { data: car } = await supabase.from('web_jugador_carrera')
    .select('codjugador, codtemporada, pj, goles, minutos, tarjetas_amarillas, tarjetas_rojas, pts_fantasy, elo_final')
    .eq('codequipo', cod)
  const rows = (car || []) as any[]
  const ids = Array.from(new Set(rows.map((r) => String(r.codjugador))))
  if (ids.length === 0) return []
  const { data: jug } = await supabase.from('web_jugador')
    .select('codjugador, nombre, dorsal_comun, posicion_pastilla, posicion_es_estimada').in('codjugador', ids)
  const info = new Map<string, any>((jug || []).map((j: any) => [String(j.codjugador), j]))
  return rows
    .map((r) => {
      const j = info.get(String(r.codjugador))
      if (!j) return null   // sin ficha (no debería ocurrir): no se enlaza a un 404
      return {
        key: `${r.codjugador}-${r.codtemporada}`,
        codtemporada: String(r.codtemporada),
        codjugador: String(r.codjugador),
        dorsal: j.dorsal_comun ?? null,
        pos: j.posicion_pastilla ?? null,
        estimada: !!j.posicion_es_estimada,
        nombre: formatNombre(j.nombre),
        href: jugadorHref(r.codjugador, j.nombre),
        pj: r.pj, goles: r.goles, minutos: r.minutos, ta: r.tarjetas_amarillas, tr: r.tarjetas_rojas,
        pts: r.pts_fantasy, elo: r.elo_final,
      } as PlantillaRow
    })
    .filter(Boolean)
    .sort((a: any, b: any) => (b.minutos || 0) - (a.minutos || 0)) as PlantillaRow[]
}
async function getPlantillaJuv(cod: string): Promise<PlantillaRow[]> {
  const { data } = await supabase.from('web_equipo_plantilla_juvenil')
    .select(COLS_PLANTILLA_JUVENIL).eq('codequipo', cod)
  const rows = (data || []) as any[]
  // Enlace por EXISTENCIA (misma regla batch que aficionados/movimientos): la protección es por quién
  // es HOY el jugador (mayoría de edad garantizada = tiene ficha), no por qué ficha se está mirando.
  // Un jugador que en 2021-22 estaba en una plantilla juvenil pero hoy es mayor SÍ enlaza.
  const ids = Array.from(new Set(rows.map((r) => String(r.codjugador)).filter(Boolean)))
  const { data: jug } = ids.length
    ? await supabase.from('web_jugador').select('codjugador, nombre').in('codjugador', ids)
    : { data: [] as any[] }
  const canon = new Map<string, string>((jug || []).map((j: any) => [String(j.codjugador), j.nombre]))
  return rows
    .map((r) => {
      const c = canon.get(String(r.codjugador))
      return {
        key: `${r.codjugador}-${r.codtemporada}`,
        codtemporada: String(r.codtemporada),
        dorsal: r.dorsal_comun ?? null,
        pos: r.posicion_pastilla ?? null,
        nombre: formatNombre(r.nombre),
        href: c ? jugadorHref(r.codjugador, c) : null,   // con ficha -> enlace; menores -> texto plano
        pj: r.pj, goles: r.goles, minutos: r.minutos, ta: r.ta, tr: r.tr,
      } as PlantillaRow
    })
    .sort((a, b) => (b.minutos || 0) - (a.minutos || 0))
}
// Fichas de los jugadores de los movimientos (enlazar/formatear/pastilla). Adultos: de web_jugador
// (enlazable, nombre canónico, estimada). En juveniles, los menores no están en web_jugador pero su
// posición sí en web_equipo_plantilla_juvenil (batch por codequipo) -> pastilla sí, enlace no.
async function getFichasMovimientos(movs: MovimientoRow[], codequipo: string, esJuvenil: boolean): Promise<Record<string, FichaMov>> {
  const ids = Array.from(new Set(movs.map((m) => m.codjugador).filter(Boolean).map(String)))
  if (ids.length === 0) return {}
  const out: Record<string, FichaMov> = {}
  const { data } = await supabase.from('web_jugador')
    .select('codjugador, nombre, posicion_pastilla, posicion_es_estimada').in('codjugador', ids)
  for (const j of (data || []) as any[]) out[String(j.codjugador)] = { nombre: j.nombre, pos: j.posicion_pastilla ?? null, estimada: !!j.posicion_es_estimada, enlazable: true }
  if (esJuvenil) {
    // Posición de los menores desde la plantilla juvenil de ESTE equipo (todas sus temporadas).
    const { data: juv } = await supabase.from('web_equipo_plantilla_juvenil')
      .select('codjugador, posicion_pastilla').eq('codequipo', codequipo).in('codjugador', ids)
    for (const j of (juv || []) as any[]) {
      const cod = String(j.codjugador)
      if (out[cod] || !j.posicion_pastilla) continue   // adultos (web_jugador) tienen prioridad
      out[cod] = { nombre: null, pos: j.posicion_pastilla, estimada: false, enlazable: false }
    }
  }
  return out
}
// Slugs de grupo por temporada (para enlazar cada fila del bloque Temporadas a su vista de grupo).
async function getGruposTemporadas(codgrupos: (string | null)[]): Promise<Map<string, any>> {
  const ids = Array.from(new Set(codgrupos.filter(Boolean).map(String)))
  const m = new Map<string, any>()
  if (ids.length === 0) return m
  const { data } = await supabase.from('web_grupos')
    .select('codgrupo, slug_comp, slug_grupo, jornada_actual').in('codgrupo', ids)
  for (const g of (data || []) as any[]) m.set(String(g.codgrupo), g)
  return m
}

const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('es-ES')

// ---- Metadata ----
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const cod = codFromSlug(slug)
  if (!cod) return { title: 'Fútbol11Stats' }
  const e = await getEquipo(cod)
  if (!e) return { title: 'Equipo no encontrado | Fútbol11Stats' }
  const canonical = `/madrid/equipo/${equipoSlug(e.codequipo, e.nombre)}`
  const title = `${e.nombre} — plantilla, resultados y trayectoria | Fútbol11Stats`
  const comp = e.nombre_comp ? `${e.nombre_comp}${e.grupo_nombre ? ` ${e.grupo_nombre}` : ''}` : ''
  const description = `${e.nombre}: plantilla, clasificación, altas y bajas, trayectoria por temporadas e hitos` +
    `${comp ? ` en ${comp}` : ''}. Estadísticas del fútbol amateur de Madrid en Fútbol11Stats.`
  return {
    title, description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'website' },
  }
}

// ---- Sub-componentes ----
const ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Trophy, Flame, Swords, CalendarCheck,
}

function Chip({ children, href, tone = 'grass' }: { children: React.ReactNode; href?: string | null; tone?: 'grass' | 'muted' | 'plain' }) {
  const cls = tone === 'muted'
    ? 'bg-pitch-800 text-chalk-600 ring-1 ring-inset ring-pitch-700'
    : tone === 'plain'
      ? 'bg-pitch-700 text-chalk-300'
      : 'bg-grass-500/15 text-grass-300 ring-1 ring-inset ring-grass-400/25'
  const inner = <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${cls}`}>{children}</span>
  return href ? <Link href={href} className="hover:brightness-125 transition">{inner}</Link> : inner
}

// ---- Página ----
export default async function FichaEquipo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cod = codFromSlug(slug)
  if (!cod) notFound()

  // Wave 1: todo lo keyed por codequipo, en paralelo.
  const [e, temporadas, movimientos, hitos] = await Promise.all([
    getEquipo(cod), getTemporadas(cod), getMovimientos(cod), getHitos(cod),
  ])
  if (!e) notFound()

  const canonicalSlug = equipoSlug(e.codequipo, e.nombre)
  if (slug !== canonicalSlug) permanentRedirect(`/madrid/equipo/${canonicalSlug}`)

  const inactivo = !e.activo
  const esJuvenil = e.rama === 'juvenil'
  const ramaSlug = RAMA_SLUG[e.rama || 'aficionados'] || 'aficionados'

  // Wave 2: depende de la fila base (grupo, plantilla, fichas de movimientos, slugs de temporadas) — en paralelo.
  const [grupo, plantilla, fichasMov, gruposTemp, resultadosGrupo, gruposPorTemporada] = await Promise.all([
    e.codgrupo ? getGrupoSlug(e.codgrupo) : Promise.resolve(null),
    esJuvenil ? getPlantillaJuv(cod) : getPlantillaAfic(cod),
    getFichasMovimientos(movimientos, cod, esJuvenil),
    getGruposTemporadas(temporadas.map((t: any) => t.codgrupo)),
    getResultadosGrupo(e.nombre, e.codgrupo),
    getGruposPorTemporada(cod, temporadas),
  ])
  // Forma (últimos 5 de liga del grupo actual) + racha. Días solo si la temporada es la viva.
  const { forma, ultimaVictoria } = resumenForma(resultadosGrupo, e.nombre)
  const tempEnCurso = String(e.codtemporada) === LIVE_COD
  const jornadaGrupo = grupo?.jornada_actual || 1
  const miniClasif = e.codgrupo ? await getMiniClasif(e.codgrupo, jornadaGrupo) : []

  // URL de la vista de grupo (para chips y "ver grupo completo").
  const grupoUrl = grupo
    ? `/madrid/${ramaSlug}/${grupo.slug_comp}/${grupo.slug_grupo}/${tempLabel(e.codtemporada)}/jornada-${jornadaGrupo}/clasificacion`
    : null

  // Copas de la temporada en curso (línea bajo la pastilla de liga). Gated por COPAS_HABILITADO.
  const copasEquipo = await getCopasEquipo(e.codequipo)

  // Mini-clasificación centrada en el equipo (±2 filas).
  const idx = miniClasif.findIndex((r) => String(r.codequipo) === String(e.codequipo))
  const ventana = idx >= 0
    ? miniClasif.slice(Math.max(0, idx - 2), idx + 3)
    : miniClasif.slice(0, 5)

  // Movimientos: fichajes vs promociones internas (categorías separadas).
  const fichajes = movimientos.filter((m) => m.clase === 'FICHAJE')
  const promociones = movimientos.filter((m) => m.clase === 'PROMOCION_INTERNA')

  // Temporadas para las pastillas (dedup por codtemporada; ya vienen descendentes).
  const temporadaCods = Array.from(new Set(temporadas.map((t: any) => String(t.codtemporada))))

  // URL de la vista de grupo de una fila de temporada (slug histórico propio de esa temporada);
  // si el codgrupo no resuelve slug, se deja texto plano (sin romper).
  const grupoTempUrl = (t: any): string | null => {
    const g = gruposTemp.get(String(t.codgrupo))
    if (!g) return null
    const rs = RAMA_SLUG[t.rama] || ramaSlug
    return `/madrid/${rs}/${g.slug_comp}/${g.slug_grupo}/${tempLabel(t.codtemporada)}/jornada-${g.jornada_actual || 1}/clasificacion`
  }

  // Hitos: colapso la serie de partidos_acumulados a su máximo; el resto se muestran.
  const maxPartidos = Math.max(0, ...hitos.filter((h) => h.tipo_hito === 'partidos_acumulados').map((h) => h.valor || 0))
  const hitosVis = hitos.filter((h) => h.tipo_hito !== 'partidos_acumulados' || h.valor === maxPartidos)
  const ordenHito: Record<string, number> = { mejor_temporada: 0, mejor_racha: 1, mayor_goleada: 2, partidos_acumulados: 3 }
  hitosVis.sort((a, b) => (ordenHito[a.tipo_hito] ?? 9) - (ordenHito[b.tipo_hito] ?? 9))

  const notaJuvenil = 'La edad no se muestra en categorías juveniles; los enlaces llevan solo a fichas de jugadores con mayoría de edad garantizada.'

  // Breadcrumb + SportsTeam JSON-LD.
  const ramaLabel = esJuvenil ? 'Juveniles' : 'Aficionados'
  const crumbs = [
    { name: 'Inicio', url: `${SITE_URL}/` },
    { name: ramaLabel, url: `${SITE_URL}/madrid/${ramaSlug}` },
    { name: e.nombre, url: `${SITE_URL}/madrid/equipo/${canonicalSlug}` },
  ]
  const teamLd = sportsTeamLd({
    name: e.nombre,
    url: `${SITE_URL}/madrid/equipo/${canonicalSlug}`,
    competicion: e.nombre_comp,
    logo: escudoUrl(e.escudo) || undefined,
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      <JsonLd data={graphLd(breadcrumbLd(crumbs), teamLd)} />

      {/* Breadcrumb */}
      <nav className="text-sm text-chalk-600 mb-4 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
        <span>·</span>
        <Link href={`/madrid/${ramaSlug}`} className="hover:text-white transition-colors">{ramaLabel}</Link>
        <span>·</span>
        <span className="text-white truncate">{e.nombre}</span>
      </nav>

      {/* HERO + MEDIDORES */}
      <section className="lg:flex lg:items-start lg:justify-between lg:gap-8 mb-6 md:mb-8">
        <div className="flex items-start gap-4 min-w-0">
          <span className={`flex-shrink-0 inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl p-1.5 ${inactivo ? 'opacity-70' : ''}`}>
            {escudoUrl(e.escudo)
              ? <EscudoImg escudo={e.escudo} nombre={e.nombre} className="w-full h-full object-contain" />
              : <span className="font-display text-3xl font-bold text-pitch-800">{e.nombre.slice(0, 2).toUpperCase()}</span>}
          </span>
          <div className="min-w-0 pt-0.5">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white leading-tight">{e.nombre}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {inactivo ? (
                <Chip href={grupoUrl} tone="muted">
                  <Sello nombreComp={e.nombre_comp} size={22} />
                  Último grupo · {e.grupo_nombre || e.nombre_comp}{e.codtemporada ? ` (${tempLabel(e.codtemporada)})` : ''}
                </Chip>
              ) : (
                /* Pastilla de LIGA (componente compartido con la ficha de jugador). */
                <LigaPastilla nombreComp={e.nombre_comp}
                  segments={[e.nombre_comp, e.grupo_nombre, e.posicion_actual != null ? `${e.posicion_actual}º` : null]}
                  href={grupoUrl} />
              )}
            </div>
            {/* Copas de la temporada en curso (enlazadas). Sin copas -> no renderiza. */}
            <CopasLinea copas={copasEquipo} className="mt-2" />
            {/* Forma (últimos 5) + racha. Inactivos: etiquetados con su última temporada, sin días. */}
            <FormaHero forma={forma} ultimaVictoria={ultimaVictoria} mostrarDias={tempEnCurso}
              tempEtiqueta={inactivo && e.codtemporada ? tempLabel(e.codtemporada) : null} />
          </div>
        </div>

        <div className="mt-5 lg:mt-0 lg:w-[380px] lg:flex-shrink-0">
          <MedidoresEquipo
            elo={e.elo_actual} eloMax={e.elo_max} tempMax={e.temporada_elo_max} serie={e.elo_serie || []}
            juegoLimpio={e.posicion_juego_limpio} ta={e.ta_total} tr={e.tr_total}
          />
        </div>
      </section>

      {/* CUERPO. TemporadaProvider comparte la temporada seleccionada entre las pastillas (main) y el
          Top 5 (aside); lee ?temporada en cliente -> Suspense para que la página siga siendo ISR. */}
      <Suspense fallback={<div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8" />}>
      <TemporadaProvider temporadas={temporadaCods}>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 lg:items-start">

        {/* ASIDE: mini-clasificación + temporadas */}
        <aside className="space-y-6 mb-8 lg:mb-0 lg:col-start-2 lg:row-start-1">
          {/* Mini-clasificación */}
          {ventana.length > 0 && (
            <div>
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
                <ListOrdered className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Clasificación
              </h2>
              <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
                {ventana.map((r) => {
                  const yo = String(r.codequipo) === String(e.codequipo)
                  return (
                    <div key={r.codequipo} className={`flex items-center gap-2 px-3 py-1.5 border-b border-pitch-700/50 last:border-0 ${yo ? 'bg-grass-500/10' : ''}`}>
                      <span className="w-5 text-center text-xs font-mono text-chalk-600 tabular-nums">{r.pos}</span>
                      {escudoUrl(r.escudo) && (
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-white rounded-sm flex-shrink-0 p-px">
                          <EscudoImg escudo={r.escudo} nombre={r.nombre_equipo} />
                        </span>
                      )}
                      <span className={`flex-1 min-w-0 truncate text-xs ${yo ? 'text-white font-semibold' : 'text-chalk-300'}`}>
                        {yo ? r.nombre_equipo : <NombreEquipo codequipo={r.codequipo} nombre={r.nombre_equipo} />}
                      </span>
                      <span className={`text-xs font-bold tabular-nums ${yo ? 'text-grass-300' : 'text-chalk-500'}`}>{r.pts}</span>
                    </div>
                  )
                })}
              </div>
              {grupoUrl && (
                <Link href={grupoUrl} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-grass-400 hover:text-grass-300 transition-colors">
                  Ver grupo completo <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          )}

          {/* Temporadas */}
          {temporadas.length > 0 && (
            <div>
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
                <CalendarCheck className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Temporadas
              </h2>
              <div className="bg-pitch-800 rounded-xl border border-pitch-700">
                {temporadas.map((t: any) => (
                  <div key={`${t.codtemporada}-${t.codgrupo}`} className="flex items-center gap-2 px-3 py-2 border-b border-pitch-700/50 last:border-0">
                    <span className="font-display text-sm font-bold text-chalk-300 tabular-nums w-14 flex-shrink-0">{tempLabel(t.codtemporada)}</span>
                    <div className="min-w-0 flex-1">
                      {(() => {
                        const compGrupo = `${t.nombre_comp}${t.grupo_nombre ? ` · ${t.grupo_nombre}` : ''}`
                        const url = grupoTempUrl(t)
                        const inner = <><Sello nombreComp={t.nombre_comp} size={20} /><span className="truncate">{compGrupo}</span></>
                        return url
                          ? <Link href={url} className="flex items-center gap-1.5 text-xs text-chalk-400 hover:text-grass-300 transition-colors">{inner}</Link>
                          : <div className="flex items-center gap-1.5 text-xs text-chalk-400">{inner}</div>
                      })()}
                      <div className="text-[11px] text-chalk-600 tabular-nums">{t.posicion_final}º · {t.pts} pts</div>
                    </div>
                    {t.badge && BADGE[t.badge] && (
                      <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${BADGE[t.badge].cls}`}>{BADGE[t.badge].label}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top 5 de la plantilla (aficionados): reactivo al selector de temporada vía contexto. */}
          {!esJuvenil && <Top5Plantilla plantilla={plantilla} />}
        </aside>

        {/* MAIN: pastillas de temporada -> plantilla + altas/bajas (client) + hitos */}
        <main className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-1">
          <EquipoTemporadas
            plantilla={plantilla}
            fichajes={fichajes}
            promociones={promociones}
            fichas={fichasMov}
            nota={esJuvenil ? notaJuvenil : undefined}
            completa={!esJuvenil}
          />

          {/* Partidos de la temporada seleccionada (reactivo al mismo selector; fetch perezoso client-side). */}
          <PartidosEquipo nombre={e.nombre} rama={e.rama || 'aficionados'} gruposPorTemporada={gruposPorTemporada} />

          {/* Hitos (no se filtran por temporada: son del registro de 5 temporadas) */}
          {hitosVis.length > 0 && (
            <section>
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-3">
                <Trophy className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Hitos del club
                <span className="text-chalk-600 font-normal normal-case tracking-normal">· Registro F11S desde 2021-22</span>
              </h2>
              <ol className="space-y-2">
                {hitosVis.map((h: any, i: number) => {
                  const cfg = HITO_EQUIPO[h.tipo_hito]
                  const Icon = (cfg && ICONS[cfg.icon]) || Trophy
                  const label = cfg ? cfg.label(h) : h.tipo_hito
                  return (
                    <li key={i} className="flex items-center gap-3 bg-pitch-800 rounded-xl border border-pitch-700 px-3 py-2.5">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-inset text-grass-300 bg-grass-500/15 ring-grass-400/25">
                        <Icon className="w-4 h-4" strokeWidth={2.25} />
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-white">{label}</span>
                      <span className="flex-shrink-0 text-[11px] text-chalk-600 tabular-nums">
                        {h.fecha ? fechaCortaDMY(h.fecha) : (h.codtemporada ? tempLabel(h.codtemporada) : '')}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </section>
          )}
        </main>
      </div>
      </TemporadaProvider>
      </Suspense>

      {/* Enlace discreto al canal de datos */}
      <div className="mt-12 pt-4 border-t border-pitch-700/60 flex items-center gap-1.5">
        <Link href="/datos-y-derechos" className="inline-flex items-center gap-1 text-xs text-chalk-600 hover:text-chalk-400 transition-colors">
          <ArrowUpRight className="w-3 h-3" /> Sobre estos datos
        </Link>
      </div>
    </div>
  )
}
