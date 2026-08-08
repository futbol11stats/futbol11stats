export const revalidate = 2592000
export const dynamicParams = true

import type { Metadata } from 'next'
import FichaEquipoV2 from '@/components/ficha/v2/FichaEquipoV2'
import { getEquipoV2 } from '@/lib/equipoV2'
import { codFromSlug, equipoSlug } from '@/lib/equipo'

export async function generateMetadata({ params }: { params: Promise<{ slug: string; temporada: string }> }): Promise<Metadata> {
  const { slug, temporada } = await params
  const cod = codFromSlug(slug)
  if (!cod) return { title: 'Fútbol11Stats' }
  const e = await getEquipoV2(cod)
  if (!e) return { title: 'Equipo no encontrado | Fútbol11Stats' }
  const canonical = `/madrid/equipo/${equipoSlug(e.codequipo, e.nombre)}/${temporada}/v2`
  const title = `${e.nombre} — temporada ${temporada} | Fútbol11Stats`
  const description = `${e.nombre} en ${temporada}: clasificación jornada a jornada, análisis, plantilla y ` +
    `resultados del fútbol amateur de Madrid.`
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'website' } }
}

export default async function Page({ params }: { params: Promise<{ slug: string; temporada: string }> }) {
  const { slug, temporada } = await params
  const cod = codFromSlug(slug)
  return <FichaEquipoV2 cod={cod} temporadaLabel={temporada} />
}
