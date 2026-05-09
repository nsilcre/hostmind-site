import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function getFacebookConfig() {
  const config = await db.connection.findFirst({ where: { provider: 'facebook_config' } })
  if (config?.rawJson) {
    try { return JSON.parse(config.rawJson) } catch { /* empty */ }
  }
  return { appId: process.env.FACEBOOK_APP_ID || '', appSecret: process.env.FACEBOOK_APP_SECRET || '' }
}

async function getFacebookConnection() {
  return db.connection.findFirst({ where: { provider: 'facebook', connected: true } })
}

async function handleIncomingMessage(
  connection: { accessToken: string | null; pageId: string | null },
  senderId: string,
  senderName: string,
  messageText: string,
  messageId?: string
) {
  // Dedup: skip if this exact message was already processed by a concurrent request
  if (messageId) {
    const alreadyProcessed = await db.message.findFirst({ where: { sourceId: messageId } })
    if (alreadyProcessed) return
  }

  let client = await db.client.findFirst({ where: { sourceId: senderId, channel: 'Facebook' } })
  if (!client) {
    client = await db.client.create({
      data: { name: senderName, channel: 'Facebook', sourceId: senderId, status: 'pending', isManual: false, step: 0 },
    })
  }
  if (client.isManual) return

  // Don't auto-respond to conversations already resolved by the host
  if (['confirmed', 'accepted', 'rejected'].includes(client.status)) return

  // Fetch history BEFORE saving current message so the Groq array never has timing issues
  const [aiConfig, activeProperties, history] = await Promise.all([
    db.aIConfig.findFirst(),
    db.property.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } }),
    db.message.findMany({ where: { clientId: client.id }, orderBy: { createdAt: 'asc' }, take: 20 }),
  ])

  await db.message.create({
    data: { clientId: client.id, role: 'user', content: messageText, sourceId: messageId },
  })

  const groqApiKey = process.env.GROQ_API_KEY
  let reply = aiConfig?.greetingMessage || '¡Hola! 👋 Gracias por contactarnos. Enseguida te atendemos.'

  if (groqApiKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: buildQualificationPrompt(activeProperties, aiConfig) },
            ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
            { role: 'user', content: messageText },
          ],
          max_tokens: 200,
          temperature: 0.75,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        reply = data.choices?.[0]?.message?.content || reply
      } else {
        const errData = await res.json().catch(() => ({}))
        console.error('[AI] Groq API error:', res.status, JSON.stringify(errData))
      }
    } catch (e) { console.error('[AI] Groq fetch error:', e) }
  }

  const markerMatch = reply.match(/\[DATOS:(\{[\s\S]*?\})\]/)
  const pesadoMatch = reply.includes('[PESADO]')
  const cleanReply = reply.replace(/\[DATOS:[\s\S]*?\]/, '').replace('[PESADO]', '').trim()

  const user = await db.user.findFirst()

  if (markerMatch) {
    try {
      const profileData = JSON.parse(markerMatch[1])
      const score = calcScore(profileData, activeProperties)
      const summary = `🏠 ${profileData.propiedad || '?'} · 📅 ${profileData.fechas || '?'} · 👥 ${profileData.huespedes || '?'} pax · 🎯 ${profileData.motivo || '?'}`
      await db.client.update({
        where: { id: client.id },
        data: {
          score: score.score, scoreLabel: score.label,
          scoreReasons: JSON.stringify(score.reasons),
          profile: JSON.stringify(profileData), status: 'classified',
          isManual: true,
          summary,
          step: 1,
        },
      })
      if (user) {
        await db.notification.create({
          data: {
            userId: user.id, type: 'client',
            title: `Nuevo cliente calificado: ${client.name}`,
            content: `${score.label} (${score.score}/100) — ${summary}`,
            link: 'messages',
          },
        })
      }
    } catch { /* ignore */ }
  }

  if (pesadoMatch) {
    await db.client.update({ where: { id: client.id }, data: { isManual: true, status: 'classified' } })
    if (user) {
      await db.notification.create({
        data: {
          userId: user.id, type: 'alert',
          title: `Cliente difícil: ${client.name}`,
          content: 'La IA ha transferido esta conversación. Requiere atención manual.',
          link: 'messages',
        },
      })
    }
  }

  const finalReply = markerMatch
    ? `${cleanReply ? cleanReply + '\n\n' : ''}Tu solicitud de reserva ha sido recibida y está pendiente de revisión por el propietario. En cuanto la confirme, recibirás un mensaje con todos los detalles. ¡Muchas gracias! 🏠`
    : cleanReply

  await db.message.create({ data: { clientId: client.id, role: 'assistant', content: finalReply } })

  await fetch(
    `https://graph.facebook.com/v21.0/${connection.pageId}/messages?access_token=${connection.accessToken}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient: { id: senderId }, message: { text: finalReply } }) }
  ).catch(e => console.error('[AI] Send error:', e))
}

async function handleWebhookEvents(entries: unknown[]) {
  const connection = await getFacebookConnection()
  if (!connection?.accessToken) return

  for (const entry of entries as { messaging?: unknown[] }[]) {
    for (const event of entry.messaging || []) {
      const e = event as { sender?: { id: string }; message?: { text?: string; mid?: string } }
      const senderId = e.sender?.id
      const messageText = e.message?.text
      if (!senderId || !messageText) continue
      if (senderId === connection.pageId) continue

      if (e.message?.mid) {
        const exists = await db.message.findFirst({ where: { sourceId: e.message.mid } })
        if (exists) continue
      }

      let senderName = `Facebook User ${senderId}`
      try {
        const r = await fetch(`https://graph.facebook.com/v21.0/${senderId}?fields=name&access_token=${connection.accessToken}`)
        const d = await r.json()
        if (d.name) senderName = d.name
      } catch { /* use default */ }

      await handleIncomingMessage(connection, senderId, senderName, messageText, e.message?.mid)
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  // Facebook webhook verification (no auth token needed)
  if (searchParams.get('hub.mode') === 'subscribe') {
    const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'hostmind_webhook_2026'
    if (searchParams.get('hub.verify_token') === verifyToken) {
      return new NextResponse(searchParams.get('hub.challenge') || '', { status: 200 })
    }
    return new NextResponse('Forbidden', { status: 403 })
  }

  const action = searchParams.get('action')
  const token = req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Connection status
  if (action === 'status') {
    const connection = await getFacebookConnection()
    return NextResponse.json({
      connected: connection?.connected || false,
      pageName: connection?.pageName || null,
      pageId: connection?.pageId || null,
      connectedAt: connection?.connectedAt?.toISOString() || null,
    })
  }

  // Get Facebook config status
  if (action === 'config-status') {
    const config = await getFacebookConfig()
    return NextResponse.json({
      hasAppId: !!config.appId && config.appId !== 'YOUR_APP_ID',
      hasAppSecret: !!config.appSecret && config.appSecret !== 'YOUR_APP_SECRET',
    })
  }

  // Get Facebook App ID (needed for SDK init on client)
  if (action === 'get-app-id') {
    const config = await getFacebookConfig()
    if (!config.appId || config.appId === 'YOUR_APP_ID') {
      return NextResponse.json({ error: 'App ID no configurado', code: 'NO_CONFIG' }, { status: 400 })
    }
    return NextResponse.json({ appId: config.appId })
  }

  // Fetch conversations from Facebook
  if (action === 'conversations') {
    const connection = await getFacebookConnection()
    if (!connection?.accessToken) {
      return NextResponse.json({ error: 'Facebook no conectado', code: 'NOT_CONNECTED' }, { status: 400 })
    }

    try {
      // Fetch page conversations
      const fbRes = await fetch(
        `https://graph.facebook.com/v21.0/${connection.pageId}/conversations?fields=id,snippet,updated_time,participants%7Bid%2Cname%2Cpicture%7Burl%7D%7D,unread_count&limit=25&access_token=${connection.accessToken}`
      )

      if (!fbRes.ok) {
        const errData = await fbRes.json().catch(() => ({}))
        const errCode = errData?.error?.code
        if (errCode === 190) {
          await db.connection.update({ where: { id: connection.id }, data: { connected: false } })
          return NextResponse.json({ error: 'Token de Facebook expirado. Reconecta tu cuenta.', code: 'TOKEN_EXPIRED' }, { status: 401 })
        }
        if (errCode === 298 || errCode === 10 || errCode === 200) {
          return NextResponse.json({
            error: 'Permisos insuficientes. El token necesita los permisos pages_messaging y pages_read_engagement. Reconecta tu cuenta de Facebook.',
            code: 'INSUFFICIENT_PERMISSIONS',
          }, { status: 403 })
        }
        console.error('FB API error:', errData)
        return NextResponse.json({ error: 'Error consultando Facebook API', details: errData }, { status: 500 })
      }

      const convData = await fbRes.json()
      if (!convData.data || convData.data.length === 0) {
        return NextResponse.json({ conversations: [], pageInfo: convData.paging })
      }

      type FBParticipant = { id: string; name?: string; picture?: { data?: { url?: string }; url?: string } }
      const buildParticipant = (p: FBParticipant | undefined) => {
        if (!p) return null
        const picUrl = p.picture?.data?.url || p.picture?.url || null
        return { id: p.id, name: p.name || null, pictureUrl: picUrl }
      }

      const conversations = convData.data.map((conv: Record<string, unknown>) => {
        const participantsList: FBParticipant[] =
          (conv.participants as { data: FBParticipant[] })?.data || []
        const pageParticipant = participantsList.find((p) => p.id === connection.pageId)
        const otherParticipant = participantsList.find((p) => p.id !== connection.pageId)
        return {
          id: conv.id,
          snippet: conv.snippet || '',
          updatedTime: conv.updated_time,
          unreadCount: conv.unread_count || 0,
          participant: buildParticipant(otherParticipant || pageParticipant),
          isPageParticipant: !!pageParticipant && !otherParticipant,
          messages: [],
        }
      })

      return NextResponse.json({
        conversations: conversations.sort((a: { updatedTime: string }, b: { updatedTime: string }) =>
          new Date(b.updatedTime).getTime() - new Date(a.updatedTime).getTime()
        ),
        pageInfo: convData.paging || null,
      })
    } catch (error) {
      console.error('Facebook API error:', error)
      return NextResponse.json({ error: 'Error consultando Facebook' }, { status: 500 })
    }
  }

  // Fetch messages for a single conversation (lazy load)
  if (action === 'messages') {
    const conversationId = searchParams.get('conversationId')
    if (!conversationId) return NextResponse.json({ error: 'conversationId requerido' }, { status: 400 })

    const connection = await getFacebookConnection()
    if (!connection?.accessToken) return NextResponse.json({ error: 'Facebook no conectado' }, { status: 400 })

    try {
      const msgRes = await fetch(
        `https://graph.facebook.com/v21.0/${conversationId}/messages?fields=id,message,from,created_time,attachments&limit=50&access_token=${connection.accessToken}`
      )
      const msgData = await msgRes.json()
      if (!msgRes.ok) return NextResponse.json({ error: msgData?.error?.message || 'Error cargando mensajes' }, { status: 500 })

      const messages = (msgData.data || []).reverse().map((m: Record<string, unknown>) => ({
        id: m.id,
        message: m.message || '',
        from: m.from,
        createdTime: m.created_time,
        attachments: (m.attachments as { data?: unknown[] })?.data || [],
        isFromPage: (m.from as Record<string, unknown>)?.id === connection.pageId,
      }))
      return NextResponse.json({ messages })
    } catch (error) {
      console.error('FB messages error:', error)
      return NextResponse.json({ error: 'Error cargando mensajes' }, { status: 500 })
    }
  }

  // Check if the stored Facebook token is still valid
  if (action === 'verify-token') {
    const connection = await getFacebookConnection()
    if (!connection?.accessToken) return NextResponse.json({ expired: false, connected: false })
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${connection.accessToken}`)
      const d = await r.json()
      const expired = !r.ok || d.error?.code === 190 || d.error?.code === 102 || d.error?.code === 104
      return NextResponse.json({ expired, connected: true })
    } catch {
      return NextResponse.json({ expired: false, connected: true })
    }
  }

  // Get AI active status for a conversation participant
  if (action === 'ai-status') {
    const participantId = searchParams.get('participantId')
    if (!participantId) return NextResponse.json({ aiActive: true })
    const client = await db.client.findFirst({ where: { sourceId: participantId, channel: 'Facebook' } })
    return NextResponse.json({
      aiActive: client ? !client.isManual : true,
      isClassified: client?.status === 'classified' && !!client.profile,
      profile: client?.profile ? JSON.parse(client.profile) : null,
      clientId: client?.id || null,
    })
  }

  // Auto-reply polling: check for unprocessed messages and respond with AI
  if (action === 'auto-reply') {
    const connection = await getFacebookConnection()
    if (!connection?.accessToken) return NextResponse.json({ processed: 0 })

    try {
      const convRes = await fetch(
        `https://graph.facebook.com/v21.0/${connection.pageId}/conversations?fields=id,unread_count,participants%7Bid%2Cname%7D&limit=20&access_token=${connection.accessToken}`
      )
      const convData = await convRes.json()
      let processed = 0

      for (const conv of convData.data || []) {
        const participantsList: { id: string; name?: string }[] = conv.participants?.data || []
        const sender = participantsList.find((p: { id: string }) => p.id !== connection.pageId)
        if (!sender) continue

        // Check if this client has AI disabled
        const existingClient = await db.client.findFirst({ where: { sourceId: sender.id, channel: 'Facebook' } })
        if (existingClient?.isManual) continue

        const msgRes = await fetch(
          `https://graph.facebook.com/v21.0/${conv.id}/messages?fields=id,message,from,created_time&limit=10&access_token=${connection.accessToken}`
        )
        const msgData = await msgRes.json()
        const msgs: { id: string; message?: string; from?: { id: string; name?: string }; created_time: string }[] =
          (msgData.data || []).reverse()

        for (const msg of msgs) {
          if (!msg.message || msg.from?.id === connection.pageId) continue
          const exists = await db.message.findFirst({ where: { sourceId: msg.id } })
          if (exists) continue

          // New unprocessed message — handle with AI
          await handleIncomingMessage(connection, sender.id, sender.name || `FB User ${sender.id}`, msg.message, msg.id)
          processed++
        }
      }

      return NextResponse.json({ processed })
    } catch (e) {
      console.error('[AutoReply] error:', e)
      return NextResponse.json({ processed: 0 })
    }
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  // Facebook webhook incoming message event — respond immediately, process async
  if (body.object === 'page') {
    console.log('[Webhook] Facebook event received, entries:', body.entry?.length)
    handleWebhookEvents(body.entry || []).catch(e => console.error('[Webhook] unhandled error:', e))
    return NextResponse.json({ status: 'ok' })
  }

  // Save Facebook App Configuration
  if (action === 'save-config') {
    const { appId, appSecret } = body
    if (!appId || !appSecret) {
      return NextResponse.json({ error: 'App ID y App Secret son requeridos' }, { status: 400 })
    }

    const adminUser = await db.user.findFirst()
    if (!adminUser) return NextResponse.json({ error: 'No hay usuarios registrados' }, { status: 400 })

    const existing = await db.connection.findFirst({ where: { provider: 'facebook_config' } })
    if (existing) {
      await db.connection.update({
        where: { id: existing.id },
        data: { rawJson: JSON.stringify({ appId, appSecret }) },
      })
    } else {
      await db.connection.create({
        data: {
          userId: adminUser.id,
          provider: 'facebook_config',
          connected: true,
          rawJson: JSON.stringify({ appId, appSecret }),
        },
      })
    }

    return NextResponse.json({ success: true })
  }

  // Store a manually provided Page Access Token
  if (action === 'manual-token') {
    const { pageToken } = body
    if (!pageToken) {
      return NextResponse.json({ error: 'Page Access Token requerido' }, { status: 400 })
    }

    try {
      // Verify token by fetching page info
      const verifyRes = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${pageToken}`
      )
      const verifyData = await verifyRes.json()

      if (!verifyRes.ok || verifyData.error) {
        return NextResponse.json({
          error: 'Token inválido: ' + (verifyData.error?.message || 'No se pudo verificar'),
        }, { status: 400 })
      }

      const adminUser = await db.user.findFirst()
      if (!adminUser) throw new Error('No hay usuarios registrados')

      const existing = await db.connection.findFirst({ where: { provider: 'facebook' } })
      const connData = {
        connected: true,
        accessToken: pageToken,
        pageId: verifyData.id,
        pageName: verifyData.name,
        connectedAt: new Date(),
      }
      if (existing) {
        await db.connection.update({ where: { id: existing.id }, data: connData })
      } else {
        await db.connection.create({ data: { userId: adminUser.id, provider: 'facebook', ...connData } })
      }

      return NextResponse.json({
        success: true,
        pageName: verifyData.name,
        pageId: verifyData.id,
      })
    } catch (error) {
      console.error('Manual token error:', error)
      return NextResponse.json({ error: 'Error verificando token' }, { status: 500 })
    }
  }

  // Exchange short-lived token from FB SDK for long-lived page access token
  if (action === 'exchange-token') {
    const { userAccessToken } = body
    if (!userAccessToken) {
      return NextResponse.json({ error: 'Token de acceso requerido' }, { status: 400 })
    }

    const config = await getFacebookConfig()
    if (!config.appId || !config.appSecret) {
      return NextResponse.json({ error: 'Configura tu App ID y App Secret en Ajustes primero', code: 'NO_CONFIG' }, { status: 400 })
    }

    try {
      // Step 1: Exchange short-lived token for long-lived user access token
      const tokenRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.appId}&client_secret=${config.appSecret}&fb_exchange_token=${userAccessToken}`
      )
      const tokenData = await tokenRes.json()

      if (!tokenData.access_token) {
        console.error('Token exchange failed:', tokenData)
        return NextResponse.json({ error: 'Error intercambiando token: ' + (tokenData.error?.message || 'Error desconocido') }, { status: 400 })
      }

      const longLivedToken = tokenData.access_token

      // Step 2: Get user's Facebook Pages
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,picture&access_token=${longLivedToken}`
      )
      const pagesData = await pagesRes.json()

      if (!pagesData.data || pagesData.data.length === 0) {
        return NextResponse.json({
          error: 'No se encontraron páginas de Facebook. Necesitas administrar al menos una Página de Facebook para usar Messenger.',
          code: 'NO_PAGES',
        }, { status: 400 })
      }

      const page = pagesData.data[0]

      // Step 3: Store the connection
      const adminUser = await db.user.findFirst()
      if (!adminUser) throw new Error('No hay usuarios registrados')
      const existing = await db.connection.findFirst({ where: { provider: 'facebook' } })
      if (existing) {
        await db.connection.update({
          where: { id: existing.id },
          data: {
            connected: true,
            accessToken: page.access_token,
            refreshToken: longLivedToken,
            pageId: page.id,
            pageName: page.name,
            rawJson: JSON.stringify({ pages: pagesData.data, longLivedToken }),
            connectedAt: new Date(),
          },
        })
      } else {
        await db.connection.create({
          data: {
            userId: adminUser.id,
            provider: 'facebook',
            connected: true,
            accessToken: page.access_token,
            refreshToken: longLivedToken,
            pageId: page.id,
            pageName: page.name,
            rawJson: JSON.stringify({ pages: pagesData.data, longLivedToken }),
            connectedAt: new Date(),
          },
        })
      }

      return NextResponse.json({
        success: true,
        pageName: page.name,
        pageId: page.id,
        totalPages: pagesData.data.length,
      })
    } catch (error) {
      console.error('Facebook OAuth error:', error)
      return NextResponse.json({ error: 'Error conectando con Facebook: ' + (error instanceof Error ? error.message : 'Error desconocido') }, { status: 500 })
    }
  }

  // Publish a property post to the Facebook Page feed
  if (action === 'publish-post') {
    const { message } = body
    if (!message) return NextResponse.json({ error: 'message requerido' }, { status: 400 })

    const connection = await getFacebookConnection()
    if (!connection?.accessToken) {
      return NextResponse.json({ error: 'Facebook no conectado', code: 'NOT_CONNECTED' }, { status: 400 })
    }

    try {
      const postRes = await fetch(
        `https://graph.facebook.com/v21.0/${connection.pageId}/feed?access_token=${connection.accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        }
      )
      const postData = await postRes.json()
      if (!postRes.ok || postData.error) {
        console.error('FB publish error:', postData)
        const fbCode = postData.error?.code
        if (fbCode === 190 || fbCode === 102 || fbCode === 104) {
          return NextResponse.json({ error: 'El token de Facebook ha expirado. Ve a Conectividad y vuelve a conectar tu cuenta con un token nuevo.', code: 'TOKEN_EXPIRED' }, { status: 401 })
        }
        if (fbCode === 200 || fbCode === 10 || fbCode === 3) {
          return NextResponse.json({ error: 'El token no tiene permiso para publicar. Necesitas añadir pages_manage_posts al generarlo en Graph API Explorer.', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 })
        }
        return NextResponse.json({ error: postData.error?.message || 'Error publicando en Facebook' }, { status: 500 })
      }
      return NextResponse.json({ success: true, postId: postData.id })
    } catch (error) {
      console.error('FB publish error:', error)
      return NextResponse.json({ error: 'Error publicando en Facebook' }, { status: 500 })
    }
  }

  // Disconnect
  if (action === 'disconnect') {
    await db.connection.updateMany({
      where: { provider: 'facebook' },
      data: { connected: false, accessToken: null, refreshToken: null },
    })
    return NextResponse.json({ success: true })
  }

  // Send message to a Facebook conversation
  if (action === 'send-message') {
    const { conversationId, recipientId, message } = body
    if (!message || (!conversationId && !recipientId)) {
      return NextResponse.json({ error: 'recipientId y message son requeridos' }, { status: 400 })
    }

    const connection = await getFacebookConnection()
    if (!connection?.accessToken) {
      return NextResponse.json({ error: 'Facebook no conectado', code: 'NOT_CONNECTED' }, { status: 400 })
    }

    try {
      // Resolve recipient: use provided recipientId or fetch from conversation
      let targetId = recipientId as string | null
      if (!targetId && conversationId) {
        const convRes = await fetch(
          `https://graph.facebook.com/v21.0/${conversationId}?fields=participants&access_token=${connection.accessToken}`
        )
        const convData = await convRes.json()
        type P = { id: string }
        const list: P[] = (convData.participants as { data: P[] })?.data || []
        targetId = list.find((p) => p.id !== connection.pageId)?.id || null
      }

      if (!targetId) {
        return NextResponse.json({ error: 'No se encontró el destinatario' }, { status: 400 })
      }

      const sendRes = await fetch(
        `https://graph.facebook.com/v21.0/${connection.pageId}/messages?access_token=${connection.accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: targetId },
            message: { text: message },
          }),
        }
      )

      const sendData = await sendRes.json()
      if (!sendRes.ok || sendData.error) {
        console.error('FB Send error:', sendData)
        return NextResponse.json({ error: sendData.error?.message || 'Error enviando mensaje' }, { status: 500 })
      }

      return NextResponse.json({ success: true, messageId: sendData.message_id })
    } catch (error) {
      console.error('FB Send error:', error)
      return NextResponse.json({ error: 'Error enviando mensaje' }, { status: 500 })
    }
  }

  // Confirm booking: parse dates with AI, create booking, notify client
  if (action === 'confirm-booking') {
    const { participantId } = body
    if (!participantId) return NextResponse.json({ error: 'participantId requerido' }, { status: 400 })

    const client = await db.client.findFirst({ where: { sourceId: participantId, channel: 'Facebook' } })
    if (!client?.profile) return NextResponse.json({ error: 'El cliente no tiene datos de reserva' }, { status: 400 })

    const connection = await getFacebookConnection()
    if (!connection?.accessToken) return NextResponse.json({ error: 'Facebook no conectado' }, { status: 400 })

    let profile: Record<string, unknown>
    try {
      profile = JSON.parse(client.profile)
    } catch {
      return NextResponse.json({ error: 'Perfil del cliente inválido' }, { status: 400 })
    }

    // Use Groq to extract ISO dates from the "fechas" free-text field
    const groqApiKey = process.env.GROQ_API_KEY
    let startDate = '', endDate = ''

    if (groqApiKey && profile.fechas) {
      try {
        const today = new Date().toISOString().split('T')[0]
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{
              role: 'user',
              content: `Extrae las fechas de entrada y salida de este texto: "${profile.fechas}". Hoy es ${today}. Si el año no está mencionado, usa el año más próximo futuro. Responde ÚNICAMENTE con JSON sin explicación: {"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD"}`,
            }],
            max_tokens: 60,
            temperature: 0,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const content: string = data.choices?.[0]?.message?.content || ''
          const jsonMatch = content.match(/\{[\s\S]*?\}/)
          if (jsonMatch) {
            const dates = JSON.parse(jsonMatch[0])
            startDate = dates.startDate || ''
            endDate = dates.endDate || ''
          }
        }
      } catch { /* fall through to error below */ }
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'No se pudieron extraer las fechas. Edítalas manualmente en el calendario.' }, { status: 422 })
    }

    const property = profile.propertyId
      ? await db.property.findFirst({ where: { id: String(profile.propertyId) } })
      : null
    const nights = Number(profile.noches || profile.nights || 1)
    const price = property ? property.pricePerNight * nights : null

    const booking = await db.booking.create({
      data: {
        clientId: client.id,
        propertyId: property?.id || null,
        title: `${client.name} — ${property?.name || profile.propiedad || 'Reserva'}`,
        startDate,
        endDate,
        notes: `Huéspedes: ${profile.huespedes || '?'} · Motivo: ${profile.motivo || '?'}`,
        status: 'confirmed',
        price,
      },
    })

    await db.client.update({ where: { id: client.id }, data: { step: 3, status: 'confirmed', isManual: true } })

    const confirmMsg = `¡Buenas noticias! 🎉 Tu reserva en ${property?.name || profile.propiedad || 'nuestro alojamiento'} (${profile.fechas}) ha sido confirmada. Nos pondremos en contacto contigo próximamente con todos los detalles. ¡Muchas gracias y hasta pronto!`

    await db.message.create({ data: { clientId: client.id, role: 'assistant', content: confirmMsg } })

    await fetch(
      `https://graph.facebook.com/v21.0/${connection.pageId}/messages?access_token=${connection.accessToken}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient: { id: participantId }, message: { text: confirmMsg } }) }
    ).catch(e => console.error('[ConfirmBooking] FB send error:', e))

    return NextResponse.json({ success: true, bookingId: booking.id })
  }

  // Toggle AI on/off for a specific conversation participant
  if (action === 'toggle-ai') {
    const { participantId, participantName } = body
    if (!participantId) return NextResponse.json({ error: 'participantId requerido' }, { status: 400 })
    let client = await db.client.findFirst({ where: { sourceId: participantId, channel: 'Facebook' } })
    if (!client) {
      const adminUser = await db.user.findFirst()
      if (!adminUser) return NextResponse.json({ error: 'No hay usuarios' }, { status: 400 })
      client = await db.client.create({
        data: { name: participantName || `Facebook User ${participantId}`, channel: 'Facebook', sourceId: participantId, status: 'pending', isManual: false, step: 0 },
      })
    }
    const newIsManual = !client.isManual
    await db.client.update({ where: { id: client.id }, data: { isManual: newIsManual } })
    return NextResponse.json({ aiActive: !newIsManual })
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
}

function buildQualificationPrompt(
  properties: { id: string; name: string; guests: number; pricePerNight: number; petsAllowed: boolean; minimumStay: number; depositAmount?: number | null; cleaningFee?: number | null; extraGuestFee?: number | null; checkInTime?: string | null; checkOutTime?: string | null; cancellationPolicy?: string | null; houseRules?: string | null }[],
  aiConfig: { ownerName?: string | null; greetingMessage?: string | null; systemPrompt?: string | null } | null
): string {
  const ownerName = aiConfig?.ownerName || 'el propietario'
  const customPrompt = aiConfig?.systemPrompt ? `\nInstrucciones adicionales: ${aiConfig.systemPrompt}\n` : ''

  const cancelLabel: Record<string, string> = { flexible: 'flexible (reembolso hasta 24h antes)', moderate: 'moderada (reembolso hasta 5 días antes)', strict: 'estricta (reembolso hasta 7 días antes)' }

  const propList = properties.length > 0
    ? properties.map((p, i) => {
        const extras: string[] = []
        if (p.depositAmount) extras.push(`fianza ${p.depositAmount}€`)
        if (p.cleaningFee) extras.push(`limpieza ${p.cleaningFee}€`)
        if (p.extraGuestFee) extras.push(`${p.extraGuestFee}€/huésped extra`)
        if (p.checkInTime) extras.push(`check-in ${p.checkInTime}`)
        if (p.checkOutTime) extras.push(`check-out ${p.checkOutTime}`)
        if (p.cancellationPolicy) extras.push(`cancelación ${cancelLabel[p.cancellationPolicy] || p.cancellationPolicy}`)
        if (p.houseRules) extras.push(`normas: ${p.houseRules}`)
        return `${i + 1}. ${p.name} (id:${p.id}) — hasta ${p.guests} personas · ${p.pricePerNight}€/noche · mín. ${p.minimumStay} noches${p.petsAllowed ? ' · mascotas OK' : ' · sin mascotas'}${extras.length ? '\n   ' + extras.join(' · ') : ''}`
      }).join('\n')
    : 'No hay propiedades disponibles en este momento.'

  return `Eres el asistente de ${ownerName}, un alojamiento vacacional. Hablas por Facebook Messenger de forma cercana y natural, como lo haría una persona real.
${customPrompt}
Alojamientos disponibles:
${propList}

ESTILO:
- Mensajes cortos. Máximo 2-3 frases por respuesta.
- Tono cercano y cálido. Nada de frases corporativas ni listas.
- Sin asteriscos ni emojis excesivos. Solo texto natural.
- Nunca hagas más de UNA pregunta por mensaje.
- Si el cliente saluda o hace un comentario informal, respóndele con naturalidad antes de ir al grano.
- Cuando te pregunten por precios, fianzas, horarios o normas, responde con los datos reales de arriba.

OBJETIVO: recopilar poco a poco: qué alojamiento le interesa, fechas, número de personas y motivo del viaje.

HANDOFF — cuando tengas los 4 datos, escribe un resumen amigable y añade en la última línea:
[DATOS:{"propiedad":"nombre exacto","propertyId":"id","fechas":"del X al Y","noches":N,"huespedes":N,"motivo":"motivo"}]

CLIENTE DIFÍCIL — si el cliente lleva más de 6 mensajes sin dar información útil, es agresivo, o insiste en cosas que no puedes resolver, escribe un mensaje de despedida amable y añade en la última línea:
[PESADO]`
}

function calcScore(
  profile: Record<string, unknown>,
  properties: { id: string; pricePerNight: number }[] = []
) {
  let score = 50; const reasons: string[] = []

  const foundProp = properties.find(p => p.id === String(profile.propertyId || ''))
  const price = Number(foundProp?.pricePerNight || profile.propertyPrice || 0)
  if (price >= 150) { score += 20; reasons.push('✅ Alojamiento precio alto') }
  else if (price >= 80) { score += 10; reasons.push('⚠️ Alojamiento precio medio') }

  const guests = parseInt(String(profile.huespedes || profile.guests || 0)) || 0
  const maxG = parseInt(String(profile.propertyGuests)) || 10
  if (guests <= 2) { score += 20; reasons.push('✅ Grupo pequeño') }
  else if (guests <= Math.ceil(maxG / 2)) { score += 10; reasons.push('⚠️ Grupo mediano') }
  else { score -= 15; reasons.push('🔴 Grupo grande') }

  const purpose = String(profile.motivo || profile.purpose || '').toLowerCase()
  if (['vacaciones', 'trabajo', 'turismo', 'familia', 'negocios'].some(k => purpose.includes(k))) { score += 20; reasons.push('✅ Motivo legítimo') }
  else if (['fiesta', 'party', 'celebración'].some(k => purpose.includes(k))) { score -= 25; reasons.push('🔴 Posible fiesta') }

  const nights = parseInt(String(profile.noches || profile.nights || 0)) || 0
  if (nights >= 5) { score += 10; reasons.push('✅ Estancia larga') }
  else if (nights === 1) { score -= 5; reasons.push('⚠️ Estancia muy corta') }

  score = Math.max(0, Math.min(100, score))
  return { score, label: score >= 75 ? 'TOP' : score >= 45 ? 'NORMAL' : 'RIESGO', reasons }
}

