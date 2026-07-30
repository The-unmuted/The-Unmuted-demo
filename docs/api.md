# API Reference — The Unmuted (非默)

External services, environment-variable-driven integrations, and key internal APIs.

_Last full revision: 2026-07-30 (post-D-029 — wallet/Privy/Gun/Arweave sections removed with the code)._

---

## External Services

### Supabase

**URL:** `https://iisjendxxmxpgwohckiq.supabase.co`  
**Auth:** anon key (`VITE_SUPABASE_ANON_KEY`)  
**Client:** `@supabase/supabase-js` v2 (single shared client: `src/lib/supabaseClient.ts`)

#### Auth

Email OTP (6-digit, template `{{ .Token }}`). Accounts exist for cross-device recovery only — the server never receives passwords or plaintext evidence. Built-in SMTP is rate-limited (~4 emails/hour); custom SMTP deferred until an owned domain exists (post-entity).

#### Tables

| Table | Usage | Access |
|-------|-------|--------|
| `key_vaults` | Per-user encrypted key boxes (password box + recovery box, ciphertext) | Upsert + Read by owner (RLS) |
| `evidence_records` | Encrypted evidence index (sealed metadata; plaintext columns only for `original_hash` + timestamps, by design for future TSA anchoring) | Insert + Read + Delete by owner (RLS) |
| `ngo_applications` / `ngo_organizations` | NGO directory + new applications | Read (directory) + Insert (apply) |
| `unmuted_feedback` | User feedback submissions | Insert only |

#### Storage

Bucket `evidence-vault` — **private**, per-user paths `{uid}/{txId}`, RLS-gated download. All blobs are AES-256-GCM ciphertext; the bucket never sees plaintext.

---

### ChainMaker (长安链) — legacy path

**Status:** retired from UI copy (Phase 4a, 2026-07-08); the code path survives only for legacy records and runs in deterministic simulation without credentials. Any productionisation must move the call server-side (`VITE_CHAINMAKER_API_KEY` is browser-visible — see CLAUDE.md rule 3).

**Endpoint:** `https://baas.chainmaker.org.cn/v1/contract/invoke` (`VITE_CHAINMAKER_ENDPOINT`, `VITE_CHAINMAKER_API_KEY`)  
`code !== 0` or any fetch error → `simulateAnchor()` (deterministic, `isSimulated: true`).

The real timestamping plan is RFC 3161 TSA after entity registration; `original_hash` + dual timestamps are stored plaintext precisely so old records can be anchored retroactively.

---

### Tencent CloudBase (Deploy)

**Region:** `ap-shanghai`  
**Bucket:** `45b6-static-theunmuted-v2-d2gyh0rux2a05de92-1434116173`  
**SDK:** `cos-nodejs-sdk-v5` (multipart upload, 1MB slices)  
**Auth:** `TENCENT_SECRET_ID` + `TENCENT_SECRET_KEY` (CI secrets, The-Unmuted-v2 repo only)  
**Deploy script:** `deploy-cloudbase.mjs`  
**Note:** static COS hosting cannot send custom response headers — the CSP/security headers in `vercel.json` apply to the Vercel deployment only (revisit at D-016 migration).

---

## Key Internal APIs

### `copyFor(language, english, chinese)` — `src/lib/locale.tsx`

The i18n utility. Every visible string must go through this.

```ts
copyFor(language, "Save contact", "保存联系人")
```

### Key vault — `src/lib/keyVault.ts` + `src/lib/keyVaultService.ts` (D-017/D-027)

```ts
// keyVault.ts (pure crypto)
setupKeyVault(password, recoveryCode)      // → { masterKey, passwordBox, recoveryBox } (Argon2id, KeyBoxV2)
openWithPassword(password, box)            // → CryptoKey (throws on wrong secret)
openWithRecoveryCode(code, box)
rewrapBoxVerified(masterKey, secret)       // verify-then-replace: proves the new box opens before returning
sealJson(obj, masterKey) / openJson(...)   // AES-GCM envelope for metadata

// keyVaultService.ts (persistence + session)
createVault(userId, password)              // → { masterKey, recoveryCode } — code shown EXACTLY ONCE
unlockWithPassword(userId, password)       // → { ok } | { ok:false, reason: "vault-unavailable" | "wrong-secret" }
unlockWithRecoveryCode(userId, code, newPassword)
changePassword(userId, newPassword)
getSessionMasterKey() / setSessionMasterKey(key | null)  // memory only; cleared on logout, reload, auto-lock
```

