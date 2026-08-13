# Technical Decisions — The Unmuted (非默)

## D-001 — Remove all crypto/blockchain wallet dependencies (v2.0)

**Decision:** Strip Phantom wallet, Solana, and all crypto-wallet flows.

**Reasoning:** Mainland China compliance. Crypto wallets are inaccessible or illegal for end users in China. Target users cannot be expected to have or use them. The original v1.0 design created a hard barrier to the primary audience.

**Result:** Email-only auth; no wallet prompt anywhere in the app.

---

## D-002 — ChainMaker (长安链) for evidence anchoring

**Decision:** Replace Solana Memo with ChainMaker testnet for on-chain evidence hashes.

**Reasoning:** ChainMaker is China's judicial alliance blockchain, court-admissible and government-endorsed. Evidence hashes anchored there have legal standing in Chinese courts. No certificate or browser extension required from the user — auth is server-side with API key.

**Trade-off:** ChainMaker BaaS REST API may have CORS restrictions when called directly from browser. Production path needs a Vercel Serverless Function proxy with server-side API key.

---

## D-003 — Deterministic simulation fallback for ChainMaker

**Decision:** When `VITE_CHAINMAKER_API_KEY` is not set, `anchorOnChain()` returns a deterministic simulated result instead of erroring.

**Reasoning:** Enables full demo flow without ChainMaker testnet credentials. Reviewers can test the complete evidence pipeline. `isSimulated: true` flag is preserved on the vault record so it's always auditable.

---

## D-004 — localStorage-only for sensitive user data

**Decision:** Emergency contacts, ZKP identity, password hash, vault records, and SOS message template are all stored in device localStorage only. No server upload.

**Reasoning:** Privacy first. Server-side storage of emergency contact phone numbers creates a surveillance risk for an adversarial actor (abusive partner, state). Phone numbers never leave the device.

**Trade-off:** Data is lost if the user clears browser storage or switches devices. Acceptable for the target use case — contacts can be re-entered.

---

## D-005 — Local bcrypt password instead of server-based auth

**Decision:** Password is hashed with bcryptjs and stored in localStorage. Privy email OTP is optional.

**Reasoning:** Removes dependency on an external auth service. Allows the app to function entirely offline or when Privy is unreachable. Lowers setup friction for survivors who need immediate access.

**Trade-off:** Password reset is impossible without email OTP. If both are lost, the user must create a new account.

---

## D-006 — Fuzzy location for help requests (~11km grid)

**Decision:** GPS coordinates in community help requests are rounded to ~0.1° (~11km) before broadcast.

**Reasoning:** Precise GPS coordinates sent over Gun.js would de-anonymise the requester's home address. 11km grid is enough to match nearby supporters without pinpointing the individual.

---

## D-007 — Gun.js for P2P chat (demo-grade)

**Decision:** Gun.js used for support chat room broadcast.

**Reasoning:** Gun.js is dependency-free, works without a dedicated server, and provides enough for a demo. Fast to implement with no infrastructure cost.

**Known limitation:** Gun.js is not true E2E encrypted — messages are broadcast across Gun's relay network. In production, a proper encrypted channel (e.g., Signal Protocol, Matrix) should replace this. The UI states "end-to-end encrypted" as a design intent, not a current technical fact.

---

## D-008 — Dual deployment (Vercel + Tencent CloudBase)

**Decision:** Deploy to both Vercel and Tencent CloudBase COS.

**Reasoning:** Vercel may be inaccessible from mainland China due to DNS/CDN blocks. Tencent CloudBase serves users behind the Great Firewall reliably. Vercel remains the primary international URL.

---

## D-009 — Inline bilingual copy instead of i18n library

**Decision:** All UI copy is inlined via `copyFor(language, english, chinese)` — no i18n library.

**Reasoning:** The app supports exactly two languages (EN/ZH). An i18n library adds bundle size and extraction complexity for no benefit at this scale. Co-located copy is easier to review and edit when iterating quickly.

---

## D-010 — AES-256-GCM encryption entirely in-browser

**Decision:** Evidence files are encrypted with Web Crypto API before any network call.

**Reasoning:** No plaintext evidence ever touches a network. Encrypted blob is uploaded to Arweave; hash is anchored on ChainMaker. The user holds the only decryption key (downloaded JSON bundle).

**Trade-off:** Key loss = permanent evidence loss. This is intentional — the app cannot be compelled to produce evidence it cannot decrypt.

---

## D-011 — ZKP identity as pseudo-anonymity (not true ZKP)

**Decision:** `zkpIdentity.ts` uses SHA-256 hashing to create a commitment + nullifier, not a true zero-knowledge proof circuit.

**Reasoning:** A true ZKP circuit (e.g., Groth16) would require a circuit compiler and trusted setup, overkill for the current stage. The current scheme provides pseudonymity (email is never transmitted) while being fast and dependency-free.

**Upgrade path:** Replace with a proper ZKP library (e.g., snarkjs) if Sybil resistance or verifiable credentials become a requirement.

---

## D-012 — Two-stage login strategy: email now, phone OTP at formal mainland launch (2026-07-03)

**Decision:** Soft launch (web, hackathon, early users) ships with email + local bcrypt password (+ Privy email OTP over HTTPS). Phone-number SMS login is deferred to the formal mainland launch track.

**Reasoning:**
- SMS verification codes in mainland China require an enterprise entity + SMS signature filing (腾讯云短信签名备案); WeChat login requires 微信开放平台 enterprise verification. Neither is possible without a registered company, so phone/WeChat login cannot be built today regardless of preference.
- Formal mainland launch (app filing, possible UGC features) will require real-name registration under 《网络安全法》, and Chinese user habit is SMS code or WeChat login — so phone OTP becomes mandatory at that stage.
- WeChat login will be optional, never the only entry: it binds identity to a WeChat account, which is a concern for some survivors.

**Key principle — "实名的是账号，加密的是内容":** even after real-name login is added, the phone number is used for verification only and stored encrypted/isolated server-side. Evidence, emergency contacts, and passwords remain client-side encrypted (localStorage). The server can verify who logged in but can never decrypt what they stored. This keeps D-004 intact under real-name compliance.

**Formal launch track (ordered):** company entity → ICP 备案 → app 备案 → Tencent SMS signature → phone OTP login → (optional) WeChat login.

---

## D-013 — Privy disabled outside secure contexts (2026-07-03)

**Decision:** `PrivyAuthProvider` falls back to local-only auth when `window.isSecureContext` is false.

**Reasoning:** Privy's SDK mounts an embedded-wallet iframe that throws "Embedded wallet is only available over HTTPS" outside secure contexts (e.g. LAN http:// device testing), crashing the entire React tree to a black screen. localhost and HTTPS production are unaffected.

---

## D-014 — Evidence anchoring: reject Aleo (both hash-on-chain and key-on-chain); TSA trusted timestamp is the target path (2026-07-06)

**Context:** A ZKP advisor proposed (a) anchoring evidence hashes on the Aleo privacy chain, and (b) storing the AES decryption key as a private Aleo record so the owner can always retrieve it. Both were evaluated and rejected.

**Decision:** No Aleo (or any overseas public chain) in the evidence pipeline. Target anchoring path remains 联合信任 TSA (tsa.cn, RFC 3161) as primary anchor, with OpenTimestamps (free, token-less Bitcoin anchoring) as an optional supplementary international anchor.

**Reasoning — hash on Aleo:**
1. **Zero judicial recognition:** the verification audience is a mainland Chinese judge. Courts recognize TSA timestamps, 人民法院司法链, notarization, and domestically filed 存证 platforms. A foreign privacy chain (mainnet 2024) has no acceptance precedent in Chinese judgments.
2. **Compliance is a hard blocker, not a TODO:** any fiat→ALEO conversion service (even "official partnership", even gas sponsorship where *the company* holds/spends tokens) falls under the PBOC 9·24 (2021) prohibition on fiat–crypto exchange. It would also jeopardize the entire formal launch track (company entity → ICP → app 备案), and violates D-001.
3. **Privacy chain solves a non-problem:** a SHA-256 hash already reveals nothing; hiding it in a private record is redundant. Worse, evidence timestamps need to be *publicly verifiable* — a private record adds ZK-proof friction at exactly the moment (举证) where simplicity matters.
4. **Reachability & longevity:** Aleo RPC/explorers are not reliably reachable from mainland China (same failure mode as Arweave); evidence horizons are 5–10 years, TSA/公证处 have state-backed longevity.
5. **Architecture correction (independent of chain choice):** the hash must be computed client-side at capture/encryption time, never "returned by the cloud" — otherwise a tampering window opens between capture and fixation.

