import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchConGuarda, CODIGO_CORTE } from '@/lib/paginar'

// Guarda común: una lectura SIN paginar que vuelve con exactamente 1.000 filas (Content-Range 0-999/…) es un
// corte silencioso de PostgREST -> error. Con limit/offset (paginado o .limit()) o con menos filas, pasa tal cual.
const URL_BASE = 'https://x.supabase.co/rest/v1/web_clasificacion?select=codgrupo&codtemporada=eq.22'
const responde = (rango: string) => vi.fn(async () => new Response('[]', { status: 200, headers: { 'content-range': rango } }))

describe('guarda del corte de 1.000 filas', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('sin paginar y 0-999 -> error 422 con el código', async () => {
    vi.stubGlobal('fetch', responde('0-999/*'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await fetchConGuarda(URL_BASE, { method: 'GET' })
    expect(r.status).toBe(422)
    expect((await r.json()).code).toBe(CODIGO_CORTE)
  })
  it('control: menos de 1.000 filas -> pasa', async () => {
    vi.stubGlobal('fetch', responde('0-998/*'))
    expect((await fetchConGuarda(URL_BASE, { method: 'GET' })).status).toBe(200)
  })
  it('control: paginada (offset/limit) o con .limit() -> pasa aunque traiga 1.000', async () => {
    vi.stubGlobal('fetch', responde('0-999/*'))
    expect((await fetchConGuarda(`${URL_BASE}&offset=0&limit=1000`, { method: 'GET' })).status).toBe(200)
    expect((await fetchConGuarda(`${URL_BASE}&limit=1000`, { method: 'GET' })).status).toBe(200)
  })
  it('control: HEAD (count) y fuera de /rest/v1/ -> pasan', async () => {
    vi.stubGlobal('fetch', responde('0-999/*'))
    expect((await fetchConGuarda(URL_BASE, { method: 'HEAD' })).status).toBe(200)
    expect((await fetchConGuarda('https://x.supabase.co/storage/v1/object/x', { method: 'GET' })).status).toBe(200)
  })
})
