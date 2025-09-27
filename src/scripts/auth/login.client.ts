// src/scripts/auth/login.client.ts
import { browserSupabase } from '../../lib/supabaseClient' // <— RELATIVE import (no alias)

const supabase = browserSupabase()

const form = document.getElementById('login-form') as HTMLFormElement
const msg = document.getElementById('msg')!
const loginBtn = document.getElementById('login-btn') as HTMLButtonElement
const magicBtn = document.getElementById('magic') as HTMLButtonElement | null

const redirectTo = `${window.location.origin}/auth/callback`

loginBtn.addEventListener('click', async () => {
  const fd = new FormData(form)
  const email = fd.get('email') as string
  const password = fd.get('password') as string
  msg.textContent = 'Signing in…'
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    window.location.replace('/app/checkin')
  } catch (e: any) {
    msg.textContent = e?.message ?? 'Login failed'
    console.error(e)
  }
})

magicBtn?.addEventListener('click', async () => {
  const email = (new FormData(form).get('email') || '').toString().trim()
  if (!email) { msg.textContent = 'Enter your email first.'; return }
  msg.textContent = 'Sending magic link…'
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    })
    if (error) throw error
    msg.textContent = 'Magic link sent. Check your email.'
  } catch (e: any) {
    msg.textContent = e?.message ?? 'Could not send magic link'
    console.error(e)
  }
})
