# AI Context — The Unmuted (非默)

_This file captures the current project state for AI assistants. Update before ending each work session._

_Last updated: 2026-08-04_

**2026-08-04 (D-035/D-036 + hash fix + SimulationPage test fix):** Four changes this session. (1) **Evidence vault password gates (D-035):** Records list now visible to any logged-in user without a password. Password required only when vault is locked and user triggers view/export/delete. Once unlocked, view+export proceed directly; delete shows a simple confirm. `listEvidencePartial()` added to `evidenceVaultService.ts`; `EvidenceRecord` gets `metaDecrypted?: boolean`; `useEvidenceVault.refreshHistory()` picks partial vs full based on session master key; `CloudVaultHistory` calls `onUnlocked` callback to refresh after first unlock. (2) **Email+password login (D-036):** Registration now: email → set account password+confirm → Supabase `signUp` → email OTP (one-time) → vault password → recovery code → app. Login: email + account password → `signInWithPassword` → app. "Forgot password" falls back to OTP magic link. New functions in `authService.ts`: `signUpWithPassword`, `verifySignupCode`, `resendSignupCode`, `signInWithPassword`. `LoginFlow.tsx` fully redesigned with new stages + `CredentialGuide` (三个密码说明 modal linked from login page). (3) **Court package SHA-256 verification fix:** `buildPackageHtml` now includes drag-to-terminal tip + `cd` navigation steps (macOS) and "type cmd in address bar" (Windows), fixing "file not found" errors on first run. (4) **SimulationPage test fix:** Added visible `<h2>复盘</h2>` heading before debrief cards — fixes `/复盘/` test assertion + improves UX. All auth + simulation + evidenceExport tests pass (72/72 excluding 2 pre-existing Argon2id timeout tests).

**2026-08-03 (D-033/D-034 + dead code):** Four changes this session. (1) **Login simplified (D-033)**: after OTP, returning users go directly into the app — no password step. Password only required when opening evidence vault. Removed `unlock`/`recovery-unlock` stages, `handleUnlock`, `handleRecoveryUnlock`, `RecoveryUnlockStep`, `otpLogin`/`cameViaOtp` states, `unlockWithPassword`/`unlockWithRecoveryCode` imports from LoginFlow (~220 lines deleted). First-time registration still sets a password. (2) **Internal beta gate (D-034)**: `VITE_BETA_CODE=V3IOG0G7` env var enables a fullscreen access-code screen in `Index.tsx` (BetaGate component). Set in Vercel env vars and CloudBase CI / GitHub Secret. (3) **Vercel migrated to Katie's account**: new project `the-unmuted-one.vercel.app` under `katielin0207-devs-projects`, connected to `The-Unmuted-v2`, auto-deploys on push. Old `the-unmuted.vercel.app` redirects via inline script in `index.html`. (4) **Phantom wallet dead code removed**: `generateWalletCommitment`, wallet/phantom type variants, `walletAddress?`, `generateFromWallet` hook, SettingsWidget "or wallet" text (~55 lines). **Simulation debrief now shows all bad rules** split into triggered (❌) and avoided (⚠️). `aidDirectory.json` curly-quote JSON parse bug fixed.

**2026-07-31 (D-032 模拟 UX improvements):** Three Katie requests: (1) Scenario titles changed to direct "TA被X了该怎么做" framing (家暴/性骚扰/性侵) — picker section header updated to "选择情景". (2) After every debrief, two new sections added: **真实流程** (7 numbered steps per scenario in plain language) and **名词解释** (collapsible glossary of 4–6 legal terms per scenario with plain-language notes — 人身安全保护令, 家庭暴力告诫书, 伤情鉴定, 受案回执, 不予立案, 复议, 立案监督, 附带民事诉讼, 私了谅解书, 治安追诉时效, 用人单位义务). (3) SimScenario interface extended with `realFlow: SimText[]` + `glossary?: SimGlossaryTerm[]`; `validateScenario` covers new fields. README updated: login table, 模拟 as Feature 5, aid-tab merge note, tech-stack row for simulator. 72/72 tests, tsc/build clean, pushed both remotes.

