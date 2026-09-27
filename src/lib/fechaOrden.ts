// CLAVE DE ORDEN CRONOLÓGICO de un partido. Toma la fecha que HAYA, en este orden:
//   1) `fecha_iso` (DATE del pipeline) cuando viene;
//   2) `fecha` (DD/MM/AAAA, la de MOSTRAR) convertida a ISO;
//   3) centinela, que manda la fila al FINAL y no al principio.
//
// POR QUÉ NO SE DEPENDE DE UNA SOLA: las dos existen y ninguna está garantizada. `fecha_iso` se publicó
// el 2026-09-25 poblada al 100% (130.243 filas, medido), y DOS DÍAS DESPUÉS un re-export dejó vacías las
// 322 filas de copa (fam-*) — justo las únicas para las que se había adoptado —. Como el código se había
// migrado a depender solo de ella, se quedaron SIN ELO las 279 pastillas de copa y los partidos de copa
// se fueron al final del feed .ics. Con las dos fuentes, cualquiera de los dos estados del dato funciona.
//
// El resultado es comparable como texto (ISO ordena lexicográficamente), que es como se usa.
export const FECHA_AL_FINAL = '9999-12-31'

const DDMMYYYY = /^(\d{2})\/(\d{2})\/(\d{4})$/

export function claveFecha(fechaIso: unknown, fecha: unknown): string {
  if (typeof fechaIso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fechaIso)) return fechaIso.slice(0, 10)
  const m = typeof fecha === 'string' ? DDMMYYYY.exec(fecha) : null
  return m ? `${m[3]}-${m[2]}-${m[1]}` : FECHA_AL_FINAL
}
