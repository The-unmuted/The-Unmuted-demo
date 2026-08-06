# Changelog — The Unmuted (非默)

## 2026-08-04 — Email+password login, evidence vault password-gate redesign, hash verification fix

### Changed
- **Login flow (D-036):** Replaced OTP-every-time with email+password auth. Registration: email → set account password + confirm → Supabase `signUp` → email OTP verification (one-time) → vault password → paper recovery code → app. Login: email + account password → `signInWithPassword` → app. "Forgot password?" falls back to one-time email OTP. Added `signUpWithPassword`, `verifySignupCode`, `resendSignupCode`, `signInWithPassword` to `authService.ts`. `LoginFlow.tsx` redesigned: new `EmailStep` (two buttons — Sign in / Register), `SetAccountPasswordStep`, `LoginPasswordStep`, `CodeStep` (dual-purpose: signup OTP or forgot-pwd OTP). `requestLoginCode` now uses `shouldCreateUser: false` (magic-link path only, not new-user creation).
- **Evidence vault password gates (D-035):** Records list is visible to all logged-in users without a password. Password required only when the vault is locked and user tries to view/export/delete a record. Once unlocked in a session, view and export proceed directly; delete shows a simple confirm (no re-entry). Vault stays locked on fresh login; first action of each session triggers the password prompt. `listEvidencePartial()` added to `evidenceVaultService.ts` — loads records with placeholder metadata and `metaDecrypted: false` flag; `useEvidenceVault` uses this when vault is locked and refreshes to full metadata after first unlock.
- **Vault password hint text:** now explicitly says "separate from your account password, never leaves your device" to avoid confusion with the new account password.
- **Three-credential explainer:** Added "三个密码各有什么用？" link on the login page (below SafetyTips) that opens a modal explaining account password, vault password, and paper recovery code.

### Fixed
- **Court package SHA-256 verification:** `buildPackageHtml` HTML now includes step-by-step `cd` navigation + drag-to-terminal tip (macOS) and "type cmd in address bar" (Windows), fixing "file not found" errors when running `shasum` without first navigating to the extracted directory.
- **SimulationPage debrief heading:** Added visible "复盘" `<h2>` heading before the good/bad card grid — fixes the `SimulationPage.test.tsx` `/复盘/` assertion and improves UX.

## 2026-08-03 — Login simplification, beta gate, Vercel migration, dead code removal

### Changed
- **Login flow (D-033):** OTP verification now goes directly into the app — the password unlock step after OTP is removed entirely. Password is only required when accessing the evidence vault (uploading, viewing, or exporting). First-time registration still sets a password and shows the recovery key. Removed the `unlock` and `recovery-unlock` login stages and all associated handlers (~220 lines deleted from `LoginFlow.tsx`). Auto-lock banner text updated.
- **Simulation debrief (D-032 cont.):** shows ALL bad rules split into "triggered this run" (❌ red) and "avoided this time" (⚠️ amber), so users learn every possible mistake regardless of path taken.

### Added
- **Internal beta gate (`VITE_BETA_CODE`):** when the env var is set, a fullscreen access-code screen blocks the app before React loads. Correct code stored in localStorage (one-time entry per browser). Transparent in local dev (no env var = no gate).
- **Hostname redirect:** `index.html` inline script redirects `the-unmuted.vercel.app` → `the-unmuted-one.vercel.app` before the page loads.

### Removed
- **Phantom wallet dead code:** `generateWalletCommitment`, `"wallet"` / `"phantom"` type variants, `walletAddress?` on `ZKPCommitment`, wallet branch in `categoryString`, phantom branch in `selfVerify`, `generateFromWallet` hook callback. SettingsWidget sign-out hint "or wallet" removed. (~55 lines across 3 files.)

### Fixed
- `aidDirectory.json`: entries 10–17 used curly-quote characters (U+201C/U+201D) as JSON structural delimiters — broke the Vite/Rollup build. Rewritten with clean ASCII quotes; Chinese bracket quotes `「」` used inside text values where needed.

### Infrastructure
- **New Vercel project** under Katie's account (`the-unmuted-one.vercel.app`) connected to `The-Unmuted-v2`, auto-deploys on push. All env vars set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BETA_CODE`). SSO protection disabled.
- **CloudBase CI** now injects `VITE_BETA_CODE` at build time; GitHub Secret added to `The-Unmuted-v2`.

## 2026-07-31 — 模拟 UX: real-flow steps, glossary, direct titles (D-032)

### Added
- **真实流程** section (7 numbered steps, plain language) shown after every simulation debrief — tells users the correct process regardless of which path they took.
- **名词解释** collapsible glossary after every debrief — plain-language notes for all legal jargon: 人身安全保护令, 家庭暴力告诫书, 伤情鉴定, 报警回执, 受案回执, 不予立案, 复议, 立案监督, 附带民事诉讼, 私了谅解书, 治安追诉时效（6个月）, 用人单位的法定义务.

