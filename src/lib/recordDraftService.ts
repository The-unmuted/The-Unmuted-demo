/**
 * Encrypted situation-record drafts.
 *
 * Safety properties:
 * - plaintext exists only in React state and inside Web Crypto operations;
 * - IndexedDB and the cloud receive only AES-GCM ciphertext;
 * - local persistence finishes before any best-effort cloud request starts;
 * - failed/offline cloud operations remain in an IndexedDB outbox;
 * - the service never delays Quick Exit.
 *
 * The demo passes `demo-user` while no cloud adapter is installed, so it stays
 * local. The official sign-in layer can install an authenticated adapter later;
 * the service verifies the adapter identity before every cloud operation.
 */

import { openJson, sealJson } from "./keyVault";
import { getSessionMasterKey } from "./sessionKey";
import {
  getRecordDraftCloudAdapter,
  isRecordDraftCloudConfigured,
  type CloudRecordDraft,
} from "./recordDraftCloud";

export const RECORD_DRAFT_SCHEMA_VERSION = 1 as const;
export const RECORD_DRAFT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const DB_NAME = "the_unmuted_record_drafts";
const DB_VERSION = 1;
const DRAFT_STORE = "drafts";
const OUTBOX_STORE = "outbox";

export type RecordDraftSyncStatus = "local-only" | "pending" | "synced";

export type RecordDraftPayload = {
  schemaVersion: typeof RECORD_DRAFT_SCHEMA_VERSION;
  draftId: string;
  situationId: string;
  notes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type EncryptedRecordDraft = {
  localKey: string;
  draftId: string;
  userId: string;
  schemaVersion: typeof RECORD_DRAFT_SCHEMA_VERSION;
  ciphertext: string;
  ciphertextHash: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  syncStatus: RecordDraftSyncStatus;
};

export type RecordDraftSummary = Pick<
  EncryptedRecordDraft,
  "draftId" | "createdAt" | "updatedAt" | "expiresAt" | "syncStatus"
>;

type DraftOutboxOperation = {
  opKey: string;
  userId: string;
  draftId: string;
  kind: "upsert" | "delete";
  queuedAt: string;
};

type SaveDraftInput = {
  userId: string;
  draftId?: string;
  situationId: string;
  notes: Record<string, string | undefined>;
  createdAt?: string;
};

function makeLocalKey(userId: string, draftId: string): string {
  return `${userId}:${draftId}`;
}

function makeOutboxKey(userId: string, draftId: string): string {
  return `${userId}:${draftId}`;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb-request-failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("indexeddb-transaction-failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("indexeddb-transaction-aborted"));
  });
}

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        const drafts = db.createObjectStore(DRAFT_STORE, { keyPath: "localKey" });
        drafts.createIndex("by-user-updated", ["userId", "updatedAt"]);
        drafts.createIndex("by-expiry", "expiresAt");
      }
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = db.createObjectStore(OUTBOX_STORE, { keyPath: "opKey" });
        outbox.createIndex("by-user", "userId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("draft-db-open-failed"));
  });
}

async function getLocalDraft(userId: string, draftId: string): Promise<EncryptedRecordDraft | null> {
  const db = await openDraftDb();
  try {
    const transaction = db.transaction(DRAFT_STORE, "readonly");
    const result = await requestResult(
      transaction.objectStore(DRAFT_STORE).get(makeLocalKey(userId, draftId))
    );
    await transactionDone(transaction);
    return (result as EncryptedRecordDraft | undefined) ?? null;
  } finally {
    db.close();
  }
}

