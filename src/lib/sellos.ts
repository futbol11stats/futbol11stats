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

// Clasifica una competición a su sello. 3ª RFEF/Play Off Tercera -> Tercera; Nacional Juvenil -> RFEF;
// el resto (Preferente, 1ª/2ª Aficionados, autonómicas, copas regionales...) -> RFFM.
export function selloDe(nombreComp: string | null): string {
  const n = norm(nombreComp)
  // Copas primero: "Copa ... RFEF/Federación" -> sello Copa RFEF; cualquier otra copa -> Copa RFFM.
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

// Algunos logos necesitan círculo blanco detrás para contrastar sobre el fondo oscuro.
export function selloNecesitaCirculo(src: string): boolean {
  return src === SELLO_RFEF || src === SELLO_RFFM
}
