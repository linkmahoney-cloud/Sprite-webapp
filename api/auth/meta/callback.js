import { supabaseAdmin } from '../../lib/supabaseAdmin.js'

export default async function handler(req, res) {
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
