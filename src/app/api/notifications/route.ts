import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/app/api/auth/route'

// GET /api/notifications - List notifications
export async function GET(req: NextRequest) {
  if (!getSessionFromRequest(req)) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  try {
    const notifications = await db.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const unreadCount = notifications.filter(n => !n.read).length

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Error al cargar notificaciones' }, { status: 500 })
  }
}

// POST /api/notifications - Create notification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, title, content, link } = body

    // Find first user for notifications
    const user = await db.user.findFirst()
    if (!user) {
      return NextResponse.json({ error: 'No hay usuarios' }, { status: 400 })
    }

    const notification = await db.notification.create({
      data: {
        userId: user.id,
        type: type || 'system',
        title,
        content: content || null,
        link: link || null,
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: 'Error al crear notificación' }, { status: 500 })
  }
}

// PUT /api/notifications - Mark all as read
export async function PUT() {
  try {
    await db.notification.updateMany({
      where: { read: false },
      data: { read: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json({ error: 'Error al actualizar notificaciones' }, { status: 500 })
  }
}
