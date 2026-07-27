// Sellos federativos self-hospedados en /public/sellos (nada de hotlinking).
// Convención dual: mini-sello delante del nombre CORTO en tablas/chips; sello grande +
// DENOMINACIÓN OFICIAL en las cabeceras de página de competición.

export const SELLO_TERCERA = '/sellos/tercera-federacion.svg'  // Tercera Federación (RFEF)
export const SELLO_RFEF = '/sellos/rfef.svg'                    // RFEF (Liga Nacional Juvenil)
export const SELLO_RFFM = '/sellos/rffm.png'                    // RFFM (resto de regionales)
export const SELLO_COPA_RFFM = '/sellos/copa-rffm.png'          // Copa RFFM (pastilla circular, fondo propio)
export const SELLO_COPA_RFEF = '/sellos/copa-rfef.png'          // Copa RFEF / Copa Federación (pastilla circular)

function norm(s: string | null): string {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ªº]/g, '').toLowerCase()
}

// EXCEPCIÓN: las "Final Copa 1ª División Autonómica" (Aficionado/Juvenil) NO son la Copa RFFM: son la
// final por el título de Autonómica entre los campeones de los dos grupos -> llevan el botón RFFM.
// Matching por NOMBRE EXACTO (normalizado), no por contener "Copa".
const FINALES_AUTONOMICA = new Set([
  norm('Final Copa 1ª División Autonómica Aficionado'),
  norm('Final Copa 1ª División Autonómica Juvenil'),
])

// Clasifica una competición a su sello. Final Autonómica -> RFFM (excepción); 3ª RFEF/Play Off Tercera
// -> Tercera; Nacional Juvenil -> RFEF; copas -> Copa RFEF/RFFM; el resto de regionales -> RFFM.
export function selloDe(nombreComp: string | null): string {
  const n = norm(nombreComp)
  if (FINALES_AUTONOMICA.has(n)) return SELLO_RFFM
  // Copas: "Copa ... RFEF/Federación" -> sello Copa RFEF; cualquier otra copa -> Copa RFFM.
  if (n.includes('copa')) return n.includes('rfef') ? SELLO_COPA_RFEF : SELLO_COPA_RFFM
  if (n.includes('tercera') || /\b3\s*rfef\b/.test(n)) return SELLO_TERCERA
  if (n.includes('nacional juvenil')) return SELLO_RFEF
  return SELLO_RFFM
}

// Denominación OFICIAL para H1/metadata de la cabecera de competición. null = conserva el nombre actual.
export function nombreOficial(nombreComp: string | null): string | null {
  const n = norm(nombreComp)
  if (/\b3\s*rfef\b/.test(n) && !n.includes('play off') && !n.includes('copa')) return 'Tercera Federación'
  if (n === norm('3ª RFEF') ) return 'Tercera Federación'
  if (n.includes('nacional juvenil')) return 'Liga Nacional Juvenil'
  return null
}

// Nombre corto de una copa para pastillas/chips ("Copa RFEF" / "Copa RFFM").
export function nombreCortoCopa(nombreComp: string | null): string {
  return norm(nombreComp).includes('rfef') ? 'Copa RFEF' : 'Copa RFFM'
}

// Los botones-sello nuevos (Tercera/RFEF/RFFM) y las pastillas de copa son insignias
// autocontenidas (disco con su propio fondo) -> ya no hace falta círculo blanco detrás.
export function selloNecesitaCirculo(_src: string): boolean {
  return false
}