Legacy PBKDF2 (v1) boxes auto-migrate to Argon2id in the background after a successful unlock (verify-then-replace — a failed migration can never lock a user out).

### `checkPassword(password)` — `src/lib/passwordPolicy.ts` (D-027)

Returns a `PasswordIssue` (`too-short` | `common` | `all-digits` | `repeated`) or `null`; `passwordIssueCopy(language, issue)` renders the bilingual error. Enforced at vault setup, recovery reset, and password change.

### `useAutoLock(enabled, onLock)` — `src/hooks/useAutoLock.ts` (D-029)

Re-locks the vault after 10 min without interaction or on returning from ≥3 min in the background (`visibilitychange` timestamp check — background timers are throttled on mobile). `Index.tsx` clears the session master key and shows a bilingual notice; the account session survives.

### `useEvidenceVault(language)` — `src/hooks/useEvidenceVault.ts`

```ts
const {
  step,          // 'idle' | 'encrypting' | 'uploading' | 'done' | 'error'
  steps,         // per-step status: pending | running | done | error
  error,         // string | null
  result,        // upload receipt for the just-processed file
  history,       // cloud records (encrypted index, decrypted client-side)
  legacyHistory, // read-only pre-D-017 records (need the user's old key file)
  userId,
  canUseVault,   // account + unlocked master key present
  processFile,   // (blob, mimeType, origin) => Promise<void> — encrypt+hash at capture instant
  openFile,      // decrypt for in-app viewing (per-action password re-verify handled by UI, D-025)
  deleteRecord,  // 72h soft delete (D-022)
  refreshHistory,
  syncNow,       // retry the offline pending queue
  reset,
} = useEvidenceVault(language);
```

### `buildCourtPackage(record, ...)` — `src/lib/evidenceExport.ts` (D-020)

One-tap 导出举证包: plain ZIP with the decrypted original + sealed metadata + hashes + a self-contained bilingual verification HTML (certutil/shasum instructions, per-scenario legal guidance). Verifiable without this app existing.

### `useZKPIdentity()` — `src/hooks/useZKPIdentity.ts`

```ts
const { identity, alias, shortCommit, verified, generating,
        generateFromEmail, verify, revoke } = useZKPIdentity();
```

### `useEmergencyContacts()` — `src/hooks/useEmergencyContacts.ts`

```ts
const { contacts, addContact, removeContact } = useEmergencyContacts();
// on-device only — never uploaded (CLAUDE.md rule 1)
```

### Aid directory — `src/lib/aidDirectory.ts` (D-026)

Typed loader/filters for `src/data/aidDirectory.json` (situation tags, city filter, `verifiedAt` staleness). Weekly CI source monitoring: `scripts/verify-directory.mjs`.

---

## localStorage Keys

| Key | Content |
|-----|---------|
| `the-unmuted-language` | `"en"` or `"zh"` |
| `unmuted_zkp_identity` | ZKP commitment JSON |
| `unmuted_pwd_{email}` | bcrypt password hash (legacy local accounts) |
| `unmuted_emergency_contacts` | emergency contacts (on-device by design) |
| `unmuted_sos_message` | SOS SMS template string |
| `unmuted_key_boxes_{userId}` | encrypted key boxes mirror (ciphertext — safe to cache) |
| `unmuted_key_boxes_dirty_{userId}` | flag: boxes await cloud re-sync |
| `unmuted_evidence_index_{userId}` | encrypted evidence index mirror |
| `unmuted_evidence_pending_{userId}` | offline pending-upload queue |
| `the_unmuted_vault_records` | legacy (pre-D-017) vault records, read-only |
| `the_unmuted_sos_history` | SOS trigger history |
| `the_unmuted_encrypted_report_notes` | encrypted report notes |
| `unmuted_zone_reports` | geo alert records (localStorage only) |