### Changed
- All three scenario titles renamed to direct "TA被X了该怎么做" framing (家暴/性骚扰/性侵).
- Scenario picker section header: "我遭遇了…" → "选择情景".
- README updated: login-path table, Feature 5 (simulator), aid-tab merge, tech stack.

### Verified
- 72/72 vitest, tsc clean, production build OK.

## 2026-07-30 — Git history purge of competitor name (both repos)

### Changed
- Rewrote the full git history of both GitHub repos with `git filter-repo --replace-text/--replace-message` — every historical file blob and two commit messages that contained the competitor mini-program's name now say 同类产品 instead. Force-pushed to The-Unmuted-v2 (`main`) and The-Unmuted-demo (`main` + `feature/feedback-login`). **All commit hashes changed** (old hash references in docs/notes are stale); teammates must re-clone or `git fetch && git reset --hard origin/main`. GitHub may still serve old dangling commits by direct SHA URL until garbage collection — a GitHub Support request (or deleting the demo repo) removes those.
- Demo repo deletion requested by Katie but blocked: her account is an org **member** (admin: false) on that repo — only an org owner can delete it (Settings → Danger Zone).

## 2026-07-30 — Login choice: code or password + competitor-name scrub (D-031)

### Added
- **Sign-in choice (D-031)**: unlock screen now offers "改用邮箱验证码登录"; right after an OTP the user can "先直接进入（打开存证时再输密码）". Entering via code opens 求助/援助/模拟 immediately; the 存证 tab shows a one-time password gate (evidence is encrypted with the password — a code cannot decrypt it, by design). Both screens explain the boundary in one line.
- 性侵 scenario title made direct per Katie: 「我被性侵后」/ "After I Was Sexually Assaulted".

### Removed
- All references to the competitor mini-program name scrubbed from docs and code comments (design doc, decisions, ai_context, tasks, changelog, `simulation.ts`). (The name was later purged from git history too — see the entry above.)

### Verified
- tsc clean, 72/72 vitest, eslint clean on touched files, production build OK, headless-Chrome boot smoke zero errors. Live OTP/password flows to be phone-tested by Katie.

## 2026-07-30 — 模拟 phases 2+3: 性骚扰 + 性侵 scenarios (D-030 cont.)

### Added
- **性骚扰 scenario** (`src/data/simulations/sexual-harassment.json`): 12 scenes, 7 endings, 13 debrief rules — teaches the 三条并行路径 (治安报警 / 书面投诉单位 / 民事诉讼) and the 6-month 治安时效 most victims don't know about; HR "别把事情闹大" pressure, informal-complaint trap, joint-victim civil suit. Per 民法典 §1010 ¶1/¶2, 治安管理处罚法 §22/42/44, 劳动合同法 §38. Draft pending lawyer review.
- **性侵 scenario** (`src/data/simulations/sexual-assault.json`): 12 scenes, 7 endings, 15 debrief rules — written under the strictest red line: **aftermath only, the assault itself is never rendered**. Teaches 黄金72小时, paper-bag clothing preservation, hospital exam ≠ mandatory reporting, CCTV 15–30 day retention, 受案回执, 不予立案 → 7日复议 + 检察院立案监督, 公诉/附带民事/不公开审理, the 私了谅解书 trap. Includes a non-failure "先寻求心理支持" ending; all debrief language is systematically non-blaming (delayed disclosure framed as trauma response, not fault). Per 刑法 §236/237/87, 刑事诉讼法 §101/110-113/188. Draft pending lawyer review.

### Changed
- Scenario picker now lists all three scenarios; "即将上线" placeholder cards removed.

### Verified
- tsc clean, 72/72 vitest (structural validation + cycle-free traversal auto-cover all three scenario trees; new routing/debrief spot checks for both scenarios), production build OK, headless-Chrome boot smoke zero errors.

## 2026-07-30 — 模拟 phase 1: scripted process simulator + merged 援助 tab (D-030)

### Added
- **模拟 tab** (`SimulationPage.tsx`): chat-style scripted simulator of the real report-to-resolution process — chat bubbles, coach hints, instant consequence feedback, ending + red/green debrief with plain-language legal basis. **No AI, no free-text input; choices are never saved or uploaded.** Persistent "我现在就需要真实帮助" exit (110 / 12338 / 12348 + aid directory) on every scene; "模拟版本 · 待法律校对" badge until lawyer review.
- **家暴 scenario** (`src/data/simulations/domestic-violence.json`): 11 scenes, 5 endings, 14 debrief rules — 案发夜 → 报警(笔录/回执/验伤/告诫书) → 保证书 → 保护令(误区纠正, 72h, "较大可能性"); per 反家暴法 §15/16/23-32, 最高法 2022 保护令规定, 民法典 §1091. Draft pending lawyer review.
- **Simulator framework** (`src/lib/simulation.ts`): typed bilingual scenario schema (scenes/choices/flags/auto-routes/endings/debrief), flag matcher, structural validation enforced by tests (all pointers resolve, all scenes/endings reachable, bilingual completeness, no cycles).

