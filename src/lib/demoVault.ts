/**
 * DEMO-ONLY vault backend (hackathon-demo branch).
 *
 * Replaces `evidenceVaultService` (Supabase-backed) with an IndexedDB-only
 * store that runs everything the production code does — client-side
 * AES-256-GCM encryption, sealed per-record metadata, wrapped file keys —
 * except that:
 *   1) the master key is HARDCODED so any judge can decrypt on any device;
 *   2) no Supabase call is ever made (no accounts, no network dependency);
 *   3) two demo records are seeded on first load;
 *   4) the "vault password" gate accepts only "123456" (flow simulation).
 *
 * The entire demo build is intentionally public — this file must not be
 * copy-pasted into the production branch under any circumstance.
 */

import { encryptFile, type EncryptionResult } from "./evidenceCrypto";
import { sealJson, openJson } from "./keyVault";
import { setSessionMasterKey, getSessionMasterKey } from "./keyVaultService";

// Re-export types so `useEvidenceVault` doesn't need to import from two places.
export type {
  EvidenceMeta,
  EvidenceRecord,
  DeletedEvidenceRecord,
  SyncStatus,
  SaveEvidenceOptions,
} from "./evidenceVaultService";
export { generateTxId } from "./evidenceVaultService";
export const DELETE_RETENTION_MS = 72 * 60 * 60 * 1000;

import type {
  EvidenceMeta,
  EvidenceRecord,
  DeletedEvidenceRecord,
  SaveEvidenceOptions,
  SyncStatus,
} from "./evidenceVaultService";
import { generateTxId } from "./evidenceVaultService";

export const DEMO_USER_ID = "demo-user";
export const DEMO_PASSWORD = "123456";

// ── Hardcoded demo master key ───────────────────────────────────────────────
// 32 bytes of a well-known value. Insecure by design — the demo is public.
const DEMO_MASTER_KEY_RAW = new Uint8Array([
  0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae,
  0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae, 0xae,
]);

let cachedDemoKey: CryptoKey | null = null;
async function getDemoMasterKey(): Promise<CryptoKey> {
  if (cachedDemoKey) return cachedDemoKey;
  cachedDemoKey = await crypto.subtle.importKey(
    "raw",
    DEMO_MASTER_KEY_RAW as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedDemoKey;
}

/** Verify the demo vault password. Only "123456" is accepted. */
export async function verifyDemoPassword(password: string): Promise<boolean> {
  if (password.trim() !== DEMO_PASSWORD) return false;
  const key = await getDemoMasterKey();
  setSessionMasterKey(key);
  return true;
}

/** Initialise the session master key so upload works without any password. */
export async function initDemoSessionKey(): Promise<void> {
  const key = await getDemoMasterKey();
  setSessionMasterKey(key);
}

// ── IndexedDB store (piggybacks on the-unmuted_vault DB) ────────────────────

const DB_NAME = "the_unmuted_vault";
const DB_VERSION = 2;
const BLOB_STORE = "encrypted_files";
const RECORD_STORE = "demo_records";
const DELETED_STORE = "demo_deleted";
const META_STORE = "demo_meta";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE, { keyPath: "txId" });
      if (!db.objectStoreNames.contains(RECORD_STORE)) db.createObjectStore(RECORD_STORE, { keyPath: "txId" });
      if (!db.objectStoreNames.contains(DELETED_STORE)) db.createObjectStore(DELETED_STORE, { keyPath: "txId" });
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

interface StoredDemoRecord {
  txId: string;
  wrappedFileKey: string;   // sealed by demo master key
  encryptedMeta: string;    // sealed by demo master key
  originalHash: string;
  encryptedHash: string;
  captureGrade: 1 | 2;
  clientTime: string;
  serverTime: string;       // demo: always set to clientTime
  deletedAt?: string;
}

async function putBlob(txId: string, blob: Blob): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(BLOB_STORE, "readwrite");
  await run(tx.objectStore(BLOB_STORE).put({ txId, blob }));
  await new Promise<void>((r) => (tx.oncomplete = () => r()));
}

async function getBlob(txId: string): Promise<Blob | null> {
  const db = await openDB();
  const tx = db.transaction(BLOB_STORE, "readonly");
  const rec = (await run(tx.objectStore(BLOB_STORE).get(txId))) as { txId: string; blob: Blob } | undefined;
  return rec?.blob ?? null;
}

async function deleteBlob(txId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(BLOB_STORE, "readwrite");
  await run(tx.objectStore(BLOB_STORE).delete(txId));
  await new Promise<void>((r) => (tx.oncomplete = () => r()));
}

async function putRecord(store: string, rec: StoredDemoRecord): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(store, "readwrite");
  await run(tx.objectStore(store).put(rec));
  await new Promise<void>((r) => (tx.oncomplete = () => r()));
}

