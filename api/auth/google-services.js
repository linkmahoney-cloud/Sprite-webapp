import { getOAuth2Client } from '../lib/googleAuth.js'
import { supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Token comes as query param since this is a browser redirect
  const token = req.query.token
  if (!token) return res.status(401).json({ error: 'Unauthorized — missing token' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  const oauth2Client = getOAuth2Client()

  const host = `https://${req.headers.host}`
  const redirectUri = `${host}/api/auth/google-services/callback`

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/contacts.readonly',
    ],
    state: user.id,
    redirect_uri: redirectUri,
  })

  res.redirect(url)
}
