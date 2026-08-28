export const revalidate = 2592000
export const dynamicParams = true
export function generateStaticParams() { return [] }  // ISR on-demand: 0 en build, se generan y CACHEAN en la 1a visita

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { MapPin, Navigation } from 'lucide-react'
import { getCampo, campoSlug, codigoCampoFromSlug } from '@/lib/campo'
import { parseCampo, campoMapsUrl, campoDirUrl } from '@/lib/club'
import { equipoSlug } from '@/lib/equipo'
import { tempLabel } from '@/lib/jugador'
import { escudoUrl } from '@/lib/supabase'
import EscudoImg from '@/components/EscudoImg'
import { Escudo } from '@/components/iconos'
import JsonLd from '@/components/JsonLd'
import { graphLd, breadcrumbLd } from '@/lib/jsonld'
import { SITE_URL } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const codigo = codigoCampoFromSlug(slug)
  if (!codigo) return { title: 'Fútbol11Stats' }
  const c = await getCampo(codigo)
  if (!c) return { title: 'Campo no encontrado | Fútbol11Stats' }
  const nombre = parseCampo(c.nombre).nombre
  const canonical = `/campos/${campoSlug(c.codigo, nombre)}`
  const geo = [c.localidad, c.provincia].filter(Boolean).join(', ')
  const title = `${nombre}${c.localidad ? ` (${c.localidad})` : ''} — campo de fútbol | Fútbol11Stats`
  const description = `${nombre}${geo ? `, ${geo}` : ''}: ubicación, cómo llegar y los ${c.equipos.length} equipos del fútbol aficionado y juvenil de Madrid que juegan allí, en Fútbol11Stats.`
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, siteName: 'Fútbol11Stats', locale: 'es_ES', type: 'website' } }
}

