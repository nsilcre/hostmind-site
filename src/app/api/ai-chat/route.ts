import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/app/api/auth/route'
import { db } from '@/lib/db'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

export async function POST(req: NextRequest) {
  if (!getSessionFromRequest(req)) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const { message, history } = await req.json()
    if (!message) return NextResponse.json({ error: 'message requerido' }, { status: 400 })

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ reply: '⚠️ La IA no está configurada. Añade GROQ_API_KEY al archivo .env.' })

    // Fetch real data to give the AI context
    const [properties, bookings, clients, aiConfig] = await Promise.all([
      db.property.findMany({ orderBy: { name: 'asc' } }),
      db.booking.findMany({ orderBy: { startDate: 'desc' }, take: 20, include: { property: true } }),
      db.client.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      db.aIConfig.findFirst(),
    ])

    const activeProps = properties.filter(p => p.status === 'active')
    const ownerName = aiConfig?.ownerName || 'el propietario'

    const propertyList = properties.map(p =>
      `- ${p.name} (${p.type || 'propiedad'}, ${p.status}): ${p.guests} personas máx, ${p.pricePerNight}€/noche, mín ${p.minimumStay} noches${p.petsAllowed ? ', mascotas OK' : ''}`
    ).join('\n') || 'Sin propiedades registradas.'

    const bookingList = bookings.slice(0, 10).map(b =>
      `- ${b.property?.name || '?'}: ${b.title} · ${new Date(b.startDate).toLocaleDateString('es-ES')} → ${new Date(b.endDate).toLocaleDateString('es-ES')} · ${b.price ?? '-'}€ · estado: ${b.status}`
    ).join('\n') || 'Sin reservas recientes.'

    const clientList = clients.slice(0, 10).map(c =>
      `- ${c.name} (${c.channel}): estado ${c.status}${c.score ? `, puntuación ${c.score}` : ''}${c.summary ? ` — ${c.summary}` : ''}`
    ).join('\n') || 'Sin clientes recientes.'

    const systemPrompt = `Eres el asistente IA personal de ${ownerName} en HostMind, plataforma de gestión de alquileres vacacionales.

DATOS ACTUALES DEL NEGOCIO:

Propiedades (${properties.length} total, ${activeProps.length} activas):
${propertyList}

Últimas reservas:
${bookingList}

Últimos clientes/leads:
${clientList}

CAPACIDADES:
- Responde cualquier pregunta sobre las propiedades, reservas y clientes anteriores
- Ayuda a redactar mensajes profesionales para huéspedes
- Aconseja sobre precios, estrategia de ingresos y ocupación
- Explica legislación de alquileres turísticos en España
- Ayuda a gestionar conflictos con huéspedes
- Responde preguntas generales sobre cualquier tema

REGLAS:
- Responde siempre en español
- Sé conciso y práctico
- Si no tienes información suficiente, pregunta
- No inventes datos que no aparezcan arriba`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      })),
      { role: 'user', content: message },
    ]

    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: 1000, temperature: 0.7 }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('Groq error:', err)
      return NextResponse.json({ reply: '⚠️ Error al conectar con la IA. Inténtalo de nuevo.' })
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || '⚠️ Sin respuesta de la IA.'
    return NextResponse.json({ reply })

  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json({ reply: '⚠️ Error interno. Inténtalo de nuevo.' })
  }
}
