import { google } from 'googleapis'
import { getAuthenticatedClient } from '../lib/googleAuth.js'
import { getUserFromRequest } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
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
