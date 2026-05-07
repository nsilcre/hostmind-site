import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.AUTH_SECRET ?? 'hostmind-dev-secret-CHANGE-IN-PRODUCTION'
const EXPIRES_IN = 7 * 24 * 60 * 60 // 7 days in seconds

export interface TokenPayload {
  username: string
  name: string
  iat?: number
  exp?: number
}

function b64url(data: string | Buffer): string {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + EXPIRES_IN }))
  const sig = createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const expected = createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url')
    const sigBuf = Buffer.from(sig, 'base64url')
    const expBuf = Buffer.from(expected, 'base64url')
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
    const payload: TokenPayload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
