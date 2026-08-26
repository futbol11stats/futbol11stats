// Slug de club: cod + nombre (mismo patrón que equipo/jugador). PURO (sin imports de servidor) para poder
// usarse también en componentes cliente (el filtro por letra del índice).
export function clubSlug(codclub: string | number, nombre: string | null): string {
  const base = (nombre || 'club')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return base ? `${codclub}-${base}` : String(codclub)
}
export function codclubFromSlug(slug: string): string {
  const m = /^(\d+)/.exec(slug || '')
  return m ? m[1] : ''
}
