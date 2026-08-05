// Escala visual de 5 escalones para métricas de rendimiento:
//   0 = negativo (único escalón rojo)     red-400   #f87171
//   1 = bajo     (azul-pizarra frío)       slate-400 #94a3b8
//   2 = medio    (verde)                   grass-400 #22a050
//   3 = alto     (verde brillante)         grass-200 #2ee56b
//   4 = muy alto (verde claro)             grass-100 #8cf0a2
// El ÁMBAR está reservado en el resto del sitio a playoff, copa y estado disciplinario ("en ciclo de
// amarillas"); NO se usa como escalón de rendimiento (rompería el código de color). Ver PROTOCOLO.md.
//
// La rampa verde 2→3→4 usa grass-400 (existe) + grass-200 y grass-100 (nuevos en tailwind.config.js). Se
// salta grass-300 a propósito: quedaba casi idéntico a grass-400 y un 2 y un 3 no se distinguían en una
// barra de 24px. grass-300/400/500 no se tocan (siguen en uso en el resto del sitio). Los cinco tonos de
// TEXTO superan 4,5:1 de contraste sobre pitch-900.
//
// Los mapas de clases son LITERALES COMPLETAS a propósito: el JIT de Tailwind purga cualquier clase que no
// aparezca textualmente en un fichero escaneado, así que nunca se construyen por concatenación (ni
// `text-${x}`, ni plantillas). (src/lib está en el `content` de tailwind.config.js.)

export const PALETA_TEXTO: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'text-red-400',    // #f87171
  1: 'text-slate-400',  // #94a3b8
  2: 'text-grass-400',  // #22a050
  3: 'text-grass-200',  // #2ee56b
  4: 'text-grass-100',  // #8cf0a2
}

export const PALETA_FONDO: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-red-400/20',
  1: 'bg-slate-400/20',
  2: 'bg-grass-400/20',
  3: 'bg-grass-200/25',
  4: 'bg-grass-100/30',
}

// El escalón 0 (rojo) significa NEGATIVO y solo eso: se devuelve únicamente si `valor < 0`. Los valores
// no negativos se reparten entre los escalones 1..4 según los cortes (índice del último corte superado,
// +1; nunca por debajo de 1). Así un 0 real —p. ej. 0 puntos en un partido— cae en 1 (bajo), no en rojo.
// Con cortes empatados (p. ej. [1,1,2,4]) los peldaños coincidentes se colapsan sin romper el reparto;
// para descartar cortes degenerados antes de pintar, usar cortesValidos().
export function escalon(valor: number, cortes: readonly [number, number, number, number]): 0 | 1 | 2 | 3 | 4 {
  if (valor < 0) return 0
  let nivel: 1 | 2 | 3 | 4 = 1
  for (let i = 0; i < cortes.length; i++) {
    if (valor >= cortes[i]) nivel = (i + 1) as 1 | 2 | 3 | 4
  }
  return nivel
}

// ¿Los cortes son estrictamente crecientes? Si no (repetidos o desordenados), la rampa de 5 colores
// degenera y el consumidor debería caer a CORTES_FIJOS en vez de pintar peldaños indistinguibles.
export function cortesValidos(cortes: readonly [number, number, number, number]): boolean {
  return cortes[0] < cortes[1] && cortes[1] < cortes[2] && cortes[2] < cortes[3]
}

// puntosPartido: cortes REALES medidos sobre T21. Hallazgo: la distribución de puntos por partido es
// IDÉNTICA en las cinco categorías de aficionados (P10=0, P50=2, P80=4, P90=6 en todas). Por eso un único
// cuarteto fijo sirve para todo el sitio y esta métrica NO necesita umbrales por categoría — a diferencia
// de la media y el ELO, que sí varían entre categorías y vendrán de web_percentiles.
// Cobertura con [0,2,4,7]: escalón 1 (0-1) ≈45%, escalón 2 (2-3) ≈30%, escalón 3 (4-6) ≈17%, escalón 4 (7+) ≈8%.
//
// mediaPartido y elo siguen siendo PROVISIONALES hasta conectar los percentiles por categoría (web_percentiles).
export const CORTES_FIJOS = {
  puntosPartido: [0, 2, 4, 7],
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
