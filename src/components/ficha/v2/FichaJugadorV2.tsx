import './ficha.css'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EscudoImg from '@/components/EscudoImg'
import Sello from '@/components/Sello'
import CompartirBtn from '@/components/ficha/v2/CompartirBtn'
import NavSpy from '@/components/ficha/v2/NavSpy'
import CompChips from '@/components/ficha/v2/CompChips'
import Echo from '@/components/ficha/v2/Echo'
import Jornadas from '@/components/ficha/v2/Jornadas'
import {
  Balon, Reloj, Escudo, Estrella, CamisetaHueca, TarjetaAmarilla, TarjetaRoja, Guante,
} from '@/components/iconos'
import { getEquipoActualInfo } from '@/lib/equipo'
import {
  formatNombre, tempLabel, jugadorSlug, jugadorHref, curarHitos, HITO_CONFIG, fechaCorta,
  marcadorLocalVisitante, LIVE_COD, type HitoRow, type CompaneroTop,
} from '@/lib/jugador'
import { CORTES_FIJOS } from '@/lib/escala'
import {
  getJugadorV2, getCarreraV2, getAlertaActual, getAmbitoTemporada, getCortesElo, labelToCod,
  getPartidosTemporada, ventanasForma, racha5DePartidos, splitCasaFuera, balanceEquipo,
  getActuacionesV2, getHitosV2, alertaHumana, tienePorteriaDato,
  type CarreraRow,
} from '@/lib/jugadorV2'

const PAL = ['#f87171', '#94a3b8', '#22a050', '#2ee56b', '#8cf0a2']
function esc(v: number, c: readonly [number, number, number, number]) { if (v < 0) return 0; let n = 1; for (let i = 0; i < 4; i++) if (v >= c[i]) n = i + 1; return n }
const mil = (n: number | null | undefined) => (n == null ? '—' : Number(n).toLocaleString('es-ES'))
const med1 = (v: number) => v.toFixed(1).replace('.', ',')

