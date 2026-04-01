import { getUserFromRequest, supabaseAdmin } from '../lib/supabaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { data } = await supabaseAdmin
    .from('slack_tokens')
    .select('workspace_id, workspace_name')
    .eq('user_id', user.id)

  res.json(data || [])
}
