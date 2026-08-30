import Link from 'next/link'
import { MapPin, Trophy, CalendarPlus } from 'lucide-react'
import EscudoImg from '@/components/EscudoImg'
import SuperficieCampo from '@/components/SuperficieCampo'
import CalendarLink from '@/components/calendario/CalendarLink'
import { Balon, TarjetaAmarilla, TarjetaDoble, TarjetaRoja, Escudo } from '@/components/iconos'
import { escudoUrl, formatNombre } from '@/lib/supabase'
import { googleRenderUrl } from '@/lib/ics'
import { SITE_URL } from '@/lib/seo'
import { partidoSlug } from '@/lib/partidoSlug'
import type { PartidoFicha, PartidoJugador, PartidoMini, PartidoLado } from '@/lib/partido'

const POS_LBL: Record<string, string> = { POR: 'POR', DEF: 'DEF', MED: 'MED', DEL: 'DEL' }
const POS_COL: Record<string, string> = { POR: 'text-amber-300 bg-amber-500/15', DEF: 'text-grass-300 bg-grass-500/15', MED: 'text-sky-300 bg-sky-500/15', DEL: 'text-rose-300 bg-rose-500/15' }
// Color de los puntos fantasy del partido (baza propia): destacado si es una buena actuación.
const fantasyCol = (p: number | null) => p == null ? 'text-chalk-600' : p >= 8 ? 'text-grass-300' : p >= 4 ? 'text-chalk-200' : p < 0 ? 'text-rose-400' : 'text-chalk-500'

function Crest({ escudo, nombre, size = 22 }: { escudo: string | null; nombre: string; size?: number }) {
  return (
    <span className="inline-flex items-center justify-center bg-white rounded-sm flex-none p-0.5" style={{ width: size, height: size }}>
      {escudoUrl(escudo) ? <EscudoImg escudo={escudo} nombre={nombre} /> : null}
    </span>
  )
}

function Jugador({ j }: { j: PartidoJugador }) {
  const nombre = formatNombre(j.nombre) || j.nombre
  const inactivo = !j.jugado
  return (
    <li className={`flex items-center gap-2 py-1.5 ${inactivo ? 'opacity-55' : ''}`}>
      <span className="w-5 text-right text-xs text-chalk-600 tabular-nums flex-none">{j.dorsal || '·'}</span>
      {j.pos && <span className={`flex-none text-[9px] font-bold rounded px-1 py-px ${POS_COL[j.pos] || 'text-chalk-500 bg-pitch-700'}`}>{POS_LBL[j.pos] || j.pos}</span>}
      <span className="min-w-0 flex-1 truncate text-sm">
        {j.href ? <Link href={j.href} className="text-chalk-100 hover:text-white transition-colors">{nombre}</Link> : <span className="text-chalk-200">{nombre}</span>}
      </span>
      {/* Eventos del partido (conteos; el minuto llegará con el dato del acta del pipeline). */}
      <span className="flex-none inline-flex items-center gap-1 text-chalk-500">
        {j.goles > 0 && <span className="inline-flex items-center text-grass-300" title={`${j.goles} gol${j.goles > 1 ? 'es' : ''}`}>{j.goles > 1 && <span className="text-[10px] mr-0.5 tabular-nums">{j.goles}</span>}<Balon size={12} /></span>}
        {j.dobles > 0 ? <TarjetaDoble size={12} /> : j.amarillas > 0 && <span title={`${j.amarillas} amarilla${j.amarillas > 1 ? 's' : ''}`}><TarjetaAmarilla size={12} /></span>}
        {j.rojas > 0 && <TarjetaRoja size={12} />}
      </span>
      {j.jugado && <span className="w-8 text-right text-[11px] text-chalk-600 tabular-nums flex-none">{j.minutos}′</span>}
      {/* PUNTOS FANTASY — la baza: nadie más los muestra. */}
      <span className={`w-8 text-right text-sm font-bold tabular-nums flex-none ${fantasyCol(j.puntos)}`} title="Puntos fantasy en este partido">{j.puntos != null ? j.puntos : '—'}</span>
    </li>
  )
}

