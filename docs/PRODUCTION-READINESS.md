# Production readiness gates

Every gate below is **unmet by this sandbox** unless separately evidenced and signed off by accountable owners. This is a planning checklist, not legal advice, a compliance certification, or an exhaustive statement of obligations. Requirements must be assessed against current law, effective dates, the business model, and every jurisdiction served.

## Legal entity, permissions and partners

- Define whether the operator is a bank, money transmitter/payment institution, technology provider, stablecoin issuer, agent, or a combination; document whose funds and liabilities each ledger account represents.
- Obtain current U.S. federal/state and international counsel analysis. Assess BSA/AML and FinCEN obligations, OFAC restrictions, state money-transmission requirements, consumer protection, deposit-taking restrictions, and applicable stablecoin issuer authorization, reserve and redemption rules.
- Validate applicable U.S. stablecoin legislation, implementing rules, transition periods and effective dates at launch. Do not assume enactment, licensure, or partner status from a generic checklist.
- Assess each international market separately, including EU/EEA MiCA and payments requirements where relevant, local issuer/payment permissions, cross-border distribution, exchange controls and marketing restrictions.
- Execute bank, custodian, payment network, correspondent, card issuer/processor, and screening-provider agreements. Test permitted products, corridors and customer segments against those contracts.
- Disclose the actual issuer, funds holder, redemption obligor, fees and risks. Do not imply deposit insurance, government backing, or coverage of a token without an applicable, legally reviewed basis.

## Financial integrity

- Approve the chart of accounts, customer liability model, reserve segregation, FX accounting, fee treatment, reversals and reconciliation policy with qualified finance/control owners.
- Enforce balanced immutable postings, transaction isolation, funds availability, duplicate prevention and durable idempotency under concurrency and retries.
- Reconcile bank/custody statements, processor and network settlement, internal ledger, token liabilities and independently observed chain supply. Investigate breaks and control suspense balances.
- Prevent reserve double counting, reuse of encumbered assets, and minting against unconfirmed or ineligible receipts. Model redemption liquidity and reserve valuation stress.
- Account for ACH returns, unauthorized-payment claims and reversals after apparent settlement. Do not treat instant availability as irreversible finality for every rail.
- Independently audit accounting and reserve controls. Produce required issuer reporting and attestations using the applicable standards and actual evidence.

## Financial crime and customer protection

- Establish a risk-based AML program, accountable compliance leadership, KYC/KYB and beneficial-owner workflows, sanctions controls, ongoing monitoring and escalation/reporting procedures.
- Validate screening data freshness, match quality, geographic restrictions, payment transparency and where applicable Travel Rule obligations. Track false positives without silently bypassing controls.
- Implement customer disclosures, complaints, error resolution, disputes, unauthorized-payment handling and card chargebacks as applicable.
- Approve a jurisdiction-specific retention/deletion schedule, lawful basis, privacy notices, data subject processes and international data-transfer mechanisms.

## Security and access

- Use individual identities, strong authentication, least privilege, tenant/resource ownership checks and separation of duties. Require independent approval for high-risk administrative and financial actions.
- Implement tested OAuth/OIDC and the applicable open banking/FAPI profile, secure client onboarding, scope/audience validation, consent expiry/revocation and signed replay-resistant webhooks.
- Keep real PAN/CVV outside the application through a certified tokenization/processor boundary; determine and validate applicable PCI DSS scope. Synthetic card references in this sandbox do not demonstrate PCI compliance.
- Protect bank/chain signing keys with reviewed custody/HSM controls, rotation, backup, recovery and emergency revocation. Audit smart contracts and consensus/node infrastructure independently.
- Apply encryption, secret management, dependency controls, secure SDLC, penetration testing, abuse/rate controls and independently retained audit evidence.

## Resilience and release

- Define settlement finality and chain reorg policies; test timeouts, partial failures, retries, callbacks arriving out of order and lost responses.
- Establish RTO/RPO, multi-zone recovery, immutable/offline backups, restoration drills and 24/7 incident escalation appropriate to supported rails.
- Run load, concurrency, failover, reconciliation, security, accessibility and disaster-recovery tests against realistic synthetic scenarios.
- Complete required partner/network certifications and operational readiness reviews. Record legal, compliance, security, finance and operations approvals before enabling each production feature gate.
