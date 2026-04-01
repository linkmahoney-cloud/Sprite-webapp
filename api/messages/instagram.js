import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

async function getMetaToken(userId) {
  const { data } = await supabaseAdmin
    .from('meta_tokens')
    .select('access_token, ig_user_id')
    .eq('user_id', userId)
    .single()
  return data
}

export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const meta = await getMetaToken(user.id)
  if (!meta?.ig_user_id) return res.status(400).json({ error: 'Instagram not connected' })

  if (req.method === 'GET') {
    try {
      const r = await fetch(
        `https://graph.facebook.com/v19.0/${meta.ig_user_id}/conversations?fields=participants,updated_time,messages.limit(1){message,from,created_time}&platform=instagram&access_token=${meta.access_token}`
      )
      const data = await r.json()
      if (data.error) throw new Error(data.error.message)

      const conversations = (data.data || []).map(c => ({
        id: c.id,
        participants: c.participants?.data || [],
        updatedTime: c.updated_time,
        lastMessage: c.messages?.data?.[0] || null,
      }))

      res.json(conversations)
    } catch (error) {
      console.error('IG conversations error:', error.message)
      res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'POST') {
    try {
      const { conversationId, message } = req.body
      // Get the recipient from conversation participants
      const convRes = await fetch(
        `https://graph.facebook.com/v19.0/${conversationId}?fields=participants&access_token=${meta.access_token}`
      )
      const convData = await convRes.json()
      const recipient = convData.participants?.data?.find(p => p.id !== meta.ig_user_id)

      if (!recipient) throw new Error('Could not find recipient')

      const r = await fetch(
        `https://graph.facebook.com/v19.0/${meta.ig_user_id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: recipient.id },
            message: { text: message },
            access_token: meta.access_token,
          }),
        }
      )
      const data = await r.json()
      if (data.error) throw new Error(data.error.message)
      res.json(data)
    } catch (error) {
      console.error('IG send error:', error.message)
      res.status(500).json({ error: error.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