export default async function FichaJugadorV2({ cod, temporadaLabel }: { cod: string; temporadaLabel: string | null }) {
  const [j, carrera] = await Promise.all([getJugadorV2(cod), getCarreraV2(cod)])
  if (!j) notFound()

  const rawNombre = j.nombre || ''
  const apellidos = (rawNombre.split(',')[0] || '').trim().toUpperCase()
  const pila = ((rawNombre.split(',')[1] || '').trim() || apellidos).toUpperCase()
  const nombre = formatNombre(j.nombre)
  const ini = ((pila[0] || '') + (apellidos[0] || '')).toUpperCase()
  const slug = jugadorSlug(j.codjugador, j.nombre)
  const inactivo = Number(j.codtemporada_ultima) < Number(LIVE_COD)

  const temporadas = Array.from(new Set(carrera.map((c) => c.codtemporada)))
  const codPedido = labelToCod(temporadaLabel)
  const tempSel = (codPedido && temporadas.includes(codPedido)) ? codPedido : (carrera[0]?.codtemporada ?? null)
  const etapas = carrera.filter((c) => c.codtemporada === tempSel)
  const etapaPrincipal: CarreraRow | undefined = etapas[0]
  const categoriaSel = etapaPrincipal?.nombre_comp ?? j.categoria_rama ?? null

  const sum = (f: (c: CarreraRow) => number | null) => etapas.reduce((s, c) => s + (f(c) ?? 0), 0)
  const pj = sum((c) => c.pj), golesT = sum((c) => c.goles), ptsF = sum((c) => c.pts_fantasy)
  const media = pj > 0 ? ptsF / pj : null
  const eloSel = etapaPrincipal?.elo_final ?? j.elo_actual ?? null

  const [equipoInfo, cortesElo, alerta, comps, partidosTemp, actuaciones, hitosRaw, hayP0] = await Promise.all([
    inactivo ? Promise.resolve({ copas: [], posicionActual: null }) : getEquipoActualInfo(j.codequipo_actual),
    getCortesElo(categoriaSel, tempSel ? Number(tempSel) : null),
    getAlertaActual(cod),
    tempSel ? getAmbitoTemporada(cod, tempSel) : Promise.resolve([]),
    tempSel ? getPartidosTemporada(cod, tempSel) : Promise.resolve([] as any[]),
    getActuacionesV2(cod),
    getHitosV2(cod),
    tienePorteriaDato(cod),
  ])

  const cMed = (v: number | null) => (v == null ? '' : PAL[esc(v, CORTES_FIJOS.mediaPartido)])
  const cElo = (v: number | null) => (v == null ? '' : PAL[esc(v, cortesElo)])
  const cPts = (v: number) => PAL[esc(v, CORTES_FIJOS.puntosPartido)]

  const ventanas = ventanasForma(partidosTemp)
  const racha = racha5DePartidos(partidosTemp)
  const split = splitCasaFuera(partidosTemp)
  const balance = await balanceEquipo(partidosTemp)
  const { curados } = curarHitos(hitosRaw)
  const companeros = (j.companeros_top || []).slice(0, 5)
  const compNames = comps.map((c) => c.nombre_comp)
  const ligaCod = comps[0]?.codgrupo

  // Percentil: floor (rank 358/38.173 -> 99, no 100). Batería: min(10, round(pct/10)).
  const pct = j.elo_percentil != null ? Math.floor(j.elo_percentil) : null
  const llenos = pct != null ? Math.min(10, Math.round(pct / 10)) : 0
  const eloBig = j.elo_actual ?? eloSel

  const dorsalesOtros = (j.dorsales_otros || []).filter((d) => d !== j.dorsal_ultimo && d !== j.dorsal_comun)
  const amarillasTot = carrera.reduce((s, c) => s + (c.tarjetas_amarillas ?? 0), 0)
  const rojasTot = carrera.reduce((s, c) => s + (c.tarjetas_rojas ?? 0), 0)

  const cuentaTemp = new Map<string, number>()
  for (const c of carrera) cuentaTemp.set(c.codtemporada, (cuentaTemp.get(c.codtemporada) ?? 0) + 1)

  const tempTxt = tempSel ? tempLabel(tempSel) : ''
  const alertaTxt = alertaHumana(alerta)

  const secciones = [
    { id: 's-jornadas', label: 'Jornadas' }, { id: 's-forma', label: 'Forma' }, { id: 's-analisis', label: 'Análisis' },
    { id: 's-nivel', label: 'Nivel' }, { id: 's-totales', label: 'Totales' }, { id: 's-temporadas', label: 'Temporadas' },
    { id: 's-partidos', label: 'Partidos' }, { id: 's-hitos', label: 'Hitos' }, { id: 's-mates', label: 'Compañeros' },
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

  const totales: Array<[ReactNode, string, string]> = [
    [<Escudo size={13} key="i" />, mil(j.pj_total), 'PJ'],
    [<Reloj size={13} key="i" />, mil(j.minutos_total), 'Min'],
    [<Balon size={13} key="i" />, mil(j.goles_total), 'Goles'],
    [<Estrella size={13} key="i" />, mil(j.titular_total), 'Titular'],
    [<CamisetaHueca size={13} key="i" />, mil(j.suplente_total), 'Supl.'],
    [<span style={{ color: 'var(--card-y)', display: 'flex' }} key="i"><TarjetaAmarilla size={11} /></span>, mil(amarillasTot), 'TA'],
    [<span style={{ color: 'var(--card-r)', display: 'flex' }} key="i"><TarjetaRoja size={11} /></span>, mil(rojasTot), 'TR'],
  ]
  if (hayP0) totales.push([<Guante size={13} key="i" />, mil(j.porterias_cero_total), 'P. a 0'])

  const RC: Record<string, string> = { G: 'var(--e3)', E: 'var(--ink-3)', P: 'var(--e0)' }

  return (
    <div className="fjv2">
      {/* 1 · HERO */}
      <div className="hero">
        <div className="hero-top">
          <div className="avatar">{ini}{j.dorsal_ultimo != null && <div className="dorsal">{j.dorsal_ultimo}</div>}</div>
          <div className="hero-name">
            <div className="first">{pila}</div>
            <div className="last">{apellidos}</div>
          </div>
          <CompartirBtn titulo={`${nombre} · Fútbol11Stats`} variant="icon" />
        </div>
        <div className="hero-pills">
          {j.posicion_pastilla && <span className="pill pos">{j.posicion_pastilla}{j.posicion_es_estimada ? ' · est' : ''}</span>}
          {j.edad != null && <span className="pill n">{j.edad} años</span>}
          {j.equipo_actual_nombre && <span className="pill n">{j.equipo_actual_nombre.toUpperCase()}</span>}
          {etapaPrincipal?.nombre_comp && <span className="pill liga">{etapaPrincipal.nombre_comp}{etapaPrincipal.grupo_nombre ? ` · ${etapaPrincipal.grupo_nombre}` : ''}</span>}
          {comps.filter((c) => c.codgrupo !== ligaCod).map((c) => <span className="pill n" key={c.codgrupo}>{c.nombre_comp.toUpperCase()}</span>)}
        </div>
        {alertaTxt && (
          <div className="alert">
            <span style={{ color: 'var(--card-y)', display: 'flex' }}><TarjetaAmarilla size={13} /></span>
            <span dangerouslySetInnerHTML={{ __html: alertaTxt }} />
          </div>
        )}
      </div>

      {/* 2 · KPIs */}
      <div className="kpis">
        <div className="kpi"><div className="v num">{mil(pj)}</div><div className="k">PJ</div></div>
        <div className="kpi"><div className="v num">{mil(golesT)}</div><div className="k">Goles</div></div>
        <div className="kpi"><div className="v num">{mil(Math.round(ptsF))}</div><div className="k">Pts F.</div></div>
        <div className="kpi"><div className="v num" style={{ color: cMed(media) }}>{media != null ? med1(media) : '—'}</div><div className="k">Media</div></div>
        <div className="kpi"><div className="v num" style={{ color: cElo(eloSel) }}>{eloSel != null ? mil(Math.round(eloSel)) : '—'}</div><div className="k">ELO</div></div>
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
          <div className="track"><div className="rail"><CompChips comps={comps.map((c) => ({ label: c.nombre_comp, count: c.jornadas.length }))} /></div></div>
        </>}
        <div className="scope-note">Las secciones marcadas «Todas las temporadas» no dependen de esta selección.</div>
      </div>

      {/* NAV */}
      <NavSpy secciones={secciones} />

      <div className="layout">
        <div className="aside">
          {/* NIVEL */}
          <section id="s-nivel">
            <div className="s-head"><div className="s-title">Nivel</div><div className="s-sub"><Echo temporada={tempTxt} comps={compNames} /></div></div>
            <div className="box">
              <div className="elo-top">
                <div><div className="cap">ELO F11S</div><div className="elo-v" style={{ color: cElo(eloBig) }}>{eloBig != null ? mil(Math.round(eloBig)) : '—'}</div></div>
                <div style={{ textAlign: 'right' }}><div className="cap">Percentil</div><div className="elo-v" style={{ color: cElo(eloBig) }}>{pct != null ? pct : '—'}</div></div>
              </div>
              <div className="batt">{Array.from({ length: 10 }).map((_, i) => <i key={i} style={i < llenos ? { background: cElo(eloBig) } : undefined} />)}</div>
              {pct != null && <div className="batt-lbl">Mejor que el <b>{pct} %</b> de los jugadores de su categoría</div>}
              <div className="ranks">
                <div className="rk"><div className="r-v">{j.rank_categoria ? `${j.rank_categoria}º` : '—'}</div><div className="r-k">Categoría</div></div>
                <div className="rk"><div className="r-v">{j.rank_posicion ? `${j.rank_posicion}º` : '—'}</div><div className="r-k">Posición</div></div>
                <div className="rk"><div className="r-v">{j.rank_general ? `${mil(j.rank_general)}º` : '—'}</div><div className="r-k">Madrid</div></div>
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
              <div className="s-head"><div className="s-title">Ha jugado con</div><div className="s-sub">top 5 por ELO</div></div>
              <div className="track"><div className="rail">
                {companeros.map((c: CompaneroTop) => {
                  const nm = formatNombre(c.nombre)
                  const mi = nm.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
                  return (
                    <Link key={c.codjugador} href={jugadorHref(c.codjugador, c.nombre)} className="mate">
                      <div className="m-av">{c.escudo_actual ? <EscudoImg escudo={c.escudo_actual} nombre={c.equipo_actual ?? undefined} /> : mi}</div>
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
              {filaBalance('Con él', `${balance.con.pj} partidos`, balance.con, true)}
              {filaBalance('Sin él', `${balance.sin.pj} partidos`, balance.sin, false)}
              <div style={balance.suficiente
                ? { marginTop: 11, padding: '9px 11px', borderRadius: 8, fontSize: 'var(--t-sm)', lineHeight: 1.5, background: 'rgba(46,229,107,.09)', border: '1px solid rgba(46,229,107,.24)', color: '#b7f5cb' }
                : { marginTop: 11, padding: '9px 11px', borderRadius: 8, fontSize: 'var(--t-sm)', lineHeight: 1.5, background: 'rgba(255,255,255,.04)', border: '1px solid var(--line)', color: 'var(--ink-3)' }}>
                {balance.suficiente
                  ? <>El equipo gana el <b>{balance.con.pj ? Math.round(balance.con.pg / balance.con.pj * 100) : 0} %</b> con él y el <b>{balance.sin.pj ? Math.round(balance.sin.pg / balance.sin.pj * 100) : 0} %</b> sin él.</>
                  : <>Muestra insuficiente (con él <b style={{ color: 'var(--ink-2)' }}>{balance.con.pj}</b> · sin él <b style={{ color: 'var(--ink-2)' }}>{balance.sin.pj}</b>; hacen falta 8 por lado). Este bloque no se publicaría.</>}
              </div>
              <div style={{ marginTop: 8, fontSize: 'var(--t-cap)', color: 'var(--ink-3)', lineHeight: 1.5 }}>
                Balance del equipo, no medida de impacto. Solo se publica con 8 partidos o más en cada lado.
              </div>
            </div>
            {split.hayLocal && (
              <div className="windows" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {([['Casa', split.casa], ['Fuera', split.fuera]] as const).map(([k, s]) => (
                  <div className="win" key={k}>
                    <div className="w-k">{k}</div>
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
                      <div className="s-crest">{c.escudo ? <EscudoImg escudo={c.escudo} nombre={c.equipo_nombre ?? undefined} /> : null}</div>
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
                    <div className="m-mid">
                      <div className="m-riv">{a.rival_nombre}</div>
                      <div className="m-meta">
                        <span>{fechaCorta(a.fecha)}</span>
                        {g > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--e4)' }}><Balon size={12} />{g > 1 ? `×${g}` : ''}</span>}
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
              <a className="btn" href={`mailto:futbol11stats@gmail.com?subject=${encodeURIComponent(`Corrección en la ficha de ${nombre}`)}`}>Corregir datos</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
