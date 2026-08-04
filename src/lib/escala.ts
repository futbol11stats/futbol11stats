// Escala visual de 5 escalones (0 = negativo/muy bajo … 4 = muy alto) para métricas de rendimiento.
//
// Los mapas de clases son LITERALES COMPLETAS a propósito: el JIT de Tailwind purga cualquier clase
// que no aparezca textualmente en un fichero escaneado, así que nunca se construyen por concatenación
// (ni `text-${x}`, ni plantillas). (src/lib está en el `content` de tailwind.config.js.)

export const PALETA_TEXTO: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'text-red-400',
  1: 'text-amber-400',
  2: 'text-chalk-200',
  3: 'text-grass-300',
  4: 'text-grass-400',
}

export const PALETA_FONDO: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-red-500/20',
  1: 'bg-amber-500/20',
  2: 'bg-chalk-600/10',
  3: 'bg-grass-500/20',
  4: 'bg-grass-400/30',
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
