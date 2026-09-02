'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import IndicadorLocal from '@/components/IndicadorLocal'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import { Marcador, Tabla, Escudo, TrianguloArriba, TrianguloAbajo, Guion } from '@/components/iconos'
import { fechaCorta } from '@/lib/jugador'
import { nombreEquipo } from '@/lib/nombre'
import { useComp } from './compStore'
import type { JornadaEquipoDatum, RondaDatum } from '@/lib/equipoV2'

const PAL = ['#f87171', '#94a3b8', '#22a050', '#2ee56b', '#8cf0a2']
function escFan(v: number, c: readonly [number, number, number, number]) {
  if (v < c[0]) return 0
  for (let i = c.length - 1; i >= 0; i--) if (v > c[i]) return i + 1
  return 1
}
const cFan = (v: number, c: readonly [number, number, number, number]) => PAL[escFan(v, c)]
const colRes = (s: string | null) => (s === 'G' ? 'var(--e3)' : s === 'E' ? 'var(--ink-2)' : 'var(--e0)')

// Una competición del ámbito: liga (barras de fantasy por jornada) o copa (tira de rondas, sin barras
// porque en copa no hay pts_fantasy por jornada — ver DECISIONES E-copa).
export type CompEquipo =
  | { label: string; tipo: 'liga'; jornadas: JornadaEquipoDatum[] }
  | { label: string; tipo: 'copa'; rondas: RondaDatum[]; competicion?: string | null }

const POS_H = 86

