import { getUserFromRequest, supabaseAdmin } from '../../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: meta } = await supabaseAdmin
    .from('meta_tokens')
    .select('access_token, ig_user_id')
    .eq('user_id', user.id)
    .single()

  if (!meta?.ig_user_id) return res.status(400).json({ error: 'Instagram not connected' })

  const { id } = req.query

  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/${id}?fields=messages{message,from,created_time}&access_token=${meta.access_token}`
    )
    const data = await r.json()
    if (data.error) throw new Error(data.error.message)

    const messages = (data.messages?.data || []).map(m => ({
      id: m.id,
      text: m.message,
      from: m.from,
      createdTime: m.created_time,
      isMe: m.from?.id === meta.ig_user_id,
    })).reverse()

    res.json({ conversationId: id, messages })
  } catch (error) {
    console.error('IG thread error:', error.message)
    res.status(500).json({ error: error.message })
  }
}