**Reasoning — decryption key as Aleo record:** key management is relocated, not solved. "Record owner retrieves the key" requires the user to safeguard an Aleo account private key — still a root secret that, if lost, loses everything, but now with worse usability (wallet UX, GFW-blocked nodes, gas). The master-key + paper recovery code design achieves the same recoverability with no new dependencies and no crypto exposure.

---

## D-015 — ZKP-based user screening ("prove I'm a survivor without revealing identity"): not for launch (2026-07-06)

**Decision:** Do not build ZKP-based qualification/screening for launch. Filed as a post-launch idea in one narrow form only (see below).

**Reasoning:**
1. **Oracle problem:** ZKP proves possession of a credential, not the truth behind it. Proving "I am a survivor" requires a trusted issuer of digitally verifiable victim credentials (告诫书/保护令 as signed digital documents) — no such system exists in China. Without an issuer there is nothing to prove.
2. **Self-attested substitutes don't screen:** proving properties of one's own vault ("≥3 evidence records older than 30 days") is trivially gamed by storing junk files.
3. **It does not cure the reason the alert map was cut:** ZKP mitigates Sybil attacks (mass fake accounts), but a fully verified real user can still post a false danger alert. Fake-alert risk is a content-trust problem, out of ZKP's reach — the original decision to remove the alert map stands.

**Narrow viable form (post-launch, if anonymous reporting/mutual aid is ever revisited):** phone-OTP-anchored anonymous membership with rate limiting (Semaphore-style: one phone number = one anonymous identity, N posts/day, bannable without deanonymization). Note this requires **no blockchain** — a server-published Merkle root suffices. ZKP ≠ chain.

**Status vs three pillars:** anonymous mutual aid is outside the three-pillar launch scope; per the minimalism principle the default answer remains no.

---

## D-016 — Managed cloud storage only; no self-hosted servers (2026-07-06)

**Context:** An engineer friend suggested replacing Supabase with a self-built server.

**Decision:** Evidence ciphertext and encrypted metadata stay on managed cloud — Supabase now, migrate to Tencent Cloud (COS + cloud functions) at formal mainland launch. No self-hosted/raw VPS at any stage.

**Reasoning:**
1. **The server is untrusted by design.** Confidentiality comes from client-side AES-256-GCM + the key hierarchy (D-017), not from owning the machine. A breach or subpoena yields only ciphertext regardless of who runs the box. "Own your data" is achieved by E2E encryption, not by self-hosting.
2. **Durability is the thing we cannot afford to lose.** Evidence horizons are 5–10 years. Managed object storage is multi-replicated; a self-run VPS makes us responsible for backups, and a dead disk = lost evidence.
3. **Ops burden violates the minimalism principle** (7×24 patching, DDoS, monitoring for a small team). Small-team self-hosted servers are also the most commonly breached targets.
4. **Legal neutrality:** third-party-platform storage reads better under 民诉证据规定第94条 than "the app company's own server".
5. **Compliance path is identical:** a domestic self-hosted box needs ICP filing just like Tencent Cloud does.

**Lock-in mitigation:** keep the storage abstraction layer (`arweaveService.ts` interface) so the backend swap (Supabase → COS) touches one file; maintain periodic export capability. Server-side code is limited to thin serverless functions (future TSA proxy, phone OTP) — not standing servers.

---

## D-017 — Key hierarchy: one recovery code per user, master key wraps all per-file keys (2026-07-06)

**Decision:** Replace the per-file downloadable JSON key bundle with a three-tier hierarchy:

```
Recovery code (12 chars, written on paper, ONE per user, permanent)
   │ derives (Argon2/PBKDF2)
   ▼
Master key (one per user, random, never leaves device in plaintext)
   │ wraps
   ▼
Per-file keys (random per evidence file) ──encrypt──▶ evidence blobs
```

- Master key is stored in the cloud **twice-wrapped**: once by a password-derived key (daily unlock), once by the recovery-code-derived key (device change / forgotten password).
- Per-file wrapped keys + the encrypted record index are stored in the cloud, bound to the account → cross-device recovery = login + recovery code.
- Upload flow requires zero key handling from the user; the recovery code is shown once at setup and never again.
- Legacy per-file JSON bundles remain decryptable (read-only path) — no forced migration for demo-era data.

**Trade-off (intentional):** losing both password and recovery code = permanent evidence loss. The server can never decrypt anything; this preserves D-004/D-010 zero-knowledge guarantees under real-name login (D-012: "实名的是账号，加密的是内容").

**Rejected alternative:** storing keys as Aleo private records (see D-014) — relocates the root-secret problem to a wallet key with worse usability, GFW-blocked access, and crypto compliance exposure.

### D-017 附录 — 密钥与存储答疑(2026-07-06 与 Katie 逐条确认,重新讨论前先读这里)

**Q1: 恢复码是每次上传一个,还是一人一个?**
一人一个,管所有文件(过去和未来的)。每次上传自动生成的文件密钥由主密钥包裹,用户全程无感。

**Q2: 恢复码会存到 Supabase 吗?我们能帮用户找回吗?**
不会,也不能。云端存的是"被恢复码派生密钥加密后的主密钥"(打不开的保险箱),恢复码明文只存在于用户抄写的纸上。我们若能找回 = 传票/泄露就能解开所有用户证据 = Aspire News 的死法。**我们保管箱子,但永远打不开箱子。**

**Q3: 登录密码和恢复码绑定吗?**
不绑定。是同一间房的两扇独立的门:主密钥随机生成,分别被密码派生钥匙和恢复码派生钥匙各加密一份存云端。改密码不影响恢复码,换恢复码不影响密码。

**Q4: 丢了会怎样?**
- 只忘密码:邮箱重置账号 → 恢复码解锁数据 → 设新密码 ✅
- 只丢恢复码:密码解出主密钥 → 生成新恢复码 ✅
- **两个都丢:证据永久丢失,任何人都救不了 ❌**(刻意取舍——"任何人都拿不走你的证据"的另一面)
- 注意:邮箱重置只恢复"能否登录",不恢复"能否解密"(否则黑掉邮箱=拿到全部证据)。

**Q5: 别人知道了登录密码怎么办?**
密码单独就是完整钥匙——知道密码的人能解密一切、能重新生成恢复码。防护:① 文案告知"两个码都不能告诉任何人,包括伴侣家人;不要用生日等施暴者猜得到的密码";② 新设备登录需邮箱验证码 + 登录/恢复码变更邮件提醒;③ 当面胁迫无法用密码学防御,靠删除冷静期缓解。

**Q6: 密文是什么?和哈希什么关系?**
密文 = 整个文件加密后的完整数据(50MB 视频≈50MB 密文),有密钥可还原出逐比特一致的原件——负责"拿得回来"。哈希 = 32 字节指纹,永不可还原——负责"证明没改过"。举证时:取回密文 → 解密 → 重算哈希 → 与时间戳比对。

**Q7: 私密文件正式版存在哪?**
密文存云端(现 Supabase 私有桶+RLS;正式大陆上线迁腾讯云 COS,见 D-016)。明文只在用户设备上、只在拍摄和举证解密的瞬间存在。主密钥明文从不落盘、从不上云。紧急联系人/SOS 模板仍仅 localStorage(D-004)。

**Q8: 手机上的文件被删了,证据不就没了?**
不会——密文在云端,新手机登录+恢复码即可全部取回;App 内拍摄的证据明文根本不进相册,施暴者翻手机看不到。真正的两个例外:① 尚未上传完成的记录(对策:激进补传 + 每条记录显示"已同步云端/待上传"状态);② 微信聊天记录法庭要原始载体,我们的截图只是辅助证据(文案已如实告知"勿删原始对话")。

**Q9: Supabase 大陆延迟?要国内服务器吗?**
跨境 200–500ms 且不稳定,但 SOS 完全不依赖云,上传有本地降级。开发期留 Supabase,正式上线迁腾讯云(同 CloudBase 一个账号一条备案线),不用阿里云,不自建(D-016)。

---

## D-018 — Two-layer auth: email OTP for the account, password stays on-device for the data (2026-07-06)

**Decision:** Split "can you log in?" from "can you decrypt?" into two independent layers:

| Layer | Secret | Enforced by | Resettable? |
|---|---|---|---|
| Account access | 6-digit email OTP (Supabase `signInWithOtp`) | Server | Yes — anyone with the inbox |
| Data access | Login password / paper recovery code (D-017) | Client-side crypto only | Password yes (via recovery code); both lost = permanent |

