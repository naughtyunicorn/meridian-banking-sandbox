# Meridian banking sandbox

Runnable U.S. and international banking operations sandbox. All balances, payments, cards, reserve assets and tokens are synthetic. No network or banking provider credentials are needed. **This is not a live banking service, regulated stablecoin issuer, or certified payment connector.**

## Start

Node.js 24, no package installation:

```sh
npm test
npm start
```

Open http://127.0.0.1:3000. Synthetic USD/EUR/GBP balances are seeded automatically. State persists in `.local/state.json`; keep one Node process per state file. For Docker, run `docker compose up --build` (Docker deployment configuration provided; Docker build not validated in this workspace).

Configuration is documented in `.env.example`; copy it to `.env` and start with `node --env-file=.env server/index.mjs` if needed. Defaults already work. Local server binds loopback; Docker explicitly opts into `0.0.0.0` inside the container and exposes loopback on the host. `BANKING_MODE=live` fails closed.

## Try it

1. Transfer USD between operating and customer accounts; check paired journal entries.
2. Queue an ACH or SWIFT simulation. High-value payments enter compliance review. Approve or reject a review, then simulate settlement.
3. Mint mUSD: spendable USD is reclassified into restricted reserves, and tokens are credited to that account's holder balance. Burn only owned tokens to redeem.
4. Freeze a virtual test card; an authorization must fail while frozen.
5. Create a scoped, expiring sandbox consent; use it on the open-banking demo endpoint. This models consent controls, not OAuth/FAPI certification.

Amounts use integer minor units; no implicit FX or aggregation across currencies. The chain is a single-node SHA-256 event simulator, with no consensus, wallet signing, or independent validators.

## Repository layout

| Path | Purpose |
| --- | --- |
| `server/engine.mjs` | Domain rules, double-entry journal, reserves, token ownership, workflows |
| `server/store.mjs` | Serialized, atomic file persistence for local sandbox |
| `server/http.mjs` | Local HTTP API and static serving |
| `public/` | Browser console source; no build dependencies |
| `worker/` | Private Sites adapter, D1 optimistic concurrency, checksum portability |
| `db/migrations/` | Schema-only D1 SQL and migration metadata |
| `scripts/build.mjs` | Deterministic self-contained Worker artifact |
| `.openai/hosting.json` | Sites identity and hosting bindings |
| `.github/workflows/ci.yml` | Tests and build on push/pull request |
| `docs/` | Architecture, threat model, operations, readiness gates, OpenAPI |
| `dist/` | Generated deployment output; ignored |
| `.local/`, `data/`, `work/` | Ignored runtime data and scratch files |

`npm run build` emits `dist/server/index.js` and hosting/migration files. Hosted state uses a private Sites D1 binding with compare-and-swap updates; missing storage fails closed. Sites dispatch provides visitor identity. Do not expose the Worker directly or treat identity headers supplied by arbitrary callers as authentication.

## From sandbox to live

Read [production readiness](docs/PRODUCTION-READINESS.md), [architecture](docs/ARCHITECTURE.md), [threat model](docs/THREAT-MODEL.md), [operations](docs/OPERATIONS.md), and [OpenAPI](docs/openapi.json).

Provider adapters, bank/network agreements, country permissions, genuine identity/sanctions providers, operational approval segregation, key custody, regulatory reporting, disaster recovery, independent audits and certifications must be implemented and evidenced before live use. The local JSON/D1 aggregate stores and single-operator permission model are sandbox choices, not production banking infrastructure. There is deliberately no switch that silently turns simulated rails into live rails.

Design: https://www.figma.com/design/GKEuuQaF8SNmSUEZe5WAXW?node-id=3-109
