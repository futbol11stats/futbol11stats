import './ficha.css'
import { Fragment, type ReactNode } from 'react'
import { MapPin } from 'lucide-react'
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
import { faseCompeticion, ordenPorFechaOFase } from '@/lib/competiciones'
import JornadasEquipo from '@/components/ficha/v2/JornadasEquipo'
import { FilaEspejo } from '@/components/ficha/v2/barrasGoles'
import { TarjetaAmarilla, TarjetaDoble, TarjetaRoja, FlechaEntra, FlechaSale, Promocion, Escudo, Reloj, Balon, Guante, Tabla, Estrella } from '@/components/iconos'
import { graphLd, breadcrumbLd, sportsTeamLd } from '@/lib/jsonld'
import { SITE_URL } from '@/lib/seo'
import { getCampoEquipo, campoMapsUrl, parseCampo } from '@/lib/club'
import { getCamposConFicha, campoSlug } from '@/lib/campo'
import { escudoUrl, formatNombre } from '@/lib/supabase'
import { jugadorHref, fechaCorta, fichasExistentes } from '@/lib/jugador'
import { familiaSello, familiaCorto } from '@/lib/sellos'
import {
  equipoSlug, tempLabel, getGrupoInfo, grupoHref, getEquipoActualInfo, getCopasPorTemporada, getCopasConMetricas,
  fechaCortaDMY, fechaCortaYMD, BADGE, HITO_EQUIPO,
} from '@/lib/equipo'
import {
  getEquipoV2, getTemporadasEquipo, getCopaTemporadas, getSerieLiga, getResultadosGrupo, buildJornadasEquipo,
  escudosPorNombre, getMiniClasif, colorMedia, colorElo, colorFan, CORTES_EQUIPO,
  analisisResultados, getTramos, getFacetasGrupo, getPlantillaEquipoV2, getMovimientosEquipo,
  getHitosEquipo, getMediasPorTemporada, getCopasAmbito, formaEquipo, type PlantillaEqRow,
} from '@/lib/equipoV2'
import type { CompEquipo } from '@/components/ficha/v2/JornadasEquipo'

