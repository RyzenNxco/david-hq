import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'no url' }, { status: 400 })
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => {
    if (!['host','content-length'].includes(k)) headers[k] = v
  })
  try {
    const res = await fetch(decodeURIComponent(url), { headers })
    const body = await res.text()
    return new NextResponse(body, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' }
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'no url' }, { status: 400 })
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => {
    if (!['host','content-length'].includes(k)) headers[k] = v
  })
  const body = await req.text()
  try {
    const res = await fetch(decodeURIComponent(url), {
      method: 'POST', headers, body
    })
    const resBody = await res.text()
    return new NextResponse(resBody, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' }
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
