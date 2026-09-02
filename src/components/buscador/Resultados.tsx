import Link from 'next/link'
import { MapPin } from 'lucide-react'
import EscudoImg from '@/components/EscudoImg'
import { escudoUrl } from '@/lib/supabase'
import { nombreCompleto, nombreEquipo } from '@/lib/nombre'
import { jugadorHref, tempLabel } from '@/lib/jugador'
import { equipoHref } from '@/lib/equipo'
import Pastilla from '@/components/Pastilla'
import { clubSlug } from '@/lib/clubSlug'
import { campoSlug, parseCampo } from '@/lib/campoSlug'
import { normAlign, type JugadorHit, type EquipoHit, type ClubHit, type CampoHit } from '@/lib/buscador'

// Resalta en verde los trozos del texto que coinciden con los tokens (insensible a acentos/mayúsculas).
export function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length || !text) return <>{text}</>
  const align = normAlign(text)           // misma longitud que text
  const marks = new Array(text.length).fill(false)
  for (const t of tokens) {
    if (!t) continue
    let i = 0
    while ((i = align.indexOf(t, i)) >= 0) { for (let k = i; k < i + t.length; k++) marks[k] = true; i += t.length }
  }
  const out: React.ReactNode[] = []
  let buf = '', cur = false, key = 0
  const flush = () => { if (buf) out.push(cur ? <span key={key++} className="text-grass-300">{buf}</span> : <span key={key++}>{buf}</span>); buf = '' }
  for (let i = 0; i < text.length; i++) { if (marks[i] !== cur) { flush(); cur = marks[i] } buf += text[i] }
  flush()
  return <>{out}</>
}

export function ResultadoJugador({ j, tokens, onNavigate, active, suelo }: {
  j: JugadorHit; tokens: string[]; onNavigate?: () => void; active?: boolean; suelo: number
}) {
  const inactivo = Number(j.codtemporada_ultima) < suelo
  return (
    <Link
      href={jugadorHref(j.codjugador, j.nombre)}
      onClick={onNavigate}
      data-hit
      className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors ${active ? 'bg-pitch-700' : 'hover:bg-pitch-700/60'}`}
    >
      <span className={`inline-flex items-center justify-center w-8 h-8 bg-white rounded-sm flex-shrink-0 p-0.5 ${inactivo ? 'opacity-60' : ''}`}>
        {escudoUrl(j.escudo_actual) ? <EscudoImg escudo={j.escudo_actual} nombre={j.equipo_actual_nombre ?? undefined} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="font-display font-semibold text-white uppercase truncate text-[length:var(--t-lead)] leading-tight">
            <Highlight text={nombreCompleto(j.nombre)} tokens={tokens} />
          </span>
          <Pastilla pos={j.posicion_pastilla} estimada={j.posicion_es_estimada} size="mini" />
        </span>
        <span className={`block text-xs truncate ${inactivo ? 'text-chalk-600' : 'text-chalk-500'}`}>
          {inactivo
            ? `Último: ${j.equipo_actual_nombre ?? '—'}${j.codtemporada_ultima ? ` · ${tempLabel(j.codtemporada_ultima)}` : ''}`
            : `${j.equipo_actual_nombre ?? '—'}${j.pj_total != null ? ` · ${j.pj_total} PJ` : ''}`}
        </span>
      </span>
    </Link>
  )
}

export function ResultadoEquipo({ e, tokens, onNavigate, active }: {
  e: EquipoHit; tokens: string[]; onNavigate?: () => void; active?: boolean
}) {
  const inactivo = !e.activo
  const juvenil = e.rama === 'juvenil'
  return (
    <Link
      href={equipoHref(e.codequipo, e.nombre) || '#'}
      onClick={onNavigate}
      data-hit
      className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors ${active ? 'bg-pitch-700' : 'hover:bg-pitch-700/60'}`}
    >
      <span className={`inline-flex items-center justify-center w-8 h-8 bg-white rounded-sm flex-shrink-0 p-0.5 ${inactivo ? 'opacity-60' : ''}`}>
        {escudoUrl(e.escudo) ? <EscudoImg escudo={e.escudo} nombre={e.nombre} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="font-display font-semibold text-white uppercase truncate text-[length:var(--t-lead)] leading-tight">
            <Highlight text={nombreEquipo(e.nombre)} tokens={tokens} />
          </span>
          {juvenil && <span className="flex-shrink-0 text-[length:var(--t-micro)] font-semibold uppercase tracking-wide text-blue-300 bg-blue-500/15 rounded px-1 py-px">Juvenil</span>}
        </span>
        <span className={`block text-xs truncate ${inactivo ? 'text-chalk-600' : 'text-chalk-500'}`}>
          {inactivo
            ? `Último grupo: ${e.nombre_comp ?? ''}${e.grupo_nombre ? ` · ${e.grupo_nombre}` : ''}${e.codtemporada ? ` · ${tempLabel(e.codtemporada)}` : ''}`
            : `${e.nombre_comp ?? ''}${e.grupo_nombre ? ` · ${e.grupo_nombre}` : ''}`}
        </span>
      </span>
    </Link>
  )
}