const mil = (n: number | null | undefined) => (n == null ? '—' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
const med1 = (v: number | null) => (v == null ? '—' : v.toFixed(1).replace('.', ','))
const conSigno = (n: number) => (n > 0 ? `+${n}` : `${n}`)
const iniciales = (nombre: string) => formatNombre(nombre).split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

export default async function FichaEquipoV2({ cod, temporadaLabel }: { cod: string; temporadaLabel: string | null }) {
  const [e, temporadas, copaTemps, copasPorTemp] = await Promise.all([
    getEquipoV2(cod), getTemporadasEquipo(cod), getCopaTemporadas(cod), getCopasPorTemporada(cod),
  ])
  if (!e) notFound()

  // ACTIVO lo fija el pipeline ("jugó en la temporada actual o la anterior"); antes la web lo cableaba a T21
  // (Number(codtemporada) < suelo). Se lee el flag para que el criterio viva en una sola fuente.
  const inactivo = e.activo === false
  const slug = equipoSlug(e.codequipo, e.nombre)

  // Lista de temporadas = liga (web_equipo_temporadas) ∪ copa (web_equipo.copas), descendente. El ACTA
  // construye la realidad: una temporada de solo-copa es una temporada del equipo aunque no tenga fila de liga.
  // Default = MAX de la unión (no e.codtemporada, que es la última de LIGA y se queda atrás en solo-copa).
  const ligaCods = temporadas.map((t) => Number(t.codtemporada))
  const cods = Array.from(new Set([...ligaCods, ...copaTemps])).sort((a, b) => b - a)
  const tempSel: number | null =
    (temporadaLabel ? cods.find((c) => tempLabel(c) === temporadaLabel) ?? null : null)
    ?? cods[0] ?? (e.codtemporada != null ? Number(e.codtemporada) : null)
  const tempSelStr = tempSel != null ? String(tempSel) : null
  const tempRow = temporadas.find((t) => Number(t.codtemporada) === tempSel) || null
  // Solo-copa: la temporada seleccionada tiene acta de copa pero NO fila de liga -> se ocultan posición,
  // clasificación y badges; se muestran Copas (protagonista), plantilla y ELO.
  const esSoloCopa = tempSel != null && !tempRow && copaTemps.includes(tempSel)
  const codgrupoSel = esSoloCopa ? null : (tempRow?.codgrupo ?? (tempSel != null && Number(e.codtemporada) === tempSel ? e.codgrupo : null))
  const nombreComp = esSoloCopa ? null : (tempRow?.nombre_comp ?? e.nombre_comp ?? null)
  const grupoNombre = esSoloCopa ? null : (tempRow?.grupo_nombre ?? e.grupo_nombre ?? null)

  const [serie, resultados, equipoInfo, grupoInfo, campoInfo, camposConFicha] = await Promise.all([
    getSerieLiga(e.codequipo, codgrupoSel),
    getResultadosGrupo(e.codequipo, e.nombre, codgrupoSel),
    inactivo ? Promise.resolve({ copas: [], posicionActual: null }) : getEquipoActualInfo(e.codequipo),
    getGrupoInfo(codgrupoSel),
    getCampoEquipo(e.codequipo),   // campo (instalación dominante última temporada) + localidad, para el hero
    getCamposConFicha(),           // ¿el campo tiene ficha propia? -> enlace interno vs Maps
  ])
  const { posicionActual } = equipoInfo   // `copas` (viva) ya no se usa: el hero muestra copasSel (temporada seleccionada)
  const grupoUrl = grupoHref(grupoInfo)

  const jornadas = buildJornadasEquipo(serie, resultados, e.nombre, e.codequipo)
  const escMap = await escudosPorNombre(jornadas.map((j) => j.rivalNombre || ''))
  for (const j of jornadas) if (j.rivalNombre) j.rivalEscudo = escMap.get(j.rivalNombre) ?? null

  const mini = await getMiniClasif(codgrupoSel, e.codequipo)

  const [tramos, facetas, plantilla, movs, hitos, mediasTemp, copasAmbito, copasMetricas] = await Promise.all([
    getTramos(e.codequipo, codgrupoSel),
    getFacetasGrupo(codgrupoSel, e.codequipo),
    getPlantillaEquipoV2(e.codequipo, tempSelStr, e.rama),
    getMovimientosEquipo(cod),
    getHitosEquipo(cod),
    getMediasPorTemporada(e.codequipo),
    getCopasAmbito(e.codequipo, tempSelStr, e.nombre),
    getCopasConMetricas(e.codequipo, e.nombre),   // PJ/GF/GC por copa para las tarjetas del bloque Temporadas
  ])
  // Escudos de los rivales de copa (por nombre, como en el gráfico de liga).
  const copaNombres = copasAmbito.flatMap((c) => c.rondas.map((r) => r.rivalNombre || '')).filter(Boolean)
  if (copaNombres.length) {
    const copaEsc = await escudosPorNombre(copaNombres)
    for (const c of copasAmbito) for (const r of c.rondas) if (r.rivalNombre) r.rivalEscudo = copaEsc.get(r.rivalNombre) ?? null
  }
  // Ámbito de competición: liga (barras) + copas (tira de rondas). Alimenta CompChips y el gráfico. La entrada
  // de LIGA solo se incluye si hay jornadas de liga: en solo-copa (jornadas vacías) se omite para que el gráfico
  // no defaultee a una liga vacía y la COPA sea el ámbito por defecto (protagonista).
  const ligaChart: CompEquipo[] = jornadas.length > 0 ? [{ label: nombreComp || 'Liga', tipo: 'liga', jornadas }] : []
  const chartComps: CompEquipo[] = [
    ...ligaChart,
    ...copasAmbito.map((c) => ({ label: c.label, tipo: 'copa' as const, rondas: c.rondas, competicion: c.competicion })),
  ]
  // Chips de ámbito: etiqueta corta visible + nombre completo en `titulo` (tooltip). El sello se calcula
  // con el nombre completo de la competición, no con la etiqueta abreviada.
  const chipComps = [
    ...(jornadas.length > 0 ? [{ label: nombreComp || 'Liga', titulo: nombreComp || 'Liga', count: jornadas.length, sello: <Sello nombreComp={nombreComp || 'Liga'} size={18} />, fase: 1, fechaInicio: (tempRow?.fecha_inicio as string | null) || null }] : []),
    ...copasAmbito.map((c) => ({ label: c.label, titulo: c.titulo, count: c.rondas.length, sello: <Sello nombreComp={c.competicion} size={18} />, fase: faseCompeticion(c.competicion, null), fechaInicio: c.fechaInicio })),
  ]
  const ana = analisisResultados(resultados, e.nombre, e.codequipo)
  const forma = formaEquipo(jornadas)
  const anaTot = ana.pj || 1
  const pc = (n: number) => Math.round((n / anaTot) * 100)

  // Plantilla: top por puntos fantasy totales (no por media) + agrupada por líneas (POR/DEF/MED/DEL),
  // dentro de cada línea por minutos.
  const LINEAS = [
    { k: 'POR', nm: 'Porteros', c: '#f0b429' }, { k: 'DEF', nm: 'Defensas', c: '#9ac4f1' },
    { k: 'MED', nm: 'Centrocampistas', c: '#8cefa5' }, { k: 'DEL', nm: 'Delanteros', c: '#f2a3c0' },
    // "Otros": jugadores sin demarcación (frecuente en plantillas juveniles, donde muchos no traen posición).
    // Sin él se omitirían del listado. Se filtra si queda vacío (caso normal en aficionados).
    { k: 'OTR', nm: 'Otros', c: '#8a9cbd' },
  ] as const
  // Menores (juveniles, sin ficha): se listan con nombre y datos pero SIN enlace. fichasExistentes da los
  // codjugador que sí tienen ficha (adultos) -> solo esos enlazan.
  const plantillaFichas = plantilla.length ? await fichasExistentes(plantilla.map((p) => p.codjugador)) : new Set<string>()
  const topPlantilla = [...plantilla].filter((p) => p.pts != null).sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0)).slice(0, 5)
  const porLinea = LINEAS.map((L) => ({ ...L, jug: plantilla.filter((p) => p.linea === L.k).sort((a, b) => b.minutos - a.minutos) })).filter((L) => L.jug.length)

  // Desplegable por defecto: 11 con más minutos, garantizando ≥1 portero (política del XI óptimo). Resto oculto.
  const porMin = [...plantilla].sort((a, b) => b.minutos - a.minutos)
  let onceIds = porMin.slice(0, 11)
  if (porMin.length > 11 && !onceIds.some((p) => p.linea === 'POR')) {
    const topPor = porMin.find((p) => p.linea === 'POR')
    if (topPor) onceIds = [...porMin.slice(0, 10), topPor]
  }
  const starterIds = new Set(onceIds.map((p) => p.codjugador))
  const hayOcultos = plantilla.length > starterIds.size

  // Color del botón de iniciales por demarcación, como el avatar del hero de la ficha de jugador (AVA_POS).
  const AVA_POS: Record<string, string> = { POR: '249,115,22', DEF: '59,130,246', MED: '34,160,80', DEL: '239,68,68' }
  const avaStyle = (pos: string | null) => {
    const c = AVA_POS[pos || ''] || '100,116,139'
    return { background: `linear-gradient(to bottom right, rgba(${c},.45), var(--pitch-800))`, border: `1.5px solid rgba(${c},.55)`, color: '#fff' }
  }
  // Fila de datos bajo el nombre (mismo lenguaje que Totales de jugador): PJ · Min · Goles (o P.a cero para
  // porteros), iconos en vez de etiquetas; tarjetas (TA/2TA/TR) solo cuando las hay, para que quepa.
  const filaDatos = (p: PlantillaEqRow) => (
    <div className="pl-stats">
      {/* PJ y minutos SIEMPRE (un jugador de la plantilla ha jugado; el 0 ahí es información). El resto son
          "hizo/no hizo": se omiten a cero (goles, porterías a cero, tarjetas), como en las fichas solo-copa. */}
      <span>{mil(p.pj)}<Escudo size={11} /></span>
      <span>{mil(p.minutos)}<Reloj size={11} /></span>
      {p.portero
        ? (p.porteriasCero ?? 0) > 0 && <span>{mil(p.porteriasCero)}<span style={{ color: 'var(--amber)', display: 'inline-flex' }}><Guante size={11} /></span></span>
        : (p.goles ?? 0) > 0 && <span>{mil(p.goles)}<span style={{ color: 'var(--e3)', display: 'inline-flex' }}><Balon size={11} /></span></span>}
      {p.ta > 0 && <span style={{ color: 'var(--card-y)' }}>{p.ta}<TarjetaAmarilla size={10} /></span>}
      {p.td > 0 && <span style={{ color: 'var(--card-y)' }}>{p.td}<TarjetaDoble size={11} /></span>}
      {p.tr > 0 && <span style={{ color: 'var(--card-r)' }}>{p.tr}<TarjetaRoja size={10} /></span>}
    </div>
  )

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
  const facetaTiles: Array<[number | null, string]> = [
    [facetas.gf, 'GF'], [facetas.gc, 'GC'], [facetas.ptsFan, 'Pts F.'], [e.posicion_juego_limpio ?? null, 'Juego limpio'],
  ]
  const BADGE_CLS: Record<string, string> = { CAMPEON: 'camp', ASCENSO: 'asc', DESCENSO: 'desc', PLAYOFF: 'po' }

  // Movimientos recientes garantizando que las promociones internas no queden fuera del corte: la ficha
  // actual las mostraba en su propia categoría, pero al mezclar fichajes+promociones y cortar a 8 por
  // fecha, un equipo con muchos fichajes recientes se comía todas las promociones. Se reservan hasta 3
  // huecos para promociones y el resto se llena con los fichajes más recientes; el conjunto se reordena
  // por fecha para mostrarlo cronológico.
  const promosMov = movs.filter((m: any) => m.clase === 'PROMOCION_INTERNA')
  const fichajesMov = movs.filter((m: any) => m.clase !== 'PROMOCION_INTERNA')
  const nPromo = Math.min(promosMov.length, 3)
  const movsShown = [...fichajesMov.slice(0, 8 - nPromo), ...promosMov.slice(0, nPromo)]
    .sort((a: any, b: any) => String(b.fecha || '').localeCompare(String(a.fecha || '')))
  // Enlazar solo a quien TIENE ficha: un movimiento puede referir a un menor (excluido de web_jugador),
  // que tiene codjugador pero no página -> el enlace daría 404. Se enlaza si existe ficha; si no, texto plano.
  const movsFichas = movsShown.length ? await fichasExistentes(movsShown.map((m: any) => m.codjugador)) : new Set<string>()

  // KPIs (temporada seleccionada). Posición/Pts/Media F./ELO salen de la serie de clasificación.
  // GF/GC (y por tanto DG) salen del MISMO origen que el desglose casa/fuera: los resultados. El
  // total es, por construcción, la SUMA de casa+fuera que se muestra en el desglose (gfSel =
  // ana.casa.gf + ana.fuera.gf), así que KpiBar y desglose no pueden contradecirse ni en un render
  // stale. web_resultados es la única fuente capaz de alimentar ambos (la clasificación no separa
  // casa/fuera) y reconcilia con la clasificación en todo el sitio. Sin resultados -> «—», coherente
  // con el desglose vacío (no se cae a una segunda fuente, que es justo lo que se quiere evitar).
  const ult = serie.length ? serie[serie.length - 1] : null
  const posSel = ult?.pos ?? (tempRow?.posicion_final ?? posicionActual ?? null)
  const ptsSel = ult?.pts ?? tempRow?.pts ?? null
  const gfSel = ana.pj > 0 ? ana.casa.gf + ana.fuera.gf : null
  const gcSel = ana.pj > 0 ? ana.casa.gc + ana.fuera.gc : null
  const dgSel = gfSel != null && gcSel != null ? gfSel - gcSel : null
  const mediaFan = ult && ult.pts_fantasy != null && ult.pj ? ult.pts_fantasy / ult.pj : null
  // ELO de la temporada SELECCIONADA: el punto de elo_serie en tempSel (igual que las tarjetas tras 4b8b9ca) ->
  // el KpiBar y el bloque Nivel reaccionan al selector. Fallback a la clasif de liga (ult.elo) si elo_serie no
  // trajera esa temporada; NUNCA elo_actual, que es GLOBAL y mezclaba la temporada viva con la seleccionada.
  const eloTemp = ((e.elo_serie || []).find((p: { t?: string; elo?: unknown } | null) => !!p && String(p.t) === tempSelStr && typeof p.elo === 'number')?.elo ?? ult?.elo ?? null) as number | null

  // Badge (11) del logo F11S para las métricas propias (Media F./ELO), igual que en la ficha de jugador.
  const badge11 = <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#1a7a3c', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, color: '#fff', fontSize: 11, lineHeight: 1 }}>11</span>
  // Badge grande (26px), del mismo tamaño que el sello de las pastillas de competición (LigaPastilla), para
  // la pastilla de ELO máx de la cabecera.
  const badge11Sello = <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#1a7a3c', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, color: '#fff', fontSize: 14, lineHeight: 1, flex: 'none' }}>11</span>
  // Forma: la media de puntos FANTASY por partido se colorea con los mismos cortes que el KPI (colorMedia).
  const RC: Record<'G' | 'E' | 'P', string> = { G: 'var(--e3)', E: 'var(--ink-3)', P: 'var(--e0)' }

  // Total de goles (mismo origen que el desglose casa/fuera: la suma de ambos lados). Ver commit de fuente única.
  const golTot = { gf: ana.casa.gf + ana.fuera.gf, gc: ana.casa.gc + ana.fuera.gc, pj: ana.pj }
  // Iconos de goles (balón verde a favor / rojo en contra) para el ranking por faceta.
  const balV = <span style={{ color: 'var(--e3)', display: 'inline-flex' }}><Balon size={13} /></span>
  const balR = <span style={{ color: 'var(--e0)', display: 'inline-flex' }}><Balon size={13} /></span>
  // Goles como BARRAS ESPEJO (un solo lenguaje visual, el de los tramos): encajados a la izquierda en
  // rojo, marcados a la derecha en verde, etiqueta centrada. Total/Casa/Fuera + los 7 tramos comparten
  // la MISMA escala (maxBar) para ser comparables. El absoluto manda; el ratio por partido va detrás,
  // menor y atenuado (26 (1,5)). Los tramos no llevan ratio.
  const maxBar = Math.max(1, golTot.gf, golTot.gc, ...tramos.flatMap((t) => [t.gf, t.gc]))
  // Barra espejo compartida (FilaEspejo): número siempre fuera de la barra. Ratio (pj) solo en las filas
  // de resultado; los tramos no llevan ratio.
  const filaGoles = (label: ReactNode, gc: number, gf: number, pj: number | null, ratioOn: boolean) =>
    <FilaEspejo center={label} gc={gc} gf={gf} maxBar={maxBar} pj={ratioOn ? pj : null} />

  const tempTxt = tempSel != null ? tempLabel(tempSel) : ''
  const echoTxt = [tempTxt, nombreComp].filter(Boolean).join(' · ')
  // Hero sin identidad de liga (solo-copa o equipo permanentemente solo-copa, codgrupo NULL): la pastilla de
  // liga está ausente, así que el hero muestra la(s) COPA(s) de la temporada seleccionada CON SU ESTADO (misma
  // pastilla que CopasLinea: sello/color de Copa + estado + enlace). Sale de getCopasPorTemporada, que DERIVA la
  // familia (codgrupoFamilia) aunque el JSONB no traiga codgrupo_familia —el caso de estos equipos— y no depende
  // de que se hayan jugado partidos. No se usa club_root (código interno, no un nombre legible).
  const copasSel = copasPorTemp[tempSelStr ?? ''] ?? []

  // Serie de ELO para el sparkline (cierre por temporada) — mismo formato {t,elo} que la ficha actual.
  const eloSerie = (e.elo_serie || []).filter((p): p is { t: string; elo: number } => !!p && typeof p.elo === 'number')
  // ELO de cierre por temporada (clave = codtemporada). Fuente para el ELO de tarjetas SOLO-COPA, donde
  // mediasTemp (web_clasificacion, liga) no tiene fila. En liga se sigue usando mediasTemp.
  const eloByTemp = new Map(eloSerie.map((p) => [p.t, p.elo]))

  // Deportividad: td_total puede venir NULL hasta que el pipeline lo pueble -> 0, sin fallback.
  const disc: Array<[ReactNode, number, string]> = [
    [<span style={{ color: 'var(--card-y)', display: 'flex' }} key="ta"><TarjetaAmarilla size={12} /></span>, e.ta_total ?? 0, 'TA'],
    [<span style={{ color: 'var(--card-y)', display: 'flex' }} key="td"><TarjetaDoble size={13} /></span>, e.td_total ?? 0, '2TA'],
    [<span style={{ color: 'var(--card-r)', display: 'flex' }} key="tr"><TarjetaRoja size={12} /></span>, e.tr_total ?? 0, 'TR'],
  ]

  const secciones = ([
    { id: 's-nivel', label: 'Nivel', aside: true },
    esSoloCopa ? null : { id: 's-clasif', label: 'Clasificación', aside: true },
    ultimos.length ? { id: 's-ultimos', label: 'Últimos partidos' } : null,
    jornadas.length ? { id: 's-jornadas', label: 'Jornadas' } : null,
    forma.racha.length ? { id: 's-forma', label: 'Forma' } : null,
    ana.pj ? { id: 's-analisis', label: 'Análisis' } : null,
    cods.length ? { id: 's-temporadas', label: 'Temporadas' } : null,
    plantilla.length ? { id: 's-plantilla', label: 'Plantilla' } : null,
    movs.length ? { id: 's-movs', label: 'Movimientos' } : null,
    hitos.length ? { id: 's-hitos', label: 'Hitos' } : null,
  ].filter(Boolean)) as { id: string; label: string; aside?: boolean }[]

  const crumbs = [
    { name: 'Inicio', url: `${SITE_URL}/` },
    { name: 'Equipos', url: `${SITE_URL}/madrid/aficionados` },
    { name: e.nombre, url: `${SITE_URL}/madrid/equipo/${slug}` },
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
            {/* H1: el nombre del equipo es el encabezado principal de la página (uno solo). Tailwind preflight
                resetea el h1 -> la clase .last controla el estilo, idéntico al div anterior. */}
            <h1 className="last">{e.nombre}</h1>
            {/* Campo bajo el nombre (contexto, discreto): chincheta + nombre del campo + superficie legible en
                pequeño. Enlace INTERNO a nuestra ficha /campos/[slug] si el campo la tiene (más rico que Maps:
                equipos, mapa, dirección y los dos enlaces); si no, cae a Maps (externo). Silencio si no hay campo. */}
            {campoInfo.codigo && campoInfo.nombre && (() => {
              const { nombre, superficie } = parseCampo(campoInfo.nombre)
              const inner = <><MapPin size={12} strokeWidth={2.25} /><span>{nombre}</span>{superficie && <span className="campo-sup">· {superficie}</span>}</>
              const tieneFicha = camposConFicha.has(String(campoInfo.codigo))
              if (tieneFicha) {
                return <Link className="hero-campo" href={`/campos/${campoSlug(campoInfo.codigo, nombre)}`}>{inner}</Link>
              }
              const href = campoMapsUrl(campoInfo)
              return href
                ? <a className="hero-campo" href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
                : <span className="hero-campo">{inner}</span>
            })()}
          </div>
          <CompartirBtn titulo={`${e.nombre} · Fútbol11Stats`} variant="icon" />
        </div>
        <div className="hero-pills">
          {nombreComp && (
            <LigaPastilla nombreComp={nombreComp}
              segments={[nombreComp, grupoNombre, inactivo || posSel == null ? null : `${posSel}º`]}
              href={grupoUrl} muted={inactivo} />
          )}
          {/* La línea de copas del hero refleja SIEMPRE la temporada seleccionada (copasSel), como el resto de
              la ficha: el selector manda en todo. Antes, con liga, mostraba las copas de la temporada VIVA
              (getEquipoActualInfo) aunque se estuviera viendo otra -> incoherente. */}
          <CopasLinea copas={copasSel} />
          {e.temporada_elo_max && <span className="pill n">{badge11Sello}<span>ELO máx {mil(e.elo_max)} · {tempLabel(e.temporada_elo_max)}</span></span>}
        </div>
      </div>

      {/* KPIs — 5 columnas fijas (Pos·Pts·DG·Media F.·ELO). Icono encima del número, como en jugador:
          Pos/Pts/DG con icono del dato; Media F./ELO (métricas F11S) con el badge (11). En solo-copa NO se pintan
          (son métricas de liga: quedarían todas a «—»); el ELO sigue visible en la sección Nivel. */}
      {!esSoloCopa && (
      <div className="kpis kpis-eq">
        <div className="kpi"><div className="kpi-i"><Tabla size={14} /></div><div className="v num">{posSel != null ? `${posSel}º` : '—'}</div><div className="k">Pos</div></div>
        <div className="kpi"><div className="kpi-i"><Estrella size={14} /></div><div className="v num">{mil(ptsSel)}</div><div className="k">Pts</div></div>
        <div className="kpi"><div className="kpi-i"><Balon size={14} /></div><div className="v num">{dgSel != null ? conSigno(dgSel) : '—'}</div><div className="k">DG</div></div>
        <div className="kpi"><div className="kpi-i">{badge11}</div><div className="v num" style={{ color: colorMedia(mediaFan) }}>{med1(mediaFan)}</div><div className="k">Media F.</div></div>
        <div className="kpi"><div className="kpi-i">{badge11}</div><div className="v num" style={{ color: colorElo(eloTemp) }}>{mil(eloTemp)}</div><div className="k">ELO</div></div>
      </div>
      )}

      {/* SCOPE */}
      <div className="scope">
        <div className="scope-lbl">Temporada</div>
        <div className="track"><div className="rail">
          {cods.map((c) => (
            <Link key={c} href={`/madrid/equipo/${slug}/${tempLabel(c)}`} className={c === tempSel ? 'on' : ''}>{tempLabel(c)}</Link>
          ))}
        </div></div>
        {chartComps.length > 0 && <>
          <div className="scope-lbl" style={{ paddingTop: 11 }}>Competición</div>
          <div className="track"><div className="rail"><CompChips comps={chipComps} /></div></div>
        </>}
        <div className="scope-note">Las secciones marcadas «Todas las temporadas» no dependen de esta selección.</div>
      </div>

      <NavSpy secciones={secciones} />

      <div className="layout">
        <div className="aside">
          {/* NIVEL */}
          <section id="s-nivel">
            <div className="s-head"><h2 className="s-title">Nivel</h2><div className="s-sub"><span className="allscope">Situación actual</span></div></div>
            <div className="box">
              <div className="elo-top">
                <div><div className="cap">ELO F11S</div><div className="elo-v" style={{ color: colorElo(eloTemp) }}>{mil(eloTemp)}</div></div>
                {!esSoloCopa && posSel != null && <div style={{ textAlign: 'right' }}><div className="cap">En su grupo</div><div className="elo-v" style={{ color: colorElo(eloTemp) }}>{posSel}º</div></div>}
              </div>
              {/* Percentil/batería degradados: web_percentiles no tiene métricas de equipo. */}
              {eloSerie.length > 1 && <EloSparkline serie={eloSerie} className="w-full h-9 mt-3" />}
              <div className="batt-lbl" style={{ marginTop: 12 }}>El ELO mide la fuerza del equipo; su histórico se ve arriba.</div>
            </div>

            {/* DEPORTIVIDAD */}
            <div className="box">
              <div className="cap">Deportividad</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 7 }}>
                {e.posicion_juego_limpio != null
                  ? <div className="elo-v" style={{ fontSize: 'var(--n-md)', color: 'var(--e3)' }}>{e.posicion_juego_limpio}º</div>
                  : <div className="elo-v" style={{ fontSize: 'var(--n-md)', color: 'var(--ink-3)' }}>—</div>}
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  {/* Se omiten los tipos de tarjeta a 0 (mismo criterio icono+número): un 0 no aporta. */}
                  {disc.filter(([, n]) => n > 0).map(([ic, n, k]) => (
                    <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{ic}<b className="num" style={{ fontSize: 'var(--n-sm)' }}>{mil(n)}</b></span>
                  ))}
                </div>
              </div>
              <div className="batt-lbl">Puesto de juego limpio en el grupo</div>
            </div>
          </section>

          {/* CLASIFICACIÓN — oculta en solo-copa (esa temporada no tiene liga: ni mini-clasif ni «Sin clasificación»). */}
          {!esSoloCopa && (
          <section id="s-clasif">
            <div className="s-head"><h2 className="s-title">Clasificación</h2><div className="s-sub">{echoTxt}</div></div>
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
          )}
        </div>

        <div className="main">
          {/* ÚLTIMOS PARTIDOS — mismo patrón que "Mejores actuaciones" de jugador. */}
          {ultimos.length > 0 && (
            <section id="s-ultimos">
              <div className="s-head"><h2 className="s-title">Últimos partidos</h2><div className="s-sub">{echoTxt}</div></div>
              <div>
                {ultimos.map((m, i) => {
                  const col = m.signo === 'G' ? 'var(--e3)' : m.signo === 'E' ? 'var(--ink-2)' : 'var(--e0)'
                  return (
                    <div className="match" key={i}>
                      <div className="m-score" style={{ color: col }}>{m.marcador}</div>
                      <EscudoBox escudo={m.rivalEscudo} nombre={m.rivalNombre ?? undefined} size={26} radius={4} />
                      <div className="m-mid">
                        <div className="m-riv"><span className="m-vs">vs</span> <NombreEquipo codequipo={null} nombre={m.rivalNombre} /></div>
                        <div className="m-meta">{m.esLocal != null && <IndicadorLocal esLocal={m.esLocal} />}<span>{m.fecha ? `${fechaCorta(m.fecha)} · ` : ''}J{m.jornada}</span></div>
                      </div>
                      <div className="m-pts" style={{ background: m.fan != null ? colorFan(m.fan) : 'var(--pitch-700)' }}>{m.fan}</div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* JORNADAS (liga: barras · copa: tira de rondas) — la cabecera la pinta el componente (reactiva). */}
          <section id="s-jornadas">
            {jornadas.length > 0 || copasAmbito.length > 0
              ? <JornadasEquipo comps={chartComps} cortes={CORTES_EQUIPO.fanJornada} temporada={tempTxt} />
              : <>
                <div className="s-head"><h2 className="s-title">Puntos por jornada</h2><div className="s-sub">{echoTxt}</div></div>
                <p style={{ padding: '0 var(--pad)', color: 'var(--ink-3)', fontSize: 'var(--t-sm)' }}>Sin partidos en esta temporada.</p>
              </>}
          </section>

          {/* FORMA — media de puntos de liga por partido (ventanas) + racha de 5, como en jugador. */}
          {forma.racha.length > 0 && (
            <section id="s-forma">
              <div className="s-head"><h2 className="s-title">Forma</h2><div className="s-sub">media de puntos por partido</div></div>
              <div className="windows">
                {forma.ventanas.map((v) => {
                  const d = v.delta
                  const ds = d == null ? '—' : `${d > 0 ? '+' : ''}${med1(d)}`
                  return (
                    <div className="win" key={v.label}>
                      <div className="w-k">{v.label}</div>
                      <div className="w-v" style={{ color: colorMedia(v.media) }}>{v.media != null ? med1(v.media) : '—'}</div>
                      <div className="w-s">{ds}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ padding: '12px var(--pad) 2px', display: 'flex', gap: 5, alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--t-cap)', color: 'var(--ink-3)', marginRight: 5 }}>Racha</span>
                {forma.racha.map((r, i) => (
                  <span key={i} className="num" style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 'var(--t-sm)', color: '#0a1628', background: RC[r.signo] }}>{r.signo}</span>
                ))}
              </div>
            </section>
          )}

          {/* ANÁLISIS */}
          {ana.pj > 0 && (
            <section id="s-analisis">
              <div className="s-head"><h2 className="s-title">Análisis</h2><div className="s-sub">{echoTxt}</div></div>
              <div className="box">
                <div className="donut-row">
                  <div className="donut">
                    <svg viewBox="0 0 104 104" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <circle cx="52" cy="52" r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="14" />
                      {donutArcs.map((a, i) => <circle key={i} cx="52" cy="52" r={R} fill="none" stroke={a.col} strokeWidth="14" strokeDasharray={`${a.dash} ${a.rest}`} strokeDashoffset={a.offset} />)}
                    </svg>
                    <div className="donut-mid"><div className="donut-pc num">{pc(ana.v)}%</div></div>
                  </div>
                  <div className="ved-lg">
                    {([['Victorias', ana.v, 'var(--e3)'], ['Empates', ana.e, 'var(--ink-3)'], ['Derrotas', ana.d, 'var(--e0)']] as const).map(([nm, n, col]) => (
                      <div className="ved-r" key={nm}><span className="ved-dot" style={{ background: col }} /><span className="ved-nm">{nm}</span><span className="ved-n num" style={{ color: col }}>{n}</span><span className="ved-p num">{pc(n)}%</span></div>
                    ))}
                    <div className="ved-r"><span className="ved-dot" style={{ background: 'transparent' }} /><span className="ved-nm">Puntos por partido</span><span className="ved-n num">{med1(ana.pj ? (ana.v * 3 + ana.e) / ana.pj : 0)}</span><span className="ved-p" /></div>
                  </div>
                </div>
                {/* Resultados por contexto: V/E/D en casa y fuera (distinto de los goles, que van abajo). */}
                <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--line-2)' }}>
                  <div className="cap" style={{ marginBottom: 5 }}>Por contexto</div>
                  {([['Casa', ana.casa, true], ['Fuera', ana.fuera, false]] as const).map(([k, s, loc]) => {
                    const t = s.v + s.e + s.d || 1, p = Math.round((s.v / t) * 100)
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
              {/* GOLES — un solo lenguaje visual: barras espejo (encajados a la izquierda en rojo,
                  marcados a la derecha en verde, etiqueta centrada). Total·Casa·Fuera + los 7 tramos,
                  todas a la MISMA escala (maxBar) para ser comparables. El absoluto manda; el ratio por
                  partido va detrás, menor y atenuado. Los tramos no llevan ratio. */}
              <div className="box">
                <div className="cap" style={{ marginBottom: 9 }}>Goles</div>
                <div className="tramo-head"><div className="th-gn" /><div className="th">◀ Encajados</div><div className="th-mid" /><div className="th r">Marcados ▶</div><div className="th-gn" /></div>
                {filaGoles('Total', golTot.gc, golTot.gf, golTot.pj, true)}
                {filaGoles(<><IndicadorLocal esLocal={true} />Casa</>, ana.casa.gc, ana.casa.gf, ana.casa.pj, true)}
                {filaGoles(<><IndicadorLocal esLocal={false} />Fuera</>, ana.fuera.gc, ana.fuera.gf, ana.fuera.pj, true)}
                {tramos.length > 0 && (
                  <div className="goles-tramos">
                    {tramos.map((t) => (
                      <Fragment key={t.tramo}>{filaGoles(`${t.tramo}${t.tramo !== '90+' ? "'" : ''}`, t.gc, t.gf, null, false)}</Fragment>
                    ))}
                  </div>
                )}
              </div>
              {facetas.n > 0 && (
                <div className="box">
                  <div className="cap" style={{ marginBottom: 9 }}>Ranking por faceta · en su grupo</div>
                  <div className="ranks" style={{ marginTop: 0, gridTemplateColumns: 'repeat(4,1fr)' }}>
                    {facetaTiles.map(([v, k]) => {
                      const ic = k === 'GF' ? balV : k === 'GC' ? balR : k === 'Pts F.' ? badge11
                        : <span style={{ color: 'var(--card-y)', display: 'inline-flex' }}><TarjetaAmarilla size={12} /></span>
                      return <div className="rk" key={k}><div className="r-ic">{ic}</div><div className="r-v">{v != null ? `${v}º` : '—'}</div><div className="r-k">{k}</div></div>
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* TEMPORADAS — UNA TARJETA POR COMPETICIÓN (temporada×competición), como en la ficha de jugador: la
              liga tiene la suya y cada copa/playoff la suya, porque muestran datos distintos. La lista recorre
              la UNIÓN liga∪copa (`cods`, la misma del selector), descendente, y dentro de cada temporada la liga
              va primero. El acta construye la realidad: una temporada de solo-copa es una temporada del equipo. */}
          {cods.length > 0 && (
            <section id="s-temporadas">
              <div className="s-head"><h2 className="s-title">Temporadas</h2><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
              <div className="track"><div className="rail" id="seasons">
                {cods.flatMap((c) => {
                  const cStr = String(c)
                  const t = temporadas.find((r) => Number(r.codtemporada) === c) || null   // fila de liga (null si no jugó liga)
                  const mt = mediasTemp[cStr]
                  const media = mt?.media ?? null
                  // ELO de la temporada: SIEMPRE el punto de elo_serie de ESA temporada (t=cod) -> refleja el
                  // movimiento post-copa (p.ej. Las Rozas T22 = 1163.4, distinto del T21 = 1125.5). Fallback a la
                  // clasif de liga (mt.elo) solo si elo_serie no trajera esa temporada. NUNCA elo_actual: es un
                  // valor GLOBAL y ponía el mismo ELO en la tarjeta de la copa en curso que en la temporada previa.
                  const elo = eloByTemp.get(cStr) ?? mt?.elo ?? null
                  // Orden cronológico INVERSO dentro de la temporada (lo más reciente primero: playoff → liga →
                  // copa) por fecha_inicio con fallback a la fase. Comparador común ordenPorFechaOFase; sort estable.
                  const cards: { fase: number; fechaInicio: string | null; node: ReactNode }[] = []
                  // LIGA (si la hubo): media, ELO, PTS/GF/GC y el badge de posición/ascenso/descenso/playoff.
                  if (t) {
                    const badgeCls = t.badge ? BADGE_CLS[t.badge] : null
                    cards.push({ fase: faseCompeticion(t.nombre_comp, t.categoria_nivel), fechaInicio: (t.fecha_inicio as string | null) || null, node: (
                      <div className="season" key={`${cStr}-liga`}>
                        <div className="accent" style={{ background: colorMedia(media) || 'var(--line)' }} />
                        <div className="s-top"><div className="s-yr">{tempLabel(c)}</div></div>
                        <div className="s-cat">
                          {t.nombre_comp && (
                            <span className="pill n" style={{ maxWidth: '100%', overflow: 'hidden' }}>
                              <Sello nombreComp={t.nombre_comp} size={14} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.nombre_comp}{t.grupo_nombre ? ` · ${t.grupo_nombre}` : ''}</span>
                            </span>
                          )}
                        </div>
                        <div className="s-duo">
                          <div><div className="d-v" style={{ color: colorMedia(media) }}>{med1(media)}</div><div className="d-k">MEDIA F.</div></div>
                          <div><div className="d-v" style={{ color: colorElo(elo) }}>{mil(elo)}</div><div className="d-k">ELO</div></div>
                        </div>
                        <div className="s-stats"><div><b>{mil(t.pts)}</b>PTS</div><div><b>{mil(t.gf)}</b>GF</div><div><b>{mil(t.gc)}</b>GC</div></div>
                        <div className="s-final"><span className={`badge ${badgeCls || 'neu'}`}>{badgeCls ? (BADGE[t.badge]?.label ?? t.badge) : (t.posicion_final != null ? `${t.posicion_final}º` : '—')}</span></div>
                      </div>
                    ) })
                  }
                  // COPA / PLAYOFF: una tarjeta por competición con la MISMA estructura que la de liga -> MEDIA F. ·
                  // ELO arriba, PJ · GF · GC abajo, y el DESENLACE (estado del JSONB) como badge (equivalente a la
                  // posición de liga). La media fantasy la publica el pipeline en el JSONB; GF/GC de web_resultados.
                  // Si no hay partidos (PJ=0) se omiten las cifras y la tarjeta se compacta -sin huecos-.
                  ;(copasMetricas[cStr] ?? []).forEach((cp, ci) => {
                    const est = cp.estado ?? ''
                    const estCls = /campe[oó]n/i.test(est) && !/subcampe/i.test(est) ? 'camp'
                      : /subcampe/i.test(est) ? 'po' : /en juego/i.test(est) ? 'asc' : 'neu'
                    const hayStats = cp.pj > 0
                    const topMedia = cp.media != null, topElo = elo != null
                    const nTop = (topMedia ? 1 : 0) + (topElo ? 1 : 0)
                    // Fase por tipo (copa pretemporada 0 / playoff post-liga 2); mismo helper que la liga y el jugador.
                    cards.push({ fase: faseCompeticion(cp.nombre_comp, null), fechaInicio: cp.fechaInicio, node: (
                      <div className="season" key={`${cStr}-copa-${ci}`}>
                        <div className="accent" style={{ background: (topMedia ? colorMedia(cp.media) : colorElo(elo)) || 'var(--line)' }} />
                        <div className="s-top"><div className="s-yr">{tempLabel(c)}</div></div>
                        <div className="s-cat">
                          <span className="pill n" style={{ maxWidth: '100%', overflow: 'hidden' }}>
                            <Sello nombreComp={cp.nombre_comp} src={cp.slug_familia ? familiaSello(cp.slug_familia, cp.nombre_comp) : undefined} size={14} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{familiaCorto(cp.slug_familia, cp.nombre_comp)}</span>
                          </span>
                        </div>
                        {nTop > 0 && (
                          <div className="s-duo" style={{ gridTemplateColumns: nTop === 2 ? '1fr 1fr' : '1fr' }}>
                            {topMedia && <div><div className="d-v" style={{ color: colorMedia(cp.media) }}>{med1(cp.media)}</div><div className="d-k">MEDIA F.</div></div>}
                            {topElo && <div><div className="d-v" style={{ color: colorElo(elo) }}>{mil(elo)}</div><div className="d-k">ELO</div></div>}
                          </div>
                        )}
                        {hayStats && (
                          <div className="s-stats"><div><b>{cp.pj}</b>PJ</div><div><b>{cp.gf}</b>GF</div><div><b>{cp.gc}</b>GC</div></div>
                        )}
                        {/* Desenlace de la copa = "posición" de la tarjeta (al fondo, como el badge de liga). Puede ser
                            largo ("Eliminado en fase de grupos") -> se permite que envuelva en vez de recortar. */}
                        <div className="s-final"><span className={`badge ${estCls}`} style={{ whiteSpace: 'normal', height: 'auto', lineHeight: 1.2, padding: '5px 7px' }}>{est || '—'}</span></div>
                      </div>
                    ) })
                  })
                  return cards.sort((a, b) => ordenPorFechaOFase(a, b)).map((x) => x.node)
                })}
              </div></div>
            </section>
          )}

          {/* PLANTILLA (Top por fantasy + plantilla por líneas, desplegable) */}
          {plantilla.length > 0 && (
            <section id="s-plantilla">
              {/* Top por fantasy: ambas ramas (aficionado y juvenil) traen ya pts_fantasy en su tabla de plantilla;
                  si por lo que fuera no hubiera pts, topPlantilla queda vacío y no se pinta. */}
              {topPlantilla.length > 0 && (
                <>
                  <div className="s-head"><h2 className="s-title">Top de la plantilla</h2><div className="s-sub">por puntos fantasy</div></div>
                  <div>
                    {topPlantilla.map((p, i) => (
                      <div className="pl" key={p.codjugador}>
                        <div className="pl-rk">{i + 1}</div>
                        <div className="pl-av" style={avaStyle(p.pos)}>{iniciales(p.nombre)}</div>
                        <div className="pl-mid">
                          <div className="pl-nm">{plantillaFichas.has(String(p.codjugador)) ? <Link href={jugadorHref(p.codjugador, p.nombre)}>{formatNombre(p.nombre)}</Link> : formatNombre(p.nombre)}</div>
                          <div className="pl-me">{p.pos && <Pastilla pos={p.pos} size="mini" />}{filaDatos(p)}</div>
                        </div>
                        <div className="pl-val" style={{ background: 'var(--e2)' }}>{mil(p.pts)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="s-head" style={{ paddingTop: topPlantilla.length > 0 ? 20 : 0 }}><h2 className="s-title">Plantilla</h2><div className="s-sub">{echoTxt}</div></div>
              {/* Desplegable CSS (checkbox): por defecto los 11 con más minutos (≥1 portero); el resto tras el botón. */}
              <input type="checkbox" id="pl-open-eq" className="pl-open-cb" />
              <div id="plantilla-eq">
                {porLinea.map((L) => (
                  <Fragment key={L.k}>
                    <div className="line-h"><span className="line-lp" style={{ color: L.c, background: `${L.c}26` }}>{L.k}</span><span className="line-ln">{L.nm}</span><span className="num" style={{ fontSize: 'var(--t-body)', color: 'var(--ink-3)' }}>{L.jug.length}</span></div>
                    {L.jug.map((p) => (
                      <div className={`pl${starterIds.has(p.codjugador) ? '' : ' pl-hid'}`} key={p.codjugador}>
                        <div className="pl-av" style={avaStyle(p.pos)}>{iniciales(p.nombre)}</div>
                        <div className="pl-mid">
                          <div className="pl-nm">{plantillaFichas.has(String(p.codjugador)) ? <Link href={jugadorHref(p.codjugador, p.nombre)}>{formatNombre(p.nombre)}</Link> : formatNombre(p.nombre)}</div>
                          <div className="pl-me">{filaDatos(p)}</div>
                        </div>
                        <div className="pl-val" style={{ background: 'var(--e2)' }}>{mil(p.pts)}</div>
                      </div>
                    ))}
                  </Fragment>
                ))}
              </div>
              {hayOcultos && <label htmlFor="pl-open-eq" className="btn pl-open-btn" />}
              {/* Leyenda de los iconos de la fila de datos de cada jugador. */}
              <div className="pl-ley">
                <span className="lg-item"><Escudo size={11} />PJ</span>
                <span className="lg-item"><Reloj size={11} />Min</span>
                <span className="lg-item"><span style={{ color: 'var(--e3)', display: 'inline-flex' }}><Balon size={11} /></span>Goles</span>
                <span className="lg-item"><span style={{ color: 'var(--amber)', display: 'inline-flex' }}><Guante size={11} /></span>P. a cero</span>
                <span className="lg-item"><span style={{ color: 'var(--card-y)', display: 'inline-flex' }}><TarjetaAmarilla size={10} /></span>Amarillas</span>
                <span className="lg-item"><span style={{ color: 'var(--card-y)', display: 'inline-flex' }}><TarjetaDoble size={11} /></span>Dobles</span>
                <span className="lg-item"><span style={{ color: 'var(--card-r)', display: 'inline-flex' }}><TarjetaRoja size={10} /></span>Rojas</span>
              </div>
            </section>
          )}

          {/* MOVIMIENTOS */}
          {movs.length > 0 && (
            <section id="s-movs">
              <div className="s-head"><h2 className="s-title">Movimientos</h2><div className="s-sub"><span className="allscope">Recientes</span></div></div>
              <div>
                {movsShown.map((m: any, i: number) => {
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
                        <div className="mv-n">{m.codjugador && movsFichas.has(String(m.codjugador)) ? <Link href={jugadorHref(m.codjugador, m.nombre)}>{nm}</Link> : nm}</div>
                        <div className="mv-sub">{sub}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* HITOS */}
          {hitos.length > 0 && (
            <section id="s-hitos" style={{ borderBottom: 0 }}>
              <div className="s-head"><h2 className="s-title">Hitos</h2><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
              <div>
                {hitos.slice(0, 8).map((h: any, i: number) => {
                  const cfg = HITO_EQUIPO[h.tipo_hito]
                  const texto = cfg ? cfg.label(h) : h.tipo_hito
                  // Contexto = competición del equipo esa temporada (web_equipo_hitos no trae categoría propia).
                  const ctx = temporadas.find((t) => t.codtemporada === h.codtemporada)?.nombre_comp
                  // fecha (DD/MM/YYYY) -> si no la hay, la temporada; mejor_racha no trae ninguna de las dos
                  // (una racha no tiene fecha única ni temporada en el pipeline) -> no se pinta línea vacía.
                  const meta = fechaCortaDMY(h.fecha) || (h.codtemporada ? tempLabel(h.codtemporada) : '')
                  return (
                    <div className="hito" key={i}>
                      <div className="h-dot" />
                      <div>
                        <div className="h-t">{texto}{ctx ? <span style={{ color: 'var(--ink-3)' }}> · {ctx}</span> : ''}</div>
                        {meta && <div className="h-m">{meta}</div>}
                      </div>
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
