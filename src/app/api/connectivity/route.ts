import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const connections = await db.connection.findMany()
    const result: Record<string, { id: string; provider: string; connected: boolean; pageName?: string; connectedAt?: string }> = {}

    for (const c of connections) {
      result[c.provider] = {
        id: c.id,
        provider: c.provider,
        connected: c.connected,
        pageName: c.pageName || undefined,
        connectedAt: c.connectedAt?.toISOString() || undefined,
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { provider, connect } = await req.json()
  try {
    const adminUser = await db.user.findFirst()
    if (!adminUser) return NextResponse.json({ error: 'No hay usuarios registrados' }, { status: 400 })

    if (provider === 'facebook') {
      if (!connect) {
        await db.connection.updateMany({
          where: { provider: 'facebook' },
          data: { connected: false },
        })
        return NextResponse.json({ success: true, disconnected: true })
      }
      return NextResponse.json({ error: 'Usa el flujo OAuth de Facebook para conectar' }, { status: 400 })
    }

    // Simulate connection for other providers
    const existing = await db.connection.findFirst({ where: { provider } })
    if (existing) {
      await db.connection.update({
        where: { id: existing.id },
        data: { connected: connect, connectedAt: connect ? new Date() : null },
      })
    } else {
      await db.connection.create({
        data: {
          userId: adminUser.id,
          provider,
          connected: connect,
          connectedAt: connect ? new Date() : null,
        },
      })
    }

    return NextResponse.json({ success: true, simulated: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
