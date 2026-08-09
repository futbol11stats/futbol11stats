import { formatNombre } from '@/lib/supabase'

// Iniciales del jugador con el criterio del sitio: nombre + primer apellido. Los nombres del dato vienen
// "APELLIDOS, NOMBRE", así que se pasa PRIMERO por formatNombre (reordena a "Nombre Apellido…") y luego se
// toman las dos primeras iniciales. "BARROSO SÁNCHEZ, JESÚS" -> "Jesús Barroso" -> "JB".
export const inicialesJugador = (n: string) =>
  formatNombre(n || '').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

// Avatar de iniciales coloreado por demarcación (AVA_POS), como el Top de la plantilla de equipo v2.
export const AVA_POS: Record<string, string> = { POR: '249,115,22', DEF: '59,130,246', MED: '34,160,80', DEL: '239,68,68' }
export const avaStyle = (pos?: string | null) => {
  const c = AVA_POS[pos || ''] || '100,116,139'
  return { background: `linear-gradient(to bottom right, rgba(${c},.45), var(--pitch-800))`, border: `1.5px solid rgba(${c},.55)`, color: '#fff' }
}
