// Subtipo de un gol de web_partido_eventos (tipo='gol'): null = gol normal, 'penalti', 'pp' (propia puerta; el
// evento va en la fila del jugador que se lo mete). Columna nueva del pipeline: si aún no existe, viene vacía o
// trae un valor desconocido, el gol se pinta como normal (lo de antes).

export type GolSubtipo = 'penalti' | 'pp' | null
export type GolEv = { m: number; sub: GolSubtipo }

export function subtipoGol(v: unknown): GolSubtipo {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : ''
  return s === 'penalti' ? 'penalti' : s === 'pp' ? 'pp' : null
}

// Sufijo junto al minuto: «34' (p)», «71' (p.p.)».
export function sufijoGol(sub: GolSubtipo): string {
  return sub === 'penalti' ? ' (p)' : sub === 'pp' ? ' (p.p.)' : ''
}

// PostgREST con una columna que no existe: 42703 (Postgres) o PGRST204 (caché de esquema).
export function esColumnaInexistente(err: { code?: string | null } | null | undefined): boolean {
  return !!err && (err.code === '42703' || err.code === 'PGRST204')
}
