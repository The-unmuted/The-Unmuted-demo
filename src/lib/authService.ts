/**
 * Account-layer auth (D-018): email OTP via Supabase.
 *
 * The login password is NEVER sent to any server — it is only used on-device
 * to derive the KEK that opens the key vault (see keyVault.ts / D-017).
 * Account access therefore requires the email inbox; data decryption requires
 * the password or the paper recovery code. Two independent layers.
 *
 * Offline fallback: without Supabase (or without network) the app can still
 * unlock locally cached key boxes — see keyVaultService.ts.
 */

import { supabase } from "./supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

export function isCloudAuthAvailable(): boolean {
  return supabase !== null;
}

/** Send a 6-digit login code to the email (creates the account on first use) */
export async function requestLoginCode(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "cloud-unavailable" };
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  return error ? { error: error.message } : {};
}

/** Verify the emailed code → device gets a persistent session */
export async function verifyLoginCode(
  email: string,
  code: string
): Promise<{ user?: User; error?: string }> {
  if (!supabase) return { error: "cloud-unavailable" };
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: "email",
  });
  if (error || !data.user) return { error: error?.message ?? "invalid-code" };
  return { user: data.user };
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
