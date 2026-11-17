// Tramo de una etapa en el gráfico «Puntos y ELO por jornada»: qué partidos del EQUIPO se pintan en la
// competición de una etapa. Se corta por FECHA, no por número de jornada (las jornadas de dos grupos no se
// corresponden, y en copa ni siquiera son jornadas).
//  - Empieza en la primera acta del jugador con ese equipo (convocado o con minutos).
//  - Termina justo antes de la primera acta con OTRO equipo posterior a su última acta con éste (la etapa
//    anterior puede acabar con jornadas de desconvocado). Si no hay ninguna posterior, es la etapa en curso:
//    llega a la última jornada disputada de su competición.
//  - Dentro del tramo, un partido del equipo sin acta suya pero con acta con su otro equipo (±3 días: la
//    misma jornada de fin de semana) es «con su otro equipo», no desconvocado. Es el vínculo filial/primer
//    equipo, y también la ida y vuelta: el tramo se alarga hasta la última acta con el equipo.
// Solo LIGA: copas y playoffs (codgrupo fam-*) se pintan como siempre, ni se recortan ni recortan a nadie.

export type ActaCrono = { codgrupo: string; codequipo: string | null; dia: string }   // dia = 'YYYY-MM-DD'
export type Tramo = { desde: string; hasta: string | null }   // hasta EXCLUSIVO; null = sin corte (etapa en curso)

export const esCopaGrupo = (codgrupo: string | null | undefined) => String(codgrupo ?? '').startsWith('fam-')

const DIA = /^\d{4}-\d{2}-\d{2}$/
const ms = (d: string) => Date.parse(`${d}T12:00:00Z`)
const MARGEN_DIAS = 3

export function tramoDeGrupo(actas: ActaCrono[], codgrupo: string): Tramo | null {
  const ord = actas.filter((a) => DIA.test(a.dia) && !esCopaGrupo(a.codgrupo)).sort((a, b) => a.dia.localeCompare(b.dia))
  const propias = ord.filter((a) => a.codgrupo === codgrupo)
  if (!propias.length) return null
  const ultima = propias[propias.length - 1].dia
  const siguiente = ord.find((a) => a.codgrupo !== codgrupo && a.dia > ultima)
  return { desde: propias[0].dia, hasta: siguiente?.dia ?? null }
}

// Partido del equipo SIN acta del jugador: 'fuera' (no se pinta), 'otro_equipo' o 'no_jugo' (desconvocado).
// Sin fecha conocida no se puede situar: se queda como hasta ahora ('no_jugo'). Con 'otro_equipo' va el acta
// del otro equipo (para nombrarlo).
export type Ausencia = { tipo: 'fuera' | 'no_jugo' } | { tipo: 'otro_equipo'; acta: ActaCrono }
export function clasificarAusencia(
  dia: string | null, tramo: Tramo | null, actas: ActaCrono[], codgrupo: string, codequipo: string | null,
): Ausencia {
  if (!tramo || !dia || !DIA.test(dia)) return { tipo: 'no_jugo' }
  if (dia < tramo.desde || (tramo.hasta != null && dia >= tramo.hasta)) return { tipo: 'fuera' }
  const t = ms(dia)
  const otra = actas.find((a) => a.codgrupo !== codgrupo && !esCopaGrupo(a.codgrupo) && DIA.test(a.dia)
    && (codequipo == null || String(a.codequipo) !== String(codequipo))
    && Math.abs(ms(a.dia) - t) <= MARGEN_DIAS * 86400000)
  return otra ? { tipo: 'otro_equipo', acta: otra } : { tipo: 'no_jugo' }
}
