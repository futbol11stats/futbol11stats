// Pastilla cuadrada con el Δ ELO de un partido: verde (--e3) si sube, roja (--e0) si baja. Reutiliza la clase
// .chip de los puntos por jornada (mismo tamaño/proporción). Sin "+" en positivos (el verde ya lo dice); el
// "−" se mantiene en negativos. Compartida por el carril ELO de la ficha de jugador (Jornadas) y de equipo
// (JornadasEquipo) -> un solo sitio, no replicado. Devuelve null si no hay dato (jornada sin partido).
export default function EloChip({ eloDelta }: { eloDelta: number | null | undefined }) {
  if (eloDelta == null) return null
  const up = eloDelta >= 0
  return <span className="chip" style={{ background: up ? 'var(--e3)' : 'var(--e0)' }}>{up ? '' : '−'}{Math.abs(Math.round(eloDelta))}</span>
}
