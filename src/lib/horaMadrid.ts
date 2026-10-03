// ISO 8601 CON EL DESPLAZAMIENTO REAL de Europe/Madrid, para startDate/endDate de los datos estructurados.
//
// Google avisa cuando un startDate no lleva zona: interpreta la hora como UTC y un partido de las 12:00 se
// publica como las 13:00 o 14:00 segun la epoca del anio. Antes se emitia 'YYYY-MM-DDTHH:MM' pelado.
//
// Se implementa la REGLA europea en vez de tirar de Intl: CEST (+02:00) desde el ULTIMO domingo de marzo a
// las 01:00 UTC hasta el ULTIMO domingo de octubre a las 01:00 UTC; CET (+01:00) el resto. Asi es
// determinista y no depende de los datos de zonas del runtime (que en un build de Vercel podrian venir
// recortados). Peninsula, que es el ambito de la RFFM; Canarias tiene otra zona y no aplica.
const MIN_CET = 60
const MIN_CEST = 120

function ultimoDomingo(anio: number, mes0: number): number {
  // Ultimo dia del mes y se retrocede hasta el domingo.
  const ultimo = new Date(Date.UTC(anio, mes0 + 1, 0))
  return ultimo.getUTCDate() - ultimo.getUTCDay()
}

// Desplazamiento (en minutos) vigente en un INSTANTE dado. Los dos cortes son instantes UTC, asi que esto
// es exacto y no tiene el problema circular de preguntarselo a una hora local.
function offsetEnInstante(ms: number): number {
  const y = new Date(ms).getUTCFullYear()
  const inicio = Date.UTC(y, 2, ultimoDomingo(y, 2), 1, 0)
  const fin = Date.UTC(y, 9, ultimoDomingo(y, 9), 1, 0)
  return ms >= inicio && ms < fin ? MIN_CEST : MIN_CET
}

const dos = (n: number) => String(n).padStart(2, '0')
const sufijo = (min: number) => `${min < 0 ? '-' : '+'}${dos(Math.floor(Math.abs(min) / 60))}:${dos(Math.abs(min) % 60)}`

// Instante UTC de una hora LOCAL de Madrid. Dos pasadas: se supone CET, se mira que offset rige de verdad en
// ese instante y se recalcula. (En el salto de marzo hay una hora local que no existe y en el de octubre una
// que ocurre dos veces; son las 02:00-03:00 de un domingo de madrugada, donde no se juega al futbol.)
function instanteDeLocal(y: number, mes1: number, d: number, h: number, mi: number): number {
  const supuesto = Date.UTC(y, mes1 - 1, d, h, mi) - MIN_CET * 60000
  const off = offsetEnInstante(supuesto)
  return Date.UTC(y, mes1 - 1, d, h, mi) - off * 60000
}

// 'DD/MM/YYYY' + 'HH:MM' -> 'YYYY-MM-DDTHH:MM:00+02:00'. null si falta cualquiera de los dos o la hora es
// 00:00 (en los datos de la RFFM eso significa "sin horario confirmado", no medianoche).
export function isoMadrid(fecha: string | null | undefined, hora: string | null | undefined): string | null {
  const f = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(fecha || '').trim())
  const t = /^(\d{1,2}):(\d{2})$/.exec(String(hora || '').trim())
  if (!f || !t) return null
  const h = Number(t[1]), mi = Number(t[2])
  if (h === 0 && mi === 0) return null
  if (h > 23 || mi > 59) return null
  const y = Number(f[3]), mes = Number(f[2]), d = Number(f[1])
  const off = offsetEnInstante(instanteDeLocal(y, mes, d, h, mi))
  return `${f[3]}-${f[2]}-${f[1]}T${dos(h)}:${dos(mi)}:00${sufijo(off)}`
}

// Suma minutos a un ISO con desplazamiento y devuelve otro ISO con el desplazamiento que rige EN EL RESULTADO
// (un partido de 23:00 acaba al dia siguiente; uno de la noche del cambio de hora cambia de offset).
export function masMinutos(iso: string, minutos: number): string | null {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return null
  const fin = ms + minutos * 60000
  const off = offsetEnInstante(fin)
  const local = new Date(fin + off * 60000)
  return `${local.getUTCFullYear()}-${dos(local.getUTCMonth() + 1)}-${dos(local.getUTCDate())}`
    + `T${dos(local.getUTCHours())}:${dos(local.getUTCMinutes())}:00${sufijo(off)}`
}
