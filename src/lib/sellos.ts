// Sellos federativos self-hospedados en /public/sellos (nada de hotlinking).
// Convención dual: mini-sello delante del nombre CORTO en tablas/chips; sello grande +
// DENOMINACIÓN OFICIAL en las cabeceras de página de competición.

export const SELLO_TERCERA = '/sellos/tercera-federacion.svg'  // Tercera Federación (RFEF)
export const SELLO_RFEF = '/sellos/rfef.svg'                    // RFEF (Liga Nacional Juvenil)
export const SELLO_RFFM = '/sellos/rffm.png'                    // RFFM (resto de regionales)
export const SELLO_COPA_RFFM = '/sellos/copa-rffm.png'          // Copa RFFM (pastilla circular, fondo propio)
export const SELLO_COPA_RFEF = '/sellos/copa-rfef.png'          // Copa RFEF / Copa Federación (pastilla circular)

// Normaliza para el matching por nombre: quita acentos, ª/º y PUNTOS (los nombres históricos vienen
// con puntos: "COPA R.F.E.F.", "COPA R.F.F.M."), colapsa espacios y baja a minúsculas -> las variantes
// vieja y actual de una misma competición normalizan IGUAL.
function norm(s: string | null): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[ªº]/g, '').replace(/\./g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()
}

// TÍTULOS DE LIGA con sello RFFM (NO son copas): la "Final Copa 1ª División Autonómica" y el "Campeón
// de Madrid" son la final por el título entre los campeones de los dos grupos de la Autonómica/Preferente
// -> llevan el botón RFFM (no el de Copa). Matching por NOMBRE EXACTO (normalizado), no por "Copa".
const FINALES_AUTONOMICA = new Set([
  norm('Final Copa 1ª División Autonómica Aficionado'),
  norm('Final Copa 1ª División Autonómica Juvenil'),
  norm('CAMPEON DE MADRID - CATEGORIA PREFERENTE AFICIONADOS'),
  norm('CAMPEON DE MADRID - PRIMERA DIVISION AUTONOMICA JUVENIL'),
])

// Clasifica una competición a su sello. Final Autonómica -> RFFM (excepción); 3ª RFEF/Play Off Tercera
// -> Tercera; Nacional Juvenil -> RFEF; copas -> Copa RFEF/RFFM; el resto de regionales -> RFFM.
export function selloDe(nombreComp: string | null): string {
  const n = norm(nombreComp)
  if (FINALES_AUTONOMICA.has(n)) return SELLO_RFFM
  // Copa/Campeón/Final de la 1ª División Autonómica o Categoría Preferente: son el TÍTULO de esas ligas
  // regionales (no una copa) -> botón RFFM. Cubre todas las variantes históricas por nombre (Campeón de
  // Madrid, Copa Campeón Categoría Preferente, Copa Juveniles 1ª Div. Autonómica, Final Campeón…), como
  // red de seguridad para las superficies que resuelven por NOMBRE (índices). Va ANTES del "copa" porque
  // estos nombres llevan "Copa". No pisa "Copa RFEF Fase Autonómica" (dice "fase", no "división").
  if (n.includes('division autonomica') || n.includes('categoria preferente')) return SELLO_RFFM
  // Copas: "Copa ... RFEF/Federación" -> sello Copa RFEF; cualquier otra copa -> Copa RFFM.
  if (n.includes('copa')) return n.includes('rfef') ? SELLO_COPA_RFEF : SELLO_COPA_RFFM
  if (n.includes('tercera') || /\b3\s*rfef\b/.test(n)) return SELLO_TERCERA
  if (n.includes('nacional juvenil')) return SELLO_RFEF
  return SELLO_RFFM
}

// Denominación OFICIAL para H1/metadata de la cabecera de competición. null = conserva el nombre actual.
export function nombreOficial(nombreComp: string | null): string | null {
  const n = norm(nombreComp)
  // Denominación oficial desde 2023-24 (antes "Tercera RFEF"). Solo en superficies con espacio; las
  // pastillas/tablas/trayectorias siguen usando "3ª RFEF" (segmentos propios, no nombreOficial).
  if (/\b3\s*rfef\b/.test(n) && !n.includes('play off') && !n.includes('copa')) return 'Tercera Federación RFEF'
  if (n === norm('3ª RFEF') ) return 'Tercera Federación RFEF'
  if (n.includes('nacional juvenil')) return 'Liga Nacional Juvenil'
  return null
}

