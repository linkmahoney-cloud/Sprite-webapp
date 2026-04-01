import { google } from 'googleapis'
import { getAuthenticatedClient } from '../lib/googleAuth.js'
import { getUserFromRequest } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const auth = await getAuthenticatedClient(user.id)
  if (!auth) return res.status(400).json({ error: 'Google not connected' })

  const gmail = google.gmail({ version: 'v1', auth })
  const { id } = req.query

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
