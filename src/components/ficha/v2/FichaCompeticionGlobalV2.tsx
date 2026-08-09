import './ficha.css'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Sello from '@/components/Sello'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreEquipo from '@/components/NombreEquipo'
import { FlechaEntra, Escudo, Calendario, Balon } from '@/components/iconos'
import { nombreOficial, denominacion, familiaSello } from '@/lib/sellos'
import { ensureMadrid } from '@/lib/seo'
import { LIVE_COD } from '@/lib/equipo'
import { colorElo } from '@/lib/equipoV2'
import { fichasInfo } from '@/lib/jugador'
import RankingComp, { type RankItem } from '@/components/ficha/v2/RankingComp'
import {
  TEMPORADA_MAP, COD_TO_LABEL, TEMPORADAS_ORD, getGlobalGruposV2, getGlobalClasifV2, kpisDeClasif,
  zonaFamilia, ZONA_FAM_COL, ZONA_FAM_LABEL, colorMediaJug,
  getGlobalTopTemporadaV2, getGlobalMvpV2, getGlobalEquiposFormaV2,
} from '@/lib/competicionV2'

const fmt2 = (v: number | null | undefined) => (v == null ? '—' : Number(v).toFixed(2).replace('.', ','))
// Pestañas de Global: se ocultan las de jornada atadas a partidos de un grupo (Resultados, Goleadores y
// Tarjetas de jornada) — no tienen equivalente global. El resto AGREGA los grupos.
const G_TABS_J: [string, string][] = [['clasificacion', 'Clasificación'], ['top5-jugadores-jornada', 'Top 5 Jugadores'], ['top5-equipos-jornada', 'Top 5 Equipos'], ['once-optimo-jornada', 'XI Óptimo']]
const G_TABS_T: [string, string][] = [['top10-goleadores-temporada', 'Goleadores'], ['top10-porteros-temporada', 'Porteros'], ['top10-tarjetas-temporada', 'Tarjetas'], ['top10-fantasy-temporada', 'Fantasy'], ['top10-elo-jugadores-temporada', 'ELO'], ['once-optimo-temporada', 'XI Óptimo'], ['estadisticas', 'Estadísticas']]
const G_TEMP = new Set(G_TABS_T.map((t) => t[0]))

