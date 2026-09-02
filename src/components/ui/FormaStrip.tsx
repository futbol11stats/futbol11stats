// Tira de FORMA ÚNICA del sitio: los últimos N resultados como puntos coloreados (verde ganó · gris empató ·
// rojo perdió). Unifica las tres representaciones previas (dots en v2, cuadros en la clasificación legacy,
// letras en FormaHero). Acepta emojis del dato ('🟢🟡🔴') o letras ('G'/'E'/'P'). Ver MANUAL_DE_ESTILO.md.
const COL: Record<string, string> = {
  '🟢': 'var(--e3)', '🟡': 'var(--ink-3)', '🔴': 'var(--e0)',
  G: 'var(--e3)', E: 'var(--ink-3)', P: 'var(--e0)',
}

export default function FormaStrip({
  items, size = 8, title,
}: {
  items: readonly string[]
  size?: number
  title?: string
}) {
  if (!items?.length) return null
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }} title={title}>
      {items.map((c, i) => (
        <i key={i} style={{
          width: size, height: size, borderRadius: '50%',
          background: COL[c] || 'var(--ink-4)', display: 'inline-block', flex: 'none',
        }} />
      ))}
    </span>
  )
}
