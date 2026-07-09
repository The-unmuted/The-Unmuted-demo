# API Reference — The Unmuted (非默)

External services, environment-variable-driven integrations, and key internal APIs.

---

## External Services

### Supabase

**URL:** `https://iisjendxxmxpgwohckiq.supabase.co`  
**Auth:** anon key (`VITE_SUPABASE_ANON_KEY`)  
**Client:** `@supabase/supabase-js` v2

#### Tables

| Table | Usage | Access |
|-------|-------|--------|
| `ngo_applications` | NGO directory listings + new applications | Read (directory) + Insert (apply) |
| `evidence_vault` | Encrypted evidence metadata | Insert + Read by user |
| `feedback` | User feedback submissions | Insert only |

RLS (Row Level Security) is enabled. Anon key has restricted access.

---

### Privy (Email OTP)

**SDK:** `@privy-io/react-auth`  
**Config env:** `VITE_PRIVY_APP_ID`  
**Mode:** Email OTP only (`loginMethods: ["email"]`)  
**Appearance:** theme `#fff7fb`, accent `#c65f9f`

Without `VITE_PRIVY_APP_ID`, the `PrivyAuthProvider` renders a no-op fallback — the app uses local bcrypt auth only.

---

### ChainMaker (长安链)

**SDK:** Direct REST via `fetch`  
**Default endpoint:** `https://baas.chainmaker.org.cn/v1/contract/invoke`  
**Config env:** `VITE_CHAINMAKER_API_KEY`, `VITE_CHAINMAKER_ENDPOINT`  
**Explorer:** `https://testnet.chainmaker.org.cn/explorer/tx/<txHash>`

#### Anchor request

```json
POST /v1/contract/invoke
Authorization: Bearer <VITE_CHAINMAKER_API_KEY>
Content-Type: application/json

{
  "chain_id":      "chain1",
  "contract_name": "evidence_store",
  "method":        "save_hash",
  "kvs": [
    { "key": "file_hash",    "value": "<encryptedHash>" },
    { "key": "arweave_txid", "value": "<arweaveTxId>" },
    { "key": "timestamp",    "value": "<milliseconds>" }
  ]
}
```

#### Response

```json
{
  "code": 0,
  "data": {
    "tx_id": "<txHash>",
    "block_timestamp": 1720000000
  }
}
```

`code !== 0` or any fetch error → falls back to `simulateAnchor()` (deterministic, `isSimulated: true`).

---

### Arweave (Demo Vault)

`src/lib/arweaveService.ts` — demo implementation.  
Uploads encrypted blobs to an Arweave-compatible gateway.  
In production, a funded Arweave wallet and real gateway URL are required.

---

### Gun.js (P2P Chat)

**Package:** `gun`  
**Room structure:** `gun.get('the-unmuted-room-<roomCode>').get('messages')`  
**TTL:** 2 hours (client-side, not enforced by Gun)  
**Note:** Gun.js uses shared public relay nodes — not private. Demo only.

---

### Tencent CloudBase (Deploy)

**Region:** `ap-shanghai`  
**Bucket:** `45b6-static-theunmuted-v2-d2gyh0rux2a05de92-1434116173`  
**SDK:** `cos-nodejs-sdk-v5`  
**Auth:** `TENCENT_SECRET_ID` + `TENCENT_SECRET_KEY` (CI secrets)  
**Deploy script:** `deploy-cloudbase.mjs`

---

## Key Internal APIs

### `copyFor(language, english, chinese)` — `src/lib/locale.tsx`

The i18n utility. Every visible string must go through this.

```ts
copyFor(language, "Save contact", "保存联系人")
```

### `encryptFile(blob, mimeType)` — `src/lib/evidenceCrypto.ts`

```ts
interface EncryptionResult {
  encryptedBlob: Blob;
  ivHex: string;
  exportedKey: JsonWebKey;
  originalHash: string;   // SHA-256 of plaintext
  encryptedHash: string;  // SHA-256 of encrypted blob (goes on-chain)
  mimeType: string;
  originalSize: number;
}
```

### `anchorOnChain(encryptedHash, arweaveTxId)` — `src/lib/chainmakerService.ts`

```ts
interface AnchorResult {
  txHash: string;
  blockTimestamp: number;
  explorerUrl: string;
  isSimulated: boolean;   // true if ChainMaker key not set or request failed
  network: string;
}
```

### `useEvidenceVault(language)` — `src/hooks/useEvidenceVault.ts`

```ts
const {
  step,        // 'idle' | 'encrypting' | 'uploading' | 'anchoring' | 'done' | 'error'
  steps,       // per-step status: pending | running | done | error
  error,       // string | null
  result,      // { record: VaultRecord, encryptionResult: EncryptionResult } | null
  history,     // VaultRecord[]
  processFile, // (blob: Blob, mimeType: string) => Promise<void>
  downloadKey, // () => void — triggers JSON key bundle download
  reset,       // () => void
} = useEvidenceVault(language);
```

### `useZKPIdentity()` — `src/hooks/useZKPIdentity.ts`

```ts
const {
  identity,            // ZKPCommitment | null
  alias,               // human-readable alias derived from nullifier
  shortCommit,         // short commitment string for display
  verified,            // boolean | null
  generating,          // boolean
  generateFromEmail,   // (email, credential, verified) => Promise<void>
  verify,              // () => Promise<boolean>
  revoke,              // () => void — clears identity from localStorage
} = useZKPIdentity();
```

### `useEmergencyContacts()` — `src/hooks/useEmergencyContacts.ts`

```ts
const {
  contacts,      // { id, name, phone }[]
  addContact,    // (name, phone) => void
  removeContact, // (id) => void
} = useEmergencyContacts();
```

### `sendMessage / subscribeRoom` — `src/lib/p2pChat.ts`

```ts
sendMessage(roomCode: string, alias: string, text: string): Promise<void>

subscribeRoom(
  roomCode: string,
  selfAlias: string,
  onMessage: (msg: ChatMessage) => void
): () => void  // unsubscribe function
```

---

## localStorage Keys

| Key | Content |
|-----|---------|
| `the-unmuted-language` | `"en"` or `"zh"` |
| `the-unmuted-identity` | `ZKPCommitment` JSON |
| `the-unmuted-pw-{email}` | bcrypt password hash |
| `the-unmuted-contacts` | `EmergencyContact[]` JSON |
| `the-unmuted-sos-message` | SOS SMS template string |
| `the-unmuted-vault` | `VaultRecord[]` JSON |
| `the-unmuted-geo-alerts` | geo alert records |
