import { useCallback, useState, type ReactNode } from "react";
import { useZKPIdentity } from "@/hooks/useZKPIdentity";
import { useSilentMode } from "@/hooks/useSilentMode";
import { useAutoLock } from "@/hooks/useAutoLock";
import { ShieldCheck } from "lucide-react";
import SOSPage from "@/components/SOSPage";
import BottomNav, { type MainTab } from "@/components/BottomNav";
import EvidencePage from "@/components/EvidencePage";
import AidPage from "@/components/AidPage";
import SimulationPage from "@/components/SimulationPage";
import { useLocale, copyFor } from "@/lib/locale";
import FeedbackWidget from "@/components/FeedbackWidget";
import { QuickExitButton } from "@/components/QuickExit";
import SettingsWidget from "@/components/SettingsWidget";
import LoginFlow from "@/components/LoginFlow";
import { signOut } from "@/lib/authService";
import { setSessionMasterKey } from "@/lib/keyVaultService";

const BETA_CODE = (import.meta.env.VITE_BETA_CODE ?? "").trim().toUpperCase();
const BETA_STORE = "unmuted_beta_ok";

const BRAND_BANNER_EN = "SECURE RECORD PROTECT SPEAK";
const BRAND_BANNER_ZH = "安全 记录 守护 发声";
const LOGO_SRC = "/the-unmuted-mark.png";

export default function Index() {
  const [activeTab, setActiveTab] = useState<MainTab>("sos");
  const { language, setLanguage } = useLocale();
  const identity = useZKPIdentity();
  const { isSilent, voiceDeterrent, customAudioUrl } = useSilentMode();
  const [pendingEmail, setPendingEmail] = useState("");
  // Master key lives only in memory (D-017), so every page load starts locked
  // even when the account session and local identity persist.
  const [unlocked, setUnlocked] = useState(false);
  const [autoLocked, setAutoLocked] = useState(false);

  const isSignedIn = unlocked && Boolean(identity.identity?.provider && identity.identity.commitment);

  const handleUnlocked = async (email: string) => {
    setPendingEmail(email);
    await identity.generateFromEmail(email, `password:${email}`, true);
    setAutoLocked(false);
    setUnlocked(true);
  };

  // Keep the account session (no signOut): the user only re-enters her password.
  const handleAutoLock = useCallback(() => {
    setSessionMasterKey(null);
    setUnlocked(false);
    setAutoLocked(true);
  }, []);
  useAutoLock(isSignedIn, handleAutoLock);

  const handleLogout = () => {
    identity.revoke();
    setSessionMasterKey(null);
    void signOut();
    setPendingEmail("");
    setUnlocked(false);
  };

  return (
    <BetaGate>
    <div className="flex h-[100dvh] min-h-0 flex-col bg-background">
      {/* Top bar — sits below the iOS status bar (safe-area-inset-top handled by body) */}
      <header className="flex shrink-0 items-center justify-between border-b border-border/80 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <img
            src={LOGO_SRC}
            alt=""
            className="h-9 w-9 shrink-0 object-contain drop-shadow-[0_0_14px_hsl(var(--primary)/0.28)]"
          />
          <div className="min-w-0 leading-tight">
            <span className="block text-[13px] font-black tracking-[0.06em] text-foreground">
              {copyFor(language, "THE UNMUTED", "非默")}
            </span>
            <span className="block whitespace-nowrap text-[9px] tracking-[0.08em] text-primary/80">
              {copyFor(language, BRAND_BANNER_EN, BRAND_BANNER_ZH)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <QuickExitButton language={language} />
          <FeedbackWidget language={language} />
          {isSignedIn && (
            <SettingsWidget language={language} onLogout={handleLogout} />
          )}
          <button
            onClick={() => setLanguage(language === "en" ? "zh" : "en")}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-border bg-card/90 text-[11px] font-bold leading-none text-primary transition-colors hover:bg-accent"
          >
            {language === "en" ? "中" : "EN"}
          </button>
        </div>
      </header>

      {!isSignedIn ? (
        <>
          {autoLocked && (
            <div className="mx-auto mt-3 flex w-[min(90vw,340px)] items-start gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-5 text-muted-foreground">
                {copyFor(
                  language,
                  "You were away for a while, so the app locked itself to protect your records.",
                  "你离开了一会儿，为保护你的资料，应用已自动上锁。"
                )}
              </p>
            </div>
          )}
          <LoginFlow language={language} onUnlocked={handleUnlocked} />
        </>
      ) : (
        <>
          {/* Main content scrolls above the bottom nav, which now participates in layout. */}
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
            {activeTab === "sos" && (
              <SOSPage
                isSilent={isSilent}
                voiceDeterrent={voiceDeterrent}
                customAudioUrl={customAudioUrl}
                language={language}
              />
            )}
            {activeTab === "evidence" && (
              <EvidencePage language={language} userEmail={pendingEmail || undefined} />
            )}
            {activeTab === "aid" && <AidPage language={language} />}
            {activeTab === "simulation" && (
              <SimulationPage language={language} onGoToAid={() => setActiveTab("aid")} />
            )}
          </main>

          {/* Bottom nav */}
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} language={language} />
        </>
      )}
    </div>
    </BetaGate>
  );
}

// ── Internal access gate ─────────────────────────────────────────────────────

function BetaGate({ children }: { children: ReactNode }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [passed, setPassed] = useState(() => {
    if (!BETA_CODE) return true;
    return localStorage.getItem(BETA_STORE) === BETA_CODE;
  });

  if (passed) return <>{children}</>;

  const submit = () => {
    if (input.trim().toUpperCase() === BETA_CODE) {
      localStorage.setItem(BETA_STORE, BETA_CODE);
      setPassed(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center bg-background px-6">
      <img
        src="/the-unmuted-mark.png"
        alt=""
        className="mb-6 h-20 w-20 object-contain opacity-80 drop-shadow-[0_0_24px_hsl(var(--primary)/0.3)]"
      />
      <p className="mb-1 text-sm font-bold text-foreground">Internal access only · 内部访问</p>
      <p className="mb-6 text-xs text-muted-foreground">Enter the team access code · 请输入团队访问码</p>
      <div className="w-full max-w-xs space-y-3">
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Access code · 访问码"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-center font-mono text-sm tracking-widest text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        {error && (
          <p className="text-center text-xs text-destructive">
            Incorrect code · 访问码不正确
          </p>
        )}
        <button
          onClick={submit}
          disabled={!input.trim()}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          Continue · 进入
        </button>
      </div>
    </div>
  );
}
