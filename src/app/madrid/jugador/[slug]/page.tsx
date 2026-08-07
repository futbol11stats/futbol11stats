export const revalidate = 2592000   // ISR 30d (Fluid CPU): 25k fichas de contenido congelado; cada deploy/re-export invalida la caché.
export const dynamicParams = true   // 25k páginas NO se pre-renderizan en build; se generan on-demand y quedan cacheadas (SIN generateStaticParams).

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import { supabase, escudoUrl } from '@/lib/supabase'
import { SITE_URL } from '@/lib/seo'
import JsonLd from '@/components/JsonLd'
import { graphLd, breadcrumbLd } from '@/lib/jsonld'
import EscudoImg from '@/components/EscudoImg'
import NombreEquipo from '@/components/NombreEquipo'
import Sello from '@/components/Sello'
import Medidores from '@/components/ficha/Medidores'
import Hitos from '@/components/ficha/Hitos'
import Trayectoria from '@/components/ficha/Trayectoria'
import {
  COLS_JUGADOR, COLS_CARRERA, COLS_HITOS, COLS_ACTUACIONES,
  codFromSlug, jugadorSlug, jugadorHref, formatNombre, tempLabel, fechaCorta, curarHitos, signoCls, conSigno,
  marcadorLocalVisitante, colorSigno, golesRival, LIVE_COD, POS_LABEL,
  type JugadorFicha, type HitoRow, type CompaneroTop,
} from '@/lib/jugador'
import { getEquipoActualInfo, getGrupoInfo, grupoHref, type ChipRacha } from '@/lib/equipo'
import CopasLinea from '@/components/CopasLinea'
import Pastilla from '@/components/Pastilla'
import LigaPastilla from '@/components/LigaPastilla'
import IndicadorLocal from '@/components/IndicadorLocal'
import FormaHero from '@/components/equipo/FormaHero'
import AvisoDato from '@/components/AvisoDato'
import {
  Trophy, MapPin, Star, Hash, Users, ListChecks, Hand,
  Goal, Timer, Calendar, CircleDot,
} from 'lucide-react'

// --- Fetchers (columnas explícitas) ---
async function getJugador(cod: string): Promise<JugadorFicha | null> {
  const { data } = await supabase.from('web_jugador').select(COLS_JUGADOR).eq('codjugador', cod).limit(1).maybeSingle()
  return (data as unknown as JugadorFicha) || null
}
async function getCarrera(cod: string) {
  const { data } = await supabase.from('web_jugador_carrera').select(COLS_CARRERA).eq('codjugador', cod)
  // Orden: temporada DESC, y dentro de la temporada por orden_temporada ASC (lo decide el pipeline:
  // equipo instalado primero, resto por última aparición). Sin criterio propio de desempate.
  return ((data || []) as any[]).sort((a, b) =>
    String(b.codtemporada).localeCompare(String(a.codtemporada)) || (a.orden_temporada ?? 0) - (b.orden_temporada ?? 0))
}
async function getHitos(cod: string): Promise<HitoRow[]> {
  const { data } = await supabase.from('web_jugador_hitos').select(COLS_HITOS).eq('codjugador', cod)
  return (data || []) as unknown as HitoRow[]
}
async function getActuaciones(cod: string) {
  // es_local (local/visitante) llega con el próximo export; se intenta y, si la columna aún no existe,
  // se reintenta sin ella (el icono casa/avión brota solo cuando el dato aterrice).
  let r = await supabase.from('web_jugador_actuaciones').select(COLS_ACTUACIONES + ', es_local').eq('codjugador', cod).order('rank')
  if (r.error) r = await supabase.from('web_jugador_actuaciones').select(COLS_ACTUACIONES).eq('codjugador', cod).order('rank')
  return (r.data || []) as any[]
}
// Los 3 ÚLTIMOS partidos jugados (por temporada+jornada, no por el string de fecha DD/MM/YYYY).
async function getUltimosPartidos(cod: string) {
  const cols = 'codacta, codtemporada, jornada, fecha, equipo_nombre, escudo, rival_cod, rival_nombre, resultado, goles, puntos, goles_encajados'
  const q = (c: string) => supabase.from('web_jugador_partidos').select(c).eq('codjugador', cod)
    .order('codtemporada', { ascending: false }).order('jornada', { ascending: false }).limit(3)
  let r = await q(cols + ', es_local')  // idem: se activa solo cuando exista es_local
  if (r.error) r = await q(cols)
  return (r.data || []) as any[]
}
// Racha del hero: los 5 ÚLTIMOS partidos jugados (por temporada+jornada, jamás por el string de
// fecha) -> chips V/E/D con tooltip "Jnn · marcador vs Rival" (marcador en orden local-visitante,
// perspectiva del jugador para el color). Se invierte para pintar el más reciente a la DERECHA.
async function getRacha5(cod: string): Promise<ChipRacha[]> {
  const q = (c: string) => supabase.from('web_jugador_partidos').select(c)
    .eq('codjugador', cod)
    .order('codtemporada', { ascending: false }).order('jornada', { ascending: false }).limit(5)
  let { data, error } = await q('resultado, jornada, rival_nombre, es_local')
  if (error) ({ data } = await q('resultado, jornada, rival_nombre'))
  return ((data || []) as any[])
    .reverse()
    .map((p): ChipRacha => {
      const { marcador, signo } = marcadorLocalVisitante(p.resultado, p.es_local)
      return { signo: signo as 'G' | 'E' | 'P', jornada: p.jornada ?? null, marcador, rival: p.rival_nombre ?? null }
    })
    .filter((c) => c.signo === 'G' || c.signo === 'E' || c.signo === 'P')
}

