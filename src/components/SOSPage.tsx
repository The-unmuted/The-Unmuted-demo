/**
 * Emergency entry point: SOS button (5s hold → group SMS with location)
 * plus emergency-contact and SOS-message-template management.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Trash2 } from "lucide-react";
import SOSButton from "./SOSButton";
import { NGOSuggestionSheet } from "./NGOPage";
import { AppLanguage, copyFor } from "@/lib/locale";
import { useEmergencyContacts, MAX_EMERGENCY_CONTACTS } from "@/hooks/useEmergencyContacts";
import { useSosMessage, DEFAULT_TEMPLATE } from "@/hooks/useSosMessage";

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
  const atLimit = contacts.length >= MAX_EMERGENCY_CONTACTS;

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
          {copyFor(language, "Emergency Contacts", "紧急联系人")}
        </p>
        {!atLimit && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {copyFor(language, "Add", "添加")}
          </button>
        )}
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        {copyFor(
          language,
          "They'll receive an SMS with your location when you trigger SOS. Up to 2 contacts.",
          "SOS触发时，会向他们发送带有你位置的短信。最多可设置 2 位联系人。"
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
            <div className="space-y-2 pt-1">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={copyFor(language, "Name", "姓名")}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={copyFor(language, "Phone number", "手机号")}
                type="tel"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
              <button
                onClick={handleAdd}
                disabled={!name.trim() || !phone.trim()}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {copyFor(language, "Save contact", "保存联系人")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {contacts.length === 0 ? (
        <p className="text-xs text-muted-foreground/70 italic">
          {copyFor(language, "No contacts yet. Add one above.", "暂无联系人，请点击添加。")}
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
                onClick={() => removeContact(c.id)}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
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
  const { template, setTemplate, reset } = useSosMessage();
  const isDefault = template === DEFAULT_TEMPLATE;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card/92 px-5 py-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">
            {copyFor(language, "SOS Message", "求救信息")}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {copyFor(
              language,
              "Edit to match your situation. {位置} will be replaced with your GPS coordinates.",
              "根据你的情况修改。{位置} 会自动替换成 GPS 坐标（可粘贴到任意地图 App）。"
            )}
          </p>
        </div>
        {!isDefault && (
          <button
            onClick={reset}
            className="shrink-0 text-xs text-muted-foreground underline hover:text-foreground transition-colors"
          >
            {copyFor(language, "Reset", "恢复默认")}
          </button>
        )}
      </div>

      <textarea
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        rows={6}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary resize-none leading-6"
      />

      <p className="text-[11px] text-muted-foreground/60">
        {copyFor(
          language,
          "Tip: keep {位置} to include your GPS location automatically.",
          "提示：保留 {位置} 可自动插入你的 GPS 定位。"
        )}
      </p>
    </div>
  );
}

