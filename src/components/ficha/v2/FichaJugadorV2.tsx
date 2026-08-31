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
import { faseCompeticion, ordenPorFechaOFase } from '@/lib/competiciones'
import NivelRankings, { type CompRank } from '@/components/ficha/v2/NivelRankings'
import KpiJugador, { type CompKpi } from '@/components/ficha/v2/KpiJugador'
import NivelElo, { type CompPct } from '@/components/ficha/v2/NivelElo'
import CompReset from '@/components/ficha/v2/CompReset'
import RankFila from '@/components/ficha/v2/RankFila'
import Echo from '@/components/ficha/v2/Echo'
import Jornadas from '@/components/ficha/v2/Jornadas'
import {
  Balon, Reloj, Escudo, Camiseta, CamisetaHueca, TarjetaAmarilla, TarjetaDoble, TarjetaRoja, Guante,
  Estrella, Calendario,
} from '@/components/iconos'
import { getEquipoActualInfo, getGrupoInfo, grupoHref, getCopasPorTemporada } from '@/lib/equipo'
import { graphLd, breadcrumbLd } from '@/lib/jsonld'
import { SITE_URL } from '@/lib/seo'
import {
  formatNombre, tempLabel, jugadorSlug, jugadorHref, curarHitos, HITO_CONFIG, fechaCorta,
  marcadorLocalVisitante, POS_LABEL, companerosActivos, type HitoRow, type CompaneroTop,
} from '@/lib/jugador'
import { CORTES_FIJOS } from '@/lib/escala'
import { getSueloVivo } from '@/lib/temporadas'
import {
  getJugadorV2, getCarreraV2, getAlertaActual, getAmbitoTemporada, getCortesElo, labelToCod,
  getPartidosTemporada, ventanasForma, racha5DePartidos, splitCasaFuera, balanceEquipo,
  getActuacionesV2, getHitosV2, alertaHumana, getTarjetasTotales,
  type CarreraRow,
} from '@/lib/jugadorV2'

