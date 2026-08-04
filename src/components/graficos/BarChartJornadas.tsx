import type { ReactNode } from 'react'
import { escalon, PALETA_FONDO } from '@/lib/escala'

// Gráfico de barras verticales por jornada, con canalón izquierdo fijo (iconos de cada carril) y uno o
// más carriles configurables debajo del eje. Zona positiva arriba y negativa abajo, separadas por una
// línea de cero visible; los negativos crecen hacia abajo.
//
// `estado(d)` codifica los TRES estados visuales como una unión discriminada explícita (no un centinela
// numérico: un NaN se colaría en la media y, al serializar a JSON, se volvería null — justo el otro estado):
//   • { tipo: 'sin_dato' }        → no se dibuja nada.
//   • { tipo: 'no_jugo' }         → barra mínima punteada y tenue sobre la línea de cero.
//   • { tipo: 'valor', v: 0 }     → barra MÍNIMA sólida.
//   • { tipo: 'valor', v: ≠ 0 }   → barra escalada (positiva arriba, negativa abajo), coloreada por
//                                    escalon(v, cortes).
//
// El color/estado del carril de rol NO se decide aquí: el consumidor construye ese carril y su `render`
// llama a derivarRol() de escala.ts. El componente no reimplementa esa condición.

export type EstadoBarra = { tipo: 'valor'; v: number } | { tipo: 'no_jugo' } | { tipo: 'sin_dato' }

const GUTTER = 26 // ancho del canalón izquierdo (px)
const COL = 30 // ancho de columna por jornada (px)
const PLOT_H = 96 // alto de la zona de barras (px)
const LABEL_H = 16 // alto de la fila de etiquetas del eje X (px)
const CARRIL_H = 22 // alto de cada carril (px)
const MIN_BAR = 4 // alto mínimo de barra (0 y "no jugó") (px)
const BAR_W = 14 // ancho de la barra dentro de la columna (px)

type Carril<T> = { icono: ReactNode; render: (d: T) => ReactNode }

export default function BarChartJornadas<T>({
  datos,
  estado,
  cortes,
  carriles,
  etiqueta,
  mostrarMedia = false,
  destacarUltimo = false,
}: {
  datos: T[]
  estado: (d: T) => EstadoBarra
  cortes: readonly [number, number, number, number]
  carriles: Carril<T>[]
  etiqueta: (d: T) => string
  mostrarMedia?: boolean
  destacarUltimo?: boolean
}) {
  const estados = datos.map(estado)
  // Solo los estados con valor cuentan para la escala y la media (sin NaN que se propaguen en silencio).
  const valores = estados.filter((e): e is { tipo: 'valor'; v: number } => e.tipo === 'valor').map((e) => e.v)

  const posMax = Math.max(1, ...valores.filter((v) => v > 0))
  const negMax = Math.max(1, ...valores.filter((v) => v < 0).map((v) => -v))
  const hayNeg = valores.some((v) => v < 0)

  const zeroY = Math.round(PLOT_H * (hayNeg ? 0.66 : 0.9)) // px desde arriba hasta la línea de cero
  const areaPos = zeroY - MIN_BAR
  const areaNeg = PLOT_H - zeroY - MIN_BAR

  const media = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null
  const mediaY = media !== null && media > 0 ? zeroY - (media / posMax) * areaPos : null

  return (
    <div className="flex select-none" style={{ fontSize: 'var(--t-micro)' }}>
      {/* Canalón izquierdo fijo: hueco del plot + hueco de etiquetas + icono de cada carril */}
      <div className="flex-shrink-0" style={{ width: GUTTER }}>
        <div className="relative" style={{ height: PLOT_H }}>
          {mediaY !== null && (
            <span
              className="absolute right-0 -translate-y-1/2 pr-0.5 text-chalk-600"
              style={{ top: mediaY }}
            >
              x̄
            </span>
          )}
        </div>
        <div style={{ height: LABEL_H }} />
        {carriles.map((c, i) => (
          <div key={i} className="flex items-center justify-center text-chalk-600" style={{ height: CARRIL_H }}>
            {c.icono}
          </div>
        ))}
      </div>

      {/* Zona desplazable: plot + etiquetas + carriles, todo alineado por columnas de ancho COL */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: datos.length * COL }}>
          {/* Plot */}
          <div className="relative flex" style={{ height: PLOT_H }}>
            {/* Línea de cero */}
            <div className="absolute inset-x-0 border-t border-pitch-700" style={{ top: zeroY }} />
            {/* Línea de media */}
            {mostrarMedia && mediaY !== null && (
              <div
                className="absolute inset-x-0 border-t border-dashed border-chalk-600/60"
                style={{ top: mediaY }}
              />
            )}
            {datos.map((d, i) => {
              const ultimo = destacarUltimo && i === datos.length - 1
              return (
                <div key={i} className="relative flex-shrink-0" style={{ width: COL }}>
                  {renderBarra(estados[i], cortes, posMax, negMax, zeroY, areaPos, areaNeg, ultimo)}
                </div>
              )
            })}
          </div>

          {/* Etiquetas del eje X */}
          <div className="flex">
            {datos.map((d, i) => (
              <div
                key={i}
                className="flex-shrink-0 text-center text-chalk-600"
                style={{ width: COL, height: LABEL_H, lineHeight: `${LABEL_H}px` }}
              >
                {etiqueta(d)}
              </div>
            ))}
          </div>

          {/* Carriles */}
          {carriles.map((c, ci) => (
            <div key={ci} className="flex">
              {datos.map((d, i) => (
                <div
                  key={i}
                  className="flex flex-shrink-0 items-center justify-center"
                  style={{ width: COL, height: CARRIL_H }}
                >
                  {c.render(d)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function renderBarra(
  e: EstadoBarra,
  cortes: readonly [number, number, number, number],
  posMax: number,
  negMax: number,
  zeroY: number,
  areaPos: number,
  areaNeg: number,
  ultimo: boolean
): ReactNode {
  // SIN DATO: nada.
  if (e.tipo === 'sin_dato') return null

  const anillo = ultimo ? 'ring-2 ring-white/70' : ''
  const base = 'absolute rounded-sm'
  const izq = { left: '50%', width: BAR_W, marginLeft: -BAR_W / 2 } as const

  // NO JUGÓ: barra mínima punteada y tenue, sobre la línea de cero.
  if (e.tipo === 'no_jugo') {
    return (
      <div
        className={`${base} border border-dashed border-chalk-600/50 ${anillo}`}
        style={{ ...izq, bottom: `calc(100% - ${zeroY}px)`, height: MIN_BAR }}
      />
    )
  }

  const v = e.v

  // 0: barra mínima sólida.
  if (v === 0) {
    return (
      <div
        className={`${base} bg-chalk-600/40 ${anillo}`}
        style={{ ...izq, bottom: `calc(100% - ${zeroY}px)`, height: MIN_BAR }}
      />
    )
  }

  const color = PALETA_FONDO[escalon(v, cortes)]

  // Positivo: crece hacia arriba desde la línea de cero.
  if (v > 0) {
    const h = Math.max(MIN_BAR, Math.round((v / posMax) * areaPos))
    return (
      <div
        className={`${base} ${color} ${anillo}`}
        style={{ ...izq, bottom: `calc(100% - ${zeroY}px)`, height: h }}
      />
    )
  }

  // Negativo: crece hacia abajo desde la línea de cero.
  const h = Math.max(MIN_BAR, Math.round((-v / negMax) * areaNeg))
  return (
    <div
      className={`${base} ${color} ${anillo}`}
      style={{ ...izq, top: zeroY, height: h }}
    />
  )
}
