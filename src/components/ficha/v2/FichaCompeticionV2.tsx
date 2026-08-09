import './ficha.css'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Sello from '@/components/Sello'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreEquipo from '@/components/NombreEquipo'
import NombreJugador from '@/components/NombreJugador'
import { Escudo, Calendario, Balon, Guante, Casa, Avion, TarjetaAmarilla, TarjetaDoble, TarjetaRoja, Guion } from '@/components/iconos'
import { nombreOficial, denominacion, familiaSello } from '@/lib/sellos'
import { ensureMadrid } from '@/lib/seo'
import { LIVE_COD, fechaCortaDMY } from '@/lib/equipo'
import { colorElo } from '@/lib/equipoV2'
import { fichasInfo } from '@/lib/jugador'
import { ZONA_BG, ZONA_LEYENDA, ARRASTRE_TIPOS } from '@/components/tablas'
import { type Ronda } from '@/lib/competiciones'
import RankingComp, { type RankItem } from '@/components/ficha/v2/RankingComp'
import CarreraPosiciones from '@/components/ficha/v2/CarreraPosiciones'
import {
  TEMPORADA_MAP, COD_TO_LABEL, TEMPORADAS_ORD, getGrupoV2, getVariantesV2, getGruposHermanos,
  getClasifV2, kpisDeClasif, zonaColor, FORMA_COL, type ClasifCompRow,
  getDestacadosV2, getEquiposFormaV2, getTopTemporadaV2, getXiJornadaV2, getXiTemporadaV2, colorMediaJug,
  getResultadosV2, getEquiposMapV2, type ResultadoCompRow, getCarreraV2,
  getLideresV2, getCifrasV2, type CifrasComp, golesEquipoJornada, type GolEquipoRow,
} from '@/lib/competicionV2'

