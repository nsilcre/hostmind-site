import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import { signToken, verifyToken, type TokenPayload } from '@/lib/jwt'

async function verifyPassword(plaintext: string, stored: string, userId: string): Promise<boolean> {
  if (stored.startsWith('$2')) {
    return bcrypt.compare(plaintext, stored)
  }
  // Contraseñas antiguas SHA-256: verificar y migrar a bcrypt en el acto
  const sha256 = createHash('sha256').update(plaintext).digest('hex')
  if (sha256 !== stored) return false
  const newHash = await bcrypt.hash(plaintext, 12)
  await db.user.update({ where: { id: userId }, data: { password: newHash } }).catch(() => {})
  return true
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { username: username.toLowerCase() } })
    if (!user || !(await verifyPassword(password, user.password, user.id))) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }
    const token = signToken({ username: user.username, name: user.name })
    return NextResponse.json({ token, name: user.name, username: user.username })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE() {
  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    const session = token ? verifyToken(token) : null
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    return NextResponse.json({ username: session.username, name: session.name })
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export function getSession(token: string | null): TokenPayload | null {
  if (!token) return null
  return verifyToken(token)
}

export function getSessionFromRequest(req: NextRequest): TokenPayload | null {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  return getSession(token)
}