const PAL = ['#f87171', '#94a3b8', '#22a050', '#2ee56b', '#8cf0a2']
function esc(v: number, c: readonly [number, number, number, number]) { if (v < 0) return 0; let n = 1; for (let i = 0; i < 4; i++) if (v >= c[i]) n = i + 1; return n }
// Separador de millares MANUAL (el runtime de Vercel tiene ICU reducido y toLocaleString no agrupa).
const mil = (n: number | null | undefined) => (n == null ? '—' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
const med1 = (v: number) => v.toFixed(1).replace('.', ',')

export default async function FichaJugadorV2({ cod, temporadaLabel }: { cod: string; temporadaLabel: string | null }) {
  const [j, carrera, suelo] = await Promise.all([getJugadorV2(cod), getCarreraV2(cod), getSueloVivo()])
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
  const inactivo = Number(j.codtemporada_ultima) < suelo

  const temporadas = Array.from(new Set(carrera.map((c) => c.codtemporada)))
  const codPedido = labelToCod(temporadaLabel)
  const tempSel = (codPedido && temporadas.includes(codPedido)) ? codPedido : (carrera[0]?.codtemporada ?? null)
  const etapas = carrera.filter((c) => c.codtemporada === tempSel)
  // Dos ámbitos distintos, no confundir:
  //  - filaPrincipal (rank_principal): elige la CATEGORÍA contra la que se rankea al jugador (un puesto solo
  //    existe dentro de una población). Manda en los RANKINGS y en la ETIQUETA de categoría (hero + Nivel).
  //    En promoción = la instalada superior; sin promoción = la de más actividad. Fallback a la primera etapa.
  //    orden_temporada NO elige etapa aquí; solo ordena la Trayectoria.
  const filaPrincipal: CarreraRow | undefined = etapas.find((c) => c.rank_principal) ?? etapas[0]
  const categoriaSel = filaPrincipal?.nombre_comp ?? j.categoria_rama ?? null
  //  - El ELO es un valor PROPIO del jugador que evoluciona en el tiempo, NO depende de la categoría: el ELO de
  //    una temporada es el último que registró cronológicamente en ella, cierre en el equipo que sea (= la
  //    ÚLTIMA etapa, orden_temporada máximo). Sus CORTES de color deben venir de la categoría de ESA etapa
  //    (la que aporta el ELO), no de la principal, o coloraríamos p.ej. un ELO de 1ª Aficionada con cortes de
  //    3ª RFEF. Un solo ELO en pantalla (KpiBar y Nivel comparten eloCierre).
  // etapaUltima = la etapa MÁS RECIENTE de la temporada (la que aporta el ELO/percentil). Se elige por el comparador
  // canónico (máx fecha_inicio; fase playoff>liga>copa como respaldo) -> ROBUSTO al orden con que la BD devuelva las
  // filas. Antes era etapas[last], que dependía de ese orden arbitrario (getCarreraV2/orden_temporada NULL en copa/playoff)
  // -> el ELO podía salir de la copa de agosto en vez del playoff de mayo. NO cambia categoriaSel (rank_principal/etapas[0]).
  const etapaUltima: CarreraRow | undefined = etapas.length
    ? [...etapas].sort((a, b) => ordenPorFechaOFase(
        { fechaInicio: a.fecha_inicio, fase: faseCompeticion(a.nombre_comp, a.categoria_nivel) },
        { fechaInicio: b.fecha_inicio, fase: faseCompeticion(b.nombre_comp, b.categoria_nivel) }))[0]
    : undefined
  const categoriaElo = etapaUltima?.nombre_comp ?? categoriaSel

  const sum = (f: (c: CarreraRow) => number | null) => etapas.reduce((s, c) => s + (f(c) ?? 0), 0)
  const pj = sum((c) => c.pj), golesT = sum((c) => c.goles), ptsF = sum((c) => c.pts_fantasy)
  const minT = sum((c) => c.minutos), p0Sel = sum((c) => c.porterias_cero)
  const media = pj > 0 ? ptsF / pj : null
  const eloCierre = etapaUltima?.elo_final ?? j.elo_actual ?? null

  const [equipoInfo, cortesElo, alerta, comps, partidosTemp, actuaciones, hitosRaw, grupoInfo, tarjetas, copasPorTempEquipo] = await Promise.all([
    inactivo ? Promise.resolve({ copas: [], posicionActual: null }) : getEquipoActualInfo(j.codequipo_actual),
    getCortesElo(categoriaElo, tempSel ? Number(tempSel) : null),   // cortes de la categoría que aporta el ELO (última etapa)
    getAlertaActual(cod, tempSel ? Number(tempSel) : null),   // alerta SOLO de la temporada de la ficha: los ciclos no cruzan temporadas
    tempSel ? getAmbitoTemporada(cod, tempSel) : Promise.resolve([]),
    tempSel ? getPartidosTemporada(cod, tempSel) : Promise.resolve([] as any[]),
    getActuacionesV2(cod),
    getHitosV2(cod),
    getGrupoInfo(filaPrincipal?.codgrupo),
    getTarjetasTotales(cod),
    // Copas del EQUIPO de la temporada seleccionada (no la viva) -> la línea de honores del hero sigue el
    // selector, igual que en la ficha de equipo. Team = el de la etapa principal de esa temporada.
    getCopasPorTemporada(filaPrincipal?.codequipo ?? j.codequipo_actual),
  ])
  const { posicionActual } = equipoInfo   // `copas` (viva) ya no se usa: el hero muestra las de la temporada seleccionada
  // Honores de copa de la TEMPORADA seleccionada (vacío si el equipo no jugó copa esa temporada -> no se muestra nada).
  const copasSelHero = (tempSel != null ? copasPorTempEquipo[String(tempSel)] : null) ?? []
  // ¿La competición PRINCIPAL de la temporada es copa/playoff? (categoria_nivel NULL / codgrupo fam-*). En ese
  // caso el hero NO pega la posición de liga a la pastilla (en copa no hay clasificación por puntos).
  const esCopaPrincipal = filaPrincipal != null && filaPrincipal.categoria_nivel == null
  const grupoUrl = grupoHref(grupoInfo)
  // FUSIÓN pastilla competición + honor de copa: si la principal es copa y existe un honor de la MISMA
  // familia (mismo slug_comp de web_grupos que el grupo de la etapa, ambos ya de la temporada seleccionada),
  // es la misma competición repetida -> se muestra UNA pastilla con nombre completo + estado. El honor fusionado
  // se saca de CopasLinea (copasResto) para que no salga dos veces. Honor de OTRA familia (jugador de liga con
  // copa) -> no se fusiona y siguen las dos pastillas.
  const famPrincipal = esCopaPrincipal ? (grupoInfo?.slug_comp ?? null) : null
  const idxHonorFusion = famPrincipal != null ? copasSelHero.findIndex((c) => c.slug_familia === famPrincipal) : -1
  const honorFusion = idxHonorFusion >= 0 ? copasSelHero[idxHonorFusion] : null
  const copasResto = honorFusion ? copasSelHero.filter((_, i) => i !== idxHonorFusion) : copasSelHero

  // Reorden de las competiciones (pastillas): la INSTALADA (rank_principal) primero, luego el resto por
  // categoria_nivel ascendente (menor nivel = categoría superior). El orden se COMPARTE con las pastillas y el
  // gráfico de jornadas (CompChips/Jornadas) y con el bloque Nivel, para que el índice de pastilla mapee igual
  // en los tres. Se une a las etapas por codgrupo. Con una sola competición el reorden es trivial (idéntico).
  const etapaPorGrupo = new Map(etapas.map((e) => [String(e.codgrupo), e]))
  const compsOrd = [...comps].sort((a, b) => {
    const ea = etapaPorGrupo.get(String(a.codgrupo)), eb = etapaPorGrupo.get(String(b.codgrupo))
    const ia = !!ea?.rank_principal, ib = !!eb?.rank_principal
    if (ia !== ib) return ia ? -1 : 1
    return (ea?.categoria_nivel ?? 99) - (eb?.categoria_nivel ?? 99)
  })
  // Datos por competición para Nivel (mismo orden que las pastillas): rankings de CATEGORÍA/POSICIÓN de cada
  // etapa + sello (pre-renderizado en servidor; el componente cliente elige el de la pastilla activa).
  const compsRank: CompRank[] = compsOrd.map((c) => {
    const e = etapaPorGrupo.get(String(c.codgrupo))
    return {
      nombreComp: c.nombre_comp,
      sello: <Sello nombreComp={c.nombre_comp} size={18} />,
      selloSm: <Sello nombreComp={c.nombre_comp} size={14} />,
      rankCat: e?.rank_categoria_temp ?? null, rankCatTotal: e?.rank_categoria_temp_total ?? null,
      rankPos: e?.rank_posicion_temp ?? null, rankPosTotal: e?.rank_posicion_temp_total ?? null,
    }
  })

  const cMed = (v: number | null) => (v == null ? '' : PAL[esc(v, CORTES_FIJOS.mediaPartido)])
  const cElo = (v: number | null) => (v == null ? '' : PAL[esc(v, cortesElo)])
  const cPts = (v: number) => PAL[esc(v, CORTES_FIJOS.puntosPartido)]

  // Datos por competición para las superficies REACTIVAS (mismo orden que las pastillas): la cabecera (KpiBar)
  // y el percentil del Nivel siguen la etapa seleccionada. Cada etapa trae sus cifras propias (la copa NO se
  // suma con la liga: son competiciones distintas). `kpiFallback` = temporada sin competiciones (sin partidos).
  const compsKpi: CompKpi[] = compsOrd.map((c) => {
    const e = etapaPorGrupo.get(String(c.codgrupo))
    const pjE = e?.pj ?? 0, ptsE = e?.pts_fantasy ?? 0
    return {
      pj: pjE, minutos: e?.minutos ?? 0, goles: e?.goles ?? 0, porterias_cero: e?.porterias_cero ?? 0,
      ptsFantasy: Math.round(ptsE), media: pjE > 0 ? ptsE / pjE : null, mediaColor: cMed(pjE > 0 ? ptsE / pjE : null),
    }
  })
  const compsPct: CompPct[] = compsOrd.map((c) => {
    const e = etapaPorGrupo.get(String(c.codgrupo))
    return {
      pct: e?.elo_percentil_temp != null ? Math.min(99, Math.floor(e.elo_percentil_temp)) : null,
      nombreComp: c.nombre_comp, selloSm: <Sello nombreComp={c.nombre_comp} size={14} />,
    }
  })
  const kpiFallback: CompKpi = { pj, minutos: minT, goles: golesT, porterias_cero: p0Sel, ptsFantasy: Math.round(ptsF), media, mediaColor: cMed(media) }

  // Orden CRONOLÓGICO INVERSO (más reciente primero) por fecha_inicio, con la FASE como respaldo (playoff→liga→copa).
  // Es el orden canónico del sitio (ordenPorFechaOFase); lo COMPARTEN la sección "Temporadas" y la Trayectoria.
  // getCarreraV2 (que ordena por orden_temporada) empataba liga/playoff/copa cuando el pipeline deja orden_temporada
  // NULL en copa/playoff -> orden arbitrario. Copia aparte: NO altera `carrera`/`etapas`, que definen etapaUltima -> ELO.
  const carreraOrd = [...carrera].sort((a, b) =>
    String(b.codtemporada).localeCompare(String(a.codtemporada))
    || ordenPorFechaOFase(
      { fechaInicio: a.fecha_inicio, fase: faseCompeticion(a.nombre_comp, a.categoria_nivel) },
      { fechaInicio: b.fecha_inicio, fase: faseCompeticion(b.nombre_comp, b.categoria_nivel) })
    || (a.orden_temporada ?? 0) - (b.orden_temporada ?? 0))

  // Ficha SOLO-COPA: los agregados de VIDA (web_jugador) son estrictamente de LIGA -> en un jugador que solo ha
  // jugado copa están a 0. Señal limpia del pipeline: pj_total = 0 AND temporadas = 0. Se OCULTA el bloque de
  // vida (Totales, compañeros, ranking general, rating), NO la identidad ni el ELO (sí tienen valor).
  const esSoloCopa = (j.pj_total ?? 0) === 0 && (j.temporadas ?? 0) === 0

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
  // Solo compañeros activos en la temporada actual o la anterior; se filtra la lista completa y luego se
  // recorta a 6 (el pipeline solo exporta ~5-6, así que puede quedar por debajo de 6: ver companerosActivos).
  const companeros = (await companerosActivos(j.companeros_top || [])).slice(0, 6)
  const compNames = compsOrd.map((c) => c.nombre_comp)   // mismo orden que pastillas/Jornadas -> el subtítulo Echo nombra la comp correcta
  const ligaCod = comps[0]?.codgrupo

  // Percentil de ELO POR TEMPORADA: elo_percentil_temp de la ÚLTIMA etapa (etapaUltima), la misma fila de la
  // que sale el ELO -> coherente con el valor y su coloreado. Antes era web_jugador.elo_percentil (de hoy, en
  // cualquier temporada). Floor y TOPE 99. Batería: min(10, round(pct/10)) -> se llena entera en el tope.
  const eloBig = eloCierre   // Nivel y KpiBar comparten el ELO de la última etapa (un solo ELO en pantalla).

  const dorsalesOtros = (j.dorsales_otros || []).filter((d) => d !== j.dorsal_ultimo && d !== j.dorsal_comun)

  // Aviso de colaboración sobre la posición (mismo canal que la ficha actual): sin posición -> se muestra en
  // el hero (el hueco es visible); posición estimada -> al pie, junto a «Corregir datos». Confirmada -> nada
  // (el botón «Corregir datos» ya cubre ese caso). Ver AvisoDato / [slug]/page.tsx.
  const sinPosicion = !j.posicion_pastilla
  const avisoPos = sinPosicion
    ? { pre: '¿Conoces la posición de este jugador?', enlace: 'Dínoslo', post: ' y la añadimos.', asunto: `Posición de ${nombre}` }
    : j.posicion_es_estimada
      ? { pre: 'Esta demarcación es una estimación a partir del dorsal. ¿Sabes cuál es la suya?', enlace: 'Dínoslo', post: '.', asunto: `Posición de ${nombre}` }
      : null
  const avisoHref = avisoPos ? `mailto:futbol11stats@gmail.com?subject=${encodeURIComponent(avisoPos.asunto)}` : ''
  const avisoNode = avisoPos ? (
    <p className="aviso-pos">{avisoPos.pre}{' '}<a href={avisoHref}>{avisoPos.enlace}</a>{avisoPos.post}</p>
  ) : null

  const cuentaTemp = new Map<string, number>()
  for (const c of carrera) cuentaTemp.set(c.codtemporada, (cuentaTemp.get(c.codtemporada) ?? 0) + 1)

  const tempTxt = tempSel ? tempLabel(tempSel) : ''
  const alertaTxt = alertaHumana(alerta)

  // Orden EXACTO de aparición en el DOM: primero el aside (Nivel, Totales, Compañeros), luego el main.
  // `aside:true` -> el scroll-spy las ignora en desktop (columna sticky, siempre visible). Ver NavSpy.
  const secciones = ([
    { id: 's-nivel', label: 'Nivel', aside: true },
    esSoloCopa ? null : { id: 's-totales', label: 'Totales', aside: true },   // vida (liga) -> se oculta en solo-copa
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
    { name: nombre, url: `${SITE_URL}/madrid/jugador/${slug}` },
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
  const badge11 =<span style={{ width: 20, height: 20, borderRadius: '50%', background: '#1a7a3c', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, color: '#fff', fontSize: 11, lineHeight: 1 }}>11</span>

  // 3ª casilla: goles (jugador de campo) o porterías a cero (portero). El criterio es es_portero de
  // web_jugador (posición federativa / mayoría de apariciones como portero, lo calcula el pipeline), NO
  // la mera existencia de goles_encajados: un jugador de campo que actuó de portero de emergencia una vez
  // tiene ese dato y NO debe pasar por portero.
  const golesTile: [ReactNode, string, string] = portero
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
  // Totales de carrera que no caben en la parrilla principal (participación/eventos): recuento de temporadas
  // y, para porteros, goles encajados y GC por partido. Van en una segunda parrilla con tantas columnas como
  // fichas, así siempre queda una fila completa. Ver ficha actual (Totales de [slug]/page.tsx).
  const gc = j.gc_pj != null ? med1(j.gc_pj) : '—'
  const extras: Array<[ReactNode, string, string]> = []
  if (portero) {
    extras.push([<Balon size={13} key="i" />, mil(j.goles_encajados_total), 'Goles enc.'])
    extras.push([<Guante size={13} key="i" />, gc, 'GC/partido'])
  }
  if (j.temporadas != null) extras.push([<Calendario size={13} key="i" />, mil(j.temporadas), 'Temporadas'])

  const RC: Record<string, string> = { G: 'var(--e3)', E: 'var(--ink-3)', P: 'var(--e0)' }

  return (
    <div className="fjv2">
      <CompReset dep={j.codjugador} />
      <JsonLd data={graphLd(breadcrumbLd(crumbs))} />
      {/* 1 · HERO */}
      <div className="hero">
        <div className="hero-top">
          <div className="avatar" style={avatarStyle}>{ini}{j.dorsal_ultimo != null && <div className="dorsal">{j.dorsal_ultimo}</div>}</div>
          <h1 className="hero-name">
            <span className="first">{pila}</span>
            <span className="last">{apellidos}</span>
          </h1>
          <CompartirBtn titulo={`${nombre} · Fútbol11Stats`} variant="icon" />
        </div>
        <div className="hero-pills">
          <Pastilla pos={j.posicion_pastilla} estimada={!!j.posicion_es_estimada} />
          {j.edad != null && <span className="pill n">{j.edad} años</span>}
          {j.equipo_actual_nombre && (
            <span className="pill n">
              <EscudoBox escudo={j.escudo_actual} nombre={j.equipo_actual_nombre ?? undefined} size={26} radius={4} />
              {inactivo && <span style={{ color: 'var(--ink-3)' }}>Último equipo · </span>}
              <NombreEquipo codequipo={j.codequipo_actual} nombre={j.equipo_actual_nombre} />
              {inactivo && j.codtemporada_ultima && <span style={{ color: 'var(--ink-3)' }}> ({tempLabel(j.codtemporada_ultima)})</span>}
            </span>
          )}
          {filaPrincipal?.nombre_comp && (
            <LigaPastilla nombreComp={filaPrincipal?.nombre_comp ?? null}
              slugFamilia={honorFusion?.slug_familia ?? undefined}
              segments={honorFusion
                ? [filaPrincipal.nombre_comp, honorFusion.estado]   // fusionada: "Copa RFEF Fase Autonómica · En juego · Fase de grupos"
                : [filaPrincipal?.nombre_comp ?? null, filaPrincipal?.grupo_nombre ?? null, esCopaPrincipal || inactivo || posicionActual == null ? null : `${posicionActual}º`]}
              href={honorFusion?.href ?? grupoUrl} muted={inactivo} />
          )}
          {/* Honores de copa de la temporada SELECCIONADA (no la viva). Sin la copa ya fusionada arriba. Vacío ->
              CopasLinea no renderiza. Mismo criterio que la ficha de equipo. */}
          <CopasLinea copas={copasResto} />
        </div>
        {alertaTxt && (
          <div className="alert">
            <span style={{ color: 'var(--card-y)', display: 'flex' }}><TarjetaAmarilla size={13} /></span>
            <span dangerouslySetInnerHTML={{ __html: alertaTxt }} />
          </div>
        )}
        {/* Sin posición: el aviso se queda en el hero, donde el hueco es visible (los demás casos bajan al pie). */}
        {sinPosicion && avisoNode}
      </div>

      {carrera.length === 0 ? (
        /* Incidente temporal (re-export del pipeline): sin carrera no hay temporada ni gráfico, aunque el
           jugador existe en web_jugador. Aviso CONDICIONAL AL DATO -> desaparece solo al repoblarse la
           tabla, sin bandera manual que haya que acordarse de quitar. */
        <div className="aviso-datos">Estamos actualizando los datos históricos de este jugador. Vuelve en un rato.</div>
      ) : (<>
      {/* 2 · KPIs — cabecera REACTIVA: las cifras (PJ/Min/Goles·P.a0/Pts F./Media) siguen la competición del
          selector (compStore); cada etapa trae las suyas y la copa no se suma con la liga. El ELO NO cambia
          (valor del jugador al cierre de la temporada = última etapa), coloreado con los cortes de su categoría. */}
      <KpiJugador comps={compsKpi} fallback={kpiFallback} portero={portero}
        elo={eloCierre != null ? Math.round(eloCierre) : null} eloColor={cElo(eloCierre)} />

      {/* SCOPE */}
      <div className="scope">
        <div className="scope-lbl">Temporada</div>
        <div className="track"><div className="rail">
          {temporadas.map((t) => (
            <Link key={t} href={`/madrid/jugador/${slug}/${tempLabel(t)}`} className={t === tempSel ? 'on' : ''}>{tempLabel(t)}</Link>
          ))}
        </div></div>
        {comps.length > 0 && <>
          <div className="scope-lbl" style={{ paddingTop: 11 }}>Competición</div>
          <div className="track"><div className="rail"><CompChips comps={compsOrd.map((c) => { const e = etapaPorGrupo.get(String(c.codgrupo)); return { label: c.nombre_comp, count: c.jornadas.length, sello: <Sello nombreComp={c.nombre_comp} size={18} />, fase: faseCompeticion(c.nombre_comp, e?.categoria_nivel), fechaInicio: e?.fecha_inicio ?? null } })} /></div></div>
        </>}
        <div className="scope-note">Las secciones marcadas «Todas las temporadas» no dependen de esta selección.</div>
      </div>

      {/* NAV */}
      <NavSpy secciones={secciones} />

      <div className="layout">
        <div className="aside">
          {/* NIVEL */}
          <section id="s-nivel">
            {/* Rankings y etiqueta de categoría: de la fila rank_principal de la TEMPORADA seleccionada
                (rank_*_temp, no el snapshot de web_jugador) -> cambian con el selector. ELO: el de la ÚLTIMA
                etapa de la temporada (eloCierre; valor propio del jugador, mismo que la KpiBar), coloreado con
                los cortes de SU categoría (categoriaElo). El percentil sigue siendo el de web_jugador (mide
                ELO, otro KPI; pendiente uno por temporada — ver DECISIONES). El subtítulo indica la temporada. */}
            <div className="s-head"><h2 className="s-title">Nivel</h2><div className="s-sub"><span className="allscope">{tempTxt ? `en ${tempTxt}` : 'Situación actual'}</span></div></div>
            <div className="box">
              {/* ELO + percentil REACTIVOS: el ELO no cambia (cierre de la temporada, última etapa); el percentil
                  sí sigue la competición del selector -> con la copa activa, el percentil es el de SU pool
                  (elo_percentil_temp de la etapa). El techo histórico (máx) va entre el ELO y la batería. */}
              <NivelElo elo={eloBig != null ? Math.round(eloBig) : null} eloColor={cElo(eloBig)} comps={compsPct}
                maxLbl={j.elo_max != null
                  ? <div className="elo-max">máx {mil(Math.round(j.elo_max))}{j.temporada_elo_max ? ` · ${tempLabel(j.temporada_elo_max)}` : ''}</div>
                  : null} />
              {/* Evolución del ELO (cierre por temporada) — mismo sparkline que la ficha actual (Medidores). */}
              <EloSparkline serie={j.elo_serie || []} className="w-full h-9 mt-3" />
              {/* Rating F11S (índice compuesto 0-100, beta) — de web_jugador.rating_f11s, métrica DISTINTA del
                  ELO. Estaba en la ficha actual (Medidores/AnilloRating) y se perdió al portar. Estilo v2. */}
              {j.rating_f11s != null && (() => {
                const r = j.rating_f11s as number
                const cR = r >= 66 ? 'var(--e3)' : r >= 40 ? 'var(--e2)' : 'var(--e1)'
                return (
                  <div className="rating-f11s">
                    <div className="rf-top">
                      <div className="cap">Rating F11S <span className="rf-beta">beta</span></div>
                      <div className="rf-v" style={{ color: cR }}>{r}<span className="rf-100">/100</span></div>
                    </div>
                    <div className="batt">{Array.from({ length: 10 }).map((_, i) => <i key={i} style={i < Math.round(r / 10) ? { background: cR } : undefined} />)}</div>
                    <div className="batt-lbl">Índice compuesto de rendimiento sobre 100.</div>
                  </div>
                )
              })()}
              <div style={{ marginTop: 13 }}>
                {/* Cada ranking con su icono: badge (11) F11S, Sello de competición, Pastilla de posición. */}
                {/* General: agregado sobre el total fantasy de la temporada (rank_general_season, fila
                    rank_principal). NO sigue la pastilla. Categoría/posición: SÍ la siguen (cliente). */}
                <RankFila insignia={badge11} label="Fútbol11Stats · Madrid" rank={filaPrincipal?.rank_general_season ?? null} total={filaPrincipal?.rank_general_season_total ?? null} />
                <NivelRankings comps={compsRank}
                  posInsignia={<Pastilla pos={j.posicion_pastilla} estimada={!!j.posicion_es_estimada} size="mini" />}
                  posLabel={j.posicion_pastilla ? (POS_LABEL[j.posicion_pastilla] || j.posicion_pastilla) : 'Posición'} />
              </div>
              {/* Aclara el criterio: rankings por PUNTOS FANTASY de la temporada seleccionada (rank_*_temp de la
                  fila principal), no de toda la carrera. Distinto del percentil de arriba, que mide ELO. */}
              <p className="rank-note">Por puntos fantasy de la temporada.</p>
            </div>
          </section>

          {/* TOTALES — agregados de VIDA (liga). En una ficha solo-copa están a 0 -> se oculta el bloque entero
              (mismo criterio que la ficha de equipo solo-copa: ocultar, no mostrar ceros). */}
          {!esSoloCopa && (
          <section id="s-totales">
            <div className="s-head"><h2 className="s-title">Totales</h2><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
            <div className="totales">
              {totales.map(([ic, v, k], i) => (
                <div className="tot" key={i}><div className="t-i">{ic}</div><div className="t-v">{v}</div><div className="t-k">{k}</div></div>
              ))}
            </div>
            {/* #3 Temporadas + #5 (portero) Goles enc./GC por partido: segunda parrilla ajustada al nº de fichas. */}
            {extras.length > 0 && (
              <div className="totales tot-extra" style={{ gridTemplateColumns: `repeat(${extras.length}, 1fr)` }}>
                {extras.map(([ic, v, k], i) => (
                  <div className="tot" key={i}><div className="t-i">{ic}</div><div className="t-v">{v}</div><div className="t-k">{k}</div></div>
                ))}
              </div>
            )}
            {/* #4 Cobertura de la trayectoria: completa (todo su historial) o desde 2021-22 (inicio del dato). */}
            {j.trayectoria_completa != null && (
              j.trayectoria_completa
                ? <p className="tot-badge ok"><Estrella size={13} /> Trayectoria completa</p>
                : <p className="tot-badge">Datos desde 2021-22</p>
            )}
            {/* #12 Dorsal: último / habitual / otros como tiles (antes era una línea de texto comprimida). */}
            {(j.dorsal_ultimo != null || j.dorsal_comun != null || dorsalesOtros.length > 0) && (
              <div className="dorsal-blk">
                <div className="cap dorsal-cap">Dorsal</div>
                <div className="dorsal-tiles">
                  {j.dorsal_ultimo != null && (
                    <div className="dt"><div className="dt-v">{j.dorsal_ultimo}</div><div className="dt-k">Último</div></div>
                  )}
                  {j.dorsal_comun != null && j.dorsal_comun !== j.dorsal_ultimo && (
                    <div className="dt"><div className="dt-v mut">{j.dorsal_comun}</div><div className="dt-k">Habitual</div></div>
                  )}
                  {dorsalesOtros.length > 0 && (
                    <div className="dt otros"><div className="dt-v sm">{dorsalesOtros.join(', ')}</div><div className="dt-k">Otros</div></div>
                  )}
                </div>
              </div>
            )}
          </section>
          )}

          {/* COMPAÑEROS */}
          {companeros.length > 0 && (
            <section id="s-mates">
              {/* slice(0,6) preparado para dos filas de tres, pero web_jugador.companeros_top viene con
                  exactamente 5 desde el pipeline: el subtítulo refleja el nº real y saldrá 6 solo. */}
              <div className="s-head"><h2 className="s-title">Ha jugado con</h2><div className="s-sub">top {companeros.length} por ELO</div></div>
              <div className="track"><div className="rail">
                {companeros.map((c: CompaneroTop) => {
                  const nm = formatNombre(c.nombre)
                  const mi = nm.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
                  return (
                    <Link key={c.codjugador} href={jugadorHref(c.codjugador, c.nombre)} className="mate">
                      {/* El escudo representa al COMPAÑERO (persona): alt/title = "{jugador} en {equipo}". */}
                      {escudoUrl(c.escudo_actual) ? <EscudoBox escudo={c.escudo_actual} nombre={c.equipo_actual ?? undefined} altText={`${nm}${c.equipo_actual ? ` en ${c.equipo_actual}` : ''}`} size={46} radius={9} /> : <div className="m-av">{mi}</div>}
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
            <div className="s-head"><h2 className="s-title">Puntos y ELO por jornada</h2><div className="s-sub"><Echo temporada={tempTxt} comps={compNames} /></div></div>
            {comps.length > 0
              ? <Jornadas comps={compsOrd} cortes={CORTES_FIJOS.puntosPartido} />
              : <p style={{ padding: '0 var(--pad)', color: 'var(--ink-3)', fontSize: 'var(--t-sm)' }}>Sin partidos en esta temporada.</p>}
          </section>

          {/* FORMA */}
          <section id="s-forma">
            <div className="s-head"><h2 className="s-title">Forma</h2><div className="s-sub">media de puntos por partido</div></div>
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
            <div className="s-head"><h2 className="s-title">Análisis</h2><div className="s-sub"><Echo temporada={tempTxt} comps={compNames} /></div></div>
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
            <div className="s-head"><h2 className="s-title">Temporadas</h2><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
            <div className="track"><div className="rail" id="seasons">
              {carreraOrd.map((c, i) => {
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
              <div className="s-head"><h2 className="s-title">Trayectoria</h2><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
              <div style={{ padding: '0 var(--pad)' }}>
                <Trayectoria carrera={carreraOrd} portero={portero} codjugador={j.codjugador} railWrap />
                {/* #7 Reparto titular/suplente y minutos totales de la carrera (web_jugador.*_total, LIGA) -> fuera en solo-copa. */}
                {!esSoloCopa && (j.titular_total != null || j.suplente_total != null) && (
                  <p className="tray-note">
                    <b>{mil(j.titular_total)}</b> como titular · <b>{mil(j.suplente_total)}</b> como suplente
                    {portero ? '' : <> · <b>{mil(j.minutos_total)}</b> minutos</>}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* MEJORES ACTUACIONES */}
          <section id="s-partidos">
            <div className="s-head"><h2 className="s-title">Mejores actuaciones</h2><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
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
                      <div className="m-riv"><span className="m-vs">vs</span> <NombreEquipo codequipo={a.rival_cod} nombre={a.rival_nombre} /></div>
                      <div className="m-meta">
                        {a.es_local != null && <IndicadorLocal esLocal={a.es_local} />}
                        <span>{fechaCorta(a.fecha)}{a.ronda_label ? ` · ${a.ronda_label}` : (a.jornada != null ? ` · J${a.jornada}` : '')}</span>
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
            <div className="s-head"><h2 className="s-title">Hitos</h2><div className="s-sub"><span className="allscope">Todas las temporadas</span></div></div>
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
            {/* Posición estimada: el aviso de colaboración baja al pie, junto a «Corregir datos». */}
            {!sinPosicion && avisoNode && <div style={{ padding: '14px var(--pad) 0' }}>{avisoNode}</div>}
            <div className="foot" style={{ paddingTop: 18 }}>
              <CompartirBtn titulo={`${nombre} · Fútbol11Stats`} variant="btn" />
              <a className="btn" href={`mailto:futbol11stats@gmail.com?subject=${encodeURIComponent(`Corrección en la ficha de ${nombre}`)}&body=${encodeURIComponent(`Jugador: ${nombre} (código ${j.codjugador})\nFicha: ${SITE_URL}/madrid/jugador/${slug}\n\nQué está mal:\n`)}`}>Corregir datos</a>
            </div>
          </section>
        </div>
      </div>
      </>)}
    </div>
  )
}
