import './ficha.css'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import { escudoUrl } from '@/lib/supabase'
import NombreEquipo from '@/components/NombreEquipo'
import Sello from '@/components/Sello'
import Pastilla from '@/components/Pastilla'
import LigaPastilla from '@/components/LigaPastilla'
import CopasLinea from '@/components/CopasLinea'
import IndicadorLocal from '@/components/IndicadorLocal'
import Trayectoria from '@/components/ficha/Trayectoria'
import EloSparkline from '@/components/ficha/EloSparkline'
import JsonLd from '@/components/JsonLd'
import CompartirBtn from '@/components/ficha/v2/CompartirBtn'
import NavSpy from '@/components/ficha/v2/NavSpy'
import CompChips from '@/components/ficha/v2/CompChips'
import Echo from '@/components/ficha/v2/Echo'
import Jornadas from '@/components/ficha/v2/Jornadas'
import {
  Balon, Reloj, Escudo, Camiseta, CamisetaHueca, TarjetaAmarilla, TarjetaDoble, TarjetaRoja, Guante,
  Estrella, Marcador, Promocion,
} from '@/components/iconos'
import { getEquipoActualInfo, getGrupoInfo, grupoHref } from '@/lib/equipo'
import { graphLd, breadcrumbLd } from '@/lib/jsonld'
import { SITE_URL } from '@/lib/seo'
import {
  formatNombre, tempLabel, jugadorSlug, jugadorHref, curarHitos, HITO_CONFIG, fechaCorta,
  marcadorLocalVisitante, POS_LABEL, LIVE_COD, type HitoRow, type CompaneroTop,
} from '@/lib/jugador'
import { CORTES_FIJOS } from '@/lib/escala'
import {
  getJugadorV2, getCarreraV2, getAlertaActual, getAmbitoTemporada, getCortesElo, labelToCod,
  getPartidosTemporada, ventanasForma, racha5DePartidos, splitCasaFuera, balanceEquipo,
  getActuacionesV2, getHitosV2, alertaHumana, tienePorteriaDato, getTarjetasTotales,
  type CarreraRow,
} from '@/lib/jugadorV2'

