import './ficha.css'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Sello from '@/components/Sello'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreEquipo from '@/components/NombreEquipo'
import { Escudo, Calendario, Balon } from '@/components/iconos'
import { nombreOficial, denominacion, familiaSello } from '@/lib/sellos'
import { ensureMadrid } from '@/lib/seo'
import { LIVE_COD } from '@/lib/equipo'
import { colorElo } from '@/lib/equipoV2'
import { ZONA_BG, ZONA_LEYENDA, ARRASTRE_TIPOS } from '@/components/tablas'
import { type Ronda } from '@/lib/competiciones'
import {
  TEMPORADA_MAP, COD_TO_LABEL, TEMPORADAS_ORD, getGrupoV2, getVariantesV2, getGruposHermanos,
  getClasifV2, kpisDeClasif, zonaColor, RACHA_COL, type ClasifCompRow,
} from '@/lib/competicionV2'

const mil = (n: number | null | undefined) => (n == null ? '—' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
const med1 = (v: number | null) => (v == null ? '—' : v.toFixed(1).replace('.', ','))

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

  // Datos del increment 1: clasificación (alimenta KPIs + panel). Resto de pestañas: placeholder.
  const clasif: ClasifCompRow[] = isCopa ? [] : await getClasifV2(grupo.codgrupo, codtemporada, jornadaNum)
  const kpis = kpisDeClasif(clasif)

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
                      <span className="cracha">Racha</span>
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
                          <span className="cracha">{(r.racha || '').split('').slice(-5).map((x, i) => <i key={i} style={{ background: RACHA_COL[x] || 'var(--line)' }} />)}</span>
                        </div>
                      )
                    })}
                  </div></div>
                  {leyendaZ.length > 0 && (
                    <div className="leyenda-z">
                      {leyendaZ.map((z) => <span key={z.tipo}><i style={ZONA_BG[z.tipo]} />{z.label}</span>)}
                    </div>
                  )}
                  {clasif.some((r) => r.forma) && (
                    <div className="leyenda" style={{ paddingTop: 10 }}>
                      <b>Forma:</b> {clasif.filter((r) => r.forma).slice(0, 3).map((r) => `${r.nombre_equipo} — ${r.forma}`).join(' · ')}
                    </div>
                  )}
                </>
              ) : <p className="vacio">Sin clasificación en esta jornada.</p>}
            </section>
          )}

          {tabEf !== 'clasificacion' && (
            <section>
              <div className="s-head"><div className="s-title">{tabsActivas.find((t) => t[0] === tabEf)?.[1]}</div></div>
              <p className="vacio">Próximamente en la ficha v2.</p>
            </section>
          )}
        </div>

        <div className="aside">
          <section style={{ borderBottom: 0 }}>
            <div className="s-head"><div className="s-title">La competición en cifras</div><div className="s-sub">tras J{jornadaNum}</div></div>
            <div style={{ padding: '0 var(--pad)' }}>
              <div className="cifra"><span className="ci"><Escudo size={13} /></span><span className="ck">Equipos</span><span className="cv num">{kpis.equipos || '—'}</span></div>
              <div className="cifra"><span className="ci"><Calendario size={13} /></span><span className="ck">Partidos disputados</span><span className="cv num">{mil(kpis.partidos)}</span></div>
              <div className="cifra"><span className="ci" style={{ color: 'var(--e4)' }}><Balon size={13} /></span><span className="ck">Goles marcados</span><span className="cv num">{mil(kpis.goles)}</span></div>
              <div className="cifra"><span className="ci" style={{ color: 'var(--e4)' }}><Balon size={13} /></span><span className="ck">Media de goles</span><span className="cv num">{med1(kpis.golesPj)}</span></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
