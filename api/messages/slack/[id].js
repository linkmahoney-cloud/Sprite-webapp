import { getUserFromRequest, supabaseAdmin } from '../../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { id, workspace_id } = req.query
  if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' })

  const { data: slackToken } = await supabaseAdmin
    .from('slack_tokens')
    .select('access_token, bot_user_id')
    .eq('user_id', user.id)
    .eq('workspace_id', workspace_id)
    .single()

  if (!slackToken) return res.status(400).json({ error: 'Slack workspace not connected' })

  if (req.method === 'GET') {
    try {
      const r = await fetch(
        `https://slack.com/api/conversations.history?channel=${id}&limit=50`,
        { headers: { Authorization: `Bearer ${slackToken.access_token}` } }
      )
      const data = await r.json()
      if (!data.ok) throw new Error(data.error)

      // Get unique user IDs for names
      const userIds = [...new Set(data.messages.map(m => m.user).filter(Boolean))]
      let userMap = {}
      if (userIds.length > 0) {
        const usersRes = await Promise.all(
          userIds.map(uid =>
            fetch(`https://slack.com/api/users.info?user=${uid}`, {
              headers: { Authorization: `Bearer ${slackToken.access_token}` },
            }).then(r => r.json())
          )
        )
        for (const u of usersRes) {
          if (u.ok && u.user) {
            userMap[u.user.id] = {
              name: u.user.real_name || u.user.name,
              avatar: u.user.profile?.image_48,
            }
          }
        }
      }

      const messages = data.messages.map(m => ({
        id: m.ts,
        text: m.text,
        user: m.user,
        userName: userMap[m.user]?.name || 'Unknown',
        userAvatar: userMap[m.user]?.avatar,
        timestamp: m.ts,
        isMe: m.user === slackToken.bot_user_id,
      })).reverse()

      res.json({ channelId: id, messages })
    } catch (error) {
      console.error('Slack history error:', error.message)
      res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'POST') {
    try {
      const { text } = req.body
      const r = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${slackToken.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel: id, text }),
      })
      const data = await r.json()
      if (!data.ok) throw new Error(data.error)
      res.json({ ok: true, ts: data.ts })
    } catch (error) {
      console.error('Slack send error:', error.message)
      res.status(500).json({ error: error.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
