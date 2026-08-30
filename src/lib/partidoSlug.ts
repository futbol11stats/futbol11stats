// Slug de PARTIDO: id de web_resultados + "local-vs-visitante" (mismo patrón que campo/equipo: {id}-{slug}).
// PURO (sin imports de servidor) para usarse en el render de resultados (enlace del marcador) y donde haga falta.
function slugName(s: string | null): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}
export function partidoSlug(id: string | number, local: string | null, visitante: string | null): string {
  return `${id}-${slugName(local) || 'local'}-vs-${slugName(visitante) || 'visitante'}`
}
export function idFromPartidoSlug(slug: string): string {
  const m = /^(\d+)/.exec(slug || '')   // el id de web_resultados es numérico
  return m ? m[1] : ''
}
