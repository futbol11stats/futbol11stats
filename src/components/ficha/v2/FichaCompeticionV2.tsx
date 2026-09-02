import './ficha.css'
import type { ReactNode } from 'react'
import { MapPin, CalendarPlus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Sello from '@/components/Sello'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreEquipo from '@/components/NombreEquipo'
import { Escudo, Balon, Guante, TarjetaAmarilla, TarjetaDoble, TarjetaRoja, Camiseta, CamisetaHueca, Reloj } from '@/components/iconos'
import { nombreOficial, denominacion, familiaSello } from '@/lib/sellos'
import { ensureMadrid, SITE_URL } from '@/lib/seo'
import { fechaCortaDMY, equipoSlug } from '@/lib/equipo'
import { campoMapsUrl, parseCampo } from '@/lib/club'
import { getCamposConFicha, campoSlug } from '@/lib/campo'
import SuperficieCampo from '@/components/SuperficieCampo'
import { googleRenderUrl } from '@/lib/ics'
import CalendarLink from '@/components/calendario/CalendarLink'
import { partidoSlug } from '@/lib/partidoSlug'
import FormaStrip from '@/components/ui/FormaStrip'
import { fmtNum } from '@/lib/formato'
import JsonLd from '@/components/JsonLd'
import { graphLd, sportsEventLd } from '@/lib/jsonld'
import { escudoUrl } from '@/lib/supabase'
import { esTemporadaActiva } from '@/lib/temporadas'
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
import ScrollRail from '@/components/ficha/v2/ScrollRail'
import ReportesScroll from '@/components/ficha/v2/ReportesScroll'
import {
  datosGoleadorTemp, datosPorteroTemp, datosFantasyTemp, datosEloTemp, datosXiTemp,
  leyGoleadorTemp, leyPorteroTemp, leyFantasyTemp, leyEloTemp, leyXiTemp, leyJornada,
} from '@/components/ficha/v2/lineasComp'
import {
  slugToCod, codToSlug, universoTemporadas, getGrupoV2, getVariantesV2, getGruposHermanos,
  getClasifV2, getClasifPretemporada, kpisDeClasif, zonaColor, type ClasifCompRow,
  getDestacadosV2, getEquiposFormaV2, getTopTemporadaV2, getXiJornadaV2, getXiTemporadaV2,
  getResultadosV2, getEquiposMapV2, type ResultadoCompRow, getCarreraV2, tienePartidosJugados,
  getLideresV2, getCifrasV2, type CifrasComp, getSuspendidosV2, getPartidosJornadaV2, getTramosCompeticionV2,
  golesEquipoJornada, type GolEquipoRow, getJuegoLimpioV2, getAlertasV2,
  getClasifCopaV2, type ClasifCopaRow,
} from '@/lib/competicionV2'
import MatchdaySelector from '@/components/ficha/v2/MatchdaySelector'


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
      {/* Jornada (partido único): se omite el 0 igual que en las tarjetas. Portería a cero solo si la
          mantuvo; goles solo si marcó. */}
      {esPor
        ? (p.goles_encajados === 0 && <span><b className="num">1</b><span style={{ color: 'var(--amber)', display: 'inline-flex' }}><Guante size={11} /></span></span>)
        : ((p.goles ?? 0) > 0 && <span><b className="num">{p.goles}</b><span style={{ color: 'var(--e3)', display: 'inline-flex' }}><Balon size={11} /></span></span>)}
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
// fecha 'DD/MM/YYYY' (+ hora 'HH:MM' opcional) -> ISO 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM' para SportsEvent.startDate.
function fechaHoraIso(fecha: string | null, hora: string | null): string | null {
  const f = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((fecha || '').trim())
  if (!f) return null
  const dmy = `${f[3]}-${f[2]}-${f[1]}`
  const h = hora ? /(\d{1,2}):(\d{2})/.exec(hora) : null
  return h ? `${dmy}T${h[1].padStart(2, '0')}:${h[2]}` : dmy
}

// Icono de tarjeta según el motivo de la suspensión (texto de web_suspendidos).
function motivoCard(motivo: string | null) {
  if (!motivo) return null
  if (/roja/i.test(motivo)) return <span style={{ color: 'var(--card-r)', display: 'inline-flex' }}><TarjetaRoja size={13} /></span>
  if (/doble/i.test(motivo)) return <span style={{ color: 'var(--card-y)', display: 'inline-flex' }}><TarjetaDoble size={14} /></span>
  return <span style={{ color: 'var(--card-y)', display: 'inline-flex' }}><TarjetaAmarilla size={13} /></span>
}

// El JSON-LD (breadcrumb) NO lo emite este componente: lo mantiene el page.tsx, que conoce la URL canónica.
export default async function FichaCompeticionV2({ categoria, slugComp, slugGrupo, temporada, jornadaSeg, tab }: {
  categoria: string; slugComp: string; slugGrupo: string; temporada: string; jornadaSeg: string; tab: string
}) {
  const codtemporada = slugToCod(temporada)
  if (!codtemporada) notFound()
  const grupo = await getGrupoV2(categoria, slugComp, slugGrupo, codtemporada)
  if (!grupo) notFound()

  const isCopa = !!grupo.tipo && grupo.tipo !== 'LIGA'
  const rondas: Ronda[] = isCopa && Array.isArray(grupo.rondas) ? grupo.rondas : []
  const esFamilia = rondas.length > 0
  const rondaSel = esFamilia ? (rondas.find((r) => r.slug === jornadaSeg) || rondas.find((r) => r.idx === grupo.jornada_actual) || rondas[rondas.length - 1]) : null
  const jornadaNum = rondaSel ? rondaSel.idx : (parseInt(jornadaSeg.replace('jornada-', '')) || grupo.jornada_actual)
  const segJornada = rondaSel ? rondaSel.slug : `jornada-${jornadaNum}`

  // Clasificación de FASE DE GRUPOS de copa (todos los matchdays de ambos grupos). Existe SOLO en la ronda de
  // grupos (cada fila trae ronda_slug), así que su presencia gobierna la pestaña "Clasificación": no aparece en
  // eliminatorias/playoff (sin tabla). Se pide aquí porque decide las pestañas visibles.
  const clasifCopa = isCopa && rondaSel ? await getClasifCopaV2(grupo.codgrupo, codtemporada, rondaSel.slug) : []
  const hayClasifCopa = clasifCopa.length > 0
  const copaMatchdays = Array.from(new Set(clasifCopa.map((r) => r.jornada))).sort((a, b) => a - b)
  const copaGrupos = Array.from(new Set(clasifCopa.map((r) => r.grupo_label))).sort()

  const modo: 'jornada' | 'temporada' = TEMP_IDS.has(tab) ? 'temporada' : 'jornada'
  const tabsJ: ReadonlyArray<readonly [string, string]> = isCopa
    ? (hayClasifCopa ? [['clasificacion', 'Clasificación'] as const, ...TABS_JORNADA_COPA] : TABS_JORNADA_COPA)
    : TABS_JORNADA_LIGA
  const tabsT = isCopa ? TABS_TEMP_COPA : TABS_TEMP_LIGA
  const tabsActivas = modo === 'temporada' ? tabsT : tabsJ
  const tabEf = tabsActivas.some((t) => t[0] === tab) ? tab : tabsActivas[0][0]

  // Estado de la competición (mismo discriminante que la pastilla de la cabecera): ¿algún partido jugado?
  const hayJugados = await tienePartidosJugados(grupo.codgrupo, codtemporada)
  const sinEmpezarLiga = !isCopa && !hayJugados
  // Clasificación: normal si hay jugados; en PRETEMPORADA (liga sin empezar, web_clasificacion vacía) se compone
  // por ELO con todo a cero. Alimenta KPIs + panel; en copa no hay clasificación.
  const clasif: ClasifCompRow[] = isCopa ? []
    : sinEmpezarLiga ? await getClasifPretemporada(grupo.codgrupo, codtemporada)
      : await getClasifV2(grupo.codgrupo, codtemporada, jornadaNum)
  const kpis = kpisDeClasif(clasif)
  // ELO por jornada: variación respecto a la jornada anterior (misma tabla web_clasificacion, mismo
  // matchday) para colorear el ELO en la clasificación —verde sube / rojo baja—. Ganar/perder ELO
  // significa hacerlo contra las expectativas. Solo liga empezada y jornada > 1; si no, sin color.
  const clasifPrev = (!isCopa && !sinEmpezarLiga && jornadaNum > 1)
    ? await getClasifV2(grupo.codgrupo, codtemporada, jornadaNum - 1) : []
  const eloPrev = new Map<string, number>()
  for (const rp of clasifPrev) if (rp.elo != null) eloPrev.set(String(rp.codequipo), rp.elo)
  // Carrera de posiciones (gráfico protagonista) — solo en Clasificación y con partidos jugados (en pretemporada
  // no hay serie que dibujar).
  const carrera = !isCopa && tabEf === 'clasificacion' && hayJugados
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
    partMap = await getPartidosJornadaV2(grupo.codgrupo, codtemporada, jornadaNum, golJ.map((j: any) => String(j.codjugador)), esFamilia ? (rondaSel?.label ?? null) : null)
  } else if (tabEf === 'tarjetas-jornada') {
    const [tj, susp] = await Promise.all([
      getDestacadosV2(grupo.codgrupo, codtemporada, jornadaNum, 'tarjetas_jornada'),
      getSuspendidosV2(grupo.codgrupo, codtemporada, jornadaNum + 1),
    ])
    tarjJ = tj; suspendidos = susp
  } else if (tabEf === 'top5-jugadores-jornada') {
    mvpJ = await getDestacadosV2(grupo.codgrupo, codtemporada, jornadaNum, 'mvp_jornada')
    partMap = await getPartidosJornadaV2(grupo.codgrupo, codtemporada, jornadaNum, mvpJ.map((j: any) => String(j.codjugador)), esFamilia ? (rondaSel?.label ?? null) : null)
  }
  else if (tabEf === 'top5-equipos-jornada') equiposForma = await getEquiposFormaV2(grupo.codgrupo, codtemporada, jornadaNum)
  else if (tabEf === 'once-optimo-jornada') {
    xi = await getXiJornadaV2(grupo.codgrupo, codtemporada, jornadaNum, isCopa)
    partMap = await getPartidosJornadaV2(grupo.codgrupo, codtemporada, jornadaNum, xi.map((j: any) => String(j.codjugador)), esFamilia ? (rondaSel?.label ?? null) : null)
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
  // TRES estados de la cabecera, discriminados por PARTIDOS JUGADOS (jornada_actual/total no basta: una temporada
  // SIN EMPEZAR trae el calendario cargado con jornada_actual >= total y 0 resultados):
  //  - SIN EMPEZAR: 0 partidos jugados -> "Por comenzar".
  //  - EN JUEGO: hay jugados, quedan jornadas/rondas por jugar (jornada_actual < total) y es la temporada activa.
  //  - FINALIZADA: hay jugados y no quedan (o es una temporada pasada ya cerrada).
  const sinEmpezar = !hayJugados
  const enJuego = hayJugados && !!grupo.total_jornadas && grupo.jornada_actual < grupo.total_jornadas
    && await esTemporadaActiva(categoria, slugComp, codtemporada)
  const terminada = hayJugados && !enJuego
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
      title: '5 mejores jugadores', sub: `puntos fantasy · ${esFamilia ? (rondaSel?.label ?? `jornada ${jornadaNum}`) : `jornada ${jornadaNum}`}`,
      items: mvpJ.map((j) => {
        const p = partMap.get(String(j.codjugador))
        // valor = puntos del RANKING agregado (j.pts_fantasy), NO del partido (p.puntos): en copa el idx de ronda
        // (final=2) NO es el matchday de web_jugador_partidos (1,2,3 de grupos), así que p sería otro partido y
        // el orden descuadraría. En liga j.pts_fantasy == p.puntos (una jornada). Igual que el fix de goleadores.
        return {
          rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo,
          valor: Math.round((j.pts_fantasy ?? p?.puntos) ?? 0), valorColor: 'var(--e3)',
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
        valor: j.goles ?? 0, valorColor: 'var(--amber)', barPct: ((j.goles ?? 0) / max) * 100,
        extra: datosPorteroTemp(j),
      })),
      leyenda: <>{leyPorteroTemp} Elegibles desde la J3 (≥65 % de jornadas, media ≥60′).</>,
    }
  } else if (topTemp && tabEf === 'top10-elo-jugadores-temporada') {
    rankView = {
      title: 'ELO jugadores', sub: `tras J${jornadaNum}`,
      items: topTemp.elo.map((j, i) => ({
        rank: j.rank ?? i + 1, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo,
        valor: fmtNum(j.elo), valorColor: colorElo(j.elo) || 'var(--e1)',
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
        valor: fmtNum(j.pts_fantasy ?? 0), valorColor: 'var(--e3)', barPct: (Math.round(j.pts_fantasy ?? 0) / max) * 100,
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
    const valOf = (j: any) => fmtNum((esTemp ? j.pts_totales : (j.pts_fantasy ?? j.pts_jornada)) ?? 0)
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
          codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion,
          escudo: j.escudo, nombreEquipo: j.nombre_equipo, valor: valOf(j), valorColor: POSC[j.posicion] ?? 'var(--e3)', extra,
        }
      }),
      leyenda: esTemp ? leyXiTemp : leyJornada,
    }
  }

  // Tabla de clasificación de UN grupo de copa: mismo markup flex que la de liga pero con el subconjunto de
  // columnas que la copa tiene con dato (pos, escudo, equipo, PJ, PG, PE, PP, GF, GC, DG, Pts, Mov). Sin
  // zona/ELO/PF/Forma/Racha/PO (NULL en copa).
  const tablaCopa = (rows: ClasifCopaRow[]) => (
    <div className="ctabla"><ScrollRail className="ctw" wrapClassName="srail-tabla">
      <div className="ctr head">
        <div className="cfix"><span className="cpos">#</span><span style={{ width: 24, flex: 'none' }} /><span className="ceq">Equipo</span></div>
        {['PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG'].map((cc) => <span key={cc} className={`cc${cc === 'DG' ? ' dg' : ''}`}>{cc}</span>)}
        <span className="cc pts">Pts</span>
        <span className="cc">Mov</span>
      </div>
      {rows.map((r) => {
        const movCol = r.mov?.startsWith('↑') ? 'var(--e3)' : r.mov?.startsWith('↓') ? 'var(--e0)' : 'var(--ink-3)'
        return (
          <div key={r.codequipo} className="ctr">
            <div className="cfix">
              <span className="cpos">{r.pos}</span>
              <EscudoBox escudo={r.escudo} nombre={r.nombre_equipo} size={22} radius={5} />
              <span className="ceq"><NombreEquipo codequipo={r.codequipo} nombre={r.nombre_equipo} /></span>
            </div>
            <span className="cc">{r.pj}</span><span className="cc">{r.pg}</span><span className="cc">{r.pe}</span><span className="cc">{r.pp}</span>
            <span className="cc">{r.gf}</span><span className="cc">{r.gc}</span>
            <span className="cc dg">{r.dg > 0 ? `+${r.dg}` : r.dg}</span>
            <span className="cc pts">{r.pts}</span>
            <span className="cc" style={{ color: movCol }}>{r.mov || '—'}</span>
          </div>
        )
      })}
    </ScrollRail></div>
  )

  // Un partido de la lista de Resultados (extraído para reutilizarlo agrupado por grupo_label en copa).
  // Campo del PARTIDO (dato de la fila web_resultados, NO la instalación habitual del equipo local). Chincheta +
  // superficie legible como en la ficha de equipo. Enlace INTERNO a nuestra ficha /campos/[slug] si el campo la
  // tiene (lleva dentro "Cómo llegar" + dirección + mapa + equipos habituales; la sede puntual no incluye a los de
  // hoy, pero dirección/mapa/ruta siguen siendo válidos). Si no tiene ficha, cae a Maps (externo) cuando hay
  // coords/código; sin dato -> texto plano.
  const camposConFicha = await getCamposConFicha()
  const renderCampoPartido = (r: ResultadoCompRow): ReactNode => {
    if (!r.campo) return null
    const { nombre, superficie } = parseCampo(r.campo)
    const txt = <>{nombre}{superficie && <span className="campo-sup"> · <SuperficieCampo superficie={superficie} /></span>}</>
    if (r.codigo_campo != null && camposConFicha.has(String(r.codigo_campo))) {
      return <Link className="rmeta-campo" href={`/campos/${campoSlug(String(r.codigo_campo), nombre)}`}><MapPin size={11} strokeWidth={2.25} />{txt}</Link>
    }
    const canLink = r.campo_lat != null || r.codigo_campo != null
    const href = canLink ? campoMapsUrl({ codigo: r.codigo_campo ?? null, nombre: r.campo, localidad: r.campo_localidad ?? null, lat: r.campo_lat ?? null, lng: r.campo_lng ?? null }) : null
    return href
      ? <a className="rmeta-campo" href={href} target="_blank" rel="noopener noreferrer"><MapPin size={11} strokeWidth={2.25} />{txt}</a>
      : txt
  }
  const renderPartido = (r: ResultadoCompRow, i: number) => {
    const jugado = r.goles_local != null && r.goles_visitante != null
    const metaFH = [r.fecha ? fechaCortaDMY(r.fecha) : null, r.hora || null].filter(Boolean).join(' · ')
    const campoEl = renderCampoPartido(r)
    // Botón "Añadir a mi calendario": solo partido NO jugado, con fecha Y hora (no 00:00). El .ics lo sirve
    // /api/ics/<id> (LOCATION+GEO del campo si los hay). Discreto, bajo el "vs", sin tocar los marcadores.
    const puedeIcs = !jugado
      && !!r.fecha && /^\d{2}\/\d{2}\/\d{4}$/.test(r.fecha)
      && !!r.hora && /^\d{1,2}:\d{2}$/.test(r.hora) && r.hora !== '00:00'
    // Botón de calendario: vía principal Google Calendar (crear evento, un toque en Android); Apple -> .ics.
    // Con TEXTO (no cabe en la pastilla del marcador) -> va en la línea de metadatos, bajo fecha/campo.
    const icsUrl = `/api/ics/${r.codacta}`
    const googleUrl = puedeIcs ? googleRenderUrl({
      title: `${r.nombre_local} vs ${r.nombre_visitante}`,
      fecha: r.fecha as string, hora: r.hora as string,
      campo: r.campo ? (parseCampo(r.campo).nombre || null) : null,
      details: `${grupo.nombre_comp} · ${temporada}\n${SITE_URL}/madrid/${categoria}/${slugComp}/${slugGrupo}/${temporada}/${jornadaSeg}/resultados`,
    }) : null
    return (
      <div className="rmatch-wrap" key={r.codacta ?? i}>
        <div className="rmatch">
          <div className="rside">
            <EscudoBox escudo={r.escudo_local} nombre={r.nombre_local} size={26} radius={5} />
            <span className={`rnm${jugado && (r.goles_local as number) > (r.goles_visitante as number) ? ' w' : ''}`}><NombreEquipo codequipo={equiposMap.get(r.nombre_local) ?? null} nombre={r.nombre_local} /></span>
          </div>
          {(() => {
            const linkable = codtemporada === 22 && r.codacta
            const inner = jugado ? (() => {
              const gL = r.goles_local as number, gV = r.goles_visitante as number
              const cL = gL > gV ? 'var(--e3)' : gL < gV ? 'var(--e0)' : 'var(--ink-2)'
              const cV = gV > gL ? 'var(--e3)' : gV < gL ? 'var(--e0)' : 'var(--ink-2)'
              return <><span style={{ color: cL }}>{gL}</span><span className="rsc-sep">-</span><span style={{ color: cV }}>{gV}</span></>
            })() : (linkable ? <span className="rsc-previa">Previa</span> : 'vs')
            // Jugado -> marcador (enlaza en T22). Futuro con ficha (T22) -> botón "Previa" que abre el pronóstico;
            // sin ficha -> "vs" plano. El marcador enlaza a la ficha del partido SOLO en la temporada actual.
            return linkable
              ? <Link className={`rsc rsc-link${jugado ? '' : ' rsc-prev'}`} href={`/madrid/partido/${partidoSlug(r.codacta as string, r.nombre_local, r.nombre_visitante)}`}>{inner}</Link>
              : <div className="rsc">{inner}</div>
          })()}
          <div className="rside v">
            <EscudoBox escudo={r.escudo_visitante} nombre={r.nombre_visitante} size={26} radius={5} />
            <span className={`rnm${jugado && (r.goles_visitante as number) > (r.goles_local as number) ? ' w' : ''}`}><NombreEquipo codequipo={equiposMap.get(r.nombre_visitante) ?? null} nombre={r.nombre_visitante} /></span>
          </div>
        </div>
        {(metaFH || campoEl || puedeIcs) && (
          <div className="rmeta">
            {(metaFH || campoEl) && <span>{metaFH}{campoEl && <>{metaFH ? ' · ' : ''}{campoEl}</>}</span>}
            {puedeIcs && (
              <CalendarLink appleHref={icsUrl} otherHref={googleUrl || icsUrl} className="rmeta-cal">
                <CalendarPlus size={12} strokeWidth={2.25} /> Añade este partido a tu calendario
              </CalendarLink>
            )}
          </div>
        )}
      </div>
    )
  }
  // Copa fase de grupos: los resultados se agrupan por grupo_label (A y B no compiten entre sí). Solo cuando
  // TODOS traen etiqueta (fase de grupos); en eliminatorias/liga -> lista plana.
  const resGrupos = resultados.length > 0 && resultados.every((r) => r.grupo_label)
    ? Array.from(new Set(resultados.map((r) => r.grupo_label as string))).sort()
    : []

  return (
    <div className="fjv2 fcv2">
      {/* IDENTIDAD + SELECTORES (columna de rótulos a la izquierda) */}
      <div className="ident">
        <div className="ident-top">
          <span className="comp-sello"><Sello nombreComp={grupo.nombre_comp} src={esFamilia ? familiaSello(grupo.slug_comp, grupo.nombre_comp) : undefined} size={52} /></span>
          <div className="ident-name">
            <div className="over">RFFM · MADRID</div>
            <h1 className="h1">{tituloGrupo}</h1>
            <div className="ident-meta">
              {/* Tres estados. Copa/playoff: total_jornadas cuenta RONDAS (grupos=1, final=2), no jornadas reales ->
                  el contador "J2 DE 2" engaña; se muestra la RONDA en curso ("Final", "Fase de grupos") sin numerar.
                  Liga: el contador de jornadas sí es real. */}
              {sinEmpezar
                ? <span className="pill n">Por comenzar</span>
                : enJuego
                  ? <span className="pill live">EN JUEGO · {isCopa
                      ? (rondas.find((r) => r.idx === grupo.jornada_actual)?.label ?? 'En curso')
                      : `J${grupo.jornada_actual} DE ${grupo.total_jornadas}`}</span>
                  : <span className="pill n">{isCopa ? 'Finalizada' : `Finalizada · ${grupo.total_jornadas} jornadas`}</span>}
              {kpis.equipos > 0 && <span className="pill n">{kpis.equipos} equipos</span>}
              <span className="pill n">{temporada}</span>
            </div>
          </div>
        </div>
        <div className="selrow">
          <div className="sel-lbl">Temporada</div>
          <ScrollRail><div className="sel-rail">
            {/* Universo derivado del dato: techo = temporada más nueva de este grupo (variantes), suelo = inicio
                de datos. Se grisea donde el grupo no tiene fila -> una temporada nueva aparece sola, sin registrarla. */}
            {universoTemporadas(Math.max(codtemporada, ...Object.keys(variantes).map(Number))).map((cod) => {
              const v = variantes[cod], label = codToSlug(cod)
              if (!v) return <span key={cod} className="off" title="Sin datos en esta temporada">{label}</span>
              return <Link key={cod} href={`/madrid/${categoria}/${v.slug_comp}/${v.slug_grupo}/${label}/${v.seg}/${tab}`} className={codtemporada === cod ? 'on' : ''}>{label}</Link>
            })}
          </div></ScrollRail>
        </div>
        {!isCopa && hermanos.length > 0 && (
          <div className="selrow" style={{ paddingBottom: 16 }}>
            <div className="sel-lbl">Grupo</div>
            <ScrollRail><div className="sel-rail">
              <Link href={`/madrid/${categoria}/${slugComp}/global/${temporada}/jornada-${jornadaNum}/${modo === 'temporada' ? tab : 'clasificacion'}`} className="glob">Global</Link>
              {hermanos.map((g) => (
                <Link key={g.codgrupo} href={`/madrid/${categoria}/${g.slug_comp}/${g.slug_grupo}/${temporada}/jornada-${jornadaNum}/${tab}`}
                  className={String(g.codgrupo) === String(grupo.codgrupo) ? 'on' : ''}>{g.nombre_grupo}</Link>
              ))}
            </div></ScrollRail>
          </div>
        )}
      </div>

      {/* PANORAMA — líderes + cifras a ancho completo, dependen del ámbito */}
      {!isCopa && (
        <Panorama lideres={lideres} cifras={cifras} kpis={kpis} fichas={fichas}
          subLideres={`${temporada}${grupo.nombre_grupo ? ` · ${grupo.nombre_grupo}` : ''}`} subCifras={`tras la jornada ${jornadaNum}`} />
      )}

      {/* PESTAÑAS sticky: Reportes de (pastilla) · Jornada (pastilla) · Ver (subrayado) */}
      <ReportesScroll tab={tabEf} land={true} />
      <div className="tabs" id="reportes-anchor">
        <div className="modo">
          <div className="sel-lbl">Reportes de</div>
          <Link href={`${baseTab}/${tabsJ[0][0]}`} className={modo === 'jornada' ? 'on' : ''}>Jornada</Link>
          <Link href={`${base}/jornada-${jornadaNum}/${tabsT[0][0]}`} className={modo === 'temporada' ? 'on' : ''}>Temporada</Link>
        </div>
        <div className="jrow">
          <div className="sel-lbl">{jlbl}</div>
          <ScrollRail><div className="jbar-rail">
            {esFamilia
              ? rondas.map((r) => <Link key={r.slug} href={`${base}/${r.slug}/${tab}`} className={r.idx === jornadaNum ? 'on' : ''}>{r.label}</Link>)
              : Array.from({ length: grupo.total_jornadas || 0 }, (_, i) => i + 1).map((j) => (
                <Link key={j} href={`${base}/jornada-${j}/${tab}`} className={j === jornadaNum ? 'on' : ''}>J{j}</Link>
              ))}
          </div></ScrollRail>
        </div>
        <div className="verrow">
          <div className="sel-lbl">Ver</div>
          <ScrollRail><div className="verrail">
            {tabsActivas.map(([id, label]) => {
              const href = modo === 'temporada' ? `${base}/jornada-${jornadaNum}/${id}` : `${baseTab}/${id}`
              return <Link key={id} href={href} className={id === tabEf ? 'on' : ''}>{label}</Link>
            })}
          </div></ScrollRail>
        </div>
      </div>

      <div className="full">
        <div className="main">
          {/* CLASIFICACIÓN de LIGA (increment 1) */}
          {tabEf === 'clasificacion' && !isCopa && (
            <section id="s-clasif">
              <div className="s-head"><h2 className="s-title">Clasificación</h2><div className="s-sub">tras la jornada {jornadaNum}</div></div>
              {clasif.length > 0 ? (
                <>
                  <div className="ctabla"><ScrollRail className="ctw" wrapClassName="srail-tabla">
                    <div className="ctr head">
                      <div className="cfix"><span className="czona" /><span className="cpos">#</span><span style={{ width: 24, flex: 'none' }} /><span className="ceq">Equipo</span></div>
                      {['PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG'].map((c) => <span key={c} className={`cc${c === 'DG' ? ' dg' : ''}`}>{c}</span>)}
                      <span className="cc pts">Pts</span>
                      <span className="cc">Mov</span>
                      <span className="cc">PF</span>
                      <span className="cc" style={{ marginLeft: 8 }}>ELO</span>
                      <span className="cracha">Forma</span>
                      <span className="ccom">Racha</span>
                      <span className="cc">PO</span>
                    </div>
                    {clasif.map((r) => {
                      const z = zonaEf(r.zona)
                      const movCol = r.mov?.startsWith('↑') ? 'var(--e3)' : r.mov?.startsWith('↓') ? 'var(--e0)' : 'var(--ink-3)'
                      return (
                        <div key={r.codequipo} className="ctr" style={ZONA_BG[z] ? { backgroundColor: ZONA_BG[z].backgroundColor } : undefined}>
                          <div className="cfix">
                            <span className="czona" style={{ background: zonaColor(r.zona) }} />
                            <span className="cpos">{r.pos}</span>
                            <EscudoBox escudo={r.escudo} nombre={r.nombre_equipo} size={22} radius={5} />
                            <span className="ceq"><NombreEquipo codequipo={r.codequipo} nombre={r.nombre_equipo} /></span>
                          </div>
                          <span className="cc">{r.pj}</span><span className="cc">{r.pg}</span><span className="cc">{r.pe}</span><span className="cc">{r.pp}</span>
                          <span className="cc">{r.gf}</span><span className="cc">{r.gc}</span>
                          <span className="cc dg">{r.dg > 0 ? `+${r.dg}` : r.dg}</span>
                          <span className="cc pts">{r.pts}</span>
                          <span className="cc" style={{ color: movCol }}>{r.mov || '—'}</span>
                          <span className="cc">{fmtNum(r.pts_fantasy)}</span>
                          {(() => {
                            const prev = eloPrev.get(String(r.codequipo))
                            const eloD = !sinEmpezar && r.elo != null && prev != null ? Math.round(r.elo - prev) : null
                            const col = sinEmpezar ? (colorElo(r.elo) || undefined)
                              : eloD ? (eloD > 0 ? 'var(--e3)' : 'var(--e0)') : undefined   // verde sube / rojo baja
                            return <span className="cc" style={{ color: col, marginLeft: 8 }} title={eloD ? `${eloD > 0 ? '+' : '−'}${Math.abs(eloD)} esta jornada` : undefined}>{fmtNum(r.elo)}</span>
                          })()}
                          <span className="cracha"><FormaStrip items={Array.from(r.forma || '').slice(-5)} size={13} gap={2} /></span>
                          <span className="ccom">{r.racha || ''}</span>
                          <span className="cc">{r.p0 ?? '—'}</span>
                        </div>
                      )
                    })}
                  </ScrollRail></div>
                  {leyendaZ.length > 0 && (
                    <div className="leyenda-z">
                      {leyendaZ.map((z) => <span key={z.tipo}><i style={ZONA_BG[z.tipo]} />{z.label}</span>)}
                    </div>
                  )}
                  <div className="leyenda" style={{ paddingTop: 10 }}><b>Mov</b> cambio de posición vs. jornada anterior · <b>PF</b> puntos fantasy · <b>PO</b> porterías a cero · <b>Forma</b> últimos 5: <b style={{ color: 'var(--e3)' }}>ganó</b> · <b style={{ color: 'var(--ink-3)' }}>empató</b> · <b style={{ color: 'var(--e0)' }}>perdió</b> · <b>Racha</b> racha actual del equipo.</div>
                </>
              ) : <p className="vacio">Sin clasificación en esta jornada.</p>}
            </section>
          )}

          {/* CLASIFICACIÓN de COPA (fase de grupos): una tabla por grupo, con selector de matchday (máquina del
              tiempo) dentro de la pestaña. Los snapshots de cada matchday se renderizan en servidor y el cliente
              alterna cuál se ve; por defecto, la última jornada disponible. */}
          {tabEf === 'clasificacion' && isCopa && hayClasifCopa && (
            <section id="s-clasif">
              <div className="s-head"><h2 className="s-title">Clasificación</h2><div className="s-sub">{rondaSel?.label ?? 'Fase de grupos'}</div></div>
              <MatchdaySelector matchdays={copaMatchdays}>
                {copaMatchdays.map((j) => (
                  <div key={j}>
                    {copaGrupos.map((gl) => (
                      <div key={gl} className="grupo-clasif">
                        <div className="grupo-tit">{gl}</div>
                        {tablaCopa(clasifCopa.filter((r) => r.jornada === j && r.grupo_label === gl))}
                      </div>
                    ))}
                  </div>
                ))}
              </MatchdaySelector>
              <div className="leyenda" style={{ paddingTop: 10 }}><b>Mov</b> cambio de posición vs. la jornada anterior de la fase de grupos.</div>
            </section>
          )}

          {/* CARRERA DE POSICIONES — gráfico protagonista, bajo la clasificación. */}
          {tabEf === 'clasificacion' && carrera.series.length > 0 && (
            <section>
              <div className="s-head"><h2 className="s-title">Carrera de posiciones</h2><div className="s-sub">jornada a jornada</div></div>
              <CarreraPosiciones key={grupo.codgrupo} series={carrera.series} jornadas={carrera.jornadas} bands={carrera.bands} />
            </section>
          )}

          {/* RESULTADOS — marcador + escudos; campo/fecha/hora en la meta, omitiendo lo que falte. */}
          {tabEf === 'resultados' && (
            <section>
              <div className="s-head"><h2 className="s-title">Resultados</h2><div className="s-sub">{esFamilia ? (rondaSel?.label ?? `jornada ${jornadaNum}`) : `jornada ${jornadaNum}`}</div></div>
              {/* SportsEvent a NIVEL DE EQUIPO por partido. LÍNEA ROJA: solo equipos/fecha/campo/marcador; NUNCA
                  jugadores (athlete/performer/attendee) -> reintroduciría la entidad-persona descartada, y aquí,
                  en resultados, que es indexable en juvenil por NO tener nombres de personas. Ver jsonld.ts. */}
              {resultados.length > 0 && (
                <JsonLd data={graphLd(...resultados.map((r) => sportsEventLd({
                  local: r.nombre_local,
                  visitante: r.nombre_visitante,
                  localUrl: equiposMap.get(r.nombre_local) ? `${SITE_URL}/madrid/equipo/${equipoSlug(equiposMap.get(r.nombre_local)!, r.nombre_local)}` : null,
                  visitanteUrl: equiposMap.get(r.nombre_visitante) ? `${SITE_URL}/madrid/equipo/${equipoSlug(equiposMap.get(r.nombre_visitante)!, r.nombre_visitante)}` : null,
                  localLogo: escudoUrl(r.escudo_local),
                  visitanteLogo: escudoUrl(r.escudo_visitante),
                  golesLocal: r.goles_local,
                  golesVisitante: r.goles_visitante,
                  fechaIso: fechaHoraIso(r.fecha, r.hora),
                  // location.name = nombre LIMPIO (sin código de superficie): es un nombre de LUGAR para máquinas,
                  // no texto para lector. La superficie (HA/HN/T) se conserva en la vista (renderCampoPartido), no aquí.
                  campo: r.campo ? parseCampo(r.campo).nombre : null,
                  campoLat: r.campo_lat ?? null, campoLng: r.campo_lng ?? null,   // coords del partido -> Place.geo
                  competicion: `${tituloGrupo} · ${temporada}${esFamilia && rondaSel ? ` · ${rondaSel.label}` : ''}`,
                })))} />
              )}
              {resultados.length === 0 ? <p className="vacio">Sin resultados en esta jornada.</p>
                : resGrupos.length > 0
                  ? resGrupos.map((gl) => (
                    <div key={gl} className="grupo-res">
                      <div className="grupo-tit">{gl}</div>
                      {resultados.filter((r) => r.grupo_label === gl).map(renderPartido)}
                    </div>
                  ))
                  : resultados.map(renderPartido)}
            </section>
          )}

          {/* GOLEADORES (jornada) + Goles de equipo. */}
          {tabEf === 'goleadores-jornada' && (
            <>
              <section>
                <div className="s-head"><h2 className="s-title">Goleadores de la jornada</h2><div className="s-sub">{esFamilia ? (rondaSel?.label ?? `jornada ${jornadaNum}`) : `jornada ${jornadaNum}`}</div></div>
                {golJ.length > 0
                  ? <RankingComp fichas={fichas} barColor="var(--e4)" items={golJ.map((j) => {
                    const p = partMap.get(String(j.codjugador))
                    // valor = goles del RANKING agregado (j.goles), NO del partido (p.goles): en copa la fase de
                    // grupos agrega varios matchdays bajo jornada 1, y p.goles es solo el de un partido -> un
                    // goleador que marcó en otro matchday saldría con 0. En liga j.goles == p.goles (una jornada).
                    return { rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo, valor: (j.goles ?? p?.goles) ?? 0, valorColor: 'var(--e4)', extra: p ? filaJornada(p) : <span className="cfj-none">Sin datos del partido</span> }
                  })} />
                  : <p className="vacio">Sin goleadores en esta jornada.</p>}
                {golJ.length > 0 && <div className="leyenda">{leyJornada}</div>}
              </section>
              {golesEquipo.length > 0 && (
                <section>
                  <div className="s-head"><h2 className="s-title">Goles de equipo</h2><div className="s-sub">jornada {jornadaNum}</div></div>
                  <RankingComp barColor="var(--e4)" items={golesEquipo.map((e, i) => ({ rank: i + 1, codequipo: e.codequipo, nombre: e.nombre, escudo: e.escudo, nombreEquipo: e.nombre, valor: e.goles, valorColor: 'var(--e4)' }))} />
                </section>
              )}
            </>
          )}

          {/* TARJETAS (jornada) + Suspendidos (jornada siguiente). */}
          {tabEf === 'tarjetas-jornada' && (
            <>
              <section>
                <div className="s-head"><h2 className="s-title">Tarjetas de la jornada</h2><div className="s-sub">{esFamilia ? (rondaSel?.label ?? `jornada ${jornadaNum}`) : `jornada ${jornadaNum}`}</div></div>
                {tarjJ.length > 0
                  ? <RankingComp fichas={fichas} items={tarjJ.map((j) => {
                    const ta = j.goles || 0, dob = j.goles_enc || 0, rj = j.racha_5p || 0
                    return { rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo, valor: cardsSpan(ta, dob, rj), valorColor: 'transparent', extra: <span>{rj > 0 ? 'roja directa' : dob > 0 ? 'doble amarilla' : 'amarilla'}</span> }
                  })} />
                  : <p className="vacio">Sin tarjetas en esta jornada.</p>}
                <div className="leyenda"><b>Amarilla</b> · <b>doble amarilla</b> (expulsión) · <b>roja directa</b>.</div>
              </section>
              <section>
                <div className="s-head"><h2 className="s-title">Se pierden la próxima jornada</h2><div className="s-sub">jornada {jornadaNum + 1}</div></div>
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
              <div className="s-head"><h2 className="s-title">Estadísticas</h2><div className="s-sub">acumulado hasta J{jornadaNum}</div></div>
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
              <div className="s-head"><h2 className="s-title">{rankView.title}</h2><div className="s-sub">{rankView.sub}</div></div>
              {rankView.items.length > 0 ? (
                <>
                  <RankingComp items={rankView.items} fichas={fichas} barColor={rankView.barColor} />
                  {rankView.leyenda && <div className="leyenda">{rankView.leyenda}</div>}
                </>
              ) : <p className="vacio">Sin datos en esta {modo === 'temporada' ? 'temporada' : 'jornada'}.</p>}
            </section>
          ) : xiView ? (
            <section>
              <div className="s-head"><h2 className="s-title">{xiView.title}</h2><div className="s-sub">{xiView.sub}</div></div>
              <div className="xi-wrap">
                <div className="xi-campo">{campoXI(xiView.players)}</div>
                <div className="xi-lista"><RankingComp items={xiView.items} fichas={fichas} /></div>
              </div>
              <div className="leyenda">{xiView.leyenda}</div>
            </section>
          ) : (tabEf === 'once-optimo-jornada' || tabEf === 'once-optimo-temporada') ? (
            <section>
              <div className="s-head"><h2 className="s-title">{tabsActivas.find((t) => t[0] === tabEf)?.[1]}</h2></div>
              <p className="vacio">Sin XI Óptimo en esta {modo === 'temporada' ? 'temporada' : 'jornada'}.</p>
            </section>
          ) : (
            <section>
              <div className="s-head"><h2 className="s-title">{tabsActivas.find((t) => t[0] === tabEf)?.[1]}</h2></div>
              <p className="vacio">Próximamente en la ficha v2.</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