export default function JornadasEquipo({ comps, cortes, temporada }: { comps: CompEquipo[]; cortes: readonly [number, number, number, number]; temporada: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const sel = Math.min(useComp(), comps.length - 1)
  const comp = comps[sel]
  const [fades, setFades] = useState({ l: false, r: false })
  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    setFades({ l: el.scrollLeft > 4, r: el.scrollLeft < el.scrollWidth - el.clientWidth - 4 })
  }
  const nudge = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }
  useEffect(() => {
    const el = trackRef.current
    if (!el || comp?.tipo !== 'liga') return
    el.scrollLeft = 99999
    onScroll()
  }, [sel, comp?.tipo])
  if (!comp) return null

  const head = (
    <div className="s-head">
      <h2 className="s-title">{comp.tipo !== 'copa' ? 'Puntos por jornada' : /play\s*off/i.test(comp.competicion || comp.label) ? 'Recorrido en el play off' : 'Recorrido en copa'}</h2>
      <div className="s-sub">{[temporada, comp.label].filter(Boolean).join(' · ')}</div>
    </div>
  )

  // ── COPA: tira de rondas (patrón de "Últimos partidos"), sin barras de fantasy ──
  if (comp.tipo === 'copa') {
    return (
      <>
        {head}
        <div>
          {comp.rondas.map((r, i) => (
            <div className="match" key={i}>
              <div className="m-score" style={{ color: colRes(r.signo) }}>{r.marcador}</div>
              <EscudoBox escudo={r.rivalEscudo} nombre={r.rivalNombre ?? undefined} size={26} radius={4} />
              <div className="m-mid">
                <div className="m-riv"><span className="m-vs">vs</span> {nombreEquipo(r.rivalNombre)}</div>
                <div className="m-meta">{r.esLocal != null && <IndicadorLocal esLocal={r.esLocal} />}<span>{r.fecha ? fechaCorta(r.fecha) : ''}</span></div>
              </div>
              <div className="copa-ronda">{r.ronda}</div>
            </div>
          ))}
          {comp.rondas.length === 0 && <p style={{ padding: '0 var(--pad)', color: 'var(--ink-3)', fontSize: 'var(--t-sm)' }}>Sin partidos de copa registrados.</p>}
        </div>
      </>
    )
  }

  // ── LIGA: gráfico de barras ──
  const jug = comp.jornadas.filter((x) => x.fan != null) as Array<JornadaEquipoDatum & { fan: number }>
  const vals = jug.map((x) => x.fan)
  const maxF = Math.max(...vals, 1)
  const media = jug.length ? vals.reduce((a, b) => a + b, 0) / jug.length : 0
  const avgTop = 108 - Math.round((media / maxF) * POS_H)

  function barra(d: JornadaEquipoDatum) {
    if (d.fan == null) return (<><div className="pos" /><div className="neg" /></>)
    const h = Math.max(2, Math.round((d.fan / maxF) * POS_H))
    const col = cFan(d.fan, cortes)
    return (<><div className="pos"><div className="chip" style={{ background: col }}>{d.fan}</div><div className="bar" style={{ height: h, background: col }} /></div><div className="neg" /></>)
  }
  function posMov(d: JornadaEquipoDatum) {
    const m = d.mov
    const glifo = m == null ? <span style={{ color: 'var(--ink-4)' }}>·</span>
      : m.dir > 0 ? <span className="eq-mov" style={{ color: 'var(--e3)' }}><TrianguloArriba size={9} />{m.n || ''}</span>
        : m.dir < 0 ? <span className="eq-mov" style={{ color: 'var(--e0)' }}><TrianguloAbajo size={9} />{m.n || ''}</span>
          : <span className="eq-mov" style={{ color: 'var(--ink-3)', display: 'flex' }}><Guion size={9} /></span>
    return (<>{d.pos != null && <span className="eq-posn">{d.pos}º</span>}{glifo}</>)
  }

  return (
    <>
      {head}
      <div className="chart-wrap">
        <div className="gutter">
          <div className="g-plot" />
          <div className="g-lane"><Marcador size={13} /></div>
          <div className="g-lane"><Tabla size={13} /></div>
          <div className="g-lane"><Escudo size={13} /></div>
          <div className="g-lane" />
        </div>
        <div className="track" ref={trackRef} onScroll={onScroll}>
          <div className="cols" style={{ position: 'relative' }}>
            {comp.jornadas.map((d, i) => {
              const last = i === comp.jornadas.length - 1
              const res = d.signo || 'E'
              return (
                <div key={d.jornada} className={`col${last ? ' now' : ''}`}>
                  <div className="plot">{barra(d)}<div className="zero" /></div>
                  <div className="lane">{d.marcador ? <span className={`eq-marc res-t-${res}`}>{d.marcador}</span> : <span style={{ color: 'var(--ink-4)' }}>·</span>}</div>
                  <div className="lane">{posMov(d)}</div>
                  <div className="lane eq-rival-lane">
                    <div className="eq-rival-top">
                      <EscudoBox escudo={d.rivalEscudo ?? null} nombre={d.rivalNombre ?? undefined} size={20} radius={3} />
                      {d.esLocal != null && <IndicadorLocal esLocal={d.esLocal} />}
                    </div>
                    <div className={`resu res-${res}`} />
                  </div>
                  <div className="lane"><span className="jlabel">J{d.jornada}</span></div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="avg-line" style={{ top: avgTop }} aria-hidden="true" />
        <div className="avg-tag" style={{ top: avgTop }}>{media.toFixed(1).replace('.', ',')}</div>
        <div className="chart-fade chart-fade-l" style={{ opacity: fades.l ? 1 : 0 }} aria-hidden="true" />
        <div className="chart-fade chart-fade-r" style={{ opacity: fades.r ? 1 : 0 }} aria-hidden="true" />
        <button type="button" className="chart-nav chart-nav-l" aria-label="Jornadas anteriores"
          style={{ opacity: fades.l ? 1 : 0, pointerEvents: fades.l ? 'auto' : 'none' }} onClick={() => nudge(-1)}>
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
        <button type="button" className="chart-nav chart-nav-r" aria-label="Jornadas siguientes"
          style={{ opacity: fades.r ? 1 : 0, pointerEvents: fades.r ? 'auto' : 'none' }} onClick={() => nudge(1)}>
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="legend">
        <h4>Cómo se lee</h4>
        <div className="lg-row">
          <span className="lg-item"><span className="gl"><Marcador size={13} /></span>Marcador</span>
          <span className="lg-item"><span className="gl"><Tabla size={13} /></span>Posición tras la jornada</span>
          <span className="lg-item"><span className="gl" style={{ color: 'var(--e3)' }}><TrianguloArriba size={9} /></span>Sube</span>
          <span className="lg-item"><span className="gl" style={{ color: 'var(--e0)' }}><TrianguloAbajo size={9} /></span>Baja</span>
        </div>
        <div className="lg-row" style={{ marginTop: 6 }}>
          <span className="lg-item"><span className="gl"><IndicadorLocal esLocal={true} /></span>Casa</span>
          <span className="lg-item"><span className="gl"><IndicadorLocal esLocal={false} /></span>Fuera</span>
          <span className="lg-item">Línea bajo el escudo: <b style={{ color: 'var(--e3)' }}>ganó</b> · <b style={{ color: 'var(--ink-3)' }}>empató</b> · <b style={{ color: 'var(--e0)' }}>perdió</b></span>
        </div>
      </div>
    </>
  )
}
