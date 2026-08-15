export const revalidate = 2592000   // ISR 30d (Fluid CPU): ~1.9k fichas de contenido congelado.
export const dynamicParams = true   // no se pre-renderizan en build; on-demand + cacheadas.

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { COLS_EQUIPO, codFromSlug, equipoSlug, type EquipoFicha } from '@/lib/equipo'
import { cacheEquipo } from '@/lib/cacheComp'
import FichaEquipoV2 from '@/components/ficha/v2/FichaEquipoV2'

// Migración v2 (paso 1): esta ruta CANÓNICA (sin sufijo /v2) pasa a renderizar FichaEquipoV2. Se conservan
// verbatim generateMetadata (incluido el noindex juvenil), el canonical, el redirect 308 al slug canónico y
// los exports de ISR; lo único que cambia es el componente de render. El JSON-LD (breadcrumb + sportsTeam) lo
// emite FichaEquipoV2 con suf='' (URL sin /v2), equivalente al que emitía el render inline anterior. Los
// fetchers del render antiguo (temporadas, movimientos, hitos, plantilla, mini-clasif, copas, forma…) se
// retiraron: FichaEquipoV2 trae sus propios datos vía equipoV2.ts. getEquipo se mantiene: lo usan
// generateMetadata y el 308.

async function getEquipo(cod: string): Promise<EquipoFicha | null> {
  return cacheEquipo(async () => {
    const { data } = await supabase.from('web_equipo').select(COLS_EQUIPO).eq('codequipo', cod).limit(1).maybeSingle()
    return (data as unknown as EquipoFicha) || null
  }, ['getEquipo', cod], cod)
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
    `${comp ? ` en ${comp}` : ''}. Estadísticas del fútbol amateur de Madrid en Fútbol11Stats.`
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
