// Badge de CATEGORÍA DE EDAD por temporada (Juvenil / Sub-23), derivado del AÑO DE NACIMIENTO relativo al año
// de inicio de la temporada seleccionada. Es un hecho de categoría POR TEMPORADA, no una propiedad fija del
// jugador: un nacido en 2004 es sub-23 en 2026-27 y ya no en 2028-29. Por eso se calcula siempre contra la
// temporada mirada, nunca contra "hoy".
//
// Corte (edad = añoInicioTemporada − añoNacimiento), excluyente y con prioridad al más joven:
//   · Juvenil : edad ≤ 18   (nacido en Y−18 o después)
//   · Sub-23  : edad 19..22  (nacido entre Y−22 y Y−19)
//   · null    : edad ≥ 23    (sin badge)  ·  o falta el año (silencio, nunca inventar)
//
// NUNCA se expone el año de nacimiento de un menor: esta función solo produce el badge derivado. Como el año
// solo vive en web_jugador (adultos con ficha), a los menores sin ficha no se les puede calcular aquí — para
// ellos el badge lo publicará el pipeline en la fila de plantilla (mismo corte); ver PETICION_PIPELINE_*.
export type BadgeEdad = 'juvenil' | 'sub23' | null

// El corte, aplicado a una EDAD ya calculada. Úsalo con la edad de HOY (identidad actual del jugador) o con la
// edad de una temporada concreta (registro histórico) — ver badgeEdad() para lo segundo.
export function badgeEdadDeEdad(edad: number | null | undefined): BadgeEdad {
  if (edad == null || edad < 0) return null   // sin dato o año futuro: silencio, no badge
  if (edad <= 18) return 'juvenil'
  if (edad <= 22) return 'sub23'
  return null
}

// Badge POR TEMPORADA: edad = añoInicioTemporada − añoNacimiento. Para el registro histórico (fila de plantilla).
export function badgeEdad(anioNacimiento: number | null | undefined, anioInicioTemporada: number | null | undefined): BadgeEdad {
  if (anioNacimiento == null || anioInicioTemporada == null) return null
  return badgeEdadDeEdad(anioInicioTemporada - anioNacimiento)
}

export const badgeEdadLabel = (b: BadgeEdad): string => (b === 'juvenil' ? 'Juvenil' : b === 'sub23' ? 'Sub-23' : '')