function iniciales(nombreDisplay: string): string {
  const w = nombreDisplay.split(/\s+/).filter(Boolean)
  if (w.length === 0) return '?'
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase()
  return (w[0][0] + w[1][0]).toUpperCase()
}

const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('es-ES')

// ---- Metadata ----
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const cod = codFromSlug(slug)
  if (!cod) return { title: 'Fútbol11Stats' }
  const j = await getJugador(cod)
  if (!j) return { title: 'Jugador no encontrado | Fútbol11Stats' }
  const nombre = formatNombre(j.nombre)
  const canonical = `/madrid/jugador/${jugadorSlug(j.codjugador, j.nombre)}`
  const equipo = j.equipo_actual_nombre ? ` del ${j.equipo_actual_nombre}` : ''
  const cat = j.categoria_rama ? ` en ${j.categoria_rama}` : ''
  const title = `${nombre} — estadísticas, trayectoria e hitos | Fútbol11Stats`
  const description = `Estadísticas de ${nombre}${equipo}${cat}: ${num(j.pj_total)} partidos, ${num(j.goles_total)} goles, ` +
    `ELO, ranking F11S y trayectoria completa en el fútbol amateur de Madrid.`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'profile' },
  }
}

// ---- Sub-componentes de presentación ----
function StatTile({ valor, label, acento, Icon }: {
  valor: string; label: string; acento?: boolean
  Icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
}) {
  return (
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 px-3 py-2.5 text-center">
      <div className={`font-display text-2xl font-bold tabular-nums flex items-center justify-center gap-1.5 ${acento ? 'text-grass-400' : 'text-white'}`}>
        {Icon && <Icon className="w-5 h-5 text-grass-400 flex-shrink-0" strokeWidth={2.25} />}
        {valor}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-chalk-600 mt-0.5">{label}</div>
    </div>
  )
}

// Fila de ranking: retícula de dos columnas — [insignia | texto] a la izquierda, número a la derecha.
// La INSIGNIA vive en un raíl de ANCHO FIJO COMÚN (w-9, el ancho de la más ancha: la pastilla mini),
// con las demás (disco, sello) centradas en él -> los tres textos arrancan en el mismo eje vertical.
function RankRow({ insignia, texto, rank, total }: { insignia: React.ReactNode; texto: React.ReactNode; rank: number | null; total: number | null }) {
  if (!rank) return null
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-pitch-700/50 last:border-0">
      <span className="w-9 flex-shrink-0 flex items-center justify-center">{insignia}</span>
      <span className="flex-1 min-w-0 truncate text-xs text-chalk-500">{texto}</span>
      <span className="text-sm text-white font-medium tabular-nums flex-shrink-0">
        <span className="text-grass-400 font-bold">#{rank}</span>
        {total ? <span className="text-chalk-600 font-normal"> / {num(total)}</span> : null}
      </span>
    </div>
  )
}

