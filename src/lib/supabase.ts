import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Construye la URL pública de un escudo en Supabase Storage a partir del filename
export function escudoUrl(filename: string | null): string | null {
  if (!filename) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/escudos/${filename}`
}

// "APELLIDO1 APELLIDO2, NOMBRE" -> "Nombre Apellido1 Apellido2" (Title Case)
export function formatNombre(nombre: string | null): string {
  if (!nombre) return ''
  const [apellidos = '', nombrePila = ''] = nombre.split(',').map(s => s.trim())
  const full = nombrePila ? `${nombrePila} ${apellidos}` : apellidos
  return full
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Tipos principales
export type Grupo = {
  codtemporada: number
  codgrupo: string
  nombre_temporada: string
  nombre_comp: string
  nombre_grupo: string
  categoria: 'AFICIONADO' | 'JUVENIL'
  jornada_actual: number
  total_jornadas: number
}

export type Resultado = {
  codtemporada: number
  codgrupo: string
  jornada: number
  codacta: string
  nombre_local: string
  escudo_local: string
  goles_local: number
  goles_visitante: number
  nombre_visitante: string
  escudo_visitante: string
  fecha: string
}

export type ClasificacionRow = {
  codtemporada: number
  codgrupo: string
  jornada: number
  pos: number
  codequipo: string
  nombre_equipo: string
  escudo: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  dg: number
  pts: number
  elo: number
  pts_fantasy: number
  zona: string
}

export type TopJugador = {
  codtemporada: number
  codgrupo: string
  tipo: string
  jornada: number | null
  rank: number
  nombre: string
  posicion: string
  nombre_equipo: string
  escudo: string
  goles: number | null
  pj: number | null
  pts_fantasy: number | null
  media_fantasy: number | null
  elo: number | null
}

// Juego limpio: totales disciplinarios por equipo (web_juego_limpio)
export type JuegoLimpioRow = {
  codtemporada: number
  codgrupo: string
  codequipo: string
  nombre_equipo: string
  escudo: string | null
  amarillas: number
  dobles: number
  rojas: number
  amarillas_tec: number
  dobles_tec: number
  rojas_tec: number
}

// Sancionados de la temporada (web_alertas_tarjetas ampliada): jugadores con >=1 ciclo
// completo de 5 amarillas, o >=1 doble amarilla, o >=1 roja directa
export type SancionadoRow = {
  codtemporada: number
  codgrupo: string
  codjugador: string
  nombre: string
  posicion: string | null
  codequipo: string
  nombre_equipo: string
  escudo: string | null
  estado: string
  amarillas_ciclo: number
  amarillas_simples: number
  dobles_amarillas: number
  rojas_directas: number
  ciclos_completados: number
}
