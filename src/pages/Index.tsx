import { useCallback, useEffect, useState } from "react";
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
import DemoWelcome from "@/components/DemoWelcome";
import WeChatGroupButton from "@/components/WeChatGroupButton";
import WelcomeFeedbackDialog, {
  hasSeenWelcomePopup,
  markWelcomePopupSeen,
} from "@/components/WelcomeFeedbackDialog";
import { setSessionMasterKey } from "@/lib/keyVaultService";
import { initDemoSessionKey, seedDemoRecordsIfEmpty } from "@/lib/demoVault";

// DEMO branch: BetaGate deleted; VITE_BETA_CODE ignored.
// LoginFlow removed; a single DemoWelcome screen gates entry.

const BRAND_BANNER_EN = "SECURE RECORD PROTECT SPEAK";
const BRAND_BANNER_ZH = "安全 记录 守护 发声";
const LOGO_SRC = "/the-unmuted-mark.png";

export default function Index() {
  const [activeTab, setActiveTab] = useState<MainTab>("sos");
  const { language, setLanguage } = useLocale();
  const { isSilent, voiceDeterrent, customAudioUrl } = useSilentMode();
  const [entered, setEntered] = useState(false);
  const [autoLocked, setAutoLocked] = useState(false);
  const [welcomePopupOpen, setWelcomePopupOpen] = useState(false);

  // Demo: initialize the session master key on app load so uploads work
  // without any password. Vault-password gates in EvidencePage still ask for
  // "123456" as a flow simulation (see D-039 + demoVault.verifyDemoPassword).
  useEffect(() => {
    void initDemoSessionKey();
  }, []);

  const handleEnter = async () => {
    await initDemoSessionKey();
    await seedDemoRecordsIfEmpty();
    setAutoLocked(false);
    setEntered(true);
    // First-time visitors: show the "how to give feedback" popup once.
    // Auto-locked returning sessions skip it (they've already seen it).
    if (!hasSeenWelcomePopup()) {
      setWelcomePopupOpen(true);
    }
  };

  const handleWelcomePopupChange = (next: boolean) => {
    setWelcomePopupOpen(next);
    if (!next) markWelcomePopupSeen();
  };

  // Auto-lock in demo just re-shows the welcome screen. No session state to
  // sign out — everything is local IndexedDB.
  const handleAutoLock = useCallback(() => {
    setSessionMasterKey(null);
    setEntered(false);
    setAutoLocked(true);
  }, []);
  useAutoLock(entered, handleAutoLock);

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-background">
      {/* Top bar */}
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
        <div className="flex shrink-0 items-center gap-1.5">
          <WeChatGroupButton language={language} />
          <QuickExitButton language={language} />
          <FeedbackWidget language={language} />
          <button
            onClick={() => setLanguage(language === "en" ? "zh" : "en")}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-border bg-card/90 text-[11px] font-bold leading-none text-primary transition-colors hover:bg-accent"
          >
            {language === "en" ? "中" : "EN"}
          </button>
        </div>
      </header>

      {!entered ? (
        <>
          {autoLocked && (
            <div className="mx-auto mt-3 flex w-[min(90vw,340px)] items-start gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-5 text-muted-foreground">
                {copyFor(
                  language,
                  "You were idle for a while; the demo re-locked itself. Click Enter Demo again to continue.",
                  "已闲置一段时间，Demo 已自动上锁。请重新点击「进入 Demo」继续。"
                )}
              </p>
            </div>
          )}
          <DemoWelcome language={language} onEnter={handleEnter} />
        </>
      ) : (
        <>
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
              <EvidencePage language={language} userEmail="demo@unmuted.local" />
            )}
            {activeTab === "aid" && <AidPage language={language} />}
            {activeTab === "simulation" && (
              <SimulationPage language={language} onGoToAid={() => setActiveTab("aid")} />
            )}
          </main>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} language={language} />
        </>
      )}
      <WelcomeFeedbackDialog
        open={welcomePopupOpen}
        onOpenChange={handleWelcomePopupChange}
        language={language}
      />
    </div>
  );
}

