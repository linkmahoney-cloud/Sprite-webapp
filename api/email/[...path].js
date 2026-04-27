import { google } from 'googleapis'
import { getAuthenticatedClient } from '../_lib/googleAuth.js'
import { getUserFromRequest, supabaseAdmin } from '../_lib/supabaseAdmin.js'

export default async function handler(req, res) {
  const pathSegments = req.query.path || []
  const route = pathSegments[0] || ''

  if (route === 'messages') {
    return handleMessages(req, res)
  } else if (route === 'send') {
    return handleSend(req, res)
  } else if (route) {
    // Treat any other path segment as an email ID
    return handleEmailById(req, res, route)
  }

  return res.status(404).json({ error: 'Not found' })
}

// ─── /api/email/messages (GET) ───────────────────────────────────────────────

async function handleMessages(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const auth = await getAuthenticatedClient(user.id)
  if (!auth) return res.status(400).json({ error: 'Google not connected' })

  const gmail = google.gmail({ version: 'v1', auth })
  const { category, unread, limit = '30' } = req.query

  try {
    let q = ''
    if (unread === 'true') q += 'is:unread '
    if (category === 'subscription') q += '(from:noreply OR from:no-reply OR from:newsletter OR list:) '

    const { data } = await gmail.users.messages.list({
      userId: 'me',
      maxResults: parseInt(limit),
      q: q.trim() || undefined,
    })

    if (!data.messages || data.messages.length === 0) {
      return res.json([])
    }

    // Fetch message details in parallel
    const messages = await Promise.all(
      data.messages.map(async (msg) => {
        const { data: full } = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date', 'List-Unsubscribe'],
        })

        const headers = full.payload?.headers || []
        const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''

        const from = getHeader('From')
        const subject = getHeader('Subject')
        const date = getHeader('Date')
        const hasUnsubscribe = !!getHeader('List-Unsubscribe')
        const isUnread = full.labelIds?.includes('UNREAD')
        const isStarred = full.labelIds?.includes('STARRED')

        // Classify
        const emailCategory = classifyEmail(from, hasUnsubscribe)

        return {
          id: full.id,
          threadId: full.threadId,
          from,
          subject,
          date,
          snippet: full.snippet,
          isUnread,
          isStarred,
          category: emailCategory,
          labelIds: full.labelIds,
        }
      })
    )

    // Filter by category if requested
    let filtered = messages
    if (category && category !== 'all') {
      filtered = messages.filter(m => m.category === category)
    }

    // Sort: unread first, then by date
    filtered.sort((a, b) => {
      if (a.isUnread !== b.isUnread) return a.isUnread ? -1 : 1
      return new Date(b.date) - new Date(a.date)
    })

    res.json(filtered)
  } catch (error) {
    console.error('Gmail list error:', error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── /api/email/send (POST) ──────────────────────────────────────────────────

async function handleSend(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const auth = await getAuthenticatedClient(user.id)
  if (!auth) return res.status(400).json({ error: 'Google not connected' })

  const gmail = google.gmail({ version: 'v1', auth })
  const { to, subject, body, replyTo, threadId } = req.body

  try {
    const headers = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
    ]

    if (replyTo) {
      headers.push(`In-Reply-To: ${replyTo}`)
      headers.push(`References: ${replyTo}`)
    }

    const raw = Buffer.from(
      headers.join('\r\n') + '\r\n\r\n' + body
    ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const { data } = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw, threadId },
    })

    res.json({ id: data.id, threadId: data.threadId })
  } catch (error) {
    console.error('Gmail send error:', error.message)
    res.status(500).json({ error: error.message })
  }
}

// ─── /api/email/[id] (GET, PATCH) ───────────────────────────────────────────

async function handleEmailById(req, res, id) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const auth = await getAuthenticatedClient(user.id)
  if (!auth) return res.status(400).json({ error: 'Google not connected' })

  const gmail = google.gmail({ version: 'v1', auth })

  if (req.method === 'GET') {
    try {
      const { data } = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'full',
      })

      const headers = data.payload?.headers || []
      const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''

      // Extract body
      let body = ''
      const parts = data.payload?.parts || []
      if (parts.length > 0) {
        const htmlPart = parts.find(p => p.mimeType === 'text/html')
        const textPart = parts.find(p => p.mimeType === 'text/plain')
        const part = htmlPart || textPart
        if (part?.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8')
        }
      } else if (data.payload?.body?.data) {
        body = Buffer.from(data.payload.body.data, 'base64').toString('utf-8')
      }

      res.json({
        id: data.id,
        threadId: data.threadId,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        body,
        isUnread: data.labelIds?.includes('UNREAD'),
        isStarred: data.labelIds?.includes('STARRED'),
        labelIds: data.labelIds,
      })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'PATCH') {
    try {
      const { star, read, archive } = req.body
      const addLabelIds = []
      const removeLabelIds = []

      if (star === true) addLabelIds.push('STARRED')
      if (star === false) removeLabelIds.push('STARRED')
      if (read === true) removeLabelIds.push('UNREAD')
      if (read === false) addLabelIds.push('UNREAD')
      if (archive === true) removeLabelIds.push('INBOX')

      await gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: { addLabelIds, removeLabelIds },
      })

      res.json({ success: true })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classifyEmail(from, hasUnsubscribe) {
  const fromLower = from.toLowerCase()

  // Subscription indicators
  if (hasUnsubscribe) return 'subscription'
  if (fromLower.includes('noreply@') || fromLower.includes('no-reply@')) return 'subscription'
  if (fromLower.includes('newsletter@') || fromLower.includes('notifications@')) return 'subscription'
  if (fromLower.includes('mailer-daemon') || fromLower.includes('postmaster')) return 'subscription'

  // Work indicators
  if (fromLower.includes('.com>') && !fromLower.includes('gmail.com') &&
      !fromLower.includes('yahoo.com') && !fromLower.includes('hotmail.com') &&
      !fromLower.includes('outlook.com') && !fromLower.includes('icloud.com')) {
    return 'work'
  }

  return 'personal'
}
