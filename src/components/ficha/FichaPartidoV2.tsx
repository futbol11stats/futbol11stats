import './v2/ficha.css'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { CalendarPlus, MapPin } from 'lucide-react'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreEquipo from '@/components/NombreEquipo'
import Pastilla from '@/components/Pastilla'
import SuperficieCampo from '@/components/SuperficieCampo'
import CalendarLink from '@/components/calendario/CalendarLink'
import { Balon, TarjetaAmarilla, TarjetaDoble, TarjetaRoja, FlechaEntra, FlechaSale } from '@/components/iconos'
import { formatNombre } from '@/lib/supabase'
import { googleRenderUrl } from '@/lib/ics'
import { SITE_URL } from '@/lib/seo'
import { partidoSlug } from '@/lib/partidoSlug'
import type { PartidoFicha, PartidoJugador, PartidoMini, PartidoLado } from '@/lib/partido'

// Helpers portados del hero de plantilla (equipo): avatar de iniciales coloreado por demarcación.
const iniciales = (nombre: string) => formatNombre(nombre).split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
const AVA_POS: Record<string, string> = { POR: '249,115,22', DEF: '59,130,246', MED: '34,160,80', DEL: '239,68,68' }
const avaStyle = (pos: string | null) => {
  const c = AVA_POS[pos || ''] || '100,116,139'
  return { background: `linear-gradient(to bottom right, rgba(${c},.45), var(--pitch-800))`, border: `1.5px solid rgba(${c},.55)`, color: '#fff' }
}
// Fondo de la pastilla de PUNTOS fantasy (baza propia; verde para lo bueno, el ámbar está reservado).
const ptsStyle = (p: number | null) => p == null ? { background: 'rgba(255,255,255,.05)', color: 'var(--ink-4)' }
  : p >= 8 ? { background: 'var(--e3)', color: '#08111f' }
    : p >= 4 ? { background: 'var(--e2)', color: '#08111f' }
      : p < 0 ? { background: 'var(--card-r)', color: '#fff' }
        : { background: 'rgba(255,255,255,.09)', color: 'var(--ink-2)' }

// Eventos del jugador CON SU MINUTO (web_partido_eventos); si no hubiera minuto, cae a los conteos.
function Eventos({ j }: { j: PartidoJugador }) {
  const out: ReactNode[] = []
  if (j.golesMin.length) j.golesMin.forEach((m, i) => out.push(<span key={`g${i}`} className="ev ev-gol"><Balon size={11} />{m}′</span>))
  else if (j.goles > 0) out.push(<span key="gc" className="ev ev-gol"><Balon size={11} />{j.goles > 1 ? `×${j.goles}` : ''}</span>)
  if (j.dobleMin != null || j.dobles > 0) out.push(<span key="td" className="ev ev-td"><TarjetaDoble size={11} />{j.dobleMin != null ? `${j.dobleMin}′` : ''}</span>)
  else if (j.amarillaMin != null || j.amarillas > 0) out.push(<span key="ta" className="ev ev-ta"><TarjetaAmarilla size={11} />{j.amarillaMin != null ? `${j.amarillaMin}′` : ''}</span>)
  if (j.rojaMin != null || j.rojas > 0) out.push(<span key="tr" className="ev ev-tr"><TarjetaRoja size={11} />{j.rojaMin != null ? `${j.rojaMin}′` : ''}</span>)
  if (j.entra != null) out.push(<span key="in" className="ev ev-in"><FlechaEntra size={11} />{j.entra}′</span>)
  if (j.sale != null) out.push(<span key="out" className="ev ev-out"><FlechaSale size={11} />{j.sale}′</span>)
  return <>{out}</>
}

// Fila de jugador con el marcado REAL de la plantilla de equipo (.pl): avatar, nombre (Barlow), .pl-me (Pastilla +
// eventos), y .pl-val con los puntos fantasy.
function Fila({ j }: { j: PartidoJugador }) {
  const nombre = formatNombre(j.nombre) || j.nombre
  return (
    <div className={`pl${j.jugado ? '' : ' pl-nojugo'}`}>
      <div className="pl-av" style={avaStyle(j.pos)}>{j.dorsal || iniciales(j.nombre)}</div>
      <div className="pl-mid">
        <div className="pl-nm">{j.href ? <Link href={j.href}>{nombre}</Link> : nombre}</div>
        <div className="pl-me">{j.pos && <Pastilla pos={j.pos} size="mini" />}<Eventos j={j} /></div>
      </div>
      <div className="pl-val" style={ptsStyle(j.puntos)}>{j.puntos != null ? j.puntos : '—'}</div>
    </div>
  )
}

