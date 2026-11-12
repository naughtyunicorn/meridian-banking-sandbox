import { minorUnits, escapeHTML as e, money } from "./ui.mjs";
const icons = {
  overview:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  ledger: '<path d="M4 4h15v17H4zM8 4V2M8 8h7M8 12h7M8 16h4"/>',
  payments: '<path d="M3 7h17m-5-5 5 5-5 5M21 17H4m5-5-5 5 5 5"/>',
  stablecoin: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/>',
  compliance: '<path d="m12 2 9 4v6c0 5-6 9-9 10-3-1-9-5-9-10V6zM7 12l3 3 6-6"/>',
  cards: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 9h20M6 15h4"/>',
  developer: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  settings:
    '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6 2 3 4-1 1 4 3 2-2 3 1 4-4 1-2 3-3-2-4 1-1-4-3-2 2-3-1-4 4-1z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.arrow}</svg>`;
const labels = {
  overview: "Overview",
  ledger: "Ledger & accounts",
  payments: "Payments",
  stablecoin: "Stablecoin & chain",
  compliance: "Compliance",
  cards: "Cards",
  developer: "Developer",
  settings: "Environment",
};
let state = null,
  view = location.hash.slice(1) || "overview",
  ledgerFilter = "",
  apiToken = "",
  toastTimer;
const $ = (s) => document.querySelector(s),
  arr = (key) => (Array.isArray(state?.[key]) ? state[key] : []);
const badge = (text) =>
  `<span class="badge ${/review|queued|pending|open/i.test(text) ? "amber" : /block|reject|frozen/i.test(text) ? "red" : /simulat|sandbox|revoked|expire/i.test(text) ? "neutral" : ""}">${e(text)}</span>`;
const account = (id) => arr("accounts").find((a) => a.id === id);
const accountName = (id) => account(id)?.name || id || "System";
const time = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};
const button = (text, action, kind = "", extra = "") =>
  `<button type="button" class="btn ${kind}" data-action="${action}" ${extra}>${text}</button>`;
const panel = (title, content, sub = "", action = "") =>
  `<section class="panel"><div class="panel-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>${action}</div>${content}</section>`;
const heading = (title, description, actions = "") =>
  `<div class="page-heading"><div><span class="eyebrow">YOUR FINANCIAL OPERATING SYSTEM</span><h1>${title}</h1><p>${description}</p></div><div class="heading-actions">${actions}</div></div>`;