- **The login password is NEVER sent to any server.** It exists only to derive the KEK that opens the password box. A database breach or subpoena yields nothing decryptable; a hacked email account yields login but zero evidence.
- Sessions persist per device (`persistSession: true`) → the OTP is only needed on NEW devices, making "new device requires the email inbox" a server-enforced guarantee rather than an app-side speed bump.
- Every page load still requires the password (master key lives only in memory) — an abuser picking up a logged-in phone cannot open records.
- Offline/no-env fallback: legacy local bcrypt path remains (D-013 pattern) so dev builds work; it cannot use the cloud vault.

**Also decided (same session):** the fake ChainMaker "anchoring" step was removed from the new evidence pipeline entirely — new records store only real facts (hashes, sync status, dual timestamps). Legacy demo records keep their simulated chain fields, displayed under "旧版记录". Honest copy per the Aspire News lesson: never claim security that doesn't exist.

---

## D-019 — Honest capture grading: 现场取证 vs 事后导入 (2026-07-07)

**Decision:** Every evidence record carries a capture grade shown to the user and stored (plaintext column, usable for future court-export weighting):

| Path | Grade | Rule |
|---|---|---|
| In-app audio recording (MediaRecorder) | 1 现场取证 | Always — the file cannot pre-exist |
| 拍照/录像 buttons (`<input capture>`) | 1 or 2 | File's own `lastModified` ≤ 2 min old → 1, else 2 |
| Explicit 导入已有文件 entry | 2 事后导入 | Always, even if the file is fresh |

**Why the freshness heuristic:** `capture="environment"` opens the camera on mobile but is silently ignored on desktop, and mobile users can switch to the gallery mid-flow. The file's own timestamp exposes that honestly — we grade what we can verify, not what the button implied. Never overclaim (Aspire News lesson) applies to evidence strength too: a mislabeled "live" record could be discredited in court and take the user's whole vault's credibility with it.

**Location policy:** GCJ-02 coordinates (pre-warmed on entering the capture view, SOS-button pattern) attach to grade-1 records only — where the user is when *importing* is not where the evidence happened. Precise coordinates are permitted because they go into the sealed metadata (ciphertext in the cloud); the ~0.1° rounding rule continues to apply to anything broadcast.

**Metadata schema (all sealed):** `capturedAt` (device clock), `location {lat,lng,accuracy,system:"GCJ-02"}`, `deviceInfo` (full UA). Plaintext columns stay minimal: hashes, grade, client/server timestamps — exactly what retroactive TSA anchoring (补锚定) needs.

---

## D-020 — Court package = plain ZIP + self-contained bilingual HTML, verifiable without 非默 (2026-07-08)

**Decision:** The Phase-3 举证 export is a plain ZIP containing the decrypted original file (under `证据文件/`) and one self-contained `举证说明.html` — no proprietary formats, no app dependency, no server round-trip. Built client-side with fflate.

**Why this shape:**
- **Survivable evidence.** The package must remain usable if the app is taken down, the company never materialises, or the user can no longer install anything. SHA-256 verification instructions use only OS-built-in tools (`certutil` on Windows, `shasum` on macOS/Linux), with the expected value printed next to the command.
- **Court-facing, not tech-facing.** The HTML explains capture grade (现场取证/事后导入) in plain language, shows dual timestamps (device + server clocks) honestly, and includes per-scenario guidance (保护令 / 离婚诉讼 / 报警立案) plus the 12348/12338 hotlines — so the package is also a "what do I do with this" guide.
- **Honesty rules carry over (Aspire News lesson):** the HTML says fingerprints were *locally fixed at capture time* and TSA is 接入中; it never says 绝对安全 or 区块链. Unit tests enforce these as assertions.
- **User-controlled fields are HTML-escaped** (file name, note, device info) — a malicious file name must not become script in the court document.

**Known trade-off:** Chinese entry names use the ZIP UTF-8 flag (0x800, set by fflate). Windows 10+, macOS Finder, and `ditto` extract correctly; only the legacy Info-ZIP CLI `unzip` (6.0) fails. Accepted — target users extract via Finder/Explorer, and Chinese names (`举证说明.html`, `证据文件/`) matter more for a court audience than CLI compatibility.

**Naming:** `举证包_YYYY-MM-DD_<txId前6位>.zip` — date for the user, short ID for matching back to the cloud record.

---

## D-021 — 非默不是"家暴专用"App：文案与法律指引必须覆盖性侵、骚扰等所有侵害情形 (2026-07-08)

**Decision (user directive):** The Unmuted 的核心是"帮助用户加密存储私密信息，并在未来有需要的时候能够作为有效证据进行举证"。用户群体包括遭受性侵害、骚扰跟踪及其他侵害的女性，不仅是家暴受害者。所有用户可见文案（App 内 + 举证包 HTML）不得默认"家暴 + 婚姻"框架。

