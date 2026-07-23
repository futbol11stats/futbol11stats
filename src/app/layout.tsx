import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo'
import './globals.css'

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-pitch-900 text-chalk-100 min-h-screen font-body antialiased">
        <header className="border-b border-pitch-700 bg-pitch-800/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-full bg-grass-500 flex items-center justify-center text-xs font-bold text-white">
                11
              </div>
              <span className="font-display font-bold text-lg tracking-tight text-white group-hover:text-grass-400 transition-colors">
                Fútbol<span className="text-grass-400">11</span>Stats
              </span>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-sm text-chalk-600">
              <a href="/madrid/aficionados" className="hover:text-white transition-colors">Aficionados</a>
              <a href="/madrid/juveniles" className="hover:text-white transition-colors">Juveniles</a>
              <a href="/buscar" className="hover:text-white transition-colors">Buscar</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-pitch-700 mt-16 py-8 text-chalk-600 text-xs leading-relaxed">
          <div className="max-w-4xl mx-auto px-4 space-y-3">
            <p>
              <strong className="text-chalk-500">Aviso Legal e Informativo:</strong> Futbol11Stats.com es un proyecto de comunicación y análisis estadístico totalmente independiente, gestionado con fines informativos, periodísticos y de entretenimiento en torno al fútbol regional y de base. No somos un canal oficial, ni representamos, ni tenemos vinculación jurídica, institucional o comercial con ninguna federación territorial, organismo deportivo ni con sus clubes afiliados.
            </p>
            <p>
              Toda la información de nuestra web y sus canales en RRSS tiene carácter NO OFICIAL. Las clasificaciones, rankings y datos estadísticos son calculados de forma automática por nuestro sistema en función de los datos recopilados de cada partido, por lo que la información puede ser de carácter provisional, errónea o incompleta. El administrador de Futbol11Stats.com no se hace responsable de los perjuicios causados por una posible información incorrecta. Todas las marcas, nombres de clubes o elementos ilustrativos mencionados pertenecen a sus respectivos propietarios.
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