function nav() {
  $("#navigation").innerHTML = Object.entries(labels)
    .map(
      ([id, label], i) =>
        `${i === 6 ? '<div class="nav-separator"></div>' : ""}<a href="#${id}" class="${view === id ? "active" : ""}" ${view === id ? 'aria-current="page"' : ""}>${icon(id)}<span>${label}</span>${id === "compliance" && arr("cases").some((x) => x.status === "open") ? `<span class="nav-counter">${arr("cases").filter((x) => x.status === "open").length}</span>` : ""}</a>`,
    )
    .join("");
  $("#breadcrumb").textContent = labels[view] || "Overview";
}
function metric(title, value, note, kind = "", ico = "ledger") {
  return `<article class="metric ${kind}"><div class="metric-title">${title}${icon(ico)}</div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></article>`;
}
function transactionTable(transactions = arr("transactions"), limit = 0) {
  const data = transactions.slice(0, limit || transactions.length);
  return `<div class="table-wrap"><table><thead><tr><th>Transaction</th><th>Account / reference</th><th>Currency</th><th class="text-right">Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>${data.map((t) => `<tr><td><div class="table-title"><span class="table-symbol">${t.type === "mint" ? "◇" : t.type === "burn" ? "↙" : "↗"}</span><div><strong>${e(t.type.replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase()))}</strong><small>${e(t.description || `${accountName(t.from)} → ${accountName(t.to)}`)}</small></div></div></td><td><span class="mono">${e(t.id)}</span></td><td>${e(t.currency)}</td><td class="text-right amount">${money(t.amount, t.currency)}</td><td>${badge("Posted")}</td><td class="mono">${time(t.timestamp)}</td></tr>`).join("") || '<tr><td colspan="6" class="empty">No posted transactions yet. Create your first sandbox transfer.</td></tr>'}</tbody></table></div>`;
}
function railRows() {
  return [
    ["A", "ACH", "US clearing · Nacha-format workflow"],
    ["F", "FedNow", "US instant payment workflow"],
    ["S", "SWIFT", "International messaging workflow"],
    ["€", "SEPA", "EUR payment workflow"],
  ]
    .map(
      ([i, n, d]) =>
        `<div class="rail-row"><span class="rail-icon">${i}</span><span class="rail-name">${n}<small>${d}</small></span>${badge("Simulated")}</div>`,
    )
    .join("");
}
function chart() {
  const ts = arr("transactions")
    .filter((t) => t.currency === "USD")
    .slice(0, 12)
    .reverse();
  const values = [0];
  for (const t of ts) values.push(values.at(-1) + t.amount);
  const max = Math.max(...values, 1),
    w = 520,
    h = 130;
  const points = values.map((v, i) => [
    40 + (i / (values.length - 1 || 1)) * 465,
    15 + h - (v / max) * h,
  ]);
  const d = points.map((p, i) => `${i ? "L" : "M"}${p.join(",")}`).join(" ");
  return `<svg class="chart" viewBox="0 0 540 180" role="img" aria-label="Cumulative posted USD sandbox volume for the last ${ts.length} transactions"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#85aa55" stop-opacity=".2"/><stop offset="100%" stop-color="#85aa55" stop-opacity=".015"/></linearGradient></defs>${[0, 1, 2, 3].map((i) => `<line class="chart-grid" x1="40" x2="505" y1="${15 + i * 43}" y2="${15 + i * 43}"/><text x="0" y="${19 + i * 43}">${Math.round((max * (1 - i / 3)) / 100).toLocaleString()}</text>`).join("")}<path d="${d} L505,145 L40,145Z" fill="url(#area)"/><path d="${d}" fill="none" stroke="#73944f" stroke-width="2.4" stroke-linejoin="round"/><circle cx="${points.at(-1)[0]}" cy="${points.at(-1)[1]}" r="4" fill="#70944b" stroke="white" stroke-width="2"/><text x="40" y="170">${ts.length ? time(ts[0].timestamp).split(",")[0] : "No volume"}</text><text x="505" y="170" text-anchor="end">Latest posting</text></svg>`;
}
function overview() {
  const usd = arr("accounts")
      .filter((a) => a.currency === "USD" && ["operating", "customer"].includes(a.type))
      .reduce((n, a) => n + a.available, 0),
    sc = state.stablecoin || {},
    open = arr("cases").filter((c) => c.status === "open").length,
    volume = arr("transactions")
      .filter((t) => t.currency === "USD")
      .reduce((n, t) => n + t.amount, 0);
  return (
    heading(
      "A clear view of your finances.",
      "Your ledger, payments, and digital assets. One connected workspace.",
      `${button(icon("download") + "Export ledger", "export")}${button(icon("plus") + "New transfer", "transfer", "primary")}`,
    ) +
    `<div class="metrics">${metric("Available USD balance", money(usd), '<span class="status-dot"></span> Across sandbox customer accounts', "hero-metric", "ledger")}${metric("Posted USD volume", money(volume), `${arr("transactions").length} ledger postings · all currencies`, "", "payments")}${metric("Test stablecoin supply", money(sc.supply || 0), `${e(sc.symbol || "mUSD")} · ${Number(sc.coverage || 0).toFixed(0)}% reserve coverage`, "", "stablecoin")}${metric("Open compliance cases", String(open).padStart(2, "0"), open ? '<span class="positive">Review required</span> Your attention matters' : '<span class="positive">Queue clear</span> Sandbox controls active', "", "compliance")}</div><div class="grid-two">${panel("Treasury activity", `<div class="panel-body"><div class="chart-summary"><div><small>POSTED USD VOLUME</small><strong>${money(volume)}</strong></div><div class="chart-legend"><span><i class="legend-dot"></i>Cumulative volume</span></div></div>${chart()}<p class="chart-caption">Most recent USD ledger postings · not a bank statement</p></div>`, "Every movement, accounted for.", `<span class="chart-tabs"><span class="selected">Recent postings</span></span>`)}${panel("Payment infrastructure", `<div class="panel-body">${railRows()}<p class="feature-note">Rail adapters model lifecycle states. No network credentials or live endpoints.</p></div>`, "One orchestration layer. Global reach.", `<button class="link" data-view="payments">View all ↗</button>`)}</div>${panel("Recent transactions", transactionTable(arr("transactions"), 5) + `<div class="table-bottom"><span>${arr("transactions").length} total ledger postings</span><button class="link" data-view="ledger">View ledger →</button></div>`, "A traceable record of every posting.", `<span class="badge ${state.metrics?.ledgerBalanced ? "" : "red"}">${state.metrics?.ledgerBalanced ? "Balanced ledger" : "Check ledger"}</span>`)}<div class="bottom-grid">${panel("Built on verifiable backing", `<div class="reserve-summary"><div class="reserve-ring"><strong>${Number(sc.coverage || 0).toFixed(0)}%</strong><span>COVERAGE</span></div><div class="reserve-info"><div><span>Allocated test USD reserves</span><strong>${money(sc.reserves)}</strong></div><div><span>Outstanding ${e(sc.symbol || "mUSD")}</span><strong>${money(sc.supply)}</strong></div><div><span>Issuance policy</span>${badge("1:1 test USD")}</div></div></div>`, "Reserve allocation prevents double spending.", `<button class="link" data-view="stablecoin">Explore ↗</button>`)}${panel("Operational pulse", `<div class="panel-body"><div class="activity-row"><span class="activity-dot"></span><div><strong>Double-entry invariants</strong><small>Balances validated in every supported currency</small></div>${badge(state.metrics?.ledgerBalanced ? "Balanced" : "Review")}</div><div class="activity-row"><span class="activity-dot"></span><div><strong>${arr("payments").filter((p) => p.status === "queued" || p.status === "review").length} payments awaiting action</strong><small>Simulated settlement and compliance decisions</small></div></div><div class="activity-row"><span class="activity-dot"></span><div><strong>Dedicated sandbox chain</strong><small>${arr("chain").length} hash-linked blocks · single-node simulation</small></div></div></div>`, "The details that keep everything moving.")}</div>`
  );
}
function ledger() {
  const as = arr("accounts").filter((a) =>
    [
      "operating-usd",
      "customer-usd",
      "operating-eur",
      "customer-eur",
      "operating-gbp",
      "customer-gbp",
    ].includes(a.id),
  );
  return (
    heading(
      "Every entry. In balance.",
      "Multi-currency accounts and an append-only double-entry journal.",
      `${button(icon("download") + "Export CSV", "export")}${button(icon("plus") + "New transfer", "transfer", "primary")}`,
    ) +
    `<div class="notice"><strong>Ledger integrity:</strong> ${state.metrics?.ledgerBalanced ? "All currency journals are balanced." : "Invariant check needs attention."} Transfers post equal and opposite entries. USD, EUR, and GBP are separate books; cross-currency transfers require an FX workflow and are disabled.</div><div class="account-grid">${as.map((a) => `<article class="account-card"><div class="account-info"><span class="currency-icon">${e(a.currency === "USD" ? "$" : a.currency === "EUR" ? "€" : "£")}</span>${badge(a.currency)}</div><h3>${e(a.name)}</h3><span class="mono">${e(a.id)}</span><div class="balance">${money(a.balance, a.currency)}</div><div class="quick-row"><span>Available</span><strong>${money(a.available, a.currency)}</strong></div><div class="quick-row"><span>Held for pending payments</span><strong>${money(a.held, a.currency)}</strong></div></article>`).join("")}</div>${panel("Transaction journal", transactionTable(arr("transactions").filter((t) => !ledgerFilter || JSON.stringify(t).toLowerCase().includes(ledgerFilter.toLowerCase()))), "Balanced postings with source and destination references.", `<input class="search" aria-label="Search ledger" placeholder="Search reference…" id="ledger-search" value="${e(ledgerFilter)}">`)}`
  );
}
function payments() {
  const ps = arr("payments");
  return (
    heading(
      "Move money, with control.",
      "Test domestic and international payment workflows end to end.",
      button(icon("plus") + "Create payment", "payment", "primary"),
    ) +
    `<div class="metrics">${metric("Sandbox payments", String(ps.length).padStart(2, "0"), "Across 4 simulated payment rails", "", "payments")}${metric("Awaiting settlement", String(ps.filter((p) => p.status === "queued").length).padStart(2, "0"), "Funds reserved until settlement", "", "ledger")}${metric("In compliance review", String(ps.filter((p) => p.status === "review").length).padStart(2, "0"), "Manual approval required", "", "compliance")}${metric("Completed payments", String(ps.filter((p) => p.status === "settled").length).padStart(2, "0"), "Simulated settlement confirmed", "", "payments")}</div>${panel("Payment queue", `<div class="table-wrap"><table><thead><tr><th>Beneficiary</th><th>Rail</th><th>Source</th><th class="text-right">Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>${ps.map((p) => `<tr><td><strong>${e(p.beneficiary)}</strong><div class="mono" style="margin-top:5px">${e(p.id)}</div></td><td>${e(p.rail)}</td><td>${e(accountName(p.from))}</td><td class="text-right amount">${money(p.amount, p.currency)}</td><td>${badge(p.status)}</td><td>${p.status === "queued" ? button("Simulate settlement", "settle", "tiny", `data-id="${e(p.id)}"`) : p.status === "review" ? '<button class="link" data-view="compliance">Review case →</button>' : '<span class="mono">—</span>'}</td></tr>`).join("") || '<tr><td colspan="6" class="empty">No payments yet. Create one to test the complete lifecycle.</td></tr>'}</tbody></table></div>`, "Queued payments hold funds; settling posts the ledger entry.")}<div class="grid-two" style="margin-top:23px">${panel("Rail coverage", `<div class="panel-body">${railRows()}</div>`, "Sandbox adapters, ready for integration design.")}${panel("Before any live launch", `<div class="panel-body"><ul class="maturity-list"><li><strong>ACH / Nacha:</strong> An ODFI or sponsor, authorization records, returns, and rule validation.</li><li><strong>FedNow:</strong> An eligible participant or service-provider agreement and certification.</li><li><strong>SWIFT:</strong> Authorized access, standards validation, correspondent banking, and screening.</li><li><strong>SEPA:</strong> Appropriate PSP arrangements, scheme access, and regional obligations.</li></ul></div>`, "Access comes through regulated institutions and networks.")}</div>`
  );
}
function stablecoin() {
  const sc = state.stablecoin || {};
  return (
    heading(
      "Digital value. Real accounting.",
      "Allocate test USD reserves, mint tokens, and verify the sandbox chain.",
      `${button("Transfer tokens", "token-transfer")}${button("Redeem tokens", "burn")}${button(icon("plus") + "Mint test mUSD", "mint", "primary")}`,
    ) +
    `<div class="notice amber"><strong>Test token only.</strong> mUSD has no monetary value. The dedicated chain is a single-node hash-linked simulator, not a distributed blockchain or live token deployment. Backing here is simulated ledger reserves, not independently verified bank assets.</div><div class="metrics">${metric("mUSD in circulation", money(sc.supply), "1 mUSD represents 1 simulated USD", "", "stablecoin")}${metric("Allocated reserves", money(sc.reserves), "Unavailable for other ledger payments", "", "ledger")}${metric("Reserve coverage", `${Number(sc.coverage || 0).toFixed(0)}%`, "Minting requires full test USD backing", "", "compliance")}${metric("Chain height", String(arr("chain").length).padStart(3, "0"), e(sc.chainId || "Meridian sandbox"), "", "stablecoin")}</div><div class="grid-two">${panel(
      "Reserve & issuance controls",
      `<div class="panel-body"><div class="quick-row"><span>Eligible backing asset</span><strong>Allocated test USD</strong></div><div class="quick-row"><span>Minting limit</span><strong>Available source USD</strong></div><div class="quick-row"><span>Redemption</span><strong>Burn → release reserve</strong></div><div class="quick-row"><span>Oversupply protection</span>${badge("Enforced")}</div>${Object.entries(
        sc.holders || {},
      )
        .map(
          ([id, n]) =>
            `<div class="quick-row"><span>${e(accountName(id))} · token balance</span><strong>${money(n)} mUSD</strong></div>`,
        )
        .join(
          "",
        )}<p class="feature-note">Minting transfers funds out of the source account into dedicated backing. Redemption burns outstanding supply and releases the same amount. This avoids counting the same USD as both spendable funds and token backing.</p></div>`,
      "No issuance from an unbacked balance.",
    )}${panel("Network configuration", `<div class="panel-body"><div class="quick-row"><span>Network</span><strong>Meridian test chain</strong></div><div class="quick-row"><span>Chain ID</span><code class="mono">${e(sc.chainId || "—")}</code></div><div class="quick-row"><span>Consensus</span><strong>Single-node simulation</strong></div><div class="quick-row"><span>Block integrity</span><strong>SHA-256 hash linking</strong></div><p class="feature-note">Production requires a selected blockchain stack, validator governance, managed signing, finality handling, and independent contract and infrastructure audits.</p></div>`, "An explicit sandbox, with transparent limits.")}</div>${panel(
      "Block explorer",
      `<div class="panel-body">${
        [...arr("chain")]
          .reverse()
          .slice(0, 20)
          .map(
            (b) =>
              `<div class="chain-block"><span>${time(b.timestamp)}</span><strong>Block #${e(b.index)} · ${e(b.type)} ${b.amount ? `· ${money(b.amount)} test USD` : ""}</strong><div>Hash <code>${e(b.hash)}</code></div><div>Parent <code>${e(b.previousHash)}</code></div></div>`,
          )
          .join("") || '<div class="empty">Mint your first test token to create a block.</div>'
      }</div>`,
      "Immutable hash-linked record within this simulator.",
    )}`
  );
}
function compliance() {
  const cs = arr("cases");
  return (
    heading(
      "Confidence, by design.",
      "Inspect sandbox risk decisions and control which payments progress.",
      button("Test blocked payment", "blocked-payment", "primary"),
    ) +
    `<div class="notice"><strong>Rules are demonstrative.</strong> Screening here uses test scenarios and configured thresholds. This is not live KYC/KYB, sanctions screening, AML monitoring, regulatory reporting, or a compliance certification.</div><div class="metrics">${metric("Open cases", String(cs.filter((c) => c.status === "open").length).padStart(2, "0"), "Awaiting an operator decision", "", "compliance")}${metric("Reviewed cases", String(cs.filter((c) => c.status !== "open").length).padStart(2, "0"), "Decisions retained in sandbox history", "", "ledger")}${metric("Blocked payments", String(arr("payments").filter((p) => p.status === "blocked").length).padStart(2, "0"), "Hard blocks cannot be approved", "", "payments")}${metric("Rule mode", "Sandbox", "US / international policy placeholders", "", "settings")}</div>${panel("Review queue", `<div class="table-wrap"><table><thead><tr><th>Case</th><th>Reason</th><th>Payment</th><th>Status</th><th>Decision</th></tr></thead><tbody>${cs.map((c) => `<tr><td><strong>${e(c.id)}</strong></td><td>${e(c.reason)}</td><td class="mono">${e(c.paymentId)}</td><td>${badge(c.status)}</td><td>${c.status === "open" ? `${button("Approve", "approve", "tiny", `data-id="${e(c.id)}"`)} ${button("Reject", "reject", "tiny danger", `data-id="${e(c.id)}"`)}` : '<span class="mono">Recorded</span>'}</td></tr>`).join("") || '<tr><td colspan="5" class="empty">No review cases. Create a high-value payment to test manual review.</td></tr>'}</tbody></table></div>`, "Approvals release a reviewed payment into the settlement queue.")}<div class="grid-two" style="margin-top:23px">${panel("Sandbox control library", `<div class="panel-body"><div class="quick-row"><span>High-value payment review</span>${badge("Active")}</div><div class="quick-row"><span>Explicit test block</span>${badge("Active")}</div><div class="quick-row"><span>Available balance enforcement</span>${badge("Active")}</div><div class="quick-row"><span>Duplicate command protection</span>${badge("Idempotent")}</div><div class="quick-row"><span>Live sanctions & identity providers</span>${badge("Not connected")}</div></div>`, "Controls implemented in this test environment.")}${panel("Jurisdiction readiness", `<div class="panel-body"><ul class="maturity-list"><li><strong>United States:</strong> Determine entity, licensing and partner obligations; BSA/AML, OFAC, consumer rules, privacy, and stablecoin requirements as applicable.</li><li><strong>International:</strong> Each launch market needs its own legal analysis, licenses or exemptions, data controls, and payment partnerships.</li><li><strong>European markets:</strong> Assess MiCA, payments regulation, applicable open banking requirements, GDPR, and operational resilience.</li></ul><p class="feature-note">These are planning categories, not an exhaustive or current legal determination. Sandbox availability does not imply market authorization.</p></div>`, "Go-live gates belong to each legal entity and market.")}</div>`
  );
}
function cards() {
  return (
    heading(
      "Card controls, without surprises.",
      "Simulate spending, freeze cards, and test authorization against the ledger.",
      button("Simulate authorization", "authorize", "primary"),
    ) +
    `<div class="notice"><strong>Card simulator:</strong> No PAN, CVV, network token, card network, issuer processor, or real authorization is involved. Cards are sandbox references only.</div><div class="cards-grid">${
      arr("cards")
        .map(
          (c) =>
            `<section class="panel"><div class="panel-head"><h2>${e(c.name)}</h2>${badge(c.status)}</div><div class="panel-body"><div class="card-visual"><div class="card-brand">meridian<span style="color:#d5ef9b">.</span></div><div class="card-chip"></div><div class="card-number">•••• &nbsp; •••• &nbsp; •••• &nbsp; ${e(c.last4)}</div><div class="card-meta"><span>SANDBOX · NO MONETARY VALUE</span><span>TEST CARD</span></div></div><div class="control-row"><div><h3>Card controls</h3><p>Linked to ${e(accountName(c.accountId))}</p></div>${button(c.status === "frozen" ? "Unfreeze card" : "Freeze card", "freeze", "", `data-id="${e(c.id)}" data-frozen="${c.status !== "frozen"}"`)}</div><div class="quick-row"><span>Sandbox spending limit</span><strong>${money(c.limit, account(c.accountId)?.currency)}</strong></div><div class="quick-row"><span>Spent in this sandbox</span><strong>${money(c.spent, account(c.accountId)?.currency)}</strong></div><div class="quick-row"><span>Available account balance</span><strong>${money(account(c.accountId)?.available, account(c.accountId)?.currency)}</strong></div>${button("Test authorization", "authorize", "tiny", `data-id="${e(c.id)}"`)}</div></section>`,
        )
        .join("") || '<div class="empty">No sandbox cards configured.</div>'
    }</div>`
  );
}
function developer() {
  return (
    heading(
      "Infrastructure you can build on.",
      "Explore the sandbox API and test scoped open banking consent.",
      button(icon("plus") + "Create test consent", "consent", "primary"),
    ) +
    `<div class="notice amber"><strong>Developer sandbox:</strong> Consent records demonstrate scope and expiry workflows. They do not establish a production open banking service, OAuth authorization server, or network certification.</div><div class="grid-two">${panel("API explorer", `<div class="panel-body"><div class="endpoint"><span class="method">GET</span><code>/api/snapshot</code><small>Read sandbox state</small></div><div class="endpoint"><span class="method">POST</span><code>/api/commands</code><small>Submit sandbox command</small></div><div class="endpoint"><span class="method">GET</span><code>/api/health</code><small>Check server status</small></div><p class="feature-note">All write amounts are integers in minor units. Include a unique idempotency key; reuse it only for an identical retry.</p><pre class="code">${e(JSON.stringify({ type: "transfer", from: "operating-usd", to: "customer-usd", amount: 12500, idempotencyKey: "unique-request-key" }, null, 2))}</pre>${button("Download API example", "api-example", "tiny")}</div>`, "A consistent command envelope for every action.")}${panel("Connection & safety", `<div class="panel-body"><div class="quick-row"><span>API origin</span><code class="mono">Same origin</code></div><div class="quick-row"><span>Environment</span>${badge("Sandbox")}</div><div class="quick-row"><span>Money movement</span><strong>Simulated only</strong></div><div class="quick-row"><span>Supported currencies</span><strong>USD · EUR · GBP</strong></div><div class="quick-row"><span>Open banking scopes</span><strong>3 demonstration scopes</strong></div><p class="feature-note">Use only synthetic identities and transaction data. Production requires strong authentication, role separation, managed signing, monitored webhooks, rate limits, and a security review.</p></div>`, "Built for synthetic data and controlled testing.")}</div>${panel(
      "Consent registry",
      `<div class="table-wrap"><table><thead><tr><th>Application</th><th>Scopes</th><th>Expiry</th><th>Status</th><th>Action</th></tr></thead><tbody>${
        arr("consents")
          .map(
            (c) =>
              `<tr><td><strong>${e(c.name)}</strong><div class="mono" style="margin-top:5px">${e(c.id)}</div></td><td>${c.scopes.map((s) => `<span class="mono">${e(s)}</span>`).join("<br>")}</td><td class="mono">${time(c.expiresAt)}</td><td>${badge(c.status)}</td><td>${c.status === "active" ? button("Revoke", "revoke", "tiny", `data-id="${e(c.id)}"`) : "—"}</td></tr>`,
          )
          .join("") ||
        '<tr><td colspan="5" class="empty">Create a test consent to explore authorization scope and expiry.</td></tr>'
      }</tbody></table></div>`,
      "Application access starts with explicit scope and a defined lifetime.",
    )}`
  );
}
function settings() {
  return (
    heading(
      "A safe place to build.",
      "Your U.S. and international financial infrastructure sandbox.",
    ) +
    `<div class="grid-two">${panel("Environment configuration", `<div class="panel-body"><div class="settings-list"><div><span>Workspace</span><strong>Meridian Financial</strong></div><div><span>Operating mode</span><strong>Sandbox · synthetic funds only</strong></div><div><span>Geographic scenarios</span><strong>United States + international</strong></div><div><span>Settlement currencies</span><strong>USD, EUR, GBP · no automatic FX</strong></div><div><span>Stablecoin</span><strong>mUSD · test USD backing</strong></div><div><span>Blockchain</span><strong>Single-node SHA-256 simulator</strong></div><div><span>API state</span><strong>Connected to sandbox server</strong></div><div><span>Compliance status</span><strong>Demonstration rules only</strong></div></div></div>`, "Configuration is intentionally bounded for testing.")}${panel("What this environment does", `<div class="panel-body"><ul class="maturity-list"><li><strong>Ledger:</strong> Double-entry postings, available balances, holds, and idempotent commands.</li><li><strong>Payment workflows:</strong> Queue, manual review, hard block, and simulated settlement.</li><li><strong>Digital assets:</strong> Reserve allocation, minting, burning, and hash-linked test blocks.</li><li><strong>Operations:</strong> Card controls, authorization simulation, and consent registry.</li></ul></div>`, "A foundation for a regulated product, not a licensed institution.")}</div><div class="notice amber"><strong>Production readiness requires separate work.</strong> Legal entity and jurisdiction review; licenses and sponsor relationships; real KYC and sanctions providers; card and rail certification; independently verified reserves; distributed chain design and audited contracts; secure signing and custody; authentication and role separation; operational resilience and incident response. No claim of regulatory compliance is made by this sandbox.</div>`
  );
}
function render() {
  if (!state) return;
  view = Object.hasOwn(labels, view) ? view : "overview";
  nav();
  const views = {
    overview,
    ledger,
    payments,
    stablecoin,
    compliance,
    cards,
    developer,
    settings,
  };
  $("#main").innerHTML = views[view]();
  document.title = `${labels[view]} — Meridian Sandbox`;
  $("#connection").textContent = "● Connected to sandbox API · no live networks";
}
function apiHeaders(headers = {}) {
  return apiToken ? { ...headers, Authorization: `Bearer ${apiToken}` } : headers;
}
function unlockApi(rejected = false) {
  state = null;
  apiToken = "";
  $("#main").innerHTML =
    heading(
      "Connect to your sandbox API.",
      "This server requires a sandbox API token before you can read or change its data.",
    ) +
    panel(
      "API authentication",
      `<div class="panel-body"><form id="api-token-form"><div class="notice">Your token stays in page memory only. It is not saved in browser storage or included in exports. You must enter it again after reloading or closing this page. Only enter a token for this trusted sandbox server.</div><div class="field"><label for="api-token">Sandbox API token</label><input type="password" id="api-token" name="api-token" autocomplete="off" spellcheck="false" required placeholder="Enter your sandbox API token"></div>${rejected ? '<p class="form-error" role="alert">The token was not accepted. Check it and try again.</p>' : ""}<button type="submit" class="btn primary">Connect to sandbox</button></form></div>`,
      "Private hosted Sites normally use their existing access controls and do not need a token here.",
    );
  $("#connection").textContent = "○ Sandbox API requires authentication";
  nav();
  $("#api-token-form").onsubmit = async (event) => {
    event.preventDefault();
    const input = $("#api-token");
    apiToken = input.value.trim();
    input.value = "";
    if (!apiToken) return;
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    await load();
    submit.disabled = false;
  };
}
async function load() {
  try {
    const r = await fetch("/api/snapshot", {
      headers: apiHeaders({ Accept: "application/json" }),
      cache: "no-store",
    });
    if (r.status === 401) {
      unlockApi(Boolean(apiToken));
      return;
    }
    if (!r.ok) throw new Error(`API returned ${r.status}`);
    const data = await r.json();
    state = data.state || data;
    render();
  } catch (err) {
    $("#main").innerHTML =
      heading(
        "Your sandbox is offline.",
        "The console needs its sandbox API to read balances and post transactions.",
      ) +
      `<section class="panel"><div class="empty"><strong>Could not connect to the sandbox server.</strong><br>${e(err.message)}<br><br>${button("Retry connection", "retry", "primary")}<p>No local balances or simulated success have been substituted.</p></div></section>`;
    $("#connection").textContent = "○ Sandbox API unavailable";
    nav();
  }
}
function toast(message, error = false) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").className = `toast visible${error ? " error" : ""}`;
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 6000);
}
async function command(payload, key = crypto.randomUUID()) {
  const r = await fetch("/api/commands", {
    method: "POST",
    headers: apiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ ...payload, idempotencyKey: key }),
  });
  if (r.status === 401) {
    $("#modal").close();
    unlockApi(Boolean(apiToken));
    throw new Error("Your sandbox API session was not accepted. Enter the token again.");
  }
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "The sandbox command was rejected.");
  if (data.state) {
    state = data.state;
    render();
  } else await load();
  return data;
}
const field = (name, label, input, note = "") =>
  `<div class="field"><label for="${name}">${label}</label>${input}${note ? `<small>${note}</small>` : ""}</div>`;
