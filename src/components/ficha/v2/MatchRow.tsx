import Link from 'next/link'
import type { ReactNode } from 'react'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import IndicadorLocal from '@/components/IndicadorLocal'
import NombreEquipo from '@/components/NombreEquipo'
import { Balon, Guante, TarjetaAmarilla, TarjetaDoble, TarjetaRoja } from '@/components/iconos'

// Fila de "partido reciente" COMPARTIDA por la ficha de equipo (Últimos partidos), la de jugador (Mejores
// actuaciones) y la de partido (forma de cada equipo). Presentación tipo CARA A CARA: los dos equipos (escudo +
// nombre) con el MARCADOR centrado y coloreado por el resultado del SUJETO; debajo, una meta con fecha · competición
// y los datos propios del bloque. El CONTENIDO depende del sujeto (mismo criterio que los eventos):
//  · "Mejores actuaciones" (jugador): el PF es EL dato (criterio de orden) -> se pasa `pts`, DESTACADO y rotulado.
//  · "Últimos partidos" (equipo/partido): no hay protagonista (son 11 jugadores) -> SIN PF; solo el ΔELO del equipo
//    (`eloDelta`), que sí es propiedad del equipo. Se rotula "ELO" en la cabecera del bloque, no por fila.
// Los eventos también dependen del sujeto (del jugador vs agregados del equipo), pero eso lo decide quien la llama.
// Ver MANUAL_DE_ESTILO.md (MatchRow).
export type MatchRowProps = {
  marcador: string | null            // "gL-gV" en orden local-visitante (o null/'vs' si aún no se ha jugado)
  signo?: 'G' | 'E' | 'P' | null     // color del marcador (perspectiva del sujeto)
  // Equipo del SUJETO (el equipo, o el equipo del jugador esa temporada): para el look cara a cara con ambos lados.
  propioNombre?: string | null
  propioEscudo?: string | null
  propioCod?: string | number | null
  rivalEscudo?: string | null
  rivalNombre?: string | null
  rivalCod?: string | number | null
  esLocal?: boolean | null           // true = el sujeto jugó de local (ordena los dos lados en L-V)
  fecha?: string | null              // "DD/MM/YYYY"
  etiqueta?: ReactNode               // "J10" / ronda / competición (va en la meta)
  goles?: number                     // balón ×N — goles del jugador (Mejores actuaciones) o del equipo (Últimos)
  minutos?: number | null            // extra (jugador)
  p0?: boolean                       // portería a cero (equipo)
  ta?: number; td?: number; tr?: number   // tarjetas agregadas del equipo (Últimos)
  pts?: number | null                // PF (fantasy) — SOLO Mejores actuaciones: destacado + rotulado
  ptsBg?: string
  eloDelta?: number | null           // ΔELO del partido — SOLO Últimos partidos
  href?: string | null
  compact?: boolean                  // partido (dos columnas): fila algo más estrecha
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
// Fecha COMPLETA día + mes + año ("7 jun 2025"): el año ubica la temporada (una temporada cruza dos años).
const fechaCortaDMY = (f: string | null | undefined): string => {
  const m = f ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(f) : null
  return m ? `${parseInt(m[1], 10)} ${MESES[parseInt(m[2], 10) - 1] ?? ''} ${m[3]}`.trim() : (f || '')
}

// Eventos por PRIORIDAD (lo primero, lo que más aporta): roja · doble · amarilla · goles · min · P0. Goles/P0 al
// final: se DEDUCEN del marcador (ya en la fila). Silencio si no se cumplen.
function Eventos(p: MatchRowProps) {
  const out: ReactNode[] = []
  if ((p.tr ?? 0) > 0) out.push(<span key="tr" className="mh-ev" style={{ color: 'var(--card-r)' }} title="Rojas"><TarjetaRoja size={11} />{(p.tr as number) > 1 ? `×${p.tr}` : ''}</span>)
  if ((p.td ?? 0) > 0) out.push(<span key="td" className="mh-ev" style={{ color: 'var(--card-y)' }} title="Dobles amarillas"><TarjetaDoble size={12} />{(p.td as number) > 1 ? `×${p.td}` : ''}</span>)
  if ((p.ta ?? 0) > 0) out.push(<span key="ta" className="mh-ev" style={{ color: 'var(--card-y)' }} title="Amarillas"><TarjetaAmarilla size={11} />{(p.ta as number) > 1 ? `×${p.ta}` : ''}</span>)
  if ((p.goles ?? 0) > 0) out.push(<span key="g" className="mh-ev" style={{ color: 'var(--e4)' }}><Balon size={12} />{(p.goles as number) > 1 ? `×${p.goles}` : ''}</span>)
  if (p.minutos != null) out.push(<span key="m" className="mh-ev">{p.minutos}&#39;</span>)
  if (p.p0) out.push(<span key="p0" className="mh-ev" style={{ color: 'var(--amber)' }} title="Portería a cero"><Guante size={12} /></span>)
  return <>{out}</>
}

// Un lado del enfrentamiento (escudo + nombre), con el ganador en negrita. `v` invierte el orden (lado visitante).
function Lado({ nombre, escudo, cod, win, v }: { nombre?: string | null; escudo?: string | null; cod?: string | number | null; win: boolean; v?: boolean }) {
  return (
    <div className={`mh-side${v ? ' v' : ''}`}>
      <EscudoBox escudo={escudo ?? null} nombre={nombre ?? undefined} size={22} radius={4} />
      <span className={`mh-nm${win ? ' w' : ''}`}><NombreEquipo codequipo={cod ?? null} nombre={nombre ?? null} /></span>
    </div>
  )
}

function Cuerpo(p: MatchRowProps) {
  const jugado = !!p.marcador && /\d+-\d+/.test(p.marcador)
  const [gL, gV] = jugado ? (p.marcador as string).split('-').map((x) => parseInt(x, 10)) : [null, null]
  const col = p.signo === 'G' ? 'var(--e3)' : p.signo === 'P' ? 'var(--e0)' : 'var(--ink-2)'
  // Orden real local-visitante: el sujeto es local si esLocal; el marcador ya viene en ese orden.
  const suj = { nombre: p.propioNombre, escudo: p.propioEscudo, cod: p.propioCod }
  const riv = { nombre: p.rivalNombre, escudo: p.rivalEscudo, cod: p.rivalCod }
  const loc = p.esLocal === false ? riv : suj
  const vis = p.esLocal === false ? suj : riv
  const wL = jugado && (gL as number) > (gV as number)
  const wV = jugado && (gV as number) > (gL as number)
  const ev = Eventos(p)
  const hayEv = (p.tr ?? 0) > 0 || (p.td ?? 0) > 0 || (p.ta ?? 0) > 0 || (p.goles ?? 0) > 0 || p.minutos != null || p.p0
  return (
    <>
      <div className="mh-top">
        <Lado nombre={loc.nombre} escudo={loc.escudo} cod={loc.cod} win={wL} />
        <span className="mh-sc" style={{ color: jugado ? col : 'var(--ink-3)' }}>
          {jugado ? <>{gL}<span className="mh-sep">-</span>{gV}</> : 'vs'}
        </span>
        <Lado nombre={vis.nombre} escudo={vis.escudo} cod={vis.cod} win={wV} v />
      </div>
      <div className="mh-meta">
        <span className="mh-when">
          {p.esLocal != null && <IndicadorLocal esLocal={p.esLocal} />}
          {(p.fecha || p.etiqueta) && <span>{[fechaCortaDMY(p.fecha), p.etiqueta].filter(Boolean).map((x, i) => <span key={i}>{i > 0 ? ' · ' : ''}{x}</span>)}</span>}
        </span>
        <span className="mh-stats">
          {hayEv && <span className="mh-evs">{ev}</span>}
          {/* PF: EL dato de "Mejores actuaciones" -> destacado y rotulado. */}
          {p.pts != null && <span className="mh-pf" style={p.ptsBg ? { background: p.ptsBg } : undefined}><b>{p.pts}</b><small>PF</small></span>}
          {/* ΔELO del equipo tras el partido: rótulo "Δ ELO" + la cifra coloreada, para que el número no vaya suelto. */}
          {p.eloDelta != null && <span className="mh-elo" title="Δ ELO del equipo tras el partido"><span className="mh-elo-lbl">Δ ELO</span> <b style={{ color: p.eloDelta >= 0 ? 'var(--e3)' : 'var(--e0)' }}>{p.eloDelta >= 0 ? '+' : '−'}{Math.abs(Math.round(p.eloDelta))}</b></span>}
        </span>
      </div>
    </>
  )
}

export default function MatchRow(p: MatchRowProps) {
  const cls = `match-hb${p.compact ? ' match-hb-compact' : ''}`
  return p.href
    ? <Link className={`${cls} match-hb-link`} href={p.href}><Cuerpo {...p} /></Link>
    : <div className={cls}><Cuerpo {...p} /></div>
}