### Changed
- **Bottom nav is now 求助 / 存证 / 援助 / 模拟**: 心理 + 法律 merged into one 援助 tab (`AidPage.tsx`, segmented toggle; PsychPage/LegalPage reused unchanged inside).

### Verified
- tsc clean, 62/62 vitest (10 framework/scenario integrity tests + 4 SimulationPage interaction tests incl. a full play-through to the strong ending), production build OK, headless-Chrome boot smoke zero errors.

## 2026-07-30 — External-review round 1: auto-lock, wallet-dep purge, security headers (D-029)

### Added
- **Auto-lock** (`useAutoLock.ts`): unlocked vault re-locks after 10 min without interaction, or on returning from ≥3 min in the background — session master key cleared, bilingual notice on the lock screen, account session preserved (password only). SOS lock-screen entry unaffected.
- **CSP + security headers** (`vercel.json`): Content-Security-Policy (connect-src limited to Supabase + ChainMaker BaaS), X-Frame-Options DENY, Referrer-Policy no-referrer (external hotline links never see where the user came from), Permissions-Policy, HSTS, nosniff. Vercel only — CloudBase COS can't send custom headers (revisit at D-016).

### Removed
- **All wallet-era code and dependencies**: `privyAuth.tsx` (zero consumers — login is Supabase OTP), `useWallet.ts`, `useSolanaWallet.ts`, `WalletConnect.tsx`, `magicBlock.ts`, `solanaReputation.ts`, Buffer polyfill; uninstalled `@privy-io/react-auth`, `@solana/web3.js`, `ethers`, `@magicblock-labs/ephemeral-rollups-sdk`, `buffer`. **Bundle 3.29 MB → 1.35 MB** (gzip 446 kB).
- Stale "Web3 匿名举报" meta description in `index.html` → neutral brand line.

### Verified
- tsc clean, 48/48 vitest (5 new auto-lock fake-timer tests), eslint clean, production build OK. Headless-Chrome smoke tests: app boots with zero console errors after dep removal; with CSP headers applied, zero violations, fonts + Supabase connectivity confirmed, login screen renders (screenshot-checked).

## 2026-07-22 — Usage-trace protection: quick exit + safe-use tips (D-028)

### Added
- **Quick-exit button** ("离开/Exit", `QuickExit.tsx`) in the header on all screens including the login wall: one tap replaces the page with a neutral weather search via `location.replace` — Back cannot return to the app.
- **Safe-use tips sheet**: link under the login card + "安全使用提示" entry in Settings — private-browsing how-to (iOS Safari / Android Chrome), history clearing steps, safer-device advice. All copy bilingual.

### Verified
- tsc clean, 43/43 vitest, eslint clean, production build OK. UI not browser-tested locally — Katie to verify on her phone after deploy.

## 2026-07-20 — Argon2id KDF upgrade + enforced password strength (D-027)

### Changed
- **Key derivation upgraded to Argon2id** (`keyVault.ts`): new vaults wrap with Argon2id (64 MiB memory-hard, GPU-cracking resistant); `KeyBoxV2` format with `libsodium-wrappers-sumo` pinned exact. Legacy PBKDF2 v1 boxes still open; each box auto-migrates in the background on the next successful unlock with that secret, using **verify-then-replace** (`rewrapBoxVerified` proves the new box opens before persisting — a failed migration keeps the old box, user loses nothing).
- **Password strength enforced** at all three creation points (vault setup, recovery reset, settings change): ≥8 chars, no digits-only, no repeated single char, common-password blocklist — bilingual errors (`passwordPolicy.ts`).

### Verified
- tsc clean, 43/43 vitest (8 new: v2 roundtrip, legacy v1 compatibility, verify-then-replace, password policy), eslint clean on touched files, production build OK. **Not yet deployed — awaiting Katie's push go-ahead + phone verification of unlock speed.**

## 2026-07-19 — Aid resource directory: city search + automated source monitoring (D-026)

### Added
- **Structured aid directory** (`src/data/aidDirectory.json` + `src/lib/aidDirectory.ts`): 10 existing psych/legal entries migrated to a unified schema — situation tags (家暴/性侵/骚扰职场/婚姻家事/心理/综合维权, per D-021 scope), city, `sourceUrl` (official page publishing the number), `verifiedAt` (shown to users on every card; amber stale warning after 12 months).
- **City filter** on 心理援助 and 法律援助 (`AidResourceList.tsx`): manual chips (no GPS), only cities with entries are offered, national hotlines always shown.
- **Weekly source monitoring** (`scripts/verify-directory.mjs` + `verify-directory.yml` cron, Mondays 09:00 Beijing): dead source page or phone number missing from it = CI failure alert; missing `sourceUrl` or >6-month-old human verification = warning. Also runs on PRs touching the directory. First run already caught that the Shanghai center's number isn't on the sh.12348 homepage → its sourceUrl reset to null pending the exact page.
- **Directory integrity tests** (12 new vitest cases): unique ids, bilingual fields, valid tags, https-only urls, tel:-safe phones, verifiedAt format, filter semantics.