// Nombre corto + ACENTO de color de cada pastilla de competición, por NOMBRE EXACTO normalizado (como
// la excepción de sellos — nada de "contiene copa"). Liga y lo no mapeado -> verde.
export type AcentoPastilla = 'verde' | 'azul' | 'rojo'
const COMP_MAP: Record<string, { corto: string; color: AcentoPastilla }> = {
  [norm('Copa RFEF Fase Autonómica')]:                    { corto: 'Copa RFEF',           color: 'azul' },
  [norm('Final Copa RFEF Fase Autonómica')]:              { corto: 'Final Copa RFEF',     color: 'azul' },
  [norm('Final Copa 1ª División Autonómica Aficionado')]: { corto: 'Final 1ª Autonómica', color: 'verde' },
  [norm('Final Copa 1ª División Autonómica Juvenil')]:    { corto: 'Final 1ª Autonómica', color: 'verde' },
  // Play Off de ascenso: es el DESENLACE de la liga, no una copa -> acento VERDE (criterio Final
  // Autonómica) y sello de Tercera (lo resuelve selloDe por "tercera"). Match por nombre exacto.
  [norm('Play Off Tercera Federación')]:                  { corto: 'Play Off 3ª RFEF',    color: 'verde' },
  // Copa RFFM histórica (aficionados): mismo criterio que la Copa de Aficionados RFFM -> rojo. El corto
  // ya sale del fallback, pero se fija aquí para el COLOR. (norm quita los puntos: "COPA R.F.F.M." -> "copa rffm").
  [norm('COPA R.F.F.M.')]:                                { corto: 'Copa RFFM',           color: 'rojo' },
  [norm('FINAL COPA R.F.F.M.')]:                          { corto: 'Final Copa RFFM',     color: 'rojo' },
  // Campeón de Madrid: título de LIGA (no copa) -> sello RFFM (FINALES_AUTONOMICA) + acento VERDE.
  [norm('CAMPEON DE MADRID - CATEGORIA PREFERENTE AFICIONADOS')]:  { corto: 'Campeón de Madrid', color: 'verde' },
  [norm('CAMPEON DE MADRID - PRIMERA DIVISION AUTONOMICA JUVENIL')]: { corto: 'Campeón de Madrid', color: 'verde' },
}

// Denominación LIMPIA (completa) de copa/playoff para la CABECERA/breadcrumb de la página de
// competición: los nombres históricos vienen con puntos y en mayúsculas ("COPA R.F.E.F. FASE
// AUTONOMICA", "PLAY OFF TERCERA FEDERACION"). norm() las normaliza igual que la forma actual, así que
// cualquier variante cae en su denominación canónica. No mapeada -> el nombre tal cual.
const DENOM_LIMPIA: Record<string, string> = {
  [norm('Copa RFEF Fase Autonómica')]:       'Copa RFEF Fase Autonómica',
  [norm('Final Copa RFEF Fase Autonómica')]: 'Final Copa RFEF Fase Autonómica',
  [norm('COPA R.F.F.M.')]:                    'Copa RFFM',
  [norm('FINAL COPA R.F.F.M.')]:              'Final Copa RFFM',
  [norm('Play Off Tercera Federación')]:      'Play Off Tercera Federación',
}
export function denominacion(nombreComp: string | null): string {
  return DENOM_LIMPIA[norm(nombreComp)] ?? (nombreComp || '')
}

// Modelo de FAMILIA de copas (Fase 3): cada familia agrupa todas las rondas/temporadas de una copa
// bajo un slug estable. Los honores del JSONB traen slug_familia -> la pastilla usa el nombre corto,
// sello y color de la FAMILIA (consistentes), no el de la competicion suelta de esa ronda (que varía).
const FAMILIA: Record<string, { corto: string; sello: string; color: AcentoPastilla }> = {
  'copa-rfef':                                   { corto: 'Copa RFEF',              sello: SELLO_COPA_RFEF, color: 'azul' },
  'copa-rffm':                                   { corto: 'Copa RFFM',              sello: SELLO_COPA_RFFM, color: 'rojo' },
  'playoff-tercera':                             { corto: 'Play Off 3ª RFEF',       sello: SELLO_TERCERA,   color: 'verde' },
  'copa-primera-division-autonomica-aficionado': { corto: 'Copa 1ª Autonómica',     sello: SELLO_RFFM,      color: 'verde' },
  'copa-primera-division-autonomica-juvenil':    { corto: 'Copa 1ª Autonómica Juv.', sello: SELLO_RFFM,     color: 'verde' },
}
export const familiaCorto = (slug?: string | null, nombreComp?: string | null): string =>
  (slug && FAMILIA[slug]?.corto) || nombreCortoCopa(nombreComp ?? null)
export const familiaSello = (slug?: string | null, nombreComp?: string | null): string =>
  (slug && FAMILIA[slug]?.sello) || selloDe(nombreComp ?? null)
export const familiaColor = (slug?: string | null, nombreComp?: string | null): AcentoPastilla =>
  (slug && FAMILIA[slug]?.color) || colorPastilla(nombreComp ?? null)

// Nombre corto de una copa para pastillas/chips.
export function nombreCortoCopa(nombreComp: string | null): string {
  const n = norm(nombreComp)
  if (COMP_MAP[n]) return COMP_MAP[n].corto
  if (n.includes('copa de aficionados rffm')) return 'Copa RFFM'
  return n.includes('rfef') ? 'Copa RFEF' : 'Copa RFFM'
}

// Acento de color de la pastilla de competición (liga -> verde; copas por tipo).
export function colorPastilla(nombreComp: string | null): AcentoPastilla {
  const n = norm(nombreComp)
  if (COMP_MAP[n]) return COMP_MAP[n].color
  if (n.includes('copa de aficionados rffm')) return 'rojo'
  return 'verde'
}

// Los botones-sello nuevos (Tercera/RFEF/RFFM) y las pastillas de copa son insignias
// autocontenidas (disco con su propio fondo) -> ya no hace falta círculo blanco detrás.
export function selloNecesitaCirculo(_src: string): boolean {
  return false
}
