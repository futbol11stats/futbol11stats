// Avatar de iniciales coloreado por demarcación (AVA_POS), consumido por PlayerAvatar.
export const AVA_POS: Record<string, string> = { POR: '249,115,22', DEF: '59,130,246', MED: '34,160,80', DEL: '239,68,68' }
export const avaStyle = (pos?: string | null) => {
  const c = AVA_POS[pos || ''] || '100,116,139'
  return { background: `linear-gradient(to bottom right, rgba(${c},.45), var(--pitch-800))`, border: `2px solid rgba(${c},.6)`, color: '#fff' }
}
