import { unstable_cache } from 'next/cache'
import { supabase } from '@/lib/supabase'

// Última jornada JUGADA de un grupo, de la vista `web_ultima_jornada_jugada` que publica el pipeline.
// "Jugada" = con marcador Y sin `incidencia`; la definición vive en la vista, no aquí, para que web y
// pipeline no puedan discrepar.
//
// LA FILA AUSENTE ES AUSENCIA DE DATO, NO JORNADA 0. Un grupo que no ha jugado nada NO sale en la vista.
// Hoy es 1 de 91, pero en agosto son todos: ése es el caso normal, no la excepción.
//
// FUERA DE ALCANCE A PROPÓSITO: LA COPA. Sus resultados se publican bajo el codgrupo de FAMILIA y su
// clasificación bajo los numéricos, así que las dos claves no se encuentran y no hay fila. Además en copa
// la jornada no ordena nada (la página va por `ronda_slug`). No se puentea: quien llame a esto debe
// excluir copa antes.
export type UltimaJornada = {
  jornada: number
  partidos_jugados: number
  partidos_jornada: number
  jornadas_jugadas: number
}

const COLS = 'jornada, partidos_jugados, partidos_jornada, jornadas_jugadas'

// CACHÉ: etiqueta `comp:<codgrupo>` + UNA HORA de red de seguridad.
//
// La etiqueta es mejor que un tiempo a secas porque el pipeline YA la emite al cargar los resultados de ese
// grupo: la lectura se refresca exactamente cuando ese grupo juega. La hora es solo el respaldo por si un
// día no se emite — sin ella, el TTL serían 30 días y un fallo de emisión dejaría el redirect apuntando mal
// durante un mes.
//
// NI RASTRO DE `indices`: ese tag lo emite el pipeline en cualquier delta (todas las noches) y colgarlo de
// aquí sería repetir lo que se quitó el 21/10.
//
// No usa cacheComp porque su TTL son 30 días fijos.
const leer = (codgrupo: string, codtemporada: number) => unstable_cache(async () => {
  const { data, error } = await supabase.from('web_ultima_jornada_jugada')
    .select(COLS)
    .eq('codgrupo', String(codgrupo)).eq('codtemporada', codtemporada)
    // La vista trae una fila por (temporada, grupo), pero el orden va explícito igualmente: `fecha_ref` es
    // la fecha de REFERENCIA de la jornada (no la del partido) y el número de jornada solo rompe empates
    // exactos de fecha. Si algún día la vista devolviera más de una, se coge la que manda.
    .order('fecha_ref', { ascending: false }).order('jornada', { ascending: false })
    .limit(1)
  if (error) throw new Error(`[ultima-jornada] ${codgrupo}/${codtemporada}: ${error.message || 'error sin mensaje'}`)
  const row = (data || [])[0] as UltimaJornada | undefined
  return row ?? null
}, ['getUltimaJornadaJugada', 'v1', String(codgrupo), String(codtemporada)],
   { tags: [`comp:${codgrupo}`], revalidate: 3600 })()

// TRES estados, y la diferencia importa porque de esto cuelga un redirect:
//   - UltimaJornada -> el grupo ha jugado hasta esa jornada.
//   - null          -> el grupo NO ha jugado nada (fila ausente). Quien decide manda a la jornada 1.
//   - undefined     -> NO SE PUDO SABER (error transitorio de BD). Quien decide NO debe redirigir.
//
// Por qué el tercer estado: si un fallo de BD se confundiera con "no ha jugado nada", un hipo de medio
// minuto mandaría a TODO EL MUNDO a la jornada 1. Fallar en abierto —servir la página tal cual, como hoy—
// es siempre menos malo que mover al usuario a un sitio que no pidió.
//
// El throw queda DENTRO de unstable_cache, que no guarda rechazos: el error no se cachea una hora, se
// reintenta en la siguiente petición.
export async function getUltimaJornadaJugada(
  codgrupo: string,
  codtemporada: number,
): Promise<UltimaJornada | null | undefined> {
  try {
    return await leer(codgrupo, codtemporada)
  } catch {
    return undefined
  }
}
