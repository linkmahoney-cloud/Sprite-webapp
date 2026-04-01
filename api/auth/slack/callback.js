import { supabaseAdmin } from '../../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  const { code, state: userId } = req.query
  if (!code || !userId) return res.status(400).json({ error: 'Missing code or state' })

  const host = `https://${req.headers.host}`
  const redirectUri = `${host}/api/auth/slack/callback`

  try {
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    })
    const data = await tokenRes.json()

    if (!data.ok) throw new Error(data.error)

    await supabaseAdmin.from('slack_tokens').upsert({
      user_id: userId,
      workspace_name: data.team?.name || 'Workspace',
      workspace_id: data.team?.id,
      access_token: data.access_token,
      bot_user_id: data.bot_user_id,
    }, { onConflict: 'user_id,workspace_id' })

    res.redirect('/messages?connected=slack')
  } catch (error) {
    console.error('Slack OAuth error:', error.message)
    res.redirect('/messages?error=slack_auth_failed')
  }
}