// CLUB (organización): enlaza a /clubes/[slug]. Solo nombre de club + localidad + nº de equipos — sin personas.
export function ResultadoClub({ c, tokens, onNavigate, active }: {
  c: ClubHit; tokens: string[]; onNavigate?: () => void; active?: boolean
}) {
  return (
    <Link
      href={`/clubes/${clubSlug(c.codclub, c.nombre_club)}`}
      onClick={onNavigate}
      data-hit
      className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors ${active ? 'bg-pitch-700' : 'hover:bg-pitch-700/60'}`}
    >
      <span className="inline-flex items-center justify-center w-8 h-8 bg-white rounded-sm flex-shrink-0 p-0.5">
        {escudoUrl(c.escudo) ? <EscudoImg escudo={c.escudo} nombre={c.nombre_club} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="font-display font-semibold text-white uppercase truncate text-[length:var(--t-lead)] leading-tight">
            <Highlight text={c.nombre_club} tokens={tokens} />
          </span>
          <span className="flex-shrink-0 text-[length:var(--t-micro)] font-semibold uppercase tracking-wide text-grass-300 bg-grass-500/15 rounded px-1 py-px">Club</span>
        </span>
        <span className="block text-xs truncate text-chalk-500">
          {[c.localidad, `${c.n_equipos ?? 0} equipo${(c.n_equipos ?? 0) !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
        </span>
      </span>
    </Link>
  )
}

// CAMPO (lugar): enlaza a /campos/[slug]. Nombre limpio (sin superficie) + localidad. Sin personas.
export function ResultadoCampo({ c, tokens, onNavigate, active }: {
  c: CampoHit; tokens: string[]; onNavigate?: () => void; active?: boolean
}) {
  const nombre = parseCampo(c.nombre_campo).nombre
  return (
    <Link
      href={`/campos/${campoSlug(c.codigo_campo, nombre)}`}
      onClick={onNavigate}
      data-hit
      className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors ${active ? 'bg-pitch-700' : 'hover:bg-pitch-700/60'}`}
    >
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-sm flex-shrink-0 bg-pitch-700 text-chalk-500">
        <MapPin size={16} strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="font-display font-semibold text-white uppercase truncate text-[length:var(--t-lead)] leading-tight">
            <Highlight text={nombre} tokens={tokens} />
          </span>
          <span className="flex-shrink-0 text-[length:var(--t-micro)] font-semibold uppercase tracking-wide text-grass-300 bg-grass-500/15 rounded px-1 py-px">Campo</span>
        </span>
        <span className="block text-xs truncate text-chalk-500">{[c.localidad, c.provincia].filter(Boolean).join(' · ') || '—'}</span>
      </span>
    </Link>
  )
}
