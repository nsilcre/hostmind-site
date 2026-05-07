import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromRequest } from '@/app/api/auth/route'

const rateLimits = new Map<string, { count: number; reset: number }>()

function checkRateLimit(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimits.get(ip)
  if (!entry || now > entry.reset) {
    rateLimits.set(ip, { count: 1, reset: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

export async function GET(req: NextRequest) {
  try {
    if (!getSessionFromRequest(req)) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const clients = await db.client.findMany({
      orderBy: { score: 'desc' },
      include: { _count: { select: { messages: true } } },
      take: 300,
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST /api/clients - Create a new client message with AI response
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Demasiadas peticiones. Intenta en un momento.' }, { status: 429 })
  }

  try {
    const { clientId, clientName, channel = 'web', message } = await req.json()
    if (!message) return NextResponse.json({ error: 'message requerido' }, { status: 400 })

    let client
    if (clientId) {
      client = await db.client.findUnique({ where: { id: clientId } })
    }
    if (!client) {
      client = await db.client.create({
        data: { name: clientName || `Cliente #${Date.now()}`, channel, step: 0, status: 'pending', isManual: false },
      })
    }

    await db.message.create({ data: { clientId: client.id, role: 'user', content: message } })

    if (client.isManual) {
      return NextResponse.json({ clientId: client.id, reply: null, isManual: true })
    }

    // Load AI config and active properties for context
    const [aiConfig, activeProperties] = await Promise.all([
      db.aIConfig.findFirst(),
      db.property.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } }),
    ])

    const profile = client.profile ? JSON.parse(client.profile) : {}
    let step = client.step || 0
    let isComplete = false
    let reply = ''

    if (step === 0) {
      // First contact: show property list
      const greeting = aiConfig?.greetingMessage || '¡Hola! 👋 Soy el asistente virtual del alojamiento.'

      if (activeProperties.length === 0) {
        reply = `${greeting}\n\n¿En qué te puedo ayudar? Cuéntame qué fechas tienes en mente y cuántas personas sois.`
        step = 2 // skip property selection, go straight to dates
      } else {
        const list = activeProperties
          .map((p, i) => {
            const pets = p.petsAllowed ? '🐾 Mascotas ✓' : '🚫 Sin mascotas'
            const minStay = p.minimumStay > 1 ? ` · Mín. ${p.minimumStay} noches` : ''
            const desc = p.description ? `\n   _${p.description}_` : ''
            return `${i + 1}. *${p.name}* — hasta ${p.guests} pax · ${p.pricePerNight}€/noche · ${pets}${minStay}${desc}`
          })
          .join('\n')

        reply = `${greeting}\n\n¿En qué departamento estás interesado?\n\n${list}\n\nIndícame el número o el nombre del departamento que te interesa 😊`

        profile.availableProperties = activeProperties.map((p) => ({
          id: p.id,
          name: p.name,
          guests: p.guests,
          pricePerNight: p.pricePerNight,
          petsAllowed: p.petsAllowed,
          minimumStay: p.minimumStay,
          description: p.description,
        }))
        step = 1
      }
    } else if (step === 1) {
      // Property selection
      type AvailableProp = { id: string; name: string; guests: number; pricePerNight: number; petsAllowed: boolean; minimumStay: number }
      const available: AvailableProp[] = profile.availableProperties || []
      const selection = message.trim()
      const num = parseInt(selection)
      let selected: AvailableProp | null = null

      if (!isNaN(num) && num >= 1 && num <= available.length) {
        selected = available[num - 1]
      } else {
        selected = available.find((p) => p.name.toLowerCase().includes(selection.toLowerCase())) ?? null
      }

      if (!selected) {
        const list = available.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
        reply = `No encontré ese departamento 🤔 Por favor indica el número:\n\n${list}`
        step = 1 // keep same step
      } else {
        profile.propertyId = selected.id
        profile.propertyName = selected.name
        profile.propertyGuests = selected.guests
        profile.propertyPetsAllowed = selected.petsAllowed
        profile.propertyMinimumStay = selected.minimumStay
        profile.propertyPrice = selected.pricePerNight

        reply = `¡Excelente elección! 🏠 *${selected.name}*\n\n¿Qué fechas tienes en mente para tu estancia? (ej: del 15 al 20 de julio)`
        step = 2
      }
    } else if (step === 2) {
      // Dates
      profile.dates = message
      const numbers = message.match(/\d+/g) || []
      profile.nights = numbers.length >= 2 ? Math.max(1, Math.abs(parseInt(numbers[1]) - parseInt(numbers[0]))) : 3

      const minStay: number = profile.propertyMinimumStay || 1
      if (profile.nights < minStay) {
        reply = `⚠️ Este departamento tiene una estancia mínima de *${minStay} noches*. ¿Puedes ajustar las fechas?`
        step = 2 // re-ask
      } else {
        const maxGuests: number = profile.propertyGuests || 20
        reply = `¡Perfecto! ¿Cuántas personas sois en total? (máximo ${maxGuests} personas en este departamento)`
        step = 3
      }
    } else if (step === 3) {
      // Guests
      profile.guests = message
      const guests = parseInt(message) || 0
      const maxGuests: number = profile.propertyGuests || 20

      if (guests > maxGuests) {
        reply = `⚠️ Este departamento tiene capacidad máxima para *${maxGuests} personas*. ¿Podéis ser menos o necesitáis otro departamento?`
        step = 3 // re-ask
      } else {
        const petsLine = profile.propertyPetsAllowed === false
          ? '\n\n🚫 Recuerda que este alojamiento *no admite mascotas*.'
          : profile.propertyPetsAllowed === true
          ? '\n\n🐾 Este alojamiento *sí admite mascotas*.'
          : ''
        reply = `¿Cuál es el motivo principal del viaje? (vacaciones, trabajo, turismo, familia...)${petsLine}`
        step = 4
      }
    } else if (step >= 4) {
      // Purpose → classify
      profile.purpose = message
      isComplete = true
      const scoring = calculateScore(profile)
      profile.scoring = scoring
      const emoji = scoring.label === 'TOP' ? '🌟' : scoring.label === 'NORMAL' ? '👍' : '⚠️'
      reply = `¡Gracias por toda la información! ${emoji} Hemos registrado tu solicitud correctamente. Un responsable revisará tu consulta y te responderá a la brevedad. ¡Hasta pronto!`
      const summary = buildSummary(profile)
      await db.client.update({
        where: { id: client.id },
        data: {
          score: scoring.score,
          scoreLabel: scoring.label,
          scoreReasons: JSON.stringify(scoring.reasons),
          profile: JSON.stringify(profile),
          summary,
          status: 'classified',
          step: step + 1,
        },
      })
    }

    if (!isComplete) {
      await db.client.update({
        where: { id: client.id },
        data: { profile: JSON.stringify(profile), step },
      })
    }

    await db.message.create({ data: { clientId: client.id, role: 'assistant', content: reply } })

    return NextResponse.json({ clientId: client.id, reply, isComplete, scoring: profile.scoring || null })
  } catch (error) {
    console.error('Error processing message:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

function calculateScore(profile: Record<string, unknown>): { score: number; label: string; reasons: string[] } {
  let score = 50
  const reasons: string[] = []

  // Property price tier (replaces budget question)
  const price = Number(profile.propertyPrice) || 0
  if (price >= 150) { score += 20; reasons.push('✅ Departamento de precio alto') }
  else if (price >= 80) { score += 10; reasons.push('⚠️ Departamento de precio medio') }

  // Guests
  const guests = parseInt(String(profile.guests)) || 0
  const maxGuests = parseInt(String(profile.propertyGuests)) || 10
  if (guests === 0) { score -= 5 }
  else if (guests <= 2) { score += 20; reasons.push('✅ Grupo pequeño (ideal)') }
  else if (guests <= Math.ceil(maxGuests / 2)) { score += 10; reasons.push('⚠️ Grupo mediano') }
  else { score -= 15; reasons.push('🔴 Grupo grande (riesgo)') }

  // Purpose
  const purpose = String(profile.purpose || '').toLowerCase()
  if (['vacaciones', 'trabajo', 'negocios', 'turismo', 'familia'].some((k) => purpose.includes(k))) {
    score += 20; reasons.push('✅ Motivo legítimo')
  } else if (['fiesta', 'party', 'celebración', 'cumpleaños'].some((k) => purpose.includes(k))) {
    score -= 25; reasons.push('🔴 Posible fiesta/evento')
  } else if (purpose.length > 0) {
    score += 5; reasons.push('⚠️ Motivo no clasificado')
  }

  // Nights
  const nights = parseInt(String(profile.nights)) || 0
  if (nights >= 5) { score += 10; reasons.push('✅ Estancia larga') }
  else if (nights >= 2) { score += 5 }
  else if (nights === 1) { score -= 5; reasons.push('⚠️ Estancia muy corta') }

  score = Math.max(0, Math.min(100, score))
  const label = score >= 75 ? 'TOP' : score >= 45 ? 'NORMAL' : 'RIESGO'
  return { score, label, reasons }
}

function buildSummary(profile: Record<string, unknown>): string {
  return [
    profile.propertyName ? `🏠 ${profile.propertyName}` : null,
    `📅 ${profile.dates || 'Sin fechas'}`,
    `👥 ${profile.guests || '?'} pax`,
    profile.nights ? `🌙 ${profile.nights} noches` : null,
    `🎯 ${profile.purpose || 'Sin motivo'}`,
  ]
    .filter(Boolean)
    .join(' · ')
}
