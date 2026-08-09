'use client'

import { useState } from 'react'
import type { CarreraSerie, CarreraBand } from '@/lib/competicionV2'

// Carrera de posiciones: una línea por equipo (posición jornada a jornada), bandas de zona al fondo,
// no seleccionados en gris tenue, chips para cambiar el foco. Construida con los snapshots por jornada.
// El SVG scrollea en horizontal (móvil 390px): las 18 líneas caben a lo alto (~11px/fila) y el eje X se
// desplaza. Cliente por la interacción de los chips.
export default function CarreraPosiciones({ series, jornadas, bands }: {
  series: CarreraSerie[]; jornadas: number[]; bands: CarreraBand[]
}) {
  const nT = series.length
  const NJ = jornadas.length
  // Selección por defecto: líder (pos 1 final), último, y el de MAYOR RECORRIDO (más puestos ganados o
  // perdidos entre la 1ª jornada y la última) — la remontada o el hundimiento, la historia que la tabla
  // no cuenta. (El componente se remonta al cambiar de grupo vía key, así que esto se recalcula.)
  const [sel, setSel] = useState<Set<string>>(() => {
    if (!series.length) return new Set<string>()
    let mejor = series[0], mejorD = -1
    for (const s of series) {
      const d = Math.abs((s.pos[0] ?? 0) - (s.pos[s.pos.length - 1] ?? 0))
      if (d > mejorD) { mejorD = d; mejor = s }
    }
    return new Set([series[0].codequipo, series[series.length - 1].codequipo, mejor.codequipo])
  })
  const toggle = (c: string) => setSel((prev) => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })
  if (!nT || !NJ) return <p className="vacio">Sin snapshots por jornada para dibujar la carrera.</p>

  const colW = 26, padL = 10, top = 12, bot = 16, H = 210
  const W = (NJ - 1) * colW + padL * 2
  const rowH = (H - top - bot) / Math.max(1, nT - 1)
  const x = (j: number) => padL + j * colW
  const y = (p: number) => top + (p - 1) * rowH

  return (
    <div className="carrera">
      <div className="cwrap">
        <div className="cyaxis" style={{ height: H }}>
          {Array.from(new Set([1, 5, 10, 15, nT])).filter((p) => p <= nT).map((p) => (
            <span key={p} style={{ top: y(p) }}>{p}º</span>
          ))}
        </div>
        <div className="track" style={{ flex: 1 }}>
          <svg width={W} height={H} style={{ display: 'block' }}>
            {bands.map((b, i) => (
              <rect key={i} x={0} y={y(b.from) - rowH / 2} width={W} height={(b.to - b.from + 1) * rowH} fill={b.color} opacity={0.09} />
            ))}
            {series.map((s) => {
              const on = sel.has(s.codequipo)
              const d = s.pos.map((p, j) => `${j ? 'L' : 'M'}${x(j)} ${y(p)}`).join(' ')
              return (
                <g key={s.codequipo}>
                  <path d={d} fill="none" stroke={on ? s.color : '#33456b'} strokeWidth={on ? 2.6 : 1.2} opacity={on ? 1 : 0.35} strokeLinejoin="round" strokeLinecap="round" />
                  {on && <circle cx={x(NJ - 1)} cy={y(s.pos[NJ - 1])} r={4} fill={s.color} />}
                </g>
              )
            })}
            {jornadas.map((jn, j) => (j % 4 === 0 || j === NJ - 1) ? (
              <text key={j} x={x(j)} y={H - 3} fill="#8a9cbd" fontSize="10" textAnchor="middle" fontFamily="var(--font-display),'Barlow Condensed',sans-serif" fontWeight="600">J{jn}</text>
            ) : null)}
          </svg>
        </div>
      </div>
      <div className="cchips">
        {series.map((s) => (
          <button type="button" key={s.codequipo} className={`chip-eq${sel.has(s.codequipo) ? ' on' : ''}`} onClick={() => toggle(s.codequipo)} title={s.nombre}>
            <i style={{ background: s.color }} />{s.ini}
          </button>
        ))}
      </div>
      <div className="leyenda">Pulsa un equipo para resaltar su trayectoria. Construido con los <b>snapshots por jornada</b>.</div>
    </div>
  )
}
