// Llama del PRIME: píxel-art 11×14 que se rellena de abajo arriba según el porcentaje.
// Borde rojo (1), cuerpo naranja (2), núcleo amarillo (3); lo que aún no arde va en apagado.
//
// EN SVG, NO EN DIVS, a propósito: son 154 celdas por jugador y un listado de 20 sería ~3.000 nodos.
// Aquí cada fila se agrupa en TRAMOS contiguos del mismo color — una fila apagada es UN solo <rect>,
// una encendida son 3-5 —, así que la llama baja de 154 celdas a ~14 formas apagada y ~50 encendida.
// Ojo con la cuenta al presupuestar HTML: 20 jugadores son ~900 <rect>, no ~100.
//
// `px` es el lado de cada celda en px y debe ser ENTERO: el viewBox es 11×14 y shape-rendering
// crispEdges solo mantiene el borde nítido si la escala es exacta (px=3 → 33×42, px=9 → 99×126).
// flex:none para que una fila flex no lo comprima y rompa esa escala.
const MASK = [
  '.....1.....', '....11.....', '....121....', '...12221...',
  '...12221...', '..1222221..', '..1223221..', '.122333221.',
  '.122333221.', '12233333221', '12233333221', '12233333221',
  '.123333321.', '..1233321..',
] as const

const COLS = 11
const ROWS = MASK.length
const TONO: Record<string, string> = { '1': '#E0452B', '2': '#F97316', '3': '#FCD34D' }
const APAGADO = '#33475C'

export default function Prime({ pct, px = 3, className, decorativo }: {
  pct: number | null
  px?: number
  className?: string
  decorativo?: boolean   // el % va escrito al lado -> la llama no lo repite al lector de pantalla
}) {
  if (pct == null) return null
  const p = Math.max(0, Math.min(100, pct))
  const encendidas = Math.round((p * ROWS) / 100)

  const tramos: { x: number; y: number; w: number; fill: string }[] = []
  for (let r = 0; r < ROWS; r++) {
    const arde = ROWS - 1 - r < encendidas
    let c = 0
    while (c < COLS) {
      const ch = MASK[r][c]
      if (ch === '.') { c++; continue }
      const fill = arde ? TONO[ch] : APAGADO
      let n = 1
      while (c + n < COLS && MASK[r][c + n] !== '.' &&
             (arde ? TONO[MASK[r][c + n]] : APAGADO) === fill) n++
      tramos.push({ x: c, y: r, w: n, fill })
      c += n
    }
  }

  const a11y = decorativo
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': `Prime ${Math.round(p)} por ciento` }

  return (
    <svg width={COLS * px} height={ROWS * px} viewBox={`0 0 ${COLS} ${ROWS}`}
         shapeRendering="crispEdges" style={{ flex: 'none' }} className={className} {...a11y}>
      {tramos.map((t, i) => (
        <rect key={i} x={t.x} y={t.y} width={t.w} height={1} fill={t.fill} />
      ))}
    </svg>
  )
}

// La llama CON su porcentaje al lado, que es como se pinta en los listados. Existe para que el gate
// viva en UN único lugar: si `pct` es null no se pinta NADA — ni la llama ni un "0%", que es lo que
// saldría de un Math.round(null) suelto en la plantilla.
//
// El tamaño del número va en CSS (.prime-n), NO en estilo inline: en móvil hay que cambiarlo por media
// query y un inline no se deja pisar. En escritorio reserva ancho fijo para que los % queden alineados
// entre filas; en móvil ese ancho se suelta (ver ficha.css).
export function PrimeValor({ pct, px = 3, className }: {
  pct: number | null
  px?: number
  className?: string
}) {
  if (pct == null) return null
  return (
    <div className={className ? `prime-v ${className}` : 'prime-v'}>
      <Prime pct={pct} px={px} decorativo />
      <span className="prime-n">{Math.round(pct)}%</span>
    </div>
  )
}
