import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fútbol11Stats Madrid',
  description: 'Estadísticas completas del fútbol madrileño — RFFM',
  openGraph: {
    title: 'Fútbol11Stats Madrid',
    description: 'Estadísticas del fútbol madrileño',
    siteName: 'futbol11stats.com',
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
              <a href="/aficionados" className="hover:text-white transition-colors">Aficionados</a>
              <a href="/juvenil" className="hover:text-white transition-colors">Juvenil</a>
              <a href="/buscar" className="hover:text-white transition-colors">Buscar</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-pitch-700 mt-16 py-8 text-center text-chalk-600 text-sm">
          <p>Datos de la Real Federación de Fútbol de Madrid · futbol11stats.com</p>
        </footer>
      </body>
    </html>
  )
}
