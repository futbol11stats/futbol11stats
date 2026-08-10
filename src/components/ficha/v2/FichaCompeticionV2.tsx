import './ficha.css'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Sello from '@/components/Sello'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreEquipo from '@/components/NombreEquipo'
import { Escudo, Balon, Guante, TarjetaAmarilla, TarjetaDoble, TarjetaRoja, Camiseta, CamisetaHueca, Reloj } from '@/components/iconos'
import { nombreOficial, denominacion, familiaSello } from '@/lib/sellos'
import { ensureMadrid } from '@/lib/seo'
import { LIVE_COD, fechaCortaDMY } from '@/lib/equipo'
import { colorElo } from '@/lib/equipoV2'
import { fichasInfo } from '@/lib/jugador'
import { ZONA_BG, ZONA_LEYENDA, ARRASTRE_TIPOS } from '@/components/tablas'
import { type Ronda } from '@/lib/competiciones'
import RankingComp, { type RankItem } from '@/components/ficha/v2/RankingComp'
import CarreraPosiciones from '@/components/ficha/v2/CarreraPosiciones'
import { FilaEspejo, EspejoHead } from '@/components/ficha/v2/barrasGoles'
import { campoXI, POSC } from '@/components/ficha/v2/campoXI'
import TarjetasTemporadaV2 from '@/components/ficha/v2/TarjetasTemporadaV2'
import Panorama from '@/components/ficha/v2/Panorama'
import {
  datosGoleadorTemp, datosPorteroTemp, datosFantasyTemp, datosEloTemp, datosXiTemp,
  leyGoleadorTemp, leyPorteroTemp, leyFantasyTemp, leyEloTemp, leyXiTemp, leyJornada,
} from '@/components/ficha/v2/lineasComp'
import {
  TEMPORADA_MAP, COD_TO_LABEL, TEMPORADAS_ORD, getGrupoV2, getVariantesV2, getGruposHermanos,
  getClasifV2, kpisDeClasif, zonaColor, FORMA_COL, type ClasifCompRow,
  getDestacadosV2, getEquiposFormaV2, getTopTemporadaV2, getXiJornadaV2, getXiTemporadaV2,
  getResultadosV2, getEquiposMapV2, type ResultadoCompRow, getCarreraV2,
  getLideresV2, getCifrasV2, type CifrasComp, getSuspendidosV2, getPartidosJornadaV2, getTramosCompeticionV2,
  golesEquipoJornada, type GolEquipoRow, getJuegoLimpioV2, getAlertasV2,
} from '@/lib/competicionV2'


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



// Fila de datos COMPLETA de un jugador en una jornada (web_jugador_partidos), estilo Top de la plantilla:
// titular/suplente · minutos · goles (o portería a cero si actuó de portero) · tarjetas. Con color propio.
// "Actuó de portero" = goles_encajados != null (mismo criterio que la ficha de jugador), no la demarcación.
function filaJornada(p: any) {
  if (!p) return null
  const esPor = p.goles_encajados != null
  return (
    <span className="cfj">
      <span>{p.titular ? <Camiseta size={11} /> : <CamisetaHueca size={11} />}{p.titular ? 'Titular' : 'Supl.'}</span>
      <span><b className="num">{p.minutos ?? 0}</b><Reloj size={11} /></span>
      {esPor
        ? <span><b className="num">{p.goles_encajados === 0 ? 1 : 0}</b><span style={{ color: 'var(--amber)', display: 'inline-flex' }}><Guante size={11} /></span></span>
        : <span><b className="num">{p.goles ?? 0}</b><span style={{ color: 'var(--e3)', display: 'inline-flex' }}><Balon size={11} /></span></span>}
      {p.amarillas > 0 && <span style={{ color: 'var(--card-y)' }}>{p.amarillas}<TarjetaAmarilla size={10} /></span>}
      {p.dobles_amarilla > 0 && <span style={{ color: 'var(--card-y)' }}><TarjetaDoble size={11} /></span>}
      {p.rojas > 0 && <span style={{ color: 'var(--card-r)' }}><TarjetaRoja size={10} /></span>}
    </span>
  )
}