function Lado({ lado }: { lado: PartidoLado }) {
  return (
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-pitch-700">
        <Crest escudo={lado.escudo} nombre={lado.nombre} size={24} />
        <span className="font-display font-bold text-white text-sm uppercase truncate">{lado.nombre}</span>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-chalk-600 flex items-center gap-1"><Escudo size={11} /> PTS</span>
      </div>
      <ul className="px-3 py-1.5 divide-y divide-pitch-700/50">
        {lado.titulares.map((j) => <Jugador key={j.codjugador} j={j} />)}
      </ul>
      {lado.suplentes.length > 0 && (
        <>
          <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-chalk-600 border-t border-pitch-700">Suplentes</div>
          <ul className="px-3 pb-2 divide-y divide-pitch-700/50">
            {lado.suplentes.map((j) => <Jugador key={j.codjugador} j={j} />)}
          </ul>
        </>
      )}
    </div>
  )
}

function MiniPartido({ m }: { m: PartidoMini }) {
  const jugado = m.golesLocal != null && m.golesVisitante != null
  return (
    <Link href={`/madrid/partido/${partidoSlug(m.codacta, m.local, m.visitante)}`} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-pitch-800 border border-pitch-700 hover:border-grass-500/50 transition-colors text-xs">
      <span className="text-chalk-600 flex-none w-14 tabular-nums">{m.fecha || ''}</span>
      <span className="min-w-0 flex-1 flex items-center gap-1.5 justify-end"><span className="truncate text-chalk-300">{m.local}</span><Crest escudo={m.escudoLocal} nombre={m.local} size={16} /></span>
      <span className="flex-none font-bold text-white tabular-nums px-1">{jugado ? `${m.golesLocal}-${m.golesVisitante}` : 'vs'}</span>
      <span className="min-w-0 flex-1 flex items-center gap-1.5"><Crest escudo={m.escudoVisitante} nombre={m.visitante} size={16} /><span className="truncate text-chalk-300">{m.visitante}</span></span>
    </Link>
  )
}