const mil = (n: number | null | undefined) => (n == null ? '—' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
const med1 = (v: number | null) => (v == null ? '—' : v.toFixed(1).replace('.', ','))
const fmt2 = (v: number | null | undefined) => (v == null ? '—' : Number(v).toFixed(2).replace('.', ','))

// Pestañas por modo (ids de URL heredados). Copa degrada (sin clasificación ni Top-5 Equipos).
const TABS_JORNADA_LIGA = [
  ['clasificacion', 'Clasificación'], ['resultados', 'Resultados'], ['goleadores-jornada', 'Goleadores'],
  ['tarjetas-jornada', 'Tarjetas'], ['top5-jugadores-jornada', 'Top 5 Jugadores'],
  ['top5-equipos-jornada', 'Top 5 Equipos'], ['once-optimo-jornada', 'XI Óptimo'],
] as const
const TABS_JORNADA_COPA = [
  ['resultados', 'Resultados'], ['goleadores-jornada', 'Goleadores'], ['tarjetas-jornada', 'Tarjetas'],
  ['top5-jugadores-jornada', 'Top 5 Jugadores'], ['once-optimo-jornada', 'XI Óptimo'],
] as const
const TABS_TEMP_LIGA = [
  ['top10-goleadores-temporada', 'Goleadores'], ['top10-porteros-temporada', 'Porteros'],
  ['top10-tarjetas-temporada', 'Tarjetas'], ['top10-fantasy-temporada', 'Fantasy'],
  ['top10-elo-jugadores-temporada', 'ELO'], ['once-optimo-temporada', 'XI Óptimo'],
  ['estadisticas', 'Estadísticas'],
] as const
const TABS_TEMP_COPA = [
  ['top10-goleadores-temporada', 'Goleadores'], ['top10-porteros-temporada', 'Porteros'],
  ['top10-tarjetas-temporada', 'Tarjetas'], ['top10-fantasy-temporada', 'Fantasy'],
  ['once-optimo-temporada', 'XI Óptimo'],
] as const
const TEMP_IDS = new Set<string>([...TABS_TEMP_LIGA, ...TABS_TEMP_COPA].map((t) => t[0]))

const badge11 = <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#1a7a3c', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, color: '#fff', fontSize: 11, lineHeight: 1 }}>11</span>

// XI Óptimo sobre campo: colores por demarcación (maqueta) + formación deducida contando posiciones.
const POSC: Record<string, string> = { POR: '#f0b429', DEF: '#9ac4f1', MED: '#8cefa5', DEL: '#f2a3c0' }
const LINE_Y: Record<string, number> = { POR: 88, DEF: 70, MED: 48, DEL: 24 }
const iniXI = (n: string) => (n || '').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
function campoXI(players: { posicion: string; nombre: string; valor: number | string }[]) {
  const byLine: Record<string, typeof players> = { POR: [], DEF: [], MED: [], DEL: [] }
  players.forEach((p) => { (byLine[p.posicion] || byLine.MED).push(p) })
  const dots: ReactNode[] = []
  ;(['POR', 'DEF', 'MED', 'DEL'] as const).forEach((line) => {
    const arr = byLine[line], k = arr.length
    arr.forEach((p, i) => {
      const x = k === 1 ? 50 : ((i + 1) / (k + 1)) * 100
      const col = POSC[line] || '#9ac4f1'
      dots.push(
        <div className="xi-p" style={{ left: `${x}%`, top: `${LINE_Y[line]}%` }} key={`${line}-${i}`}>
          <div className="av" style={{ background: col }}>{iniXI(p.nombre)}</div>
          <div className="nm">{(p.nombre || '').split(/\s+/).slice(-1)[0]}</div>
          <div className="vv" style={{ color: col }}>{p.valor}</div>
        </div>,
      )
    })
  })
  return (
    <div className="pitch">
      <div className="ln" style={{ left: '5%', right: '5%', top: '2%', bottom: '2%', borderRadius: 6 }} />
      <div className="ln" style={{ left: '5%', right: '5%', top: '50%', height: 0 }} />
      <div className="ln" style={{ left: '28%', width: '44%', top: '2%', height: '14%' }} />
      <div className="ln" style={{ left: '28%', width: '44%', bottom: '2%', height: '14%' }} />
      <div className="ln" style={{ left: '36%', width: '28%', top: '39%', height: '22%', borderRadius: '50%' }} />
      {dots}
    </div>
  )
}

// Tarjeta de líder (dos plantas): valor grande + unidad arriba; bajo un filete, el jugador con avatar,
// escudo del equipo, nombre (enlazado) y equipo. Así un "1.284" no compite con el nombre.
function lidCard(label: string, icon: ReactNode, color: string, val: ReactNode, unit: string, j: any, fichas: { has(k: string): boolean } | null) {
  if (!j || val == null) return null
  return (
    <div className="lider" key={label}>
      <div className="lh"><span style={{ color, display: 'flex' }}>{icon}</span>{label}</div>
      <div className="lv"><span className="big" style={{ color }}>{val}</span><span className="u">{unit}</span></div>
      <div className="lb">
        <div className="lav">{iniXI(j.nombre)}</div>
        <EscudoBox escudo={j.escudo} nombre={j.nombre_equipo} size={22} radius={5} />
        <div style={{ minWidth: 0 }}>
          <div className="lnm"><NombreJugador codjugador={j.codjugador} nombre={j.nombre} fichas={fichas} /></div>
          <div className="leqn">{j.nombre_equipo}</div>
        </div>
      </div>
    </div>
  )
}

export default async function FichaCompeticionV2({ categoria, slugComp, slugGrupo, temporada, jornadaSeg, tab }: {
  categoria: string; slugComp: string; slugGrupo: string; temporada: string; jornadaSeg: string; tab: string
}) {
  const codtemporada = TEMPORADA_MAP[temporada]
  if (!codtemporada) notFound()
  const grupo = await getGrupoV2(categoria, slugComp, slugGrupo, codtemporada)
  if (!grupo) notFound()

  const isCopa = !!grupo.tipo && grupo.tipo !== 'LIGA'
  const rondas: Ronda[] = isCopa && Array.isArray(grupo.rondas) ? grupo.rondas : []
  const esFamilia = rondas.length > 0
  const rondaSel = esFamilia ? (rondas.find((r) => r.slug === jornadaSeg) || rondas.find((r) => r.idx === grupo.jornada_actual) || rondas[rondas.length - 1]) : null
  const jornadaNum = rondaSel ? rondaSel.idx : (parseInt(jornadaSeg.replace('jornada-', '')) || grupo.jornada_actual)
  const segJornada = rondaSel ? rondaSel.slug : `jornada-${jornadaNum}`

  const modo: 'jornada' | 'temporada' = TEMP_IDS.has(tab) ? 'temporada' : 'jornada'
  const tabsJ = isCopa ? TABS_JORNADA_COPA : TABS_JORNADA_LIGA
  const tabsT = isCopa ? TABS_TEMP_COPA : TABS_TEMP_LIGA
  const tabsActivas = modo === 'temporada' ? tabsT : tabsJ
  const tabEf = tabsActivas.some((t) => t[0] === tab) ? tab : tabsActivas[0][0]

  // Clasificación alimenta KPIs + panel; siempre se pide (salvo copa, sin clasificación).
  const clasif: ClasifCompRow[] = isCopa ? [] : await getClasifV2(grupo.codgrupo, codtemporada, jornadaNum)
  const kpis = kpisDeClasif(clasif)
  // Carrera de posiciones (gráfico protagonista) — solo en la pestaña Clasificación.
  const carrera = !isCopa && tabEf === 'clasificacion'
    ? await getCarreraV2(grupo.codgrupo, codtemporada)
    : { series: [], jornadas: [], bands: [] }

  // Aside (siempre): líderes + cifras. En copa (sin clasificación) se degradan a null.
  const [lideres, cifras] = await Promise.all([
    isCopa ? Promise.resolve(null) : getLideresV2(grupo.codgrupo, codtemporada),
    isCopa ? Promise.resolve<CifrasComp | null>(null) : getCifrasV2(grupo.codgrupo, codtemporada, jornadaNum, clasif, grupo.total_jornadas),
  ])

  // Datos de la pestaña activa (tab-gated).
  let mvpJ: any[] = [], equiposForma: any[] = [], xi: any[] = [], golJ: any[] = []
  let resultados: ResultadoCompRow[] = [], equiposMap = new Map<string, string>()
  let golesEquipo: GolEquipoRow[] = []
  let topTemp: { goleadores: any[]; porteros: any[]; fantasy: any[]; elo: any[] } | null = null
  if (tabEf === 'resultados') {
    [resultados, equiposMap] = await Promise.all([
      getResultadosV2(grupo.codgrupo, codtemporada, jornadaNum),
      getEquiposMapV2(grupo.codgrupo, codtemporada),
    ])
  } else if (tabEf === 'goleadores-jornada') {
    const [gj, res, em] = await Promise.all([
      getDestacadosV2(grupo.codgrupo, codtemporada, jornadaNum, 'goleadores_jornada'),
      getResultadosV2(grupo.codgrupo, codtemporada, jornadaNum),
      getEquiposMapV2(grupo.codgrupo, codtemporada),
    ])
    golJ = gj; equiposMap = em; golesEquipo = golesEquipoJornada(res, em)
  } else if (tabEf === 'top5-jugadores-jornada') mvpJ = await getDestacadosV2(grupo.codgrupo, codtemporada, jornadaNum, 'mvp_jornada')
  else if (tabEf === 'top5-equipos-jornada') equiposForma = await getEquiposFormaV2(grupo.codgrupo, codtemporada, jornadaNum)
  else if (tabEf === 'once-optimo-jornada') xi = await getXiJornadaV2(grupo.codgrupo, codtemporada, jornadaNum, isCopa)
  else if (tabEf === 'once-optimo-temporada') xi = await getXiTemporadaV2(grupo.codgrupo, codtemporada, jornadaNum)
  else if (tabEf === 'top10-goleadores-temporada' || tabEf === 'top10-porteros-temporada' || tabEf === 'top10-elo-jugadores-temporada' || tabEf === 'top10-fantasy-temporada')
    topTemp = await getTopTemporadaV2(grupo.codgrupo, codtemporada, jornadaNum)

  const lidJugs = lideres ? [lideres.goleador, lideres.portero, lideres.elo].filter(Boolean) : []
  const codjugs = [...mvpJ, ...xi, ...golJ, ...lidJugs, ...(topTemp ? [...topTemp.goleadores, ...topTemp.porteros, ...topTemp.elo, ...topTemp.fantasy] : [])].map((j: any) => j.codjugador)
  const fichas = await fichasInfo(codjugs)

  const [variantes, hermanos] = await Promise.all([
    getVariantesV2(categoria, grupo.slug_comp, grupo.slug_grupo),
    isCopa ? Promise.resolve([] as any[]) : getGruposHermanos(grupo.nombre_comp, codtemporada),
  ])

  const nombre = nombreOficial(grupo.nombre_comp) ?? ensureMadrid(denominacion(grupo.nombre_comp))
  const tituloGrupo = `${nombre}${grupo.nombre_grupo ? ` · ${grupo.nombre_grupo}` : ''}`
  const enJuego = String(codtemporada) === String(LIVE_COD)
  const base = `/madrid/${categoria}/${slugComp}/${slugGrupo}/${temporada}`
  const baseTab = `${base}/${segJornada}`
  const jlbl = modo === 'temporada' ? 'Acumulado hasta' : (esFamilia ? 'Ronda' : 'Jornada')

  // Arrastre: las zonas condicionales solo al final de liga.
  const mostrarArrastre = jornadaNum >= (grupo.total_jornadas || jornadaNum)
  const zonaEf = (z: string | null) => (z && (!mostrarArrastre && ARRASTRE_TIPOS.has(z)) ? '' : (z || ''))
  const zonasPresentes = new Set(clasif.map((r) => zonaEf(r.zona)).filter(Boolean))
  const leyendaZ = ZONA_LEYENDA.filter((z) => zonasPresentes.has(z.tipo))

  // Vista de ranking (.rr) para las pestañas soportadas en este incremento. Escudo real en todas.
  type RankView = { title: string; sub: string; items: RankItem[]; leyenda?: ReactNode; barColor?: string }
  const acum = `acumulado hasta J${jornadaNum}`
  let rankView: RankView | null = null
  if (tabEf === 'top5-jugadores-jornada') {
    rankView = {
      title: '5 mejores jugadores', sub: `puntos fantasy · jornada ${jornadaNum}`,
      items: mvpJ.map((j) => ({
        rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo,
        valor: Math.round(j.pts_fantasy ?? 0), valorColor: 'var(--e3)',
        extra: <span><b className="num">{j.goles ?? 0}</b> {(j.goles ?? 0) === 1 ? 'gol' : 'goles'} en la jornada</span>,
      })),
      leyenda: <><b>Pts Fantasy</b> puntos en la jornada · <b>Goles</b> goles en la jornada.</>,
    }
  } else if (tabEf === 'top5-equipos-jornada') {
    rankView = {
      title: '5 equipos más en forma', sub: `puntos fantasy · jornada ${jornadaNum}`,
      items: equiposForma.map((e) => ({
        rank: e.rank, codequipo: e.codequipo, nombre: e.nombre_equipo, escudo: e.escudo, nombreEquipo: e.nombre_equipo,
        valor: Math.round(e.pts_fantasy ?? 0), valorColor: 'var(--e3)',
      })),
      leyenda: <><b>Pts Fantasy</b> suma fantasy de los jugadores del equipo en la jornada.</>,
    }
  } else if (topTemp && tabEf === 'top10-goleadores-temporada') {
    const max = Math.max(1, ...topTemp.goleadores.map((j) => j.goles ?? 0))
    rankView = {
      title: 'Goleadores', sub: acum, barColor: 'var(--e4)',
      items: topTemp.goleadores.map((j) => ({
        rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo,
        valor: j.goles, valorColor: 'var(--e4)', barPct: ((j.goles ?? 0) / max) * 100,
        extra: <span><b className="num">{j.pj}</b> PJ · <b className="num">{fmt2(j.goles_pj)}</b> g/PJ · <b className="num">{j.partidos_con_gol ?? '—'}</b> con gol{j.min_gol != null ? <> · <b className="num">{j.min_gol}</b>′/gol</> : null}</span>,
      })),
      leyenda: <><b>Goles</b> marcados · <b>PJ</b> partidos jugados · <b>g/PJ</b> goles por partido · <b>con gol</b> partidos en que marcó · <b>′/gol</b> minutos por gol.</>,
    }
  } else if (topTemp && tabEf === 'top10-porteros-temporada') {
    const max = Math.max(1, ...topTemp.porteros.map((j) => j.goles ?? 0))
    rankView = {
      title: 'Porterías a cero', sub: `${acum} · umbral proporcional`, barColor: 'var(--amber)',
      items: topTemp.porteros.map((j) => ({
        rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo,
        valor: j.goles, valorColor: 'var(--amber)', barPct: ((j.goles ?? 0) / max) * 100,
        extra: <span><b className="num">{j.pj}</b> PJ · <b className="num">{j.goles_enc}</b> enc. · <b className="num">{fmt2(j.goles_pj)}</b> enc./PJ{j.p0_pct != null ? <> · <b className="num">{j.p0_pct}</b>% P0</> : null}</span>,
      })),
      leyenda: <><b>P0</b> porterías a cero · <b>enc.</b> goles encajados · <b>enc./PJ</b> goles encajados por partido · <b>P0%</b> porcentaje de porterías a cero. Elegibles desde la J3 (≥65 % de jornadas, media ≥60′).</>,
    }
  } else if (topTemp && tabEf === 'top10-elo-jugadores-temporada') {
    rankView = {
      title: 'ELO jugadores', sub: `tras J${jornadaNum}`,
      items: topTemp.elo.map((j, i) => ({
        rank: j.rank ?? i + 1, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo,
        valor: j.elo != null ? Math.round(j.elo) : '—', valorColor: colorElo(j.elo) || 'var(--e1)',
        extra: <span>máx <b className="num">{j.elo_max != null ? Math.round(j.elo_max) : '—'}</b> · mín <b className="num">{j.elo_min != null ? Math.round(j.elo_min) : '—'}</b>{j.elo_var != null ? <> · <b className="num" style={{ color: j.elo_var > 0 ? 'var(--e3)' : j.elo_var < 0 ? 'var(--e0)' : 'var(--ink-3)' }}>{j.elo_var > 0 ? '+' : ''}{j.elo_var}</b> últ.</> : null}</span>,
      })),
      leyenda: <><b>ELO</b> rating de rendimiento del jugador · <b>máx/mín</b> techo y suelo de la temporada · <b>últ.</b> variación en la última jornada.</>,
    }
  } else if (topTemp && tabEf === 'top10-fantasy-temporada') {
    const max = Math.max(1, ...topTemp.fantasy.map((j) => Math.round(j.pts_fantasy ?? 0)))
    rankView = {
      title: 'Ranking fantasy', sub: acum, barColor: 'var(--e3)',
      items: topTemp.fantasy.map((j) => ({
        rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo,
        valor: Math.round(j.pts_fantasy ?? 0), valorColor: 'var(--e3)', barPct: (Math.round(j.pts_fantasy ?? 0) / max) * 100,
        extra: <>
          <span className="mediabadge" style={{ color: colorMediaJug(j.media_fantasy) || 'var(--ink-2)', borderColor: colorMediaJug(j.media_fantasy) || 'var(--line)' }}>⌀ {med1(j.media_fantasy)}</span>
          <span><b className="num">{j.pj}</b> PJ{j.goles != null ? <> · <b className="num">{j.goles}</b> {j.goles === 1 ? 'gol' : 'goles'}</> : null}</span>
        </>,
      })),
      leyenda: <><b>Pts Fantasy</b> puntos acumulados (ordenan el ranking) · <b>⌀</b> media de puntos por partido, resaltada y coloreada por rendimiento (rojo→verde) · <b>PJ</b> partidos jugados.</>,
    }
  }

  // XI Óptimo (jornada o temporada): campo + listado idéntico a los rankings.
  type XiView = { title: string; sub: string; players: { posicion: string; nombre: string; valor: number | string }[]; items: RankItem[]; leyenda: ReactNode }
  let xiView: XiView | null = null
  if (xi.length && (tabEf === 'once-optimo-jornada' || tabEf === 'once-optimo-temporada')) {
    const esTemp = tabEf === 'once-optimo-temporada'
    const valOf = (j: any) => Math.round((esTemp ? j.pts_totales : (j.pts_fantasy ?? j.pts_jornada)) ?? 0)
    xiView = {
      title: esTemp ? 'XI Óptimo de la temporada' : 'XI Óptimo de la jornada',
      sub: esTemp ? acum : (rondaSel?.label ?? `jornada ${jornadaNum}`),
      players: xi.map((j) => ({ posicion: j.posicion, nombre: j.nombre, valor: valOf(j) })),
      items: xi.map((j) => ({
        rank: j.posicion, rankColor: POSC[j.posicion], codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion,
        escudo: j.escudo, nombreEquipo: j.nombre_equipo, valor: valOf(j), valorColor: POSC[j.posicion] ?? 'var(--e3)',
        extra: <span><b className="num">{j.goles ?? 0}</b> {(j.goles ?? 0) === 1 ? 'gol' : 'goles'}{esTemp && j.racha_5p != null ? <> · racha <b className="num">{j.racha_5p}</b></> : null}{esTemp && j.power_ranking != null ? <> · power <b className="num">{j.power_ranking}</b></> : null}</span>,
      })),
      leyenda: esTemp
        ? <><b>Pos</b> posición en el campo · <b>Pts Fantasy</b> acumulados · <b>Goles</b> en la temporada · <b>Racha 5p</b> suma fantasy de las últimas 5 jornadas · <b>Power Ranking</b> índice combinado.</>
        : <><b>Pos</b> posición en el campo · <b>Pts Fantasy</b> puntos en la jornada · <b>Goles</b> en la jornada.</>,
    }
  }

  return (
    <div className="fjv2 fcv2">
      {/* HERO */}
      <div className="hero">
        <div className="hero-top">
          <span className="comp-sello"><Sello nombreComp={grupo.nombre_comp} src={esFamilia ? familiaSello(grupo.slug_comp, grupo.nombre_comp) : undefined} size={56} /></span>
          <div className="hero-name">
            <div className="over">RFFM · MADRID</div>
            <div className="comp">{tituloGrupo}</div>
          </div>
        </div>
        <div className="hero-pills">
          {enJuego
            ? <span className="pill live">EN JUEGO · J{grupo.jornada_actual} DE {grupo.total_jornadas}</span>
            : <span className="pill n">Finalizada · {grupo.total_jornadas} jornadas</span>}
          {kpis.equipos > 0 && <span className="pill n">{kpis.equipos} equipos</span>}
          <span className="pill n">Temporada {temporada}</span>
        </div>
      </div>

      {/* KPIs — icono encima del número, como en equipo */}
      <div className="kpis kpis-comp">
        <div className="kpi"><div className="kpi-i"><Escudo size={14} /></div><div className="v num">{kpis.equipos || '—'}</div><div className="k">Equipos</div></div>
        <div className="kpi"><div className="kpi-i"><Calendario size={14} /></div><div className="v num">{mil(kpis.partidos)}</div><div className="k">Partidos</div></div>
        <div className="kpi"><div className="kpi-i"><Balon size={14} /></div><div className="v num">{mil(kpis.goles)}</div><div className="k">Goles</div></div>
        <div className="kpi"><div className="kpi-i"><Balon size={14} /></div><div className="v num">{med1(kpis.golesPj)}</div><div className="k">Goles/PJ</div></div>
        <div className="kpi"><div className="kpi-i">{badge11}</div><div className="v num" style={{ color: colorElo(kpis.eloMedio) }}>{mil(kpis.eloMedio)}</div><div className="k">ELO medio</div></div>
      </div>

      {/* SCOPE — temporada + grupo */}
      <div className="scope">
        <div className="scope-lbl">Temporada</div>
        <div className="track"><div className="rail">
          {TEMPORADAS_ORD.map((cod) => {
            const v = variantes[cod], label = COD_TO_LABEL[cod]
            if (!v) return <span key={cod} className="off" title="Sin datos en esta temporada">{label}</span>
            return <Link key={cod} href={`/madrid/${categoria}/${v.slug_comp}/${v.slug_grupo}/${label}/${v.seg}/${tab}/v2`} className={codtemporada === cod ? 'on' : ''}>{label}</Link>
          })}
        </div></div>
        {!isCopa && hermanos.length > 0 && <>
          <div className="scope-lbl" style={{ paddingTop: 11 }}>Grupo</div>
          <div className="track"><div className="rail">
            <Link href={`/madrid/${categoria}/${slugComp}/global/${temporada}/jornada-${jornadaNum}/${modo === 'temporada' ? tab : 'clasificacion'}/v2`} className="glob">Global</Link>
            {hermanos.map((g) => (
              <Link key={g.codgrupo} href={`/madrid/${categoria}/${g.slug_comp}/${g.slug_grupo}/${temporada}/jornada-${jornadaNum}/${tab}/v2`}
                className={String(g.codgrupo) === String(grupo.codgrupo) ? 'on' : ''}>{g.nombre_grupo}</Link>
            ))}
          </div></div>
        </>}
        <div className="scope-note">Los reportes de <b>Temporada</b> son acumulados hasta la jornada seleccionada, no el total.</div>
      </div>

      {/* TABS — toggle de modo + raíl del modo activo */}
      <div className="tabs-comp">
        <div className="zonasw"><div className="zsw">
          <Link href={`${baseTab}/${tabsJ[0][0]}/v2`} className={modo === 'jornada' ? 'on' : ''}>Jornada</Link>
          <Link href={`${base}/jornada-${jornadaNum}/${tabsT[0][0]}/v2`} className={modo === 'temporada' ? 'on' : ''}>Temporada</Link>
        </div></div>
        <div className="track"><div className="rail tabrail">
          {tabsActivas.map(([id, label]) => {
            const href = modo === 'temporada' ? `${base}/jornada-${jornadaNum}/${id}/v2` : `${baseTab}/${id}/v2`
            return <Link key={id} href={href} className={id === tabEf ? 'on' : ''}>{label}</Link>
          })}
        </div></div>
      </div>

      {/* JBAR — selector de jornada/ronda con rótulo variable */}
      <div className="jbar">
        <div className="jlbl">{jlbl}</div>
        <div className="track"><div className="rail jrail">
          {esFamilia
            ? rondas.map((r) => <Link key={r.slug} href={`${base}/${r.slug}/${tab}/v2`} className={r.idx === jornadaNum ? 'on' : ''}>{r.label}</Link>)
            : Array.from({ length: grupo.total_jornadas || 0 }, (_, i) => i + 1).map((j) => (
              <Link key={j} href={`${base}/jornada-${j}/${tab}/v2`} className={j === jornadaNum ? 'on' : ''}>J{j}</Link>
            ))}
        </div></div>
      </div>

      <div className="layout">
        <div className="main">
          {/* CLASIFICACIÓN (increment 1) */}
          {tabEf === 'clasificacion' && (
            <section id="s-clasif">
              <div className="s-head"><div className="s-title">Clasificación</div><div className="s-sub">tras la jornada {jornadaNum}</div></div>
              {clasif.length > 0 ? (
                <>
                  <div className="ctabla"><div className="ctw">
                    <div className="ctr head">
                      <div className="cfix"><span className="czona" /><span className="cpos">#</span><span style={{ width: 24, flex: 'none' }} /><span className="ceq">Equipo</span></div>
                      {['PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'ELO', 'PF', 'P0'].map((c) => <span key={c} className={`cc${c === 'DG' ? ' dg' : ''}`}>{c}</span>)}
                      <span className="cc pts">Pts</span>
                      <span className="cracha">Forma</span>
                      <span className="ccom">Racha</span>
                    </div>
                    {clasif.map((r) => {
                      const z = zonaEf(r.zona)
                      return (
                        <div key={r.codequipo} className="ctr" style={ZONA_BG[z]}>
                          <div className="cfix">
                            <span className="czona" style={{ background: zonaColor(r.zona) }} />
                            <span className="cpos">{r.pos}</span>
                            <EscudoBox escudo={r.escudo} nombre={r.nombre_equipo} size={22} radius={5} />
                            <span className="ceq"><NombreEquipo codequipo={r.codequipo} nombre={r.nombre_equipo} /></span>
                          </div>
                          <span className="cc">{r.pj}</span><span className="cc">{r.pg}</span><span className="cc">{r.pe}</span><span className="cc">{r.pp}</span>
                          <span className="cc">{r.gf}</span><span className="cc">{r.gc}</span>
                          <span className="cc dg">{r.dg > 0 ? `+${r.dg}` : r.dg}</span>
                          <span className="cc">{r.elo != null ? Math.round(r.elo) : '—'}</span>
                          <span className="cc">{r.pts_fantasy != null ? Math.round(r.pts_fantasy) : ''}</span>
                          <span className="cc">{r.p0 ?? ''}</span>
                          <span className="cc pts">{r.pts}</span>
                          <span className="cracha">{Array.from(r.forma || '').slice(-5).map((x, i) => <i key={i} style={{ background: FORMA_COL[x] || 'var(--line)' }} />)}</span>
                          <span className="ccom">{r.racha || ''}</span>
                        </div>
                      )
                    })}
                  </div></div>
                  {leyendaZ.length > 0 && (
                    <div className="leyenda-z">
                      {leyendaZ.map((z) => <span key={z.tipo}><i style={ZONA_BG[z.tipo]} />{z.label}</span>)}
                    </div>
                  )}
                  <div className="leyenda" style={{ paddingTop: 10 }}><b>Forma</b> últimos 5: <b style={{ color: 'var(--e3)' }}>ganó</b> · <b style={{ color: 'var(--ink-3)' }}>empató</b> · <b style={{ color: 'var(--e0)' }}>perdió</b> · <b>Racha</b> racha actual del equipo.</div>
                </>
              ) : <p className="vacio">Sin clasificación en esta jornada.</p>}
            </section>
          )}

          {/* CARRERA DE POSICIONES — gráfico protagonista, bajo la clasificación. */}
          {tabEf === 'clasificacion' && carrera.series.length > 0 && (
            <section>
              <div className="s-head"><div className="s-title">Carrera de posiciones</div><div className="s-sub">jornada a jornada</div></div>
              <CarreraPosiciones key={grupo.codgrupo} series={carrera.series} jornadas={carrera.jornadas} bands={carrera.bands} />
            </section>
          )}

          {/* RESULTADOS — marcador + escudos; campo/fecha/hora en la meta, omitiendo lo que falte. */}
          {tabEf === 'resultados' && (
            <section>
              <div className="s-head"><div className="s-title">Resultados</div><div className="s-sub">{esFamilia ? (rondaSel?.label ?? `jornada ${jornadaNum}`) : `jornada ${jornadaNum}`}</div></div>
              {resultados.length > 0 ? resultados.map((r, i) => {
                const jugado = r.goles_local != null && r.goles_visitante != null
                const meta = [r.fecha ? fechaCortaDMY(r.fecha) : null, r.hora || null, r.campo || null].filter(Boolean).join(' · ')
                return (
                  <div className="rmatch-wrap" key={r.codacta ?? i}>
                    <div className="rmatch">
                      <div className="rside">
                        <EscudoBox escudo={r.escudo_local} nombre={r.nombre_local} size={26} radius={5} />
                        <span className={`rnm${jugado && (r.goles_local as number) > (r.goles_visitante as number) ? ' w' : ''}`}><NombreEquipo codequipo={equiposMap.get(r.nombre_local) ?? null} nombre={r.nombre_local} /></span>
                      </div>
                      <div className="rsc">{jugado ? `${r.goles_local}-${r.goles_visitante}` : 'vs'}</div>
                      <div className="rside v">
                        <EscudoBox escudo={r.escudo_visitante} nombre={r.nombre_visitante} size={26} radius={5} />
                        <span className={`rnm${jugado && (r.goles_visitante as number) > (r.goles_local as number) ? ' w' : ''}`}><NombreEquipo codequipo={equiposMap.get(r.nombre_visitante) ?? null} nombre={r.nombre_visitante} /></span>
                      </div>
                    </div>
                    {meta && <div className="rmeta">{meta}</div>}
                  </div>
                )
              }) : <p className="vacio">Sin resultados en esta jornada.</p>}
            </section>
          )}

          {/* GOLEADORES (jornada) + Goles de equipo. */}
          {tabEf === 'goleadores-jornada' && (
            <>
              <section>
                <div className="s-head"><div className="s-title">Goleadores de la jornada</div><div className="s-sub">{esFamilia ? (rondaSel?.label ?? `jornada ${jornadaNum}`) : `jornada ${jornadaNum}`}</div></div>
                {golJ.length > 0
                  ? <RankingComp fichas={fichas} barColor="var(--e4)" items={golJ.map((j) => ({ rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo, valor: j.goles, valorColor: 'var(--e4)', extra: <span><b className="num">{j.goles}</b> {j.goles === 1 ? 'gol' : 'goles'} en la jornada</span> }))} />
                  : <p className="vacio">Sin goleadores en esta jornada.</p>}
              </section>
              {golesEquipo.length > 0 && (
                <section>
                  <div className="s-head"><div className="s-title">Goles de equipo</div><div className="s-sub">jornada {jornadaNum}</div></div>
                  <RankingComp barColor="var(--e4)" items={golesEquipo.map((e, i) => ({ rank: i + 1, codequipo: e.codequipo, nombre: e.nombre, escudo: e.escudo, nombreEquipo: e.nombre, valor: e.goles, valorColor: 'var(--e4)' }))} />
                </section>
              )}
            </>
          )}

          {tabEf !== 'clasificacion' && tabEf !== 'resultados' && tabEf !== 'goleadores-jornada' && (rankView ? (
            <section>
              <div className="s-head"><div className="s-title">{rankView.title}</div><div className="s-sub">{rankView.sub}</div></div>
              {rankView.items.length > 0 ? (
                <>
                  <RankingComp items={rankView.items} fichas={fichas} barColor={rankView.barColor} />
                  {rankView.leyenda && <div className="leyenda">{rankView.leyenda}</div>}
                </>
              ) : <p className="vacio">Sin datos en esta {modo === 'temporada' ? 'temporada' : 'jornada'}.</p>}
            </section>
          ) : xiView ? (
            <section>
              <div className="s-head"><div className="s-title">{xiView.title}</div><div className="s-sub">{xiView.sub}</div></div>
              {campoXI(xiView.players)}
              <div style={{ marginTop: 14 }}><RankingComp items={xiView.items} fichas={fichas} /></div>
              <div className="leyenda">{xiView.leyenda}</div>
            </section>
          ) : (tabEf === 'once-optimo-jornada' || tabEf === 'once-optimo-temporada') ? (
            <section>
              <div className="s-head"><div className="s-title">{tabsActivas.find((t) => t[0] === tabEf)?.[1]}</div></div>
              <p className="vacio">Sin XI Óptimo en esta {modo === 'temporada' ? 'temporada' : 'jornada'}.</p>
            </section>
          ) : (
            <section>
              <div className="s-head"><div className="s-title">{tabsActivas.find((t) => t[0] === tabEf)?.[1]}</div></div>
              <p className="vacio">Próximamente en la ficha v2.</p>
            </section>
          ))}
        </div>

        <div className="aside">
          {/* LÍDERES — tarjeta por líder: valor grande + unidad arriba, y bajo un filete el jugador
              (avatar, nombre, equipo + escudo). El tercero (más tarjetas) se omite: no hay ranking de
              tarjetas por jugador de temporada en el dato (ver DECISIONES). */}
          {lideres && (lideres.goleador || lideres.portero || lideres.elo) && (
            <section>
              <div className="s-head"><div className="s-title">Líderes</div><div className="s-sub">{temporada}{grupo.nombre_grupo ? ` · ${grupo.nombre_grupo}` : ''}</div></div>
              <div className="track"><div className="rail lideres">
                {lidCard('Goleador', <Balon size={14} />, 'var(--e4)', lideres.goleador?.goles, 'goles', lideres.goleador, fichas)}
                {lidCard('Portero', <Guante size={14} />, 'var(--amber)', lideres.portero?.goles, 'P0', lideres.portero, fichas)}
                {lidCard('Mejor ELO', <Escudo size={14} />, 'var(--e3)', lideres.elo?.elo != null ? mil(lideres.elo.elo) : null, 'ELO', lideres.elo, fichas)}
              </div></div>
            </section>
          )}

          <section style={{ borderBottom: 0 }}>
            <div className="s-head"><div className="s-title">La competición en cifras</div><div className="s-sub">tras J{jornadaNum}</div></div>
            <div style={{ padding: '0 var(--pad)' }}>
              {cifras ? (
                <>
                  <div className="cifra"><span className="ci"><Calendario size={13} /></span><span className="ck">Partidos jugados</span><span className="cv num">{mil(cifras.disputados)} de {mil(cifras.totalPartidos)}</span></div>
                  <div className="cifra"><span className="ci" style={{ color: 'var(--e4)' }}><Balon size={13} /></span><span className="ck">Goles marcados</span><span className="cv num">{mil(cifras.goles)}</span></div>
                  <div className="cifra"><span className="ci" style={{ color: 'var(--e4)' }}><Balon size={13} /></span><span className="ck">Media de goles</span><span className="cv num">{med1(cifras.mediaGoles)} por partido</span></div>
                  <div className="cifra"><span className="ci" style={{ color: 'var(--e3)' }}><Casa size={13} /></span><span className="ck">Victoria local</span><span className="cv num">{cifras.vLocalPct} %</span></div>
                  <div className="cifra"><span className="ci"><Guion size={13} /></span><span className="ck">Empates</span><span className="cv num">{cifras.empPct} %</span></div>
                  <div className="cifra"><span className="ci" style={{ color: 'var(--e1)' }}><Avion size={13} /></span><span className="ck">Victoria visitante</span><span className="cv num">{cifras.vVisitPct} %</span></div>
                  <div className="cifra"><span className="ci" style={{ color: 'var(--card-y)' }}><TarjetaAmarilla size={12} /></span><span className="ck">Amarillas</span><span className="cv num">{mil(cifras.amarillas)}</span></div>
                  <div className="cifra"><span className="ci" style={{ color: 'var(--card-y)' }}><TarjetaDoble size={13} /></span><span className="ck">Dobles amarillas</span><span className="cv num">{mil(cifras.dobles)}</span></div>
                  <div className="cifra"><span className="ci" style={{ color: 'var(--card-r)' }}><TarjetaRoja size={12} /></span><span className="ck">Rojas</span><span className="cv num">{mil(cifras.rojas)}</span></div>
                  <div className="cifra"><span className="ci" style={{ color: 'var(--amber)' }}><Guante size={13} /></span><span className="ck">Porterías a cero</span><span className="cv num">{mil(cifras.p0)}</span></div>
                </>
              ) : <p className="vacio">Sin cifras en esta temporada.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
