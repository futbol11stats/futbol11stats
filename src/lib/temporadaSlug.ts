// FUENTE ÚNICA de la conversión codtemporada <-> slug de temporada en la URL. Sustituye a los cinco mapas
// estáticos que había (competición TEMPORADA_MAP/COD_TO_LABEL/TEMPORADAS_ORD, seo TEMP_LABEL_BY_COD, jugador
// TEMP_LABEL + su inverso), todos topados a mano en T21. Es una RELACIÓN LINEAL, verificada contra el dato
// (web_grupos.nombre_temporada): cod 17 = 2021-2022 ... cod 22 = 2026-2027, secuencial y sin gaps. Por eso NO
// hay lista que mantener: una temporada nueva funciona sola en cuanto el pipeline la carga (en septiembre las
// ligas T22 no vuelven a romperse). El slug de URL es la forma CORTA "YYYY-YY" (2026-27); la larga "2026-2027"
// vive en nombre_temporada y no se usa en rutas.

export const TEMP_COD_BASE = 17     // cod de la temporada ancla
export const TEMP_YEAR_BASE = 2021  // año de inicio de esa temporada (2021-22)
export const TEMP_COD_MIN = TEMP_COD_BASE // suelo del universo mostrado en selectores (inicio de datos del sitio)

// cod -> "2026-27". Derivado; válido para cualquier temporada futura.
export function codToSlug(cod: number): string {
  const y = TEMP_YEAR_BASE + (cod - TEMP_COD_BASE)
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`
}

// "2026-27" -> 22, o null si el slug no tiene forma válida (el segundo par debe ser el año siguiente; rechaza
// "2025-99", "abc"...). No comprueba que la temporada EXISTA en BD: de eso se encarga la consulta posterior
// (getGrupo/getJugador... -> notFound si no hay filas).
export function slugToCod(slug: string): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(slug)
  if (!m) return null
  const y = Number(m[1])
  if ((y + 1) % 100 !== Number(m[2])) return null
  return TEMP_COD_BASE + (y - TEMP_YEAR_BASE)
}

// Universo de temporadas (cods) a ofrecer en un selector: [top .. TEMP_COD_MIN] descendente. `top` sale del
// DATO (temporada más nueva con filas de esa competición), no de una constante -> el techo se auto-extiende
// cuando aparece una temporada nueva, sin registrarla a mano.
export function universoTemporadas(top: number): number[] {
  const t = Math.max(top, TEMP_COD_MIN)
  const out: number[] = []
  for (let c = t; c >= TEMP_COD_MIN; c--) out.push(c)
  return out
}
