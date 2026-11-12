# Running and extending the sandbox

The delivered project is intended to be easy to run as a **sandbox**. A runnable package, container or deployment configuration does not establish plug-and-play readiness for live banking.

## Filesystem layout

| Path | Responsibility |
| --- | --- |
| `public/` | Browser source assets; local public delivery boundary |
| `dist/` | Generated Worker deployment artifacts; ignored |
| `worker/` | Hosted API adapter with D1 optimistic concurrency |
| `db/migrations/` | Schema-only hosted database migrations |
| `server/` | Domain engine, persistence adapter, local HTTP entrypoint and tests |
| `docs/` | Architecture, API contract, threat model and release gates |
| `.openai/hosting.json` | Sites deployment identity/configuration; retain the actual assigned project ID |
| Runtime state directory | Writable sandbox state only; outside the static asset tree and excluded from source control |

Keep implementation source, build artifacts, runtime data and secrets separate. Do not serve the repository root. Do not place state files, environment files, test fixtures containing sensitive information, signing keys or database backups under `public/` or `dist/`. Restrict the state directory to the service account, use atomic writes, and retain a tested synthetic-data backup before destructive resets.

Use the repository's start/test commands and deployment files as the authoritative run instructions. The local server binds loopback by default. Set its supported authentication token before deliberately exposing it beyond a trusted local environment; the optional token is a sandbox access control, not a complete production identity system. Never put that token in browser bundles, URLs, logs or committed files. Hosted access and state storage can differ from local execution; verify the deployment's own persistence and access controls.

## Integration adapter contract

Production rail and custody adapters must be separate from simulator adapters and disabled until configured and certified. An unknown mode, missing secret, invalid credential, unsupported country/currency, unavailable provider, or failed compliance check must fail closed. Never fall back to a fake “settled” payment or synthetic reserve confirmation when a live provider call fails.

Each live adapter needs all of the following before activation:

- An explicit approved environment and endpoint; allowlisted products, currencies, countries and legal entities.
- Contract and partner identifiers, scoped credentials supplied by a secret manager, required certificates, credential expiry/rotation and emergency disable controls.
- A documented mapping between internal operation IDs and provider references; durable idempotency, timeout policy and status reconciliation.
- Signed/replay-resistant inbound callbacks and tested lifecycle transitions, including duplicates, returns, rejects and reversals.
- A named operational owner, certification evidence, monitoring thresholds, reconciliation source and incident runbook.

Production should reject startup or keep the affected capability disabled when required integration checks fail. This repository supplies simulated workflows; it does not supply approved live network adapters, partner agreements or certifications.

## Before a live release

Resolve every applicable item in [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md). Independently review the application, infrastructure, accounting and any contracts. Replace synthetic single-operator decisions with actual user identity and separation of duties. The simulator tracks token balances by account and requires sufficient tokens for a burn, but the single operator administers every account. Add legally established ownership, resource-owner authorization, redemption claims and reconciled independent chain supply before considering real token issuance.

Do not migrate demo balances into a live environment. Provision a separate live tenant, database, deployment, chain, keys, provider credentials and audit boundary. Import opening balances only through an approved, independently reconciled process with supporting evidence.
