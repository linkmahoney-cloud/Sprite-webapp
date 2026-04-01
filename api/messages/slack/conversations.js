import { getUserFromRequest, supabaseAdmin } from '../../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { workspace_id } = req.query
  if (!workspace_id) return res.status(400).json({ error: 'workspace_id required' })

  const { data: slackToken } = await supabaseAdmin
    .from('slack_tokens')
    .select('access_token, bot_user_id')
    .eq('user_id', user.id)
    .eq('workspace_id', workspace_id)
    .single()

  if (!slackToken) return res.status(400).json({ error: 'Slack workspace not connected' })

  try {
    // Get DMs and channels
    const r = await fetch(
      `https://slack.com/api/conversations.list?types=im,mpim,public_channel,private_channel&limit=50`,
      { headers: { Authorization: `Bearer ${slackToken.access_token}` } }
    )
    const data = await r.json()
    if (!data.ok) throw new Error(data.error)

    // Get user info for DM names
    const userIds = data.channels
      .filter(c => c.is_im)
      .map(c => c.user)
      .filter(Boolean)

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

    const conversations = data.channels.map(c => ({
      id: c.id,
      name: c.is_im ? (userMap[c.user]?.name || 'DM') : (c.name || 'Channel'),
      avatar: c.is_im ? userMap[c.user]?.avatar : null,
      type: c.is_im ? 'dm' : c.is_mpim ? 'group_dm' : 'channel',
      isChannel: !c.is_im && !c.is_mpim,
      unreadCount: c.unread_count_display || 0,
      lastRead: c.last_read,
    }))

    // Sort: unread first, then channels after DMs
    conversations.sort((a, b) => {
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount
      if (a.type !== b.type) return a.type === 'dm' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    res.json(conversations)
  } catch (error) {
    console.error('Slack conversations error:', error.message)
    res.status(500).json({ error: error.message })
  }
}
