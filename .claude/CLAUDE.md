# CLAUDE.md — The Unmuted (非默)

Always read this file and `docs/ai_context.md` before starting any work.

---

## Project Identity

**The Unmuted (非默)** is a bilingual (EN/ZH) safety app for survivors of domestic violence, built for mainland China compliance. Survivor privacy and safety are the primary design constraints — they take precedence over developer convenience.

Live demo: https://the-unmuted.vercel.app/

---

## Critical Rules

### 1. Never add server-side storage of personal data
Emergency contacts, passwords, and identity data live in device localStorage **by design**. Do not move them to Supabase or any server. The threat model includes servers being subpoenaed or breached by an adversarial actor.

### 2. All visible text must use `copyFor(language, english, chinese)`
Every user-facing string must be bilingual. Import `copyFor` from `@/lib/locale`. No hardcoded English-only strings in JSX.

```ts
import { copyFor, AppLanguage } from "@/lib/locale";
copyFor(language, "Save", "保存")
```

### 3. ChainMaker API key must not go to production as `VITE_` prefix
`VITE_CHAINMAKER_API_KEY` is currently a browser-visible env var. Any work that productionises ChainMaker must move the call to a Vercel Serverless Function with a server-side env var.

### 4. Evidence encryption is non-negotiable
Files uploaded to Arweave must always be encrypted with AES-256-GCM **before** any network call. The server must never see plaintext evidence.

### 5. Coordinate privacy
Do not add any feature that transmits precise GPS coordinates to any shared or public channel. If a broadcast-style feature is ever proposed, coordinates must be rounded to ~0.1° (≈11km grid). Precise GPS is only allowed in the SOS SMS to the user's own emergency contacts and in client-side-sealed evidence metadata.

### 6. No wallet features
All crypto-wallet functionality was deliberately removed in v2.0. Do not re-introduce Phantom, MetaMask, Solana, Ethereum wallet connections, or any token/NFT features.

---

## Development Workflow

### Setup
```bash
npm install
npm run dev   # or: bun dev
```

### Build
```bash
npm run build
npm run preview
```

### Test
```bash
npm test        # vitest unit tests
```

### Deploy (CI handles automatically)
- Push to `main` → GitHub Actions → CloudBase COS
- Vercel deploys from GitHub on every push

---

## Environment Variables

Create `.env.local` for local development:

```bash
VITE_PRIVY_APP_ID=          # optional — enables real Privy email OTP
VITE_SUPABASE_URL=https://iisjendxxmxpgwohckiq.supabase.co
VITE_SUPABASE_ANON_KEY=     # get from Supabase dashboard
VITE_CHAINMAKER_API_KEY=    # optional — leave blank for simulation
```

Without `VITE_CHAINMAKER_API_KEY`, evidence anchoring runs in deterministic simulation mode.

---

## Key File Map

| What you want to change | File |
|------------------------|------|
| Page layout, auth flow | `src/pages/Index.tsx` |
| SOS page (button + contacts + SMS template) | `src/components/SOSPage.tsx` |
| Physical SOS button + SMS | `src/components/SOSButton.tsx` |
| Evidence upload + history | `src/components/EvidencePage.tsx` |
| Mental health resources | `src/components/PsychPage.tsx` |
| Legal aid resources | `src/components/LegalPage.tsx` |
| NGO directory + post-SOS sheet | `src/components/NGOPage.tsx` |
| Bottom navigation tabs | `src/components/BottomNav.tsx` |
| EN/ZH copy utility | `src/lib/locale.tsx` |
| Evidence encryption | `src/lib/evidenceCrypto.ts` |
| ChainMaker anchoring | `src/lib/chainmakerService.ts` |
| Auth (bcrypt + ZKP identity) | `src/lib/userCredentials.ts`, `src/lib/zkpIdentity.ts` |
| Privy OTP (optional) | `src/lib/privyAuth.tsx` |

---

## Architecture Summary

- SPA: React 18 + TypeScript + Vite
- Styling: Tailwind CSS + shadcn/ui (Radix UI)
- Provider tree: QueryClient → PrivyAuth → Locale → Tooltip → BrowserRouter
- 4 main tabs: Help (SOS button) / Evidence / Mental Health / Legal Aid
- Auth: email → local bcrypt hash → ZKP commitment stored in localStorage
- Evidence pipeline: AES-256-GCM → Arweave demo → ChainMaker testnet (or sim)
- No P2P/chat: Gun.js chat removed 2026-07-09 (Phase 4b); no chat feature by product scope
- Dual deploy: Vercel (primary) + Tencent CloudBase (China mirror)

Full details: `docs/architecture.md`

---

## Session Workflow

Documentation is the long-term memory for this project. Chat history is ephemeral. Keep the docs current so every session starts from an accurate picture, not a rebuild from scratch.

### At the start of every session

1. **Read `CLAUDE.md`** (this file) — critical rules and project constraints.
2. **Read `docs/ai_context.md`** — current state, active goals, and open issues before writing any code.
3. Check `git log --oneline -10` and `docs/tasks.md` for recent changes and priorities.

### Triggered updates — do these immediately when the condition is met

| Condition | Update |
|-----------|--------|
| A feature is completed or removed | `docs/changelog.md` |
| A significant technical decision is made | `docs/decisions.md` |
| Module structure or data flow changes | `docs/architecture.md` |
| Task priorities shift, new work is added, or items are finished | `docs/tasks.md` |

### At the end of every session

Synchronise all docs before closing:

1. `docs/ai_context.md` — reflect current project state, any new issues discovered, goals completed or updated.
2. `docs/tasks.md` — mark completed items, add anything that surfaced during the session.
3. `docs/changelog.md` — log any shipped features, even small ones.
4. `docs/architecture.md` — update if structure changed.
5. `docs/decisions.md` — record any decision made about how or why something was built.

If a session ends without updating these files, the next session starts blind.

---

## Team

- Gu Shi: https://github.com/hesta1218-collab
- Wendy Wu: https://github.com/DancinWendy
- Liz Wu: https://github.com/touhouzigei-crypto
- Katie Lin: https://github.com/katielin0207-dev
