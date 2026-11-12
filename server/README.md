# Sandbox backend

Run from the project root with Node.js 24 or newer:

```sh
node server/index.mjs
node --test server/*.test.mjs
```

The local server defaults to `127.0.0.1:3000`; set `HOST=0.0.0.0` explicitly for container hosting. Restrict network access and configure authentication before exposing it. It serves `public/`, exposes `/api/snapshot` (`/api/state` alias), and accepts `/api/commands`. All monetary amounts are positive integer minor units; USD, EUR and GBP use cents/pence. Copy configuration names from `.env.example` into your process environment; the server does not parse dotenv files.

## Filesystem boundaries

- `engine.mjs`: platform core; no filesystem or network I/O. Uses only `node:crypto`, which requires Workers `nodejs_compat` when hosted.
- `store.mjs`: single-process local store with serialized commands and atomic snapshot replacement. State files are created with mode `0600`, directories `0700`, and fsynced before/after rename.
- `http.mjs`: local API/static serving with JSON body bounds, optional bearer token, same-origin browser mutations and no-store responses.
- `index.mjs`: loopback executable. Runtime data defaults to `.local/state.json`, outside tracked application source. Never commit that directory, local configuration, tokens or customer data.
- `*.test.mjs`: finance invariant, persistence/concurrency and HTTP integration tests.

A local store has **one writer process**. Do not start two servers against the same state file. The hosted Worker must use transactional storage or compare-and-swap revisions; memory-only state is not durable. Back up snapshots only after completed writes. The JSON model and ever-growing audit/idempotency history are intended for small sandbox datasets, not production banking scale.

## Test stablecoin

Mint allocates the source account's USD liability to a restricted reserve account and credits its owned mUSD tokens. Reserve dollars cannot also be spent as deposits. Burn requires sufficient owned tokens and returns USD to that holder's account. `tokenTransfer` moves ownership between the sandbox USD holders; supply and reserves stay unchanged. Loading or committing unbalanced currency totals, invalid token ownership/reserve totals or a broken SHA-256 block chain fails closed.

The chain is a **single-node hash-linked simulator**. It has no consensus, validator network, signatures, wallets, HSM or real tokens. The persisted file can be rewritten by its owner, so hash linkage does not establish external immutability.

## Adapter/live boundary

`BANKING_MODE` must equal `sandbox`; every other value fails startup. No SWIFT, FedNow, ACH, SEPA or card network is contacted. Payment settlement is an explicit sandbox command. ACH output is not a certified Nacha file generator. Review thresholds and explicit block flags exercise workflows; they do not constitute KYC, sanctions screening or legal compliance.

A live provider implementation requires a separate adapter with authenticated submission, network reference IDs, signed webhook validation, replay protection, retries and reconciliation. Never enable a fallback from a failed live adapter to simulated settlement. Production additionally requires regulated partners, per-tenant authorization, dual controls, external reserve evidence, protected key custody, independently reviewed accounting, operational security and applicable approvals. The environment example is a configuration seam, not a live switch.

## Open banking sandbox

Create consent with `consent` and then provide its ID as `X-Consent-ID` to `/api/open-banking/accounts` or `/api/open-banking/transactions`. Active, unexpired matching scopes are enforced. This is a workflow demonstration; it does not implement OAuth/OIDC, FAPI, client certificates or regulated consent certification. The administrative command endpoint controls all demo accounts and must never be exposed as a public customer API.
