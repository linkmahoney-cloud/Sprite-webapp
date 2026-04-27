import { google } from 'googleapis'
import { getAuthenticatedClient } from '../_lib/googleAuth.js'
import { getUserFromRequest } from '../_lib/supabaseAdmin.js'

export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const auth = await getAuthenticatedClient(user.id)
  if (!auth) return res.status(400).json({ error: 'Google not connected. Please connect Google Services first.' })

  const calendar = google.calendar({ version: 'v3', auth })

  if (req.method === 'GET') {
    try {
      const now = new Date()
      const timeMin = req.query.timeMin || new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const timeMax = req.query.timeMax || new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

      const { data } = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50,
      })

      res.json(data.items || [])
    } catch (error) {
      console.error('Calendar list error:', error.message)
      res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'POST') {
    try {
      const { summary, description, start, end, location } = req.body

      const event = {
        summary,
        description,
        location,
        start: { dateTime: start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      }

      const { data } = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      })

      res.json(data)
    } catch (error) {
      console.error('Calendar create error:', error.message)
      res.status(500).json({ error: error.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
