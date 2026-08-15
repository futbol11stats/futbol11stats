import './ficha.css'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Sello from '@/components/Sello'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreEquipo from '@/components/NombreEquipo'
import { FlechaEntra } from '@/components/iconos'
import { nombreOficial, denominacion, familiaSello } from '@/lib/sellos'
import { ensureMadrid } from '@/lib/seo'
import { LIVE_COD } from '@/lib/equipo'
import { colorElo } from '@/lib/equipoV2'
import { fichasInfo } from '@/lib/jugador'
import RankingComp, { type RankItem } from '@/components/ficha/v2/RankingComp'
import { campoXI, POSC } from '@/components/ficha/v2/campoXI'
import { FilaEspejo, EspejoHead } from '@/components/ficha/v2/barrasGoles'
import TarjetasTemporadaV2 from '@/components/ficha/v2/TarjetasTemporadaV2'
import Panorama from '@/components/ficha/v2/Panorama'
import ScrollRail from '@/components/ficha/v2/ScrollRail'
import ReportesScroll from '@/components/ficha/v2/ReportesScroll'
import {
  datosGoleadorTemp, datosPorteroTemp, datosFantasyTemp, datosEloTemp, datosXiTemp,
  leyGoleadorTemp, leyPorteroTemp, leyFantasyTemp, leyEloTemp, leyXiTemp,
} from '@/components/ficha/v2/lineasComp'
import { Balon } from '@/components/iconos'
import {
  TEMPORADA_MAP, COD_TO_LABEL, TEMPORADAS_ORD, getGlobalGruposV2, getGlobalClasifV2, kpisDeClasif,
  zonaFamilia, ZONA_FAM_COL, ZONA_FAM_LABEL,
  getGlobalTopTemporadaV2, getGlobalMvpV2, getGlobalEquiposFormaV2,
  getGlobalXiV2, getGlobalCifrasV2, getGlobalTeamGoalsV2, getGlobalTramosV2, getJuegoLimpioV2, getAlertasV2,
  getGlobalLideresV2, getGlobalCifrasFullV2,
} from '@/lib/competicionV2'
import type { ReactNode } from 'react'

// Pestañas de Global: se ocultan las de jornada atadas a partidos de un grupo (Resultados, Goleadores y
// Tarjetas de jornada) — no tienen equivalente global. El resto AGREGA los grupos.
const G_TABS_J: [string, string][] = [['clasificacion', 'Clasificación'], ['top5-jugadores-jornada', 'Top 5 Jugadores'], ['top5-equipos-jornada', 'Top 5 Equipos'], ['once-optimo-jornada', 'XI Óptimo']]
const G_TABS_T: [string, string][] = [['top10-goleadores-temporada', 'Goleadores'], ['top10-porteros-temporada', 'Porteros'], ['top10-tarjetas-temporada', 'Tarjetas'], ['top10-fantasy-temporada', 'Fantasy'], ['top10-elo-jugadores-temporada', 'ELO'], ['once-optimo-temporada', 'XI Óptimo'], ['estadisticas', 'Estadísticas']]
const G_TEMP = new Set(G_TABS_T.map((t) => t[0]))

