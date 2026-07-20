/**
 * Password strength policy for the data-layer password (D-027).
 *
 * This password is the only thing standing between a stolen ciphertext dump
 * and the user's evidence — Argon2id slows guessing down, but a weak password
 * loses anyway. Policy: ≥8 chars, not digits-only, not one repeated char,
 * not on the common-password list.
 */

import { copyFor, type AppLanguage } from "./locale";

export type PasswordIssue = "too-short" | "common" | "all-digits" | "repeated";

const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "123123123",
  "987654321",
  "87654321",
  "11111111",
  "88888888",
  "66666666",
  "password",
  "password1",
  "passw0rd",
  "qwertyui",
  "qwerty123",
  "1qaz2wsx",
  "asdfghjk",
  "asdf1234",
  "abcd1234",
  "abc12345",
  "a1234567",
  "aa123456",
  "12341234",
  "iloveyou",
  "sunshine",
  "woaini1314",
  "5201314520",
]);

export function checkPassword(password: string): PasswordIssue | null {
  if (password.length < 8) return "too-short";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "common";
  if (/^\d+$/.test(password)) return "all-digits";
  if (/^(.)\1+$/.test(password)) return "repeated";
  return null;
}

export function passwordIssueCopy(language: AppLanguage, issue: PasswordIssue): string {
  switch (issue) {
    case "too-short":
      return copyFor(language, "Use at least 8 characters.", "密码至少8位。");
    case "common":
      return copyFor(
        language,
        "That password is too common — it protects all your evidence, please pick a harder one.",
        "这个密码太常见、容易被猜到——它保护着你的全部证据，请换一个更难猜的。"
      );
    case "all-digits":
      return copyFor(
        language,
        "Digits only is easy to crack — mix in some letters.",
        "纯数字容易被破解，请加入字母。"
      );
    case "repeated":
      return copyFor(
        language,
        "A single repeated character is easy to guess — use a varied password.",
        "同一个字符重复太容易被猜到，请使用更复杂的密码。"
      );
  }
}
