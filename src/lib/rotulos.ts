// Rótulos de ESTADO DE PARTIDO, en un módulo SIN DEPENDENCIAS a propósito.
//
// Viven aquí y no en lib/partido.ts porque los pintan también componentes CLIENTE (Trayectoria, Jornadas), y
// lib/partido.ts importa el cliente de Supabase: importarlo desde el cliente arrastraría toda esa cadena al
// bundle del navegador. Un fichero de constantes puras lo evita. lib/partido.ts los reexporta para no romper
// a quien ya los importaba de allí.
//
// Antes de centralizarlos había 'Susp.' escrito a mano en dos componentes, fuera de cualquier constante: el
// día que cambió el vocabulario (hoy) esos dos no se habrían enterado.

// Resultado administrativo (web_resultados.incidencia): el partido NO se jugó pero YA tiene resultado.
// Deliberadamente no dice "incomparecencia" ni "retirada": `incidencia` marca el LADO, no la causa.
export const NO_DISPUTADO = 'No disputado · resultado administrativo'

// Suspendido (web_resultados.estado_partido): el acta existe y no está cerrada.
//
// GENÉRICO A PROPÓSITO, por el mismo motivo que NO_DISPUTADO: el dato NO dice por qué se suspendió ni en qué
// minuto. "Suspendido en el minuto 63" o "por lluvia" sería inventar. "Acta pendiente de cerrar" es
// exactamente lo que el dato sostiene, y vale igual para los ocho casos — se suspendiera antes de empezar o
// a falta de diez minutos.
//
// TRES LONGITUDES, UNA SOLA VERDAD: el mismo hecho tiene que caber en la celda del marcador de la rejilla de
// 390px, en el chip de la ficha y en la fila de la lista.
export const SUSPENDIDO = 'Acta pendiente de cerrar'
export const SUSPENDIDO_CORTO = 'Acta pendiente'
export const SUSPENDIDO_MINI = 'Acta'

// Provisional (web_resultados.computa=false, decisión 2026-10-26, opción A): el marcador está publicado pero el
// acta sigue abierta. El pipeline no lo computa: elo_post llega NULL y el partido no entra en forma, rachas ni
// cara a cara. Se ENSEÑA (marcador + marca), no se cuenta.
//
// Distinto de SUSPENDIDO: el suspendido NO tiene marcador; el provisional sí.
export const PROVISIONAL = 'Provisional · Acta abierta'
export const PROVISIONAL_CORTO = 'Provisional'
export const PROVISIONAL_MINI = 'Prov.'

// LA regla, en un solo sitio: marcador publicado Y computa=false. `computa` NULL/ausente = true (default de la
// columna, y filas leídas con un select que no la trae): ausencia no es "provisional".
export function esProvisional(r: { goles_local?: unknown; goles_visitante?: unknown; computa?: unknown }): boolean {
  return r.goles_local != null && r.goles_visitante != null && r.computa === false
}

// Equipo retirado de la competición (web_clasificacion.retirado). La RFFM lo deja en la última fila con 0
// puntos y zona de descenso; el puesto que trae (N) es solo el hueco que ocupa, no un puesto ganado. Donde se
// pintaría el número va este rótulo.
export const RETIRADO = 'Retirado'

// Explicación del método del ELO, al pie del bloque "Nivel" de la ficha de jugador. Vive aquí y no dentro
// del componente por la misma razón que los de arriba: un rótulo escrito a mano dentro de un .tsx acaba
// teniendo una segunda copia en otro sitio — ya pasó con 'Susp.'.
export const ELO_METODO =
  'Compara los puntos del jugador en cada partido con la media de su propio equipo: sube si destaca dentro del equipo y baja si no.'
