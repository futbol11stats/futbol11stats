// Escala visual de 5 escalones para métricas de rendimiento:
//   0 = negativo (único escalón rojo)
//   1 = bajo     (azul-pizarra apagado y frío)
//   2 = medio    (verde)
//   3 = alto     (verde más claro)
//   4 = muy alto (verde claro)
// El ÁMBAR está reservado en el resto del sitio a playoff, copa y estado disciplinario ("en ciclo de
// amarillas"); NO se usa como escalón de rendimiento (rompería el código de color). Ver PROTOCOLO.md.
//
// Rampa de TEXTO pensada para leerse cómoda sobre el fondo pitch-900: todos los tonos superan 4,5:1 de
// contraste; la escala se distingue por tono, no por legibilidad. El escalón 2 sube a grass-400 (grass-500
// quedaba oscuro sobre pitch) y el 4 usa green-300 (Tailwind) porque grass solo tiene 300/400/500 y el 300
// lo ocupa ya el escalón 3. El FONDO sí mantiene el verde oscuro (grass-500) en el escalón 2.
//
// Los mapas de clases son LITERALES COMPLETAS a propósito: el JIT de Tailwind purga cualquier clase que no
// aparezca textualmente en un fichero escaneado, así que nunca se construyen por concatenación (ni
// `text-${x}`, ni plantillas). (src/lib está en el `content` de tailwind.config.js.)

export const PALETA_TEXTO: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'text-red-400',    // #f87171
  1: 'text-slate-400',  // #94a3b8
  2: 'text-grass-400',  // #22a050
  3: 'text-grass-300',  // #2dc768
  4: 'text-green-300',  // #86efac
}

export const PALETA_FONDO: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-red-500/20',
  1: 'bg-slate-500/20',
  2: 'bg-grass-500/20',
  3: 'bg-grass-400/25',
  4: 'bg-grass-300/30',
}

// Devuelve 0 si `valor` no llega al primer corte; en otro caso, el índice del último corte superado, +1.
// Con 4 cortes el resultado vive en 0..4.
export function escalon(valor: number, cortes: readonly [number, number, number, number]): 0 | 1 | 2 | 3 | 4 {
  if (valor < cortes[0]) return 0
  let nivel: 0 | 1 | 2 | 3 | 4 = 1
  for (let i = 1; i < cortes.length; i++) {
    if (valor >= cortes[i]) nivel = (i + 1) as 0 | 1 | 2 | 3 | 4
  }
  return nivel
}

// provisional: sustituir por percentiles por categoría y temporada cuando el pipeline los exporte.
export const CORTES_FIJOS = {
  puntosPartido: [1, 3, 5, 8],
  mediaPartido: [1.5, 2.5, 3.5, 4.5],
  elo: [850, 950, 1050, 1150],
} as const

export type RolPartido = 'completo' | 'sustituido' | 'expulsado' | 'entro' | 'no_jugo'

// Rol del jugador en un partido, a partir de los campos del acta. El orden de las comprobaciones es
// significativo y no debe alterarse.
export function derivarRol(titular: boolean, minutos: number, rojas: number, doblesAmarilla: number): RolPartido {
  if (!titular && minutos === 0) return 'no_jugo'
  if (rojas > 0 || doblesAmarilla > 0) return 'expulsado'
  if (!titular) return 'entro'
  if (minutos >= 90) return 'completo'
  return 'sustituido'
}