**2026-07-30 (git history purge of competitor name):** Katie explicitly requested deleting The-Unmuted-demo and purging the competitor name from GitHub history. Full rewrite done: `git filter-repo --replace-text/--replace-message` on a mirror clone replaced all historical blobs + two commit messages across both repos; force-pushed to The-Unmuted-v2 `main` and The-Unmuted-demo `main`+`feature/feedback-login`. Working tree was already clean. **All commit hashes are now different from pre-rewrite** (old SHA references in external notes are stale; teammates must re-clone). Demo repo deletion requested but blocked — Katie's account is an org member (admin: false); an org owner must delete it via Settings → Danger Zone. GitHub may retain dangling commits by direct SHA until GC (support request can accelerate).

**2026-07-30 (D-031 login choice + name scrub + direct title):** Three Katie requests same day: (1) 性侵 scenario title → 「我被性侵后」/"After I Was Sexually Assaulted" (direct, not euphemistic — her explicit preference). (2) All competitor-mini-program-name references scrubbed from docs + code comments (design doc, decisions, ai_context, tasks, changelog, simulation.ts); zero grep hits remained in working tree (history rewrite done in a follow-up — see entry above). (3) **D-031 login choice**: unlock screen offers 密码 OR "改用邮箱验证码登录"; right after OTP a "先直接进入（打开存证时再输密码）" button skips the password. Code entry = app opens with vault sealed; EvidencePage shows a one-time password gate (`vaultGateLocked` in EvidencePage.tsx). Crypto boundary explained to users in one line both places: code signs you in, only the password decrypts evidence. No device-resident key / no server escrow (would break zero-knowledge promise + D-029 threat model). Implementation: LoginFlow `onUnlocked(email, {vaultLocked})` + otpLogin/cameViaOtp states; Index.tsx unchanged. 72/72 tests, tsc/lint/build/headless smoke clean, pushed both remotes. Katie to phone-test both entry paths.

**2026-07-30 (D-030 模拟二期+三期 shipped):** Katie said "可以先继续开发第二期和第三期" — both built same day. `sexual-harassment.json` (12 scenes / 7 endings / 13 debrief rules): 三条并行路径 (治安报警 / 书面投诉单位 / 民事诉讼), 6个月治安时效 as the core lesson, HR 施压 + 非正式投诉陷阱 + 联合受害者民事诉讼; 依据 民法典 §1010, 治安管理处罚法 §22/42/44, 劳动合同法 §38. `sexual-assault.json` (12 scenes / 7 endings / 15 debrief rules): strictest red line — aftermath only, assault never rendered; 黄金72小时, 纸袋封存衣物, 医院取证≠必须报案, 监控15-30天, 受案回执, 不予立案→7日复议+检察院立案监督, 公诉/附带民事/不公开审理, 私了谅解书陷阱; non-failure "先寻求心理支持" ending; all debrief language non-blaming (delayed disclosure = trauma response). Picker placeholders removed, all three scenarios live with the 待法律校对 badge. 72/72 vitest (structural validation auto-covers all trees + new spot checks), tsc/build/headless smoke clean. Next: Katie phone-tests all three; lawyer review of all scenario JSON before badge removal.

**2026-07-30 (D-030 模拟一期 shipped):** Katie confirmed all 4 decisions (script-dialogue route — no AI/no free text; 家暴 first; lawyer review later — she will talk to lawyers and revise; 援助 tab merge). Phase 1 built the same day: `AidPage` (segmented 心理/法律, PsychPage/LegalPage reused unchanged), bottom nav now 求助/存证/援助/模拟, `src/lib/simulation.ts` (typed bilingual scenario schema + structural validation), `src/data/simulations/domestic-violence.json` (11 scenes, 5 endings, 14 debrief rules; 反家暴法 §15/16/23-32, 最高法2022, 民法典 §1091), `SimulationPage.tsx` chat player (coach hints, instant feedback, red/green debrief with 依据, persistent 真实求助 exit 110/12338/12348, zero persistence of choices, "模拟版本 · 待法律校对" badge — do not remove until lawyer review). 62/62 vitest incl. full play-through interaction test; tsc/build/headless boot clean. Next: Katie live-tests on phone; lawyer review; Phase 2 性骚扰.

