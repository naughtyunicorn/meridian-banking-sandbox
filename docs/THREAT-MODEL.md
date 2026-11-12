# Sandbox threat model

## Assets and trust boundaries

Assets are synthetic account balances, journal history, reserve allocations, simulated token supply, card state, consent records and review decisions. The browser, network, API, state store, and operator environment are distinct trust boundaries. No real bank credentials, private keys, personal data, PANs or funds belong in the sandbox.

| Threat | Current sandbox boundary | Production requirement |
| --- | --- | --- |
| Unauthorized access or cross-tenant reads | Owner-private hosting/local execution; not a full banking IAM model | Individual authentication, authorization at every resource, tenant isolation, session security and least privilege |
| Duplicate or concurrent spending | Integer amounts, funds checks and idempotency in a serialized command path | Transactional datastore, locking/isolation, durable deduplication and concurrency/fault tests |
| Unbacked mint or double counted deposits | Explicit synthetic reserve allocation tied to token supply | Independently verified eligible assets, segregated custody, live reconciliation, approvals and issuance limits |
| Privileged operator changes history | Single service controls its store and test chain | Separation of duties, external append-only evidence, independent reconciliation and governed distributed infrastructure |
| Hash-chain tampering | Hash links may expose changed records within one recorded history | Independent anchors/observers and consensus; hashes alone do not stop a privileged rewrite |
| False “compliance clear” decision | Synthetic cases; no official screening | Validated providers, data freshness, evidence, restricted workflows and accountable review |
| Forged callback or replayed payment event | No real network callbacks | Verify signatures, timestamps, source/audience and unique IDs; tolerate legitimate retries and out-of-order events |
| Consent confused with authorization | Demo consent records only | OAuth/FAPI enforcement on protected resources; deny expired, revoked, wrong-owner or wrong-scope access |
| Card information leakage | Synthetic card references only | Processor tokenization, restricted PCI environment, no CVV storage, access logging and DLP |
| Injection/XSS/CSRF | Treat every API field and rendered value as untrusted | Validate schemas, parameterize storage, render text safely, CSP and authenticated same-origin request defenses |
| Availability loss or corrupted state | Single-process/local-store limitations | Redundancy, durable transactions, rate controls, backups, tested restore and incident response |
| Misleading rail or legal status | Explicit simulator labels | Contract-backed live status, current legal assessment and evidence before enabling products |

## Required adversarial scenarios

Verify at minimum: overdraft through concurrent commands; negative/fractional/unsafe amounts; duplicate idempotency key with changed payload; cross-currency transfer without FX; mint beyond available backing; repeat burn/redemption; held-funds double spend; invalid payment lifecycle transitions; unresolved compliance hold release; authorization on a frozen card; card amount above limits; consent revocation; malformed payloads; state write failure; and a restarted server reading persisted state.

Passing sandbox tests demonstrates only the tested simulator behavior. It does not establish regulatory compliance, resistance to a privileged host operator, network certification, or readiness to hold customer funds.