// Iconos de tarjeta presentes en una jornada (una por tipo). Sin fondo de chip (valorColor transparente).
function cardsSpan(ta: number, dob: number, rj: number) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {ta > 0 && <span style={{ color: 'var(--card-y)', display: 'inline-flex' }}><TarjetaAmarilla size={13} /></span>}
      {dob > 0 && <span style={{ color: 'var(--card-y)', display: 'inline-flex' }}><TarjetaDoble size={14} /></span>}
      {rj > 0 && <span style={{ color: 'var(--card-r)', display: 'inline-flex' }}><TarjetaRoja size={13} /></span>}
    </span>
  )
}
// Icono de tarjeta según el motivo de la suspensión (texto de web_suspendidos).
function motivoCard(motivo: string | null) {
  if (!motivo) return null
  if (/roja/i.test(motivo)) return <span style={{ color: 'var(--card-r)', display: 'inline-flex' }}><TarjetaRoja size={13} /></span>
  if (/doble/i.test(motivo)) return <span style={{ color: 'var(--card-y)', display: 'inline-flex' }}><TarjetaDoble size={14} /></span>
  return <span style={{ color: 'var(--card-y)', display: 'inline-flex' }}><TarjetaAmarilla size={13} /></span>
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
  let mvpJ: any[] = [], equiposForma: any[] = [], xi: any[] = [], golJ: any[] = [], tarjJ: any[] = [], suspendidos: any[] = []
  let resultados: ResultadoCompRow[] = [], equiposMap = new Map<string, string>()
  let golesEquipo: GolEquipoRow[] = []
  let partMap = new Map<string, any>()
  let tramosComp: { tramo: string; gf: number }[] = []
  let topTemp: { goleadores: any[]; porteros: any[]; fantasy: any[]; elo: any[] } | null = null
  let juegoLimpio: any[] = []
  let alertas: any[] = []
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
    partMap = await getPartidosJornadaV2(grupo.codgrupo, codtemporada, jornadaNum, golJ.map((j: any) => String(j.codjugador)))
  } else if (tabEf === 'tarjetas-jornada') {
    const [tj, susp] = await Promise.all([
      getDestacadosV2(grupo.codgrupo, codtemporada, jornadaNum, 'tarjetas_jornada'),
      getSuspendidosV2(grupo.codgrupo, codtemporada, jornadaNum + 1),
    ])
    tarjJ = tj; suspendidos = susp
  } else if (tabEf === 'top5-jugadores-jornada') {
    mvpJ = await getDestacadosV2(grupo.codgrupo, codtemporada, jornadaNum, 'mvp_jornada')
    partMap = await getPartidosJornadaV2(grupo.codgrupo, codtemporada, jornadaNum, mvpJ.map((j: any) => String(j.codjugador)))
  }
  else if (tabEf === 'top5-equipos-jornada') equiposForma = await getEquiposFormaV2(grupo.codgrupo, codtemporada, jornadaNum)
  else if (tabEf === 'once-optimo-jornada') {
    xi = await getXiJornadaV2(grupo.codgrupo, codtemporada, jornadaNum, isCopa)
    partMap = await getPartidosJornadaV2(grupo.codgrupo, codtemporada, jornadaNum, xi.map((j: any) => String(j.codjugador)))
  }
  else if (tabEf === 'once-optimo-temporada') xi = await getXiTemporadaV2(grupo.codgrupo, codtemporada, jornadaNum)
  else if (tabEf === 'top10-tarjetas-temporada') {
    [juegoLimpio, alertas] = await Promise.all([
      getJuegoLimpioV2([grupo.codgrupo], codtemporada, jornadaNum),
      getAlertasV2([grupo.codgrupo], codtemporada),
    ])
  }
  else if (tabEf === 'estadisticas') tramosComp = await getTramosCompeticionV2(grupo.codgrupo, codtemporada)
  else if (tabEf === 'top10-goleadores-temporada' || tabEf === 'top10-porteros-temporada' || tabEf === 'top10-elo-jugadores-temporada' || tabEf === 'top10-fantasy-temporada')
    topTemp = await getTopTemporadaV2(grupo.codgrupo, codtemporada, jornadaNum)

  const lidJugs = lideres ? [lideres.goleador, lideres.portero, lideres.elo, lideres.tarjetas].filter(Boolean) : []
  const codjugs = [...mvpJ, ...xi, ...golJ, ...tarjJ, ...suspendidos, ...alertas, ...lidJugs, ...(topTemp ? [...topTemp.goleadores, ...topTemp.porteros, ...topTemp.elo, ...topTemp.fantasy] : [])].map((j: any) => j.codjugador)
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
      items: mvpJ.map((j) => {
        const p = partMap.get(String(j.codjugador))
        return {
          rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo,
          valor: Math.round((p?.puntos ?? j.pts_fantasy) ?? 0), valorColor: 'var(--e3)',
          extra: p ? filaJornada(p) : <span className="cfj-none">Sin datos del partido</span>,
        }
      }),
      leyenda: leyJornada,
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
        extra: datosGoleadorTemp(j),
      })),
      leyenda: leyGoleadorTemp,
    }
  } else if (topTemp && tabEf === 'top10-porteros-temporada') {
    const max = Math.max(1, ...topTemp.porteros.map((j) => j.goles ?? 0))
    rankView = {
      title: 'Porterías a cero', sub: `${acum} · umbral proporcional`, barColor: 'var(--amber)',
      items: topTemp.porteros.map((j) => ({
        rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo,
        valor: j.goles, valorColor: 'var(--amber)', barPct: ((j.goles ?? 0) / max) * 100,
        extra: datosPorteroTemp(j),
      })),
      leyenda: <>{leyPorteroTemp} Elegibles desde la J3 (≥65 % de jornadas, media ≥60′).</>,
    }
  } else if (topTemp && tabEf === 'top10-elo-jugadores-temporada') {
    rankView = {
      title: 'ELO jugadores', sub: `tras J${jornadaNum}`,
      items: topTemp.elo.map((j, i) => ({
        rank: j.rank ?? i + 1, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo,
        valor: j.elo != null ? Math.round(j.elo) : '—', valorColor: colorElo(j.elo) || 'var(--e1)',
        extra: datosEloTemp(j),
      })),
      leyenda: leyEloTemp,
    }
  } else if (topTemp && tabEf === 'top10-fantasy-temporada') {
    const max = Math.max(1, ...topTemp.fantasy.map((j) => Math.round(j.pts_fantasy ?? 0)))
    rankView = {
      title: 'Ranking fantasy', sub: acum, barColor: 'var(--e3)',
      items: topTemp.fantasy.map((j) => ({
        rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo,
        valor: Math.round(j.pts_fantasy ?? 0), valorColor: 'var(--e3)', barPct: (Math.round(j.pts_fantasy ?? 0) / max) * 100,
        extra: datosFantasyTemp(j),
      })),
      leyenda: leyFantasyTemp,
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
      items: xi.map((j) => {
        const p = esTemp ? null : partMap.get(String(j.codjugador))
        const extra = esTemp
          ? datosXiTemp(j)
          : (p ? filaJornada(p) : <span className="cfj-none">Sin datos del partido</span>)
        return {
          rank: j.posicion, rankColor: POSC[j.posicion], codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion,
          escudo: j.escudo, nombreEquipo: j.nombre_equipo, valor: valOf(j), valorColor: POSC[j.posicion] ?? 'var(--e3)', extra,
        }
      }),
      leyenda: esTemp ? leyXiTemp : leyJornada,
    }
  }

  return (
    <div className="fjv2 fcv2">
      {/* IDENTIDAD + SELECTORES (columna de rótulos a la izquierda) */}
      <div className="ident">
        <div className="ident-top">
          <span className="comp-sello"><Sello nombreComp={grupo.nombre_comp} src={esFamilia ? familiaSello(grupo.slug_comp, grupo.nombre_comp) : undefined} size={52} /></span>
          <div className="ident-name">
            <div className="over">RFFM · MADRID</div>
            <div className="h1">{tituloGrupo}</div>
            <div className="ident-meta">
              {enJuego
                ? <span className="pill live">EN JUEGO · J{grupo.jornada_actual} DE {grupo.total_jornadas}</span>
                : <span className="pill n">Finalizada · {grupo.total_jornadas} jornadas</span>}
              {kpis.equipos > 0 && <span className="pill n">{kpis.equipos} equipos</span>}
              <span className="pill n">{temporada}</span>
            </div>
          </div>
        </div>
        <div className="selrow">
          <div className="sel-lbl">Temporada</div>
          <div className="track"><div className="sel-rail">
            {TEMPORADAS_ORD.map((cod) => {
              const v = variantes[cod], label = COD_TO_LABEL[cod]
              if (!v) return <span key={cod} className="off" title="Sin datos en esta temporada">{label}</span>
              return <Link key={cod} href={`/madrid/${categoria}/${v.slug_comp}/${v.slug_grupo}/${label}/${v.seg}/${tab}/v2`} className={codtemporada === cod ? 'on' : ''}>{label}</Link>
            })}
          </div></div>
        </div>
        {!isCopa && hermanos.length > 0 && (
          <div className="selrow" style={{ paddingBottom: 16 }}>
            <div className="sel-lbl">Grupo</div>
            <div className="track"><div className="sel-rail">
              <Link href={`/madrid/${categoria}/${slugComp}/global/${temporada}/jornada-${jornadaNum}/${modo === 'temporada' ? tab : 'clasificacion'}/v2`} className="glob">Global</Link>
              {hermanos.map((g) => (
                <Link key={g.codgrupo} href={`/madrid/${categoria}/${g.slug_comp}/${g.slug_grupo}/${temporada}/jornada-${jornadaNum}/${tab}/v2`}
                  className={String(g.codgrupo) === String(grupo.codgrupo) ? 'on' : ''}>{g.nombre_grupo}</Link>
              ))}
            </div></div>
          </div>
        )}
      </div>

      {/* PANORAMA — líderes + cifras a ancho completo, dependen del ámbito */}
      {!isCopa && (
        <Panorama lideres={lideres} cifras={cifras} kpis={kpis} fichas={fichas}
          subLideres={`${temporada}${grupo.nombre_grupo ? ` · ${grupo.nombre_grupo}` : ''}`} subCifras={`tras la jornada ${jornadaNum}`} />
      )}

      {/* PESTAÑAS sticky: Reportes de (pastilla) · Jornada (pastilla) · Ver (subrayado) */}
      <div className="tabs">
        <div className="modo">
          <div className="sel-lbl">Reportes de</div>
          <Link href={`${baseTab}/${tabsJ[0][0]}/v2`} className={modo === 'jornada' ? 'on' : ''}>Jornada</Link>
          <Link href={`${base}/jornada-${jornadaNum}/${tabsT[0][0]}/v2`} className={modo === 'temporada' ? 'on' : ''}>Temporada</Link>
        </div>
        <div className="jrow">
          <div className="sel-lbl">{jlbl}</div>
          <div className="track" style={{ flex: 1 }}><div className="jbar-rail">
            {esFamilia
              ? rondas.map((r) => <Link key={r.slug} href={`${base}/${r.slug}/${tab}/v2`} className={r.idx === jornadaNum ? 'on' : ''}>{r.label}</Link>)
              : Array.from({ length: grupo.total_jornadas || 0 }, (_, i) => i + 1).map((j) => (
                <Link key={j} href={`${base}/jornada-${j}/${tab}/v2`} className={j === jornadaNum ? 'on' : ''}>J{j}</Link>
              ))}
          </div></div>
        </div>
        <div className="verrow">
          <div className="sel-lbl">Ver</div>
          <div className="track" style={{ flex: 1 }}><div className="verrail">
            {tabsActivas.map(([id, label]) => {
              const href = modo === 'temporada' ? `${base}/jornada-${jornadaNum}/${id}/v2` : `${baseTab}/${id}/v2`
              return <Link key={id} href={href} className={id === tabEf ? 'on' : ''}>{label}</Link>
            })}
          </div></div>
        </div>
      </div>

      <div className="full">
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
                  ? <RankingComp fichas={fichas} barColor="var(--e4)" items={golJ.map((j) => {
                    const p = partMap.get(String(j.codjugador))
                    return { rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo, valor: (p?.goles ?? j.goles) ?? 0, valorColor: 'var(--e4)', extra: p ? filaJornada(p) : <span className="cfj-none">Sin datos del partido</span> }
                  })} />
                  : <p className="vacio">Sin goleadores en esta jornada.</p>}
                {golJ.length > 0 && <div className="leyenda">{leyJornada}</div>}
              </section>
              {golesEquipo.length > 0 && (
                <section>
                  <div className="s-head"><div className="s-title">Goles de equipo</div><div className="s-sub">jornada {jornadaNum}</div></div>
                  <RankingComp barColor="var(--e4)" items={golesEquipo.map((e, i) => ({ rank: i + 1, codequipo: e.codequipo, nombre: e.nombre, escudo: e.escudo, nombreEquipo: e.nombre, valor: e.goles, valorColor: 'var(--e4)' }))} />
                </section>
              )}
            </>
          )}

          {/* TARJETAS (jornada) + Suspendidos (jornada siguiente). */}
          {tabEf === 'tarjetas-jornada' && (
            <>
              <section>
                <div className="s-head"><div className="s-title">Tarjetas de la jornada</div><div className="s-sub">{esFamilia ? (rondaSel?.label ?? `jornada ${jornadaNum}`) : `jornada ${jornadaNum}`}</div></div>
                {tarjJ.length > 0
                  ? <RankingComp fichas={fichas} items={tarjJ.map((j) => {
                    const ta = j.goles || 0, dob = j.goles_enc || 0, rj = j.racha_5p || 0
                    return { rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo, valor: cardsSpan(ta, dob, rj), valorColor: 'transparent', extra: <span>{rj > 0 ? 'roja directa' : dob > 0 ? 'doble amarilla' : 'amarilla'}</span> }
                  })} />
                  : <p className="vacio">Sin tarjetas en esta jornada.</p>}
                <div className="leyenda"><b>Amarilla</b> · <b>doble amarilla</b> (expulsión) · <b>roja directa</b>.</div>
              </section>
              <section>
                <div className="s-head"><div className="s-title">Se pierden la próxima jornada</div><div className="s-sub">jornada {jornadaNum + 1}</div></div>
                {suspendidos.length > 0
                  ? <RankingComp fichas={fichas} items={suspendidos.map((s, i) => ({ rank: i + 1, codjugador: s.codjugador, nombre: s.nombre, pos: s.posicion, escudo: s.escudo, nombreEquipo: s.nombre_equipo, valor: motivoCard(s.motivo), valorColor: 'transparent', extra: <span>{s.motivo}</span> }))} />
                  : <p className="vacio">Ningún jugador sancionado para la próxima jornada.</p>}
                <div className="leyenda">Sanciones por tarjetas (ciclo de {isCopa ? 3 : 5} amarillas, doble amarilla o roja directa); no incluye sanciones adicionales del Comité de Competición.</div>
              </section>
            </>
          )}

          {/* ESTADÍSTICAS — reparto V/E/D + goles por equipo (espejo) + goles por tramo (solo verde). */}
          {tabEf === 'estadisticas' && (
            <section>
              <div className="s-head"><div className="s-title">Estadísticas</div><div className="s-sub">acumulado hasta J{jornadaNum}</div></div>
              {cifras && (
                <div className="statbox">
                  <div className="cap" style={{ marginBottom: 9 }}>Reparto de resultados</div>
                  <div className="reparto">
                    {cifras.vLocalPct > 0 && <span style={{ flex: cifras.vLocalPct, background: 'var(--e3)', color: '#08111f' }}>{cifras.vLocalPct}%</span>}
                    {cifras.empPct > 0 && <span style={{ flex: cifras.empPct, background: 'var(--e1)', color: '#0a1628' }}>{cifras.empPct}%</span>}
                    {cifras.vVisitPct > 0 && <span style={{ flex: cifras.vVisitPct, background: 'var(--e0)', color: '#0a1628' }}>{cifras.vVisitPct}%</span>}
                  </div>
                  <div className="reparto-lbl"><span>Gana local</span><span style={{ textAlign: 'center' }}>Empate</span><span style={{ textAlign: 'right' }}>Gana visitante</span></div>
                </div>
              )}
              {clasif.length > 0 && (() => {
                const maxG = Math.max(1, ...clasif.flatMap((r) => [r.gf, r.gc]))
                return (
                  <div className="statbox">
                    <div className="cap" style={{ marginBottom: 9 }}>Goles por equipo · en orden de clasificación</div>
                    <EspejoHead />
                    {clasif.map((r) => (
                      <FilaEspejo key={r.codequipo} center={<EscudoBox escudo={r.escudo} nombre={r.nombre_equipo} size={22} radius={5} />} gc={r.gc} gf={r.gf} maxBar={maxG} />
                    ))}
                  </div>
                )
              })()}
              {tramosComp.some((t) => t.gf > 0) && (() => {
                const maxT = Math.max(1, ...tramosComp.map((t) => t.gf))
                return (
                  <div className="statbox">
                    <div className="cap" style={{ marginBottom: 9 }}>Goles por tramo del partido · toda la competición</div>
                    {tramosComp.map((t) => (
                      <FilaEspejo key={t.tramo} center={`${t.tramo}${t.tramo !== '90+' ? "'" : ''}`} gc={0} gf={t.gf} maxBar={maxT} soloGf />
                    ))}
                  </div>
                )
              })()}
              <div className="leyenda">Goles por equipo a la misma escala: <b style={{ color: 'var(--e0)' }}>encajados</b> a la izquierda, <b style={{ color: 'var(--e3)' }}>marcados</b> a la derecha. Abajo, los goles de la competición por tramo del partido.</div>
            </section>
          )}

          {tabEf === 'top10-tarjetas-temporada' && (
            <TarjetasTemporadaV2 equipos={juegoLimpio} jugadores={alertas} fichas={fichas} ambito={`${nombre}${grupo.nombre_grupo ? ` · ${grupo.nombre_grupo}` : ''}`} />
          )}

          {tabEf !== 'clasificacion' && tabEf !== 'resultados' && tabEf !== 'goleadores-jornada' && tabEf !== 'tarjetas-jornada' && tabEf !== 'estadisticas' && tabEf !== 'top10-tarjetas-temporada' && (rankView ? (
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
              <div className="xi-wrap">
                <div className="xi-campo">{campoXI(xiView.players)}</div>
                <div className="xi-lista"><RankingComp items={xiView.items} fichas={fichas} /></div>
              </div>
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
      </div>
    </div>
  )
}
