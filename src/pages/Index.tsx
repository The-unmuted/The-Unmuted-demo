import { useEffect, useRef, useState } from "react";
import { useZKPIdentity } from "@/hooks/useZKPIdentity";
import { useSilentMode } from "@/hooks/useSilentMode";
import SOSPage from "@/components/SOSPage";
import BottomNav, { type MainTab } from "@/components/BottomNav";
import MapPage from "@/components/MapPage";
import EvidencePage from "@/components/EvidencePage";
import CommunityPage from "@/components/CommunityPage";
import NGOPage from "@/components/NGOPage";
import { useLocale, copyFor } from "@/lib/locale";
import { emailFromPrivyUser, normalizeEmail, usePrivyAuth } from "@/lib/privyAuth";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import FeedbackWidget from "@/components/FeedbackWidget";
import SettingsWidget from "@/components/SettingsWidget";
import { hasPassword, verifyPassword, savePassword } from "@/lib/userCredentials";

const BRAND_BANNER_EN = "SECURE RECORD PROTECT SPEAK";
const BRAND_BANNER_ZH = "安全 记录 守护 发声";
const LOGO_SRC = "/the-unmuted-mark.png";

export default function Index() {
  const [activeTab, setActiveTab] = useState<MainTab>("sos");
  const [showAfterReport, setShowAfterReport] = useState(false);
  const { language, setLanguage } = useLocale();
  const identity = useZKPIdentity();
  const privyAuth = usePrivyAuth();
  const { isSilent, voiceDeterrent, customAudioUrl } = useSilentMode();
  type SignupMode = "idle" | "email-send" | "email-verify" | "email-contact" | "password-login" | "set-password";
  const [signupMode, setSignupMode] = useState<SignupMode>("idle");
  const [pendingEmail, setPendingEmail] = useState("");
  const handledPrivyUserRef = useRef("");

  const isSignedIn = Boolean(identity.identity?.provider && identity.identity.commitment);

  useEffect(() => {
    if (!privyAuth.ready || !privyAuth.authenticated || !privyAuth.user || isSignedIn) return;
    if (handledPrivyUserRef.current === privyAuth.user.id) return;

    const verifiedEmail = emailFromPrivyUser(privyAuth.user);
    if (!verifiedEmail) return;

    handledPrivyUserRef.current = privyAuth.user.id;
    void identity
      .generateFromEmail(verifiedEmail, privyAuth.user.id, true)
      .then(async () => {
        // Prompt to set a password if they don't have one yet
        const hasPwd = await hasPassword(verifiedEmail);
        if (!hasPwd) {
          setPendingEmail(verifiedEmail);
          setSignupMode("set-password");
        } else {
          setSignupMode("idle");
        }
        toast.success(copyFor(language, "Email verified. Identity created.", "邮箱已验证，身份已创建。"));
      })
      .catch((error) => {
        handledPrivyUserRef.current = "";
        toast.error(error instanceof Error ? error.message : copyFor(language, "Could not create identity.", "身份创建失败。"));
      });
  }, [identity, isSignedIn, language, privyAuth.authenticated, privyAuth.ready, privyAuth.user]);

  const handleEmailSignup = async (email: string) => {
    const normalized = normalizeEmail(email);
    if (!normalized || !normalized.includes("@")) {
      toast.error(copyFor(language, "Enter a valid email address.", "请输入有效邮箱地址。"));
      return;
    }

    setPendingEmail(normalized);

    // Check if user already has a password set → go to password login
    const hasPwd = await hasPassword(normalized);
    if (hasPwd) {
      setSignupMode("password-login");
      return;
    }

    if (!privyAuth.configured) {
      setSignupMode("email-contact");
      return;
    }

    setSignupMode("email-send");
    try {
      await privyAuth.sendEmailCode(normalized);
      setSignupMode("email-verify");
      toast.success(copyFor(language, "OTP sent. Check your email.", "验证码已发送，请查看邮箱。"));
    } catch (error) {
      setSignupMode("idle");
      toast.error(error instanceof Error ? error.message : copyFor(language, "Could not send OTP.", "验证码发送失败。"));
    }
  };

  const handlePasswordLogin = async (password: string) => {
    const ok = await verifyPassword(pendingEmail, password);
    if (!ok) {
      toast.error(copyFor(language, "Incorrect password.", "密码错误。"));
      return;
    }
    await identity.generateFromEmail(pendingEmail, `password:${pendingEmail}`, true);
    toast.success(copyFor(language, "Welcome back!", "欢迎回来！"));
    setSignupMode("idle");
  };

  const handleSetPassword = async (password: string) => {
    if (password.length < 6) {
      toast.error(copyFor(language, "Password must be at least 6 characters.", "密码至少6位。"));
      return;
    }
    await savePassword(pendingEmail, password);
    toast.success(copyFor(language, "Password saved. You can use it next time.", "密码已保存，下次可直接使用。"));
    setSignupMode("idle");
  };

  const handleVerifyEmail = async (token: string) => {
    if (!pendingEmail) return;
    if (!token.trim()) {
      toast.error(copyFor(language, "Enter the OTP code.", "请输入验证码。"));
      return;
    }

    setSignupMode("email-verify");
    try {
      await privyAuth.verifyEmailCode(token.trim());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copyFor(language, "OTP verification failed.", "验证码验证失败。"));
    }
  };

  const handleContactOnlyEmail = async () => {
    if (!pendingEmail) return;
    setSignupMode("email-contact");
    try {
      await identity.generateFromEmail(pendingEmail, `contact-only:${pendingEmail}`, false);
      toast.success(copyFor(language, "Email contact saved. Limited identity created.", "邮箱联系方式已保存，已创建受限身份。"));
    } finally {
      setSignupMode("idle");
    }
  };

  const handleLogout = () => {
    identity.revoke();
    setSignupMode("idle");
    setPendingEmail("");
  };

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-background">
      {/* Top bar — sits below the iOS status bar (safe-area-inset-top handled by body) */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src={LOGO_SRC}
            alt=""
            className="h-12 w-12 object-contain drop-shadow-[0_0_18px_hsl(var(--primary)/0.32)]"
          />
          <div className="leading-tight">
            <span className="block text-sm font-black tracking-[0.08em] text-foreground">
              {copyFor(language, "THE UNMUTED", "非默")}
            </span>
            <span className="block whitespace-nowrap text-[11px] tracking-[0.16em] text-primary/80">
              {copyFor(language, BRAND_BANNER_EN, BRAND_BANNER_ZH)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FeedbackWidget language={language} />
          {isSignedIn && (
            <SettingsWidget
              language={language}
              email={pendingEmail}
              onLogout={handleLogout}
            />
          )}
          <button
            onClick={() => setLanguage(language === "en" ? "zh" : "en")}
            className="rounded-full border border-border bg-card/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-accent"
          >
            {language === "en" ? "中文" : "EN"}
          </button>
        </div>
      </header>

      {!isSignedIn || signupMode === "set-password" ? (
        <SignupPage
          language={language}
          loading={identity.generating}
          mode={signupMode}
          emailOtpReady={privyAuth.configured}
          emailOtpStatus={privyAuth.emailOtpStatus}
          pendingEmail={pendingEmail}
          onEmailSignup={handleEmailSignup}
          onVerifyEmail={handleVerifyEmail}
          onContactOnlyEmail={handleContactOnlyEmail}
          onCancelEmail={() => setSignupMode("idle")}
          onPasswordLogin={handlePasswordLogin}
          onSetPassword={handleSetPassword}
          onSkipPassword={() => setSignupMode("idle")}
        />
      ) : (
        <>
          {/* Main content scrolls above the bottom nav, which now participates in layout. */}
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
            {showAfterReport ? (
              <EvidencePage
                language={language}
                onExit={() => setShowAfterReport(false)}
                onComplete={() => setShowAfterReport(false)}
              />
            ) : activeTab === "sos" && (
              <SOSPage
                isSilent={isSilent}
                voiceDeterrent={voiceDeterrent}
                customAudioUrl={customAudioUrl}
                onAfterReport={() => setShowAfterReport(true)}
                language={language}
              />
            )}
            {!showAfterReport && activeTab === "map" && <MapPage language={language} />}
            {!showAfterReport && activeTab === "community" && <CommunityPage language={language} />}
            {!showAfterReport && activeTab === "ngo" && <NGOPage language={language} />}
          </main>

          {/* Bottom nav */}
          {!showAfterReport && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} language={language} />}
        </>
      )}
    </div>
  );
}

