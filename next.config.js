/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // La antigua /datos-y-derechos se reparte en /aviso-legal (carácter no oficial + propiedad
      // intelectual) y /privacidad; su canónica es el Aviso Legal, que enlaza a la Privacidad.
      // permanent:true -> 308 (redirección permanente; Google lo trata igual que un 301).
      { source: '/datos-y-derechos', destination: '/aviso-legal', permanent: true },

      // Retirada de las rutas /v2 (ya son duplicados del contenido canónico, que se sirve en la ruta sin
      // sufijo). 308 permanente a la canónica equivalente (quita el /v2), para que URLs guardadas/compartidas
      // no den 404. El slug no canónico encadena un segundo 308 (el de la propia ruta canónica). Global antes
      // que grupo (más específico: literal `global`), aunque el patrón de grupo también lo cubriría.
      { source: '/madrid/jugador/:slug/:temporada/v2', destination: '/madrid/jugador/:slug/:temporada', permanent: true },
      { source: '/madrid/jugador/:slug/v2', destination: '/madrid/jugador/:slug', permanent: true },
      { source: '/madrid/equipo/:slug/:temporada/v2', destination: '/madrid/equipo/:slug/:temporada', permanent: true },
      { source: '/madrid/equipo/:slug/v2', destination: '/madrid/equipo/:slug', permanent: true },
      { source: '/madrid/:categoria/:slugComp/global/:temporada/:jornada/:tab/v2', destination: '/madrid/:categoria/:slugComp/global/:temporada/:jornada/:tab', permanent: true },
      { source: '/madrid/:categoria/:slugComp/:slugGrupo/:temporada/:jornada/:tab/v2', destination: '/madrid/:categoria/:slugComp/:slugGrupo/:temporada/:jornada/:tab', permanent: true },
    ]
  },
}

module.exports = nextConfig