async function listRecords(store: string): Promise<StoredDemoRecord[]> {
  const db = await openDB();
  const tx = db.transaction(store, "readonly");
  return (await run(tx.objectStore(store).getAll())) as StoredDemoRecord[];
}

async function deleteRecord(store: string, txId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(store, "readwrite");
  await run(tx.objectStore(store).delete(txId));
  await new Promise<void>((r) => (tx.oncomplete = () => r()));
}

async function getMeta(key: string): Promise<string | null> {
  const db = await openDB();
  const tx = db.transaction(META_STORE, "readonly");
  const rec = (await run(tx.objectStore(META_STORE).get(key))) as { key: string; value: string } | undefined;
  return rec?.value ?? null;
}

async function setMeta(key: string, value: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(META_STORE, "readwrite");
  await run(tx.objectStore(META_STORE).put({ key, value }));
  await new Promise<void>((r) => (tx.oncomplete = () => r()));
}

// ── Public API (mirrors evidenceVaultService) ───────────────────────────────

export async function saveEvidence(
  _userId: string,
  enc: EncryptionResult,
  opts: SaveEvidenceOptions = {}
): Promise<EvidenceRecord> {
  const masterKey = getSessionMasterKey();
  if (!masterKey) throw new Error("vault-locked");
  const txId = generateTxId();
  const clientTime = new Date().toISOString();

  const meta: EvidenceMeta = {
    fileName: opts.fileName,
    mimeType: opts.mimeType ?? "application/octet-stream",
    originalSize: enc.originalSize,
    note: opts.note,
    capturedAt: opts.capturedAt,
    location: opts.location,
    deviceInfo: opts.deviceInfo,
  };

  const [wrappedFileKey, encryptedMeta] = await Promise.all([
    sealJson(masterKey, { key: enc.exportedKey, iv: enc.ivHex }),
    sealJson(masterKey, meta),
  ]);

  await putBlob(txId, enc.encryptedBlob);
  await putRecord(RECORD_STORE, {
    txId,
    wrappedFileKey,
    encryptedMeta,
    originalHash: enc.originalHash,
    encryptedHash: enc.encryptedHash,
    captureGrade: opts.captureGrade ?? 2,
    clientTime,
    serverTime: clientTime,
  });

  return {
    txId,
    wrappedFileKey,
    encryptedMeta,
    meta,
    originalHash: enc.originalHash,
    encryptedHash: enc.encryptedHash,
    captureGrade: opts.captureGrade ?? 2,
    clientTime,
    serverTime: clientTime,
    syncStatus: "synced" as SyncStatus,
  };
}

export async function syncPendingEvidence(_userId: string): Promise<number> {
  return 0; // demo has no cloud sync
}

export async function listEvidence(_userId: string): Promise<EvidenceRecord[]> {
  const masterKey = getSessionMasterKey();
  if (!masterKey) throw new Error("vault-locked");
  const records = await listRecords(RECORD_STORE);
  const decrypted: EvidenceRecord[] = [];
  for (const r of records) {
    try {
      const meta = await openJson<EvidenceMeta>(masterKey, r.encryptedMeta);
      decrypted.push({
        txId: r.txId,
        wrappedFileKey: r.wrappedFileKey,
        encryptedMeta: r.encryptedMeta,
        meta,
        originalHash: r.originalHash,
        encryptedHash: r.encryptedHash,
        captureGrade: r.captureGrade,
        clientTime: r.clientTime,
        serverTime: r.serverTime,
        syncStatus: "synced",
      });
    } catch {
      // skip records we can't decrypt (shouldn't happen in demo)
    }
  }
  return decrypted.sort((a, b) => b.clientTime.localeCompare(a.clientTime));
}

const PLACEHOLDER: EvidenceMeta = {
  fileName: undefined,
  mimeType: "application/octet-stream",
  originalSize: 0,
};

export async function listEvidencePartial(_userId: string): Promise<EvidenceRecord[]> {
  const records = await listRecords(RECORD_STORE);
  return records
    .map((r) => ({
      txId: r.txId,
      wrappedFileKey: r.wrappedFileKey,
      encryptedMeta: r.encryptedMeta,
      meta: PLACEHOLDER,
      originalHash: r.originalHash,
      encryptedHash: r.encryptedHash,
      captureGrade: r.captureGrade,
      clientTime: r.clientTime,
      serverTime: r.serverTime,
      syncStatus: "synced" as SyncStatus,
      metaDecrypted: false,
    }))
    .sort((a, b) => b.clientTime.localeCompare(a.clientTime));
}

