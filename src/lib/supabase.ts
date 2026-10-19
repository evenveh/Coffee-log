import { createClient } from '@supabase/supabase-js'

// Values come from .env.local (see .env.example). Vite only exposes vars prefixed with VITE_.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill it in.')
}

// One shared client for the whole app. It also keeps the login session in localStorage.
export const supabase = createClient(url, anonKey)
