/**
 * Login + key vault flow (D-017/D-018/D-036).
 *
 * Three credentials:
 *   Account password  → email+password, verified by Supabase (sent over HTTPS)
 *   Vault password    → Argon2id KEK, on-device only, never leaves the device
 *   Paper recovery    → 12-char system code, for vault-password reset
 *
 * Registration stages:
 *   email → set-acct-pwd → code (signup OTP) → set-password → show-recovery → confirm-recovery
 *
 * Login stages:
 *   email → login-pwd → (app, vault locked)
 *
 * Forgot-account-password:
 *   login-pwd → [forgot] → code (magic-link OTP) → (app, vault locked)
 *
 * Offline fallback (no Supabase): local-login / local-set-password (legacy)
 */

import { useEffect, useState } from "react";
import { copyFor, IS_CHINA_BUILD, type AppLanguage } from "@/lib/locale";
import { Eye, EyeOff, KeyRound, Loader2, Mail, PencilLine, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import {
  isCloudAuthAvailable,
  requestLoginCode,
  verifyLoginCode,
  signUpWithPassword,
  verifySignupCode,
  resendSignupCode,
  signInWithPassword,
  getSession,
  signOut,
} from "@/lib/authService";
import { createVault, hasVault } from "@/lib/keyVaultService";
import { normalizeRecoveryCode } from "@/lib/keyVault";
import { checkPassword, passwordIssueCopy } from "@/lib/passwordPolicy";
import { hasPassword, verifyPassword, savePassword } from "@/lib/userCredentials";
import UnlockSOSEntry from "./UnlockSOSEntry";
import { SafetyTips } from "./QuickExit";

const LOGO_SRC = "/the-unmuted-mark.png";

type Stage =
  | "checking"
  | "email"            // email + sign-in / register buttons
  | "set-acct-pwd"     // registration: set + confirm account password
  | "code"             // OTP input (signup confirmation or forgot-pwd magic link)
  | "set-password"     // vault password setup
  | "show-recovery"
  | "confirm-recovery"
  | "login-pwd"        // returning user: enter account password
  | "local-login"      // legacy offline fallback
  | "local-set-password";

export default function LoginFlow({
  language,
  onUnlocked,
}: {
  language: AppLanguage;
  onUnlocked: (email: string, opts?: { vaultLocked?: boolean }) => void;
}) {
  const [stage, setStage] = useState<Stage>("checking");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  // "signup" = OTP from signUp confirmation; "forgot-pwd" = magic-link OTP
  const [codeFlow, setCodeFlow] = useState<"signup" | "forgot-pwd">("signup");
  // D-041: OTP anti-brute-force UX state. `otpAttemptsLeft` counts wrong tries
  // in the current browser session; `codeSentAt` timestamps when the current
  // code was sent so we can show a client-side expiry countdown (server-side
  // expiry is authoritative, set in Supabase Dashboard).
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);
  const [codeSentAt, setCodeSentAt] = useState<number | null>(null);

  const goTo = (next: Stage) => {
    setUnlockError(null);
    setStage(next);
  };

  const cloud = isCloudAuthAvailable();

  useEffect(() => {
    (async () => {
      if (!cloud) {
        setStage("email");
        return;
      }
      const session = await getSession();
      if (session?.user?.email) {
        setEmail(session.user.email);
        setUserId(session.user.id);
        if (await hasVault(session.user.id)) {
          onUnlocked(session.user.email, { vaultLocked: true });
        } else {
          setStage("set-password");
        }
      } else {
        setStage("email");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Email step ───────────────────────────────────────────────────────────────

  const handleEmail = async (value: string, mode: "login" | "register" | "otp") => {
    const normalized = value.trim().toLowerCase();
    if (!normalized.includes("@")) {
      toast.error(copyFor(language, "Enter a valid email address.", "请输入有效邮箱地址。"));
      return;
    }
    setEmail(normalized);
    if (!cloud) {
      setStage((await hasPassword(normalized)) ? "local-login" : "local-set-password");
      return;
    }
    if (mode === "otp") {
      setBusy(true);
      const { error } = await requestLoginCode(normalized);
      setBusy(false);
      if (error) {
        toast.error(copyFor(language, "Could not send the code. Try again.", "验证码发送失败，请稍后再试。"));
        return;
      }
      toast.success(copyFor(language, "Check your email for a 6-digit code.", "请查看邮箱，收取6位验证码。"));
      setCodeFlow("forgot-pwd");
      setOtpAttemptsLeft(5);
      setCodeSentAt(Date.now());
      goTo("code");
      return;
    }
    goTo(mode === "register" ? "set-acct-pwd" : "login-pwd");
  };

  // ── Registration: set account password → signUp → OTP confirm ───────────────

  const handleSetAccountPassword = async (pwd: string) => {
    const trimmed = pwd.trim();
    const issue = checkPassword(trimmed);
    if (issue) {
      toast.error(passwordIssueCopy(language, issue));
      return;
    }
    setBusy(true);
    const { session, error } = await signUpWithPassword(email, trimmed);
    setBusy(false);
    if (error) {
      toast.error(copyFor(language, `Registration failed: ${error}`, `注册失败：${error}`));
      return;
    }
    if (session?.user) {
      // Supabase email confirmation disabled — immediately signed in
      setUserId(session.user.id);
      goTo("set-password");
      return;
    }
    toast.success(
      copyFor(language, "Check your email for a 6-digit verification code.", "请查看邮箱，收取6位验证码。")
    );
    setCodeFlow("signup");
    setOtpAttemptsLeft(5);
    setCodeSentAt(Date.now());
    goTo("code");
  };

  // ── Login with email+password ────────────────────────────────────────────────

  const handleLoginWithPassword = async (pwd: string) => {
    setUnlockError(null);
    setBusy(true);
    const { user, error } = await signInWithPassword(email, pwd);
    setBusy(false);
    if (error || !user) {
      setUnlockError(copyFor(language, "Wrong email or password.", "邮箱或密码错误。"));
      return;
    }
    setUserId(user.id);
    const exists = await hasVault(user.id);
    if (exists) {
      toast.success(copyFor(language, "Welcome back!", "欢迎回来！"));
      onUnlocked(email, { vaultLocked: true });
    } else {
      goTo("set-password");
    }
  };

  // ── Forgot password: send OTP magic link ─────────────────────────────────────

  const handleForgotPassword = async () => {
    setBusy(true);
    const { error } = await requestLoginCode(email);
    setBusy(false);
    if (error) {
      toast.error(copyFor(language, "Could not send the code. Try again.", "验证码发送失败，请稍后再试。"));
      return;
    }
    toast.success(copyFor(language, "A sign-in code has been sent to your email.", "登录验证码已发送到你的邮箱。"));
    setCodeFlow("forgot-pwd");
    setOtpAttemptsLeft(5);
    setCodeSentAt(Date.now());
    goTo("code");
  };

  // ── OTP verification (signup confirm OR forgot-pwd sign-in) ──────────────────
  // D-041: client-side defense-in-depth against OTP brute-force.
  // Real defense is Supabase's server-side rate limits + 10-min expiry (set in
  // Dashboard). This client tracker just: (1) prevents accidental typo storms,
  // (2) surfaces "N tries left" so users understand the threat model,
  // (3) forces a full restart after 5 wrong tries so any client-cached state
  // (email prefill, session tokens) is discarded before the attacker can try
  // again. It cannot stop an attacker hitting the API directly, but it makes
  // this browser session useless as an attack tool.
  const MAX_OTP_ATTEMPTS = 5;

  const handleCode = async (code: string) => {
    setBusy(true);
    const res =
      codeFlow === "signup"
        ? await verifySignupCode(email, code)
        : await verifyLoginCode(email, code);
    if (res.error || !res.user) {
      setBusy(false);
      const next = otpAttemptsLeft - 1;
      setOtpAttemptsLeft(next);
      if (next <= 0) {
        toast.error(
          copyFor(
            language,
            "Too many wrong codes. Please start over and request a new code.",
            "错误次数过多，请重新开始并申请新验证码。"
          )
        );
        setOtpAttemptsLeft(MAX_OTP_ATTEMPTS);
        setCodeSentAt(null);
        goTo("email");
        return;
      }
      toast.error(
        copyFor(
          language,
          `Wrong or expired code. ${next} tries left.`,
          `验证码错误或已过期，还剩 ${next} 次机会。`
        )
      );
      return;
    }
    setUserId(res.user.id);
    setBusy(false);
    setOtpAttemptsLeft(MAX_OTP_ATTEMPTS);
    setCodeSentAt(null);
    if (codeFlow === "signup") {
      goTo("set-password");
    } else {
      const exists = await hasVault(res.user.id);
      if (exists) {
        toast.success(copyFor(language, "Welcome back!", "欢迎回来！"));
        onUnlocked(email, { vaultLocked: true });
      } else {
        goTo("set-password");
      }
    }
  };

  const handleResendCode = async () => {
    if (codeFlow === "signup") {
      const { error } = await resendSignupCode(email);
      if (error) {
        toast.error(copyFor(language, "Could not resend. Try again.", "重发失败，请稍后再试。"));
        return;
      }
      toast.success(copyFor(language, "Code resent.", "验证码已重新发送。"));
    } else {
      await requestLoginCode(email);
      toast.success(copyFor(language, "Code resent.", "验证码已重新发送。"));
    }
    // Fresh code invalidates the previous one server-side, so reset the
    // client counter + restart the client-visible expiry countdown.
    setOtpAttemptsLeft(MAX_OTP_ATTEMPTS);
    setCodeSentAt(Date.now());
  };

  // ── Vault password setup ─────────────────────────────────────────────────────

  const handleSetPassword = async (rawPassword: string) => {
    const password = rawPassword.trim();
    const issue = checkPassword(password);
    if (issue) {
      toast.error(passwordIssueCopy(language, issue));
      return;
    }
    setBusy(true);
    try {
      const { recoveryCode: fresh } = await createVault(userId, password);
      setRecoveryCode(fresh);
      setStage("show-recovery");
    } catch {
      toast.error(copyFor(language, "Something went wrong. Try again.", "出错了，请重试。"));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmRecovery = (typed: string) => {
    if (normalizeRecoveryCode(typed) !== normalizeRecoveryCode(recoveryCode)) {
      toast.error(
        copyFor(
          language,
          "That doesn't match. Check your paper and try again.",
          "输入不一致。请对照纸上的内容再试一次。"
        )
      );
      return;
    }
    setRecoveryCode("");
    toast.success(copyFor(language, "All set. Welcome!", "设置完成，欢迎使用！"));
    onUnlocked(email);
  };

  // ── Legacy local-only fallback ───────────────────────────────────────────────

  const handleLocalLogin = async (password: string) => {
    setUnlockError(null);
    if (!(await verifyPassword(email, password))) {
      setUnlockError(copyFor(language, "Incorrect password. Please try again.", "密码错误，请再试一次。"));
      return;
    }
    onUnlocked(email);
  };

  const handleLocalSetPassword = async (password: string) => {
    if (password.length < 6) {
      toast.error(copyFor(language, "Password must be at least 6 characters.", "密码至少6位。"));
      return;
    }
    await savePassword(email, password);
    onUnlocked(email);
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <img
          src={LOGO_SRC}
          alt=""
          className="mx-auto mb-6 h-24 w-24 object-contain drop-shadow-[0_0_34px_hsl(var(--primary)/0.34)]"
        />

        {stage === "checking" && (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        )}

        {stage === "email" && (
          <EmailStep language={language} busy={busy} onSubmit={handleEmail} />
        )}

        {stage === "set-acct-pwd" && (
          <SetAccountPasswordStep
            language={language}
            email={email}
            busy={busy}
            onSubmit={handleSetAccountPassword}
            onBack={() => goTo("email")}
          />
        )}

        {stage === "login-pwd" && (
          <LoginPasswordStep
            language={language}
            email={email}
            busy={busy}
            error={unlockError}
            onSubmit={handleLoginWithPassword}
            onForgotPassword={handleForgotPassword}
            onBack={() => goTo("email")}
          />
        )}

        {stage === "code" && (
          <CodeStep
            language={language}
            busy={busy}
            email={email}
            attemptsLeft={otpAttemptsLeft}
            sentAt={codeSentAt}
            onSubmit={handleCode}
            onResend={handleResendCode}
            onBack={() => goTo(codeFlow === "signup" ? "set-acct-pwd" : "login-pwd")}
          />
        )}

        {stage === "set-password" && (
          <PasswordStep
            language={language}
            busy={busy}
            title={copyFor(language, "Set your vault password", "设置保险柜密码")}
            hint={copyFor(
              language,
              "This password is separate from your account password. It protects your evidence and never leaves your device. Don't tell anyone — not even family.",
              "这个密码和登录密码完全独立，专门保护你的证据，从不离开你的设备。不要告诉任何人——包括家人。"
            )}
            cta={copyFor(language, "Continue", "继续")}
            minLength={8}
            onSubmit={handleSetPassword}
          />
        )}

        {stage === "show-recovery" && (
          <ShowRecoveryStep
            language={language}
            recoveryCode={recoveryCode}
            onNext={() => setStage("confirm-recovery")}
          />
        )}

        {stage === "confirm-recovery" && (
          <ConfirmRecoveryStep
            language={language}
            onBack={() => setStage("show-recovery")}
            onSubmit={handleConfirmRecovery}
          />
        )}

        {stage === "local-login" && (
          <PasswordStep
            language={language}
            busy={busy}
            title={copyFor(language, "Welcome back", "欢迎回来")}
            hint={email}
            cta={copyFor(language, "Sign in", "登录")}
            minLength={1}
            error={unlockError}
            onSubmit={handleLocalLogin}
          />
        )}

        {stage === "local-set-password" && (
          <PasswordStep
            language={language}
            busy={busy}
            title={copyFor(language, "Set a password", "设置密码")}
            hint={copyFor(language, "You'll use this to sign in next time.", "下次直接用密码登录。")}
            cta={copyFor(language, "Create account", "创建账号")}
            minLength={6}
            onSubmit={handleLocalSetPassword}
          />
        )}

        <SafetyTips language={language} variant="link" />
        <CredentialGuide language={language} />
      </div>

      <UnlockSOSEntry language={language} />
    </main>
  );
}

// ── Steps ──────────────────────────────────────────────────────────────────────

function EmailStep({
  language,
  busy,
  onSubmit,
}: {
  language: AppLanguage;
  busy: boolean;
  onSubmit: (email: string, mode: "login" | "register" | "otp") => void;
}) {
  const [email, setEmail] = useState("");
  const valid = email.includes("@");
  return (
    <div className="rounded-[1.75rem] border border-border bg-card/80 p-4 text-left">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Mail className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">
            {copyFor(language, "Enter your email", "输入你的邮箱")}
          </p>
          {IS_CHINA_BUILD && (
            <p className="mt-1 text-xs leading-5 text-amber-600 dark:text-amber-400">
              请使用国内邮箱（QQ、163、Outlook 等）——Gmail在中国大陆无法访问
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valid && onSubmit(email, "login")}
          placeholder={copyFor(language, "Email address", "邮箱地址")}
          type="email"
          autoComplete="email"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <div className="flex gap-2">
          <button
            onClick={() => onSubmit(email, "login")}
            disabled={busy || !valid}
            className="flex-1 rounded-2xl border border-primary bg-background py-3 text-sm font-bold text-primary active:scale-[0.98] disabled:opacity-60"
          >
            {copyFor(language, "Sign in", "登录")}
          </button>
          <button
            onClick={() => onSubmit(email, "register")}
            disabled={busy || !valid}
            className="flex-1 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-60"
          >
            {copyFor(language, "Register", "注册")}
          </button>
        </div>
        <button
          onClick={() => onSubmit(email, "otp")}
          disabled={busy || !valid}
          className="w-full text-xs text-muted-foreground underline disabled:opacity-50"
        >
          {copyFor(language, "Sign in with a one-time email code instead", "改用邮箱验证码登录")}
        </button>
      </div>
    </div>
  );
}

function SetAccountPasswordStep({
  language,
  email,
  busy,
  onSubmit,
  onBack,
}: {
  language: AppLanguage;
  email: string;
  busy: boolean;
  onSubmit: (pwd: string) => void;
  onBack: () => void;
}) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const trySubmit = () => {
    if (pwd !== confirm) {
      setMatchError(copyFor(language, "Passwords don't match.", "两次输入的密码不一致。"));
      return;
    }
    setMatchError(null);
    onSubmit(pwd);
  };

  return (
    <div className="rounded-[1.75rem] border border-border bg-card/80 p-4 text-left">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <KeyRound className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">
            {copyFor(language, "Set account password", "设置账号密码")}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {copyFor(
              language,
              `For ${email}. Used to sign in. A separate vault password for your evidence comes next.`,
              `用于 ${email} 的登录密码。接下来还会再设置一个专门保护证据的保险柜密码。`
            )}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="relative">
          <input
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder={copyFor(language, "Account password", "账号密码")}
            type={showPwd ? "text" : "password"}
            autoComplete="new-password"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-11 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && pwd.length >= 8 && trySubmit()}
          placeholder={copyFor(language, "Confirm password", "再次输入密码")}
          type={showPwd ? "text" : "password"}
          autoComplete="new-password"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        {matchError && <p className="text-xs leading-5 text-destructive">{matchError}</p>}
        <button
          onClick={trySubmit}
          disabled={busy || pwd.length < 8 || confirm.length < 1}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {copyFor(language, "Continue", "继续")}
        </button>
        <button onClick={onBack} className="w-full text-xs text-muted-foreground underline">
          {copyFor(language, "Use a different email", "更换邮箱")}
        </button>
      </div>
    </div>
  );
}

function LoginPasswordStep({
  language,
  email,
  busy,
  error,
  onSubmit,
  onForgotPassword,
  onBack,
}: {
  language: AppLanguage;
  email: string;
  busy: boolean;
  error?: string | null;
  onSubmit: (pwd: string) => void;
  onForgotPassword: () => void;
  onBack: () => void;
}) {
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  return (
    <div className="rounded-[1.75rem] border border-border bg-card/80 p-4 text-left">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <KeyRound className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">
            {copyFor(language, "Welcome back", "欢迎回来")}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{email}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="relative">
          <input
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && pwd.length >= 1 && onSubmit(pwd)}
            placeholder={copyFor(language, "Account password", "账号密码")}
            type={showPwd ? "text" : "password"}
            autoComplete="current-password"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-11 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error && <p className="text-xs leading-5 text-destructive">{error}</p>}
        <button
          onClick={() => onSubmit(pwd)}
          disabled={busy || pwd.length < 1}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {copyFor(language, "Sign in", "登录")}
        </button>
        <button
          onClick={onForgotPassword}
          disabled={busy}
          className="w-full text-xs text-muted-foreground underline disabled:opacity-50"
        >
          {copyFor(language, "Forgot password? Use a one-time email code instead.", "忘记密码？改用邮箱验证码登录")}
        </button>
        <button onClick={onBack} className="w-full text-xs text-muted-foreground underline">
          {copyFor(language, "Use a different email", "使用其他邮箱")}
        </button>
      </div>
    </div>
  );
}

// D-041: OTP expiry shown to the user should MATCH the Supabase Dashboard
// setting (Authentication → Providers → Email → OTP Expiration). Default is
// 3600s = 1 hour, which is unsafe; we recommend 600s = 10 min per NIST
// SP 800-63B. If Katie changes the Dashboard value, update this constant too.
const OTP_LIFETIME_SEC = 600;

function CodeStep({
  language,
  busy,
  email,
  attemptsLeft,
  sentAt,
  onSubmit,
  onResend,
  onBack,
}: {
  language: AppLanguage;
  busy: boolean;
  email: string;
  attemptsLeft: number;
  sentAt: number | null;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(60);
  // Expiry countdown ticks off the wall clock so a background tab still
  // reflects reality when the user comes back.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const expirySecLeft = sentAt
    ? Math.max(0, OTP_LIFETIME_SEC - Math.floor((now - sentAt) / 1000))
    : OTP_LIFETIME_SEC;
  const expiryMm = Math.floor(expirySecLeft / 60);
  const expirySs = expirySecLeft % 60;
  const expired = expirySecLeft === 0 && sentAt !== null;

  const handleResend = () => {
    onResend();
    setCooldown(60);
  };

  return (
    <div className="rounded-[1.75rem] border border-border bg-card/80 p-4 text-left">
      <p className="text-sm font-bold text-foreground">
        {copyFor(language, "Enter the code from your email", "输入邮箱里的验证码")}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {copyFor(language, `Sent to ${email}`, `已发送至 ${email}`)}
      </p>
      {sentAt !== null && (
        <p className={`mt-1 text-[11px] leading-4 ${expired ? "text-destructive" : "text-muted-foreground"}`}>
          {expired
            ? copyFor(
                language,
                "This code has expired. Tap Resend to get a new one.",
                "该验证码已过期，请点击「重新发送」获取新验证码。"
              )
            : copyFor(
                language,
                `Code expires in ${expiryMm}m ${expirySs.toString().padStart(2, "0")}s.`,
                `验证码 ${expiryMm} 分 ${expirySs.toString().padStart(2, "0")} 秒后失效。`
              )}
        </p>
      )}
      {attemptsLeft < 5 && attemptsLeft > 0 && (
        <p className="mt-1 text-[11px] leading-4 text-amber-500">
          {copyFor(
            language,
            `${attemptsLeft} tries left before you'll be sent back to request a new code.`,
            `还剩 ${attemptsLeft} 次机会，超过则需要返回重新获取验证码。`
          )}
        </p>
      )}
      <div className="mt-4 space-y-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && code.length === 6 && !expired && onSubmit(code)}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-center text-xl tracking-[0.5em] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <button
          onClick={() => onSubmit(code)}
          disabled={busy || code.length !== 6 || expired}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {copyFor(language, "Confirm", "确认")}
        </button>
        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="w-full text-xs text-muted-foreground underline disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cooldown > 0
            ? copyFor(language, `Resend in ${cooldown}s`, `${cooldown} 秒后可重新发送`)
            : copyFor(language, "Resend code", "重新发送验证码")}
        </button>
        <button onClick={onBack} className="w-full text-xs text-muted-foreground underline">
          {copyFor(language, "Go back", "返回")}
        </button>
      </div>
    </div>
  );
}

function PasswordStep({
  language,
  busy,
  title,
  hint,
  cta,
  minLength,
  error,
  onSubmit,
  footer,
}: {
  language: AppLanguage;
  busy: boolean;
  title: string;
  hint: string;
  cta: string;
  minLength: number;
  error?: string | null;
  onSubmit: (password: string) => void;
  footer?: React.ReactNode;
}) {
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  return (
    <div className="rounded-[1.75rem] border border-border bg-card/80 p-4 text-left">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <KeyRound className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="relative">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && password.length >= minLength && onSubmit(password)}
            placeholder={copyFor(language, "Password", "密码")}
            type={showPwd ? "text" : "password"}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 pr-11 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <button
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error && <p className="text-xs leading-5 text-destructive">{error}</p>}
        <button
          onClick={() => onSubmit(password)}
          disabled={password.length < minLength || busy}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : cta}
        </button>
        {footer}
      </div>
    </div>
  );
}

function ShowRecoveryStep({
  language,
  recoveryCode,
  onNext,
}: {
  language: AppLanguage;
  recoveryCode: string;
  onNext: () => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-primary/30 bg-primary/5 p-4 text-left">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <PencilLine className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">
            {copyFor(language, "Your recovery key — write it on paper", "你的恢复钥匙——请用笔抄在纸上")}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {copyFor(
              language,
              "If you change phones or forget your vault password, this key gets your evidence back.",
              "换手机或忘记保险柜密码时，靠它找回你的全部证据。"
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-background px-4 py-5 text-center">
        <p className="select-all font-mono text-xl font-bold tracking-widest text-foreground">
          {recoveryCode}
        </p>
      </div>

      <ul className="mt-4 space-y-2 text-xs leading-5 text-muted-foreground">
        <li>
          {copyFor(
            language,
            "✍️ Copy it onto paper and keep it somewhere safe.",
            "✍️ 用笔抄在纸上，收在安全的地方。"
          )}
        </li>
        <li>
          {copyFor(
            language,
            "🚫 Don't screenshot it. Don't save it in WeChat. If someone reads your phone, they'd find it.",
            "🚫 不要截图，不要存进微信。手机被翻看时会被发现。"
          )}
        </li>
        <li>
          {copyFor(
            language,
            "🤐 Never tell anyone — not your partner, not family.",
            "🤐 不要告诉任何人——包括伴侣和家人。"
          )}
        </li>
        <li className="font-semibold text-foreground">
          {copyFor(
            language,
            "⚠️ If you lose BOTH your vault password and this paper, nobody can recover your evidence — not even us.",
            "⚠️ 如果保险柜密码和这张纸都丢了，证据将永远无法找回——我们也帮不了你。"
          )}
        </li>
      </ul>

      <button
        onClick={onNext}
        className="mt-4 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground active:scale-[0.98]"
      >
        {copyFor(language, "I've written it down", "我已抄在纸上")}
      </button>
    </div>
  );
}

function ConfirmRecoveryStep({
  language,
  onBack,
  onSubmit,
}: {
  language: AppLanguage;
  onBack: () => void;
  onSubmit: (typed: string) => void;
}) {
  const [typed, setTyped] = useState("");
  return (
    <div className="rounded-[1.75rem] border border-border bg-card/80 p-4 text-left">
      <p className="text-sm font-bold text-foreground">
        {copyFor(language, "Check your copy", "核对你抄的内容")}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {copyFor(
          language,
          "Type the key from your paper, so we're sure it's copied correctly.",
          "请照着纸上抄好的内容输入一遍，确认没有抄错。"
        )}
      </p>
      <div className="mt-4 space-y-3">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-center font-mono text-base tracking-widest text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <button
          onClick={() => onSubmit(typed)}
          disabled={normalizeRecoveryCode(typed).length !== 12}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {copyFor(language, "Confirm", "确认")}
        </button>
        <button onClick={onBack} className="w-full text-xs text-muted-foreground underline">
          {copyFor(language, "Show the key again", "再看一遍恢复钥匙")}
        </button>
      </div>
    </div>
  );
}

// ── Credential guide (three-password explainer) ─────────────────────────────────

function CredentialGuide({ language }: { language: AppLanguage }) {
  const [open, setOpen] = useState(false);

  const items: Array<{ label: string; body: string }> = [
    {
      label: copyFor(language, "1. Account password", "1. 账号密码"),
      body: copyFor(
        language,
        "Set when you register. Used every time you sign in. Sent securely to our server to verify your identity.",
        "注册时设置。每次登录时使用。通过加密传输到服务器来验证你的身份。"
      ),
    },
    {
      label: copyFor(language, "2. Vault password", "2. 保险柜密码"),
      body: copyFor(
        language,
        "Also set when you register — completely separate from your account password. Used to view, export or delete evidence. Never leaves your device. Even we cannot read your files.",
        "注册时同样设置，和账号密码完全独立。用于查看、导出或删除证据。从不离开你的设备——即使是我们也无法读取你的文件。"
      ),
    },
    {
      label: copyFor(language, "3. Paper recovery code", "3. 纸质恢复码"),
      body: copyFor(
        language,
        "A 12-character code generated once when you first set up your vault. Write it on paper and keep it safe. If you forget your vault password, this is the only way to recover your evidence.",
        "注册配置保险柜时系统生成一次，共12个字符。请用笔抄在纸上保管好。如果你忘记保险柜密码，这是找回全部证据的唯一方法。"
      ),
    },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mx-auto mt-2 block text-xs text-muted-foreground underline"
      >
        {copyFor(language, "What are the three passwords?", "三个密码各有什么用？")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80dvh] w-full max-w-sm overflow-y-auto rounded-t-[1.75rem] border border-border bg-card p-5 text-left sm:rounded-[1.75rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                {copyFor(language, "Your three credentials", "三个密码说明")}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground"
                aria-label={copyFor(language, "Close", "关闭")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.label}>
                  <p className="text-xs font-bold text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
