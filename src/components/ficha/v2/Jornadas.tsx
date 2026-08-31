'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import IndicadorLocal from '@/components/IndicadorLocal'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import {
  Balon, Guante, TarjetaAmarilla, TarjetaDoble, TarjetaRoja, Camiseta, CamisetaHueca,
  TrianguloArriba, TrianguloAbajo, Guion, Escudo,
} from '@/components/iconos'
import { derivarRol } from '@/lib/escala'
import { marcadorLocalVisitante } from '@/lib/jugador'
import { useComp } from './compStore'
import type { CompAmbito, JornadaDatum } from '@/lib/jugadorV2'

const PAL = ['#f87171', '#94a3b8', '#22a050', '#2ee56b', '#8cf0a2']
function escalonPts(v: number, c: readonly [number, number, number, number]) {
  if (v < 0) return 0
  let n = 1
  for (let i = 0; i < 4; i++) if (v >= c[i]) n = i + 1
  return n
}
const cPts = (v: number, c: readonly [number, number, number, number]) => PAL[escalonPts(v, c)]
const signoDe = (r: string | null | undefined) => (r || '').trim().match(/([GEP])$/i)?.[1]?.toUpperCase() || 'E'

// Ronda de copa ABREVIADA para el eje del gráfico: la celda mide una línea (22px), y "Fase de grupos"
// envolvía en dos y rompía la altura -> scroll vertical. Aquí va el token corto (una línea); el label
// completo se conserva en el tooltip (title). Desconocidas: tal cual si es corta, primera palabra si es larga.
const RONDA_CORTA: Record<string, string> = {
  'fase de grupos': 'Grupos', 'fase de grupo': 'Grupos', 'primera fase': '1ª fase', 'segunda fase': '2ª fase',
  'treintaidosavos de final': '1/32', 'dieciseisavos de final': '1/16', 'dieciseisavos': '1/16',
  'octavos de final': 'Octavos', 'octavos': 'Octavos', 'cuartos de final': 'Cuartos', 'cuartos': 'Cuartos',
  'semifinales': 'Semis', 'semifinal': 'Semis', 'final': 'Final',
  'ronda preliminar': 'Prelim.', 'ronda previa': 'Previa', 'fase previa': 'Previa', 'repesca': 'Repesca',
}
function rondaCorta(r: string): string {
  const k = r.trim().toLowerCase()
  if (RONDA_CORTA[k]) return RONDA_CORTA[k]
  return r.length <= 8 ? r : r.split(/\s+/)[0]
}

const POS_H = 86, NEG_H = 26

