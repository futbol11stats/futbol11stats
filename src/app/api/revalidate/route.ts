import { NextResponse } from 'next/server'
import { revalidateTag, revalidatePath } from 'next/cache'

// Revalidación bajo demanda. El pipeline (C:\rffm-pipeline) llama a este endpoint al terminar cada tanda
// con las etiquetas de las entidades tocadas, y las fichas cacheadas (ISR 30d) se regeneran on-demand.
// Esquema de etiquetas: comp:<codgrupo> · temporada:<cod> · equipo:<cod> · jugador:<cod> · indices.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Límite por petición (tags + paths, ya deduplicados). Por encima -> 413 y el pipeline trocea. Acota el
// tiempo/CPU de la función serverless: una jornada puede invalidar miles de jugador:<cod> en una noche.
const MAX_BATCH = 1000

const limpiar = (v: unknown): string[] => {
  if (!Array.isArray(v)) return []
  const out = v.filter((x): x is string => typeof x === 'string' && x.length > 0)
  return Array.from(new Set(out))
}

export async function POST(req: Request) {
  // Secreto en cabecera (nunca en la URL, que acaba en logs). Sin secreto configurado o sin match -> 401.
  const secret = process.env.REVALIDATE_SECRET
  const provided = req.headers.get('x-revalidate-secret')
  if (!secret || !provided || provided !== secret) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'cuerpo JSON inválido' }, { status: 400 })
  }

  const b = (body ?? {}) as { tags?: unknown; paths?: unknown }
  const tags = limpiar(b.tags)
  const paths = limpiar(b.paths)

  if (tags.length === 0 && paths.length === 0) {
    return NextResponse.json({ error: 'nada que revalidar: envía "tags" y/o "paths"' }, { status: 400 })
  }
  if (tags.length + paths.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `lote demasiado grande (${tags.length + paths.length} > ${MAX_BATCH}); trocea la petición`, max: MAX_BATCH },
      { status: 413 },
    )
  }

  // Next 16: revalidateTag exige un "profile" de vida de caché; 'max' es el que recomienda Next para
  // invalidación on-demand (invalida la etiqueta en el mismo sistema de tags que usa unstable_cache).
  for (const t of tags) revalidateTag(t, 'max')
  for (const p of paths) revalidatePath(p)

  return NextResponse.json({ revalidated: true, tags: tags.length, paths: paths.length })
}