const input = (name, placeholder = "", type = "text", value = "") =>
  `<input id="${name}" name="${name}" type="${type}" placeholder="${placeholder}" value="${e(value)}" required ${type === "number" ? 'min="1" step="1"' : ""} autocomplete="off">`;
const amountField = () =>
  field(
    "amount",
    "Amount",
    `<input id="amount" name="amount" inputmode="decimal" placeholder="0.00" pattern="[0-9]+(\\.[0-9]{1,2})?" required autocomplete="off">`,
    "Amount in the selected account’s currency. Two decimal places maximum.",
  );
const accountSelect = (name, usd = false) =>
  `<select id="${name}" name="${name}" required>${arr("accounts")
    .filter(
      (a) =>
        [
          "operating-usd",
          "customer-usd",
          "operating-eur",
          "customer-eur",
          "operating-gbp",
          "customer-gbp",
        ].includes(a.id) &&
        (!usd || a.currency === "USD"),
    )
    .map(
      (a) =>
        `<option value="${e(a.id)}">${e(a.name)} · ${e(a.currency)} · ${money(a.available, a.currency)} available</option>`,
    )
    .join("")}</select>`;
function showModal(title, body) {
  $("#modal-title").textContent = title;
  $("#modal-body").innerHTML = body;
  $("#modal").showModal();
}
function form(title, body, build, success) {
  const key = crypto.randomUUID();
  showModal(
    title,
    `<form id="action-form">${body}<p class="form-error" id="form-error" role="alert"></p><div class="form-actions"><button type="button" class="btn" id="cancel-form">Cancel</button><button type="submit" class="btn primary">${e(success || "Submit sandbox command")}</button></div></form>`,
  );
  $("#cancel-form").onclick = () => $("#modal").close();
  $("#action-form").onsubmit = async (event) => {
    event.preventDefault();
    const submit = event.currentTarget.querySelector("[type=submit]");
    submit.disabled = true;
    $("#form-error").textContent = "";
    try {
      const payload = build(new FormData(event.currentTarget));
      await command(payload, key);
      $("#modal").close();
      toast("Sandbox command completed. No real funds moved.");
    } catch (err) {
      $("#form-error").textContent = err.message;
    } finally {
      submit.disabled = false;
    }
  };
}
function transferForm() {
  form(
    "New ledger transfer",
    `<div class="notice">Move synthetic funds between two accounts in the same currency. Both ledger entries post together.</div>${field("from", "From account", accountSelect("from"))}${field("to", "To account", accountSelect("to"))}${amountField()}`,
    (f) => ({
      type: "transfer",
      from: f.get("from"),
      to: f.get("to"),
      amount: minorUnits(f.get("amount")),
    }),
    "Post test transfer",
  );
  const to = $("#to");
  if (to.options.length > 1) to.selectedIndex = 1;
}
function paymentForm(blocked = false) {
  form(
    blocked ? "Test a blocked payment" : "Create sandbox payment",
    `<div class="notice ${blocked ? "amber" : ""}">${blocked ? "This scenario triggers an explicit hard block. It cannot be approved through manual review." : "A queued payment holds funds. Settle it from the payment queue to post the ledger entry. High-value payments may require review."}</div>${field("from", "Source account", accountSelect("from"))}<div class="form-grid">${field("rail", "Payment rail", `<select id="rail" name="rail"><option>ACH</option><option>FedNow</option><option>SWIFT</option><option>SEPA</option></select>`)}${amountField()}</div>${field("beneficiary", "Beneficiary", input("beneficiary", "e.g. Acme Trading Ltd"))}`,
    (f) => ({
      type: "payment",
      from: f.get("from"),
      amount: minorUnits(f.get("amount")),
      rail: f.get("rail"),
      beneficiary: f.get("beneficiary"),
      ...(blocked ? { risk: "blocked" } : {}),
    }),
    blocked ? "Run blocked scenario" : "Create test payment",
  );
}
function mintForm(burn = false) {
  form(
    burn ? "Redeem test mUSD" : "Mint test mUSD",
    `<div class="notice">${burn ? "Burn test tokens owned by the selected account and release an equal amount of allocated test USD reserves. Redeem into the account that owns the tokens." : "Allocate test USD from an available account balance and create an equal amount of mUSD. The allocated funds cannot also be spent."}</div>${field(burn ? "to" : "from", burn ? "Receive test USD into" : "Allocate test USD from", accountSelect(burn ? "to" : "from", true))}${amountField()}<p class="feature-note">This records a hash-linked block in the single-node sandbox chain. No live blockchain transaction is sent.</p>`,
    (f) => ({
      type: burn ? "burn" : "mint",
      [burn ? "to" : "from"]: f.get(burn ? "to" : "from"),
      amount: minorUnits(f.get("amount")),
    }),
    burn ? "Burn & release reserves" : "Allocate & mint test tokens",
  );
}
function tokenTransferForm() {
  form(
    "Transfer test mUSD",
    `<div class="notice">Move owned test tokens between USD account holders. Backing stays allocated in the reserve. No live blockchain transfer occurs.</div>${field("from", "Token holder", accountSelect("from", true))}${field("to", "Recipient holder", accountSelect("to", true))}${amountField()}`,
    (f) => ({
      type: "tokenTransfer",
      from: f.get("from"),
      to: f.get("to"),
      amount: minorUnits(f.get("amount")),
    }),
    "Transfer test tokens",
  );
  const to = $("#to");
  if (to.options.length > 1) to.selectedIndex = 1;
}
function authForm(id) {
  const cs = arr("cards");
  form(
    "Simulate card authorization",
    `<div class="notice">A successful test authorization reserves funds in the linked sandbox account. Settle it in Payments to post the debit. Card status, available balance, and limit checks are enforced.</div>${field("cardId", "Sandbox card", `<select id="cardId" name="cardId">${cs.map((c) => `<option value="${e(c.id)}" ${c.id === id ? "selected" : ""}>${e(c.name)} · ${e(c.last4)} · ${e(c.status)}</option>`).join("")}</select>`)}${field("merchant", "Test merchant", input("merchant", "e.g. Demo Coffee Shop"))}${amountField()}`,
    (f) => ({
      type: "cardAuthorize",
      cardId: f.get("cardId"),
      merchant: f.get("merchant"),
      amount: minorUnits(f.get("amount")),
    }),
    "Run authorization",
  );
}
function consentForm() {
  form(
    "Create test consent",
    `<div class="notice">Create a scoped demonstration consent. Use a synthetic application name; never enter production credentials.</div>${field("name", "Application name", input("name", "e.g. Demo Treasury App"))}<div class="field"><label>Allowed scopes</label>${["accounts:read", "transactions:read", "payments:write"].map((s, i) => `<label class="checkbox"><input type="checkbox" name="scopes" value="${s}" ${i < 2 ? "checked" : ""}>${s}</label>`).join("")}</div>${field("expiresInHours", "Expires in hours", input("expiresInHours", "24", "number", "24"))}`,
    (f) => {
      const scopes = f.getAll("scopes");
      if (!scopes.length) throw new Error("Select at least one scope.");
      return {
        type: "consent",
        name: f.get("name"),
        scopes,
        expiresInHours: Number(f.get("expiresInHours")),
      };
    },
    "Create sandbox consent",
  );
}
function download(name, body, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function exportLedger() {
  const csvValue = (v) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  download(
    "meridian-sandbox-ledger.csv",
    [
      ["id", "type", "from", "to", "amount_minor", "currency", "timestamp"],
      ...arr("transactions").map((t) => [
        t.id,
        t.type,
        t.from,
        t.to,
        t.amount,
        t.currency,
        t.timestamp,
      ]),
    ]
      .map((row) => row.map(csvValue).join(","))
      .join("\r\n"),
    "text/csv;charset=utf-8",
  );
  toast("Sandbox ledger exported.");
}
async function immediate(payload, buttonEl) {
  buttonEl.disabled = true;
  try {
    await command(payload);
    toast("Sandbox state updated.");
  } catch (err) {
    toast(err.message, true);
  } finally {
    buttonEl.disabled = false;
  }
}
document.addEventListener("click", (event) => {
  const b = event.target.closest("[data-action],[data-view]");
  if (!b) return;
  if (b.dataset.view) {
    location.hash = b.dataset.view;
    return;
  }
  switch (b.dataset.action) {
    case "retry":
      load();
      break;
    case "transfer":
      transferForm();
      break;
    case "payment":
      paymentForm();
      break;
    case "blocked-payment":
      paymentForm(true);
      break;
    case "mint":
      mintForm();
      break;
    case "burn":
      mintForm(true);
      break;
    case "token-transfer":
      tokenTransferForm();
      break;
    case "authorize":
      authForm(b.dataset.id);
      break;
    case "consent":
      consentForm();
      break;
    case "export":
      exportLedger();
      break;
    case "api-example":
      download(
        "meridian-sandbox-api-example.json",
        JSON.stringify(
          {
            type: "transfer",
            from: "operating-usd",
            to: "customer-usd",
            amount: 12500,
            idempotencyKey: crypto.randomUUID(),
          },
          null,
          2,
        ),
        "application/json",
      );
      break;
    case "settle":
      immediate({ type: "settlePayment", paymentId: b.dataset.id }, b);
      break;
    case "approve":
    case "reject":
      immediate(
        {
          type: "resolveCase",
          caseId: b.dataset.id,
          decision: b.dataset.action === "approve" ? "approve" : "reject",
        },
        b,
      );
      break;
    case "freeze":
      immediate(
        {
          type: "cardFreeze",
          cardId: b.dataset.id,
          frozen: b.dataset.frozen === "true",
        },
        b,
      );
      break;
    case "revoke":
      immediate({ type: "revokeConsent", consentId: b.dataset.id }, b);
      break;
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "ledger-search") {
    const start = event.target.selectionStart;
    ledgerFilter = event.target.value;
    render();
    const search = $("#ledger-search");
    search.focus();
    search.setSelectionRange(start, start);
  }
});
window.addEventListener("hashchange", () => {
  view = location.hash.slice(1);
  render();
  window.scrollTo(0, 0);
});
$("#close-modal").onclick = () => $("#modal").close();
$("#modal").addEventListener("click", (ev) => {
  if (ev.target === $("#modal")) {
    const r = $("#modal").getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom)
      $("#modal").close();
  }
});
$("#refresh").onclick = async () => {
  await load();
  if (state) toast("Latest sandbox state loaded.");
};
$("#help").onclick = () =>
  showModal(
    "Welcome to your sandbox",
    `<div class="notice">Meridian connects a double-entry ledger, simulated payment rails, card controls, compliance review, and reserve-backed test tokens in one workspace.</div><div class="settings-list"><div><span>Start here</span><strong>Create a transfer or test payment</strong></div><div><span>Try token issuance</span><strong>Allocate USD → mint mUSD → redeem</strong></div><div><span>Try controls</span><strong>Freeze a card or review a payment</strong></div></div><p class="feature-note">Use synthetic data only. No real funds, banking networks, KYC providers, or distributed blockchain are connected.</p>`,
  );
$("#sandbox-details").onclick = () => (location.hash = "settings");
$("#workspace").onclick = () => (location.hash = "settings");
$("#profile").onclick = () =>
  showModal(
    "Sandbox operator",
    `<div class="notice">Jordan Davis is a demonstration operator label. This environment does not establish a production user identity or operational role separation.</div><p class="feature-note">Use the environment only for synthetic testing. Production user accounts, permissions and dual approval need a separate secure implementation.</p>`,
  );
nav();
load();
