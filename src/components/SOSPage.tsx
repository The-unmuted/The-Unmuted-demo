/**
 * Emergency entry point: SOS button (5s hold → group SMS with location)
 * plus emergency-contact and SOS-message-template management.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import SOSButton from "./SOSButton";
import { NGOSuggestionSheet } from "./NGOPage";
import { AppLanguage, copyFor } from "@/lib/locale";
import { useEmergencyContacts } from "@/hooks/useEmergencyContacts";
import { useSosMessage } from "@/hooks/useSosMessage";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SOSPageProps {
  isSilent:          boolean;
  voiceDeterrent:    boolean;
  customAudioUrl:    string | null;
  language:          AppLanguage;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SOSPage(props: SOSPageProps) {
  const [showNGOSuggestion, setShowNGOSuggestion] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <AnimatePresence>
        {showNGOSuggestion && (
          <NGOSuggestionSheet
            language={props.language}
            onClose={() => setShowNGOSuggestion(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <Pane key="home">
          <HomeView
            onUserSafe={() => setShowNGOSuggestion(true)}
            language={props.language}
            isSilent={props.isSilent}
            voiceDeterrent={props.voiceDeterrent}
            customAudioUrl={props.customAudioUrl}
          />
        </Pane>
      </AnimatePresence>
    </div>
  );
}

// ── Shared frame ───────────────────────────────────────────────────────────────

function Pane({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2 }}
      className="flex flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}

// ── Home view ──────────────────────────────────────────────────────────────────

function HomeView({
  onUserSafe,
  language,
  isSilent,
  voiceDeterrent,
  customAudioUrl,
}: {
  onUserSafe: () => void;
  language: AppLanguage;
  isSilent: boolean;
  voiceDeterrent: boolean;
  customAudioUrl: string | null;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 py-6">
      <div className="flex w-full max-w-[25rem] items-center justify-center py-4">
        <SOSButton
          isSilent={isSilent}
          voiceDeterrent={voiceDeterrent}
          customAudioUrl={customAudioUrl}
          language={language}
          onUserSafe={onUserSafe}
        />
      </div>

      {/* Emergency contacts management card */}
      <EmergencyContactsCard language={language} />

      {/* Pre-set SOS message template card */}
      <SosMessageCard language={language} />

    </div>
  );
}

// ── Emergency Contacts Card ────────────────────────────────────────────────────

function EmergencyContactsCard({ language }: { language: AppLanguage }) {
  const { contacts, addContact, removeContact } = useEmergencyContacts();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = () => {
    if (!name.trim() || !phone.trim()) return;
    addContact(name.trim(), phone.trim());
    setName("");
    setPhone("");
    setAdding(false);
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card/92 px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">
          {copyFor(language, "Emergency Contacts", "紧急联系人", "Notfallkontakte")}
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          aria-label={copyFor(language, "Add emergency contact", "添加紧急联系人", "Notfallkontakt hinzufügen")}
          aria-expanded={adding}
          title={copyFor(language, "Add emergency contact", "添加紧急联系人", "Notfallkontakt hinzufügen")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/50 bg-primary/10 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.12)] transition-all hover:border-primary hover:bg-primary/20 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus
            className={`h-5 w-5 transition-transform ${adding ? "rotate-45" : "rotate-0"}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        {copyFor(
          language,
          "All saved contacts will receive an SMS with your location when you trigger SOS. Add as many trusted contacts as you need.",
          "SOS 触发时，会向所有联系人发送带有你位置的短信。你可以添加任意数量的紧急联系人。",
          "Beim Auslösen von SOS öffnet sich eine vorausgefüllte SMS an alle gespeicherten Kontakte – mit deinem Standort. Prüfe sie und tippe in der SMS-App auf Senden. Du kannst beliebig viele Vertrauenspersonen hinzufügen."
        )}
      </p>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form
              className="space-y-2 pt-1"
              onSubmit={(event) => {
                event.preventDefault();
                handleAdd();
              }}
            >
              <label htmlFor="emergency-contact-name" className="sr-only">
                {copyFor(language, "Name", "姓名", "Name")}
              </label>
              <input
                id="emergency-contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder={copyFor(language, "Name", "姓名", "Name")}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              />
              <label htmlFor="emergency-contact-phone" className="sr-only">
                {copyFor(language, "Phone number", "手机号", "Telefonnummer")}
              </label>
              <input
                id="emergency-contact-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={copyFor(language, "Phone number", "手机号", "Telefonnummer")}
                type="tel"
                autoComplete="tel"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                disabled={!name.trim() || !phone.trim()}
                className="min-h-10 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {copyFor(language, "Save contact", "保存联系人", "Kontakt speichern")}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {contacts.length === 0 ? (
        <p className="text-xs text-muted-foreground/70 italic">
          {copyFor(language, "No contacts yet. Add one above.", "暂无联系人，请点击添加。", "Noch keine Kontakte. Füge oben einen hinzu.")}
        </p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => removeContact(c.id)}
                aria-label={copyFor(language, `Remove ${c.name}`, `删除 ${c.name}`, `${c.name} entfernen`)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SOS Message Template Card ─────────────────────────────────────────────────

function SosMessageCard({ language }: { language: AppLanguage }) {
  const { template, setTemplate, reset, isDefault } = useSosMessage(language);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card/92 px-5 py-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">
            {copyFor(language, "SOS Message", "求救信息", "SOS-Nachricht")}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {copyFor(
              language,
              "Edit to match your situation. {位置} will be replaced with your GPS coordinates.",
              "根据你的情况修改。{位置} 会自动替换成 GPS 坐标（可粘贴到任意地图 App）。",
              "Passe die Nachricht an deine Situation an. {Standort} wird durch deine GPS-Koordinaten ersetzt."
            )}
          </p>
        </div>
        {!isDefault && (
          <button
            type="button"
            onClick={reset}
            className="min-h-10 shrink-0 rounded-md px-2 text-xs text-muted-foreground underline transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copyFor(language, "Reset", "恢复默认", "Zurücksetzen")}
          </button>
        )}
      </div>

      <textarea
        aria-label={copyFor(language, "SOS message template", "求救信息模板", "Vorlage für die SOS-Nachricht")}
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        rows={6}
        className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
      />

      <p className="text-[11px] text-muted-foreground/60">
        {copyFor(
          language,
          "Tip: keep {位置} to include your GPS location automatically.",
          "提示：保留 {位置} 可自动插入你的 GPS 定位。",
          "Tipp: Behalte {Standort} in der Nachricht, damit dein GPS-Standort automatisch eingefügt wird."
        )}
      </p>
    </div>
  );
}
