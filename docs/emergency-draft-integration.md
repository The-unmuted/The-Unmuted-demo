# Emergency-safe draft integration

This implementation is ready locally and cloud-compatible, but the demo does
not have a real signed-in identity. No cloud adapter is configured in the demo,
so draft ciphertext never leaves the device. Cloud sync can be enabled after
the official authentication and backend environments are selected and tested.

## What already works in the demo

1. Situation-record text is encrypted with the active vault master key after a
   650 ms debounce.
2. Ciphertext is committed to IndexedDB. No note text, situation type, or field
   label is placed in `localStorage`, a URL, analytics, or a notification.
3. Reloading or leaving the app does not remove the encrypted draft.
4. Re-entering the Evidence area shows a neutral recovery dialog. Content is
   decrypted only after the user chooses **Continue securely**.
5. Quick Exit clears the in-memory master key and live form state, marks the app
   for re-entry, and immediately uses `location.replace`. It never waits for a
   save or network request.
6. Finalizing the existing encrypted situation note removes its draft so the
   same content is not offered again as unfinished work.

## Official sign-in/cloud activation

1. Implement the authenticated REST contract in
   `docs/record-draft-cloud-api.md`. A Tencent CloudBase HTTP function is the
   recommended first option because the project already deploys its static
   frontend to CloudBase, but the client is not tied to that provider.
2. Replace the demo identity in `useEvidenceVault` with the stable account ID
   returned by the official sign-in system. `EvidencePage` already consumes
   `vault.userId`, so no recovery UI rewrite is required.
3. Keep the current two-layer model: account sign-in identifies the owner;
   vault password/recovery code unlocks the encryption key. Signing in alone
   must not reveal a draft.
4. Configure `createRestRecordDraftCloudAdapter(...)` only after sign-in can
   supply both the verified account ID and a short-lived access token. Then
   install it with `configureRecordDraftCloudAdapter(adapter)`.
5. Run the same-origin HTTPS app in staging. Test an offline edit, reconnect,
   sign out, sign in on a second device, unlock the vault, and recover.
6. Schedule a server-side job to remove expired drafts daily. The client queues
   expiry deletion, but server cleanup is still needed for users who never
   return.
7. Decide the production retention control (recommended default: 30 days) and
   add it to the future settings screen. The current service centralizes the
   default in `RECORD_DRAFT_RETENTION_MS`.

## Required pre-release checks

- Immediate Exit during typing never waits or fails to navigate.
- Latest fully completed autosave survives reload, crash, and offline mode.
- iOS Safari private mode reports a recoverable storage error rather than
  storing plaintext elsewhere.
- Android Chrome and desktop Chrome/Edge/Firefox/Safari can open IndexedDB and
  recover after a reload.
- A locked session can list neutral ciphertext metadata but cannot decrypt it.
- Wrong vault password and corrupted ciphertext do not overwrite the local copy.
- A newer edit made while an older cloud upload is in flight remains pending;
  the older upload cannot mark it synced.
- Permanent deletion removes the local encrypted copy and keeps an outbox
  tombstone until the authenticated cloud deletion succeeds.
- No simulator choice is included. Simulator privacy behavior remains
  unchanged unless the product later adds explicit opt-in consent.

## Known product decision still open

The demo has no settings page. Before launch, choose whether users may select:

- encrypted local-only drafts;
- encrypted local + cloud sync;
- autosave off;
- 7-day, 30-day, or user-triggered retention.

Until then, the prepared default is encrypted autosave, local-only, and 30-day
rolling retention. Installing an authenticated adapter automatically queues
eligible local-only ciphertext for sync after the identity matches.
