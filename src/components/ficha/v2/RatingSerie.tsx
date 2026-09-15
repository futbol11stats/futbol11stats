import { tempLabel } from '@/lib/jugador'

// Trayectoria SECUNDARIA del Rating F11S por temporada (3ª RFEF). Estructura de la maqueta aprobada, con TOKENS
// del sitio (no los de la maqueta). Cada valor es el PERCENTIL de ESA temporada (0-100): "mejor que ese % de la
// categoría ese año", NO una escala absoluta como el ELO. Barras en escala fija 0-100 + escala 0/50/100 + LÍNEA
// DE MEDIANA (percentil 50) punteada = reutiliza el tratamiento de .avg-line (referencia del gráfico de
// jornadas), que da el significado: por encima = mejor que media de su categoría. Eje CRONOLÓGICO acotado al
// tramo CON DATO (primera→última con rating); una temporada sin 3ª RFEF EN MEDIO = hueco (línea punteada +
// "no jugó"), distinto de un rating bajo (barra corta). NO se extiende a la temporada activa (evita el hueco
// falso de la temporada aún inmadura). Un punto vale; null/vacío -> no se pinta.
type PuntoR = { t: string; r: number }
const colR = (r: number) => (r >= 66 ? 'var(--e3)' : r >= 40 ? 'var(--e2)' : 'var(--e1)')

export default function RatingSerie({ serie }: { serie: { t: string; r: number }[] | null | undefined }) {
  const pts = [...(serie || [])]
    .filter((p): p is PuntoR => !!p && typeof p.r === 'number' && p.t != null)
    .sort((a, b) => Number(a.t) - Number(b.t))
  if (pts.length === 0) return null
  const byCod = new Map(pts.map((p) => [Number(p.t), p.r]))
  const first = Number(pts[0].t), last = Number(pts[pts.length - 1].t)
  const cods: number[] = []
  for (let c = first; c <= last; c++) cods.push(c)

  return (
    <>
      <div className="cap" style={{ marginTop: 14 }}>Rating por temporada · percentil</div>
      <div className="rs-chart">
        <div className="rs-yaxis"><span style={{ top: 0 }}>100</span><span style={{ top: '50%' }}>50</span><span style={{ top: '100%' }}>0</span></div>
        <div className="rs-plot">
          {/* Mediana (percentil 50): mismo punteado que .avg-line. Por encima = mejor que la mitad de la categoría. */}
          <div className="rs-med" aria-hidden="true" /><span className="rs-med-lbl">mediana</span>
          <div className="rs-bars">
            {cods.map((c) => {
              const r = byCod.get(c)
              if (r == null) return (
                <div key={c} className="rs-col" title={`${tempLabel(String(c))}: no jugó en 3ª RFEF`}>
                  <span className="rs-gap" aria-hidden="true" /><span className="rs-gaplbl">no jugó</span>
                </div>
              )
              return (
                <div key={c} className="rs-col" title={`${tempLabel(String(c))}: ${r}/100 — percentil de la temporada`}>
                  <div className="rs-bar" style={{ height: `${Math.max(2, Math.min(100, r))}%`, background: colR(r) }}><span className="rs-val">{r}</span></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="rs-xaxis">{cods.map((c) => <span key={c}>{tempLabel(String(c))}</span>)}</div>
      <div className="batt-lbl">Percentil en su categoría: mejor que ese % de 3ª RFEF esa temporada.</div>
    </>
  )
}
