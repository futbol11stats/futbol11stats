// FORMATO NUMÉRICO ÚNICO del sitio. Todo número de 4+ cifras (minutos, PF, ELO, partidos, goles
// acumulados, cualquier total) se pinta CON PUNTO DE MILLAR ("1.175", no "1154"). Ver MANUAL_DE_ESTILO.md.
//   EXCEPCIONES (no pasan por aquí): los DELTAS (+11, −24) y los AÑOS/temporadas (2026, "2025-26").
// `fmtNum` devuelve '—' para null/undefined (silencio); para números <1000 es un no-op (sin punto).
export function fmtNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Delta con signo explícito (+/−), SIN punto de millar (los deltas son pequeños por naturaleza). El menos
// es el signo tipográfico "−" (U+2212), no el guion.
export function fmtDelta(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return ''
  const r = Math.round(Number(n))
  return r >= 0 ? `+${r}` : `−${Math.abs(r)}`
}
