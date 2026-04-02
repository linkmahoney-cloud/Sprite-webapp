import { google } from 'googleapis'
import { getAuthenticatedClient } from '../lib/googleAuth.js'
import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

// --- Route: /api/contacts (index) ---
async function handleIndex(req, res, user) {
  if (req.method === 'GET') {
    const { category, sort = 'recency' } = req.query

    let query = supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (sort === 'recency') {
      query = query.order('last_contacted_at', { ascending: true, nullsFirst: true })
    } else if (sort === 'frequency') {
      query = query.order('contact_frequency', { ascending: false })
    } else {
      query = query.order('name', { ascending: true })
    }

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } else if (req.method === 'POST') {
    // Manual contact creation
    const { name, email, phone, company, job_title, birthday, category, notes } = req.body

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        user_id: user.id,
        source: 'manual',
        name,
        email,
        phone,
        company,
        job_title,
        birthday,
        category: category || 'personal',
        notes,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

// --- Route: /api/contacts/birthdays ---
async function handleBirthdays(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { data: contacts } = await supabaseAdmin
      .from('contacts')
      .select('id, name, birthday, photo_url, category')
      .eq('user_id', user.id)
      .not('birthday', 'is', null)

    if (!contacts || contacts.length === 0) return res.json([])

    const now = new Date()
    const upcoming = contacts
      .map(c => {
        const bday = new Date(c.birthday)
        // Set birthday to this year
        const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate())
        // If already passed, use next year
        if (thisYear < now) thisYear.setFullYear(now.getFullYear() + 1)
        const daysUntil = Math.ceil((thisYear - now) / (1000 * 60 * 60 * 24))
        return { ...c, daysUntil, nextBirthday: thisYear.toISOString().split('T')[0] }
      })
      .filter(c => c.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)

    res.json(upcoming)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// --- Route: /api/contacts/interactions ---
async function handleInteractions(req, res, user) {
  if (req.method === 'GET') {
    const { contact_id } = req.query

    let query = supabaseAdmin
      .from('contact_interactions')
      .select('*, contacts(name)')
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false })
      .limit(50)

    if (contact_id) query = query.eq('contact_id', contact_id)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } else if (req.method === 'POST') {
    const { contact_id, type, description, occurred_at } = req.body

    const { data, error } = await supabaseAdmin
      .from('contact_interactions')
      .insert({
        user_id: user.id,
        contact_id,
        type,
        source: 'manual',
        description,
        occurred_at: occurred_at || new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Update contact's last_contacted_at and frequency
    await supabaseAdmin.rpc('update_contact_last_contacted', {
      p_contact_id: contact_id,
      p_user_id: user.id,
    }).catch(() => {
      // Fallback if RPC doesn't exist
      supabaseAdmin
        .from('contacts')
        .update({
          last_contacted_at: occurred_at || new Date().toISOString(),
          contact_frequency: supabaseAdmin.raw('contact_frequency + 1'),
        })
        .eq('id', contact_id)
        .eq('user_id', user.id)
    })

    res.json(data)
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

// --- Route: /api/contacts/overdue ---
async function handleOverdue(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Contacts where last_contacted_at is null or older than 30 days
    const { data: neverContacted } = await supabaseAdmin
      .from('contacts')
      .select('id, name, email, phone, photo_url, category, last_contacted_at')
      .eq('user_id', user.id)
      .is('last_contacted_at', null)
      .order('name')

    const { data: staleContacted } = await supabaseAdmin
      .from('contacts')
      .select('id, name, email, phone, photo_url, category, last_contacted_at')
      .eq('user_id', user.id)
      .lt('last_contacted_at', thirtyDaysAgo)
      .order('last_contacted_at', { ascending: true })

    const overdue = [...(staleContacted || []), ...(neverContacted || [])]

    // Add days since last contact
    const now = new Date()
    const result = overdue.map(c => ({
      ...c,
      daysSince: c.last_contacted_at
        ? Math.floor((now - new Date(c.last_contacted_at)) / (1000 * 60 * 60 * 24))
        : null,
    }))

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// --- Route: /api/contacts/sync ---
async function handleSync(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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

// --- Route: /api/contacts/[id] (single contact by ID) ---
async function handleById(req, res, user, id) {
  if (req.method === 'GET') {
    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) return res.status(404).json({ error: 'Contact not found' })

    // Get interaction history
    const { data: interactions } = await supabaseAdmin
      .from('contact_interactions')
      .select('*')
      .eq('contact_id', id)
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false })
      .limit(20)

    res.json({ ...contact, interactions: interactions || [] })
  } else if (req.method === 'PATCH') {
    const updates = req.body
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } else if (req.method === 'DELETE') {
    await supabaseAdmin
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    res.json({ success: true })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

// --- Main catch-all handler ---
export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const pathSegments = req.query.path || []
  const route = pathSegments[0] || null

  // Known named routes
  const routes = {
    birthdays: handleBirthdays,
    interactions: handleInteractions,
    overdue: handleOverdue,
    sync: handleSync,
  }

  if (!route) {
    // /api/contacts — list or create contacts
    return handleIndex(req, res, user)
  }

  if (routes[route]) {
    // /api/contacts/birthdays, /api/contacts/interactions, etc.
    return routes[route](req, res, user)
  }

  // Treat as a contact ID: /api/contacts/some-uuid-id
  return handleById(req, res, user, route)
}
