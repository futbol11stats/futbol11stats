export const revalidate = 2592000   // ISR 30d (Fluid CPU): ~1.9k fichas de contenido congelado.
export const dynamicParams = true
export function generateStaticParams() { return [] }  // ISR on-demand: 0 en build, se generan y CACHEAN en la 1a visita (revalidate 30d)   // no se pre-renderizan en build; on-demand + cacheadas.

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { COLS_EQUIPO, codFromSlug, equipoSlug, type EquipoFicha } from '@/lib/equipo'
import { cacheEquipo } from '@/lib/cacheComp'
import FichaEquipoV2 from '@/components/ficha/v2/FichaEquipoV2'

// La ficha de equipo la renderiza FichaEquipoV2. Este page.tsx conserva generateMetadata (incluido el noindex
// juvenil), el canonical, el redirect 308 al slug canónico y los exports de ISR; el JSON-LD (breadcrumb +
// sportsTeam) lo emite FichaEquipoV2. getEquipo se mantiene: lo usan generateMetadata y el 308 (los datos del
// render los trae equipoV2.ts).

async function getEquipo(cod: string): Promise<EquipoFicha | null> {
  return cacheEquipo(async () => {
    const { data, error } = await supabase.from('web_equipo').select(COLS_EQUIPO).eq('codequipo', cod).limit(1).maybeSingle()
    if (error) throw error   // no cachear null por un error transitorio -> 404 falso persistente (ver checklist)
    return (data as unknown as EquipoFicha) || null
    // v2: bump para invalidar los null cacheados durante el DELETE de la republicación (mismo caso que jugador;
    // el Data Cache persiste entre deploys -> sin bump seguirían los 404 aunque el dato ya esté). Ver
    // [[fallos-silenciosos-vacio-y-cache]].
  }, ['getEquipo', 'v2', cod], cod)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const cod = codFromSlug(slug)
  if (!cod) return { title: 'Fútbol11Stats' }
  const e = await getEquipo(cod)
  if (!e) return { title: 'Equipo no encontrado | Fútbol11Stats' }
  const canonical = `/madrid/equipo/${equipoSlug(e.codequipo, e.nombre)}`
  const title = `${e.nombre} — plantilla, resultados y trayectoria | Fútbol11Stats`
  const comp = e.nombre_comp ? `${e.nombre_comp}${e.grupo_nombre ? ` ${e.grupo_nombre}` : ''}` : ''
  const description = `${e.nombre}: plantilla, clasificación, altas y bajas, trayectoria por temporadas e hitos` +
    `${comp ? ` en ${comp}` : ''}. Estadísticas del fútbol aficionado de Madrid en Fútbol11Stats.`
  return {
    title, description,
    alternates: { canonical },
    // NOINDEX en fichas JUVENILES: sus plantillas listan nombres de menores -> no indexables. "follow"
    // para que los enlaces salientes sigan pasando autoridad. Las de aficionados siguen indexables.
    ...(e.rama === 'juvenil' ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'website' },
  }
}

export default async function FichaEquipo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cod = codFromSlug(slug)
  if (!cod) notFound()
  const e = await getEquipo(cod)
  if (!e) notFound()

  // Redirect 308 a la URL canónica si el sufijo de nombre no coincide.
  const canonicalSlug = equipoSlug(e.codequipo, e.nombre)
  if (slug !== canonicalSlug) permanentRedirect(`/madrid/equipo/${canonicalSlug}`)

  return <FichaEquipoV2 cod={cod} temporadaLabel={null} />
}
