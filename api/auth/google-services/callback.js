import { getOAuth2Client } from '../../lib/googleAuth.js'
import { supabaseAdmin } from '../../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { code, state: userId } = req.query
  if (!code || !userId) return res.status(400).json({ error: 'Missing code or state' })

  const oauth2Client = getOAuth2Client()
  const redirectUri = `${req.headers.origin || `https://${req.headers.host}`}/api/auth/google-services/callback`

  try {
    const { tokens } = await oauth2Client.getToken({ code, redirect_uri: redirectUri })

    await supabaseAdmin
      .from('google_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        scopes: tokens.scope?.split(' ') || [],
      }, { onConflict: 'user_id' })

    res.redirect('/?google=connected')
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    res.redirect('/?google=error')
  }
}
