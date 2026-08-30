import './v2/ficha.css'
import Link from 'next/link'
import { CalendarPlus, MapPin } from 'lucide-react'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreEquipo from '@/components/NombreEquipo'
import Pastilla from '@/components/Pastilla'
import SuperficieCampo from '@/components/SuperficieCampo'
import CalendarLink from '@/components/calendario/CalendarLink'
import { Balon, TarjetaAmarilla, TarjetaDoble, TarjetaRoja, Reloj } from '@/components/iconos'
import { formatNombre } from '@/lib/supabase'
import { googleRenderUrl } from '@/lib/ics'
import { SITE_URL } from '@/lib/seo'
import { partidoSlug } from '@/lib/partidoSlug'
import type { PartidoFicha, PartidoJugador, PartidoMini, PartidoLado } from '@/lib/partido'

// Puntos fantasy del partido (baza propia): VERDE de la escala del sitio para lo bueno; el ámbar está reservado a
// playoff/copa/disciplina, así que NO se usa aquí.
const ptsCls = (p: number | null) => p == null ? 'mid' : p >= 8 ? 'hi' : p >= 4 ? 'mid' : p < 0 ? 'neg' : 'lo'

// Eventos del jugador en el partido (conteos; el minuto llegará con el dato del acta del pipeline).
function Eventos({ j }: { j: PartidoJugador }) {
  return (
    <span className="al-ev">
      {j.goles > 0 && <span className="al-gol" title={`${j.goles} gol${j.goles > 1 ? 'es' : ''}`}>{j.goles > 1 && <b>{j.goles}</b>}<Balon size={12} /></span>}
      {j.dobles > 0
        ? <span style={{ color: 'var(--card-y)', display: 'inline-flex' }} title="Doble amarilla"><TarjetaDoble size={12} /></span>
        : j.amarillas > 0 && <span style={{ color: 'var(--card-y)', display: 'inline-flex' }} title={`${j.amarillas} amarilla${j.amarillas > 1 ? 's' : ''}`}><TarjetaAmarilla size={12} /></span>}
      {j.rojas > 0 && <span style={{ color: 'var(--card-r)', display: 'inline-flex' }} title="Roja"><TarjetaRoja size={12} /></span>}
    </span>
  )
}

function Fila({ j }: { j: PartidoJugador }) {
  const nombre = formatNombre(j.nombre) || j.nombre
  return (
    <div className={`al-row${j.jugado ? '' : ' out'}`}>
      <span className="al-dorsal">{j.dorsal || '·'}</span>
      <Pastilla pos={j.pos} estimada={undefined} size="mini" />
      <span className="al-nm">{j.href ? <Link href={j.href}>{nombre}</Link> : nombre}</span>
      <Eventos j={j} />
      {j.jugado && <span className="al-min">{j.minutos}′</span>}
      <span className={`al-pts ${ptsCls(j.puntos)}`} title="Puntos fantasy en este partido">{j.puntos != null ? j.puntos : '—'}</span>
    </div>
  )
}

function Alineacion({ lado }: { lado: PartidoLado }) {
  return (
    <div>
      <div className="al-team">
        <EscudoBox escudo={lado.escudo} nombre={lado.nombre} size={24} radius={5} />
        <span className="tn"><NombreEquipo codequipo={lado.codequipo} nombre={lado.nombre} /></span>
        <span className="cap al-ptshead"><Reloj size={11} /> Pts F.</span>
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

  return (
    <div className="fjv2 fpv2">
      {/* HERO / MARCADOR */}
      <div className="mhero">
        <div className="over"><Link href={p.compHref}>{p.nombreComp}</Link> · Jornada {p.jornada}</div>
        <div className="mscore">
          <div className="mteam">
            <EscudoBox escudo={p.local.escudo} nombre={p.local.nombre} size={54} radius={12} />
            <span className="tn"><NombreEquipo codequipo={p.local.codequipo} nombre={p.local.nombre} /></span>
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

      {/* MVP fantasy — la baza (acento verde) */}
      {p.jugado && p.mvp && (
        <div className="mvp">
          <div>
            <div className="mvp-k">MVP del partido · fantasy</div>
            <div className="mvp-n">{p.mvp.href ? <Link href={p.mvp.href}>{formatNombre(p.mvp.nombre) || p.mvp.nombre}</Link> : (formatNombre(p.mvp.nombre) || p.mvp.nombre)} · {p.mvp.lado === 'local' ? p.local.nombre : p.visitante.nombre}</div>
          </div>
          <span className="mvp-p">{p.mvp.puntos}</span>
        </div>
      )}

      {/* ALINEACIONES con puntos fantasy por fila */}
      {p.jugado && (p.local.titulares.length > 0 || p.visitante.titulares.length > 0) && (
        <section>
          <div className="s-head"><span className="s-title">Alineaciones</span></div>
          <div className="al">
            <Alineacion lado={p.local} />
            <Alineacion lado={p.visitante} />
          </div>
          <p className="al-note">La cifra de la derecha son los <b>puntos fantasy</b> de cada jugador en este partido.</p>
        </section>
      )}

      {/* CARA A CARA */}
      {p.h2h.length > 0 && (
        <section>
          <div className="s-head"><span className="s-title">Cara a cara</span></div>
          {p.h2h.map((m) => <MiniPartido key={m.codacta} m={m} />)}
        </section>
      )}

      {/* ÚLTIMOS PARTIDOS de cada equipo */}
      {p.formaLocal.length > 0 && (
        <section>
          <div className="s-head"><span className="s-title">Últimos · {p.local.nombre}</span></div>
          {p.formaLocal.map((m) => <MiniPartido key={m.codacta} m={m} />)}
        </section>
      )}
      {p.formaVisitante.length > 0 && (
        <section>
          <div className="s-head"><span className="s-title">Últimos · {p.visitante.nombre}</span></div>
          {p.formaVisitante.map((m) => <MiniPartido key={m.codacta} m={m} />)}
        </section>
      )}
    </div>
  )
}
