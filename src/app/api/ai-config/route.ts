import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/app/api/auth/route'

async function getOrCreateConfig() {
  let config = await db.aIConfig.findFirst()
  if (!config) {
    config = await db.aIConfig.create({
      data: {
        ownerName: 'el asistente virtual',
        greetingMessage: null,
        systemPrompt: null,
      },
    })
  }
  return config
}

export async function GET(req: NextRequest) {
  if (!getSessionFromRequest(req)) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  try {
    return NextResponse.json(await getOrCreateConfig())
  } catch (error) {
    console.error('Error fetching AI config:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  if (!getSessionFromRequest(req)) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  try {
    const { ownerName, systemPrompt, greetingMessage } = await req.json()
    const existing = await db.aIConfig.findFirst()
    const config = existing
      ? await db.aIConfig.update({
          where: { id: existing.id },
          data: {
            ...(ownerName !== undefined && { ownerName: ownerName || 'el asistente virtual' }),
            ...(systemPrompt !== undefined && { systemPrompt: systemPrompt || null }),
            ...(greetingMessage !== undefined && { greetingMessage: greetingMessage || null }),
          },
        })
      : await db.aIConfig.create({
          data: {
            ownerName: ownerName || 'el asistente virtual',
            systemPrompt: systemPrompt || null,
            greetingMessage: greetingMessage || null,
          },
        })
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error updating AI config:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
