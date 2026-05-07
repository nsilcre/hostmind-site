import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const { message } = await req.json()
    if (!message) return NextResponse.json({ error: 'message requerido' }, { status: 400 })

    const client = await db.client.findUnique({ where: { id: clientId } })
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    await db.message.create({
      data: { clientId, role: 'owner', content: message },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending manual reply:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
