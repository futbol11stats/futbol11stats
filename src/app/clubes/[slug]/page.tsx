export const revalidate = 2592000
export const dynamicParams = true   // ~600 clubes on-demand, cacheados (sin generateStaticParams).

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { getClub, clubSlug, codclubFromSlug } from '@/lib/club'
import { equipoSlug } from '@/lib/equipo'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import JsonLd from '@/components/JsonLd'
import { graphLd, breadcrumbLd } from '@/lib/jsonld'
import { SITE_URL } from '@/lib/seo'
import { escudoUrl } from '@/lib/supabase'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const cod = codclubFromSlug(slug)
  if (!cod) return { title: 'Fútbol11Stats' }
  const c = await getClub(cod)
  if (!c) return { title: 'Club no encontrado | Fútbol11Stats' }
  const canonical = `/clubes/${clubSlug(c.codclub, c.nombre)}`
  const geo = [c.localidad, c.provincia].filter(Boolean).join(', ')
  const title = `${c.nombre} — equipos y estadísticas | Fútbol11Stats`
  const description = `${c.nombre}${geo ? ` (${geo})` : ''}: todos sus equipos (${c.equipos.length}) del fútbol aficionado y juvenil de Madrid, con su categoría, campo y estadísticas en Fútbol11Stats.`
  return {
    title, description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'website' },
  }
}

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cod = codclubFromSlug(slug)
  if (!cod) notFound()
  const c = await getClub(cod)
  if (!c) notFound()

  const canonicalSlug = clubSlug(c.codclub, c.nombre)
  if (slug !== canonicalSlug) permanentRedirect(`/clubes/${canonicalSlug}`)

  // Orden por el SUFIJO del equipo (A, B, C, D…) para que salga limpio aunque el primer equipo y los filiales
  // tengan bases de nombre distintas ("…S.A.D. 'A'" vs "…PARACUELLOS 'B'"); desempate por nombre completo.
  const sufijo = (n: string) => { const m = /'([A-Z0-9]+)'\s*$/i.exec(n); return (m ? m[1] : n).toUpperCase() }
  const byEquipo = (a: { nombre: string }, b: { nombre: string }) =>
    sufijo(a.nombre).localeCompare(sufijo(b.nombre), 'es', { numeric: true }) || a.nombre.localeCompare(b.nombre, 'es')
  const aficionado = c.equipos.filter((e) => e.rama !== 'juvenil').sort(byEquipo)
  const juvenil = c.equipos.filter((e) => e.rama === 'juvenil').sort(byEquipo)
  const geo = [c.localidad, c.provincia].filter(Boolean).join(' · ')

  // SportsOrganization: un CLUB es una organización (no una persona) -> markup honesto y on-theme. Sin domicilio
  // (privacidad): solo localidad/provincia. sameAs = web propia del club si existe.
  const orgLd: Record<string, unknown> = {
    '@type': 'SportsOrganization', name: c.nombre, sport: 'Soccer', url: `${SITE_URL}${`/clubes/${canonicalSlug}`}`,
  }
  if (escudoUrl(c.escudo)) orgLd.logo = escudoUrl(c.escudo)
  if (c.localidad) orgLd.location = { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: c.localidad, ...(c.provincia ? { addressRegion: c.provincia } : {}) } }
  if (c.portal_web) orgLd.sameAs = [c.portal_web]

  const Grupo = ({ titulo, equipos }: { titulo: string; equipos: typeof c.equipos }) => equipos.length === 0 ? null : (
    <section className="mb-6">
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">{titulo} · {equipos.length}</h2>
      <ul className="grid sm:grid-cols-2 gap-2">
        {equipos.map((e) => (
          <li key={e.codequipo}>
            <Link href={`/madrid/equipo/${equipoSlug(e.codequipo, e.nombre)}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-pitch-800 border border-pitch-700 hover:border-grass-500/50 transition-colors">
              {e.escudo ? <EscudoBox escudo={e.escudo} nombre={e.nombre} size={30} radius={6} /> : <span className="w-[30px] h-[30px] flex-none rounded-md bg-pitch-700" />}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white truncate">{e.nombre}{e.activo === false && <span className="text-chalk-600 font-normal"> · inactivo</span>}</span>
                <span className="block text-xs text-chalk-600 truncate">
                  {[e.nombre_comp, e.campo].filter(Boolean).join(' · ') || '—'}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <JsonLd data={graphLd(breadcrumbLd([
        { name: 'Inicio', url: `${SITE_URL}/` },
        { name: 'Clubes', url: `${SITE_URL}/clubes` },
        { name: c.nombre, url: `${SITE_URL}/clubes/${canonicalSlug}` },
      ]), orgLd)} />
      <nav className="text-sm text-chalk-600 mb-4 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link><span>·</span>
        <Link href="/clubes" className="hover:text-white transition-colors">Clubes</Link><span>·</span>
        <span className="text-white truncate">{c.nombre}</span>
      </nav>

      <div className="flex items-center gap-4 mb-6">
        {escudoUrl(c.escudo) ? <EscudoBox escudo={c.escudo} nombre={c.nombre} size={64} radius={12} /> : null}
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-white leading-tight">{c.nombre}</h1>
          <p className="text-chalk-600 text-sm mt-1">
            {[geo, c.delegacion ? `Delegación ${c.delegacion}` : null, `${c.equipos.length} equipo${c.equipos.length !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
            {c.portal_web && <> · <a href={c.portal_web} target="_blank" rel="nofollow noopener noreferrer" className="underline hover:text-white">Web oficial</a></>}
          </p>
        </div>
      </div>

      <Grupo titulo="Equipos" equipos={aficionado} />
      <Grupo titulo="Juveniles" equipos={juvenil} />
    </div>
  )
}
