import { tempLabel } from '@/lib/jugador'

// Trayectoria SECUNDARIA del Rating F11S por temporada (3ª RFEF). NO es el dato principal (ese es reactivo, el de
// la temporada seleccionada); esto es contexto histórico. CLAVE (copy): cada valor es el PERCENTIL de ESA
// temporada (0-100) —"dónde se situó ese año"—, NO una escala absoluta como el ELO. Por eso barras en escala fija
// 0-100 (no un sparkline normalizado que se leería como "evolución"). EJE CRONOLÓGICO FIJO: una posición por
// temporada desde la primera con dato hasta la última con dato; una temporada SIN dato en medio se pinta como
// HUECO visible (punto gris, como el banquillo del gráfico), distinto de un rating bajo (barra corta de color).
// Un solo punto vale; null/vacío -> no se pinta el bloque.
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
  for (let c = first; c <= last; c++) cods.push(c)   // eje continuo: los huecos internos SÍ ocupan su hueco

  return (
    <>
      <div className="cap" style={{ marginTop: 13 }}>Rating por temporada · percentil</div>
      <div className="rating-serie" role="img" aria-label="Rating F11S por temporada: percentil de cada temporada en 3ª RFEF">
        {cods.map((c) => {
          const r = byCod.get(c)
          const lbl = tempLabel(String(c)).slice(2, 4)
          if (r == null) return (
            <span key={c} className="rs-col" title={`${tempLabel(String(c))}: sin 3ª RFEF`}>
              <span className="rs-bar-t"><span className="rs-gap" /></span>
              <span className="rs-lbl rs-lbl-gap">{lbl}</span>
            </span>
          )
          return (
            <span key={c} className="rs-col" title={`${tempLabel(String(c))}: ${r}/100 — percentil de la temporada`}>
              <span className="rs-bar-t"><span className="rs-fill" style={{ height: `${Math.max(8, Math.min(100, r))}%`, background: colR(r) }} /></span>
              <span className="rs-lbl">{lbl}</span>
            </span>
          )
        })}
      </div>
      <div className="batt-lbl">Dónde se situó cada año en la pirámide de aficionados. No es una escala absoluta como el ELO.</div>
    </>
  )
}
