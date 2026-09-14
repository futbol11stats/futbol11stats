import { tempLabel } from '@/lib/jugador'

// Trayectoria del Rating F11S por temporada (3ª RFEF). CLAVE (copy): cada valor es el PERCENTIL de ESA
// temporada (0-100) — "dónde se situó en la pirámide de aficionados ese año"—, NO una escala absoluta como el
// ELO. Por eso se pinta como BARRAS en escala fija 0-100 (no un sparkline normalizado min/max, que se leería
// como "evolución" absoluta y sería el ELO otra vez). Solo temporadas PRESENTES (no se interpolan huecos: sin
// barra la temporada que falta); un solo punto es válido; null/vacío -> no se pinta el bloque.
type PuntoR = { t: string; r: number }
const colR = (r: number) => (r >= 66 ? 'var(--e3)' : r >= 40 ? 'var(--e2)' : 'var(--e1)')

export default function RatingSerie({ serie }: { serie: { t: string; r: number }[] | null | undefined }) {
  const pts = [...(serie || [])]
    .filter((p): p is PuntoR => !!p && typeof p.r === 'number' && p.t != null)
    .sort((a, b) => Number(a.t) - Number(b.t))
  if (pts.length === 0) return null
  return (
    <>
      <div className="rating-serie" role="img" aria-label="Rating F11S por temporada: percentil de cada temporada">
        {pts.map((p) => (
          <span key={p.t} className="rs-col" title={`${tempLabel(p.t)}: ${p.r}/100 — percentil de la temporada`}>
            <span className="rs-bar-t"><span className="rs-fill" style={{ height: `${Math.max(8, Math.min(100, p.r))}%`, background: colR(p.r) }} /></span>
            <span className="rs-lbl">{tempLabel(p.t).slice(2, 4)}</span>
          </span>
        ))}
      </div>
      {/* Copy que evita leerlo como el ELO: es percentil por año, no escala absoluta ni "evolución". */}
      <div className="batt-lbl">Por temporada — dónde se situó cada año (percentil, no una escala absoluta).</div>
    </>
  )
}
