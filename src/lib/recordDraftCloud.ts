/**
 * Provider-neutral cloud boundary for encrypted record drafts.
 *
 * The core draft service never imports an auth or database SDK. The official
 * sign-in layer installs one adapter after it can provide both a verified user
 * ID and a short-lived access token. Until then, drafts remain local-only.
 */

export type CloudRecordDraft = {
  draftId: string;
  schemaVersion: number;
  ciphertext: string;
  ciphertextHash: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export interface RecordDraftCloudAdapter {
  getAuthenticatedUserId(): Promise<string | null>;
  listDrafts(): Promise<CloudRecordDraft[]>;
  upsertDraft(draft: CloudRecordDraft): Promise<void>;
  deleteDraft(draftId: string): Promise<void>;
}

let activeAdapter: RecordDraftCloudAdapter | null = null;

export function configureRecordDraftCloudAdapter(
  adapter: RecordDraftCloudAdapter | null
): void {
  activeAdapter = adapter;
}

export function getRecordDraftCloudAdapter(): RecordDraftCloudAdapter | null {
  return activeAdapter;
}

export function isRecordDraftCloudConfigured(): boolean {
  return activeAdapter !== null;
}

type RestAdapterOptions = {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  getAuthenticatedUserId: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
};

type DraftListResponse = { drafts?: unknown };

function normalizeBaseUrl(input: string): string {
  const fallbackOrigin =
    typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const url = new URL(input, fallbackOrigin);
  const isLocal = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (url.protocol !== "https:" && !isLocal) {
    throw new Error("record-draft-api-must-use-https");
  }
  return url.toString().replace(/\/$/, "");
}

function isCloudRecordDraft(value: unknown): value is CloudRecordDraft {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.draftId === "string" &&
    row.draftId.length > 0 &&
    row.draftId.length <= 256 &&
    Number.isInteger(row.schemaVersion) &&
    typeof row.ciphertext === "string" &&
    row.ciphertext.length > 0 &&
    row.ciphertext.length <= 2_000_000 &&
    typeof row.ciphertextHash === "string" &&
    /^[0-9a-f]{64}$/i.test(row.ciphertextHash) &&
    Number.isInteger(row.revision) &&
    (row.revision as number) > 0 &&
    typeof row.createdAt === "string" &&
    row.createdAt.length <= 64 &&
    Number.isFinite(Date.parse(row.createdAt)) &&
    typeof row.updatedAt === "string" &&
    row.updatedAt.length <= 64 &&
    Number.isFinite(Date.parse(row.updatedAt)) &&
    typeof row.expiresAt === "string" &&
    row.expiresAt.length <= 64 &&
    Number.isFinite(Date.parse(row.expiresAt))
  );
}

/**
 * Adapter for an authenticated HTTPS endpoint, suitable for Tencent CloudBase
 * HTTP functions or another first-party API. The server derives ownership from
 * the bearer token; a user ID is never accepted in a URL or request body.
 */
export function createRestRecordDraftCloudAdapter({
  baseUrl,
  getAccessToken,
  getAuthenticatedUserId,
  fetchImpl = fetch,
}: RestAdapterOptions): RecordDraftCloudAdapter {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  const request = async (path: string, init?: RequestInit): Promise<Response> => {
    const token = await getAccessToken();
    if (!token) throw new Error("record-draft-cloud-unauthorized");
    const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
      ...init,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("record-draft-cloud-unauthorized");
      }
      throw new Error(`record-draft-cloud-${response.status}`);
    }
    return response;
  };

  return {
    getAuthenticatedUserId,
    async listDrafts() {
      const response = await request("/v1/record-drafts");
      const payload = (await response.json()) as DraftListResponse;
      if (!Array.isArray(payload.drafts)) throw new Error("record-draft-cloud-invalid-response");
      return payload.drafts.filter(isCloudRecordDraft);
    },
    async upsertDraft(draft) {
      await request(`/v1/record-drafts/${encodeURIComponent(draft.draftId)}`, {
        method: "PUT",
        body: JSON.stringify(draft),
      });
    },
    async deleteDraft(draftId) {
      await request(`/v1/record-drafts/${encodeURIComponent(draftId)}`, {
        method: "DELETE",
      });
    },
  };
}