export default async function CampoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const codigo = codigoCampoFromSlug(slug)
  if (!codigo) notFound()
  const c = await getCampo(codigo)
  if (!c) notFound()

  const { nombre, superficie } = parseCampo(c.nombre)
  const canonicalSlug = campoSlug(c.codigo, nombre)
  if (slug !== canonicalSlug) permanentRedirect(`/campos/${canonicalSlug}`)

  const pin = campoMapsUrl({ codigo: c.codigo, nombre: c.nombre, localidad: c.localidad, lat: c.lat, lng: c.lng })
  const dir = campoDirUrl(c.lat, c.lng)
  const direccionLinea = [c.direccion, c.cp, c.localidad, c.provincia].filter(Boolean).join(', ')

  // StadiumOrArena: una instalación deportiva pública (CivicStructure/Place) -> markup honesto, con geo + dirección
  // COMPLETA (es un lugar público, no el domicilio de nadie; ver regla: marcamos lugares/organizaciones, no personas).
  const placeLd: Record<string, unknown> = { '@type': 'StadiumOrArena', name: nombre, sport: 'Soccer', url: `${SITE_URL}/campos/${canonicalSlug}` }
  if (c.lat != null && c.lng != null) placeLd.geo = { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng }
  placeLd.address = {
    '@type': 'PostalAddress',
    ...(c.direccion ? { streetAddress: c.direccion } : {}),
    ...(c.localidad ? { addressLocality: c.localidad } : {}),
    ...(c.provincia ? { addressRegion: c.provincia } : {}),
    ...(c.cp ? { postalCode: c.cp } : {}),
    addressCountry: 'ES',
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <JsonLd data={graphLd(breadcrumbLd([
        { name: 'Inicio', url: `${SITE_URL}/` },
        { name: 'Campos', url: `${SITE_URL}/campos` },
        { name: nombre, url: `${SITE_URL}/campos/${canonicalSlug}` },
      ]), placeLd)} />
      <nav className="text-sm text-chalk-600 mb-4 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link><span>·</span>
        <Link href="/campos" className="hover:text-white transition-colors">Campos</Link><span>·</span>
        {c.localidad && (
          <>
            {/* Población -> vuelve al directorio filtrado por esa localidad. */}
            <Link href={`/campos?loc=${encodeURIComponent(c.localidad)}`} className="hover:text-white transition-colors">{c.localidad}</Link><span>·</span>
          </>
        )}
        <span className="text-white truncate">{nombre}</span>
      </nav>

      <h1 className="font-display text-3xl font-bold text-white leading-tight">{nombre}</h1>
      <p className="text-chalk-600 text-sm mt-1">
        {[direccionLinea, superficie].filter(Boolean).join(' · ') || '—'}
      </p>

      {/* Mapa estático (imagen del bucket, teselas OSM): 0 coste por visita, sin API key. Es CONTEXTO: alt
          descriptivo, lazy, y toda la imagen abre la ubicación en Google Maps (mismo destino que "Ver ubicación").
          Atribución OSM (ODbL) incrustada en la imagen y, además, enlazada en el pie. */}
      {c.mapaUrl && (
        <figure className="mt-4">
          <a href={pin ?? undefined} target="_blank" rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden border border-pitch-700 hover:border-grass-500/50 transition-colors">
            <img src={c.mapaUrl} width={600} height={340} loading="lazy"
              alt={`Mapa de ${nombre}${direccionLinea ? `, ${direccionLinea}` : ''}. Ubicación del campo sobre el callejero de OpenStreetMap.`}
              className="w-full h-auto block" />
          </a>
          <figcaption className="text-[11px] text-chalk-600 mt-1">
            Mapa: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">© OpenStreetMap contributors</a>
          </figcaption>
        </figure>
      )}

      {/* Dos enlaces a Maps. Ver ubicación = pin exacto; Cómo llegar = direcciones (Google pide el origen). */}
      {(pin || dir) && (
        <div className="flex flex-wrap gap-2 mt-4">
          {pin && (
            <a href={pin} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-pitch-800 border border-pitch-700 text-sm text-white hover:border-grass-500/50 transition-colors">
              <MapPin size={15} strokeWidth={2.25} /> Ver ubicación
            </a>
          )}
          {dir && (
            <a href={dir} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-grass-500/15 border border-grass-500/40 text-sm text-grass-300 hover:bg-grass-500/25 transition-colors">
              <Navigation size={15} strokeWidth={2.25} /> Cómo llegar
            </a>
          )}
        </div>
      )}

      {/* Equipos que juegan allí como locales, por nº de partidos (habituales primero). Juveniles se listan (nombre
          de equipo); su ficha destino conserva su noindex. */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
          Equipos que juegan aquí · {c.equipos.length}
        </h2>
        {/* Cada equipo se pinta EXACTAMENTE como un resultado de búsqueda (escudo · nombre · Juvenil · categoría ·
            grupo), leído de web_equipo. A la derecha, los PJ en este campo (métrica del orden: habituales primero). */}
        <ul className="bg-pitch-800 rounded-xl border border-pitch-700 divide-y divide-pitch-700/60 overflow-hidden">
          {c.equipos.map((e) => {
            const inactivo = !e.activo
            const juvenil = e.rama === 'juvenil'
            return (
              <li key={e.codequipo}>
                <Link href={`/madrid/equipo/${equipoSlug(e.codequipo, e.nombre)}`}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-pitch-700/60 transition-colors">
                  <span className={`inline-flex items-center justify-center w-8 h-8 bg-white rounded-sm flex-shrink-0 p-0.5 ${inactivo ? 'opacity-60' : ''}`}>
                    {escudoUrl(e.escudo) ? <EscudoImg escudo={e.escudo} nombre={e.nombre} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="font-display font-semibold text-white uppercase truncate text-[15px] leading-tight">{e.nombre}</span>
                      {juvenil && <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-blue-300 bg-blue-500/15 rounded px-1 py-px">Juvenil</span>}
                    </span>
                    <span className={`block text-xs truncate ${inactivo ? 'text-chalk-600' : 'text-chalk-500'}`}>
                      {inactivo
                        ? `Último grupo: ${e.nombre_comp ?? ''}${e.grupo_nombre ? ` · ${e.grupo_nombre}` : ''}${e.codtemporada ? ` · ${tempLabel(e.codtemporada)}` : ''}`
                        : `${e.nombre_comp ?? ''}${e.grupo_nombre ? ` · ${e.grupo_nombre}` : ''}`}
                    </span>
                  </span>
                  <span className="flex-none inline-flex items-center gap-1 text-xs text-chalk-500 tabular-nums" title="Partidos jugados en este campo">
                    <Escudo size={11} className="text-chalk-600" />{e.nPartidos}<span className="text-chalk-700">PJ</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
