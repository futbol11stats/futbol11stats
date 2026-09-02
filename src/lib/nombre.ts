// FUENTE ÚNICA del formato de nombres del sitio (personas y equipos). Sustituye a las variantes dispersas
// (formatNombre suelto, inicialesJugador, el split nombre/apellidos del héroe, y los cálculos inline).
// Reglas de oro (ver MANUAL_DE_ESTILO.md):
//   · Un nombre de persona NUNCA se trunca. Si no cabe, se ABREVIA el nombre de pila a inicial; los
//     apellidos van completos. Jamás puntos suspensivos.
//   · Capitalización normal (Title Case), nunca MAYÚSCULAS forzadas en la UI.
// El dato federativo llega como "APELLIDO1 APELLIDO2, NOMBRE" (o a veces sin coma).

const MINUS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'da', 'do', 'dos', 'van', 'von'])

const cap = (w: string) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w)

// Title Case respetando preposiciones/artículos en minúscula (salvo la primera palabra).
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && MINUS.has(w) ? w : cap(w)))
    .join(' ')
}

// Separa el dato federativo en {pila, apellidos}, ambos en Title Case.
export function partirNombre(raw: string | null | undefined): { pila: string; apellidos: string } {
  if (!raw) return { pila: '', apellidos: '' }
  const [ap = '', pi = ''] = raw.split(',').map((s) => s.trim())
  // Sin coma: asumimos que ya viene "Nombre Apellidos" o un único token.
  if (!pi) return { pila: '', apellidos: titleCase(ap) }
  return { pila: titleCase(pi), apellidos: titleCase(ap) }
}

// Nombre COMPLETO, Title Case: "Jesús Barroso Sánchez". (Reemplaza a formatNombre en la UI.)
export function nombreCompleto(raw: string | null | undefined): string {
  const { pila, apellidos } = partirNombre(raw)
  return pila ? `${pila} ${apellidos}`.trim() : apellidos
}

// Nombre ABREVIADO (formato por defecto de listas/filas/tablas): inicial de pila + apellidos completos.
// "BARROSO SÁNCHEZ, JESÚS" -> "J. Barroso Sánchez". Cabe sin truncar en las columnas del sitio.
export function abreviaNombre(raw: string | null | undefined): string {
  const { pila, apellidos } = partirNombre(raw)
  if (!apellidos) return pila
  if (!pila) return apellidos
  return `${pila.charAt(0)}. ${apellidos}`
}

// Iniciales de 2 letras para el avatar: inicial de pila + inicial del primer apellido. "JB".
// (Consolida las 4 copias previas: jugadorFila, FichaPartidoV2, FichaEquipoV2, campoXI.)
export function inicialesNombre(raw: string | null | undefined): string {
  const { pila, apellidos } = partirNombre(raw)
  const a = pila.charAt(0)
  const b = apellidos.charAt(0)
  return (a + b || pila.slice(0, 2) || apellidos.slice(0, 2)).toUpperCase()
}

// Normaliza UN token de nombre de equipo: siglas/comillas/una-letra intactas (mayúsculas), el resto Title
// Case respetando preposiciones.
function normTokEquipo(tok: string, i: number): string {
  if (tok.includes('.') || /['"]/.test(tok) || tok.length === 1) return tok.toUpperCase()
  if (tok.length <= 3 && !/[aeiouáéíóú]/i.test(tok)) return tok.toUpperCase() // siglas sin punto (RCD, UDA)
  const low = tok.toLowerCase()
  return i > 0 && MINUS.has(low) ? low : cap(low)
}

// Forma jurídica del club: sigla de letras con puntos (C.F., S.A.D., A.D., F.C., U.D., C.D., R.C.D.…).
const ES_SIGLA_JURIDICA = (t: string) => /^([A-ZÁÉÍÓÚ]\.)+$/.test(t)
// Filial: letra suelta entre comillas ('A', 'B', 'C') — SIEMPRE se conserva (distingue de verdad).
const ES_FILIAL = (t: string) => /^['"][A-ZÁÉÍÓÚ]['"]$/.test(t)

// Nombre de EQUIPO ÚNICO del sitio (capitalización normal, sin truncar). Se QUITA la forma jurídica
// (C.F., S.A.D., A.D.…) — no aporta nada al aficionado y es lo primero que sobra — conservando SIEMPRE la
// letra del filial ('A'/'B'). Último recurso si aún es muy largo: quitar la localidad (" de <sitio>").
// "LAS ROZAS C.F. 'A'" -> "Las Rozas 'A'"; "C.D.A. NAVALCARNERO 'A'" -> "Navalcarnero 'A'". El slug del
// enlace se calcula aparte con el nombre COMPLETO, así que no se rompen URLs.
export function nombreEquipo(raw: string | null | undefined): string {
  if (!raw) return ''
  const toks = raw.split(/\s+/).filter(Boolean)
  const kept = toks.filter((t) => ES_FILIAL(t) || !ES_SIGLA_JURIDICA(t))
  let out = kept.map((t, i) => normTokEquipo(t, i)).join(' ').trim()
  if (out.length > 26) out = out.replace(/\sde\s+\S+/i, '').trim() // último recurso: fuera la localidad
  return out
}

// Nombre de equipo COMPLETO (con forma jurídica), Title Case. Para contextos con sitio de sobra si hiciera
// falta; por defecto se usa el corto (nombreEquipo).
export function nombreEquipoCompleto(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.split(/\s+/).filter(Boolean).map((t, i) => normTokEquipo(t, i)).join(' ')
}