function FormaDots({ nombre, minis }: { nombre: string; minis: PartidoMini[] }) {
  if (!minis.length) return null
  const dots = minis.slice(0, 5).map((m) => {
    const home = m.local === nombre
    const gf = home ? (m.golesLocal ?? 0) : (m.golesVisitante ?? 0)
    const gc = home ? (m.golesVisitante ?? 0) : (m.golesLocal ?? 0)
    return gf > gc ? 'var(--e3)' : gf < gc ? 'var(--e0)' : 'var(--ink-3)'
  }).reverse()
  return <span className="cracha" title="Últimos resultados">{dots.map((c, i) => <i key={i} style={{ background: c }} />)}</span>
}

function Alineacion({ lado, forma }: { lado: PartidoLado; forma: PartidoMini[] }) {
  return (
    <div className="al-col">
      <div className="al-team">
        <EscudoBox escudo={lado.escudo} nombre={lado.nombre} size={24} radius={5} />
        <span className="tn"><NombreEquipo codequipo={lado.codequipo} nombre={lado.nombre} /></span>
        <FormaDots nombre={lado.nombre} minis={forma} />
      </div>
      {lado.titulares.map((j) => <Fila key={j.codjugador} j={j} />)}
      {lado.suplentes.length > 0 && <div className="al-sub">Suplentes</div>}
      {lado.suplentes.map((j) => <Fila key={j.codjugador} j={j} />)}
    </div>
  )
}

// Fila de resultado reutilizando el componente del sitio (.rmatch), enlazada a la ficha del partido.
function MiniPartido({ m }: { m: PartidoMini }) {
  const jugado = m.golesLocal != null && m.golesVisitante != null
  const gL = m.golesLocal as number, gV = m.golesVisitante as number
  return (
    <Link className="rmatch-wrap mini-link" href={`/madrid/partido/${partidoSlug(m.codacta, m.local, m.visitante)}`}>
      <div className="rmatch">
        <div className="rside"><EscudoBox escudo={m.escudoLocal} nombre={m.local} size={22} radius={5} /><span className={`rnm${jugado && gL > gV ? ' w' : ''}`}>{m.local}</span></div>
        <div className="rsc">{jugado ? <><span style={{ color: gL > gV ? 'var(--e3)' : gL < gV ? 'var(--e0)' : 'var(--ink-2)' }}>{gL}</span><span className="rsc-sep">-</span><span style={{ color: gV > gL ? 'var(--e3)' : gV < gL ? 'var(--e0)' : 'var(--ink-2)' }}>{gV}</span></> : 'vs'}</div>
        <div className="rside v"><EscudoBox escudo={m.escudoVisitante} nombre={m.visitante} size={22} radius={5} /><span className={`rnm${jugado && gV > gL ? ' w' : ''}`}>{m.visitante}</span></div>
      </div>
      {m.fecha && <div className="rmeta">{m.fecha}</div>}
    </Link>
  )
}

