export const revalidate = 2592000
export const dynamicParams = true

import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import FichaEquipoV2 from '@/components/ficha/v2/FichaEquipoV2'
import { getEquipoV2 } from '@/lib/equipoV2'
import { codFromSlug, equipoSlug } from '@/lib/equipo'

// Vista por TEMPORADA de la ficha de equipo, en la URL canónica (sin sufijo /v2). En el legacy la temporada
// iba por ?temporada client-side; la v2 la maneja por segmento de ruta, así que esta ruta no-v2 no existía y
// se crea aquí (mismo caso que en jugador). Canonical PROPIO a sí misma (indexable por derecho) + title con
// la temporada (para no competir con la ficha base) + noindex juvenil + 308 al slug canónico.

export async function generateMetadata({ params }: { params: Promise<{ slug: string; temporada: string }> }): Promise<Metadata> {
  const { slug, temporada } = await params
  const cod = codFromSlug(slug)
  if (!cod) return { title: 'Fútbol11Stats' }
  const e = await getEquipoV2(cod)
  if (!e) return { title: 'Equipo no encontrado | Fútbol11Stats' }
  const canonical = `/madrid/equipo/${equipoSlug(e.codequipo, e.nombre)}/${temporada}`
  const title = `${e.nombre} — temporada ${temporada} | Fútbol11Stats`
  const description = `${e.nombre} en ${temporada}: clasificación jornada a jornada, análisis, plantilla y ` +
    `resultados del fútbol amateur de Madrid.`
  return {
    title, description,
    alternates: { canonical },
    ...(e.rama === 'juvenil' ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'website' },
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string; temporada: string }> }) {
  const { slug, temporada } = await params
  const cod = codFromSlug(slug)
  const e = cod ? await getEquipoV2(cod) : null
  if (!e) notFound()

  // 308 a la URL canónica si el sufijo de nombre no coincide (conserva el segmento de temporada).
  const canonicalSlug = equipoSlug(e.codequipo, e.nombre)
  if (slug !== canonicalSlug) permanentRedirect(`/madrid/equipo/${canonicalSlug}/${temporada}`)

  return <FichaEquipoV2 cod={cod} temporadaLabel={temporada} />
}
