export const revalidate = 2592000   // ISR 30d (Fluid CPU): 25k fichas de contenido congelado; cada deploy/re-export invalida la caché.
export const dynamicParams = true   // 25k páginas NO se pre-renderizan en build; se generan on-demand y quedan cacheadas (SIN generateStaticParams).

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { COLS_JUGADOR, codFromSlug, jugadorSlug, formatNombre, type JugadorFicha } from '@/lib/jugador'
import { cacheJugador } from '@/lib/cacheComp'
import FichaJugadorV2 from '@/components/ficha/v2/FichaJugadorV2'

// La ficha de jugador la renderiza FichaJugadorV2. Este page.tsx conserva el generateMetadata, el canonical,
// el redirect 308 al slug canónico y los exports de ISR; el JSON-LD (breadcrumb) lo emite FichaJugadorV2.
// getJugador se mantiene porque lo usan generateMetadata y el 308 (los datos del render los trae jugadorV2.ts).

const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('es-ES')

async function getJugador(cod: string): Promise<JugadorFicha | null> {
  return cacheJugador(async () => {
    const { data, error } = await supabase.from('web_jugador').select(COLS_JUGADOR).eq('codjugador', cod).limit(1).maybeSingle()
    if (error) throw error   // no cachear null por un error transitorio -> 404 falso persistente (ver checklist)
    return (data as unknown as JugadorFicha) || null
    // v2: bump para invalidar los null cacheados durante el DELETE+timeout de la republicación (las filas
    // faltaron un rato y quedaron cacheadas como 404). El Data Cache persiste entre deploys; sin esto seguirían
    // los 404 aunque el dato ya esté. Ver [[fallos-silenciosos-vacio-y-cache]].
  }, ['getJugador', 'v2', cod], cod)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const cod = codFromSlug(slug)
  if (!cod) return { title: 'Fútbol11Stats' }
  const j = await getJugador(cod)
  if (!j) return { title: 'Jugador no encontrado | Fútbol11Stats' }
  const nombre = formatNombre(j.nombre)
  const canonical = `/madrid/jugador/${jugadorSlug(j.codjugador, j.nombre)}`
  const equipo = j.equipo_actual_nombre ? ` del ${j.equipo_actual_nombre}` : ''
  const cat = j.categoria_rama ? ` en ${j.categoria_rama}` : ''
  const title = `${nombre} — estadísticas, trayectoria e hitos | Fútbol11Stats`
  const description = `Estadísticas de ${nombre}${equipo}${cat}: ${num(j.pj_total)} partidos, ${num(j.goles_total)} goles, ` +
    `ELO, ranking F11S y trayectoria completa en el fútbol aficionado de Madrid.`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'profile' },
  }
}

export default async function FichaJugador({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cod = codFromSlug(slug)
  const j = await getJugador(cod)
  // Fuera de perímetro = no existe (sin explicar por qué).
  if (!j) notFound()

  // Redirect 308 a la URL canónica si el sufijo de nombre no coincide.
  const canonicalSlug = jugadorSlug(j.codjugador, j.nombre)
  if (slug !== canonicalSlug) permanentRedirect(`/madrid/jugador/${canonicalSlug}`)

  return <FichaJugadorV2 cod={cod} temporadaLabel={null} />
}
