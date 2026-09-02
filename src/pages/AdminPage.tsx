/**
 * /admin route — team-only feedback panel.
 *
 * Auth model (shared team password, replaces per-user magic link):
 * 1. The team shares one Supabase account. The email is hardcoded
 *    (TEAM_ADMIN_EMAIL below); the password is set in the Supabase
 *    dashboard and shared with the 5 team members out-of-band
 *    (WeChat / Signal).
 * 2. User visits /admin → enters the shared password → we call
 *    supabase.auth.signInWithPassword({email: TEAM_ADMIN_EMAIL, password}).
 * 3. RLS in Supabase (migration 0002 + 0003) checks the JWT email against
 *    the unmuted_admins allow-list. If the shared account's email is on
 *    the list, the feedback SELECT query returns rows; otherwise nothing.
 *
 * Why not the built-in Supabase email OTP: the free tier caps outgoing
 * mail at ~4/hour across the whole project. A five-person team hit that
 * limit within one login attempt round. Custom SMTP would fix it but is
 * out of scope for the beta.
 *
 * We deliberately do NOT rely on any client-side password check — the
 * password IS the shared credential and Supabase verifies it server-side.
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff, KeyRound, Loader2, LogOut, RefreshCw, Search } from "lucide-react";

// The shared team account. Change here + in Supabase dashboard + in
// migration 0003 if you ever rotate the identity. The email does not
// need to receive mail; Supabase only uses it as a login identifier.
const TEAM_ADMIN_EMAIL = "admin@theunmuted.demo";

type FeedbackRow = {
  id: number;
  created_at: string;
  type: "bug" | "suggestion" | "other";
  message: string;
  language: string | null;
  admin_notes: string | null;
  admin_notes_by: string | null;
  admin_notes_at: string | null;
};

export default function AdminPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!supabase) {
    return (
      <FullScreen>
        <div className="max-w-sm rounded-2xl border border-rose-500/40 bg-rose-500/5 p-6 text-center">
          <h1 className="text-lg font-bold text-rose-400">Supabase not configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables to use the admin panel.
          </p>
        </div>
      </FullScreen>
    );
  }

  if (checkingSession) {
    return (
      <FullScreen>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </FullScreen>
    );
  }

  if (!session) {
    return <AdminLogin onBack={() => navigate("/")} />;
  }

  return <AdminPanel session={session} />;
}

// ─── Login ─────────────────────────────────────────────────────────

function AdminLogin({ onBack }: { onBack: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSigningIn(true);
    try {
      const { error } = await supabase!.auth.signInWithPassword({
        email: TEAM_ADMIN_EMAIL,
        password: password.trim(),
      });
      if (error) throw error;
      // onAuthStateChange picks up the new session.
    } catch (e) {
      const msg = (e as Error).message || "";
      // Translate Supabase's stock error into something friendlier.
      if (/invalid.*credentials|password/i.test(msg)) {
        setError("密码不对，请找团队核对最新的共享密码。");
      } else {
        setError(msg || "登录失败");
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <FullScreen>
      <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card p-6">
        <h1 className="text-lg font-black text-foreground">非默 · 管理面板</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          The Unmuted · Admin Panel
        </p>

        <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-3">
          <label className="text-xs font-semibold text-muted-foreground">
            团队共享密码
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="团队共享密码"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={signingIn || !password.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {signingIn ? "登录中..." : "登录"}
          </button>
          <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
            密码在飞书。
          </p>
        </form>

        <button
          onClick={onBack}
          className="mt-4 w-full text-center text-xs text-muted-foreground underline"
        >
          ← 返回首页
        </button>
      </div>
    </FullScreen>
  );
}

// ─── Panel ─────────────────────────────────────────────────────────

function AdminPanel({ session }: { session: Session }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "bug" | "suggestion" | "other">("all");
  const [query, setQuery] = useState("");

  const email = session.user.email ?? "unknown";

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase!
        .from("unmuted_feedback")
        .select("id, created_at, type, message, language, admin_notes, admin_notes_by, admin_notes_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as FeedbackRow[]);
    } catch (e) {
      setError((e as Error).message || "Failed to load feedback");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase!.auth.signOut();
    navigate("/");
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${r.message} ${r.admin_notes ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, typeFilter, query]);

  const isAuthorized = !error && !loading;
  const looksLikeNotAdmin = !loading && rows.length === 0 && !error;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-sm font-black text-foreground">非默 · 管理面板</h1>
            <p className="text-[10px] text-muted-foreground">
              登录为 <span className="font-mono">{email}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRows}
              disabled={loading}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground/80 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              刷新
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground/80"
            >
              <LogOut className="h-3.5 w-3.5" />
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-3xl px-4 py-4">
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索反馈或备注..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "bug", "suggestion", "other"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                  typeFilter === t
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-foreground/70"
                }`}
              >
                {t === "all" ? "全部" : t === "bug" ? "问题" : t === "suggestion" ? "建议" : "其他"}
              </button>
            ))}
          </div>
        </div>

        {/* States */}
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-400">
            {error}
          </div>
        )}

        {looksLikeNotAdmin && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-400">
            <p className="font-bold">没有可见的反馈</p>
            <p className="mt-1 text-xs text-amber-400/80">
              可能是：（1）当前没有任何反馈；（2）这个账号不在管理员白名单里 — 白名单在 Supabase 的 unmuted_admins 表里。
            </p>
          </div>
        )}

        {isAuthorized && rows.length > 0 && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              共 {rows.length} 条反馈{filtered.length !== rows.length ? `（当前显示 ${filtered.length} 条）` : ""}
            </p>
            <ul className="flex flex-col gap-3">
              {filtered.map((row) => (
                <FeedbackCard
                  key={row.id}
                  row={row}
                  adminEmail={email}
                  onUpdated={(updated) =>
                    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
                  }
                />
              ))}
            </ul>
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">没有匹配的反馈。</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ─── Feedback card with editable admin notes ────────────────────────

function FeedbackCard({
  row,
  adminEmail,
  onUpdated,
}: {
  row: FeedbackRow;
  adminEmail: string;
  onUpdated: (r: FeedbackRow) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(row.admin_notes ?? "");
  const [byName, setByName] = useState(row.admin_notes_by ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeColor =
    row.type === "bug" ? "bg-rose-500/15 text-rose-400 border-rose-500/40" :
    row.type === "suggestion" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" :
    "bg-muted text-muted-foreground border-border";
  const typeLabel =
    row.type === "bug" ? "问题" : row.type === "suggestion" ? "建议" : "其他";

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase!
        .from("unmuted_feedback")
        .update({
          admin_notes: notes.trim() || null,
          // Shared login means session.user.email is the team account, not
          // the individual — so we let the editor tag their own name for
          // audit clarity. Falls back to the account email if left blank.
          admin_notes_by: byName.trim() || adminEmail,
          admin_notes_at: nowIso,
        })
        .eq("id", row.id)
        .select()
        .single();
      if (error) throw error;
      onUpdated(data as FeedbackRow);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${typeColor}`}>
          {typeLabel}
        </span>
        <time className="text-[10px] text-muted-foreground">
          {new Date(row.created_at).toLocaleString("zh-CN", { hour12: false })}
          {row.language ? ` · ${row.language.toUpperCase()}` : ""}
        </time>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
        {row.message}
      </p>

      {/* Admin notes area */}
      <div className="mt-3 rounded-xl border border-border/50 bg-secondary/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            管理员备注
          </p>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-[11px] font-semibold text-primary underline"
            >
              {row.admin_notes ? "编辑" : "添加"}
            </button>
          )}
        </div>

        {editing ? (
          <div className="mt-2 flex flex-col gap-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="内部记录 — 只有管理员可见（例：已跟进 / 已修复 / 需要讨论）"
              className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
            <input
              value={byName}
              onChange={(e) => setByName(e.target.value)}
              placeholder="你的名字（选填，例：Katie / Wendy）"
              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditing(false);
                  setNotes(row.admin_notes ?? "");
                  setByName(row.admin_notes_by ?? "");
                  setError(null);
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground/80"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                保存
              </button>
            </div>
          </div>
        ) : row.admin_notes ? (
          <>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-foreground/85">
              {row.admin_notes}
            </p>
            {row.admin_notes_by && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {row.admin_notes_by}
                {row.admin_notes_at ? ` · ${new Date(row.admin_notes_at).toLocaleString("zh-CN", { hour12: false })}` : ""}
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground/70">尚未添加备注</p>
        )}
      </div>
    </li>
  );
}

// ─── layout helper ─────────────────────────────────────────────────

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}
