import { getOAuth2Client } from '../lib/googleAuth.js'
import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

// --- Route: /api/auth/status ---
async function handleStatus(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: googleTokens } = await supabaseAdmin
    .from('google_tokens')
    .select('scopes')
    .eq('user_id', user.id)
    .single()

  const { data: metaTokens } = await supabaseAdmin
    .from('meta_tokens')
    .select('ig_user_id, fb_page_id')
    .eq('user_id', user.id)
    .single()

  const { data: slackTokens } = await supabaseAdmin
    .from('slack_tokens')
    .select('workspace_id')
    .eq('user_id', user.id)

  res.json({
    authenticated: true,
    google: !!googleTokens,
    instagram: !!metaTokens?.ig_user_id,
    facebook: !!metaTokens?.fb_page_id,
    slack: (slackTokens || []).length > 0,
  })
}

// --- Route: /api/auth/google-services ---
async function handleGoogleServices(req, res) {
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

// --- Route: /api/auth/google-services/callback ---
async function handleGoogleServicesCallback(req, res) {
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

// --- Route: /api/auth/meta ---
async function handleMeta(req, res) {
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

// --- Route: /api/auth/meta/callback ---
async function handleMetaCallback(req, res) {
  const { code, state: userId } = req.query
  if (!code || !userId) return res.status(400).json({ error: 'Missing code or state' })

  const host = `https://${req.headers.host}`
  const redirectUri = `${host}/api/auth/meta/callback`

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${process.env.META_APP_SECRET}&code=${code}`
    )
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error.message)

    // Exchange for long-lived token
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
    )
    const longData = await longRes.json()
    const longToken = longData.access_token

    // Get pages (for Page Messenger)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`
    )
    const pagesData = await pagesRes.json()
    const page = pagesData.data?.[0]

    // Get Instagram Business Account ID
    let igUserId = null
    if (page) {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      )
      const igData = await igRes.json()
      igUserId = igData.instagram_business_account?.id || null
    }

    // Store tokens
    await supabaseAdmin.from('meta_tokens').upsert({
      user_id: userId,
      access_token: page?.access_token || longToken,
      ig_user_id: igUserId,
      fb_page_id: page?.id || null,
      token_expiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // ~60 days
    })

    res.redirect('/messages?connected=meta')
  } catch (error) {
    console.error('Meta OAuth error:', error.message)
    res.redirect('/messages?error=meta_auth_failed')
  }
}

// --- Route: /api/auth/slack ---
async function handleSlack(req, res) {
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

// --- Route: /api/auth/slack/callback ---
async function handleSlackCallback(req, res) {
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

// --- Router ---
export default async function handler(req, res) {
  const pathSegments = req.query.path || []
  const route = pathSegments.join('/')

  switch (route) {
    case 'status':
      return handleStatus(req, res)
    case 'google-services':
      return handleGoogleServices(req, res)
    case 'google-services/callback':
      return handleGoogleServicesCallback(req, res)
    case 'meta':
      return handleMeta(req, res)
    case 'meta/callback':
      return handleMetaCallback(req, res)
    case 'slack':
      return handleSlack(req, res)
    case 'slack/callback':
      return handleSlackCallback(req, res)
    default:
      return res.status(404).json({ error: 'Not found' })
  }
}