export default function Jornadas({ comps, cortes }: { comps: CompAmbito[]; cortes: readonly [number, number, number, number] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const sel = Math.min(useComp(), comps.length - 1)
  const comp = comps[sel]
  // Señal de que el gráfico tiene scroll horizontal (en desktop la barra va oculta): degradado de
  // desvanecido en el borde con contenido oculto. Se recalcula al hacer scroll y al cambiar de comp.
  const [fades, setFades] = useState({ l: false, r: false })
  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    setFades({ l: el.scrollLeft > 4, r: el.scrollLeft < el.scrollWidth - el.clientWidth - 4 })
  }
  // Desplaza ~una pantalla (80% del ancho visible) con animación. onScroll actualiza fades/flechas.
  const nudge = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.scrollLeft = 99999   // arranca en la jornada más reciente (derecha) -> hay contenido a la izquierda
    onScroll()
  }, [sel])
  if (!comp) return null

  const jug = comp.jornadas.filter((x) => x.estado.tipo === 'valor') as Array<JornadaDatum & { estado: { tipo: 'valor'; v: number } }>
  const vals = jug.map((x) => x.estado.v)
  const maxP = Math.max(...vals, 1)
  const minP = Math.min(...vals, 0)
  const media = jug.length ? vals.reduce((a, b) => a + b, 0) / jug.length : 0
  const avgTop = 108 - Math.round((media / maxP) * POS_H)

  function barra(d: JornadaDatum) {
    if (d.estado.tipo === 'no_jugo') return (<><div className="pos"><div className="bar aus" /></div><div className="neg" /></>)
    if (d.estado.tipo !== 'valor') return (<><div className="pos" /><div className="neg" /></>)
    const v = d.estado.v
    if (v === 0) return (<><div className="pos"><div className="chip" style={{ background: 'var(--e1)', color: '#0a1628' }}>0</div><div className="bar cero" /></div><div className="neg" /></>)
    if (v > 0) {
      const h = Math.max(5, Math.round((v / maxP) * POS_H)); const col = cPts(v, cortes)
      return (<><div className="pos"><div className="chip" style={{ background: col }}>{v}</div><div className="bar" style={{ height: h, background: col }} /></div><div className="neg" /></>)
    }
    const h = Math.max(5, Math.round((Math.abs(v) / Math.max(Math.abs(minP), 1)) * NEG_H))
    return (<><div className="pos" /><div className="neg"><div className="bar down" style={{ height: h, background: 'var(--e0)' }} /><div className="chip" style={{ background: 'var(--e0)', color: '#0a1628' }}>{v}</div></div></>)
  }

  // #7 Carril de ELO por jornada: pastilla con el Δ ELO (verde sube, rojo baja), SIN barra. Va en la misma columna
  // que el punto -> queda alineado exacto bajo su barra; el gráfico ya scrollea, así que el número cabe como el chip.
  function eloLane(d: JornadaDatum) {
    if (d.estado.tipo !== 'valor' || d.eloDelta == null) return null
    const up = d.eloDelta >= 0
    return <span className="elo-chip" style={{ background: up ? 'var(--e3)' : 'var(--e0)' }}>{up ? '+' : '−'}{Math.abs(Math.round(d.eloDelta))}</span>
  }

  // Carril de eventos: gol (×N), portería a cero, amarilla / doble amarilla / roja (cada una con su glifo).
  function eventos(d: JornadaDatum) {
    if (d.estado.tipo !== 'valor') return null
    const g = d.goles ?? 0
    const items: ReactNode[] = []
    if (g === 1) items.push(<span key="g" style={{ color: 'var(--e4)', display: 'inline-flex' }}><Balon size={12} /></span>)
    else if (g > 1) items.push(<span key="g" style={{ color: 'var(--e4)', display: 'inline-flex', alignItems: 'center', gap: 1 }}><Balon size={12} /><span className="num" style={{ fontSize: 'var(--t-cap)', color: 'var(--e4)' }}>×{g}</span></span>)
    if (d.gc === 0) items.push(<span key="p0" style={{ color: 'var(--amber)', display: 'inline-flex' }}><Guante size={12} /></span>)
    if ((d.amarillas ?? 0) > 0) items.push(<span key="ta" style={{ color: 'var(--card-y)', display: 'inline-flex' }}><TarjetaAmarilla size={11} /></span>)
    if ((d.dobles ?? 0) > 0) items.push(<span key="td" style={{ color: 'var(--card-y)', display: 'inline-flex' }}><TarjetaDoble size={12} /></span>)
    if ((d.rojas ?? 0) > 0) items.push(<span key="tr" style={{ color: 'var(--card-r)', display: 'inline-flex' }}><TarjetaRoja size={11} /></span>)
    if (items.length === 0) return <span style={{ color: 'var(--ink-4)' }}>·</span>
    return <>{items}</>
  }

  // Carril de rol: camiseta (titular/suplente) + cambio (salió/entró); no jugó -> guion. La expulsión ya
  // se ve como tarjeta roja en el carril de eventos, así que aquí no se duplica.
  function rol(d: JornadaDatum) {
    if (d.estado.tipo !== 'valor') return <span style={{ color: 'var(--ink-4)', display: 'flex' }}><Guion size={11} /></span>
    const r = derivarRol(!!d.titular, d.minutos ?? 0, d.rojas ?? 0, d.dobles ?? 0)
    const shirt = d.titular
      ? <span style={{ color: 'var(--ink)', display: 'flex' }}><Camiseta size={13} /></span>
      : <span style={{ color: 'var(--ink-3)', display: 'flex' }}><CamisetaHueca size={13} /></span>
    const marca = r === 'sustituido' ? <span style={{ color: 'var(--e0)', display: 'flex' }}><TrianguloAbajo size={9} /></span>
      : r === 'entro' ? <span style={{ color: 'var(--e3)', display: 'flex' }}><TrianguloArriba size={9} /></span> : null
    return (<><span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>{shirt}{marca}</span><span className="mins">{d.minutos}&#39;</span></>)
  }

  return (
    <>
      <div className="chart-wrap">
        <div className="gutter">
          <div className="g-plot" />
          <div className="g-lane g-lane-elo">ELO</div>
          <div className="g-lane"><Balon size={12} /></div>
          <div className="g-lane"><Camiseta size={13} /></div>
          <div className="g-lane g-lane-rival"><Escudo size={13} /></div>
          <div className="g-lane" />
        </div>
        <div className="track" ref={trackRef} onScroll={onScroll}>
          <div className="cols" style={{ position: 'relative' }}>
            {comp.jornadas.map((d, i) => {
              const last = i === comp.jornadas.length - 1
              const res = signoDe(d.resultado)
              // Marcador en orden local-visitante (voltea si jugó fuera); color por el signo del resultado.
              const { marcador } = marcadorLocalVisitante(d.resultado ?? null, d.esLocal)
              return (
                <div key={d.jornada} className={`col${last ? ' now' : ''}`}>
                  <div className="plot">{barra(d)}<div className="zero" /></div>
                  <div className="lane lane-elo">{eloLane(d)}</div>
                  <div className="lane">{eventos(d)}</div>
                  <div className="lane">{rol(d)}</div>
                  {/* Rival: marcador (coloreado) encima del escudo; casa/avión al lado; la línea de
                      resultado ocupa TODO el ancho de la columna, abajo. */}
                  <div className="lane rival-lane">
                    {d.resultado && <div className={`rival-mk res-t-${res}`}>{marcador}</div>}
                    <div className="rival-top">
                      <EscudoBox escudo={d.rivalEscudo ?? null} nombre={d.rivalNombre ?? undefined} size={20} radius={3} />
                      {d.esLocal != null && <IndicadorLocal esLocal={d.esLocal} />}
                    </div>
                    <div className={`resu res-${res}`} />
                  </div>
                  {/* Copa: la ronda ABREVIADA ("Grupos", "Final") en vez del número de jornada (interno);
                      el nombre completo va en el tooltip. Una sola línea (ver .jlabel) para no romper la celda. */}
                  <div className="lane"><span className="jlabel" title={d.ronda || undefined}>{d.ronda ? rondaCorta(d.ronda) : `J${d.jornada}`}</span></div>
                </div>
              )
            })}
          </div>
        </div>
        {/* Línea de media: overlay FIJO sobre el área de barras (no scrollea), de extremo a extremo
            (del canalón al borde) a la altura de la media; etiqueta anclada en el canalón izquierdo. */}
        <div className="avg-line" style={{ top: avgTop }} aria-hidden="true" />
        {/* Etiqueta con un decimal (3,8); la LÍNEA sigue en el valor exacto (avgTop). */}
        <div className="avg-tag" style={{ top: avgTop }}>{media.toFixed(1).replace('.', ',')}</div>
        {/* Degradados que indican que hay más gráfico al hacer scroll (solo desktop, ver ficha.css). */}
        <div className="chart-fade chart-fade-l" style={{ opacity: fades.l ? 1 : 0 }} aria-hidden="true" />
        <div className="chart-fade chart-fade-r" style={{ opacity: fades.r ? 1 : 0 }} aria-hidden="true" />
        {/* Flechas de navegación (solo desktop): dan una forma de mover el gráfico sin barra ni gesto.
            Visibles solo cuando hay contenido en esa dirección (misma lógica que los degradados). */}
        <button type="button" className="chart-nav chart-nav-l" aria-label="Jornadas anteriores"
          style={{ opacity: fades.l ? 1 : 0, pointerEvents: fades.l ? 'auto' : 'none' }} onClick={() => nudge(-1)}>
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <button type="button" className="chart-nav chart-nav-r" aria-label="Jornadas siguientes"
          style={{ opacity: fades.r ? 1 : 0, pointerEvents: fades.r ? 'auto' : 'none' }} onClick={() => nudge(1)}>
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Leyenda: enseña a leer los símbolos, en el mismo orden que los carriles (arriba abajo). */}
      <div className="legend">
        <h4>Cómo se lee</h4>
        <div className="lg-row">
          <span className="lg-item"><span className="gl" style={{ color: 'var(--e4)' }}><Balon size={12} /></span>Gol</span>
          <span className="lg-item"><span className="gl" style={{ color: 'var(--amber)' }}><Guante size={13} /></span>Portería a cero</span>
          <span className="lg-item"><span className="gl" style={{ color: 'var(--card-y)' }}><TarjetaAmarilla size={11} /></span>Amarilla</span>
          <span className="lg-item"><span className="gl" style={{ color: 'var(--card-y)' }}><TarjetaDoble size={12} /></span>Doble amarilla</span>
          <span className="lg-item"><span className="gl" style={{ color: 'var(--card-r)' }}><TarjetaRoja size={11} /></span>Roja</span>
        </div>
        <div className="lg-row" style={{ marginTop: 6 }}>
          <span className="lg-item"><span className="gl" style={{ color: 'var(--ink)' }}><Camiseta size={13} /></span>Titular</span>
          <span className="lg-item"><span className="gl"><CamisetaHueca size={13} /></span>Suplente</span>
          <span className="lg-item"><span className="gl" style={{ color: 'var(--ink-4)' }}><Guion size={11} /></span>No jugó</span>
        </div>
        <div className="lg-row" style={{ marginTop: 6 }}>
          <span className="lg-item"><span className="gl" style={{ color: 'var(--e0)' }}><TrianguloAbajo size={9} /></span>Salió</span>
          <span className="lg-item"><span className="gl" style={{ color: 'var(--e3)' }}><TrianguloArriba size={9} /></span>Entró</span>
        </div>
        <div className="lg-row" style={{ marginTop: 6 }}>
          <span className="lg-item"><span className="gl"><IndicadorLocal esLocal={true} /></span>Casa</span>
          <span className="lg-item"><span className="gl"><IndicadorLocal esLocal={false} /></span>Fuera</span>
          <span className="lg-item">Línea bajo el escudo: <b style={{ color: 'var(--e3)' }}>ganó</b> · <b style={{ color: 'var(--ink-3)' }}>empató</b> · <b style={{ color: 'var(--e0)' }}>perdió</b></span>
        </div>
        <div className="lg-row" style={{ marginTop: 6 }}>
          <span className="lg-item">Carril <b>ELO</b>: Δ ELO del partido — <b style={{ color: 'var(--e3)' }}>+ subió</b> · <b style={{ color: 'var(--e0)' }}>− bajó</b></span>
        </div>
      </div>
    </>
  )
}