export default function FichaPartidoV2({ p }: { p: PartidoFicha }) {
  const puedeIcs = !p.jugado && !!p.fecha && /^\d{2}\/\d{2}\/\d{4}$/.test(p.fecha) && !!p.hora && /^\d{1,2}:\d{2}$/.test(p.hora) && p.hora !== '00:00'
  const icsUrl = `/api/ics/${p.codacta}`
  const googleUrl = puedeIcs ? googleRenderUrl({ title: `${p.local.nombre} vs ${p.visitante.nombre}`, fecha: p.fecha as string, hora: p.hora as string, campo: p.campoNombre, details: `${p.nombreComp} · Jornada ${p.jornada}\n${SITE_URL}/madrid/partido/${partidoSlug(p.codacta, p.local.nombre, p.visitante.nombre)}` }) : null
  const gL = p.golesLocal ?? 0, gV = p.golesVisitante ?? 0
  const colL = p.jugado ? (gL > gV ? 'var(--e3)' : gL < gV ? 'var(--e0)' : 'var(--ink)') : 'var(--ink)'
  const colV = p.jugado ? (gV > gL ? 'var(--e3)' : gV < gL ? 'var(--e0)' : 'var(--ink)') : 'var(--ink)'
  const mvpLado = p.mvp?.lado === 'local' ? p.local : p.visitante

  return (
    <div className="fjv2 fpv2">
      {/* HERO / MARCADOR */}
      <div className="mhero">
        <div className="over"><Link href={p.compHref}>{p.nombreComp}</Link> · Jornada {p.jornada}</div>
        <div className="mscore">
          <div className="mteam">
            <EscudoBox escudo={p.local.escudo} nombre={p.local.nombre} size={54} radius={12} />
            <span className="tn"><NombreEquipo codequipo={p.local.codequipo} nombre={p.local.nombre} /></span>
            <FormaDots nombre={p.local.nombre} minis={p.formaLocal} />
          </div>
          <div className="mmid">
            {p.jugado
              ? <span className="mres"><span style={{ color: colL }}>{gL}</span><span className="sep">-</span><span style={{ color: colV }}>{gV}</span></span>
              : <span className="mvs">vs</span>}
            <span className={`pill ${p.jugado ? 'n' : 'live'}`}>{p.jugado ? 'FINAL' : (p.hora || 'Por jugar')}</span>
          </div>
          <div className="mteam">
            <EscudoBox escudo={p.visitante.escudo} nombre={p.visitante.nombre} size={54} radius={12} />
            <span className="tn"><NombreEquipo codequipo={p.visitante.codequipo} nombre={p.visitante.nombre} /></span>
            <FormaDots nombre={p.visitante.nombre} minis={p.formaVisitante} />
          </div>
        </div>
        <div className="mmeta">
          {(p.fecha || p.hora) && <span>{[p.fecha, p.hora].filter(Boolean).join(' · ')}</span>}
          {p.campoNombre && (
            p.campoHref
              ? <a className="hero-campo" href={p.campoHref} {...(p.campoHref.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}><MapPin size={12} /><span>{p.campoNombre}</span>{p.campoSuperficie && <span className="campo-sup">· <SuperficieCampo superficie={p.campoSuperficie} /></span>}</a>
              : <span className="hero-campo"><MapPin size={12} /><span>{p.campoNombre}</span></span>
          )}
        </div>
        {!p.jugado && puedeIcs && (
          <div className="cal-wrap">
            <CalendarLink appleHref={icsUrl} otherHref={googleUrl || icsUrl} className="cal-btn"><CalendarPlus size={15} /> Añade este partido a tu calendario</CalendarLink>
          </div>
        )}
      </div>

      {/* MVP fantasy — mismo tratamiento que "Top de la plantilla" (fila .pl + rótulo bien visible) */}
      {p.jugado && p.mvp && (
        <section>
          <div className="s-head"><h2 className="s-title">MVP del partido</h2><div className="s-sub">por puntos fantasy</div></div>
          <div className="pl">
            <div className="pl-av" style={avaStyle(p.mvp.pos)}>{iniciales(p.mvp.nombre)}</div>
            <div className="pl-mid">
              <div className="pl-nm">{p.mvp.href ? <Link href={p.mvp.href}>{formatNombre(p.mvp.nombre)}</Link> : formatNombre(p.mvp.nombre)}</div>
              <div className="pl-me">{p.mvp.pos && <Pastilla pos={p.mvp.pos} size="mini" />}<span className="mvp-eq">{mvpLado.nombre}</span></div>
            </div>
            <div className="pl-val" style={{ background: 'var(--e2)', color: '#08111f' }}>{p.mvp.puntos}</div>
          </div>
        </section>
      )}

      {/* ALINEACIONES — dos columnas en desktop (.desk-2col), apiladas en móvil. Filas .pl con puntos fantasy. */}
      {p.jugado && (p.local.titulares.length > 0 || p.visitante.titulares.length > 0) && (
        <section>
          <div className="s-head"><h2 className="s-title">Alineaciones</h2><div className="s-sub">puntos fantasy →</div></div>
          <div className="desk-2col al-2col">
            <Alineacion lado={p.local} forma={p.formaLocal} />
            <Alineacion lado={p.visitante} forma={p.formaVisitante} />
          </div>
          {(p.entrenadorLocal || p.entrenadorVisitante) && (
            <div className="desk-2col al-2col al-tec">
              <div>{p.entrenadorLocal && <><span className="cap">Entrenador</span> {formatNombre(p.entrenadorLocal)}</>}</div>
              <div>{p.entrenadorVisitante && <><span className="cap">Entrenador</span> {formatNombre(p.entrenadorVisitante)}</>}</div>
            </div>
          )}
        </section>
      )}

      {/* CARA A CARA */}
      {p.h2h.length > 0 && (
        <section>
          <div className="s-head"><h2 className="s-title">Cara a cara</h2></div>
          {p.h2h.map((m) => <MiniPartido key={m.codacta} m={m} />)}
        </section>
      )}

      {/* ÚLTIMOS PARTIDOS de cada equipo */}
      {(p.formaLocal.length > 0 || p.formaVisitante.length > 0) && (
        <section>
          <div className="s-head"><h2 className="s-title">Últimos partidos</h2></div>
          <div className="desk-2col al-2col">
            <div>{p.formaLocal.length > 0 && <><div className="al-sub" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>{p.local.nombre}</div>{p.formaLocal.map((m) => <MiniPartido key={m.codacta} m={m} />)}</>}</div>
            <div>{p.formaVisitante.length > 0 && <><div className="al-sub" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>{p.visitante.nombre}</div>{p.formaVisitante.map((m) => <MiniPartido key={m.codacta} m={m} />)}</>}</div>
          </div>
        </section>
      )}

      {/* ÁRBITROS — SOLO nombre + rol (sin enlace, sin ranking; decisión de privacidad). Al pie, discreto. */}
      {p.arbitros.length > 0 && (
        <section>
          <div className="s-head"><h2 className="s-title">Arbitraje</h2></div>
          <div className="arb">
            {p.arbitros.map((a, i) => <div key={i} className="arb-row"><span className="cap">{a.rol}</span> <span>{formatNombre(a.nombre)}</span></div>)}
          </div>
        </section>
      )}
    </div>
  )
}
