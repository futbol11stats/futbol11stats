import type { Metadata } from 'next'
import { Inter, Barlow_Condensed } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { SITE_URL } from '@/lib/seo'
import CookieConsent from '@/components/CookieConsent'
import CookieSettingsButton from '@/components/CookieSettingsButton'
import Buscador from '@/components/buscador/Buscador'
import { getSueloVivo } from '@/lib/temporadas'
import Instagram from '@/components/icons/Instagram'
import TikTok from '@/components/icons/TikTok'
import './globals.css'

// Fuentes self-hosted por next/font (elimina la cadena externa a fonts.googleapis/gstatic).
// Inter (body): variable -> un woff2 cubre los pesos usados (400/500/600/700) sin ficheros de sobra.
// Barlow Condensed (display): estática, solo 700/800 (el 600 no se usaba en ninguna parte).
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-body' })
const barlow = Barlow_Condensed({ subsets: ['latin'], weight: ['700', '800'], display: 'swap', variable: '--font-display' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Fútbol11Stats — Estadísticas del fútbol amateur · Madrid',
  description: 'Clasificaciones, goleadores, fantasy y ELO del fútbol amateur y juvenil de Madrid (RFFM).',
  openGraph: {
    title: 'Fútbol11Stats',
    description: 'Estadísticas del fútbol amateur · Madrid',
    siteName: 'Fútbol11Stats',
    locale: 'es_ES',
    type: 'website',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Suelo vivo (badge activo/inactivo del buscador del header), resuelto una vez y cacheado (tag 'indices').
  const suelo = await getSueloVivo()
  return (
    <html lang="es" className={`${inter.variable} ${barlow.variable}`}>
      <body className="bg-pitch-900 text-chalk-100 min-h-screen font-body antialiased">
        <header className="border-b border-pitch-700 bg-pitch-800/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-full bg-grass-500 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                11
              </div>
              <span className="font-display font-bold text-3xl md:text-4xl tracking-tight text-white group-hover:text-grass-400 transition-colors">
                Fútbol<span className="text-grass-400">11</span>Stats
              </span>
            </a>
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex items-center gap-6 text-sm text-chalk-600">
                <a href="/madrid/aficionados" className="hover:text-white transition-colors">Aficionados</a>
                <a href="/madrid/juveniles" className="hover:text-white transition-colors">Juveniles</a>
              </nav>
              <Buscador suelo={suelo} />
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-pitch-700 mt-16 py-8 text-chalk-600 text-xs leading-relaxed">
          <div className="max-w-4xl mx-auto px-4 space-y-3">
            <p>
              Fútbol11Stats es un proyecto independiente, sin vinculación con ninguna federación ni club. Los datos proceden de fuentes públicas y pueden contener errores.
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              <a href="/sobre" className="underline hover:text-white transition-colors">Sobre el proyecto</a>
              <a href="/aviso-legal" className="underline hover:text-white transition-colors">Aviso legal</a>
              <a href="/privacidad" className="underline hover:text-white transition-colors">Privacidad</a>
              <a href="/cookies" className="underline hover:text-white transition-colors">Cookies</a>
              <CookieSettingsButton />
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
              <span className="text-chalk-500">Síguenos — datos reseñables cada jornada</span>
              <a href="https://www.instagram.com/futbol11stats" target="_blank" rel="noopener noreferrer"
                aria-label="Fútbol11Stats en Instagram" className="text-chalk-500 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" strokeWidth={1.75} />
              </a>
              <a href="https://www.tiktok.com/@futbol11stats" target="_blank" rel="noopener noreferrer"
                aria-label="Fútbol11Stats en TikTok" className="text-chalk-500 hover:text-white transition-colors">
                <TikTok className="w-[18px] h-[18px]" />
              </a>
            </p>
          </div>
        </footer>
        {/* Analytics y Speed Insights: anónimos, sin cookies -> fuera del gate de consentimiento. */}
        <Analytics />
        <SpeedInsights />
        <CookieConsent />
      </body>
    </html>
  )
}