function SignupPage({
  language,
  loading,
  mode,
  emailOtpReady,
  emailOtpStatus,
  pendingEmail,
  onEmailSignup,
  onVerifyEmail,
  onContactOnlyEmail,
  onCancelEmail,
  onPasswordLogin,
  onSetPassword,
  onSkipPassword,
}: {
  language: "en" | "zh";
  loading: boolean;
  mode: "idle" | "email-send" | "email-verify" | "email-contact" | "password-login" | "set-password";
  emailOtpReady: boolean;
  emailOtpStatus: string;
  pendingEmail: string;
  onEmailSignup: (email: string) => void;
  onVerifyEmail: (token: string) => void;
  onContactOnlyEmail: () => void;
  onCancelEmail: () => void;
  onPasswordLogin: (password: string) => void;
  onSetPassword: (password: string) => void;
  onSkipPassword: () => void;
}) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const busy = loading || mode === "email-send" || emailOtpStatus === "submitting-code";

  return (
    <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <img
          src={LOGO_SRC}
          alt=""
          className="mx-auto mb-6 h-24 w-24 object-contain drop-shadow-[0_0_34px_hsl(var(--primary)/0.34)]"
        />
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {copyFor(
            language,
            "Enter your email to create a private identity. The app will remember you next time.",
            "输入邮箱创建私密身份。之后再次打开会保持登录状态。"
          )}
        </p>

        <div className="mt-8 rounded-[1.75rem] border border-border bg-card/80 p-4 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {copyFor(language, "Continue with email", "使用邮箱继续")}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {emailOtpReady
                  ? copyFor(language, "Privy will send a one-time code to verify your email.", "Privy 会发送一次性验证码来验证邮箱。")
                  : copyFor(language, "Privy is not configured yet. For now, email creates a limited contact identity.", "Privy 尚未配置。目前邮箱会创建受限联系方式身份。")}
              </p>
            </div>
          </div>

          {mode !== "email-verify" && (
            <div className="mt-4 space-y-3">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={copyFor(language, "Email address", "邮箱地址")}
                type="email"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
              <button
                onClick={() => onEmailSignup(email)}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-sm font-bold text-foreground active:scale-[0.98] disabled:opacity-60"
              >
                {mode === "email-send" || emailOtpStatus === "sending-code" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {emailOtpReady
                  ? copyFor(language, "Send OTP code", "发送验证码")
                  : copyFor(language, "Continue with email contact", "使用邮箱联系方式继续")}
              </button>
            </div>
          )}

          {mode === "email-verify" && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                {copyFor(language, `Code sent to ${pendingEmail}`, `验证码已发送至 ${pendingEmail}`)}
              </p>
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder={copyFor(language, "One-time code", "一次性验证码")}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
              <button
                onClick={() => onVerifyEmail(otp)}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-60"
              >
                {loading || emailOtpStatus === "submitting-code" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {copyFor(language, "Verify and enter", "验证并进入")}
              </button>
              <button onClick={onCancelEmail} className="w-full text-xs text-muted-foreground underline">
                {copyFor(language, "Use another email", "使用其他邮箱")}
              </button>
            </div>
          )}

          {mode === "email-contact" && (
            <div className="mt-4 rounded-2xl border border-sos-offline/30 bg-sos-offline/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sos-offline" />
                <p className="text-xs leading-5 text-muted-foreground">
                  {copyFor(
                    language,
                    "Real OTP is not configured yet. This lets non-Web3 users enter with limited map trust until a Privy app ID is added.",
                    "真实 OTP 尚未配置。这会让非 Web3 用户以受限地图可信度进入，直到添加 Privy App ID。"
                  )}
                </p>
              </div>
              <button
                onClick={onContactOnlyEmail}
                disabled={loading}
                className="mt-3 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {copyFor(language, "Enter with limited identity", "以受限身份进入")}
              </button>
            </div>
          )}

          {/* Password login — returning user */}
          {mode === "password-login" && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                {copyFor(language, `Welcome back, ${pendingEmail}`, `欢迎回来，${pendingEmail}`)}
              </p>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onPasswordLogin(password)}
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
              <button
                onClick={() => onPasswordLogin(password)}
                disabled={!password || busy}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />
                {copyFor(language, "Sign in", "登录")}
              </button>
              <button onClick={onCancelEmail} className="w-full text-xs text-muted-foreground underline">
                {copyFor(language, "Use a different email", "使用其他邮箱")}
              </button>
            </div>
          )}
        </div>

        {/* Set password — shown after first OTP success */}
        {mode === "set-password" && (
          <div className="mt-5 rounded-[1.75rem] border border-primary/30 bg-primary/5 p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {copyFor(language, "Set a password", "设置密码")}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {copyFor(language, "Next time you can skip the OTP and sign in directly.", "下次可以跳过验证码，直接用密码登录。")}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={copyFor(language, "Choose a password (min. 6 chars)", "设置密码（至少6位）")}
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
              <button
                onClick={() => onSetPassword(password)}
                disabled={password.length < 6}
                className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {copyFor(language, "Save password & enter", "保存密码并进入")}
              </button>
              <button onClick={onSkipPassword} className="w-full text-xs text-muted-foreground underline">
                {copyFor(language, "Skip for now", "跳过")}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
