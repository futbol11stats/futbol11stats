import './ficha.css'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import Sello from '@/components/Sello'
import LigaPastilla from '@/components/LigaPastilla'
import CopasLinea from '@/components/CopasLinea'
import EloSparkline from '@/components/ficha/EloSparkline'
import JsonLd from '@/components/JsonLd'
import CompartirBtn from '@/components/ficha/v2/CompartirBtn'
import NavSpy from '@/components/ficha/v2/NavSpy'
import CompChips from '@/components/ficha/v2/CompChips'
import JornadasEquipo from '@/components/ficha/v2/JornadasEquipo'
import { TarjetaAmarilla, TarjetaDoble, TarjetaRoja } from '@/components/iconos'
import { graphLd, breadcrumbLd, sportsTeamLd } from '@/lib/jsonld'
import { SITE_URL } from '@/lib/seo'
import { escudoUrl } from '@/lib/supabase'
import {
  equipoSlug, tempLabel, LIVE_COD, getGrupoInfo, grupoHref, getEquipoActualInfo,
} from '@/lib/equipo'
import {
  getEquipoV2, getTemporadasEquipo, getSerieLiga, getResultadosGrupo, buildJornadasEquipo,
  escudosPorNombre, getMiniClasif, colorMedia, colorElo, CORTES_EQUIPO,
} from '@/lib/equipoV2'

const mil = (n: number | null | undefined) => (n == null ? '—' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
const med1 = (v: number | null) => (v == null ? '—' : v.toFixed(1).replace('.', ','))
const conSigno = (n: number) => (n > 0 ? `+${n}` : `${n}`)

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
    jornadas.length ? { id: 's-jornadas', label: 'Jornadas' } : null,
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
            {e.club_root && e.club_root !== e.nombre && <div className="first">{e.club_root}</div>}
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
                      <div className="mn">{r.nombre}</div>
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
        </div>

        <div className="main">
          {/* JORNADAS */}
          <section id="s-jornadas">
            <div className="s-head"><div className="s-title">Puntos por jornada</div><div className="s-sub">{echoTxt}</div></div>
            {jornadas.length > 0
              ? <JornadasEquipo comps={[{ label: nombreComp || 'Liga', jornadas }]} cortes={CORTES_EQUIPO.fanJornada} />
              : <p style={{ padding: '0 var(--pad)', color: 'var(--ink-3)', fontSize: 'var(--t-sm)' }}>Sin partidos en esta temporada.</p>}
          </section>
        </div>
      </div>
    </div>
  )
}
