import Link from 'next/link'
import EscudoImg from '@/components/EscudoImg'
import { escudoUrl, formatNombre } from '@/lib/supabase'
import { jugadorHref, tempLabel } from '@/lib/jugador'
import { equipoHref } from '@/lib/equipo'
import Pastilla from '@/components/Pastilla'
import { normAlign, LIVE_COD, type JugadorHit, type EquipoHit } from '@/lib/buscador'

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

export function ResultadoJugador({ j, tokens, onNavigate, active }: {
  j: JugadorHit; tokens: string[]; onNavigate?: () => void; active?: boolean
}) {
  const inactivo = Number(j.codtemporada_ultima) < Number(LIVE_COD)
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
          <span className="font-display font-semibold text-white uppercase truncate text-[15px] leading-tight">
            <Highlight text={formatNombre(j.nombre)} tokens={tokens} />
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
          <span className="font-display font-semibold text-white uppercase truncate text-[15px] leading-tight">
            <Highlight text={e.nombre} tokens={tokens} />
          </span>
          {juvenil && <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-blue-300 bg-blue-500/15 rounded px-1 py-px">Juvenil</span>}
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
