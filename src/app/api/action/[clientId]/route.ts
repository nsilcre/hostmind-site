import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const { action } = await req.json()

    const client = await db.client.findUnique({ where: { id: clientId } })
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    const validActions: Record<string, { status: string; isManual: boolean }> = {
      accept: { status: 'accepted', isManual: true },
      reject: { status: 'rejected', isManual: true },
      negotiate: { status: 'negotiating', isManual: false },
      manual: { status: 'manual', isManual: true },
      auto: { status: 'classified', isManual: false },
    }

    const actionData = validActions[action]
    if (!actionData) return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })

    const updated = await db.client.update({
      where: { id: clientId },
      data: { status: actionData.status, isManual: actionData.isManual },
    })

    return NextResponse.json({ success: true, client: updated })
  } catch (error) {
    console.error('Error performing action:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