// Fila unificada de partido (Mejores actuaciones + Últimos partidos): mismo estilo. Línea principal
// "vs RIVAL" + marcador coloreado en condensada mayúsculas; línea secundaria (fecha · con equipo) en
// Inter gris; goles/GC y pts en columnas de ANCHO FIJO para que ambos bloques alineen; pts con signo.
function PartidoRow({ escudo, equipoNombre, rivalCod, rivalNombre, resultado, fecha, goles, pts, gc, portero, esLocal }: {
  escudo: string | null; equipoNombre: string | null; rivalCod: string | null; rivalNombre: string | null
  resultado: string | null; fecha: string | null; goles: number | null; pts: number | null; gc: number | null; portero: boolean
  esLocal?: boolean | null
}) {
  // Marcador SIEMPRE en orden local-visitante (voltea si el jugador jugó fuera); color por el signo.
  const { marcador, signo } = marcadorLocalVisitante(resultado, esLocal)
  const g = goles ?? 0, c = gc ?? 0
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="inline-flex items-center justify-center w-8 h-8 bg-white rounded-sm flex-shrink-0 p-0.5">
        <EscudoImg escudo={escudo} nombre={equipoNombre ?? undefined} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 min-w-0 text-sm font-display uppercase text-white">
            {/* Icono casa/avión cuando exista es_local; si no, se mantiene el "vs" textual (fallback). */}
            {esLocal != null
              ? <IndicadorLocal esLocal={esLocal} />
              : <span className="font-body normal-case text-chalk-500 text-xs flex-shrink-0">vs</span>}
            <span className="truncate min-w-0"><NombreEquipo codequipo={rivalCod} nombre={rivalNombre} /></span>
          </span>
          <span className={`text-xs font-semibold tabular-nums flex-shrink-0 ${colorSigno(signo)}`}>{marcador}</span>
        </div>
        <div className="text-[11px] text-chalk-600 truncate">{fechaCorta(fecha)} · con {equipoNombre}</div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 text-center">
        {/* Goles (campo) / GC (portero) — ancho fijo para alinear entre bloques */}
        <div className="w-9">
          {portero ? (
            <>
              <div className="font-display text-base font-bold tabular-nums flex items-center justify-center gap-1">
                {c === 0 ? <Hand className="w-4 h-4" style={{ color: '#38bdf8' }} strokeWidth={2.25} /> : null}
                <span className={c === 0 ? 'text-chalk-400' : 'text-white'}>{c}</span>
              </div>
              <div className="text-[9px] uppercase tracking-wide text-chalk-600">GC</div>
            </>
          ) : (
            <>
              <div className={`font-display text-base font-bold tabular-nums ${g > 0 ? 'text-white' : 'text-chalk-700'}`}>{g}</div>
              <div className="text-[9px] uppercase tracking-wide text-chalk-600">{g === 1 ? 'gol' : 'goles'}</div>
            </>
          )}
        </div>
        {/* Puntos — siempre con signo y color (+N verde / −N rojo) */}
        <div className="w-9">
          <div className={`font-display text-base font-bold tabular-nums ${signoCls(pts)}`}>{conSigno(pts)}</div>
          <div className="text-[9px] uppercase tracking-wide text-chalk-600">pts</div>
        </div>
      </div>
    </div>
  )
}

// Fondo del avatar + aro del dorsal por posición (intensidad media, paleta de las pastillas).
const AVATAR_POS: Record<string, string> = {
  POR: 'from-orange-500/45 ring-orange-500/60',
  DEF: 'from-blue-500/45 ring-blue-500/60',
  MED: 'from-grass-500/45 ring-grass-400/60',
  DEL: 'from-red-500/45 ring-red-500/60',
}
const DORSAL_POS: Record<string, string> = {
  POR: 'ring-orange-500/60', DEF: 'ring-blue-500/60', MED: 'ring-grass-400/60', DEL: 'ring-red-500/60',
}

