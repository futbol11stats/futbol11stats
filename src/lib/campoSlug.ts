// Slug de campo: codigo_campo + nombre (mismo patrón que club/equipo). PURO (sin imports de servidor) para
// poder usarse también en componentes cliente (el filtro por letra/localidad del índice, el buscador).
export function campoSlug(codigo: string | number, nombre: string | null): string {
  const base = (nombre || 'campo')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return base ? `${codigo}-${base}` : String(codigo)
}
export function codigoCampoFromSlug(slug: string): string {
  const m = /^(\d+)/.exec(slug || '')   // codigo_campo es numérico ("450", "300501", "13187593")
  return m ? m[1] : ''
}

// --- Superficie del campo (código del acta RFFM al final del nombre): HA/H.A. = hierba artificial, HB = hierba
// natural, T = tierra (no existe HN en el dato). PUROS (client-safe) para usarse en el buscador y en el marcado. ---
const SUPERFICIE: Record<string, string> = { HA: 'hierba artificial', HN: 'hierba natural', HB: 'hierba natural', T: 'tierra' }
// Separa el nombre del campo de su código de superficie final. `nombre` sin el código; `superficie` legible o null.
export function parseCampo(campo: string | null): { nombre: string; superficie: string | null } {
  if (!campo) return { nombre: '', superficie: null }
  const m = campo.match(/\s*\(([A-Za-z.]{1,4})\)\s*$/)   // paréntesis final de 1-4 letras/puntos (posible código)
  if (m) {
    const code = m[1].replace(/\./g, '').toUpperCase()   // "H.A." -> "HA"
    if (SUPERFICIE[code]) return { nombre: campo.slice(0, m.index).trim(), superficie: SUPERFICIE[code] }
  }
  return { nombre: campo.trim(), superficie: null }
}
// Texto para listas: "NOMBRE · superficie" (o solo nombre si no hay superficie conocida).
export function campoLabel(campo: string | null): string {
  const { nombre, superficie } = parseCampo(campo)
  return superficie ? `${nombre} · ${superficie}` : nombre
}
