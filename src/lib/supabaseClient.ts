/**
 * Single shared Supabase client.
 * Auth sessions persist in localStorage — a signed-in device stays signed in,
 * so the email OTP is only needed on NEW devices (D-018 two-layer model:
 * email OTP = account access, password/recovery code = data decryption).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