const mil = (n: number | null | undefined) => (n == null ? '—' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'))

// La clasificación GLOBAL es la única pestaña especial; el resto se atienden desde cada grupo. En este
// incremento la vista global implementa la CLASIFICACIÓN por zonas (la que más cuidado pedía Fernando).
// `suf` = sufijo de URL para los enlaces internos (temporada, grupos, modo, jornada, tabs), incluidos los
// enlaces CRUZADOS global→grupo. Vacío ('') en la URL canónica; '/v2' mientras la v2 se sirve además en /v2.
// El JSON-LD (breadcrumb) NO lo emite este componente: lo mantiene el page.tsx (dueño de la URL canónica).
export default async function FichaCompeticionGlobalV2({ categoria, slugComp, temporada, jornada, tab, suf = '' }: {
  categoria: string; slugComp: string; temporada: string; jornada: string; tab: string; suf?: string
}) {
  const codtemporada = TEMPORADA_MAP[temporada]
  if (!codtemporada) notFound()
  const grupos = await getGlobalGruposV2(categoria, slugComp, codtemporada)
  if (!grupos.length) notFound()

  const totalJornadas = Math.max(...grupos.map((g) => g.total_jornadas || 0), 1)
  const jornadaNum = parseInt(jornada.replace('jornada-', '')) || Math.max(...grupos.map((g) => g.jornada_actual || 0), 1)
  const codgrupos = grupos.map((g) => String(g.codgrupo))
  const filas = await getGlobalClasifV2(codgrupos, codtemporada, jornadaNum)
  const kpis = kpisDeClasif(filas as any)

  // Panorama (siempre): líderes + cifras de toda la categoría, con fichas de los líderes para enlazar.
  const [lideresG, cifrasG] = await Promise.all([
    getGlobalLideresV2(codgrupos, codtemporada, jornadaNum),
    getGlobalCifrasFullV2(grupos, codtemporada, jornadaNum),
  ])
  const fichasLid = await fichasInfo([lideresG.goleador, lideresG.portero, lideresG.elo, lideresG.tarjetas].filter(Boolean).map((j: any) => j.codjugador))

  const nombre = nombreOficial(grupos[0].nombre_comp) ?? ensureMadrid(denominacion(grupos[0].nombre_comp))
  const enJuego = String(codtemporada) === String(LIVE_COD)
  const base = `/madrid/${categoria}/${slugComp}`

  const modo: 'jornada' | 'temporada' = G_TEMP.has(tab) ? 'temporada' : 'jornada'
  const tabsA = modo === 'temporada' ? G_TABS_T : G_TABS_J
  const tabEf = tabsA.some((t) => t[0] === tab) ? tab : tabsA[0][0]

  // Rankings AGREGADOS (fusión de grupos por valor individual; NO se suman puntos de equipo).
  let gRank: { title: string; sub: string; items: RankItem[]; barColor?: string; leyenda?: ReactNode } | null = null
  let fichas = new Map<string, any>()
  const subCat = 'toda la categoría'
  if (tabEf === 'top5-jugadores-jornada') {
    const mvp = await getGlobalMvpV2(codgrupos, codtemporada, jornadaNum)
    fichas = await fichasInfo(mvp.map((j) => j.codjugador))
    gRank = { title: '5 mejores jugadores', sub: `jornada ${jornadaNum} · ${subCat}`, leyenda: <>El chip son los <b>puntos fantasy</b> de la jornada; el icono, los <b>goles</b>.</>, items: mvp.map((j) => ({ rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo, valor: Math.round(j.pts_fantasy ?? 0), valorColor: 'var(--e3)', extra: (j.goles ?? 0) > 0 ? <span style={{ color: 'var(--e3)' }}>{j.goles}<Balon size={11} /></span> : null })) }
  } else if (tabEf === 'top5-equipos-jornada') {
    const ef = await getGlobalEquiposFormaV2(codgrupos, codtemporada, jornadaNum)
    gRank = { title: '5 equipos más en forma', sub: `jornada ${jornadaNum} · ${subCat}`, leyenda: <>El chip es la suma de <b>puntos fantasy</b> de los jugadores del equipo en la jornada.</>, items: ef.map((e) => ({ rank: e.rank, codequipo: e.codequipo, nombre: e.nombre_equipo, escudo: e.escudo, nombreEquipo: e.nombre_equipo, valor: Math.round(e.pts_fantasy ?? 0), valorColor: 'var(--e3)' })) }
  } else if (tabEf === 'top10-goleadores-temporada' || tabEf === 'top10-porteros-temporada' || tabEf === 'top10-elo-jugadores-temporada' || tabEf === 'top10-fantasy-temporada') {
    const t = await getGlobalTopTemporadaV2(codgrupos, codtemporada, jornadaNum)
    fichas = await fichasInfo([...t.goleadores, ...t.porteros, ...t.elo, ...t.fantasy].map((j) => j.codjugador))
    const sub = `acumulado hasta J${jornadaNum} · ${subCat}`
    const base3 = (j: any) => ({ rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo })
    if (tabEf === 'top10-goleadores-temporada') { const max = Math.max(1, ...t.goleadores.map((j) => j.goles ?? 0)); gRank = { title: 'Goleadores', sub, barColor: 'var(--e4)', leyenda: leyGoleadorTemp, items: t.goleadores.map((j) => ({ ...base3(j), valor: j.goles, valorColor: 'var(--e4)', barPct: ((j.goles ?? 0) / max) * 100, extra: datosGoleadorTemp(j) })) } }
    else if (tabEf === 'top10-porteros-temporada') { const max = Math.max(1, ...t.porteros.map((j) => j.goles ?? 0)); gRank = { title: 'Porterías a cero', sub, barColor: 'var(--amber)', leyenda: leyPorteroTemp, items: t.porteros.map((j) => ({ ...base3(j), valor: j.goles ?? 0, valorColor: 'var(--amber)', barPct: ((j.goles ?? 0) / max) * 100, extra: datosPorteroTemp(j) })) } }
    else if (tabEf === 'top10-fantasy-temporada') { const max = Math.max(1, ...t.fantasy.map((j) => Math.round(j.pts_fantasy ?? 0))); gRank = { title: 'Ranking fantasy', sub, barColor: 'var(--e3)', leyenda: leyFantasyTemp, items: t.fantasy.map((j) => ({ ...base3(j), valor: Math.round(j.pts_fantasy ?? 0), valorColor: 'var(--e3)', barPct: (Math.round(j.pts_fantasy ?? 0) / max) * 100, extra: datosFantasyTemp(j) })) } }
    else { gRank = { title: 'ELO jugadores', sub: `tras J${jornadaNum} · ${subCat}`, leyenda: leyEloTemp, items: t.elo.map((j) => ({ ...base3(j), valor: j.elo != null ? mil(j.elo) : '—', valorColor: colorElo(j.elo) || 'var(--e1)', extra: datosEloTemp(j) })) } }
  }

  // XI Óptimo global (lo calcula el pipeline con normalización entre grupos: tipo temporada_global / jornada_global).
  let xiG: { title: string; sub: string; players: { posicion: string; nombre: string; valor: number | string }[]; items: RankItem[]; leyenda: ReactNode } | null = null
  if (tabEf === 'once-optimo-temporada' || tabEf === 'once-optimo-jornada') {
    const esTemp = tabEf === 'once-optimo-temporada'
    let xi = await getGlobalXiV2(codgrupos, codtemporada, esTemp ? 'temporada_global' : 'jornada_global', jornadaNum)
    if (esTemp && xi.length === 0) xi = await getGlobalXiV2(codgrupos, codtemporada, 'temporada_global')
    fichas = await fichasInfo(xi.map((j) => j.codjugador))
    const valOf = (j: any) => Math.round((esTemp ? j.pts_totales : (j.pts_jornada ?? j.pts_totales)) ?? 0)
    xiG = {
      title: esTemp ? 'XI Óptimo de la temporada' : 'XI Óptimo de la jornada',
      sub: `${esTemp ? `acumulado hasta J${jornadaNum}` : `jornada ${jornadaNum}`} · ${subCat}`,
      players: xi.map((j) => ({ posicion: j.posicion, nombre: j.nombre, valor: valOf(j) })),
      items: xi.map((j) => ({
        codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion,
        escudo: j.escudo, nombreEquipo: j.nombre_equipo, valor: valOf(j), valorColor: POSC[j.posicion] ?? 'var(--e3)',
        extra: esTemp
          ? datosXiTemp(j)
          : ((j.goles ?? 0) > 0 ? <span style={{ color: 'var(--e3)' }}>{j.goles}<Balon size={11} /></span> : null),
      })),
      leyenda: <>{leyXiTemp} Once ideal de toda la categoría, calculado con normalización entre grupos.</>,
    }
  }

  // Tarjetas de temporada global (agrega juego limpio + sancionados de todos los grupos).
  let tarG: { equipos: any[]; alertas: any[] } | null = null
  if (tabEf === 'top10-tarjetas-temporada') {
    const [jl, al] = await Promise.all([
      getJuegoLimpioV2(codgrupos, codtemporada, jornadaNum),
      getAlertasV2(codgrupos, codtemporada),
    ])
    fichas = await fichasInfo(al.map((j: any) => j.codjugador))
    tarG = { equipos: jl, alertas: al }
  }

  // Estadísticas global (reparto V/E/D + perfil goleador por equipo + goles por tramo, agregados).
  let estG: { cifras: any; teamGoals: any[]; tramos: { tramo: string; gf: number }[] } | null = null
  if (tabEf === 'estadisticas') {
    const [cif, tg, tr] = await Promise.all([
      getGlobalCifrasV2(codgrupos, codtemporada),
      getGlobalTeamGoalsV2(codgrupos, codtemporada, jornadaNum),
      getGlobalTramosV2(codgrupos, codtemporada),
    ])
    estG = { cifras: cif, teamGoals: tg, tramos: tr }
  }

  // Filas por grupo (en el orden de grupos), con líder (pos 1) y filas con implicaciones (zona != '').
  const porGrupo = grupos.map((g) => {
    const rows = (filas as any[]).filter((r) => String(r.codgrupo) === String(g.codgrupo)).sort((a, b) => a.pos - b.pos)
    return { grupo: g, lider: rows.find((r) => r.pos === 1) || rows[0], zonas: rows.filter((r) => zonaFamilia(r.zona)) }
  })

  return (
    <div className="fjv2 fcv2">
      {/* IDENTIDAD + SELECTORES */}
      <div className="ident">
        <div className="ident-top">
          <span className="comp-sello"><Sello nombreComp={grupos[0].nombre_comp} src={familiaSello(slugComp, grupos[0].nombre_comp)} size={52} /></span>
          <div className="ident-name">
            <div className="over">RFFM · MADRID</div>
            <div className="h1">{nombre} · Global</div>
            <div className="ident-meta">
              {enJuego ? <span className="pill live">EN JUEGO · J{jornadaNum} DE {totalJornadas}</span> : <span className="pill n">Finalizada</span>}
              <span className="pill n">{grupos.length} grupos</span>
              <span className="pill n">{temporada}</span>
            </div>
          </div>
        </div>
        <div className="selrow">
          <div className="sel-lbl">Temporada</div>
          <ScrollRail><div className="sel-rail">
            {TEMPORADAS_ORD.map((cod) => (
              <Link key={cod} href={`/madrid/${categoria}/${slugComp}/global/${COD_TO_LABEL[cod]}/jornada-${jornadaNum}/${tab}${suf}`} className={codtemporada === cod ? 'on' : ''}>{COD_TO_LABEL[cod]}</Link>
            ))}
          </div></ScrollRail>
        </div>
        <div className="selrow" style={{ paddingBottom: 16 }}>
          <div className="sel-lbl">Grupo</div>
          <ScrollRail><div className="sel-rail">
            <span className="glob">Global</span>
            {grupos.map((g) => (
              <Link key={g.codgrupo} href={`${base}/${g.slug_grupo}/${temporada}/jornada-${jornadaNum}/clasificacion${suf}`}>{g.nombre_grupo}</Link>
            ))}
          </div></ScrollRail>
        </div>
      </div>

      {/* PANORAMA — líderes + cifras de toda la categoría */}
      <Panorama lideres={lideresG} cifras={cifrasG} kpis={kpis} fichas={fichasLid}
        subLideres={`${temporada} · toda la categoría`} subCifras={`tras la jornada ${jornadaNum}`} />

      {/* PESTAÑAS sticky */}
      <ReportesScroll tab={tabEf} land={tabEf !== G_TABS_J[0][0]} />
      <div className="tabs" id="reportes-anchor">
        <div className="modo">
          <div className="sel-lbl">Reportes de</div>
          <Link href={`${base}/global/${temporada}/jornada-${jornadaNum}/${G_TABS_J[0][0]}${suf}`} className={modo === 'jornada' ? 'on' : ''}>Jornada</Link>
          <Link href={`${base}/global/${temporada}/jornada-${jornadaNum}/${G_TABS_T[0][0]}${suf}`} className={modo === 'temporada' ? 'on' : ''}>Temporada</Link>
        </div>
        <div className="jrow">
          <div className="sel-lbl">{modo === 'temporada' ? 'Acumulado hasta' : 'Jornada'}</div>
          <ScrollRail><div className="jbar-rail">
            {Array.from({ length: totalJornadas }, (_, i) => i + 1).map((j) => (
              <Link key={j} href={`${base}/global/${temporada}/jornada-${j}/${tabEf}${suf}`} className={j === jornadaNum ? 'on' : ''}>J{j}</Link>
            ))}
          </div></ScrollRail>
        </div>
        <div className="verrow">
          <div className="sel-lbl">Ver</div>
          <ScrollRail><div className="verrail">
            {tabsA.map(([id, label]) => <Link key={id} href={`${base}/global/${temporada}/jornada-${jornadaNum}/${id}${suf}`} className={id === tabEf ? 'on' : ''}>{label}</Link>)}
          </div></ScrollRail>
        </div>
      </div>

      <div className="full"><div className="main">
        {tabEf === 'clasificacion' && (
        <section id="s-clasif">
          <div className="s-head"><div className="s-title">Clasificación global</div><div className="s-sub">{nombre} · {grupos.length} grupos · tras J{jornadaNum}</div></div>

          <div className="cap" style={{ padding: '0 var(--pad) 8px' }}>Líderes de grupo</div>
          <ScrollRail><div className="lideres-g">
            {porGrupo.map(({ grupo, lider }) => lider && (
              <div className="lg-card" key={grupo.codgrupo}>
                <div className="lg-g">{grupo.nombre_grupo}</div>
                <div className="lg-cr"><EscudoBox escudo={lider.escudo} nombre={lider.nombre_equipo} size={30} radius={7} /></div>
                <div className="lg-nm">{lider.nombre_equipo}</div>
              </div>
            ))}
          </div></ScrollRail>

          {porGrupo.map(({ grupo, zonas }) => {
            if (!zonas.length) return null
            // Filas por implicaciones + huecos entre posiciones no consecutivas.
            const filasZ: React.ReactNode[] = []
            zonas.forEach((r, i) => {
              const prev = zonas[i - 1]
              if (prev && r.pos - prev.pos > 1) filasZ.push(<div className="hueco" key={`h${i}`}>{prev.pos + 1}º – {r.pos - 1}º · sin implicaciones</div>)
              const fam = zonaFamilia(r.zona)!
              filasZ.push(
                <div className="zrow" key={r.codequipo}>
                  <span className="zi" style={{ background: ZONA_FAM_COL[fam] }} />
                  <span className="zp" style={{ color: ZONA_FAM_COL[fam] }}>{r.pos}º</span>
                  <EscudoBox escudo={r.escudo} nombre={r.nombre_equipo} size={22} radius={5} />
                  <span className="zn2"><NombreEquipo codequipo={r.codequipo} nombre={r.nombre_equipo} /></span>
                  <span className="zt2" style={{ color: ZONA_FAM_COL[fam], borderColor: ZONA_FAM_COL[fam] }}>{ZONA_FAM_LABEL[fam]}</span>
                  <span className="zpts num">{r.pts}</span>
                </div>,
              )
            })
            return (
              <div className="grp" key={grupo.codgrupo}>
                <Link className="grp-h" href={`${base}/${grupo.slug_grupo}/${temporada}/jornada-${jornadaNum}/clasificacion${suf}`}>
                  <span className="gt">{grupo.nombre_grupo}</span>
                  <span className="gs">ver clasificación completa</span>
                  <span className="ga"><FlechaEntra size={15} /></span>
                </Link>
                {filasZ}
              </div>
            )
          })}
          <div className="leyenda" style={{ paddingTop: 14 }}>Solo se muestran las posiciones con implicaciones. Cada grupo es su propia competición: los puntos <b>no se comparan entre grupos</b>.</div>
        </section>
        )}

        {gRank && (
          <section>
            <div className="s-head"><div className="s-title">{gRank.title}</div><div className="s-sub">{gRank.sub}</div></div>
            {gRank.items.length > 0
              ? <><RankingComp items={gRank.items} fichas={fichas} barColor={gRank.barColor} />{gRank.leyenda && <div className="leyenda">{gRank.leyenda}</div>}</>
              : <p className="vacio">Sin datos agregados en esta {modo === 'temporada' ? 'temporada' : 'jornada'}.</p>}
          </section>
        )}

        {xiG && (
          <section>
            <div className="s-head"><div className="s-title">{xiG.title}</div><div className="s-sub">{xiG.sub}</div></div>
            {xiG.items.length > 0 ? (
              <>
                <div className="xi-wrap">
                  <div className="xi-campo">{campoXI(xiG.players)}</div>
                  <div className="xi-lista"><RankingComp items={xiG.items} fichas={fichas} /></div>
                </div>
                <div className="leyenda">{xiG.leyenda}</div>
              </>
            ) : <p className="vacio">Sin XI Óptimo global en esta {modo === 'temporada' ? 'temporada' : 'jornada'}.</p>}
          </section>
        )}

        {tarG && (
          <TarjetasTemporadaV2 equipos={tarG.equipos} jugadores={tarG.alertas} fichas={fichas} ambito={`${nombre} · toda la categoría`} limiteJL={20} />
        )}

        {estG && (
          <section>
            <div className="s-head"><div className="s-title">Estadísticas</div><div className="s-sub">acumulado hasta J{jornadaNum} · toda la categoría</div></div>
            {estG.cifras.disputados > 0 && (
              <div className="statbox">
                <div className="cap" style={{ marginBottom: 9 }}>Reparto de resultados</div>
                <div className="reparto">
                  {estG.cifras.vLocalPct > 0 && <span style={{ flex: estG.cifras.vLocalPct, background: 'var(--e3)', color: '#08111f' }}>{estG.cifras.vLocalPct}%</span>}
                  {estG.cifras.empPct > 0 && <span style={{ flex: estG.cifras.empPct, background: 'var(--e1)', color: '#0a1628' }}>{estG.cifras.empPct}%</span>}
                  {estG.cifras.vVisitPct > 0 && <span style={{ flex: estG.cifras.vVisitPct, background: 'var(--e0)', color: '#0a1628' }}>{estG.cifras.vVisitPct}%</span>}
                </div>
                <div className="reparto-lbl"><span>Gana local</span><span style={{ textAlign: 'center' }}>Empate</span><span style={{ textAlign: 'right' }}>Gana visitante</span></div>
              </div>
            )}
            {estG.teamGoals.length > 0 && (() => {
              const maxG = Math.max(1, ...estG!.teamGoals.flatMap((r) => [r.gf || 0, r.gc || 0]))
              return (
                <div className="statbox">
                  <div className="cap" style={{ marginBottom: 9 }}>Goles por equipo · ordenado por goles marcados</div>
                  <EspejoHead />
                  {estG!.teamGoals.map((r) => (
                    <FilaEspejo key={r.codequipo} center={<EscudoBox escudo={r.escudo} nombre={r.nombre_equipo} size={22} radius={5} />} gc={r.gc || 0} gf={r.gf || 0} maxBar={maxG} />
                  ))}
                </div>
              )
            })()}
            {estG.tramos.some((t) => t.gf > 0) && (() => {
              const maxT = Math.max(1, ...estG!.tramos.map((t) => t.gf))
              return (
                <div className="statbox">
                  <div className="cap" style={{ marginBottom: 9 }}>Goles por tramo del partido · toda la categoría</div>
                  {estG!.tramos.map((t) => (
                    <FilaEspejo key={t.tramo} center={`${t.tramo}${t.tramo !== '90+' ? "'" : ''}`} gc={0} gf={t.gf} maxBar={maxT} soloGf />
                  ))}
                </div>
              )
            })()}
            <div className="leyenda">Goles por equipo a la misma escala: <b style={{ color: 'var(--e0)' }}>encajados</b> a la izquierda, <b style={{ color: 'var(--e3)' }}>marcados</b> a la derecha. Cada equipo pertenece a su grupo; no se comparan posiciones entre grupos.</div>
          </section>
        )}

        {tabEf !== 'clasificacion' && !gRank && !xiG && !tarG && !estG && (
          <section>
            <div className="s-head"><div className="s-title">{tabsA.find((t) => t[0] === tabEf)?.[1]}</div></div>
            <p className="vacio">Vista global de esta pestaña: próximamente. Disponible por grupo.</p>
          </section>
        )}
      </div></div>
    </div>
  )
}