const mil = (n: number | null | undefined) => (n == null ? '—' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
const med1 = (v: number | null) => (v == null ? '—' : v.toFixed(1).replace('.', ','))

// La clasificación GLOBAL es la única pestaña especial; el resto se atienden desde cada grupo. En este
// incremento la vista global implementa la CLASIFICACIÓN por zonas (la que más cuidado pedía Fernando).
export default async function FichaCompeticionGlobalV2({ categoria, slugComp, temporada, jornada, tab }: {
  categoria: string; slugComp: string; temporada: string; jornada: string; tab: string
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

  const nombre = nombreOficial(grupos[0].nombre_comp) ?? ensureMadrid(denominacion(grupos[0].nombre_comp))
  const enJuego = String(codtemporada) === String(LIVE_COD)
  const base = `/madrid/${categoria}/${slugComp}`

  const modo: 'jornada' | 'temporada' = G_TEMP.has(tab) ? 'temporada' : 'jornada'
  const tabsA = modo === 'temporada' ? G_TABS_T : G_TABS_J
  const tabEf = tabsA.some((t) => t[0] === tab) ? tab : tabsA[0][0]

  // Rankings AGREGADOS (fusión de grupos por valor individual; NO se suman puntos de equipo).
  let gRank: { title: string; sub: string; items: RankItem[]; barColor?: string } | null = null
  let fichas = new Map<string, any>()
  const subCat = 'toda la categoría'
  if (tabEf === 'top5-jugadores-jornada') {
    const mvp = await getGlobalMvpV2(codgrupos, codtemporada, jornadaNum)
    fichas = await fichasInfo(mvp.map((j) => j.codjugador))
    gRank = { title: '5 mejores jugadores', sub: `jornada ${jornadaNum} · ${subCat}`, items: mvp.map((j) => ({ rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo, valor: Math.round(j.pts_fantasy ?? 0), valorColor: 'var(--e3)', extra: <span><b className="num">{j.goles ?? 0}</b> {(j.goles ?? 0) === 1 ? 'gol' : 'goles'}</span> })) }
  } else if (tabEf === 'top5-equipos-jornada') {
    const ef = await getGlobalEquiposFormaV2(codgrupos, codtemporada, jornadaNum)
    gRank = { title: '5 equipos más en forma', sub: `jornada ${jornadaNum} · ${subCat}`, items: ef.map((e) => ({ rank: e.rank, codequipo: e.codequipo, nombre: e.nombre_equipo, escudo: e.escudo, nombreEquipo: e.nombre_equipo, valor: Math.round(e.pts_fantasy ?? 0), valorColor: 'var(--e3)' })) }
  } else if (tabEf === 'top10-goleadores-temporada' || tabEf === 'top10-porteros-temporada' || tabEf === 'top10-elo-jugadores-temporada' || tabEf === 'top10-fantasy-temporada') {
    const t = await getGlobalTopTemporadaV2(codgrupos, codtemporada, jornadaNum)
    fichas = await fichasInfo([...t.goleadores, ...t.porteros, ...t.elo, ...t.fantasy].map((j) => j.codjugador))
    const sub = `acumulado hasta J${jornadaNum} · ${subCat}`
    const base3 = (j: any) => ({ rank: j.rank, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo })
    if (tabEf === 'top10-goleadores-temporada') { const max = Math.max(1, ...t.goleadores.map((j) => j.goles ?? 0)); gRank = { title: 'Goleadores', sub, barColor: 'var(--e4)', items: t.goleadores.map((j) => ({ ...base3(j), valor: j.goles, valorColor: 'var(--e4)', barPct: ((j.goles ?? 0) / max) * 100, extra: <span><b className="num">{j.pj}</b> PJ · <b className="num">{fmt2(j.goles_pj)}</b> g/PJ</span> })) } }
    else if (tabEf === 'top10-porteros-temporada') { const max = Math.max(1, ...t.porteros.map((j) => j.goles ?? 0)); gRank = { title: 'Porterías a cero', sub, barColor: 'var(--amber)', items: t.porteros.map((j) => ({ ...base3(j), valor: j.goles, valorColor: 'var(--amber)', barPct: ((j.goles ?? 0) / max) * 100, extra: <span><b className="num">{j.pj}</b> PJ · <b className="num">{j.goles_enc}</b> enc.</span> })) } }
    else if (tabEf === 'top10-fantasy-temporada') { const max = Math.max(1, ...t.fantasy.map((j) => Math.round(j.pts_fantasy ?? 0))); gRank = { title: 'Ranking fantasy', sub, barColor: 'var(--e3)', items: t.fantasy.map((j) => ({ ...base3(j), valor: Math.round(j.pts_fantasy ?? 0), valorColor: 'var(--e3)', barPct: (Math.round(j.pts_fantasy ?? 0) / max) * 100, extra: <><span className="mediabadge" style={{ color: colorMediaJug(j.media_fantasy) || 'var(--ink-2)', borderColor: colorMediaJug(j.media_fantasy) || 'var(--line)' }}>⌀ {med1(j.media_fantasy)}</span><span><b className="num">{j.pj}</b> PJ</span></> })) } }
    else { gRank = { title: 'ELO jugadores', sub: `tras J${jornadaNum} · ${subCat}`, items: t.elo.map((j) => ({ ...base3(j), valor: j.elo != null ? mil(j.elo) : '—', valorColor: colorElo(j.elo) || 'var(--e1)', extra: <span>máx <b className="num">{j.elo_max != null ? mil(j.elo_max) : '—'}</b> · mín <b className="num">{j.elo_min != null ? mil(j.elo_min) : '—'}</b></span> })) } }
  }

  // Filas por grupo (en el orden de grupos), con líder (pos 1) y filas con implicaciones (zona != '').
  const porGrupo = grupos.map((g) => {
    const rows = (filas as any[]).filter((r) => String(r.codgrupo) === String(g.codgrupo)).sort((a, b) => a.pos - b.pos)
    return { grupo: g, lider: rows.find((r) => r.pos === 1) || rows[0], zonas: rows.filter((r) => zonaFamilia(r.zona)) }
  })

  return (
    <div className="fjv2 fcv2">
      <div className="hero">
        <div className="hero-top">
          <span className="comp-sello"><Sello nombreComp={grupos[0].nombre_comp} src={familiaSello(slugComp, grupos[0].nombre_comp)} size={56} /></span>
          <div className="hero-name">
            <div className="over">RFFM · MADRID</div>
            <div className="comp">{nombre} · Global</div>
          </div>
        </div>
        <div className="hero-pills">
          {enJuego ? <span className="pill live">EN JUEGO · J{jornadaNum} DE {totalJornadas}</span> : <span className="pill n">Finalizada</span>}
          <span className="pill n">{grupos.length} grupos</span>
          <span className="pill n">Temporada {temporada}</span>
        </div>
      </div>

      <div className="kpis kpis-comp">
        <div className="kpi"><div className="kpi-i"><Escudo size={14} /></div><div className="v num">{kpis.equipos || '—'}</div><div className="k">Equipos</div></div>
        <div className="kpi"><div className="kpi-i"><Calendario size={14} /></div><div className="v num">{mil(kpis.partidos)}</div><div className="k">Partidos</div></div>
        <div className="kpi"><div className="kpi-i"><Balon size={14} /></div><div className="v num">{mil(kpis.goles)}</div><div className="k">Goles</div></div>
        <div className="kpi"><div className="kpi-i"><Balon size={14} /></div><div className="v num">{med1(kpis.golesPj)}</div><div className="k">Goles/PJ</div></div>
        <div className="kpi"><div className="kpi-i"><Escudo size={14} /></div><div className="v num" style={{ color: colorElo(kpis.eloMedio) }}>{mil(kpis.eloMedio)}</div><div className="k">ELO medio</div></div>
      </div>

      <div className="scope">
        <div className="scope-lbl">Temporada</div>
        <div className="track"><div className="rail">
          {TEMPORADAS_ORD.map((cod) => (
            <Link key={cod} href={`${'/madrid/' + categoria + '/' + slugComp}/global/${COD_TO_LABEL[cod]}/jornada-${jornadaNum}/${tab}/v2`} className={codtemporada === cod ? 'on' : ''}>{COD_TO_LABEL[cod]}</Link>
          ))}
        </div></div>
        <div className="scope-lbl" style={{ paddingTop: 11 }}>Grupo</div>
        <div className="track"><div className="rail">
          <span className="glob on">Global</span>
          {grupos.map((g) => (
            <Link key={g.codgrupo} href={`${base}/${g.slug_grupo}/${temporada}/jornada-${jornadaNum}/clasificacion/v2`}>{g.nombre_grupo}</Link>
          ))}
        </div></div>
        <div className="scope-note"><b>Global</b> muestra los 6 grupos y, de cada uno, solo las posiciones con implicaciones. Los puntos <b>no se comparan entre grupos</b>.</div>
      </div>

      <div className="tabs-comp">
        <div className="zonasw"><div className="zsw">
          <Link href={`${base}/global/${temporada}/jornada-${jornadaNum}/${G_TABS_J[0][0]}/v2`} className={modo === 'jornada' ? 'on' : ''}>Jornada</Link>
          <Link href={`${base}/global/${temporada}/jornada-${jornadaNum}/${G_TABS_T[0][0]}/v2`} className={modo === 'temporada' ? 'on' : ''}>Temporada</Link>
        </div></div>
        <div className="track"><div className="rail tabrail">
          {tabsA.map(([id, label]) => <Link key={id} href={`${base}/global/${temporada}/jornada-${jornadaNum}/${id}/v2`} className={id === tabEf ? 'on' : ''}>{label}</Link>)}
        </div></div>
      </div>

      <div className="jbar">
        <div className="jlbl">{modo === 'temporada' ? 'Acumulado hasta' : 'Jornada'}</div>
        <div className="track"><div className="rail jrail">
          {Array.from({ length: totalJornadas }, (_, i) => i + 1).map((j) => (
            <Link key={j} href={`${base}/global/${temporada}/jornada-${j}/${tabEf}/v2`} className={j === jornadaNum ? 'on' : ''}>J{j}</Link>
          ))}
        </div></div>
      </div>

      <div className="layout"><div className="main">
        {tabEf === 'clasificacion' && (
        <section id="s-clasif">
          <div className="s-head"><div className="s-title">Clasificación global</div><div className="s-sub">{nombre} · {grupos.length} grupos · tras J{jornadaNum}</div></div>

          <div className="cap" style={{ padding: '0 var(--pad) 8px' }}>Líderes de grupo</div>
          <div className="track"><div className="lideres-g">
            {porGrupo.map(({ grupo, lider }) => lider && (
              <div className="lg-card" key={grupo.codgrupo}>
                <div className="lg-g">{grupo.nombre_grupo}</div>
                <div className="lg-cr"><EscudoBox escudo={lider.escudo} nombre={lider.nombre_equipo} size={30} radius={7} /></div>
                <div className="lg-nm">{lider.nombre_equipo}</div>
              </div>
            ))}
          </div></div>

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
                <Link className="grp-h" href={`${base}/${grupo.slug_grupo}/${temporada}/jornada-${jornadaNum}/clasificacion/v2`}>
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
              ? <RankingComp items={gRank.items} fichas={fichas} barColor={gRank.barColor} />
              : <p className="vacio">Sin datos agregados en esta {modo === 'temporada' ? 'temporada' : 'jornada'}.</p>}
          </section>
        )}

        {tabEf !== 'clasificacion' && !gRank && (
          <section>
            <div className="s-head"><div className="s-title">{tabsA.find((t) => t[0] === tabEf)?.[1]}</div></div>
            <p className="vacio">Vista global de esta pestaña: próximamente. Disponible por grupo.</p>
          </section>
        )}
      </div></div>
    </div>
  )
}