async function putLocalDraft(record: EncryptedRecordDraft): Promise<void> {
  const db = await openDraftDb();
  try {
    const transaction = db.transaction([DRAFT_STORE, OUTBOX_STORE], "readwrite");
    transaction.objectStore(DRAFT_STORE).put(record);
    transaction.objectStore(OUTBOX_STORE).put({
      opKey: makeOutboxKey(record.userId, record.draftId),
      userId: record.userId,
      draftId: record.draftId,
      kind: "upsert",
      queuedAt: new Date().toISOString(),
    } satisfies DraftOutboxOperation);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

async function queueLocalOnlyDraftsForCloud(userId: string): Promise<void> {
  const localOnlyDrafts = (await listLocalDrafts(userId)).filter(
    (record) => record.syncStatus === "local-only"
  );
  if (localOnlyDrafts.length === 0) return;

  const db = await openDraftDb();
  try {
    const transaction = db.transaction([DRAFT_STORE, OUTBOX_STORE], "readwrite");
    const drafts = transaction.objectStore(DRAFT_STORE);
    const outbox = transaction.objectStore(OUTBOX_STORE);
    const queuedAt = new Date().toISOString();
    for (const record of localOnlyDrafts) {
      drafts.put({ ...record, syncStatus: "pending" });
      outbox.put({
        opKey: makeOutboxKey(record.userId, record.draftId),
        userId: record.userId,
        draftId: record.draftId,
        kind: "upsert",
        queuedAt,
      } satisfies DraftOutboxOperation);
    }
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

async function markDraftSynced(userId: string, draftId: string, syncedRevision: number): Promise<void> {
  const current = await getLocalDraft(userId, draftId);
  // A newer local edit may have landed while this cloud request was in flight.
  // Never clear its outbox entry or incorrectly label it synced.
  if (!current || current.revision !== syncedRevision) return;
  const db = await openDraftDb();
  try {
    const transaction = db.transaction([DRAFT_STORE, OUTBOX_STORE], "readwrite");
    transaction.objectStore(DRAFT_STORE).put({ ...current, syncStatus: "synced" });
    transaction.objectStore(OUTBOX_STORE).delete(makeOutboxKey(userId, draftId));
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

async function queueDelete(userId: string, draftId: string): Promise<void> {
  const db = await openDraftDb();
  try {
    const transaction = db.transaction([DRAFT_STORE, OUTBOX_STORE], "readwrite");
    transaction.objectStore(DRAFT_STORE).delete(makeLocalKey(userId, draftId));
    transaction.objectStore(OUTBOX_STORE).put({
      opKey: makeOutboxKey(userId, draftId),
      userId,
      draftId,
      kind: "delete",
      queuedAt: new Date().toISOString(),
    } satisfies DraftOutboxOperation);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

async function removeOutboxOperation(userId: string, draftId: string): Promise<void> {
  const db = await openDraftDb();
  try {
    const transaction = db.transaction(OUTBOX_STORE, "readwrite");
    transaction.objectStore(OUTBOX_STORE).delete(makeOutboxKey(userId, draftId));
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

async function listOutbox(userId: string): Promise<DraftOutboxOperation[]> {
  const db = await openDraftDb();
  try {
    const transaction = db.transaction(OUTBOX_STORE, "readonly");
    const index = transaction.objectStore(OUTBOX_STORE).index("by-user");
    const result = await requestResult(index.getAll(IDBKeyRange.only(userId)));
    await transactionDone(transaction);
    return (result as DraftOutboxOperation[]).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  } finally {
    db.close();
  }
}

async function listLocalDrafts(userId: string): Promise<EncryptedRecordDraft[]> {
  const db = await openDraftDb();
  try {
    const transaction = db.transaction(DRAFT_STORE, "readonly");
    const index = transaction.objectStore(DRAFT_STORE).index("by-user-updated");
    const range = IDBKeyRange.bound([userId, ""], [userId, "\uffff"]);
    const result = await requestResult(index.getAll(range));
    await transactionDone(transaction);
    return (result as EncryptedRecordDraft[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally {
    db.close();
  }
}

function sanitizeNotes(notes: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(notes)
      .map(([field, value]) => [field, (value ?? "").slice(0, 20_000)])
      .filter(([, value]) => value.trim().length > 0)
  );
}

export function recordDraftHasContent(notes: Record<string, string | undefined>): boolean {
  return Object.values(notes).some((value) => (value ?? "").trim().length > 0);
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function encryptRecordDraftPayload(
  masterKey: CryptoKey,
  payload: RecordDraftPayload
): Promise<{ ciphertext: string; ciphertextHash: string }> {
  const ciphertext = await sealJson(masterKey, payload);
  return { ciphertext, ciphertextHash: await sha256Hex(ciphertext) };
}

export async function decryptRecordDraft(
  record: EncryptedRecordDraft,
  masterKey: CryptoKey = getSessionMasterKey() as CryptoKey
): Promise<RecordDraftPayload> {
  if (!masterKey) throw new Error("vault-locked");
  const actualHash = await sha256Hex(record.ciphertext);
  if (actualHash !== record.ciphertextHash) throw new Error("draft-integrity-check-failed");
  const payload = await openJson<RecordDraftPayload>(masterKey, record.ciphertext);
  if (payload.schemaVersion !== RECORD_DRAFT_SCHEMA_VERSION || payload.draftId !== record.draftId) {
    throw new Error("draft-schema-invalid");
  }
  return payload;
}

export async function saveEncryptedRecordDraft(input: SaveDraftInput): Promise<EncryptedRecordDraft> {
  const masterKey = getSessionMasterKey();
  if (!masterKey) throw new Error("vault-locked");
  const notes = sanitizeNotes(input.notes);
  if (Object.keys(notes).length === 0) throw new Error("empty-draft");

  const draftId = input.draftId ?? crypto.randomUUID();
  const existing = await getLocalDraft(input.userId, draftId);
  const now = new Date().toISOString();
  const createdAt = existing?.createdAt ?? input.createdAt ?? now;
  const payload: RecordDraftPayload = {
    schemaVersion: RECORD_DRAFT_SCHEMA_VERSION,
    draftId,
    situationId: input.situationId,
    notes,
    createdAt,
    updatedAt: now,
  };
  const encrypted = await encryptRecordDraftPayload(masterKey, payload);
  const record: EncryptedRecordDraft = {
    localKey: makeLocalKey(input.userId, draftId),
    draftId,
    userId: input.userId,
    schemaVersion: RECORD_DRAFT_SCHEMA_VERSION,
    ...encrypted,
    revision: (existing?.revision ?? 0) + 1,
    createdAt,
    updatedAt: now,
    expiresAt: new Date(Date.now() + RECORD_DRAFT_RETENTION_MS).toISOString(),
    syncStatus: isRecordDraftCloudConfigured() ? "pending" : "local-only",
  };

  await putLocalDraft(record);
  if (record.syncStatus === "local-only") {
    await removeOutboxOperation(record.userId, record.draftId);
  } else {
    void syncPendingRecordDrafts(record.userId).catch(() => undefined);
  }
  return record;
}

export async function listRecordDraftSummaries(userId: string): Promise<RecordDraftSummary[]> {
  await purgeExpiredRecordDrafts(userId);
  return (await listLocalDrafts(userId)).map(
    ({ draftId, createdAt, updatedAt, expiresAt, syncStatus }) => ({
      draftId,
      createdAt,
      updatedAt,
      expiresAt,
      syncStatus,
    })
  );
}

export async function loadEncryptedRecordDraft(
  userId: string,
  draftId: string
): Promise<EncryptedRecordDraft | null> {
  const record = await getLocalDraft(userId, draftId);
  if (!record) return null;
  if (Date.parse(record.expiresAt) <= Date.now()) {
    await deleteEncryptedRecordDraft(userId, draftId);
    return null;
  }
  return record;
}

export async function openEncryptedRecordDraft(userId: string, draftId: string): Promise<RecordDraftPayload> {
  const record = await loadEncryptedRecordDraft(userId, draftId);
  if (!record) throw new Error("draft-not-found");
  return decryptRecordDraft(record);
}

export async function deleteEncryptedRecordDraft(userId: string, draftId: string): Promise<void> {
  const current = await getLocalDraft(userId, draftId);
  await queueDelete(userId, draftId);
  if (!isRecordDraftCloudConfigured()) {
    // A draft that has never left this device needs no future tombstone. Keep
    // tombstones for pending/synced drafts so logout or a temporarily disabled
    // adapter cannot leave an old encrypted cloud copy behind.
    if (current?.syncStatus === "local-only") {
      await removeOutboxOperation(userId, draftId);
    }
    return;
  }
  void syncPendingRecordDrafts(userId).catch(() => undefined);
}

export async function purgeExpiredRecordDrafts(userId: string): Promise<void> {
  const expired = (await listLocalDrafts(userId)).filter(
    (record) => Date.parse(record.expiresAt) <= Date.now()
  );
  await Promise.all(expired.map((record) => deleteEncryptedRecordDraft(userId, record.draftId)));
}

async function authenticatedUserMatches(userId: string): Promise<boolean> {
  const adapter = getRecordDraftCloudAdapter();
  if (!adapter) return false;
  try {
    return (await adapter.getAuthenticatedUserId()) === userId;
  } catch {
    return false;
  }
}

function toCloudDraft(record: EncryptedRecordDraft): CloudRecordDraft {
  return {
    draftId: record.draftId,
    schemaVersion: record.schemaVersion,
    ciphertext: record.ciphertext,
    ciphertextHash: record.ciphertextHash,
    revision: record.revision,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    expiresAt: record.expiresAt,
  };
}

export async function syncPendingRecordDrafts(userId: string): Promise<number> {
  const adapter = getRecordDraftCloudAdapter();
  if (!adapter || !(await authenticatedUserMatches(userId))) return 0;
  // Drafts created before official sign-in was connected were deliberately
  // local-only. Queue them only after the adapter proves the same identity.
  await queueLocalOnlyDraftsForCloud(userId);
  const operations = await listOutbox(userId);
  let synced = 0;

  for (const operation of operations) {
    if (operation.kind === "delete") {
      try {
        await adapter.deleteDraft(operation.draftId);
      } catch {
        continue;
      }
      await removeOutboxOperation(userId, operation.draftId);
      synced += 1;
      continue;
    }

    const record = await getLocalDraft(userId, operation.draftId);
    if (!record) continue;
    try {
      await adapter.upsertDraft(toCloudDraft(record));
    } catch {
      continue;
    }
    await markDraftSynced(userId, record.draftId, record.revision);
    synced += 1;
  }
  return synced;
}

/**
 * Pull cloud ciphertext after sign-in/unlock. Pending local writes win so an
 * offline edit is never silently replaced by an older cloud copy.
 */
export async function pullRecordDraftsFromCloud(userId: string): Promise<number> {
  const adapter = getRecordDraftCloudAdapter();
  if (!adapter || !(await authenticatedUserMatches(userId))) return 0;
  await syncPendingRecordDrafts(userId);
  const pendingIds = new Set((await listOutbox(userId)).map((operation) => operation.draftId));
  let data: CloudRecordDraft[];
  try {
    data = await adapter.listDrafts();
  } catch {
    return 0;
  }

  let imported = 0;
  for (const row of data) {
    if (row.schemaVersion !== RECORD_DRAFT_SCHEMA_VERSION) continue;
    if (Date.parse(row.expiresAt) <= Date.now()) continue;
    const draftId = row.draftId;
    if (pendingIds.has(draftId)) continue;
    const local = await getLocalDraft(userId, draftId);
    const remoteUpdatedAt = row.updatedAt;
    if (local && Date.parse(local.updatedAt) >= Date.parse(remoteUpdatedAt)) continue;
    const record: EncryptedRecordDraft = {
      localKey: makeLocalKey(userId, draftId),
      userId,
      draftId,
      schemaVersion: RECORD_DRAFT_SCHEMA_VERSION,
      ciphertext: row.ciphertext,
      ciphertextHash: row.ciphertextHash,
      revision: row.revision,
      createdAt: row.createdAt,
      updatedAt: remoteUpdatedAt,
      expiresAt: row.expiresAt,
      syncStatus: "synced",
    };
    const db = await openDraftDb();
    try {
      const transaction = db.transaction(DRAFT_STORE, "readwrite");
      transaction.objectStore(DRAFT_STORE).put(record);
      await transactionDone(transaction);
    } finally {
      db.close();
    }
    imported += 1;
  }
  return imported;
}

export function registerRecordDraftOnlineSync(userId: string): () => void {
  const sync = () => void syncPendingRecordDrafts(userId).catch(() => undefined);
  window.addEventListener("online", sync);
  return () => window.removeEventListener("online", sync);
}
