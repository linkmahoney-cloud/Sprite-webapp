import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
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