// ---- Página ----
export default async function FichaJugador({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cod = codFromSlug(slug)
  if (!cod) notFound()

  // Fetchers en paralelo.
  const [j, carrera, hitosRaw, actuaciones, ultimos, racha5] = await Promise.all([
    getJugador(cod), getCarrera(cod), getHitos(cod), getActuaciones(cod), getUltimosPartidos(cod), getRacha5(cod),
  ])
  // Fuera de perímetro = no existe (sin explicar por qué).
  if (!j) notFound()

  // Redirect 308 a la URL canónica si el sufijo de nombre no coincide.
  const canonicalSlug = jugadorSlug(j.codjugador, j.nombre)
  if (slug !== canonicalSlug) permanentRedirect(`/madrid/jugador/${canonicalSlug}`)

  const nombre = formatNombre(j.nombre)
  const portero = !!j.es_portero
  const inactivo = Number(j.codtemporada_ultima) < Number(LIVE_COD)
  // Aviso de colaboración según el estado de la posición. SIN posición -> se queda en el hero (el hueco
  // es visible ahí, con contexto inmediato). ESTIMADA/CONFIRMADA -> baja al final (el visitante ya ha
  // visto los datos y sabe si algo no cuadra). Textos exactos por caso; mailto con asunto contextual.
  const sinPosicion = !j.posicion_pastilla
  const aviso = sinPosicion
    ? { pre: '¿Conoces la posición de este jugador?', enlace: 'Dínoslo', post: ' y la añadimos.', asunto: `Posición de ${nombre}` }
    : j.posicion_es_estimada
      ? { pre: 'Esta demarcación es una estimación a partir del dorsal. ¿Sabes cuál es la suya?', enlace: 'Dínoslo', post: '.', asunto: `Posición de ${nombre}` }
      : { pre: '¿Hay algo que no cuadra en esta ficha?', enlace: 'Escríbenos', post: '.', asunto: `Corrección en la ficha de ${nombre}` }
  const avisoHref = `mailto:futbol11stats@gmail.com?subject=${encodeURIComponent(aviso.asunto)}`
  const compActual = carrera[0]?.nombre_comp || null
  const grupoActualNombre = carrera[0]?.grupo_nombre || null
  // Copas + posición en liga del equipo actual (una query). Info del grupo actual (para el enlace de la
  // pastilla). Inactivos: sin copas y sin posición (comportamiento apagado).
  const [equipoActual, grupoInfo] = await Promise.all([
    inactivo ? Promise.resolve({ copas: [], posicionActual: null }) : getEquipoActualInfo(j.codequipo_actual),
    getGrupoInfo(carrera[0]?.codgrupo),
  ])
  const { copas, posicionActual } = equipoActual
  const grupoUrl = grupoHref(grupoInfo)

  // Escudos: las tablas web_jugador* ya traen el nombre de fichero del bucket (NULL si el equipo no
  // tiene escudo). Se leen directamente de cada fila vía EscudoImg (thumb + fallback; NULL -> placeholder).
  const { curados, todos } = curarHitos(hitosRaw)
  const dorsalesOtros = (j.dorsales_otros || []).filter((d) => d !== j.dorsal_ultimo && d !== j.dorsal_comun)

  // Breadcrumb JSON-LD (Inicio › Jugadores › Nombre). NO se emite schema Person (datos personales).
  const crumbs = [
    { name: 'Inicio', url: `${SITE_URL}/` },
    { name: 'Jugadores', url: `${SITE_URL}/madrid/aficionados` },
    { name: nombre, url: `${SITE_URL}/madrid/jugador/${canonicalSlug}` },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      <JsonLd data={graphLd(breadcrumbLd(crumbs))} />

      {/* Breadcrumb */}
      <nav className="text-sm text-chalk-600 mb-4 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
        <span>·</span>
        <Link href="/madrid/aficionados" className="hover:text-white transition-colors">Jugadores</Link>
        <span>·</span>
        <span className="text-white truncate uppercase">{nombre}</span>
      </nav>

      {/* HERO + MEDIDORES (banda en desktop) */}
      <section className="lg:flex lg:items-start lg:justify-between lg:gap-8 mb-6 md:mb-8">
        {/* Identidad */}
        <div className="min-w-0 lg:flex-1">
          <div className="flex items-start gap-4 min-w-0">
            {/* Columna izquierda (centrada bajo el avatar): avatar+dorsal, edad y pastilla de posición */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="relative">
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center font-display text-4xl md:text-5xl font-bold text-white ring-2 ring-inset bg-gradient-to-br to-pitch-800 ${AVATAR_POS[j.posicion_pastilla || ''] || 'from-pitch-600/70 ring-pitch-600'}`}>
                  {iniciales(nombre)}
                </div>
                {j.dorsal_ultimo != null && (
                  <span className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-pitch-900 ring-2 flex items-center justify-center font-display text-base font-bold text-white tabular-nums ${DORSAL_POS[j.posicion_pastilla || ''] || 'ring-pitch-600'}`}>
                    {j.dorsal_ultimo}
                  </span>
                )}
              </div>
              {j.edad != null && <span className="text-sm text-chalk-500 font-medium">{j.edad} años</span>}
              <Pastilla pos={j.posicion_pastilla} estimada={!!j.posicion_es_estimada} />
            </div>
            {/* Derecha del avatar: nombre grande (gana el ancho) + chip del club */}
            <div className="min-w-0 flex-1 pt-1">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-white leading-tight uppercase">{nombre}</h1>
              <div className="mt-2 flex items-center gap-2 min-w-0">
                {escudoUrl(j.escudo_actual) && (
                  <span className={`inline-flex items-center justify-center w-6 h-6 bg-white rounded-sm flex-shrink-0 p-0.5 ${inactivo ? 'opacity-60' : ''}`}>
                    <EscudoImg escudo={j.escudo_actual} nombre={j.equipo_actual_nombre ?? undefined} />
                  </span>
                )}
                {inactivo ? (
                  <span className="text-base text-chalk-600 truncate">
                    Último equipo · <span className="text-chalk-500"><NombreEquipo codequipo={j.codequipo_actual} nombre={j.equipo_actual_nombre} /></span>
                    {j.codtemporada_ultima ? ` (${tempLabel(j.codtemporada_ultima)})` : ''}
                  </span>
                ) : (
                  <span className="text-base text-chalk-300 font-medium truncate"><NombreEquipo codequipo={j.codequipo_actual} nombre={j.equipo_actual_nombre} /></span>
                )}
              </div>
            </div>
          </div>
          {/* Pastillas de competición (liga + copas) a ANCHO COMPLETO, a la izquierda, con wrap. Mismo
              componente LigaPastilla que el hero de equipo. Inactivo: liga apagada, sin copas. */}
          {(compActual || copas.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LigaPastilla nombreComp={compActual}
                segments={[compActual, grupoActualNombre, inactivo || posicionActual == null ? null : `${posicionActual}º`]}
                href={grupoUrl} muted={inactivo} />
              <CopasLinea copas={copas} />
            </div>
          )}
          {/* Racha: chips V/E/D de los últimos 5 partidos jugados (más reciente a la derecha). Mismo
              componente que la forma de la ficha de equipo, con la miga que orienta la lectura.
              Inactivos: etiquetados con su última temporada. */}
          <FormaHero forma={racha5} ultimaVictoria={null} miga="últimos 5 · reciente →"
            tempEtiqueta={inactivo && j.codtemporada_ultima ? tempLabel(j.codtemporada_ultima) : null} />
          {/* SIN posición: el aviso se queda en el hero, donde el hueco es visible. Los demás casos bajan al final. */}
          {sinPosicion && (
            <AvisoDato className="mt-3" pre={aviso.pre} enlace={aviso.enlace} post={aviso.post} href={avisoHref} />
          )}
        </div>

        {/* Medidores (a la derecha en desktop; debajo en móvil) */}
        <div className="mt-5 lg:mt-0 lg:w-[380px] lg:flex-shrink-0">
          <Medidores
            elo={j.elo_actual} eloMax={j.elo_max} tempMax={j.temporada_elo_max}
            percentil={j.elo_percentil} categoria={compActual} serie={j.elo_serie || []}
            rating={j.rating_f11s} portero={portero}
          />
        </div>
      </section>

      {carrera.length === 0 ? (
        /* Incidente temporal: web_jugador_carrera/hitos/actuaciones vacías (re-export del pipeline). El
           jugador SÍ existe en web_jugador (cabecera ok), pero sin datos históricos. Aviso CONDICIONAL AL
           DATO -> desaparece solo cuando las tablas se repueblan; sin bandera manual. */
        <div className="mt-8 rounded-xl border border-pitch-700 bg-pitch-800 px-5 py-8 text-center">
          <p className="text-sm md:text-base text-chalk-300">Estamos actualizando los datos históricos de este jugador. Vuelve en un rato.</p>
        </div>
      ) : (
      <>
      {/* CUERPO: main (col1) + aside (col2) en desktop; en móvil aside primero (resumen). */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 lg:items-start">

        {/* ASIDE — totales, rankings, dorsal */}
        <aside className="space-y-6 mb-8 lg:mb-0 lg:col-start-2 lg:row-start-1">
          {/* Totales */}
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">Totales</h2>
            <div className="grid grid-cols-2 gap-2">
              <StatTile valor={num(j.pj_total)} label="Partidos" Icon={Goal} />
              {portero ? (
                <>
                  <StatTile valor={num(j.porterias_cero_total)} label="Porterías 0" acento Icon={Hand} />
                  <StatTile valor={num(j.goles_encajados_total)} label="Goles enc." Icon={CircleDot} />
                  <StatTile valor={j.gc_pj != null ? j.gc_pj.toFixed(2) : '—'} label="GC / partido" />
                </>
              ) : (
                <>
                  <StatTile valor={num(j.goles_total)} label="Goles" acento Icon={CircleDot} />
                  <StatTile valor={num(j.minutos_total)} label="Minutos" Icon={Timer} />
                  <StatTile valor={num(j.temporadas)} label="Temporadas" Icon={Calendar} />
                </>
              )}
            </div>
            {j.trayectoria_completa ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-grass-400">
                <Trophy className="w-3.5 h-3.5" strokeWidth={2.5} /> Trayectoria completa
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-chalk-600">Datos desde 2021-22</p>
            )}
          </div>

          {/* Rankings F11S */}
          {(j.rank_general || j.rank_categoria || j.rank_posicion) && (
            <div>
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
                <Star className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Rankings F11S
              </h2>
              <div className="bg-pitch-800 rounded-xl border border-pitch-700 px-3 py-1.5">
                <RankRow rank={j.rank_general} total={j.rank_general_total}
                  insignia={<span className="w-6 h-6 rounded-full bg-grass-500 flex items-center justify-center text-xs font-bold text-white leading-none">11</span>}
                  texto={<span className="font-display font-bold text-base tracking-tight text-chalk-200">Fútbol<span className="text-grass-400">11</span>Stats</span>} />
                <RankRow rank={j.rank_categoria} total={j.rank_categoria_total}
                  insignia={(compActual || j.categoria_rama) ? <Sello nombreComp={compActual || j.categoria_rama} size={18} /> : null}
                  texto={compActual || j.categoria_rama} />
                <RankRow rank={j.rank_posicion} total={j.rank_posicion_total}
                  insignia={<Pastilla pos={j.posicion_pastilla} estimada={j.posicion_es_estimada} size="mini" />}
                  texto={j.posicion_pastilla ? (POS_LABEL[j.posicion_pastilla] || j.posicion_pastilla) : 'Posición'} />
              </div>
              <p className="mt-1.5 text-[10px] text-chalk-600 leading-snug">Por puntos fantasy de la última temporada activa.</p>
            </div>
          )}

          {/* Dorsal triple */}
          {(j.dorsal_ultimo != null || j.dorsal_comun != null || dorsalesOtros.length > 0) && (
            <div>
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
                <Hash className="w-3.5 h-3.5 text-chalk-500" strokeWidth={2.5} /> Dorsal
              </h2>
              <div className="bg-pitch-800 rounded-xl border border-pitch-700 px-3 py-2.5 flex items-center gap-4">
                {j.dorsal_ultimo != null && (
                  <div className="text-center">
                    <div className="font-display text-2xl font-bold text-white tabular-nums">{j.dorsal_ultimo}</div>
                    <div className="text-[10px] uppercase tracking-wider text-chalk-600">Último</div>
                  </div>
                )}
                {j.dorsal_comun != null && j.dorsal_comun !== j.dorsal_ultimo && (
                  <div className="text-center">
                    <div className="font-display text-2xl font-bold text-chalk-300 tabular-nums">{j.dorsal_comun}</div>
                    <div className="text-[10px] uppercase tracking-wider text-chalk-600">Común</div>
                  </div>
                )}
                {dorsalesOtros.length > 0 && (
                  <div className="min-w-0">
                    <div className="text-sm text-chalk-500 tabular-nums truncate">{dorsalesOtros.join(', ')}</div>
                    <div className="text-[10px] uppercase tracking-wider text-chalk-600">Otros</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ha jugado con (companeros_top) */}
          {j.companeros_top && j.companeros_top.length > 0 && (
            <div>
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
                <Users className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Ha jugado con
              </h2>
              <div className="bg-pitch-800 rounded-xl border border-pitch-700">
                {j.companeros_top.map((c: CompaneroTop) => (
                  <div key={c.codjugador} className="flex items-center gap-2 px-3 py-2 border-b border-pitch-700/50 last:border-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-white rounded-sm flex-shrink-0 p-px">
                      <EscudoImg escudo={c.escudo_actual} nombre={c.equipo_actual ?? undefined} />
                    </span>
                    <Link href={jugadorHref(c.codjugador, c.nombre)} className="flex-1 min-w-0 truncate text-sm font-display uppercase text-white hover:text-grass-300 transition-colors">{formatNombre(c.nombre)}</Link>
                    <Pastilla pos={c.posicion_pastilla} estimada={c.posicion_es_estimada} size="mini" />
                    <span className="flex-shrink-0 w-9 text-right text-xs text-chalk-500 tabular-nums">{c.elo != null ? Math.round(c.elo) : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* MAIN — actuaciones, trayectoria, hitos */}
        <main className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-1">

          {/* Mejores actuaciones */}
          {actuaciones.length > 0 && (
            <section>
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
                <Star className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Mejores actuaciones
              </h2>
              <div className="bg-pitch-800 rounded-xl border border-pitch-700 divide-y divide-pitch-700/60">
                {actuaciones.map((a: any) => (
                  <PartidoRow key={a.rank} escudo={a.escudo} equipoNombre={a.equipo_nombre}
                    rivalCod={a.rival_cod} rivalNombre={a.rival_nombre} resultado={a.resultado}
                    fecha={a.fecha} goles={a.goles} pts={Math.round(a.pts)}
                    gc={portero ? golesRival(a.resultado) : null} portero={portero} esLocal={a.es_local} />
                ))}
              </div>
            </section>
          )}

          {/* Últimos partidos (3 más recientes jugados) */}
          {ultimos.length > 0 && (
            <section>
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
                <ListChecks className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Últimos partidos
              </h2>
              <div className="bg-pitch-800 rounded-xl border border-pitch-700 divide-y divide-pitch-700/60">
                {ultimos.map((p: any) => (
                  <PartidoRow key={p.codacta} escudo={p.escudo} equipoNombre={p.equipo_nombre}
                    rivalCod={p.rival_cod} rivalNombre={p.rival_nombre} resultado={p.resultado}
                    fecha={p.fecha} goles={p.goles} pts={p.puntos} gc={p.goles_encajados} portero={portero} esLocal={p.es_local} />
                ))}
              </div>
            </section>
          )}

          {/* Trayectoria */}
          <section>
            <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
              <MapPin className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Trayectoria
            </h2>
            <Trayectoria carrera={carrera} portero={portero} codjugador={j.codjugador} />
            <p className="mt-2 text-xs text-chalk-600">
              <span className="text-chalk-400 font-medium tabular-nums">{num(j.titular_total)}</span> como titular ·{' '}
              <span className="text-chalk-400 font-medium tabular-nums">{num(j.suplente_total)}</span> como suplente
              {portero ? '' : ` · ${num(j.minutos_total)} minutos`}
            </p>
          </section>

          {/* Hitos */}
          {todos.length > 0 && (
            <section>
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-3">
                <Trophy className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Hitos
              </h2>
              <Hitos curados={curados} todos={todos} portero={portero} />
            </section>
          )}
        </main>
      </div>
      </>
      )}

      {/* Aviso de colaboración al FINAL (posición estimada/confirmada): ya se han visto todos los datos.
          Con aire arriba y abajo, pero discreto. (Sin posición, el aviso va arriba y aquí no hay nada.) */}
      {!sinPosicion && (
        <div className="mt-12 pt-5 pb-2 border-t border-pitch-700/60">
          <AvisoDato pre={aviso.pre} enlace={aviso.enlace} post={aviso.post} href={avisoHref} />
        </div>
      )}
    </div>
  )
}