**Rules for copy:**
- 报警与立案 is the universal first scenario — every survivor can use it. Sexual-assault-specific advice (report promptly, forensic exam, don't wash self/clothing beforehand) belongs there.
- 人身安全保护令 applies to family members AND intimate relationships (同居、恋爱) — say 不需要先起诉离婚、不限于婚姻关系; never present it as the default path for everyone.
- Litigation guidance covers 刑事、民事赔偿、离婚诉讼 — divorce is one case, not the frame.
- DV-specific instruments (告诫书, 反家暴法) stay, but labelled as applying 属于家庭暴力的.

**Applied 2026-07-08:** 举证说明.html 场景指引 restructured; LegalTipsDisclosure first tip broadened.

---

## D-022 — 72h 删除冷静期，且"可恢复"这一事实必须对旁观者不可见（防胁迫删除）(2026-07-09)

**Decision (user directive):** Evidence deletion is a 72-hour soft delete, but the delete path must **look final**. No 回收站 / "3 天内可恢复" wording anywhere on the delete flow — success shows only 「已删除。」. Recovery lives behind an inconspicuous grey line at the very bottom of the records list（「找回误删的记录」）which requires **re-entering the vault password** before anything is shown.

**Why the stealth requirement (user's words):** 施暴者可能胁迫她当面删除证据。如果界面透露"还能恢复"，施暴者发现后可能引发二次施暴。So the coerced "delete" must convincingly look permanent to an onlooker, while the owner can quietly restore within 72h.

**Mechanics:**
- `evidence_records.deleted_at` (already in migration 0001) marks the soft delete; `listEvidence` filters it out; local index entry + cached blob are removed immediately so nothing shows on-device.
- Purge is client-triggered: `purgeExpiredEvidence` runs on records-view open and before listing deleted records; removes storage object + row once `deleted_at` is ≥72h old. No server cron (no entity yet) — worst case a record lingers in ciphertext until the next visit, which is acceptable.
- Recovery view (`最近删除`) requires a fresh `unlockWithPassword` even in an unlocked session, lists deleted records with 「约 N 天/小时后彻底清除」, one-tap 恢复 (`deleted_at = null`).
- Pending (never-uploaded) records are still deleted outright — there is no cloud copy to recover.

**Trade-off accepted:** a survivor who genuinely wants data gone immediately cannot force-purge from the UI; 72h is the anti-coercion price. The password gate means an abuser who saw the grey line but doesn't know the vault password still cannot confirm anything was ever deleted.

## D-023 — 解锁密码容忍首尾空白（trim 重试 + 创建时 trim）(2026-07-10)

**Decision:** `unlockWithPassword` tries the raw password first, then retries with `password.trim()` if it differs; new passwords are trimmed at creation (set-password and recovery re-wrap) so the stored wrap never contains stray edge whitespace.

**Why:** 2026-07-09 incident — a pasted password with a leading space failed to unlock and the toast-only error gave no clue. Survivors often paste passwords from notes apps; edge whitespace is invisible and the cost of a false "wrong password" here is a user believing their evidence is lost.

**Trade-off accepted:** passwords that *intentionally* differ only by edge whitespace become equivalent — a negligible loss of password space against PBKDF2-310k, vastly outweighed by the lockout-avoidance benefit. Interior whitespace is untouched.

## D-024 — 解锁页 ‼️ 求救入口（icon-only，仅本机有联系人时显示）(2026-07-11)

**Decision:** The unlock/login screen shows a discreet SOS entry — a bare ‼️ icon in the bottom-right corner, no text. Tapping it opens a full-screen overlay with the standard hold-2s SOS button. Rendered only when this device already has emergency contacts in localStorage.

**Why:** Katie's 2026-07-10 friction feedback — an emergency must not wait behind email OTP + vault password. SOS never needed the account or the vault (contacts + sound settings are localStorage-only), so the login wall was blocking it artificially. The icon-only form is Katie's own call (2026-07-11): 「可以不用写成紧急求救，而是设置成这个‼️图标」.

**Disguise trade-off, and how it's contained:**
- No text like 紧急求救 on the wall — a bare ‼️ is ambiguous to an onlooker; the owner learns what it is once.
- Contacts-gated rendering: a fresh/stranger's device shows a plain login wall with nothing extra.
- Tap opens the hold button, never fires SMS directly — same 2s hold as in-app guards against accidental/pocket triggers.
- No contact names/numbers are rendered pre-auth.

**Mechanics:** new `UnlockSOSEntry.tsx` mounted in `LoginFlow`; reuses `SOSButton` unmodified (validated code untouched) with `useSilentMode` settings from localStorage.

## D-025 — 云端保险柜逐条操作需重输密码（解锁查看 / 导出举证包 / 删除）(2026-07-17)

**Decision:** Every per-record action in the Cloud Vault that decrypts or destroys evidence — 解锁查看, 导出举证包, and 删除 — requires a fresh password entry (`unlockWithPassword`) at the moment of the action. The list-level password gate stays as-is.

**Why:** Katie's 2026-07-17 feedback: after unlocking the records list, 解锁查看 worked with a single tap, which felt unsafe — the threat is a phone grabbed *while the list is already unlocked* (abuser reads plaintext evidence, exports it, or deletes it). The session master key in memory made decryption invisible; correct cryptographically, but the UX gave no barrier at the sensitive moment. Delete included at Katie's explicit choice (defense-in-depth on top of the D-022 72h recovery).

**Trade-off accepted:** one extra password entry per view/export/delete. For evidence access this friction is the point; capture/upload flows are untouched, so recording in an emergency stays friction-free.

**Mechanics:** inline password prompt inside the record card (`CloudVaultHistory` in `EvidencePage.tsx`), replacing the old two-button delete confirm — typing the password *is* the confirmation. Same inline error copy as the page gate (wrong-secret vs vault-unavailable, D-023 trim tolerance applies). D-022 invariant preserved: delete still looks final; no recovery hint on the delete path.

## D-026 — 援助资源目录：结构化数据 + 城市检索 + "来源页"自动巡检 (2026-07-19)

**Decision:** Psych/legal aid resources move from hardcoded component arrays to `src/data/aidDirectory.json` with a unified schema (category, kind, situation tags per D-021, city, phone, `sourceUrl`, `verifiedAt`). Pages filter by city (manual picker, national entries always shown). Directory scope: China city-level depth now; other countries country-level national hotlines later (UN hackathon plan). Broadened beyond DV to all women's-rights support (家暴/性侵/骚扰职场/婚姻家事/心理/综合维权 tags).

**Validity guarantee (Katie's hard requirement — no dead numbers):**
1. **Listing rule:** every entry is human-verified (phone called, info confirmed on an official page) before inclusion; `verifiedAt` shown to users on each card.
2. **Auto re-check where automation works:** weekly CI cron (`scripts/verify-directory.mjs`) fetches each entry's `sourceUrl` and fails the build if the page is dead (4xx/5xx) or the phone number no longer appears on it. Shortcodes (≤7 digits) are exempt from the number-presence check (too generic). Unreachable-from-CI pages are warnings, not failures (cross-border access limits must not cause false alarms).
3. **Honest degradation:** entries not re-verified in 12 months show an amber "可能过期，请优先拨 12338/12348" label in the UI; entries without a `sourceUrl` are warned weekly until the team adds the exact official page that publishes the number. Homepages don't count (first run caught this: Shanghai center's number isn't on the sh.12348 homepage).
4. **What is NOT done:** no robo-dialing of hotlines to test them (unethical — would occupy crisis lines), no GPS-based city detection (manual picker only; browsing aid resources must not request location).

**Why:** a survivor in crisis who dials a dead number may not try a second one. Verification-before-listing plus automated source monitoring is the strongest guarantee available without calling hotlines by machine.

## D-027 — Argon2id 密钥派生升级 + 强制密码强度 (2026-07-20)

**Decision:** (1) Key-box KDF upgraded from PBKDF2-SHA256 (310k) to Argon2id (libsodium INTERACTIVE preset: opslimit 2, memlimit 64 MiB) — new `KeyBoxV2` format; legacy v1 boxes remain openable and are migrated opportunistically on the next successful unlock. (2) Password creation (vault setup, recovery reset, change password) now enforces a strength policy: ≥8 chars, not digits-only, not one repeated char, not on a common-password blocklist (`src/lib/passwordPolicy.ts`).

**Migration safety (verify-then-replace):** `rewrapBoxVerified` wraps with the new KDF and then PROVES the new box opens before it is ever persisted; any failure keeps the old box — a migration bug can never lock a user out. Password box migrates on password unlock; recovery box migrates only when the paper code is actually entered (its KEK can't be derived without it). Migration runs in the background and never blocks or fails the unlock itself.

**Dependency rule:** `libsodium-wrappers-sumo` pinned to an exact version (no `^`) — upgrades are deliberate and the diff is reviewed before bumping (supply-chain discipline agreed with Katie).

**Why:** Katie's direction 2026-07-20: "我们这个软件最最重要的核心永远是让用户的数据安全地保管在我们的软件上". Argon2id's memory-hardness (64 MiB per guess) defeats GPU-parallel cracking that PBKDF2 is weak against; the password-strength gate closes the weak-password hole that no KDF can fix. Chosen over the zero-dependency alternative (raising PBKDF2 iterations, ~2× gain) after the supply-chain trade-off was explained.

## D-028 — 使用痕迹防护：快速离开 + 安全使用提示 (2026-07-22)

**Decision:** (1) A "离开/Exit" quick-exit pill sits in the header on every screen, locked or unlocked; one tap runs `location.replace` to a neutral weather search (baidu 天气 for zh, Google weather for en), so the Back button cannot return to the app. (2) A plain-language "如何安全地使用本站" sheet (link under the login card + entry in Settings) teaches private browsing, history clearing (iOS Safari / Android Chrome steps), and using a safer device when the phone may be inspected (`QuickExit.tsx`).

**Why:** the 2026-07-19 security review identified usage-trace exposure — someone close to the user picking up her phone or reading browser history — as the most realistic remaining leak vector (server-side content leakage is already near-zero by architecture). Quick exit + private-browsing guidance is the standard mitigation on DV-support sites. Chosen over a full "disguise mode" (app pretending to be something else) for now: honest scope, no new attack surface, shippable without entity. Limits acknowledged: JS cannot clear existing history; `location.replace` only removes the current entry — hence the guidance sheet.

## D-029 — 外部安全审查第一轮整改：自动锁定 + 清除钱包遗留依赖 + CSP 安全响应头 (2026-07-30)

**Context:** an external security review (Codex, 2026-07-27) validated the encryption architecture ("内容保密做得不错") and listed prioritized gaps. Three were actionable without a company entity; Katie approved all three on 2026-07-29.

**Decision 1 — Auto-lock (review item 5):** while the vault is unlocked, `useAutoLock` clears the session master key and returns to the lock screen after **10 min without interaction**, or when the app returns from **≥3 min in the background** (timestamp check on `visibilitychange` — background timers are throttled on mobile). The account session survives; only the password is re-entered. A bilingual notice on the lock screen explains why. SOS stays reachable (the ‼️ lock-screen entry, D-024). Rationale: the top real-world threat is someone close to the user picking up her unlocked phone; per-action re-verification (D-025) protects evidence actions, auto-lock closes the rest.

**Decision 2 — Wallet-era dependency removal (review item 3):** deleted provably-dead modules — `privyAuth.tsx` (provider mounted but zero `usePrivyAuth` consumers; login is Supabase OTP), `useWallet.ts` (MetaMask/Avalanche), `useSolanaWallet.ts`, `WalletConnect.tsx`, `magicBlock.ts`, `solanaReputation.ts`, plus the `window.Buffer` polyfill — and uninstalled `@privy-io/react-auth`, `@solana/web3.js`, `ethers`, `@magicblock-labs/ephemeral-rollups-sdk`, `buffer`. Bundle: **3.29 MB → 1.35 MB** (gzip 446 kB). `shortenHash` inlined into `EvidencePage`. Legacy-record read path and login flow verified untouched (headless-Chrome smoke test, zero console errors). Aligns with the standing "no wallet features" rule.

**Decision 3 — CSP + security headers (review item 2, partial):** `vercel.json` now sends `Content-Security-Policy` (default-src 'self'; connect-src limited to Supabase + ChainMaker BaaS; fonts allowed from Google Fonts; frame-ancestors 'none'), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` (external links — hotline sites, quick-exit target — never learn the user came from 非默), `Permissions-Policy` (camera/mic/geolocation self-only), and HSTS. Verified with headers applied locally: zero CSP violations, fonts + Supabase reachable. **Limit:** headers apply on Vercel only; CloudBase COS static hosting doesn't send them — revisit at D-016 migration. Stale `index.html` meta description ("Web3 匿名举报…") replaced with the neutral brand line.

**Still open from the review (tracked, not this round):** TSA/RFC3161 anchoring + record-level tamper evidence (needs entity), reproducible builds/release hashes, ChainMaker serverless proxy.

## D-030 — 模拟功能一期：脚本对话模拟器（不接 AI）+ 援助 tab 合并 (2026-07-30)

**Context:** Katie 提出做一个"从案发到结案"的报案流程模拟器（调研文档：`docs/模拟功能-调研与设计方案.md`）。市面上同类流程模拟产品的自由文本输入背后是大模型实时扮演对方并打分。

**Decision 1 — 脚本对话，不接 AI、不收自由文本（Katie 确认 2026-07-30）:** 采用聊天式体验形态（旁白/对方气泡/快捷选项/灰色教练提示/即时反馈/结局复盘），但全部内容来自法律校对的 JSON 脚本。三个理由：(1) 隐私红线——用户自由输入的受害经历发给任何 AI API 就离开设备，与"服务器只见乱码"承诺冲突；(2) 内容安全——家暴/性侵语境下 AI 实时输出无法逐句校对，错误法律信息代价极高；(3) 架构——纯静态 SPA 无服务器，接 AI 需 serverless 代理 + 生成式 AI 合规。AI 自由输入留作远期可选项，且永不用于施暴相关叙述。不做"剩余次数"限制（那是 AI 成本控制产物；练习应鼓励重复）。

**Decision 2 — 援助 tab 合并:** 心理 + 法律合并为一个"援助"tab（`AidPage.tsx` 顶部分段切换，内部原样复用 PsychPage/LegalPage），空出第 4 格给"模拟"。底部导航：求助 / 存证 / 援助 / 模拟。

**Decision 3 — 内容与代码分离 + 诚实标注:** 场景 JSON 在 `src/data/simulations/`（双语、flags→复盘规则、法条依据字段），`src/lib/simulation.ts` 提供类型/加载/结构校验（所有指针可达、双语完整、无环——单元测试强制）。一期家暴场景（11 幕、5 结局、14 条复盘规则）依据反家暴法第15/16/23-32条、最高法2022保护令规定、民法典1091条撰写；UI 上明确标注"模拟版本 · 待法律校对"徽章 + 免责声明，**律师通读校对前不得移除徽章**。安全红线落地：不渲染暴力细节、每幕常驻"我现在就需要真实帮助"出口（110/12338/12348 + 援助目录）、复盘语言指向环节与方法而非用户本人、选择零保存零上传。

## D-031 — 登录入口二选一：验证码或密码（存证仍需密码解锁）(2026-07-30)

**Context:** Katie 反馈入口"验证码 + 密码"两层太麻烦："第一次要验证码，第二次可以选择是验证码或者密码登陆。给大家选择的权利。"技术约束：密码不只是登录凭证，而是解密证据的密钥（D-017 密钥层级，服务器只存乱码）——验证码在密码学上**无法**解开证据，除非引入服务器端可解密的钥匙托管，那会破坏"服务器被查封/入侵也看不到内容"的核心承诺。

**Decision — 双通道入口 + 存证内解锁门：**
1. **验证码通道**：解锁页新增"改用邮箱验证码登录"；刚完成 OTP 的用户新增"先直接进入（打开存证时再输密码）"。走此通道进入后，求助/援助/模拟立即可用，存证 tab 显示解锁门（`EvidencePage` vault gate），输一次密码即解锁。
2. **密码通道**：原有路径不变——已有会话的设备输密码直接完全解锁。
3. 两处都用一句话向用户解释边界："验证码用于登录；证据只有密码才能解密——服务器看不到你的密码和证据内容。"
4. 不做"设备记住密钥/免密解锁"——那等于把证据解密能力落盘，手机被夺走即失守，与 D-029 自动上锁的威胁模型冲突。生物识别解锁（passkey/PRF）仍是未来的正路。

**实现:** `LoginFlow.tsx`（`onUnlocked(email, { vaultLocked })` + otpLogin/cameViaOtp 状态），`EvidencePage.tsx`（`vaultGateLocked` 全区门 + `unlockWithPassword` 后重渲染），`Index.tsx` 无需改动（`canUseVault` 已按会话密钥实时计算）。自动上锁（D-029）行为不变。

## D-033 — 登录流程简化：验证码后直接进入，密码仅在打开存证时要求 (2026-08-03)

**Context:** D-031 已引入"验证码通道"作为可选路径（用户需从解锁页手动选择"改用邮箱验证码登录"）。Katie 反馈：日常使用仍然要先输验证码、再输密码，摩擦太大；密码应该只在下载上传数据时才需要。

**Decision:** 验证码成功后**直接进入 app**，不再要求输入密码。具体路径：
1. **首次注册**：邮箱 → 验证码 → 设置密码（保护存证）→ 展示恢复钥匙 → 确认 → 进入（不变）。
2. **已有账号**：邮箱 → 验证码 → 直接进入（vault 处于 locked 状态，session master key 为 null）。
3. **自动锁屏后**：检测到已有 Supabase session → 直接进入（同上，无需任何输入）。
4. **存证操作**：上传 / 解锁查看 / 导出时，EvidencePage 提示输入密码解锁 vault。

**什么没变：** 第一次注册的密码设置流程不变（密码仍是保护存证的唯一本地密钥）；EvidencePage 内的 vault gate 不变；paper recovery code 流程不变；自动上锁（D-029）的行为不变。

**为什么可以这样做：** 密码的作用是解密存证，不是"确认用户身份"——身份已经由 Supabase OTP 确认。日常使用（SOS、援助、模拟）根本不需要解密任何东西，强制密码是无谓摩擦。只有在真正需要解密时才提示，是最小摩擦 + 最合理的安全边界。

**实现：** `LoginFlow.tsx`（`handleCode` 中 vault 存在时直接 `onUnlocked(email, {vaultLocked: true})`；`useEffect` session check 同样直接进入；删除 `unlock`/`recovery-unlock` stage、`handleUnlock`、`handleRecoveryUnlock`、`handleOtpLoginInstead`、`otpLogin`、`cameViaOtp`；移除 `unlockWithPassword`/`unlockWithRecoveryCode`/`isValidRecoveryCodeFormat` 导入；删除 `RecoveryUnlockStep` 组件，共减少 ~220 行）。`Index.tsx` auto-lock banner 文案更新（不再提"输入密码"）。

## D-034 — 内部访问门控 + Vercel 部署迁移到 Katie 账号 (2026-08-03)

**Context:** 外部安全分析指出：CloudBase 域名在没有 ICP 备案的情况下对中国大陆用户公开服务，构成合规风险（已经踩线）；Supabase/AWS 境外存储用户邮箱地址也存在数据出境合规问题。公司实体注册完成前，需要把两条链接限制为仅内部团队可用。同时发现 Vercel 项目在 Wendy 账号下，每次需要 Wendy 操作，Katie 希望迁移到自己账号。

**Decision 1 — 内部访问码（BetaGate）：**
在 `Index.tsx` 顶层加一个全屏访问门：`VITE_BETA_CODE` 环境变量设置后，打开链接先看到输入框，输入正确的码才进入 app；码存入 localStorage，每个浏览器只需输一次。本地开发不设 `VITE_BETA_CODE` 时门控完全透明。`VITE_` 前缀意味着码会打包进 JS bundle（有一定技术可见性），但足以阻止普通访问者和爬虫；正式上线前需配合 ICP 备案和实体注册，届时移除门控。团队访问码：`V3IOG0G7`（已通过 GitHub Secret 注入到 CloudBase CI；已在 Vercel 项目环境变量中设置）。

**Decision 2 — Vercel 迁移到 Katie 账号 (`katielin0207-devs-projects`)：**
旧 Vercel 项目在 Wendy（DancinWendy）账号下，Katie 无法独立管理。新建项目直接连接 `The-Unmuted-v2` GitHub repo，设置所有必要环境变量，push 到 `main` 自动部署。旧链接 (`the-unmuted.vercel.app`) 通过 `index.html` 内嵌的 hostname 检测脚本自动跳转到新链接，在 Wendy 那边下次自动部署后生效（源码推送已触发）。

**新链接：** `https://the-unmuted-one.vercel.app`（Katie 账号，有访问码保护）。

**CloudBase：** CI workflow 注入 `VITE_BETA_CODE`；`VITE_BETA_CODE` GitHub Secret 已添加到 `The-Unmuted-v2`。访问码生效需等 CloudBase CI 完成下一次部署。ICP 备案完成前，建议同时在腾讯云控制台暂停 CloudBase 静态网站托管（彻底消除合规风险）。

---

## D-035 — 存证记录列表免密可见，操作（查看/导出/删除）分级鉴权 (2026-08-04)

**Context:** 此前保险柜密码作为整个存证页面的入口门控，用户每次打开 App 都必须先输密码才能看到任何记录，导致体验割裂（D-033 简化登录后更加突出）。

**Decision:** 记录列表对已登录用户始终可见，无需密码。密码仅在保险柜当前处于锁定状态且用户触发操作（解锁查看 / 导出举证包 / 删除）时弹出。本次会话内已通过密码解锁：查看/导出直接执行，删除仅需简单确认（无需重输）。Auto-lock 仍按原规则生效（10分钟无操作 / 后台3分钟后重锁）。

**实现：**
- `evidenceVaultService.ts` 新增 `listEvidencePartial()` — 不解密 `encryptedMeta`，返回 `metaDecrypted: false` + 占位元数据，确保云端只有密文时列表仍能渲染。
- `EvidenceRecord` 增加 `metaDecrypted?: boolean` 字段；卡片显示 🔒 占位时不暴露任何明文内容。
- `useEvidenceVault.refreshHistory()` 判断：有 master key → `listEvidence`（完整解密）；无 → `listEvidencePartial`（占位）。
- `CloudVaultHistory.onUnlocked` 回调：第一次解锁后立即刷新历史至完整元数据。

**Trade-off:** 记录数量和创建时间对已登录用户可见，但文件内容、位置、备注等元数据仍加密。对威胁模型（施暴者拿到已登录手机）影响极小——已登录态下记录数量本来也无法完全隐藏。

---

## D-042 — 外部安全审阅第二轮：两条误判的规范化答复（key_vaults 加密参数 & 账号密码"明文传输"）(2026-08-12)

**Context:** 网安朋友在 2026-08-11/12 两天内提交了 3 条反馈：D-041 抗爆破那条是真的，另两条**都是误判**。虽然不改代码，但两条都涉及密码学基础概念的常见误区，且未来还会被别的审阅者踩同一坑——把答案规范化写进这里，形成 canonical answer。

### 误判 A — "密码明文传输"（2026-08-11 提出，随 D-040 说明）

**原话：** "密码传输未加密，是明文 `POST https://iisjendxxmxpgwohckiq.supabase.co/auth/v1/signup`"

**为什么不成立：**
1. URL 以 `https://` 开头 —— HTTP 请求体在离开浏览器之前已被 **TLS 1.3 加密**。DevTools 里看到 JSON 明文是浏览器进程内的 pre-TLS 视图，等同于按 F12 能看到任何网站的密码输入。
2. Supabase / Auth0 / Firebase Auth / AWS Cognito / GitHub / 微信 —— 所有主流账号系统都是这套流程：客户端明文 → HTTPS → 服务端 bcrypt(密码 + 随机盐)。OWASP 推荐做法。
3. "客户端预 hash 再发"是 anti-pattern：服务器存客户端 hash 等于把 hash 变成了新密码（pass-the-hash 攻击）。
4. 我们真正的双层设计（D-036）是：**账号密码经 TLS 到 Supabase 只负责登录；保险柜密码 Argon2id 派生 KEK 永远不出设备**。即使账号密码泄漏，证据密文一片解不开。

**顺带触发了真收获：** 复核时 curl 出 CloudBase 侧完全没有安全响应头（无 HSTS / CSP / X-Frame-Options / X-Content-Type-Options），HTTP 也不重定向到 HTTPS —— 这是**真缺口**，见 D-040 的 A/B/C 三层修复。

### 误判 B — "`key_vaults` 加密参数过度暴露 + 使用不安全的加密算法 Base64"（2026-08-12 提出）

**原话：** "加密算法参数值在接口返回中过多暴露 iv salt data `https://iisjendxxmxpgwohckiq.supabase.co/rest/v1/key_vaults`，使用不安全的加密算法 Base64"

**Part 1 — "iv / salt / data 被暴露"：不成立。**

看代码 `src/lib/keyVault.ts:37-45`：

```ts
export interface KeyBoxV2 {
  v: 2; kdf: "Argon2id"; opslimit; memlimit;
  salt: string;  // base64 — public by design
  iv: string;    // base64 — public by design
  data: string;  // base64 — ciphertext
}
```

- **IV**（AES-GCM 初始化向量）：RFC 5116 / NIST SP 800-38D 要求每次加密用唯一 IV，**与密文一起公开存储**——否则合法用户也没法解密自己的数据。IV 保密没有任何安全意义。
- **salt**（KDF 盐）：其作用是防彩虹表（同一密码派生不同 KEK），**规范要求公开存储**（OWASP / NIST SP 800-63B / libsodium 文档）。攻击者知道 salt 不获得任何优势。
- **算法参数**（`kdf` / `opslimit` / `memlimit` / `iterations`）：客户端必须知道才能重算 KEK，Kerckhoffs 原则要求算法可公开而不影响安全性。此外 D-027 Argon2id 迁移的自动升级也依赖 `v` 字段判别版本。
- **data**（密文）：由 KEK（Argon2id 64 MiB 派生）+ AES-256-GCM 保护。攻击者拿到全部四个字段但没有密码/恢复码——一片解不开。

**Part 2 — "使用不安全的加密算法 Base64"：范畴错误。**

Base64 **不是加密算法**，它是二进制→ASCII 的**文本编码方式**（因为 JSON 装不下原始二进制）。它没有密钥，没有安全属性，也不"加密"任何东西。真正的算法栈已在 `keyVault.ts` 里：

```
密码/恢复码 → Argon2id(64 MiB, 2 ops, memory-hard) → KEK(256 位)
           → AES-256-GCM(12 字节 IV + 128 位认证 tag) → 密文
```

两个算法各自都是 2026 年最佳实践（Argon2id = PHC 2015 冠军 / OWASP 首推；AES-256-GCM = NIST 认证 + Web Crypto 硬件加速）。1Password / Bitwarden / ProtonMail / KeePass / Signal / iOS Keychain 都是同款做法。

**Part 3 — 脱库攻击模型下的实际抗性：**
- password_box：8 位强密码 × Argon2id(0.5s/次) ≈ 一亿年
- recovery_box：12 位 62-charset 恢复码 = 3.2×10²¹ 组合 × 0.5s ≈ 5×10¹³ 年（宇宙寿命不够）
- 前提是密码强度政策（`passwordPolicy.ts`）真的执行：≥ 8 位、非纯数字、非纯重复、常见弱密码黑名单（含中文常见如 `woaini1314`）—— 已确认在 `handleSetAccountPassword` 每一次强制运行。

**RLS 补充**：`0001_key_vault_and_evidence.sql` 的策略是 `for select using (auth.uid() = user_id)`——即使朋友 curl 了 `/rest/v1/key_vaults`，他也只能看到**自己那一行**，看不到其他用户的 boxes。误以为"全库可拉"的话属于第二层误解，需要跟他澄清。

**Decision:** 代码零改动。做两件预防措施：

1. **在 `keyVault.ts` 的 `KeyBoxV1/V2` type 上方加长注释**，逐字段说明 salt/iv/kdf/data 为什么公开存储 + Base64 不是加密算法 + 引用同类工业系统。未来审阅者读代码时先看到这段。
2. **本条 D-042 作为规范化答复**：将来收到同类反馈直接引用即可，不再重新论证。

**关联决策：** D-017（密钥层级）、D-027（Argon2id 升级）、D-036（双层密码架构）、D-040（真缺口在 CloudBase 传输层）、D-041（真缺口在 OTP 有效期）。

---

## D-041 — 邮箱 OTP 抗爆破：Dashboard 缩短有效期 + 客户端 5 次尝试上限 + 有效期倒计时 (2026-08-12)

**Context:** 网安朋友第二条反馈："验证码有效期过长，存在爆破风险，端点 `https://iisjendxxmxpgwohckiq.supabase.co/auth/v1/verify`"。这一条**是真的**，与前一条"密码明文传输"误判不同。

**爆破可行性核算（用当前真实配置）：**
- 6 位 OTP = 1,000,000 种组合（`docs/ai_context.md` 记录）
- Supabase Dashboard 默认 OTP 有效期：**3600 秒（1 小时）**——远超 NIST SP 800-63B 推荐上限（10 分钟）
- Supabase `/verify` 默认限流：约 30 次/5 分钟/IP ≈ 360 次/小时/IP
- 单 IP：360/1,000,000 = 0.036% 成功率
- 100 IP 代理池：3.6%
- 1000 IP 大代理池：36% —— **真实威胁**

Supabase 服务端会在单个 code 错误 5–10 次后主动作废，能拦下大部分小规模攻击，但**1 小时的窗口对代理池攻击者太宽了**。同一账号可以在窗口内被多次触发发码，攻击面进一步放大。

**Decision:** 服务端 + 客户端两层收紧。

**A. 服务端配置（Katie 在 Supabase Dashboard 操作，代码无法覆盖）：**
1. Authentication → Providers → Email → **OTP Expiration: 3600 → 600**（10 分钟，对齐 NIST SP 800-63B）
2. Authentication → Rate Limits：核实 `/verify`、`/otp` 的默认限流值，需要时进一步收紧（`/verify` 建议 ≤ 30/5min/IP，`/otp` 建议 ≤ 4/hour/email）
3. OTP Length 保持 6（同时缩短有效期 + 服务端限流下，6 位已足够）
4. **完成后同步更新客户端常量 `OTP_LIFETIME_SEC`**（`LoginFlow.tsx`）与该 Dashboard 值一致，避免倒计时误导

**B. 客户端防御纵深（本次实现）：**
- **错误尝试计数**（`LoginFlow.handleCode`）：全局 `otpAttemptsLeft` 状态，输错一次减 1；到 0 时弹提示、清空 `codeSentAt`、强制跳回 `email` 阶段——用户必须重新请求一份新验证码。**不能阻止 API 直连的攻击者**，但让当前浏览器 session 不再成为可用的攻击工具，也防止用户在同一台设备上被恶意脚本反复消费尝试次数。
- **有效期倒计时**（`CodeStep`）：以进入 code 阶段的墙钟为准，每秒重算剩余 `mm:ss` 显示。到 0 时显示"该验证码已过期"，禁用「确认」按钮。用户可视地感知威胁模型，也避免"我输了没反应"的困惑。
- **剩余尝试提示**：`attemptsLeft < 5` 时显示"还剩 X 次机会"（琥珀色，非红色以避免过度惊吓）。
- **Resend 重置**：`handleResendCode` 成功后重置 `otpAttemptsLeft = 5` 且 `codeSentAt = Date.now()`——新码到达等价于新一轮尝试窗口。
- **触发点**：`handleSetAccountPassword`（注册）、`handleForgotPassword`（忘记密码）、邮箱入口的 OTP 直发路径三处都统一 `setOtpAttemptsLeft(5) + setCodeSentAt(Date.now())`。

**为什么不做 IP 级客户端限流：** 客户端限流对真实攻击者无效（攻击者直接打 API，绕过 UI）。真正的抗爆破在服务端 `/verify` 限流 + 短有效期，客户端只是 UX 层的诚信告知 + 防止本机被利用。

**为什么不上 8 位 OTP：** 6 位在 10 分钟窗口 + 服务端限流下已够。8 位增加用户输入负担，对施暴者随时可能看手机的场景反而是负面（长码更难在 30 秒内背下），A/B 部分完成后不需要。

**关联 D-036：** 双层密码架构下，OTP 仅用于（1）注册时邮箱验证一次、（2）忘记密码走 OTP magic-link 回退——即使 OTP 被爆破，攻击者也只拿到账号层访问权限，**保险柜密码仍在设备本地、永不上传**，证据密文一片解不开。这是 D-036"实名的是账号，加密的是内容"分层的实际收益。

**关联 D-014：** 与本次收紧不同的是"密码明文传输"那条属于误判——Supabase `signup` 走 HTTPS/TLS，账号密码在 TLS 内明文是所有主流认证服务的标准做法（客户端预 hash 反而是 anti-pattern）。见 D-040 讨论 CloudBase 传输层时的一起说明。

**实现文件：**
- `src/components/LoginFlow.tsx` — 全局 `otpAttemptsLeft` / `codeSentAt` state；`handleCode` / `handleResendCode` / `handleSetAccountPassword` / `handleForgotPassword` / 邮箱入口 OTP 直发路径统一维护；`CodeStep` 组件加两个 props 与 UI；新增 `OTP_LIFETIME_SEC = 600` 常量。
- `docs/decisions.md` — 本条 D-041。
- `docs/tasks.md` — Katie 的 Dashboard 操作单列一条 P0，标注"必须先做，客户端常量再对齐"。
- `docs/changelog.md` — 2026-08-12 条目。

**验证：** tsc / 77 vitest / vite build 均 clean。等 Katie 完成 Dashboard 变更后，需要浏览器手测：（1）注册收码后倒计时正确显示；（2）连续输错 5 次自动跳回邮箱；（3）resend 后计数和倒计时都重置；（4）过期时按钮变灰。

---

## D-040 — CloudBase 传输层安全头缺失的临时缓解（等自有域名 + CDN 根治）(2026-08-11)

**Context:** 外部安全审阅指出 Supabase `signup` 请求"密码明文传输"——这一条是**误判**（URL 是 `https://`，密码经 TLS 加密，客户端预 hash 反而是 anti-pattern，与所有主流认证服务做法一致）。但顺带 curl 复核 `theunmuted-v2-d2gyh0rux2a05de92-1434116173.tcloudbaseapp.com`（境内主线）的响应头时，暴露出**真问题**：

```
HTTPS 响应：无 Strict-Transport-Security、无 CSP、无 X-Frame-Options、无 X-Content-Type-Options
HTTP 请求：直接 200 返回，不重定向到 HTTPS
```

Vercel 侧（`vercel.json`）响应头齐全，但**默认 `.tcloudbaseapp.com` 子域名由 `tcbgw` 网关统一控制，hosting 用户没有配置响应头的能力**。COS 侧 `PutObject` 只支持 Cache-Control / Content-Type / Content-Disposition / Content-Encoding / Content-Language / Expires 这几个白名单响应头，`Strict-Transport-Security` 不在其列。

**Decision:** 分三层：客户端加固立即做；等自有域名彻底解决。

**A. 客户端强制（本次实现，`index.html` 内）：**
1. `<meta http-equiv="Content-Security-Policy">` 移植 Vercel 那套 CSP 到 HTML 内联，让 CloudBase 侧至少有 CSP 基础保护。meta CSP 与 header CSP 是**取交集**关系（都必须放行），所以 Vercel 侧不冲突；`frame-ancestors` 和 `report-*` 只能作为 header 生效，从 meta 中剔除；追加 `upgrade-insecure-requests` 让浏览器自动升级页内所有 http:// 资源请求。
2. 页面顶端脚本：若 `location.protocol === 'http:'` 立即 `location.replace()` 到 `https://` 版本（排除 localhost/127.0.0.1 保留本地开发能力）。**这不是真 HSTS**——首次访问时的握手仍可能被 MitM，脚本本身也可能被中间人注入前替换掉；只覆盖"用户手打 http://"、"从旧链接进入"、"重复访问在 http 缓存"这三个场景。属于**弱化补偿**，不是等价替代。

**B. 走支持工单（尝试成本为零）：** 给腾讯云 CloudBase 提工单，询问 `.tcloudbaseapp.com` 默认子域名能否在 `tcbgw` 网关侧支持 HSTS/HTTP 强跳，或提供 hosting 用户可配置的响应头能力。预期成功率不高，属于机会性尝试。

**C. 根治路径（等公司主体 + ICP，与 D-016 合并推进）：**
1. 注册公司主体 → ICP 备案 → 自有域名（如 unmuted.cn / theunmuted.cn 待定）；
2. 腾讯云 CDN 挂到自有域名 → 在 CDN 控制台开启：HSTS（含 `preload`、`includeSubDomains`）、HTTP 强跳、完整 CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy——与 Vercel 侧完全对齐；
3. 提交 [hstspreload.org](https://hstspreload.org) → 进入 Chrome/Chromium 预置 HSTS 列表 → 全球用户首次访问也不会有 HTTP 降级窗口。

**为什么不 workaround 到 Cloud Function 网关做重定向：** 增加冷启动延迟、增加运营复杂度，且不解决"网关本身响应头"的问题；根本还是要走自有域名 + CDN。

**关联 D-014：** 早期我们下线"模拟区块链锚定"等过度承诺文案。类似地，本决策记录本身就是**主动披露内部一处真实的传输层缺口**，遵循同一诚实原则——不在对外文案里宣称"完整的 HSTS 保护"，直到 C 部分完成。

**关联 D-029：** Vercel CSP + HSTS 那次改造只解决了海外线；本条把境内线的缺口显式化并写进 P0 mitigation + 长期 roadmap。

**实现文件：**
- `index.html` — 顶端 `<meta http-equiv="Content-Security-Policy">` 与 http→https 客户端重定向脚本。
- `docs/decisions.md` — 本条 D-040。
- `docs/存证功能说明书.md` — 第 9 章"数据存储与合规现状"补一段披露境内线传输层缺口 + P0 缓解 + 长期计划。
- `docs/tasks.md` — 新增两项：（1）提腾讯云工单；（2）自有域名 + CDN HSTS，标注"gated on 公司主体 + ICP"。

**验证：** curl 已确认修复前 CloudBase 侧 0 个安全头；本改动只影响客户端 HTML，不改后端。修复后需要 Katie 重新触发 CloudBase CI 部署，然后（1）打开境内线用浏览器 DevTools → Network 检查 meta CSP 生效、（2）手动访问 `http://...tcloudbaseapp.com/` 应自动跳到 `https://`。

---

## D-039 — 明文外泄面收紧：查看/导出每次必输密码 + 举证包内层加密 (2026-08-11)

**Context:** Katie 内测发现两个安全感知问题：
1. 存证记录页的"解锁查看"和"导出举证包"在本次 session 已解锁保险柜后一点即出（D-025/D-035 的 session 免密路径）——从用户视角完全感知不到"加密"的存在，且一旦施暴者拿到已登录已解锁的手机也没有任何门槛。
2. 一键导出的举证包 ZIP（D-020）解压后**证据文件就是明文**，落到 Downloads 目录后可能被相册预览、iCloud 同步、AirDrop 误发——加密只在云端有效，本地明文外泄面很大。
3. 同时发现 `evidenceExport.ts:110` 的 `certutil` 命令模板中 `\${esc(fileName)}` 反斜杠转义导致模板字面量未插值，Windows 段显示原样占位符文本。

**Decision:** 收紧两条边界。

**A. 任何把明文写出 App 沙盒的动作，必须每次重新验证保险柜密码——无视 session 是否已解锁：**
- **解锁查看（下载原件到本机）** ← 每次必输
- **导出举证包** ← 每次必输
- **删除** 保持 D-022 反胁迫设计（session 已解锁时仅需简单确认，不问密码）——因为删除的界面观感必须"立即彻底"，多一道密码反而暴露"可恢复"的暗示。
- **元数据浏览、列表刷新** 继续免密（D-035 不变）。

**B. 举证包内的证据文件本身加密封装：**
- 内层 `证据文件/xxx.enc` = AES-256-GCM(原件, PBKDF2-SHA256(export_password, salt=16B, iter=600k)) + 12B IV + GCM tag。二进制头部：`"NMUT"` magic + 版本 1B + salt 16B + IV 12B + ciphertext。
- 用户在"导出举证包"时**新设一个一次性密码**（≥8 位、需二次确认），通过短信/电话等安全渠道单独告知接收人。**明确提示不要复用保险柜密码**——保险柜密码一旦泄漏可解开整个证据库，一次性密码只作用于这一次导出。
- 举证包 ZIP 内含独立的 `解密工具.html`：纯 Web Crypto API（PBKDF2 + AES-GCM），零外链零依赖，任何现代浏览器离线打开即可解密。仍满足 D-020 的"验证不依赖非默应用"原则。
- 举证说明 HTML 更新为**两步验证**：先用解密工具+密码解密 → 再用 `shasum -a 256` / `certutil -hashfile` 校验 SHA-256 与「原始文件指纹」一致。

**C. 顺手修 `certutil ${esc(fileName)}` 模板 bug**（用正斜杠路径分隔符，跨平台友好）。

**加密体现在哪里（对内诚实表述）：**
| 场景 | 加密是否起作用 |
|------|--------------|
| 服务器被调取 / 数据库被拖 | ✅ 云端只有密文 |
| 换手机登录 | ✅ 必须重新密码 + 恢复码 |
| 手机丢失、他人捡到、未登录 | ✅ 登录墙 + 10 分钟自动锁 |
| 手机被翻、已登录已解锁 | ✅ **本次收紧后：查看/导出仍需密码** |
| 举证包落到收件人电脑 / 中间人截获 | ✅ **本次新增：内层加密，需要密码才能解出原件** |
| 用户自己在正常使用 | 元数据浏览无感；写出沙盒的操作有一次密码门 |

**Trade-off:** 
- 用户体验：查看/导出多输一次密码（session 免密取消）；导出多设一个一次性密码。经与产品判断，收益（明文外泄面显著收缩）远大于成本（每次操作一次额外密码）。
- 反胁迫：删除仍保留免密确认，不因这次收紧而破坏 D-022。
- 一次性密码需要用户记住并告知接收人。文案强调"通过短信/电话告知"，避免与文件本身同渠道发送。

**实现文件：**
- `src/lib/evidenceExport.ts` — 新增 `encryptForExport()`（PBKDF2 600k + AES-256-GCM）、`buildDecryptorHtml()`（自包含解密页）；`buildCourtPackage()` 签名加 `exportPassword`；`buildPackageHtml()` 说明改为两步验证；修复模板 bug。
- `src/components/EvidencePage.tsx` — `pendingAction` 增加 `stage: "vault-pwd" | "delete-confirm" | "export-pwd"`；`requestAction()` 只对"删除+已解锁"走 confirm-only 路径，查看/导出永远走 vault-pwd；`handleConfirm()` 在 export 成功验证保险柜密码后进入 export-pwd 阶段收集一次性密码；`handleExport()` 签名加 `exportPassword`。
- `src/lib/evidenceExport.test.ts` — 新增 4 个测试：加密格式头部校验、原件加密对比、round-trip 解密、解密工具自包含性；回归测试防止 `${esc(fileName)}` 未插值再次出现。

**回归：** `npm test` 77/77 通过；tsc/eslint/vite build 均 clean。

---

## D-036 — 邮箱+密码登录（账号密码 vs 保险柜密码双层架构）(2026-08-04)

**Context:** 原先每次登录都需要邮箱 OTP 验证码，用户体验差，且与"注册时设置保险柜密码"的设计造成认知混淆（"我到底有几个密码？"）。用户明确要求改为"注册时设账号密码，之后直接用邮箱+密码登录"。

**Decision:** 三个凭证明确区分：

| 凭证 | 作用 | 存储位置 |
|------|------|----------|
| 账号密码 | 登录身份验证 | Supabase（HTTPS 传输） |
| 保险柜密码 | 派生 Argon2id KEK，解锁证据操作 | 只在设备本地（从不离开设备） |
| 纸质恢复码 | 保险柜密码重置的唯一备份 | 用户自写纸上，系统不保存 |

**注册流程：** 输入邮箱 → 设置账号密码+确认 → Supabase `signUp({email, password})` → 邮箱 OTP 验证（仅注册时一次）→ 设置保险柜密码 → 抄写恢复码 → 进入 App

**登录流程：** 邮箱 + 账号密码 → `signInWithPassword` → 进入 App（保险柜仍锁定，存证操作再验保险柜密码）

**忘记账号密码：** OTP 邮件（magic link）→ 验证 → 进入 App（原路回退，保留现有 OTP 基础设施）

**安全评估：** 账号密码通过 HTTPS 发到 Supabase，与主流应用相同。保险柜密码在设备本地 Argon2id 派生 KEK，绝不传输——两层分离确保即使账号密码泄漏，证据内容仍无法解密。

**实现文件：**
- `src/lib/authService.ts` — 新增 `signUpWithPassword`, `verifySignupCode`, `resendSignupCode`, `signInWithPassword`；`requestLoginCode` 改为 `shouldCreateUser: false`（仅忘记密码路径，不再创建新账号）
- `src/components/LoginFlow.tsx` — 全新 Stage 类型，新增 `EmailStep`（两个按钮）、`SetAccountPasswordStep`（账号密码+确认）、`LoginPasswordStep`（登录+忘记密码链接）、`CredentialGuide`（三密码说明底部弹窗）
