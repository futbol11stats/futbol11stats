# Fútbol11Stats Madrid

Estadísticas completas del fútbol madrileño — competiciones RFFM.

## Stack

- **Next.js 15** — framework React con SSR
- **Supabase** — base de datos PostgreSQL con datos aplanados
- **Tailwind CSS** — estilos
- **Vercel** — despliegue

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Variables de entorno

Crea `.env.local` con:

```
NEXT_PUBLIC_SUPABASE_URL=https://nmhetuxcbmcunqyxiirx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

En Vercel, añade estas mismas variables en Project Settings → Environment Variables.

## Despliegue en Vercel

1. Sube este repositorio a GitHub
2. Importa el proyecto en [vercel.com](https://vercel.com)
3. Añade las variables de entorno
4. Despliega

## Actualización de datos

Tras cada ejecución de `actualizar.py` en el pipeline local:

```bash
python _export_supabase.py --temporada 21
```

Para actualizar todas las temporadas:

```bash
python _export_supabase.py --all
```