**2026-07-30 (模拟功能调研):** Katie requested a new "模拟" feature — a China report-process simulator (branching choices → consequences → end-of-run debrief of which step went wrong), plus merging 心理+法律 into one 援助 tab to free a nav slot. Research + design delivered in `docs/模拟功能-调研与设计方案.md`: criminal main line with exact statutory deadlines (受案回执, 立案审查 3/7/30日, 不立案7日复议→检察监督), 家暴 three parallel tracks (报警/告诫书§16, 保护令 72h/24h + "较大可能性" standard per 2022 最高法规定, 离婚诉讼§1091), 性侵 (公诉 + 黄金72小时), 性骚扰 three paths (§1010 民事 / 治安6个月时效 / 职场). Mechanic: JSON scenario trees (`src/data/simulations/`) with flags → generated 复盘, aidDirectory content-code-separation pattern so legal reviewers edit JSON only. Red lines: no violence detail rendering, real-help exit every scene, disclaimer, never blame the victim, legal review before launch. Phasing: 家暴 first. **Awaiting Katie:** phasing + 援助-tab-merge confirmation, legal reviewer.

**2026-07-30 (D-029):** External security review (Codex, 2026-07-27) received and answered — validates encryption core; gap map: TSA (needs entity), supply/release chain, wallet-dep bloat, ChainMaker key, no auto-lock, no record tamper-evidence. Katie approved the 3 entity-free items 2026-07-29; all done: (1) auto-lock — `useAutoLock` re-locks after 10 min idle / ≥3 min backgrounded, key cleared, bilingual notice, 5 fake-timer tests; (2) wallet-era purge — privyAuth/useWallet/useSolanaWallet/WalletConnect/magicBlock/solanaReputation deleted, @privy-io/react-auth + @solana/web3.js + ethers + magicblock + buffer uninstalled, bundle 3.29→1.35 MB, headless-Chrome smoke test zero errors (login path intact — usePrivyAuth had no consumers); (3) CSP + security headers in vercel.json (Vercel only; CloudBase can't — revisit at D-016), verified locally with headers applied: zero violations. Stale "Web3 匿名举报" meta description fixed. D-028 pushed to both remotes (Katie will phone-test the 离开 button). QQ-mailbox SMTP **shelved by Katie** (not professional enough — wait for own domain + Tencent SES post-entity). New backlog: record tamper-evidence interim (local index fingerprint), reproducible builds. **Commit not yet pushed — awaiting Katie.**

**2026-07-22:** D-027 pushed & deployed (Katie's phone verification of unlock/migration still pending). D-028 quick-exit + safe-use tips implemented, committed, awaiting push. GitHub repos still public — blocked: Katie's account is org *member*, not admin; an org owner (likely the teammate who created The-unmuted org) must promote her or flip visibility themselves. WeChat mini-program evaluated: gated on entity + ICP + D-016; privacy concern (WeChat usage traces) noted — if ever done, entry-point only, core stays in the web app. Entity decision: register right after the UN hackathon, prep (name/legal-rep/budget) beforehand.

**2026-07-20 session:** D-026 aid directory + seed list pushed & deployed. D-027 committed locally (Argon2id KDF upgrade with verify-then-replace migration + password strength policy; 43/43 tests) — NOT yet pushed, awaiting Katie. New team doc: `docs/非默-功能与安全说明-团队版.md`. GitHub repos → private pending Katie's `gh auth login`. Security self-assessment given to Katie: 70/100 overall; top gaps = browser-history traces, no external audit, web-delivery model.

---

## What This Project Is

A bilingual (EN/ZH) mobile-first safety app for survivors of gender-based harm — domestic violence, sexual assault, stalking/harassment and other侵害 (D-021: never frame copy as DV-only) — built for mainland China compliance. Primary concern is survivor safety and privacy — personal data (emergency contacts) stays on-device; evidence is encrypted client-side so the server only ever sees ciphertext.

Core mission (all evidence work is judged against this): 帮助用户加密存储私密信息，并在未来有需要的时候能够作为有效证据进行举证。

Live: https://the-unmuted-one.vercel.app/ (access code: V3IOG0G7 — internal only until ICP filing)
Old Vercel URL (the-unmuted.vercel.app) redirects to the above.

---

## Current State

**Active branch:** `main` (Phase 1-4 all committed & deployed; 2026-07-10 UX batch deployed and verified live on both platforms: real-2s SOS hold, in-app 修改密码, DonationWidget + display-name removed; 2026-07-11: ‼️ SOS entry on the unlock screen, D-024; 2026-07-17: per-action password re-verification in the Cloud Vault, D-025 — 解锁查看/导出举证包/删除 each ask for the password again, **awaiting Katie's phone verification**; 2026-07-19: aid directory skeleton, D-026 — city-filterable psych/legal directory in `aidDirectory.json`, weekly source-monitoring CI, **awaiting Katie's phone verification**. Next: fill 8 missing sourceUrls, China seed data, global country hotlines before UN hackathon — see tasks.md)
**Status:** **Phase 4 is complete** (4a/4b: honest copy + chat removal; 4c: D-022 delete cooling-off; 4d 2026-07-10: persistent inline unlock errors at all five password gates, vault-unavailable vs wrong-secret distinction in `UnlockResult`, whitespace-trim retry on unlock + trim at password creation — fixes the 2026-07-09 pasted-space lockout; FeedbackWidget reviewed and deliberately unchanged). Phases 1–3 browser-verified on a clean production build: OTP login (6-digit) → cloud key-vault password unlock → capture → encrypt → private-bucket save (现场取证 badge) → password re-verify → decrypt/export with exact SHA-256 match; 导出举证包 (D-020) verified end to end. Test suite: 23/23 vitest, tsc + eslint clean.

**Deployments (both access-code protected — internal only until ICP filing):**
- Vercel (overseas, Katie's account): https://the-unmuted-one.vercel.app/ — auto-deploys from The-Unmuted-v2 on push to main. Access code `V3IOG0G7` via `VITE_BETA_CODE` env var.
- Tencent CloudBase (mainland China): https://theunmuted-v2-d2gyh0rux2a05de92-1434116173.tcloudbaseapp.com — access code injected via CI `VITE_BETA_CODE` GitHub Secret.
- Old Vercel URL (the-unmuted.vercel.app, Wendy's account) — redirects to the-unmuted-one.vercel.app via inline script; pending Wendy's next auto-deploy.

**Repo topology:** two GitHub repos, unified 2026-07-02 onto one `main` lineage.
- `origin` = The-unmuted/The-Unmuted-demo (no CI secrets)
- `v2` = The-unmuted/The-Unmuted-v2 (has TENCENT_SECRET_ID/KEY + VITE_* secrets → CloudBase deploys run here)
- Push `main` to **both** remotes to keep them in sync; only the v2 push triggers a working CloudBase deploy.
- 2026-07-10 CI hardening: deploy script uses COS multipart upload (`cos.uploadFile`, 1MB slices — single-shot `putObject` stalled on the 2.6MB bundle); workflow has a repo guard (`if: github.repository == 'The-unmuted/The-Unmuted-v2'`) so the demo mirror no longer emails guaranteed failures.

**What works now (verified 2026-07-07: tsc clean, eslint 0 errors, 14/14 vitest passing; login → evidence hub → capture view browser-verified via local fallback):**
- Login flow renders and handles errors correctly (full OTP path untestable until Supabase restored)
- SOS flow (2s hold since 2026-07-10, previously 5s → group SMS with GCJ-02 Gaode link) — user-validated, do not touch; the post-hold "确认发送" prompt is OS-level (sms: URI) and cannot be removed by the app
- Evidence pipeline: encrypt → private bucket + encrypted cloud index → in-app decrypt/export, with offline pending queue
- Capture view: 拍照/录像/录音 + 导入已有文件 entry, capture-instant metadata (time / GCJ-02 location / device) sealed into meta, 现场取证/事后导入 badges (D-019)
- Legacy evidence records readable (read-only, need user's old key file)
- NGO directory (Supabase or hardcoded fallback)
- Fixed 2026-07-07: `useEvidenceVault` TDZ crash that broke EvidencePage on mount (Phase-1 regression, caught in browser)
- 举证 court export (2026-07-08, D-020): `src/lib/evidenceExport.ts` + 导出举证包 button on each cloud record — plain ZIP with decrypted original + bilingual verification/guidance HTML; verifiable with certutil/shasum, no app dependency

---

## Supabase state (unblocked 2026-07-08)

Restored from pause; migration `0001_key_vault_and_evidence.sql` applied; Magic Link template uses `{{ .Token }}`; Email OTP length set to 6. Full E2E passed 2026-07-08.

Remaining before real users:
1. **Custom SMTP** — built-in SMTP is rate-limited (~4 emails/hour).
2. **`portraits` bucket is public** — origin identified 2026-07-10: leftover from Katie's discontinued "Chroma" project (real ID-style photos, publicly readable; zero references in this codebase). Katie is deleting it in the dashboard.
3. **Shared Supabase project** — resolved by decision 2026-07-19 (Katie): Chroma is discontinued, 非默 keeps this project; remaining work is dashboard cleanup of Chroma leftovers (old tables/buckets/policies incl. empty `portraits` bucket).

---

## Auth & Evidence Architecture (D-017 / D-018 / D-035 / D-036 — read docs/decisions.md before changing)

Three credentials:
- **Account password** = email+password, sent to Supabase over HTTPS. Server-enforced. Registration flow: email → set password+confirm → Supabase `signUp` → email OTP verification (one-time only) → vault setup. Login: email + account password → `signInWithPassword`. Forgot: OTP magic-link fallback.
- **Vault password** = user-chosen, Argon2id KEK derivation, **never sent to any server**. Required for view/export/delete when vault is locked; session-skipped once unlocked. Losing password + recovery code = permanent data loss (by design).
- **Paper recovery code** = 12-char system-generated, shown once at first vault setup, user writes on paper.

Evidence visibility:
- Records list visible to any logged-in user without password (partial metadata; full metadata decrypted on first vault unlock per session).
- View / export / delete each require vault password if vault is currently locked.
- Auto-lock: 10 min idle or 3 min background → master key cleared.

Key files: `src/lib/keyVault.ts` (pure crypto), `src/lib/keyVaultService.ts` (Supabase-backed vault ops + session master key), `src/lib/authService.ts` (email+password auth + OTP fallback), `src/lib/evidenceVaultService.ts` (storage + index + `listEvidencePartial`), `src/hooks/useEvidenceVault.ts` (UI pipeline), `src/components/LoginFlow.tsx`, `src/components/EvidencePage.tsx`.

---

## Known Issues

### Security / Production Gaps
1. **ChainMaker API key exposed in browser** — `VITE_CHAINMAKER_API_KEY` still browser-bundled. Legacy path only now; retire or proxy before production (Phase 4).
2. ~~Gun.js chat is not E2E~~ — resolved 2026-07-09 (Phase 4b): all P2P chat / support-network / 预警地图 code deleted, `gun` dependency removed. SOSPage now contains only the validated SOS button + contacts + message template.

### Technical
4. ~~`MapPage.tsx` orphaned~~ — deleted 2026-07-09 (Phase 4b) along with useGeoAlert; `geoAlert.ts` lib kept (SOSButton imports it).
5. **`programs/the_unmuted_program/`** — Solana dead code from v1.0.
6. **Test coverage thin** — 23 unit tests (keyVault, captureMetadata grading, evidenceExport); no tests for evidenceVaultService, locale, or E2E (Playwright configured, no test files).
7. **SOS broadcast not wired to `useOfflineBuffer`** — evidence upload queue is done; SOS path still isn't.

### UX
8. **SMS SOS on desktop** — degraded experience (opens default mail/message client).
9. ~~Login flow error messaging + feedback widget polish~~ — done 2026-07-10 (Phase 4d): persistent inline errors, vault-unavailable vs wrong-secret, whitespace trim; FeedbackWidget reviewed, unchanged.

---

## Active Goals (as of 2026-07-06)

1. ~~Phase 1: accounts + key hierarchy + secure storage~~ ✅ E2E accepted 2026-07-08
2. ~~Phase 2 — 取证~~ ✅ E2E accepted 2026-07-08 (capture metadata + D-019 grading)
3. ~~Phase 3 — 举证~~ ✅ complete 2026-07-08 (D-020: one-tap court package, browser-verified hash round-trip)
4. ~~Phase 4 — honest cleanup~~ ✅ complete 2026-07-10 (4a copy, 4b chat removal, 4c D-022 cooling-off, 4d login error messaging)
5. Gated on company entity: TSA anchoring (+ backfill), Tencent Cloud migration (D-016), phone OTP (D-012) ← **next frontier** (plus pre-launch: custom SMTP, dedicated Supabase project)

---

## Environment Variables Required

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | **Yes (production track)** | Auth OTP, key vault, evidence storage + index, NGO directory, feedback. |
| `VITE_SUPABASE_ANON_KEY` | **Yes (production track)** | Required with Supabase URL. |
| `VITE_PRIVY_APP_ID` | No | Legacy optional Privy OTP. Superseded by Supabase auth. |
| `VITE_CHAINMAKER_API_KEY` | No | Legacy path only. Without it, deterministic simulation runs. |
| `VITE_CHAINMAKER_ENDPOINT` | No | Custom ChainMaker BaaS endpoint. |
| `VITE_BETA_CODE` | No (local dev) | Internal access gate. Set to `V3IOG0G7` on Vercel + CloudBase until ICP filing. Unset locally — no gate in dev. |
| `TENCENT_SECRET_ID` / `KEY` | CI only | CloudBase deployment (v2 repo GitHub Secrets only). |

---

## Key Architectural Constraints

- **No server-side personal data** — emergency contacts, passwords stay on-device. The evidence cloud vault stores **ciphertext only**; this complies with the rule's intent (server subpoena/breach reveals nothing).
- **Password never leaves the device** — it derives the KEK; only wrapped keys go to the cloud.
- **China-first deployment** — CloudBase mirror required; Gaode maps; `curl --noproxy '*'` needed on the dev machine for China endpoints.
- **No wallet features, no chat feature, max 2 emergency contacts.**
- **Plain-language copy** — 保险柜/钥匙, never 哈希/密钥/助记词 in user-facing text; all copy via `copyFor()`.
- **Never overclaim security** (Aspire News lesson) — new-pipeline copy says hashes are locally fixed, timestamp service 接入中.
- **Recovery code shown exactly once** — never stored anywhere except the user's paper.

---

## Files to Read Before Major Changes

| File | Why |
|------|-----|
| `src/pages/Index.tsx` | Unlock gating + tab routing; changes affect the whole app |
| `src/lib/keyVault.ts` / `keyVaultService.ts` | D-017 key hierarchy — do not change without reading D-017 附录 Q1–Q9 |
| `src/lib/evidenceVaultService.ts` | Storage, index, pending queue, integrity check |
| `src/hooks/useEvidenceVault.ts` | Evidence UI pipeline |
| `src/components/LoginFlow.tsx` | OTP + password/recovery-code unlock UX |
| `src/components/SOSPage.tsx` | SOS flow — user-validated, don't touch location logic |
| `src/lib/locale.tsx` | All new copy needs `copyFor()` |
| `docs/decisions.md` | D-012–D-018: why things are built this way |

---

## Unresolved Problems

- **Timestamp anchoring** — no trusted timestamp until company entity exists (TSA API needs one). Schema keeps original hash + dual timestamps so old records can be retroactively anchored (补锚定).
- **Production SMS delivery** — `sms:` URI unreliable on some Android; server-side SMS API gated on entity + SMS signature filing.
- **NGO admin approval workflow** — `ngo_applications` has no admin UI.
- **Supabase → Tencent migration path (D-016)** — planned at launch; service layer kept thin to ease the swap.
