import { supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.query.token
  if (!token) return res.status(401).json({ error: 'Unauthorized — missing token' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  const host = `https://${req.headers.host}`
  const redirectUri = `${host}/api/auth/slack/callback`

  const scopes = [
    'channels:read', 'channels:history',
    'groups:read', 'groups:history',
    'im:read', 'im:history', 'im:write',
    'mpim:read', 'mpim:history',
    'chat:write',
    'reactions:write',
    'users:read',
  ].join(',')

  const url = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${user.id}`

  res.redirect(url)
}