const PAL = ['#f87171', '#94a3b8', '#22a050', '#2ee56b', '#8cf0a2']
function esc(v: number, c: readonly [number, number, number, number]) { if (v < 0) return 0; let n = 1; for (let i = 0; i < 4; i++) if (v >= c[i]) n = i + 1; return n }
// Separador de millares MANUAL (el runtime de Vercel tiene ICU reducido y toLocaleString no agrupa).
const mil = (n: number | null | undefined) => (n == null ? '—' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
const med1 = (v: number) => v.toFixed(1).replace('.', ',')

export default async function FichaJugadorV2({ cod, temporadaLabel }: { cod: string; temporadaLabel: string | null }) {
  const [j, carrera] = await Promise.all([getJugadorV2(cod), getCarreraV2(cod)])
  if (!j) notFound()

  const rawNombre = j.nombre || ''
  const apellidos = (rawNombre.split(',')[0] || '').trim().toUpperCase()
  const pila = ((rawNombre.split(',')[1] || '').trim() || apellidos).toUpperCase()
  const nombre = formatNombre(j.nombre)
  const ini = ((pila[0] || '') + (apellidos[0] || '')).toUpperCase()
  // Color del avatar por demarcación, como en la ficha antigua (AVATAR_POS en [slug]/page.tsx):
  // gradiente + aro por posición (POR naranja, DEF azul, MED verde, DEL rojo), texto blanco.
  const AVA_POS: Record<string, string> = { POR: '249,115,22', DEF: '59,130,246', MED: '34,160,80', DEL: '239,68,68' }
  const avaRGB = AVA_POS[j.posicion_pastilla || ''] || '100,116,139'
  const avatarStyle = { background: `linear-gradient(to bottom right, rgba(${avaRGB},.45), var(--pitch-800))`, border: `2px solid rgba(${avaRGB},.6)` }
  const slug = jugadorSlug(j.codjugador, j.nombre)
  const portero = !!j.es_portero
  const inactivo = Number(j.codtemporada_ultima) < Number(LIVE_COD)

  const temporadas = Array.from(new Set(carrera.map((c) => c.codtemporada)))
  const codPedido = labelToCod(temporadaLabel)
  const tempSel = (codPedido && temporadas.includes(codPedido)) ? codPedido : (carrera[0]?.codtemporada ?? null)
  const etapas = carrera.filter((c) => c.codtemporada === tempSel)
  const etapaPrincipal: CarreraRow | undefined = etapas[0]
  const categoriaSel = etapaPrincipal?.nombre_comp ?? j.categoria_rama ?? null

  const sum = (f: (c: CarreraRow) => number | null) => etapas.reduce((s, c) => s + (f(c) ?? 0), 0)
  const pj = sum((c) => c.pj), golesT = sum((c) => c.goles), ptsF = sum((c) => c.pts_fantasy)
  const minT = sum((c) => c.minutos), p0Sel = sum((c) => c.porterias_cero)
  const media = pj > 0 ? ptsF / pj : null
  const eloSel = etapaPrincipal?.elo_final ?? j.elo_actual ?? null

  const [equipoInfo, cortesElo, alerta, comps, partidosTemp, actuaciones, hitosRaw, hayP0, grupoInfo, tarjetas] = await Promise.all([
    inactivo ? Promise.resolve({ copas: [], posicionActual: null }) : getEquipoActualInfo(j.codequipo_actual),
    getCortesElo(categoriaSel, tempSel ? Number(tempSel) : null),
    getAlertaActual(cod),
    tempSel ? getAmbitoTemporada(cod, tempSel) : Promise.resolve([]),
    tempSel ? getPartidosTemporada(cod, tempSel) : Promise.resolve([] as any[]),
    getActuacionesV2(cod),
    getHitosV2(cod),
    tienePorteriaDato(cod),
    getGrupoInfo(etapaPrincipal?.codgrupo),
    getTarjetasTotales(cod),
  ])
  const { copas, posicionActual } = equipoInfo
  const grupoUrl = grupoHref(grupoInfo)

  const cMed = (v: number | null) => (v == null ? '' : PAL[esc(v, CORTES_FIJOS.mediaPartido)])
  const cElo = (v: number | null) => (v == null ? '' : PAL[esc(v, cortesElo)])
  const cPts = (v: number) => PAL[esc(v, CORTES_FIJOS.puntosPartido)]

  const ventanas = ventanasForma(partidosTemp)
  const racha = racha5DePartidos(partidosTemp)
  const split = splitCasaFuera(partidosTemp)
  const balance = await balanceEquipo(partidosTemp)
  // Global del equipo esa temporada = con él + sin él (balanceEquipo reparte TODOS los resultados del
  // equipo en esos dos cubos). Sirve de línea base para ver si con el jugador va mejor o peor.
  const glob = {
    pg: balance.con.pg + balance.sin.pg, pe: balance.con.pe + balance.sin.pe,
    pp: balance.con.pp + balance.sin.pp, pj: balance.con.pj + balance.sin.pj,
  }
  const pcWin = (o: { pg: number; pj: number }) => (o.pj ? Math.round((o.pg / o.pj) * 100) : 0)
  const { curados } = curarHitos(hitosRaw)
  const companeros = (j.companeros_top || []).slice(0, 6)
  const compNames = comps.map((c) => c.nombre_comp)
  const ligaCod = comps[0]?.codgrupo

  // Percentil: floor y TOPE 99 (no se puede ser "mejor que el 100 %" de su categoría, incluido uno mismo;
  // rank 358/38.173 -> 99). Batería: min(10, round(pct/10)) -> se llena entera en el tope.
  const pct = j.elo_percentil != null ? Math.min(99, Math.floor(j.elo_percentil)) : null
  const llenos = pct != null ? Math.min(10, Math.round(pct / 10)) : 0
  const eloBig = j.elo_actual ?? eloSel

  const dorsalesOtros = (j.dorsales_otros || []).filter((d) => d !== j.dorsal_ultimo && d !== j.dorsal_comun)

  const cuentaTemp = new Map<string, number>()
  for (const c of carrera) cuentaTemp.set(c.codtemporada, (cuentaTemp.get(c.codtemporada) ?? 0) + 1)

  const tempTxt = tempSel ? tempLabel(tempSel) : ''
  const alertaTxt = alertaHumana(alerta)

  // Orden EXACTO de aparición en el DOM: primero el aside (Nivel, Totales, Compañeros), luego el main.
  // `aside:true` -> el scroll-spy las ignora en desktop (columna sticky, siempre visible). Ver NavSpy.
  const secciones = ([
    { id: 's-nivel', label: 'Nivel', aside: true },
    { id: 's-totales', label: 'Totales', aside: true },
    companeros.length ? { id: 's-mates', label: 'Compañeros', aside: true } : null,
    comps.length ? { id: 's-jornadas', label: 'Jornadas' } : null,
    partidosTemp.length ? { id: 's-forma', label: 'Forma' } : null,
    partidosTemp.length ? { id: 's-analisis', label: 'Análisis' } : null,
    carrera.length ? { id: 's-temporadas', label: 'Temporadas' } : null,
    carrera.length ? { id: 's-trayectoria', label: 'Trayectoria' } : null,
    actuaciones.length ? { id: 's-partidos', label: 'Partidos' } : null,
    curados.length ? { id: 's-hitos', label: 'Hitos' } : null,
  ].filter(Boolean)) as { id: string; label: string; aside?: boolean }[]

  const crumbs = [
    { name: 'Inicio', url: `${SITE_URL}/` },
    { name: 'Jugadores', url: `${SITE_URL}/madrid/aficionados` },
    { name: nombre, url: `${SITE_URL}/madrid/jugador/${slug}/v2` },
  ]

  // --- helpers de render ---
  const filaBalance = (t: string, sub: string, o: { pg: number; pe: number; pp: number; pj: number }, hi: boolean) => {
    const pc = o.pj ? Math.round((o.pg / o.pj) * 100) : 0
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderTop: '1px solid var(--line-2)' }}>
        <div style={{ width: 58, flex: 'none' }}>
          <div className="num" style={{ fontSize: 'var(--t-sm)', color: hi ? 'var(--e4)' : 'var(--ink-3)' }}>{t}</div>
          <div style={{ fontSize: 'var(--t-micro)', color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>
        </div>
        <div style={{ flex: 1, display: 'flex', height: 20, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
          {o.pg > 0 && <span style={{ flex: o.pg, background: 'var(--e3)', opacity: hi ? 1 : .45 }} />}
          {o.pe > 0 && <span style={{ flex: o.pe, background: 'var(--e1)', opacity: hi ? 1 : .45 }} />}
          {o.pp > 0 && <span style={{ flex: o.pp, background: 'var(--e0)', opacity: hi ? 1 : .45 }} />}
        </div>
        <div className="num" style={{ width: 44, textAlign: 'right', fontSize: 'var(--n-md)', color: hi ? 'var(--e3)' : 'var(--ink-3)' }}>{pc}%</div>
      </div>
    )
  }

  // Fila de ranking con el mismo tratamiento que el ELO: icono del sitio + nº + barra de percentil.
  // Percentil = mejor que el X% = (1 - rank/total), floor y tope 99.
  const RankFila = (insignia: ReactNode, label: string, rank: number | null, total: number | null) => {
    if (!rank) return null
    const p = total ? Math.min(99, Math.floor((1 - rank / total) * 100)) : null
    const ll = p != null ? Math.round(p / 10) : 0
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderTop: '1px solid var(--line-2)' }}>
        <span style={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>{insignia}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 'var(--t-cap)' }}>
            <span style={{ color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
            <span className="num" style={{ fontSize: 'var(--t-sm)', flexShrink: 0 }}><span style={{ color: 'var(--e3)' }}>#{mil(rank)}</span><span style={{ color: 'var(--ink-4)' }}> / {mil(total)}</span></span>
          </div>
          <div style={{ display: 'flex', gap: 2, marginTop: 5 }}>
            {Array.from({ length: 10 }).map((_, i) => <span key={i} style={{ height: 6, flex: 1, borderRadius: 2, background: (p != null && i < ll) ? 'var(--e3)' : 'rgba(255,255,255,.1)' }} />)}
          </div>
        </div>
      </div>
    )
  }
  const badge11 = <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#1a7a3c', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, color: '#fff', fontSize: 11, lineHeight: 1 }}>11</span>

  // 3ª casilla: goles (jugador de campo) o porterías a cero (portero, si hay dato de portería).
  const golesTile: [ReactNode, string, string] = hayP0
    ? [<Guante size={13} key="i" />, mil(j.porterias_cero_total), 'P. a cero']
    : [<Balon size={13} key="i" />, mil(j.goles_total), 'Goles']
  // Dos filas por naturaleza del dato: arriba PARTICIPACIÓN (PJ·Min·Titular·Supl.), abajo EVENTOS
  // (Goles/P.a0 · TA · 2TA · TR). TA · 2TA · TR son DISJUNTAS (amarilla simple / doble amarilla / roja
  // directa) desde web_jugador_partidos, que las separa a nivel de evento. Ver getTarjetasTotales.
  const totales: Array<[ReactNode, string, string]> = [
    [<Escudo size={13} key="i" />, mil(j.pj_total), 'PJ'],
    [<Reloj size={13} key="i" />, mil(j.minutos_total), 'Min'],
    [<Camiseta size={13} key="i" />, mil(j.titular_total), 'Titular'],
    [<CamisetaHueca size={13} key="i" />, mil(j.suplente_total), 'Supl.'],
    golesTile,
    [<span style={{ color: 'var(--card-y)', display: 'flex' }} key="i"><TarjetaAmarilla size={11} /></span>, mil(tarjetas.amarillas), 'TA'],
    [<span style={{ color: 'var(--card-y)', display: 'flex' }} key="i"><TarjetaDoble size={12} /></span>, mil(tarjetas.dobles), '2TA'],
    [<span style={{ color: 'var(--card-r)', display: 'flex' }} key="i"><TarjetaRoja size={11} /></span>, mil(tarjetas.rojas), 'TR'],
  ]

  const RC: Record<string, string> = { G: 'var(--e3)', E: 'var(--ink-3)', P: 'var(--e0)' }

  return (
    <div className="fjv2">
      <JsonLd data={graphLd(breadcrumbLd(crumbs))} />
      {/* 1 · HERO */}
      <div className="hero">
        <div className="hero-top">
          <div className="avatar" style={avatarStyle}>{ini}{j.dorsal_ultimo != null && <div className="dorsal">{j.dorsal_ultimo}</div>}</div>
          <div className="hero-name">
            <div className="first">{pila}</div>
            <div className="last">{apellidos}</div>
          </div>
          <CompartirBtn titulo={`${nombre} · Fútbol11Stats`} variant="icon" />
        </div>
        <div className="hero-pills">
          <Pastilla pos={j.posicion_pastilla} estimada={!!j.posicion_es_estimada} />
          {j.edad != null && <span className="pill n">{j.edad} años</span>}
          {j.equipo_actual_nombre && (
            <span className="pill n">
              <EscudoBox escudo={j.escudo_actual} nombre={j.equipo_actual_nombre ?? undefined} size={26} radius={4} />
              <NombreEquipo codequipo={j.codequipo_actual} nombre={j.equipo_actual_nombre} />
            </span>
          )}
          {etapaPrincipal?.nombre_comp && (
            <LigaPastilla nombreComp={etapaPrincipal?.nombre_comp ?? null}
              segments={[etapaPrincipal?.nombre_comp ?? null, etapaPrincipal?.grupo_nombre ?? null, inactivo || posicionActual == null ? null : `${posicionActual}º`]}
              href={grupoUrl} muted={inactivo} />
          )}
          <CopasLinea copas={copas} />
        </div>
        {alertaTxt && (
          <div className="alert">
            <span style={{ color: 'var(--card-y)', display: 'flex' }}><TarjetaAmarilla size={13} /></span>
            <span dangerouslySetInnerHTML={{ __html: alertaTxt }} />
          </div>
        )}
      </div>

      {/* 2 · KPIs — mismo orden en móvil y desktop; en móvil se oculta Goles/P.a0 (.kpi-goles) por espacio,
          sin reordenar el resto. */}
      <div className="kpis">
        <div className="kpi"><div className="kpi-i"><Escudo size={14} /></div><div className="v num">{mil(pj)}</div><div className="k">PJ</div></div>
        <div className="kpi"><div className="kpi-i"><Reloj size={14} /></div><div className="v num">{mil(minT)}</div><div className="k">Min</div></div>
        <div className="kpi kpi-goles">
          <div className="kpi-i">{hayP0 ? <Guante size={14} /> : <Balon size={14} />}</div>
          <div className="v num">{hayP0 ? mil(p0Sel) : mil(golesT)}</div>
          <div className="k">{hayP0 ? 'P. a cero' : 'Goles'}</div>
        </div>
        <div className="kpi"><div className="kpi-i"><Estrella size={14} /></div><div className="v num">{mil(Math.round(ptsF))}</div><div className="k">Pts F.</div></div>
        <div className="kpi"><div className="kpi-i"><Marcador size={14} /></div><div className="v num" style={{ color: cMed(media) }}>{media != null ? med1(media) : '—'}</div><div className="k">Media</div></div>
        <div className="kpi"><div className="kpi-i"><Promocion size={14} /></div><div className="v num" style={{ color: cElo(eloSel) }}>{eloSel != null ? mil(Math.round(eloSel)) : '—'}</div><div className="k">ELO</div></div>
      </div>

      {/* SCOPE */}
      <div className="scope">
        <div className="scope-lbl">Temporada</div>
        <div className="track"><div className="rail">
          {temporadas.map((t) => (
            <Link key={t} href={`/madrid/jugador/${slug}/${tempLabel(t)}/v2`} className={t === tempSel ? 'on' : ''}>{tempLabel(t)}</Link>
          ))}
        </div></div>
        {comps.length > 0 && <>
          <div className="scope-lbl" style={{ paddingTop: 11 }}>Competición</div>
          <div className="track"><div className="rail"><CompChips comps={comps.map((c) => ({ label: c.nombre_comp, count: c.jornadas.length, sello: <Sello nombreComp={c.nombre_comp} size={18} /> }))} /></div></div>
        </>}
        <div className="scope-note">Las secciones marcadas «Todas las temporadas» no dependen de esta selección.</div>
      </div>

      {/* NAV */}
      <NavSpy secciones={secciones} />

      <div className="layout">
        <div className="aside">
          {/* NIVEL */}
          <section id="s-nivel">
            {/* Los rankings salen de web_jugador (rank_general/categoria/posicion): son ACTUALES, no por
                temporada, así que no cambian con el selector. El subtítulo lo deja claro (sin Echo). */}
            <div className="s-head"><div className="s-title">Nivel</div><div className="s-sub"><span className="allscope">Situación actual</span></div></div>
            <div className="box">
              <div className="elo-top">
                <div><div className="cap">ELO F11S</div><div className="elo-v" style={{ color: cElo(eloBig) }}>{eloBig != null ? mil(Math.round(eloBig)) : '—'}</div></div>
                <div style={{ textAlign: 'right' }}><div className="cap">Percentil</div><div className="elo-v" style={{ color: cElo(eloBig) }}>{pct != null ? pct : '—'}</div></div>
              </div>
              <div className="batt">{Array.from({ length: 10 }).map((_, i) => <i key={i} style={i < llenos ? { background: cElo(eloBig) } : undefined} />)}</div>
              {pct != null && <div className="batt-lbl">Mejor que el <b>{pct} %</b> de los jugadores de su categoría</div>}
              {/* Evolución del ELO (cierre por temporada) — mismo sparkline que la ficha actual (Medidores). */}
              <EloSparkline serie={j.elo_serie || []} className="w-full h-9 mt-3" />
              <div style={{ marginTop: 13 }}>
                {/* Los tres rankings unificados con el badge (11) verde, como en la sección Rankings. */}
                {RankFila(badge11, 'Fútbol11Stats · Madrid', j.rank_general, j.rank_general_total)}
                {RankFila(badge11, categoriaSel || 'Competición', j.rank_categoria, j.rank_categoria_total)}
                {RankFila(badge11, j.posicion_pastilla ? (POS_LABEL[j.posicion_pastilla] || j.posicion_pastilla) : 'Posición', j.rank_posicion, j.rank_posicion_total)}
              </div>
            </div>
          </section>

          {/* TOTALES */}
          <section id="s-totales">
            <div className="s-head"><div className="s-title">Totales</div><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
            <div className="totales">
              {totales.map(([ic, v, k], i) => (
                <div className="tot" key={i}><div className="t-i">{ic}</div><div className="t-v">{v}</div><div className="t-k">{k}</div></div>
              ))}
            </div>
            <div style={{ padding: '10px var(--pad) 0', fontSize: 'var(--t-cap)', color: 'var(--ink-3)', lineHeight: 1.5 }}>
              <b style={{ color: 'var(--ink-2)' }}>Dorsal</b>
              {j.dorsal_ultimo != null && <> · último <b style={{ color: 'var(--ink-2)' }}>{j.dorsal_ultimo}</b></>}
              {j.dorsal_comun != null && <> · habitual <b style={{ color: 'var(--ink-2)' }}>{j.dorsal_comun}</b></>}
              {dorsalesOtros.length > 0 && <> · otros {dorsalesOtros.join(', ')}</>}
            </div>
          </section>

          {/* COMPAÑEROS */}
          {companeros.length > 0 && (
            <section id="s-mates">
              {/* slice(0,6) preparado para dos filas de tres, pero web_jugador.companeros_top viene con
                  exactamente 5 desde el pipeline: el subtítulo refleja el nº real y saldrá 6 solo. */}
              <div className="s-head"><div className="s-title">Ha jugado con</div><div className="s-sub">top {companeros.length} por ELO</div></div>
              <div className="track"><div className="rail">
                {companeros.map((c: CompaneroTop) => {
                  const nm = formatNombre(c.nombre)
                  const mi = nm.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
                  return (
                    <Link key={c.codjugador} href={jugadorHref(c.codjugador, c.nombre)} className="mate">
                      {escudoUrl(c.escudo_actual) ? <EscudoBox escudo={c.escudo_actual} nombre={c.equipo_actual ?? undefined} size={46} radius={9} /> : <div className="m-av">{mi}</div>}
                      <div className="m-n">{nm}</div>
                      <div className="m-e" style={{ color: cElo(c.elo ?? null) }}>ELO {c.elo != null ? mil(Math.round(c.elo)) : '—'}</div>
                    </Link>
                  )
                })}
              </div></div>
            </section>
          )}
        </div>

        <div className="main">
          {/* JORNADAS */}
          <section id="s-jornadas">
            <div className="s-head"><div className="s-title">Puntos por jornada</div><div className="s-sub"><Echo temporada={tempTxt} comps={compNames} /></div></div>
            {comps.length > 0
              ? <Jornadas comps={comps} cortes={CORTES_FIJOS.puntosPartido} />
              : <p style={{ padding: '0 var(--pad)', color: 'var(--ink-3)', fontSize: 'var(--t-sm)' }}>Sin partidos en esta temporada.</p>}
          </section>

          {/* FORMA */}
          <section id="s-forma">
            <div className="s-head"><div className="s-title">Forma</div><div className="s-sub">media de puntos por partido</div></div>
            <div className="windows">
              {ventanas.map((v) => {
                const d = v.delta
                const ds = d == null ? '—' : `${d > 0 ? '+' : ''}${med1(d)}`
                return (
                  <div className="win" key={v.label}>
                    <div className="w-k">{v.label}</div>
                    <div className="w-v" style={{ color: cMed(v.media) }}>{v.media != null ? med1(v.media) : '—'}</div>
                    <div className="w-s">{ds}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ padding: '12px var(--pad) 2px', display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--t-cap)', color: 'var(--ink-3)', marginRight: 5 }}>Racha</span>
              {racha.map((r, i) => (
                <span key={i} className="num" style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 'var(--t-sm)', color: '#0a1628', background: RC[r.signo] }}>{r.signo}</span>
              ))}
            </div>
          </section>

          {/* ANÁLISIS */}
          <section id="s-analisis">
            <div className="s-head"><div className="s-title">Análisis</div><div className="s-sub"><Echo temporada={tempTxt} comps={compNames} /></div></div>
            <div className="box">
              <div className="cap" style={{ marginBottom: 5 }}>Balance del equipo</div>
              {/* Línea base (Global) + con él, y sin él cuando hay contraparte suficiente (>=8 por lado).
                  Comparar con la global dice si el equipo va mejor o peor con el jugador. */}
              {filaBalance('Global', `${glob.pj} partidos`, glob, false)}
              {filaBalance('Con él', `${balance.con.pj} partidos`, balance.con, true)}
              {balance.suficiente && filaBalance('Sin él', `${balance.sin.pj} partidos`, balance.sin, false)}
              <div className="bal-note">
                {balance.suficiente
                  ? <><b>{pcWin(balance.con)} %</b> de victorias con él y <b>{pcWin(balance.sin)} %</b> sin él · media del equipo <b>{pcWin(glob)} %</b>.</>
                  : <><b>{pcWin(balance.con)} %</b> de victorias con él · media del equipo <b>{pcWin(glob)} %</b>.</>}
              </div>
            </div>
            {split.hayLocal && (
              <div className="windows" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {([['Casa', split.casa], ['Fuera', split.fuera]] as const).map(([k, s]) => (
                  <div className="win" key={k}>
                    <div className="w-k" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <IndicadorLocal esLocal={k === 'Casa'} />{k}
                    </div>
                    <div className="w-v" style={{ color: cMed(s.media) }}>{s.media != null ? med1(s.media) : '—'}</div>
                    <div className="w-s">{s.pj} PJ · {s.goles} goles</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* TEMPORADAS */}
          <section id="s-temporadas">
            <div className="s-head"><div className="s-title">Temporadas</div><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
            <div className="track"><div className="rail" id="seasons">
              {carrera.map((c, i) => {
                const compartida = (cuentaTemp.get(c.codtemporada) ?? 0) > 1
                return (
                  <div className="season" key={`${c.codtemporada}-${c.codequipo}-${i}`}>
                    <div className="accent" style={{ background: cMed(c.media_fantasy) || 'var(--line)' }} />
                    {compartida && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--amber)', opacity: .7 }} />}
                    <div className="s-top">
                      <EscudoBox escudo={c.escudo} nombre={c.equipo_nombre ?? undefined} size={22} radius={3} />
                      <div className="s-yr">{tempLabel(c.codtemporada)}</div>
                    </div>
                    <div className="s-cat">
                      <span className="pill n" style={{ maxWidth: '100%', overflow: 'hidden' }}>
                        {c.nombre_comp ? <Sello nombreComp={c.nombre_comp} size={14} /> : null}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre_comp}{c.grupo_nombre ? ` · ${c.grupo_nombre}` : ''}</span>
                      </span>
                    </div>
                    <div className="s-duo">
                      <div><div className="d-v" style={{ color: cMed(c.media_fantasy) }}>{c.media_fantasy != null ? med1(c.media_fantasy) : '—'}</div><div className="d-k">MEDIA</div></div>
                      <div><div className="d-v" style={{ color: cElo(c.elo_final) }}>{c.elo_final != null ? mil(Math.round(c.elo_final)) : '—'}</div><div className="d-k">ELO</div></div>
                    </div>
                    <div className="s-stats">
                      <div><b>{mil(c.pj)}</b>PJ</div><div><b>{mil(c.minutos)}</b>MIN</div><div><b>{mil(c.goles)}</b>GOLES</div>
                    </div>
                  </div>
                )
              })}
            </div></div>
          </section>

          {/* TRAYECTORIA (todas las temporadas) — componente real del sitio (acordeón por etapa; al desplegar
              muestra TODOS los partidos de esa etapa, liga y copa, no solo liga) */}
          {carrera.length > 0 && (
            <section id="s-trayectoria">
              <div className="s-head"><div className="s-title">Trayectoria</div><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
              <div style={{ padding: '0 var(--pad)' }}>
                <Trayectoria carrera={carrera} portero={portero} codjugador={j.codjugador} />
              </div>
            </section>
          )}

          {/* MEJORES ACTUACIONES */}
          <section id="s-partidos">
            <div className="s-head"><div className="s-title">Mejores actuaciones</div><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
            <div>
              {actuaciones.slice(0, 3).map((a: any, i: number) => {
                const { marcador, signo } = marcadorLocalVisitante(a.resultado, a.es_local)
                const col = signo === 'G' ? 'var(--e3)' : signo === 'E' ? 'var(--ink-2)' : 'var(--e0)'
                const g = a.goles ?? 0
                return (
                  <div className="match" key={i}>
                    <div className="m-score" style={{ color: col }}>{marcador}</div>
                    <EscudoBox escudo={a.escudo} nombre={a.equipo_nombre ?? undefined} size={26} radius={4} />
                    <div className="m-mid">
                      <div className="m-riv"><NombreEquipo codequipo={a.rival_cod} nombre={a.rival_nombre} /></div>
                      <div className="m-meta">
                        {a.es_local != null && <IndicadorLocal esLocal={a.es_local} />}
                        <span>{fechaCorta(a.fecha)}{a.jornada != null ? ` · J${a.jornada}` : ''}</span>
                        {g > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--e4)' }}><Balon size={12} />{g > 1 ? `×${g}` : ''}</span>}
                        {a.minutos != null && <span>{a.minutos}&#39;</span>}
                      </div>
                    </div>
                    <div className="m-pts" style={{ background: cPts(Math.round(a.pts)) }}>{Math.round(a.pts)}</div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* HITOS */}
          <section id="s-hitos" style={{ borderBottom: 0 }}>
            <div className="s-head"><div className="s-title">Hitos</div><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
            <div>
              {curados.slice(0, 8).map((h: HitoRow, i: number) => {
                const cfg = HITO_CONFIG[h.tipo_hito]
                const texto = cfg ? cfg.label(h) : h.tipo_hito
                const anio = (h.fecha || '').match(/(\d{4})$/)?.[1]
                const edad = anio && j.anio_nacimiento ? Number(anio) - j.anio_nacimiento : null
                return (
                  <div className="hito" key={i}>
                    <div className="h-dot" />
                    <div>
                      <div className="h-t">{texto}{h.contexto_nombre ? <span style={{ color: 'var(--ink-3)' }}> · {h.contexto_nombre}</span> : ''}</div>
                      <div className="h-m">{fechaCorta(h.fecha)}{edad != null && edad > 0 ? <> · <span className="h-age">{edad} años</span></> : ''}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="foot" style={{ paddingTop: 18 }}>
              <CompartirBtn titulo={`${nombre} · Fútbol11Stats`} variant="btn" />
              <a className="btn" href={`mailto:futbol11stats@gmail.com?subject=${encodeURIComponent(`Corrección en la ficha de ${nombre}`)}&body=${encodeURIComponent(`Jugador: ${nombre} (código ${j.codjugador})\nFicha: ${SITE_URL}/madrid/jugador/${slug}/v2\n\nQué está mal:\n`)}`}>Corregir datos</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
