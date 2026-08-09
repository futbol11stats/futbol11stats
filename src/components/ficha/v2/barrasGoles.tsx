import type { ReactNode } from 'react'

// Barra espejo de goles, compartida por la ficha de equipo y las Estadísticas de competición: encajados a
// la izquierda (rojo), marcados a la derecha (verde), centro = etiqueta o escudo. El número va SIEMPRE
// fuera de la barra (columna .gnum), legible sobre el fondo. `pj` activa el ratio por partido: 26 (1,5).
// `soloGf` deja solo el lado verde (goles por tramo del partido). Misma escala (maxBar) en todas las filas.
const ratioStr = (n: number, d: number | null | undefined) => (d ? `(${(n / d).toFixed(1).replace('.', ',')})` : '')

function gNum(val: number, rat: string, col: string, side: 'gc' | 'gf') {
  return val > 0
    ? <span className={`gnum ${side}`} style={{ color: col }}>{val}{rat ? <span className="tb-r">{rat}</span> : null}</span>
    : <span className={`gnum ${side}`} />
}

export function EspejoHead() {
  return (
    <div className="tramo-head">
      <div className="th-gn" /><div className="th">◀ Encajados</div><div className="th-mid" /><div className="th r">Marcados ▶</div><div className="th-gn" />
    </div>
  )
}

export function FilaEspejo({ center, gc, gf, maxBar, pj, soloGf }: {
  center: ReactNode; gc: number; gf: number; maxBar: number; pj?: number | null; soloGf?: boolean
}) {
  return (
    <div className="tramo">
      {soloGf
        ? <><span className="gnum gc" /><div className="tramo-side gc" /></>
        : <>{gNum(gc, pj ? ratioStr(gc, pj) : '', 'var(--e0)', 'gc')}<div className="tramo-side gc">{gc > 0 && <div className="tramo-b gc" style={{ width: `${(gc / maxBar) * 100}%` }} />}</div></>}
      <div className="tramo-lbl">{center}</div>
      <div className="tramo-side">{gf > 0 && <div className="tramo-b gf" style={{ width: `${(gf / maxBar) * 100}%` }} />}</div>
      {gNum(gf, pj ? ratioStr(gf, pj) : '', 'var(--e3)', 'gf')}
    </div>
  )
}
