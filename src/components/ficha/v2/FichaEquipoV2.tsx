import './ficha.css'
import { Fragment, type ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import Sello from '@/components/Sello'
import Pastilla from '@/components/Pastilla'
import NombreEquipo from '@/components/NombreEquipo'
import IndicadorLocal from '@/components/IndicadorLocal'
import LigaPastilla from '@/components/LigaPastilla'
import CopasLinea from '@/components/CopasLinea'
import EloSparkline from '@/components/ficha/EloSparkline'
import JsonLd from '@/components/JsonLd'
import CompartirBtn from '@/components/ficha/v2/CompartirBtn'
import NavSpy from '@/components/ficha/v2/NavSpy'
import CompChips from '@/components/ficha/v2/CompChips'
import JornadasEquipo from '@/components/ficha/v2/JornadasEquipo'
import { TarjetaAmarilla, TarjetaDoble, TarjetaRoja, FlechaEntra, FlechaSale, Promocion } from '@/components/iconos'
import { graphLd, breadcrumbLd, sportsTeamLd } from '@/lib/jsonld'
import { SITE_URL } from '@/lib/seo'
import { escudoUrl, formatNombre } from '@/lib/supabase'
import { jugadorHref } from '@/lib/jugador'
import {
  equipoSlug, tempLabel, LIVE_COD, getGrupoInfo, grupoHref, getEquipoActualInfo,
  fechaCortaDMY, fechaCortaYMD, BADGE, HITO_EQUIPO,
} from '@/lib/equipo'
import {
  getEquipoV2, getTemporadasEquipo, getSerieLiga, getResultadosGrupo, buildJornadasEquipo,
  escudosPorNombre, getMiniClasif, colorMedia, colorElo, colorFan, CORTES_EQUIPO,
  analisisResultados, getTramos, getFacetasGrupo, getPlantillaEquipoV2, getMovimientosEquipo,
  getHitosEquipo, getMediasPorTemporada, type PlantillaEqRow,
} from '@/lib/equipoV2'

const mil = (n: number | null | undefined) => (n == null ? '—' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
const med1 = (v: number | null) => (v == null ? '—' : v.toFixed(1).replace('.', ','))
const conSigno = (n: number) => (n > 0 ? `+${n}` : `${n}`)
const iniciales = (nombre: string) => formatNombre(nombre).split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

export default async function FichaEquipoV2({ cod, temporadaLabel }: { cod: string; temporadaLabel: string | null }) {
  const [e, temporadas] = await Promise.all([getEquipoV2(cod), getTemporadasEquipo(cod)])
  if (!e) notFound()

  const inactivo = Number(e.codtemporada) < Number(LIVE_COD)
  const slug = equipoSlug(e.codequipo, e.nombre)

  // Temporada seleccionada (ruta) o la más reciente.
  const tempSel = (temporadaLabel && temporadas.find((t) => tempLabel(t.codtemporada) === temporadaLabel)?.codtemporada)
    || temporadas[0]?.codtemporada || e.codtemporada || null
  const tempRow = temporadas.find((t) => t.codtemporada === tempSel) || null
  const codgrupoSel = tempRow?.codgrupo ?? (tempSel === e.codtemporada ? e.codgrupo : null)
  const nombreComp = tempRow?.nombre_comp ?? e.nombre_comp ?? null
  const grupoNombre = tempRow?.grupo_nombre ?? e.grupo_nombre ?? null

  const [serie, resultados, equipoInfo, grupoInfo] = await Promise.all([
    getSerieLiga(e.codequipo, codgrupoSel),
    getResultadosGrupo(e.nombre, codgrupoSel),
    inactivo ? Promise.resolve({ copas: [], posicionActual: null }) : getEquipoActualInfo(e.codequipo),
    getGrupoInfo(codgrupoSel),
  ])
  const { copas, posicionActual } = equipoInfo
  const grupoUrl = grupoHref(grupoInfo)

  const jornadas = buildJornadasEquipo(serie, resultados, e.nombre)
  const escMap = await escudosPorNombre(jornadas.map((j) => j.rivalNombre || ''))
  for (const j of jornadas) if (j.rivalNombre) j.rivalEscudo = escMap.get(j.rivalNombre) ?? null

  const mini = await getMiniClasif(codgrupoSel, e.codequipo)

  const [tramos, facetas, plantilla, movs, hitos, mediasTemp] = await Promise.all([
    getTramos(e.codequipo, codgrupoSel),
    getFacetasGrupo(codgrupoSel, e.codequipo),
    getPlantillaEquipoV2(e.codequipo, tempSel),
    getMovimientosEquipo(cod),
    getHitosEquipo(cod),
    getMediasPorTemporada(e.codequipo),
  ])
  const ana = analisisResultados(resultados, e.nombre)
  const anaTot = ana.pj || 1
  const pc = (n: number) => Math.round((n / anaTot) * 100)

  // Plantilla: top por puntos fantasy totales (no por media) + agrupada por líneas (POR/DEF/MED/DEL),
  // dentro de cada línea por minutos.
  const LINEAS = [
    { k: 'POR', nm: 'Porteros', c: '#f0b429' }, { k: 'DEF', nm: 'Defensas', c: '#9ac4f1' },
    { k: 'MED', nm: 'Centrocampistas', c: '#8cefa5' }, { k: 'DEL', nm: 'Delanteros', c: '#f2a3c0' },
  ] as const
  const topPlantilla = [...plantilla].filter((p) => p.pts != null).sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0)).slice(0, 5)
  const maxMin = Math.max(1, ...plantilla.map((p) => p.minutos))
  const porLinea = LINEAS.map((L) => ({ ...L, jug: plantilla.filter((p) => p.linea === L.k).sort((a, b) => b.minutos - a.minutos) })).filter((L) => L.jug.length)

  // Últimos 3 partidos jugados (de la serie del gráfico, con fantasy de esa jornada).
  const ultimos = jornadas.filter((j) => j.fan != null && j.marcador).slice(-3).reverse()

  // Donut de balance V/E/D.
  const donutTot = ana.v + ana.e + ana.d || 1
  const R = 40, CIRC = 2 * Math.PI * R, GAP = 3
  let acc = 0
  const donutArcs = ([['V', ana.v, 'var(--e3)'], ['E', ana.e, 'var(--ink-3)'], ['D', ana.d, 'var(--e0)']] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n, col]) => {
      const len = (n / donutTot) * CIRC, dash = Math.max(len - GAP, 1)
      const a = { k, n, col, dash, rest: CIRC - dash, offset: -acc }
      acc += len
      return a
    })
  const maxTramo = Math.max(1, ...tramos.flatMap((t) => [t.gf, t.gc]))
  const facetaTiles: Array<[number | null, string]> = [
    [facetas.gf, 'GF'], [facetas.gc, 'GC'], [facetas.ptsFan, 'Pts F.'], [e.posicion_juego_limpio ?? null, 'Juego limpio'],
  ]
  const BADGE_CLS: Record<string, string> = { CAMPEON: 'camp', ASCENSO: 'asc', DESCENSO: 'desc', PLAYOFF: 'po' }

  // KPIs (temporada seleccionada): de la última fila de la serie de clasificación.
  const ult = serie.length ? serie[serie.length - 1] : null
  const posSel = ult?.pos ?? (tempRow?.posicion_final ?? posicionActual ?? null)
  const ptsSel = ult?.pts ?? tempRow?.pts ?? null
  const gfSel = ult?.gf ?? tempRow?.gf ?? null
  const gcSel = ult?.gc ?? tempRow?.gc ?? null
  const dgSel = gfSel != null && gcSel != null ? gfSel - gcSel : null
  const mediaFan = ult && ult.pts_fantasy != null && ult.pj ? ult.pts_fantasy / ult.pj : null
  const eloCierre = ult?.elo ?? e.elo_actual ?? null   // ELO de cierre de la temporada (KpiBar)
  const eloActual = e.elo_actual ?? eloCierre           // ELO actual (Nivel)

  const tempTxt = tempSel ? tempLabel(tempSel) : ''
  const echoTxt = [tempTxt, nombreComp].filter(Boolean).join(' · ')

  // Serie de ELO para el sparkline (cierre por temporada) — mismo formato {t,elo} que la ficha actual.
  const eloSerie = (e.elo_serie || []).filter((p): p is { t: string; elo: number } => !!p && typeof p.elo === 'number')

  // Deportividad: td_total puede venir NULL hasta que el pipeline lo pueble -> 0, sin fallback.
  const disc: Array<[ReactNode, number, string]> = [
    [<span style={{ color: 'var(--card-y)', display: 'flex' }} key="ta"><TarjetaAmarilla size={12} /></span>, e.ta_total ?? 0, 'TA'],
    [<span style={{ color: 'var(--card-y)', display: 'flex' }} key="td"><TarjetaDoble size={13} /></span>, e.td_total ?? 0, '2TA'],
    [<span style={{ color: 'var(--card-r)', display: 'flex' }} key="tr"><TarjetaRoja size={12} /></span>, e.tr_total ?? 0, 'TR'],
  ]

  const secciones = ([
    { id: 's-clasif', label: 'Clasificación', aside: true },
    { id: 's-nivel', label: 'Nivel', aside: true },
    movs.length ? { id: 's-movs', label: 'Movimientos', aside: true } : null,
    jornadas.length ? { id: 's-jornadas', label: 'Jornadas' } : null,
    ana.pj ? { id: 's-analisis', label: 'Análisis' } : null,
    temporadas.length ? { id: 's-temporadas', label: 'Temporadas' } : null,
    plantilla.length ? { id: 's-plantilla', label: 'Plantilla' } : null,
    hitos.length ? { id: 's-hitos', label: 'Hitos' } : null,
  ].filter(Boolean)) as { id: string; label: string; aside?: boolean }[]

  const crumbs = [
    { name: 'Inicio', url: `${SITE_URL}/` },
    { name: 'Equipos', url: `${SITE_URL}/madrid/aficionados` },
    { name: e.nombre, url: `${SITE_URL}/madrid/equipo/${slug}/v2` },
  ]

  return (
    <div className="fjv2">
      <JsonLd data={graphLd(breadcrumbLd(crumbs), sportsTeamLd({ name: e.nombre, url: `${SITE_URL}/madrid/equipo/${slug}`, logo: escudoUrl(e.escudo), competicion: nombreComp }))} />

      {/* HERO */}
      <div className="hero">
        <div className="hero-top">
          {escudoUrl(e.escudo)
            ? <EscudoBox escudo={e.escudo} nombre={e.nombre} size={70} radius={14} />
            : <div className="avatar" style={{ background: 'var(--pitch-700)', color: 'var(--ink-2)' }}>{(e.nombre || '').slice(0, 3).toUpperCase()}</div>}
          <div className="hero-name">
            {/* club_root en el dato es un CÓDIGO interno ("C:00..."), no un nombre de club legible -> no se muestra. */}
            <div className="last">{e.nombre}</div>
          </div>
          <CompartirBtn titulo={`${e.nombre} · Fútbol11Stats`} variant="icon" />
        </div>
        <div className="hero-pills">
          {nombreComp && (
            <LigaPastilla nombreComp={nombreComp}
              segments={[nombreComp, grupoNombre, inactivo || posSel == null ? null : `${posSel}º`]}
              href={grupoUrl} muted={inactivo} />
          )}
          <CopasLinea copas={copas} />
          {e.temporada_elo_max && <span className="pill n">ELO máx {mil(e.elo_max)} · {tempLabel(e.temporada_elo_max)}</span>}
        </div>
      </div>

      {/* KPIs — 5 columnas fijas (Pos·Pts·DG·Media F.·ELO). */}
      <div className="kpis kpis-eq">
        <div className="kpi"><div className="v num">{posSel != null ? `${posSel}º` : '—'}</div><div className="k">Pos</div></div>
        <div className="kpi"><div className="v num">{mil(ptsSel)}</div><div className="k">Pts</div></div>
        <div className="kpi"><div className="v num">{dgSel != null ? conSigno(dgSel) : '—'}</div><div className="k">DG</div></div>
        <div className="kpi"><div className="v num" style={{ color: colorMedia(mediaFan) }}>{med1(mediaFan)}</div><div className="k">Media F.</div></div>
        <div className="kpi"><div className="v num" style={{ color: colorElo(eloCierre) }}>{mil(eloCierre)}</div><div className="k">ELO</div></div>
      </div>

      {/* SCOPE */}
      <div className="scope">
        <div className="scope-lbl">Temporada</div>
        <div className="track"><div className="rail">
          {temporadas.map((t) => (
            <Link key={t.codtemporada} href={`/madrid/equipo/${slug}/${tempLabel(t.codtemporada)}/v2`} className={t.codtemporada === tempSel ? 'on' : ''}>{tempLabel(t.codtemporada)}</Link>
          ))}
        </div></div>
        {nombreComp && <>
          <div className="scope-lbl" style={{ paddingTop: 11 }}>Competición</div>
          <div className="track"><div className="rail"><CompChips comps={[{ label: nombreComp, count: serie.length, sello: <Sello nombreComp={nombreComp} size={18} /> }]} /></div></div>
        </>}
        <div className="scope-note">Las secciones marcadas «Todas las temporadas» no dependen de esta selección.</div>
      </div>

      <NavSpy secciones={secciones} />

      <div className="layout">
        <div className="aside">
          {/* CLASIFICACIÓN */}
          <section id="s-clasif">
            <div className="s-head"><div className="s-title">Clasificación</div><div className="s-sub">{echoTxt}</div></div>
            {mini.filas.length > 0 ? (
              <>
                <div className="mini">
                  {mini.filas.map((r) => (
                    <div key={r.codequipo} className={`mini-r${r.me ? ' me' : ''}`}>
                      <div className="mp">{r.pos}</div>
                      <EscudoBox escudo={r.escudo} nombre={r.nombre} size={22} radius={4} />
                      <div className="mn">{r.me ? r.nombre : <NombreEquipo codequipo={r.codequipo} nombre={r.nombre} />}</div>
                      <div className="mpts num">{r.pts}</div>
                    </div>
                  ))}
                </div>
                {grupoUrl && <div style={{ padding: '12px var(--pad) 0' }}><Link className="btn" href={grupoUrl}>Ver clasificación completa</Link></div>}
              </>
            ) : <p style={{ padding: '0 var(--pad)', color: 'var(--ink-3)', fontSize: 'var(--t-sm)' }}>Sin clasificación en esta temporada.</p>}
          </section>

          {/* NIVEL */}
          <section id="s-nivel">
            <div className="s-head"><div className="s-title">Nivel</div><div className="s-sub"><span className="allscope">Situación actual</span></div></div>
            <div className="box">
              <div className="elo-top">
                <div><div className="cap">ELO F11S</div><div className="elo-v" style={{ color: colorElo(eloActual) }}>{mil(eloActual)}</div></div>
                {posSel != null && <div style={{ textAlign: 'right' }}><div className="cap">En su grupo</div><div className="elo-v" style={{ color: colorElo(eloActual) }}>{posSel}º</div></div>}
              </div>
              {/* Percentil/batería degradados: web_percentiles no tiene métricas de equipo. */}
              {eloSerie.length > 1 && <EloSparkline serie={eloSerie} className="w-full h-9 mt-3" />}
              <div className="batt-lbl" style={{ marginTop: 12 }}>El ELO mide la fuerza del equipo; su histórico se ve arriba. Los percentiles por categoría aún no están disponibles para equipos.</div>
            </div>

            {/* DEPORTIVIDAD */}
            <div className="box">
              <div className="cap">Deportividad</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 7 }}>
                {e.posicion_juego_limpio != null
                  ? <div className="elo-v" style={{ fontSize: 'var(--n-md)', color: 'var(--e3)' }}>{e.posicion_juego_limpio}º</div>
                  : <div className="elo-v" style={{ fontSize: 'var(--n-md)', color: 'var(--ink-3)' }}>—</div>}
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  {disc.map(([ic, n, k]) => (
                    <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{ic}<b className="num" style={{ fontSize: 'var(--n-sm)' }}>{mil(n)}</b></span>
                  ))}
                </div>
              </div>
              <div className="batt-lbl">Puesto de juego limpio en el grupo</div>
            </div>
          </section>

          {/* MOVIMIENTOS */}
          {movs.length > 0 && (
            <section id="s-movs">
              <div className="s-head"><div className="s-title">Movimientos</div><div className="s-sub"><span className="allscope">Recientes</span></div></div>
              <div>
                {movs.slice(0, 8).map((m: any, i: number) => {
                  const prom = m.clase === 'PROMOCION_INTERNA'
                  const alta = !prom && m.direccion === 'entra'
                  const cls = prom ? 'prom' : alta ? 'alta' : 'baja'
                  const ic = prom ? <Promocion size={13} /> : alta ? <FlechaEntra size={13} /> : <FlechaSale size={13} />
                  const nm = formatNombre(m.nombre)
                  const fecha = fechaCortaYMD(m.fecha)
                  const sub = prom ? `Promoción interna${fecha ? ` · ${fecha}` : ''}`
                    : alta ? `Ficha${m.equipo_rel_nombre ? ` del ${m.equipo_rel_nombre}` : ''}${fecha ? ` · ${fecha}` : ''}`
                      : `${m.equipo_rel_nombre ? `Al ${m.equipo_rel_nombre}` : 'Baja'}${fecha ? ` · ${fecha}` : ''}`
                  return (
                    <div className="mv" key={i}>
                      <div className={`mv-ic ${cls}`}>{ic}</div>
                      <div className="mv-m">
                        <div className="mv-n">{m.codjugador ? <Link href={jugadorHref(m.codjugador, m.nombre)}>{nm}</Link> : nm}</div>
                        <div className="mv-sub">{sub}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        <div className="main">
          {/* JORNADAS */}
          <section id="s-jornadas">
            <div className="s-head"><div className="s-title">Puntos por jornada</div><div className="s-sub">{echoTxt}</div></div>
            {jornadas.length > 0
              ? <JornadasEquipo comps={[{ label: nombreComp || 'Liga', jornadas }]} cortes={CORTES_EQUIPO.fanJornada} />
              : <p style={{ padding: '0 var(--pad)', color: 'var(--ink-3)', fontSize: 'var(--t-sm)' }}>Sin partidos en esta temporada.</p>}
          </section>

          {/* ANÁLISIS */}
          {ana.pj > 0 && (
            <section id="s-analisis">
              <div className="s-head"><div className="s-title">Análisis</div><div className="s-sub">{echoTxt}</div></div>
              <div className="box">
                <div className="donut-row">
                  <div className="donut">
                    <svg viewBox="0 0 104 104" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <circle cx="52" cy="52" r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="14" />
                      {donutArcs.map((a, i) => <circle key={i} cx="52" cy="52" r={R} fill="none" stroke={a.col} strokeWidth="14" strokeDasharray={`${a.dash} ${a.rest}`} strokeDashoffset={a.offset} />)}
                    </svg>
                    <div className="donut-mid"><div className="donut-pc num">{pc(ana.v)}%</div><div className="donut-lb">VICTORIAS</div></div>
                  </div>
                  <div className="ved-lg">
                    {([['Victorias', ana.v, 'var(--e3)'], ['Empates', ana.e, 'var(--ink-3)'], ['Derrotas', ana.d, 'var(--e0)']] as const).map(([nm, n, col]) => (
                      <div className="ved-r" key={nm}><span className="ved-dot" style={{ background: col }} /><span className="ved-nm">{nm}</span><span className="ved-n num" style={{ color: col }}>{n}</span><span className="ved-p num">{pc(n)}%</span></div>
                    ))}
                    <div className="ved-r"><span className="ved-dot" style={{ background: 'transparent' }} /><span className="ved-nm">Puntos por partido</span><span className="ved-n num">{(ana.pj ? (ana.v * 3 + ana.e) / ana.pj : 0).toFixed(2).replace('.', ',')}</span><span className="ved-p" /></div>
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--line-2)' }}>
                  <div className="cap" style={{ marginBottom: 5 }}>Por contexto</div>
                  {([['Casa', ana.casa, true], ['Fuera', ana.fuera, false]] as const).map(([k, s, loc]) => {
                    const t = s.v + s.e + s.d || 1, p = Math.round(s.v / t * 100)
                    return (
                      <div className="ctx-row" key={k}>
                        <div className="ctx-cl"><IndicadorLocal esLocal={loc} />{k}</div>
                        <div className="ctx-bar">
                          {s.v > 0 && <span style={{ flex: s.v, background: 'var(--e3)' }}>{s.v}</span>}
                          {s.e > 0 && <span style={{ flex: s.e, background: 'var(--ink-3)', color: '#0a1628' }}>{s.e}</span>}
                          {s.d > 0 && <span style={{ flex: s.d, background: 'var(--e0)', color: '#0a1628' }}>{s.d}</span>}
                        </div>
                        <div className="ctx-pc num" style={{ color: p >= 50 ? 'var(--e3)' : p >= 30 ? 'var(--ink-2)' : 'var(--e0)' }}>{p}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {tramos.length > 0 && (
                <div className="box">
                  <div className="tramo-head"><div className="th">◀ Encajados</div><div className="th-mid" /><div className="th r">Marcados ▶</div></div>
                  {tramos.map((t) => (
                    <div className="tramo" key={t.tramo}>
                      <div className="tramo-side gc">{t.gc > 0 && <div className="tramo-b gc" style={{ width: `${t.gc / maxTramo * 100}%` }}>{t.gc}</div>}</div>
                      <div className="tramo-lbl">{t.tramo}{t.tramo !== '90+' ? "'" : ''}</div>
                      <div className="tramo-side">{t.gf > 0 && <div className="tramo-b gf" style={{ width: `${t.gf / maxTramo * 100}%` }}>{t.gf}</div>}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="split">
                {([['Casa', ana.casa, true], ['Fuera', ana.fuera, false]] as const).map(([k, s, loc]) => (
                  <div className="sp" key={k}>
                    <div className="sp-h"><IndicadorLocal esLocal={loc} />{k}</div>
                    <div className="sp-n"><div><b className="num">{s.gf}</b>GF</div><div><b className="num">{s.gc}</b>GC</div><div><b className="num">{s.pj ? (s.gf / s.pj).toFixed(1).replace('.', ',') : '—'}</b>GF/PJ</div></div>
                  </div>
                ))}
              </div>
              {facetas.n > 0 && (
                <div className="box">
                  <div className="cap" style={{ marginBottom: 9 }}>Ranking por faceta · en su grupo</div>
                  <div className="ranks" style={{ marginTop: 0, gridTemplateColumns: 'repeat(4,1fr)' }}>
                    {facetaTiles.map(([v, k]) => <div className="rk" key={k}><div className="r-v">{v != null ? `${v}º` : '—'}</div><div className="r-k">{k}</div></div>)}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* TEMPORADAS */}
          {temporadas.length > 0 && (
            <section id="s-temporadas">
              <div className="s-head"><div className="s-title">Temporadas</div><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
              <div className="track"><div className="rail" id="seasons">
                {temporadas.map((t, i) => {
                  const mt = mediasTemp[t.codtemporada]
                  const media = mt?.media ?? null, elo = mt?.elo ?? null
                  const badgeCls = t.badge ? BADGE_CLS[t.badge] : null
                  return (
                    <div className="season" key={`${t.codtemporada}-${i}`}>
                      <div className="accent" style={{ background: colorMedia(media) || 'var(--line)' }} />
                      <div className="s-top"><div className="s-yr">{tempLabel(t.codtemporada)}</div></div>
                      <div className="s-cat">{t.nombre_comp}{t.grupo_nombre ? ` · ${t.grupo_nombre}` : ''}</div>
                      <div className="s-duo">
                        <div><div className="d-v" style={{ color: colorMedia(media) }}>{med1(media)}</div><div className="d-k">MEDIA F.</div></div>
                        <div><div className="d-v" style={{ color: colorElo(elo) }}>{mil(elo)}</div><div className="d-k">ELO</div></div>
                      </div>
                      <div className="s-stats"><div><b>{mil(t.pts)}</b>PTS</div><div><b>{mil(t.gf)}</b>GF</div><div><b>{mil(t.gc)}</b>GC</div></div>
                      <div className="s-final"><span className={`badge ${badgeCls || 'neu'}`}>{badgeCls ? (BADGE[t.badge]?.label ?? t.badge) : (t.posicion_final != null ? `${t.posicion_final}º` : '—')}</span></div>
                    </div>
                  )
                })}
              </div></div>
            </section>
          )}

          {/* PLANTILLA + ÚLTIMOS */}
          {plantilla.length > 0 && (
            <section id="s-plantilla">
              <div className="desk-2col">
                <div>
                  <div className="s-head"><div className="s-title">Top de la plantilla</div><div className="s-sub">por puntos fantasy</div></div>
                  <div>
                    {topPlantilla.map((p, i) => (
                      <div className="pl" key={p.codjugador}>
                        <div className="pl-rk">{i + 1}</div>
                        <div className="pl-av">{iniciales(p.nombre)}</div>
                        <div className="pl-mid">
                          <div className="pl-nm"><Link href={jugadorHref(p.codjugador, p.nombre)}>{formatNombre(p.nombre)}</Link></div>
                          <div className="pl-me">{p.pos && <span className="pl-pos"><Pastilla pos={p.pos} size="mini" /></span>}{p.pj} PJ · {p.goles} goles</div>
                        </div>
                        <div className="pl-val" style={{ background: 'var(--e2)' }}>{mil(p.pts)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="s-head" style={{ paddingTop: 20 }}><div className="s-title">Plantilla</div><div className="s-sub">{echoTxt}</div></div>
                  <div>
                    {porLinea.map((L) => (
                      <Fragment key={L.k}>
                        <div className="line-h"><span className="line-lp" style={{ color: L.c, background: `${L.c}26` }}>{L.k}</span><span className="line-ln">{L.nm}</span><span className="num" style={{ fontSize: 'var(--t-body)', color: 'var(--ink-3)' }}>{L.jug.length}</span></div>
                        {L.jug.map((p) => (
                          <div className="pl" key={p.codjugador}>
                            <div className="pl-av">{iniciales(p.nombre)}</div>
                            <div className="pl-mid">
                              <div className="pl-nm"><Link href={jugadorHref(p.codjugador, p.nombre)}>{formatNombre(p.nombre)}</Link></div>
                              <div className="pl-me">{p.pj} PJ · {p.goles} goles</div>
                              <div className="pl-minbar"><span style={{ width: `${p.minutos / maxMin * 100}%`, background: L.c }} /></div>
                            </div>
                            <div className="pl-minv num">{mil(p.minutos)}&#39;</div>
                          </div>
                        ))}
                      </Fragment>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="s-head"><div className="s-title">Últimos partidos</div><div className="s-sub">{echoTxt}</div></div>
                  <div>
                    {ultimos.map((m, i) => {
                      const col = m.signo === 'G' ? 'var(--e3)' : m.signo === 'E' ? 'var(--ink-2)' : 'var(--e0)'
                      return (
                        <div className="pl" key={i}>
                          <div className="num" style={{ fontSize: 'var(--n-sm)', width: 40, textAlign: 'center', color: col, flex: 'none' }}>{m.marcador}</div>
                          <div className="pl-mid">
                            <div className="pl-nm">{m.rivalNombre}</div>
                            <div className="pl-me" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{m.esLocal != null && <IndicadorLocal esLocal={m.esLocal} />}J{m.jornada}</div>
                          </div>
                          <div className="pl-val" style={{ background: m.fan != null ? colorFan(m.fan) : 'var(--pitch-700)' }}>{m.fan}</div>
                        </div>
                      )
                    })}
                    {ultimos.length === 0 && <p style={{ padding: '0 var(--pad)', color: 'var(--ink-3)', fontSize: 'var(--t-sm)' }}>Sin partidos recientes.</p>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* HITOS */}
          {hitos.length > 0 && (
            <section id="s-hitos" style={{ borderBottom: 0 }}>
              <div className="s-head"><div className="s-title">Hitos</div><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
              <div>
                {hitos.slice(0, 8).map((h: any, i: number) => {
                  const cfg = HITO_EQUIPO[h.tipo_hito]
                  const texto = cfg ? cfg.label(h) : h.tipo_hito
                  return (
                    <div className="hito" key={i}>
                      <div className="h-dot" />
                      <div><div className="h-t">{texto}</div><div className="h-m">{fechaCortaDMY(h.fecha) || (h.codtemporada ? tempLabel(h.codtemporada) : '')}</div></div>
                    </div>
                  )
                })}
              </div>
              <div className="foot" style={{ paddingTop: 18 }}>
                <CompartirBtn titulo={`${e.nombre} · Fútbol11Stats`} variant="btn" />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
