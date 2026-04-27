import { google } from 'googleapis'
import { supabaseAdmin } from './supabaseAdmin.js'

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.VITE_SUPABASE_URL}/auth/v1/callback`
  )
}

export async function getAuthenticatedClient(userId) {
  const { data: tokens } = await supabaseAdmin
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!tokens) return null

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  })

  oauth2Client.on('tokens', async (newTokens) => {
    await supabaseAdmin
      .from('google_tokens')
      .update({
        access_token: newTokens.access_token,
        ...(newTokens.refresh_token && { refresh_token: newTokens.refresh_token }),
        expiry_date: newTokens.expiry_date,
      })
      .eq('user_id', userId)
  })

  return oauth2Client
}
