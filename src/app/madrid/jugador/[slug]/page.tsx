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
import Medidores from '@/components/ficha/Medidores'
import Hitos from '@/components/ficha/Hitos'
import {
  COLS_JUGADOR, COLS_CARRERA, COLS_HITOS, COLS_ACTUACIONES,
  codFromSlug, jugadorSlug, formatNombre, tempLabel, fechaCorta, curarHitos, escudosPorGrupo,
  LIVE_COD, POS_COLOR, POS_LABEL,
  type JugadorFicha, type HitoRow,
} from '@/lib/jugador'
import {
  Trophy, MapPin, Star, Hash, ArrowUpRight,
} from 'lucide-react'

// --- Fetchers (columnas explícitas) ---
async function getJugador(cod: string): Promise<JugadorFicha | null> {
  const { data } = await supabase.from('web_jugador').select(COLS_JUGADOR).eq('codjugador', cod).limit(1).maybeSingle()
  return (data as unknown as JugadorFicha) || null
}
async function getCarrera(cod: string) {
  const { data } = await supabase.from('web_jugador_carrera').select(COLS_CARRERA).eq('codjugador', cod)
  // Orden: temporada desc, y dentro de una temporada por PJ desc (equipo principal primero).
  return ((data || []) as any[]).sort((a, b) => String(b.codtemporada).localeCompare(String(a.codtemporada)) || (b.pj || 0) - (a.pj || 0))
}
async function getHitos(cod: string): Promise<HitoRow[]> {
  const { data } = await supabase.from('web_jugador_hitos').select(COLS_HITOS).eq('codjugador', cod)
  return (data || []) as unknown as HitoRow[]
}
async function getActuaciones(cod: string) {
  const { data } = await supabase.from('web_jugador_actuaciones').select(COLS_ACTUACIONES).eq('codjugador', cod).order('rank')
  return (data || []) as any[]
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
function Pastilla({ pos, estimada }: { pos: string | null; estimada: boolean }) {
  if (!pos) {
    return (
      <span title="Posición no disponible"
        className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-md text-sm font-bold bg-pitch-700 text-chalk-600">
        –
      </span>
    )
  }
  const cls = POS_COLOR[pos] || 'bg-pitch-700 text-chalk-400'
  return (
    <span
      title={estimada ? 'Posición estimada por dorsal' : (POS_LABEL[pos] || pos)}
      className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-md text-sm font-bold ${cls}`}>
      {pos}{estimada && <span className="text-[10px] leading-none align-super">*</span>}
    </span>
  )
}

function StatTile({ valor, label, acento }: { valor: string; label: string; acento?: boolean }) {
  return (
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 px-3 py-2.5 text-center">
      <div className={`font-display text-2xl font-bold tabular-nums ${acento ? 'text-grass-400' : 'text-white'}`}>{valor}</div>
      <div className="text-[10px] uppercase tracking-wider text-chalk-600 mt-0.5">{label}</div>
    </div>
  )
}

function RankRow({ label, rank, total }: { label: string; rank: number | null; total: number | null }) {
  if (!rank) return null
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-pitch-700/50 last:border-0">
      <span className="text-xs text-chalk-500">{label}</span>
      <span className="text-sm text-white font-medium tabular-nums">
        <span className="text-grass-400 font-bold">#{rank}</span>
        {total ? <span className="text-chalk-600 font-normal"> / {num(total)}</span> : null}
      </span>
    </div>
  )
}

// ---- Página ----
export default async function FichaJugador({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cod = codFromSlug(slug)
  if (!cod) notFound()

  // 4 fetchers en paralelo.
  const [j, carrera, hitosRaw, actuaciones] = await Promise.all([
    getJugador(cod), getCarrera(cod), getHitos(cod), getActuaciones(cod),
  ])
  // Fuera de perímetro = no existe (sin explicar por qué).
  if (!j) notFound()

  // Redirect 308 a la URL canónica si el sufijo de nombre no coincide.
  const canonicalSlug = jugadorSlug(j.codjugador, j.nombre)
  if (slug !== canonicalSlug) permanentRedirect(`/madrid/jugador/${canonicalSlug}`)

  const nombre = formatNombre(j.nombre)
  const portero = !!j.es_portero
  const inactivo = Number(j.codtemporada_ultima) < Number(LIVE_COD)
  const compActual = carrera[0]?.nombre_comp || null

  // Escudos: web_jugador* trae rutas federativas crudas (no son ficheros del bucket). Resolvemos
  // por codequipo desde web_clasificacion (mismos nombres que el resto del sitio) y los aplicamos a
  // TODAS las secciones vía EscudoImg (thumb + fallback original).
  const escudoMap = await escudosPorGrupo(carrera.map((c: any) => c.codgrupo))
  const esc = (cod: string | number | null | undefined): string | null =>
    (cod != null ? escudoMap.get(String(cod)) ?? null : null)

  // Hitos: resolvemos el escudo del contexto (equipo) antes de curar/ordenar.
  const hitosResueltos: HitoRow[] = hitosRaw.map((h) => ({
    ...h, escudo: h.ambito === 'equipo' ? esc(h.contexto_cod) : null,
  }))
  const { curados, todos } = curarHitos(hitosResueltos)
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
        <span className="text-white truncate">{nombre}</span>
      </nav>

      {/* HERO + MEDIDORES (banda en desktop) */}
      <section className="lg:flex lg:items-start lg:justify-between lg:gap-8 mb-6 md:mb-8">
        {/* Identidad */}
        <div className="flex items-start gap-4 min-w-0">
          {/* Avatar de iniciales + dorsal en esquina */}
          <div className="relative flex-shrink-0">
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center font-display text-3xl md:text-4xl font-bold text-white ring-1 ring-inset ${portero ? 'bg-gradient-to-br from-orange-600/40 to-pitch-800 ring-orange-500/30' : 'bg-gradient-to-br from-grass-600/40 to-pitch-800 ring-grass-500/30'}`}>
              {iniciales(nombre)}
            </div>
            {j.dorsal_ultimo != null && (
              <span className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-pitch-900 ring-2 ring-pitch-700 flex items-center justify-center font-display text-sm font-bold text-chalk-200 tabular-nums">
                {j.dorsal_ultimo}
              </span>
            )}
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Pastilla pos={j.posicion_pastilla} estimada={!!j.posicion_es_estimada} />
              {j.edad != null && <span className="text-xs text-chalk-600">{j.edad} años</span>}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mt-1.5 leading-tight">{nombre}</h1>
            {/* Chip de equipo */}
            <div className="mt-2 flex items-center gap-2 min-w-0">
              {escudoUrl(esc(j.codequipo_actual)) && (
                <span className={`inline-flex items-center justify-center w-6 h-6 bg-white rounded-sm flex-shrink-0 p-0.5 ${inactivo ? 'opacity-60' : ''}`}>
                  <EscudoImg escudo={esc(j.codequipo_actual)} nombre={j.equipo_actual_nombre ?? undefined} />
                </span>
              )}
              {inactivo ? (
                <span className="text-sm text-chalk-600 truncate">
                  Último equipo · <span className="text-chalk-500">{j.equipo_actual_nombre}</span>
                  {j.codtemporada_ultima ? ` (${tempLabel(j.codtemporada_ultima)})` : ''}
                </span>
              ) : (
                <span className="text-sm text-chalk-300 font-medium truncate">{j.equipo_actual_nombre}</span>
              )}
            </div>
            {compActual && (
              <p className="mt-1 text-xs text-chalk-600">{compActual}{j.categoria_rama ? ` · ${j.categoria_rama}` : ''}</p>
            )}
          </div>
        </div>

        {/* Medidores (a la derecha en desktop; debajo en móvil) */}
        <div className="mt-5 lg:mt-0 lg:w-[380px] lg:flex-shrink-0">
          <Medidores
            elo={j.elo_actual} eloMax={j.elo_max} tempMax={j.temporada_elo_max}
            percentil={j.elo_percentil} serie={j.elo_serie || []}
            rating={j.rating_f11s} portero={portero}
          />
        </div>
      </section>

      {/* CUERPO: main (col1) + aside (col2) en desktop; en móvil aside primero (resumen). */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 lg:items-start">

        {/* ASIDE — totales, rankings, dorsal */}
        <aside className="space-y-6 mb-8 lg:mb-0 lg:col-start-2 lg:row-start-1">
          {/* Totales */}
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">Totales</h2>
            <div className="grid grid-cols-2 gap-2">
              <StatTile valor={num(j.pj_total)} label="Partidos" />
              {portero ? (
                <>
                  <StatTile valor={num(j.porterias_cero_total)} label="Porterías 0" acento />
                  <StatTile valor={num(j.goles_encajados_total)} label="Goles enc." />
                  <StatTile valor={j.gc_pj != null ? j.gc_pj.toFixed(2) : '—'} label="GC / partido" />
                </>
              ) : (
                <>
                  <StatTile valor={num(j.goles_total)} label="Goles" acento />
                  <StatTile valor={num(j.minutos_total)} label="Minutos" />
                  <StatTile valor={num(j.temporadas)} label="Temporadas" />
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
                <RankRow label="General" rank={j.rank_general} total={j.rank_general_total} />
                <RankRow label={j.categoria_rama ? `Categoría · ${compActual || j.categoria_rama}` : 'Categoría'} rank={j.rank_categoria} total={j.rank_categoria_total} />
                <RankRow label={j.posicion_pastilla ? `Posición · ${POS_LABEL[j.posicion_pastilla] || j.posicion_pastilla}` : 'Posición'} rank={j.rank_posicion} total={j.rank_posicion_total} />
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
                  <div key={a.rank} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-white rounded-sm flex-shrink-0 p-0.5">
                      <EscudoImg escudo={esc(a.rival_cod)} nombre={a.rival_nombre} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{a.rival_nombre}</span>
                        <span className="text-xs text-chalk-500 tabular-nums flex-shrink-0">{a.resultado}</span>
                      </div>
                      <div className="text-[11px] text-chalk-600 truncate">
                        {fechaCorta(a.fecha)} · con {a.equipo_nombre}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-center">
                      {a.goles > 0 && (
                        <div>
                          <div className="font-display text-base font-bold text-white tabular-nums">{a.goles}</div>
                          <div className="text-[9px] uppercase tracking-wide text-chalk-600">{a.goles === 1 ? 'gol' : 'goles'}</div>
                        </div>
                      )}
                      <div>
                        <div className="font-display text-base font-bold text-grass-400 tabular-nums">{Math.round(a.pts)}</div>
                        <div className="text-[9px] uppercase tracking-wide text-chalk-600">pts</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Trayectoria */}
          <section>
            <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
              <MapPin className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Trayectoria
            </h2>
            <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-x-auto">
              <table className="w-full tabla-clasificacion">
                <thead>
                  <tr className="border-b border-pitch-700">
                    <th className="text-left">Temp.</th>
                    <th className="text-left">Equipo</th>
                    <th className="text-left hidden sm:table-cell">Comp.</th>
                    <th>PJ</th>
                    <th className="hidden sm:table-cell">Min</th>
                    <th>{portero ? 'P0' : 'G'}</th>
                    {portero && <th>GC</th>}
                    <th>TA</th>
                    <th>TR</th>
                    <th className="hidden sm:table-cell">Pts</th>
                    <th className="text-grass-400">ELO</th>
                  </tr>
                </thead>
                <tbody>
                  {carrera.map((c: any, i: number) => (
                    <tr key={`${c.codtemporada}-${c.codequipo}-${i}`} className="border-b border-pitch-700/50 last:border-0">
                      <td className="text-chalk-400 font-medium tabular-nums whitespace-nowrap">{tempLabel(c.codtemporada)}</td>
                      <td className="col-nombre text-white">
                        <span className="flex items-center gap-2 min-w-0">
                          {escudoUrl(esc(c.codequipo)) && (
                            <span className="escudo-box inline-flex items-center justify-center w-6 h-6 bg-white rounded-sm flex-shrink-0 p-0.5">
                              <EscudoImg escudo={esc(c.codequipo)} nombre={c.equipo_nombre} />
                            </span>
                          )}
                          <span className="truncate">{c.equipo_nombre}</span>
                        </span>
                      </td>
                      <td className="text-chalk-600 hidden sm:table-cell whitespace-nowrap text-xs">{c.nombre_comp}{c.grupo_nombre ? ` · ${c.grupo_nombre}` : ''}</td>
                      <td className="text-center text-chalk-400 tabular-nums">{c.pj}</td>
                      <td className="text-center text-chalk-600 tabular-nums hidden sm:table-cell">{num(c.minutos)}</td>
                      <td className="text-center font-bold text-white tabular-nums">{portero ? (c.porterias_cero ?? 0) : c.goles}</td>
                      {portero && <td className="text-center text-chalk-400 tabular-nums">{c.goles_encajados ?? 0}</td>}
                      <td className="text-center text-chalk-600 tabular-nums">{c.tarjetas_amarillas ?? 0}</td>
                      <td className="text-center text-chalk-600 tabular-nums">{c.tarjetas_rojas ?? 0}</td>
                      <td className="text-center text-chalk-600 tabular-nums hidden sm:table-cell">{c.pts_fantasy != null ? Math.round(c.pts_fantasy) : ''}</td>
                      <td className="text-center text-grass-400 font-medium tabular-nums">{c.elo_final != null ? Math.round(c.elo_final) : ''}</td>
                    </tr>
                  ))}
                  {carrera.length === 0 && (
                    <tr><td colSpan={portero ? 11 : 10} className="text-center text-chalk-600 py-6 text-sm">Sin trayectoria registrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
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

      {/* Enlace discreto al canal de derechos */}
      <div className="mt-12 pt-4 border-t border-pitch-700/60 flex items-center gap-1.5">
        <Link href="/datos-y-derechos" className="inline-flex items-center gap-1 text-xs text-chalk-600 hover:text-chalk-400 transition-colors">
          <ArrowUpRight className="w-3 h-3" /> Sobre estos datos
        </Link>
      </div>
    </div>
  )
}
