import { supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.query.token
  if (!token) return res.status(401).json({ error: 'Unauthorized — missing token' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  const host = `https://${req.headers.host}`
  const redirectUri = `${host}/api/auth/meta/callback`

  const scopes = [
    'instagram_manage_messages',
    'pages_messaging',
    'pages_read_engagement',
    'pages_show_list',
  ].join(',')

  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${user.id}&response_type=code`

  res.redirect(url)
}
