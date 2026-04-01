import { getUserFromRequest, supabaseAdmin } from '../../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { workspace_id, channel, timestamp, emoji } = req.body
  if (!workspace_id || !channel || !timestamp || !emoji) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { data: slackToken } = await supabaseAdmin
    .from('slack_tokens')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('workspace_id', workspace_id)
    .single()

  if (!slackToken) return res.status(400).json({ error: 'Slack workspace not connected' })

  try {
    const r = await fetch('https://slack.com/api/reactions.add', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${slackToken.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, timestamp, name: emoji }),
    })
    const data = await r.json()
    if (!data.ok) throw new Error(data.error)
    res.json({ ok: true })
  } catch (error) {
    console.error('Slack react error:', error.message)
    res.status(500).json({ error: error.message })
  }
}
