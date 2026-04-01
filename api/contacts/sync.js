import { google } from 'googleapis'
import { getAuthenticatedClient } from '../lib/googleAuth.js'
import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const auth = await getAuthenticatedClient(user.id)
  if (!auth) return res.status(400).json({ error: 'Google not connected' })

  const people = google.people({ version: 'v1', auth })

  try {
    let synced = 0
    let pageToken = undefined

    do {
      const { data } = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 100,
        personFields: 'names,emailAddresses,phoneNumbers,organizations,birthdays,photos',
        pageToken,
      })

      const connections = data.connections || []

      for (const person of connections) {
        const name = person.names?.[0]?.displayName
        if (!name) continue

        const email = person.emailAddresses?.[0]?.value
        const phone = person.phoneNumbers?.[0]?.value
        const org = person.organizations?.[0]
        const birthday = person.birthdays?.[0]?.date
        const photo = person.photos?.[0]?.url
        const sourceId = person.resourceName

        let birthdayStr = null
        if (birthday) {
          const y = birthday.year || 2000
          const m = String(birthday.month).padStart(2, '0')
          const d = String(birthday.day).padStart(2, '0')
          birthdayStr = `${y}-${m}-${d}`
        }

        // Classify: if they have a company/job title, likely work
        const category = org?.name ? 'work' : 'personal'

        const { error } = await supabaseAdmin
          .from('contacts')
          .upsert({
            user_id: user.id,
            source: 'google',
            source_id: sourceId,
            name,
            email,
            phone,
            company: org?.name || null,
            job_title: org?.title || null,
            birthday: birthdayStr,
            category,
            photo_url: photo,
          }, { onConflict: 'user_id,source,source_id' })

        if (!error) synced++
      }

      pageToken = data.nextPageToken
    } while (pageToken)

    res.json({ synced })
  } catch (error) {
    console.error('Contacts sync error:', error.message)
    res.status(500).json({ error: error.message })
  }
}
