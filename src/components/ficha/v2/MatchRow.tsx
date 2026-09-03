import Link from 'next/link'
import type { ReactNode } from 'react'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import IndicadorLocal from '@/components/IndicadorLocal'
import NombreEquipo from '@/components/NombreEquipo'
import { Balon, Guante, TarjetaAmarilla, TarjetaDoble, TarjetaRoja } from '@/components/iconos'

// Fila de "partido reciente" COMPARTIDA por la ficha de equipo (Últimos partidos), la de jugador (Mejores
// actuaciones) y la de partido (forma de cada equipo). Reutiliza el diseño .match que ya estaba en producción y le
// añade la columna de ELO junto a la de PUNTOS — SIEMPRE en orden Puntos · ELO (el fantasy es el dato principal,
// el ELO su efecto; es el orden de los partidos desplegados del jugador). Con href, toda la fila enlaza a la
// ficha del partido. Cifras null = silencio (nunca un valor inventado).
export type MatchRowProps = {
  marcador: string | null            // "1-0" en orden local-visitante (o 'vs' si aún no se ha jugado)
  signo?: 'G' | 'E' | 'P' | null     // color del marcador (perspectiva del equipo/jugador de la fila)
  rivalEscudo?: string | null
  rivalNombre?: string | null
  rivalCod?: string | number | null
  esLocal?: boolean | null
  fecha?: string | null              // "DD/MM/YYYY"
  etiqueta?: ReactNode               // "J10" / "Final" / competición (va en la meta)
  goles?: number                     // balón ×N — goles del jugador (Mejores actuaciones) o del equipo a favor (Últimos partidos)
  minutos?: number | null            // extra (jugador)
  // Eventos agregados de EQUIPO por partido (Últimos partidos), mismo estilo icono+contador que los goles.
  // Solo se pintan si se cumplen (silencio si no). El jugador no los pasa -> no aparecen ahí.
  p0?: boolean                       // portería a cero (goles en contra = 0)
  ta?: number                        // amarillas del equipo en el partido
  td?: number                        // dobles amarillas
  tr?: number                        // rojas
  pts?: number | null                // PUNTOS (fantasy)
  ptsBg?: string                     // color de la pastilla de puntos
  eloDelta?: number | null           // ELO: Δ del partido
  href?: string | null               // -> ficha de partido
  compact?: boolean                  // versión estrecha (ficha de partido, dos columnas): mismo diseño, menos ancho
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
// Fecha COMPLETA: día + mes + año. El año es parte de la referencia (una temporada cruza dos años; en
// listas de varias temporadas el día·mes solo no ubica el año). Formato "7 jun 2025".
const fechaCortaDMY = (f: string | null | undefined): string => {
  const m = f ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(f) : null
  return m ? `${parseInt(m[1], 10)} ${MESES[parseInt(m[2], 10) - 1] ?? ''} ${m[3]}`.trim() : (f || '')
}

function Cuerpo(p: MatchRowProps) {
  const col = p.signo === 'G' ? 'var(--e3)' : p.signo === 'P' ? 'var(--e0)' : 'var(--ink-2)'
  return (
    <>
      <div className="m-score" style={{ color: p.marcador ? col : 'var(--ink-3)' }}>{p.marcador ?? 'vs'}</div>
      <EscudoBox escudo={p.rivalEscudo ?? null} nombre={p.rivalNombre ?? undefined} size={p.compact ? 22 : 26} radius={4} />
      <div className="m-mid">
        <div className="m-riv"><span className="m-vs">vs</span> <NombreEquipo codequipo={p.rivalCod ?? null} nombre={p.rivalNombre ?? null} /></div>
        <div className="m-meta">
          {p.esLocal != null && <IndicadorLocal esLocal={p.esLocal} />}
          {(p.fecha || p.etiqueta) && <span>{[fechaCortaDMY(p.fecha), p.etiqueta].filter(Boolean).map((x, i) => <span key={i}>{i > 0 ? ' · ' : ''}{x}</span>)}</span>}
          {(p.goles ?? 0) > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--e4)' }}><Balon size={12} />{(p.goles as number) > 1 ? `×${p.goles}` : ''}</span>}
          {p.minutos != null && <span>{p.minutos}&#39;</span>}
          {/* Eventos de equipo (Últimos partidos): P0 (guante ámbar, como la plantilla) + tarjetas (icono propio + ×N). */}
          {p.p0 && <span title="Portería a cero" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--amber)' }}><Guante size={12} /></span>}
          {(p.ta ?? 0) > 0 && <span title="Amarillas" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--card-y)' }}><TarjetaAmarilla size={11} />{(p.ta as number) > 1 ? `×${p.ta}` : ''}</span>}
          {(p.td ?? 0) > 0 && <span title="Dobles amarillas" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--card-y)' }}><TarjetaDoble size={12} />{(p.td as number) > 1 ? `×${p.td}` : ''}</span>}
          {(p.tr ?? 0) > 0 && <span title="Rojas" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--card-r)' }}><TarjetaRoja size={11} />{(p.tr as number) > 1 ? `×${p.tr}` : ''}</span>}
        </div>
      </div>
      {/* Puntos PRIMERO, ELO DESPUÉS (orden unificado en todo el sitio). */}
      {p.pts != null && <div className="m-pts" style={{ background: p.ptsBg || 'var(--pitch-700)' }}>{p.pts}</div>}
      {p.eloDelta != null && <div className="m-elo" style={{ color: p.eloDelta >= 0 ? 'var(--e3)' : 'var(--e0)' }} title="Δ ELO del partido">{p.eloDelta >= 0 ? '+' : '−'}{Math.abs(Math.round(p.eloDelta))}</div>}
    </>
  )
}

export default function MatchRow(p: MatchRowProps) {
  const cls = `match${p.compact ? ' match-compact' : ''}`
  return p.href
    ? <Link className={`${cls} match-link`} href={p.href}><Cuerpo {...p} /></Link>
    : <div className={cls}><Cuerpo {...p} /></div>
}
