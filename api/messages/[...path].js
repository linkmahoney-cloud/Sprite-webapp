import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

// --- Helper: get Meta token for Instagram ---
async function getMetaTokenInstagram(userId) {
  const { data } = await supabaseAdmin
    .from('meta_tokens')
    .select('access_token, ig_user_id')
    .eq('user_id', userId)
    .single()
  return data
}

// --- Helper: get Meta token for Facebook ---
async function getMetaTokenFacebook(userId) {
  const { data } = await supabaseAdmin
    .from('meta_tokens')
    .select('access_token, fb_page_id')
    .eq('user_id', userId)
    .single()
  return data
}

// --- Handler: GET/POST /api/messages/instagram ---
async function handleInstagram(req, res, user) {
  const meta = await getMetaTokenInstagram(user.id)
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

// --- Handler: GET /api/messages/instagram/[id] ---
async function handleInstagramThread(req, res, user, id) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { data: meta } = await supabaseAdmin
    .from('meta_tokens')
    .select('access_token, ig_user_id')
    .eq('user_id', user.id)
    .single()

  if (!meta?.ig_user_id) return res.status(400).json({ error: 'Instagram not connected' })

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

// --- Handler: GET/POST /api/messages/facebook ---
async function handleFacebook(req, res, user) {
  const meta = await getMetaTokenFacebook(user.id)
  if (!meta?.fb_page_id) return res.status(400).json({ error: 'Facebook not connected' })

  if (req.method === 'GET') {
    try {
      const r = await fetch(
        `https://graph.facebook.com/v19.0/${meta.fb_page_id}/conversations?fields=participants,updated_time,messages.limit(1){message,from,created_time}&access_token=${meta.access_token}`
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
      console.error('FB conversations error:', error.message)
      res.status(500).json({ error: error.message })
    }
  } else if (req.method === 'POST') {
    try {
      const { conversationId, message } = req.body

      const convRes = await fetch(
        `https://graph.facebook.com/v19.0/${conversationId}?fields=participants&access_token=${meta.access_token}`
      )
      const convData = await convRes.json()
      const recipient = convData.participants?.data?.find(p => p.id !== meta.fb_page_id)

      if (!recipient) throw new Error('Could not find recipient')

      const r = await fetch(
        `https://graph.facebook.com/v19.0/${meta.fb_page_id}/messages`,
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
      console.error('FB send error:', error.message)
      res.status(500).json({ error: error.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}

// --- Handler: GET /api/messages/facebook/[id] ---
async function handleFacebookThread(req, res, user, id) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { data: meta } = await supabaseAdmin
    .from('meta_tokens')
    .select('access_token, fb_page_id')
    .eq('user_id', user.id)
    .single()

  if (!meta?.fb_page_id) return res.status(400).json({ error: 'Facebook not connected' })

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
      isMe: m.from?.id === meta.fb_page_id,
    })).reverse()

    res.json({ conversationId: id, messages })
  } catch (error) {
    console.error('FB thread error:', error.message)
    res.status(500).json({ error: error.message })
  }
}

// --- Handler: GET /api/messages/slack-workspaces ---
async function handleSlackWorkspaces(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { data } = await supabaseAdmin
    .from('slack_tokens')
    .select('workspace_id, workspace_name')
    .eq('user_id', user.id)

  res.json(data || [])
}

// --- Handler: GET /api/messages/slack/conversations ---
async function handleSlackConversations(req, res, user) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

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

// --- Handler: GET/POST /api/messages/slack/[id] ---
async function handleSlackChannel(req, res, user, id) {
  const { workspace_id } = req.query
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

// --- Handler: POST /api/messages/slack/react ---
async function handleSlackReact(req, res, user) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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

// --- Main router ---
export default async function handler(req, res) {
  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const pathSegments = req.query.path || []

  // Route: /api/messages/instagram
  if (pathSegments[0] === 'instagram' && pathSegments.length === 1) {
    return handleInstagram(req, res, user)
  }

  // Route: /api/messages/instagram/[id]
  if (pathSegments[0] === 'instagram' && pathSegments.length === 2) {
    return handleInstagramThread(req, res, user, pathSegments[1])
  }

  // Route: /api/messages/facebook
  if (pathSegments[0] === 'facebook' && pathSegments.length === 1) {
    return handleFacebook(req, res, user)
  }

  // Route: /api/messages/facebook/[id]
  if (pathSegments[0] === 'facebook' && pathSegments.length === 2) {
    return handleFacebookThread(req, res, user, pathSegments[1])
  }

  // Route: /api/messages/slack-workspaces
  if (pathSegments[0] === 'slack-workspaces' && pathSegments.length === 1) {
    return handleSlackWorkspaces(req, res, user)
  }

  // Route: /api/messages/slack/conversations
  if (pathSegments[0] === 'slack' && pathSegments[1] === 'conversations' && pathSegments.length === 2) {
    return handleSlackConversations(req, res, user)
  }

  // Route: /api/messages/slack/react
  if (pathSegments[0] === 'slack' && pathSegments[1] === 'react' && pathSegments.length === 2) {
    return handleSlackReact(req, res, user)
  }

  // Route: /api/messages/slack/[id] (must come after conversations and react)
  if (pathSegments[0] === 'slack' && pathSegments.length === 2) {
    return handleSlackChannel(req, res, user, pathSegments[1])
  }

  return res.status(404).json({ error: 'Not found' })
}