export async function openEvidenceFile(_userId: string, record: EvidenceRecord): Promise<Blob> {
  const masterKey = getSessionMasterKey();
  if (!masterKey) throw new Error("vault-locked");
  const blob = await getBlob(record.txId);
  if (!blob) throw new Error("blob-not-found");
  const wrapped = await openJson<{ key: string; iv: string }>(masterKey, record.wrappedFileKey);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { decryptFile } = await import("./evidenceCrypto");
  return decryptFile(bytes, wrapped.key, wrapped.iv, record.meta.mimeType);
}

export async function deleteEvidence(_userId: string, record: EvidenceRecord): Promise<void> {
  const now = new Date().toISOString();
  const records = await listRecords(RECORD_STORE);
  const rec = records.find((r) => r.txId === record.txId);
  if (!rec) return;
  await putRecord(DELETED_STORE, { ...rec, deletedAt: now });
  await deleteRecord(RECORD_STORE, record.txId);
}

export async function purgeExpiredEvidence(_userId: string): Promise<void> {
  const cutoff = Date.now() - DELETE_RETENTION_MS;
  const deleted = await listRecords(DELETED_STORE);
  for (const r of deleted) {
    if (r.deletedAt && new Date(r.deletedAt).getTime() < cutoff) {
      await deleteRecord(DELETED_STORE, r.txId);
      await deleteBlob(r.txId);
    }
  }
}

export async function listDeletedEvidence(_userId: string): Promise<DeletedEvidenceRecord[]> {
  const masterKey = getSessionMasterKey();
  if (!masterKey) throw new Error("vault-locked");
  const records = await listRecords(DELETED_STORE);
  const out: DeletedEvidenceRecord[] = [];
  for (const r of records) {
    if (!r.deletedAt) continue;
    try {
      const meta = await openJson<EvidenceMeta>(masterKey, r.encryptedMeta);
      out.push({
        txId: r.txId,
        wrappedFileKey: r.wrappedFileKey,
        encryptedMeta: r.encryptedMeta,
        meta,
        originalHash: r.originalHash,
        encryptedHash: r.encryptedHash,
        captureGrade: r.captureGrade,
        clientTime: r.clientTime,
        serverTime: r.serverTime,
        syncStatus: "synced",
        deletedAt: r.deletedAt,
      });
    } catch {
      // skip
    }
  }
  return out.sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
}

export async function restoreEvidence(txId: string): Promise<boolean> {
  const deleted = await listRecords(DELETED_STORE);
  const rec = deleted.find((r) => r.txId === txId);
  if (!rec) return false;
  const { deletedAt: _drop, ...restored } = rec;
  void _drop;
  await putRecord(RECORD_STORE, restored);
  await deleteRecord(DELETED_STORE, txId);
  return true;
}

// ── Seed demo records on first entry ────────────────────────────────────────

const SEEDED_KEY = "demo_seeded_v1";

/** Build a small placeholder PNG (100x100 solid color with text label) via canvas. */
async function buildPlaceholderImage(label: string, color: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px -apple-system, PingFang SC, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("非默 · DEMO 示例证据", canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "16px -apple-system, PingFang SC, sans-serif";
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 20);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

/** Build a valid 3-second silent WAV. */
function buildSilentWav(seconds: number): Blob {
  const sampleRate = 8000;
  const numSamples = sampleRate * seconds;
  const buf = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buf);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);
  return new Blob([buf], { type: "audio/wav" });
}

export async function seedDemoRecordsIfEmpty(): Promise<void> {
  if ((await getMeta(SEEDED_KEY)) === "1") return;
  const masterKey = getSessionMasterKey();
  if (!masterKey) throw new Error("session master key not set — call initDemoSessionKey first");

  const seeds: Array<{ blob: Blob; opts: SaveEvidenceOptions; grade: 1 | 2 }> = [
    {
      blob: await buildPlaceholderImage("现场取证 · 楼道门口", "#4a5b8f"),
      opts: {
        fileName: "示例证据_楼道门口.png",
        mimeType: "image/png",
        captureGrade: 1,
        capturedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        note: "这是一条 Demo 示例证据（现场取证徽章）。你可以直接点击「解锁查看」和「导出举证包」体验完整流程。",
        deviceInfo: "Demo Environment",
      },
      grade: 1,
    },
    {
      blob: buildSilentWav(3),
      opts: {
        fileName: "示例证据_环境录音.wav",
        mimeType: "audio/wav",
        captureGrade: 2,
        capturedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        note: "这是一条 Demo 示例证据（事后导入徽章，静音占位音频）。",
        deviceInfo: "Demo Environment",
      },
      grade: 2,
    },
  ];

  for (const s of seeds) {
    const enc = await encryptFile(s.blob, s.opts.mimeType ?? "application/octet-stream");
    await saveEvidence(DEMO_USER_ID, enc, s.opts);
  }

  await setMeta(SEEDED_KEY, "1");
}