export default function FichaPartidoV2({ p }: { p: PartidoFicha }) {
  const estado = p.jugado ? 'FINAL' : (p.hora || 'Por jugar')
  const puedeIcs = !p.jugado && !!p.fecha && /^\d{2}\/\d{2}\/\d{4}$/.test(p.fecha) && !!p.hora && /^\d{1,2}:\d{2}$/.test(p.hora) && p.hora !== '00:00'
  const icsUrl = `/api/ics/${p.codacta}`
  const googleUrl = puedeIcs ? googleRenderUrl({ title: `${p.local.nombre} vs ${p.visitante.nombre}`, fecha: p.fecha as string, hora: p.hora as string, campo: p.campoNombre, details: `${p.nombreComp} · Jornada ${p.jornada}\n${SITE_URL}/madrid/partido/${partidoSlug(p.codacta, p.local.nombre, p.visitante.nombre)}` }) : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* CABECERA / MARCADOR */}
      <div className="text-center text-xs text-chalk-600 mb-3">
        <Link href={p.compHref} className="hover:text-white transition-colors">{p.nombreComp}</Link> · Jornada {p.jornada}
      </div>
      <div className="bg-pitch-800 rounded-2xl border border-pitch-700 p-4 md:p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-2 text-center min-w-0">
            <Crest escudo={p.local.escudo} nombre={p.local.nombre} size={56} />
            <span className="font-display font-bold text-white text-sm md:text-base uppercase leading-tight">{p.local.nombre}</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-2">
            {p.jugado
              ? <span className="font-display font-extrabold text-white text-4xl md:text-5xl tabular-nums leading-none">{p.golesLocal}<span className="text-chalk-600 mx-1">-</span>{p.golesVisitante}</span>
              : <span className="font-display font-bold text-chalk-500 text-3xl">vs</span>}
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${p.jugado ? 'text-chalk-500' : 'text-grass-400'}`}>{estado}</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center min-w-0">
            <Crest escudo={p.visitante.escudo} nombre={p.visitante.nombre} size={56} />
            <span className="font-display font-bold text-white text-sm md:text-base uppercase leading-tight">{p.visitante.nombre}</span>
          </div>
        </div>
        {/* Meta: fecha·hora + campo (→ nuestra ficha de campo si la tiene) */}
        <div className="mt-4 pt-3 border-t border-pitch-700 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-chalk-500">
          {(p.fecha || p.hora) && <span>{[p.fecha, p.hora].filter(Boolean).join(' · ')}</span>}
          {p.campoNombre && (p.fecha || p.hora) && <span className="text-chalk-700">·</span>}
          {p.campoNombre && (
            p.campoHref
              ? <a href={p.campoHref} {...(p.campoHref.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })} className="inline-flex items-center gap-1 hover:text-white transition-colors"><MapPin size={12} strokeWidth={2.25} />{p.campoNombre}{p.campoSuperficie && <span> · <SuperficieCampo superficie={p.campoSuperficie} /></span>}</a>
              : <span className="inline-flex items-center gap-1"><MapPin size={12} strokeWidth={2.25} />{p.campoNombre}</span>
          )}
        </div>
        {/* Partido SIN JUGAR: botón de calendario (no hay alineación que mostrar) */}
        {!p.jugado && puedeIcs && (
          <div className="mt-4 flex justify-center">
            <CalendarLink appleHref={icsUrl} otherHref={googleUrl || icsUrl} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-grass-500/15 border border-grass-500/40 text-sm text-grass-300 hover:bg-grass-500/25 transition-colors font-semibold">
              <CalendarPlus size={16} /> Añade este partido a tu calendario
            </CalendarLink>
          </div>
        )}
      </div>

      {/* MVP del partido por fantasy — la baza */}
      {p.jugado && p.mvp && (
        <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-500/30">
          <Trophy size={20} className="text-amber-400 flex-none" />
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/90">MVP del partido · fantasy</div>
            <div className="text-sm text-white truncate">{p.mvp.href ? <Link href={p.mvp.href} className="hover:underline">{formatNombre(p.mvp.nombre) || p.mvp.nombre}</Link> : (formatNombre(p.mvp.nombre) || p.mvp.nombre)} <span className="text-chalk-500">· {p.mvp.lado === 'local' ? p.local.nombre : p.visitante.nombre}</span></div>
          </div>
          <span className="ml-auto flex-none font-display font-extrabold text-amber-300 text-2xl tabular-nums">{p.mvp.puntos}</span>
        </div>
      )}

      {/* ALINEACIONES (dos equipos) con puntos fantasy en cada fila */}
      {p.jugado && (p.local.titulares.length > 0 || p.visitante.titulares.length > 0) && (
        <section className="mt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">Alineaciones</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Lado lado={p.local} />
            <Lado lado={p.visitante} />
          </div>
          <p className="mt-2 text-[11px] text-chalk-600">La cifra de la derecha son los <strong className="text-chalk-500">puntos fantasy</strong> de cada jugador en este partido.</p>
        </section>
      )}

      {/* CARA A CARA */}
      {p.h2h.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">Cara a cara</h2>
          <div className="space-y-1.5">{p.h2h.map((m) => <MiniPartido key={m.codacta} m={m} />)}</div>
        </section>
      )}

      {/* ÚLTIMOS PARTIDOS de cada equipo (forma) */}
      {(p.formaLocal.length > 0 || p.formaVisitante.length > 0) && (
        <section className="mt-6 grid md:grid-cols-2 gap-4">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">Últimos · {p.local.nombre}</h2>
            <div className="space-y-1.5">{p.formaLocal.map((m) => <MiniPartido key={m.codacta} m={m} />)}</div>
          </div>
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">Últimos · {p.visitante.nombre}</h2>
            <div className="space-y-1.5">{p.formaVisitante.map((m) => <MiniPartido key={m.codacta} m={m} />)}</div>
          </div>
        </section>
      )}
    </div>
  )
}
