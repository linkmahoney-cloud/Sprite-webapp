import { google } from 'googleapis'
import { getAuthenticatedClient } from '../lib/googleAuth.js'
import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
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
        const emailCategory = classifyEmail(from, hasUnsubscribe, user.id)

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
