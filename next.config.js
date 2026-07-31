/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // La antigua /datos-y-derechos se reparte en /aviso-legal (carácter no oficial + propiedad
      // intelectual) y /privacidad; su canónica es el Aviso Legal, que enlaza a la Privacidad.
      // permanent:true -> 308 (redirección permanente; Google lo trata igual que un 301).
      { source: '/datos-y-derechos', destination: '/aviso-legal', permanent: true },
    ]
  },
}

module.exports = nextConfig