### Verified
- tsc clean, 35/35 tests, production build, verification script runs clean locally (0 failures / 8 missing-source warnings for the team). UI not yet browser-tested — Katie to check city chips on her phone.

## 2026-07-17 — Per-action password re-verification in the Cloud Vault (D-025)

### Changed (Katie's request after using 解锁查看 on her phone)
- **解锁查看 / 导出举证包 / 删除 now each require a fresh password entry** (`CloudVaultHistory` in `EvidencePage.tsx`): tapping any of the three opens an inline password prompt inside the record card; `unlockWithPassword` verifies before the action runs. Protects against a phone grabbed while the records list is already unlocked. Delete's old two-button confirm is replaced — the password entry itself is the confirmation (destructive-red 确定删除 button). D-022 preserved: deletion still looks final, no recovery hint. Same inline error copy as the page gate (密码错误 vs 保险柜打不开).

### Verified
- tsc clean, 23/23 tests, production build. Not yet browser-tested — Katie to verify on her phone: each of the three actions should ask for the password every time.

## 2026-07-11 — SOS entry on the unlock screen (D-024)

### Added
- **‼️ SOS entry on the login/unlock wall** (`UnlockSOSEntry.tsx`, mounted in `LoginFlow`): emergency help no longer waits behind OTP + vault password. A bare ‼️ icon (Katie's design call — no 紧急求救 text) sits bottom-right; tap → full-screen overlay with the standard hold-2s SOS button. Only rendered when this device has emergency contacts in localStorage, so a fresh/stranger's device still shows a plain login wall. No contact details pre-auth; `SOSButton` reused byte-identical (validated code untouched).

### Verified
- tsc, ESLint, 23/23 tests, production build. Browser E2E on preview: no contacts → no icon; contacts present → icon appears; tap → hold-button overlay; X closes; cleanup → icon gone again.

## 2026-07-10 — UX batch: 2s SOS hold, in-app password change, header/settings cleanup

### Changed (Katie's requests after production use)
- **SOS hold time 5s → real 2s** (`SOSButton.tsx`): HOLD_DURATION 2000ms, countdown from 2, copy 长按 2 秒发送短信求救. Trade-off accepted: shorter GPS pre-warm window (cold-fix fallback unchanged) and slightly higher accidental-trigger risk — in an emergency, seconds beat both. No in-app confirm was ever present after the hold; the remaining "确认" is the OS-level open-Messages prompt + manual send, which a web app cannot bypass.
- **修改密码 in Settings** (`SettingsWidget.tsx`): verifies the current password (`unlockWithPassword`, distinguished inline errors) then re-wraps via `changePassword`; paper recovery key explicitly stated to keep working. Cloud accounts only.

### Removed
- **DonationWidget** (header heart icon) — deleted at Katie's request.
- **Display-name setting** — remnant of the removed social/chat features; nobody else can see a name now. `getUsername`/`saveUsername`/`getLocalUsername` deleted from `userCredentials.ts` (no remaining callers).

## 2026-07-10 — Phase 4d: login/unlock inline error messaging + whitespace tolerance

### Changed
- **Persistent inline errors replace the easy-to-miss 密码错误 toast** at every password gate: LoginFlow unlock / recovery-code / local-login stages, EvidencePage records gate, and the hidden 最近删除 recovery gate. Error text renders in small destructive type between the input and the submit button, and stays until the next attempt or stage change.
- **Failure reasons distinguished (`keyVaultService.ts`)**: `unlockWithPassword` / `unlockWithRecoveryCode` now return `UnlockResult` with `reason: "vault-unavailable" | "wrong-secret"`. "vault-unavailable" = key boxes couldn't be loaded at all (fresh device offline / cloud row unreadable — the secret was never checked) → 「暂时打不开你的保险柜。请检查网络后再试。」; "wrong-secret" → 「密码错误，请再试一次。」 (recovery path: 「恢复钥匙不正确，请逐个字符对照纸上的内容。」).
- **Whitespace tolerance**: unlock retries with a trimmed password before failing, and new passwords are trimmed at creation (set-password + recovery re-wrap) — fixes the 2026-07-09 pasted-leading-space lockout incident.
- **FeedbackWidget reviewed, deliberately unchanged** — it already has inline errors, disabled-while-sending submit, and collects no user ID; nothing met the "needed AND wrong" bar.

### Verified
- tsc clean, ESLint 0 errors on the 3 changed files, 23/23 tests, production build OK. Browser E2E on the preview build: wrong password at the login gate and at the recovery gate both show the persistent inline error; correct-password paths through all three gates re-verified by the user.

### Housekeeping (Supabase, not code)
- **`portraits` public bucket mystery solved**: it's a leftover from Katie's discontinued "Chroma" project (real ID-style photos, publicly readable), which shares the same Supabase project as 非默. Zero references in this codebase → **files deleted by Katie 2026-07-10** (empty bucket still to be removed). New backlog item: consider moving 非默 to a dedicated Supabase project (shared trust boundary today).

### Fixed (CI)
- **CloudBase deploy: multipart upload for large assets** — the 2.6MB main bundle failed twice with COS "User network is too slow" (single-shot `putObject` over the GitHub→ap-shanghai link). `deploy-cloudbase.mjs` now uses `cos.uploadFile` with 1MB `SliceSize` so parts retry independently. Deploy of `3b8a7d6` succeeded; live site verified serving the new bundle. The fail-before-publishing-HTML safety worked as designed — the site never served a partial deploy.

## 2026-07-09 — Phase 4c: 72h delete cooling-off with hidden recovery (D-022)

### Added (anti-coercion design — deletion must LOOK final; see D-022)
- **Delete on cloud records**: small trash icon on each 云端保险柜 card → inline two-tap confirm（确定删除/取消, no browser dialog）→ record vanishes; the only feedback is a 「已删除。」 toast. No recovery/回收站/时限 wording anywhere on the delete path.
- **Soft delete**: `deleteEvidence` sets `evidence_records.deleted_at` (column existed since migration 0001), removes the local index entry + cached blob; pending (never-uploaded) records are removed outright.
- **Hidden recovery entry**: inconspicuous grey line 「找回误删的记录」 at the very bottom of the records list → `最近删除` view gated by a **fresh vault-password check** (`unlockWithPassword`) even in an unlocked session.
- **`最近删除` view**: deleted records with 「约 N 天/小时后彻底清除」 countdown + one-tap 恢复 (`restoreEvidence` nulls `deleted_at`); empty state explains ≥3-day purges are unrecoverable.
- **Client-triggered purge**: `purgeExpiredEvidence` (72h, `DELETE_RETENTION_MS`) runs on records-view open and before listing deleted records — removes the storage object then the row.

### Verified (browser E2E on production preview, 2026-07-09)
- Delete → only 「已删除。」, no recovery hints; DB `deleted_at` set, sibling record untouched → grey line → password gate enforced → deleted record listed with countdown → 恢复 → record back in list, `deleted_at` cleared. tsc + eslint clean, 23/23 tests, build OK.

## 2026-07-09 — Phase 4b: P2P chat (Gun.js) code fully removed

### Removed (user-confirmed scope; all files verified to have zero live importers before deletion)
- **`src/components/SOSPage.tsx` dead wizard/chat branches** — the unreachable 5-step anonymous help-request flow (help:type → location → support → matching → session with P2P chat). It was the retired "向附近陌生人求救" feature; no `go({view:"help:type"})` entry point existed anywhere. File went 841 → 260 lines. **HomeView / EmergencyContactsCard / SosMessageCard / SOSButton untouched** — the validated SOS + 定位 path is byte-identical.
- **`src/components/CommunityPage.tsx`**, **`src/hooks/useP2PChat.ts`** — orphaned P2P chat UI/hook.
- **`src/components/MapPage.tsx`**, **`src/hooks/useGeoAlert.ts`** — 预警地图 remnants (v1 feature, removed from nav long ago). `src/lib/geoAlert.ts` kept because SOSButton still imports its two harmless localStorage writes.
- **`src/lib/p2pChat.ts`**, **`src/lib/supportNetwork.ts`** — Gun.js chat + public-relay help-request broadcast (was never E2E encrypted; known issue #2).
- **`gun` npm dependency** uninstalled.

### Verified
- tsc clean, ESLint 0 errors, 23/23 tests, production build OK; zero remaining references to gun/p2pChat/supportNetwork/useGeoAlert/CommunityPage/MapPage/useP2PChat in src/. Browser regression of the SOS page on the preview build.

## 2026-07-08 — Scope-correct legal guidance + Phase 4a: honest copy cleanup

### Changed (user directive: 非默 serves survivors of 性侵害/骚扰跟踪/其他侵害, not only 家暴 — D-021)
- **举证说明.html scenarios restructured**: 报警与立案 is now scenario 1 and universal (adds sexual-assault-specific guidance: report promptly, forensic exam, don't wash self/clothing first); 人身安全保护令 now states it applies to family *and* intimate relationships (同居/恋爱), 不需要先起诉离婚也不限于婚姻关系; scenario 3 broadened to 诉讼维权（刑事、民事赔偿或离婚诉讼）. Lead-in sentence names all situations. Visually re-verified in browser.
- **LegalTipsDisclosure** first tip de-DV-framed: police receipts/dispatch records universal, sexual-assault forensic advice added, 告诫书 kept as the DV-specific extra.

### Phase 4a — simulated anchoring copy retired from UI
- **HowItWorksDisclosure** (capture view) rewritten honestly: 当场加密 / 云端保险柜（云端只见密文）/ 指纹与时间当场固定 + TSA 接入中 — replaces the false "Arweave 永久存储 + 长安链司法联盟链不可篡改" claims that were still showing on the *new* pipeline's capture page.
- Legacy record badge "已上链" → "测试链（旧版）" (it was ChainMaker testnet, not a judicial chain).
- DonationWidget no longer claims donations fund "区块链存证上链费用" — now 平台运营与维护.
- Deleted dead `SOSHistory` component (never rendered; claimed "✓ 已上链" with a snowtrace/Avalanche testnet link — crypto-era remnant) and its `formatTs` helper.

### Verified
- tsc clean, ESLint 0 errors, 23/23 tests; production build rebuilt.

### Added
- **Court package builder (`src/lib/evidenceExport.ts`, D-020)** — one tap on 导出举证包 produces a plain ZIP: the decrypted original under `证据文件/` plus a self-contained bilingual `举证说明.html` containing the full evidence table (file name/type/size, capture grade with plain-language explanation, capture/device/server times, GCJ-02 location, device info, record ID, both SHA-256 fingerprints), universal verification instructions (`certutil -hashfile` / `shasum -a 256` with the expected value), and per-scenario guidance for 人身安全保护令 / 离婚诉讼 / 报警与立案 with the 12348/12338 hotlines. Everything is verifiable with OS-built-in tools even if 非默 no longer exists — no proprietary formats.
- **导出举证包 button** on every cloud record card (`EvidencePage.tsx`), alongside 解锁查看; reuses the same fetch→verify→decrypt path, mutual disabling while either runs. Package named `举证包_YYYY-MM-DD_txID6.zip`.
- **fflate dependency** for standard ZIP creation in the browser (UTF-8 name flag set correctly).
- **9 new unit tests** (`evidenceExport.test.ts`, 23 total): content presence, grade-1 vs grade-2 rendering, scenario sections, honesty rules (contains 接入中, never 绝对安全/区块链), HTML escaping of user-controlled fields, full ZIP round-trip byte comparison, naming fallbacks.

### Verified
- tsc clean, ESLint 0 errors, 23/23 tests. Browser E2E on the production preview build: exported `举证包_2026-07-08_4i2KRd.zip`, extracted, and the extracted file's SHA-256 matches both the fingerprint stated inside the HTML and the record's sealed 原始文件指纹. Rendered HTML visually reviewed (table, verification section, scenario cards, hotlines, footer).
- Known caveat: macOS's ancient CLI `unzip` (Info-ZIP 6.0) can't handle UTF-8 names — Finder/`ditto` and Windows 10+ extract fine; the ZIP itself is standards-correct.

## 2026-07-08 — Phase 1+2 E2E acceptance passed (production build)

### Verified
- Full cloud-path E2E on a clean production build (`vite preview`, fresh origin, no local state): email OTP login (6-digit, after fixing the Supabase Email OTP Length setting 8→6) → password unlock via cloud `key_vaults` → in-app capture → encrypt → private-bucket save (已进保险柜✓, 现场取证 badge) → records view password re-verify → 解锁查看 fetch/verify/decrypt/export.
- Cryptographic round-trip confirmed: SHA-256 of the exported decrypted file exactly matches the record's sealed 原始文件指纹.
- Cross-device story confirmed: a fresh origin with no localStorage lists earlier records from the encrypted cloud index.

### Fixed (Supabase dashboard, not code)
- Project restored from free-tier pause; migration `0001_key_vault_and_evidence.sql` applied; Magic Link template set to `{{ .Token }}`; Email OTP length set to 6.

### Known follow-ups
- `portraits` bucket is public (origin unknown) — needs review/removal.
- Custom SMTP required before real users (built-in ~4 emails/hour).

## 2026-07-07 — Production track Phase 2: 取证 (in-app capture with graded records)

### Added
- **Capture-instant metadata (`src/lib/captureMetadata.ts`)** — device time, GCJ-02 location (pre-warmed when the capture view opens, same pattern as the SOS button), and device info are gathered at the capture moment and sealed into the record's encrypted metadata. Precise coordinates are allowed here because the cloud only ever sees ciphertext (unlike broadcast channels, which stay at ~0.1° rounding).
- **Honest capture grading (D-019)** — every record now carries 现场取证 (grade 1) or 事后导入 (grade 2): in-app audio recording is always grade 1; camera-input files are graded by their own timestamp (≤2 min old = live); a new explicit "导入已有的照片、录音或文件" entry is always grade 2 and gets no location. Badges shown on the receipt card and in the cloud vault history; capture time/location shown in expanded record details.
- **Unit tests** — 6 new tests for grading boundaries and location fallback (14 total).

### Changed
- **Hub card copy de-overclaimed** — "自动加密并写入区块链存证" → "拍照、录像或录音，当场加密，并记下时间和地点。" (Phase-4 honesty rule applied early to the card this work touched.)
- `wgs84ToGcj02` exported from `useEmergencyContacts.ts` (no logic change) for reuse by capture metadata; `GCJ_EE` literal trimmed to its exact representable double (identical value, fixes the one ESLint error).

### Fixed
- **EvidencePage crashed on mount** — `useEvidenceVault` referenced `refreshHistory` in the online-retry effect's dependency array before its declaration (TDZ ReferenceError). Introduced in Phase 1, caught by in-browser testing of Phase 2.

### Verified
- tsc clean, ESLint 0 errors, 14/14 tests. Login → evidence hub → capture view verified in Chrome via the local fallback (Supabase still paused); the cloud save path E2E remains gated on the Phase-1 blocker below.

## 2026-07-06 — Production track Phase 1: accounts + key hierarchy + cloud evidence vault (code complete, deployment blocked on Supabase restore)

### Added
- **Server-backed accounts (D-018)** — Supabase Auth email OTP (6-digit code) is now the account layer. `LoginFlow.tsx` replaces the old `SignupPage`; `authService.ts` wraps signInWithOtp/verifyOtp. Persistent sessions mean OTP is only needed on a new device.
- **D-017 key hierarchy live** — `keyVault.ts` + `keyVaultService.ts`: master key wrapped twice (password box + 12-char paper recovery code box, PBKDF2-SHA256 310k iterations), stored in `key_vaults` table. Per-file keys wrapped by the master key. Password is never sent to any server. Recovery code shown exactly once. 7 unit tests.
- **Production evidence pipeline** — `evidenceVaultService.ts` + rewritten `useEvidenceVault.ts`: encrypt on device → ciphertext to **private** `evidence-vault` bucket at `{userId}/{txId}` (RLS) → encrypted record index in `evidence_records` (wrapped file key + sealed metadata + dual hashes + capture grade + client/server timestamps). No more key-file downloads for the user.
- **In-app decrypt/export** — "解锁查看" on each cloud record: fetch (cache→cloud), verify ciphertext SHA-256, unwrap file key, decrypt, download original. Includes safety toast reminding the user to delete the file if the device is not safe.
- **Offline resilience** — IndexedDB ciphertext cache + localStorage pending queue (ciphertext only); auto-retry on the `online` event; per-record 已进保险柜 / 等待上传 badges; manual sync on vault unlock.
- **Soft delete** — `deleted_at` on `evidence_records` (72h cooling-off UI still to come, Phase 4).
- **SQL migration** — `supabase/migrations/0001_key_vault_and_evidence.sql`: `key_vaults`, `evidence_records`, private bucket + per-user RLS policies. **Written but not yet applied** (project paused).

### Changed
- **Every page load starts locked** — master key is memory-only; `Index.tsx` gates the app on unlock even when a Supabase session persists (D-017 intended behavior).
- **Records view privacy gate** — viewing history re-verifies the password via `unlockWithPassword` even when the master key is already in memory (phone-grabbed-while-unlocked protection).
- **Honest upload steps** — processing UI now shows 2 real steps (锁上文件 AES-256 加密 → 存入你的云端保险柜); fake ChainMaker "anchoring" step removed from the new pipeline.
- **Single shared Supabase client** — `userCredentials.ts`, `ngoService.ts`, `FeedbackWidget.tsx` now import from `supabaseClient.ts` (fixes "Multiple GoTrueClient instances" warning).
- **Legacy records read-only** — old localStorage/key-file records shown under 旧版记录（需要你当时保存的密钥文件）; nothing new is written to that path.

### Removed
- **`arweaveService.ts` deleted** — the old public-bucket upload path (public URL = anyone with the link could download ciphertext) is gone from code; the migration makes the bucket private server-side.
- **Per-file key bundle downloads** — replaced by the D-017 key hierarchy; `KeySaveSection` deleted from `EvidencePage.tsx`.

### Known blocker
- Supabase project `iisjendxxmxpgwohckiq` is **paused** (free-tier auto-pause, NXDOMAIN). Must be restored in the dashboard, then: apply the migration, set the OTP email template to `{{ .Token }}` (default sends a magic link), configure custom SMTP (built-in is ~4 emails/hour), then run the full E2E browser test.

## 2026-07-02 — China deployment live + repo unification
- **CloudBase China deployment is live**: https://theunmuted-v2-d2gyh0rux2a05de92-1434116173.tcloudbaseapp.com (mainland-reachable, free tier, no ICP needed for default domain)
- Unified the two diverged repos: `The-Unmuted-demo` (origin) and `The-Unmuted-v2` now share a single `main` lineage
  - Merged `feature/feedback-login` → `main` (brought v2.0 work + CloudBase CI to demo repo)
  - Merged `v2/main` → `main` (brought UI fixes, legal aid updates, hardened deploy workflow)
- Fixed CI: Node 24 for `npm ci` lockfile compatibility (npm 10 vs 11 optional-dep validation mismatch)
- Note: Tencent secrets (`TENCENT_SECRET_ID`/`KEY`) exist **only** in the v2 repo's GitHub Secrets — deploys must go through `The-Unmuted-v2`, or secrets must be added to demo repo

## Unreleased (on main, 2026-07-02)
- **SOS group SMS** — one long-press now opens SMS addressed to all emergency contacts at once (iOS `,` / Android `;` recipient separator); per-contact links kept as fallback for SMS apps that drop group recipients
- **Emergency contacts capped at 2** — user decision: more recipients = noise; add button hides at limit, group SMS never exceeds 2 even with legacy data
- **Legal evidence tips** — "哪些能作为证据？" collapsible in evidence capture view: police records/告诫书, injury photo guidance, chat record originals, audio/video tips, witness & 妇联 records (static bilingual copy, per DAIS/VictimsVoice competitive research)
- **Default language is now Chinese** — new users see 中文 first; saved language preference still respected; 中/EN toggle unchanged
- **Fix: black screen on LAN http:// access** — Privy embedded-wallet iframe crashed the app outside secure contexts; now falls back to local auth (D-013)

## Product scope decisions (2026-07-02, from market research review)
- Product is defined by the three-pillar promise: SOS to trusted contacts / encrypted evidence / psych+legal resource connection
- **P2P chat will NOT be a product feature** (not in the promise; Gun.js "E2E" claim was inaccurate)
- Evidence key backup/recovery deferred — evidence architecture (blockchain vs TSA vs self-hosted) still under discussion
- Features rejected for launch to keep maintenance low: continuous location tracking, GPS live-streaming, lock-screen trigger (impossible in web app), voice readout

---

## v2.0 (2024–2025)

### Added
- **ChainMaker (长安链) evidence anchoring** — REST API + deterministic simulation fallback
- **SMS SOS** — 5s hold triggers native `sms:` URI with bilingual message + GPS coordinates
- **Emergency contacts management** — add/remove contacts stored in localStorage
- **Editable SOS message template** — `{位置}` placeholder replaced with GPS coords at trigger
- **Anonymous help request flow** — 5-step wizard (type → location → support → matching → session)
- **P2P support chat** — Gun.js encrypted-style chat rooms, 2-hour TTL
- **NGO directory** — browse, filter by type/location; Supabase `ngo_applications`
- **NGO apply tab** — NGOs can submit directory listing applications
- **Post-SOS NGO suggestion sheet** — top 3 relevant organisations after "I'm Safe"
- **Evidence vault hub** — 3 sub-sections (upload, report notes, history)
- **Evidence as second bottom-nav tab** (promoted from buried flow)
- **Mental Health tab (心理援助)** — replaces old Map tab in nav
- **Legal Aid tab (法律援助)** — replaces old Community tab in nav
- **Supabase evidence storage** — vault records, feedback submissions
- **Password login** — bcrypt hash stored in localStorage, no server required
- **Settings widget** — logout + account info
- **Feedback widget** — submission via Supabase
- **Donation widget** — external donation links
- **Deterrent audio panel** — configurable voice deterrent for SOS
- **Gaode maps integration** — GCJ-02 coordinate conversion for accurate map pin
- **GPS pre-warming** — location acquired on button press start for accuracy at trigger
- **SOS location block** — enriched with accuracy, Gaode nav link, battery, network info
- **Silent mode** — SOS without audible alert
- **Dual deployment** — Vercel (primary) + Tencent CloudBase COS (China mirror)
- **GitHub Actions CI** — auto-deploy to CloudBase on push to `main`

### Changed
- Bottom nav tabs: Help / Evidence / Mental Health / Legal Aid (from Help / Map / Support / DAO)
- Auth: email OTP + wallet → email + local bcrypt password (no wallet required)
- Identity: Privy-only → local ZKP commitment scheme (Privy OTP optional)
- Evidence anchoring: Solana Memo → ChainMaker 长安链 testnet

### Removed
- **All cryptocurrency dependencies** — Phantom wallet, Solana, all blockchain wallet flows
- **DAO governance layer** — replaced by verified NGO directory
- **MagicBlock TEE** — removed with DAO
- **Solana program** (`programs/the_unmuted_program/`) — kept in repo but unused
- **Map tab from bottom nav** — Map/Community tabs removed from primary navigation
- **事后存证 card** from SOSPage home view
- **社区陪伴支持 card** from SOSPage home view

---

## v1.0 (2024)

### Added
- Initial bilingual React SPA
- Privy email OTP login
- Phantom wallet integration
- Solana Memo evidence anchoring (Devnet)
- DAO governance proposals + MagicBlock TEE
- Basic SOS button (3s hold → blockchain tx)
- Map with warning zones
- Support / Community tab
- NGO directory (static)
- P2P encrypted chat (Gun.js)
- Arweave evidence upload
- AES-256-GCM local file encryption
