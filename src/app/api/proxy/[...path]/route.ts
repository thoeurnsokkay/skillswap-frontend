import { NextRequest, NextResponse } from 'next/server'

const getBackendBaseUrl = () => {
  const fromServer = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL
  if (!fromServer) return null
  return fromServer.replace(/\/$/, '')
}

const buildTargetUrl = (pathParts: string[]) => {
  const base = getBackendBaseUrl()
  if (!base) return null
  const path = pathParts.join('/')
  return `${base}/${path}`
}

const forward = async (request: NextRequest, pathParts: string[]) => {
  const targetUrl = buildTargetUrl(pathParts)
  if (!targetUrl) {
    return NextResponse.json(
      { message: 'Backend API URL is not configured. Set BACKEND_API_URL in deployment env.' },
      { status: 500 },
    )
  }

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('content-length')

  const method = request.method.toUpperCase()
  const canHaveBody = !['GET', 'HEAD'].includes(method)
  const body = canHaveBody ? await request.arrayBuffer() : undefined

  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: 'manual',
  })

  const responseHeaders = new Headers(upstream.headers)
  responseHeaders.delete('content-encoding')
  responseHeaders.delete('transfer-encoding')

  const upstreamBody = await upstream.arrayBuffer()
  return new NextResponse(upstreamBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(request, params.path)
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(request, params.path)
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(request, params.path)
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(request, params.path)
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(request, params.path)
}

export async function OPTIONS(request: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(request, params.path)
}
