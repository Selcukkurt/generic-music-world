'use client'

import { createClient } from '@supabase/supabase-js'
import { getSupabaseClientEnv } from './env'

const { url, anonKey } = getSupabaseClientEnv()
export const supabaseBrowser = createClient(url, anonKey)
