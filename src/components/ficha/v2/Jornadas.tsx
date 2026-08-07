'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import IndicadorLocal from '@/components/IndicadorLocal'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import {
  Balon, Guante, TarjetaAmarilla, TarjetaDoble, TarjetaRoja, Camiseta, CamisetaHueca,
  TrianguloArriba, TrianguloAbajo, Guion, Escudo,
} from '@/components/iconos'
import { derivarRol } from '@/lib/escala'
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
          <div className="g-lane"><Balon size={12} /></div>
          <div className="g-lane"><Camiseta size={13} /></div>
          <div className="g-lane"><Escudo size={13} /></div>
          <div className="g-lane" />
        </div>
        <div className="track" ref={trackRef} onScroll={onScroll}>
          <div className="cols" style={{ position: 'relative' }}>
            {comp.jornadas.map((d, i) => {
              const last = i === comp.jornadas.length - 1
              const res = signoDe(d.resultado)
              return (
                <div key={d.jornada} className={`col${last ? ' now' : ''}`}>
                  <div className="plot">{barra(d)}<div className="zero" /></div>
                  <div className="lane">{eventos(d)}</div>
                  <div className="lane">{rol(d)}</div>
                  {/* Rival: escudo + casa/avión centrados; la línea de resultado ocupa TODO el ancho de la columna. */}
                  <div className="lane rival-lane">
                    <div className="rival-top">
                      <EscudoBox escudo={d.rivalEscudo ?? null} nombre={d.rivalNombre ?? undefined} size={20} radius={3} />
                      {d.esLocal != null && <IndicadorLocal esLocal={d.esLocal} />}
                    </div>
                    <div className={`resu res-${res}`} />
                  </div>
                  <div className="lane"><span className="jlabel">J{d.jornada}</span></div>
                </div>
              )
            })}
            <div className="avgline" style={{ top: avgTop }}>
              <span className="avgtag">med {media.toFixed(1).replace('.', ',')}</span>
            </div>
          </div>
        </div>
        {/* Degradados que indican que hay más gráfico al hacer scroll (solo desktop, ver ficha.css). */}
        <div className="chart-fade chart-fade-l" style={{ opacity: fades.l ? 1 : 0 }} aria-hidden="true" />
        <div className="chart-fade chart-fade-r" style={{ opacity: fades.r ? 1 : 0 }} aria-hidden="true" />
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
        </div>
      </div>
    </>
  )
}
