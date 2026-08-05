/**
 * Account-layer auth (D-018/D-036).
 *
 * Two credential layers:
 *   Account password  → email+password via Supabase, sent over HTTPS
 *   Vault password    → Argon2id KEK, on-device only, never sent anywhere
 *
 * OTP path remains available as a fallback for "forgot account password".
 * Offline fallback: without Supabase the app can still unlock locally cached
 * key boxes — see keyVaultService.ts.
 */

import { supabase } from "./supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

export function isCloudAuthAvailable(): boolean {
  return supabase !== null;
}

/** Register with email+password. Returns session if email confirmation is disabled (immediate login),
 *  or null session if Supabase requires OTP confirmation first. */
export async function signUpWithPassword(
  email: string,
  password: string
): Promise<{ session?: Session | null; error?: string }> {
  if (!supabase) return { error: "cloud-unavailable" };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) return { error: error.message };
  return { session: data.session };
}

/** Verify the signup confirmation OTP sent after signUpWithPassword. */
export async function verifySignupCode(
  email: string,
  code: string
): Promise<{ user?: User; error?: string }> {
  if (!supabase) return { error: "cloud-unavailable" };
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: "signup",
  });
  if (error || !data.user) return { error: error?.message ?? "invalid-code" };
  return { user: data.user };
}

/** Resend the signup confirmation OTP. */
export async function resendSignupCode(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "cloud-unavailable" };
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
  });
  return error ? { error: error.message } : {};
}

/** Sign in with email+password. */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ user?: User; error?: string }> {
  if (!supabase) return { error: "cloud-unavailable" };
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error || !data.user) return { error: error?.message ?? "invalid-credentials" };
  return { user: data.user };
}

/** Send a 6-digit magic-link OTP (used for "forgot password" fallback sign-in) */
export async function requestLoginCode(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "cloud-unavailable" };
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: false },
  });
  return error ? { error: error.message } : {};
}

/** Verify a magic-link OTP (forgot-password fallback). */
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
