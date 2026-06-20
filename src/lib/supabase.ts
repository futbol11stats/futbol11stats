import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

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
