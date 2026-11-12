/** Private Sites adapter. Dispatch owns identity; never expose this Worker directly. */
export function createHandler(createEngine, assets) {
  const headers = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "same-origin",
    "content-security-policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com; base-uri 'self'; form-action 'self'",
  };
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        ...headers,
        "content-type": "application/json; charset=utf-8",
      },
    });
  return async function fetch(request, env = {}) {
    const url = new URL(request.url),
      path = url.pathname;
    if (path === "/api/health")
      return json({
        status: "ok",
        mode: "sandbox",
        storage: env.DB ? "D1" : "unconfigured",
        realMoney: false,
      });
    if (!path.startsWith("/api/")) {
      const asset = assets[path === "/" ? "/index.html" : path];
      return asset
        ? new Response(asset.body, {
            headers: { ...headers, "content-type": asset.type },
          })
        : json({ error: "Not found" }, 404);
    }
    if (!request.headers.get("oai-authenticated-user-id"))
      return json(
        { error: "Sign in to this private Site", code: "UNAUTHENTICATED" },
        401,
      );
    if ((env.BANKING_MODE || "sandbox") !== "sandbox")
      return json(
        {
          error:
            "Live adapters are not configured. Sandbox cannot enable real money.",
          code: "LIVE_DISABLED",
        },
        503,
      );
    if (!env.DB)
      return json(
        {
          error:
            "Persistent database binding DB is required; no volatile fallback",
          code: "STORAGE_UNCONFIGURED",
        },
        503,
      );
    try {
      const stateId = "shared-sandbox";
      await env.DB.prepare(
        "INSERT OR IGNORE INTO sandbox_state (id, revision, state) VALUES (?, 0, ?)",
      )
        .bind(stateId, JSON.stringify(createEngine().exportState()))
        .run();
      if (request.method === "GET") {
        const row = await env.DB.prepare(
          "SELECT revision, state FROM sandbox_state WHERE id = ?",
        )
          .bind(stateId)
          .first();
        const engine = createEngine(JSON.parse(row.state));
        const checks = engine.snapshot().metrics;
        if (
          !checks.ledgerBalanced ||
          !checks.chainValid ||
          !checks.reserveCovered ||
          !checks.tokenOwnershipBalanced
        )
          throw new Error("State integrity failure");
        if (["/api/snapshot", "/api/state"].includes(path))
          return json(engine.snapshot());
        if (path === "/api/chain/verify")
          return json({
            valid: engine.verifyChain(),
            network: "single-node-simulator",
          });
        const scopes = {
          "/api/open-banking/accounts": "accounts:read",
          "/api/open-banking/transactions": "transactions:read",
        };
        if (scopes[path]) {
          const consent = request.headers.get("x-consent-id");
          if (!engine.authorizeConsent(consent, scopes[path]))
            return json(
              { error: "Active scoped sandbox consent required" },
              403,
            );
          const s = engine.snapshot();
          return json({
            data: path.endsWith("accounts")
              ? s.accounts.filter((a) =>
                  ["customer", "operating"].includes(a.type),
                )
              : s.transactions,
            mode: "sandbox",
          });
        }
        return json({ error: "Not found" }, 404);
      }
      if (request.method !== "POST" || path !== "/api/commands")
        return json({ error: "Not found" }, 404);
      if (request.headers.get("origin") !== url.origin)
        return json(
          { error: "Same-origin request required", code: "ORIGIN_DENIED" },
          403,
        );
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return json({ error: "Use application/json" }, 415);
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 16384)
        return json({ error: "Request exceeds sandbox limit" }, 413);
      let command;
      try {
        command = JSON.parse(raw);
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      for (let attempt = 0; attempt < 8; attempt++) {
        const row = await env.DB.prepare(
          "SELECT revision, state FROM sandbox_state WHERE id = ?",
        )
          .bind(stateId)
          .first();
        const engine = createEngine(JSON.parse(row.state));
        const checks = engine.snapshot().metrics;
        if (
          !checks.ledgerBalanced ||
          !checks.chainValid ||
          !checks.reserveCovered ||
          !checks.tokenOwnershipBalanced
        )
          throw new Error("State integrity failure");
        const result = engine.command(command);
        const state = JSON.stringify(engine.exportState());
        if (new TextEncoder().encode(state).length > 1500000)
          return json(
            {
              error:
                "Sandbox capacity reached; export and archive before continuing",
              code: "CAPACITY",
            },
            409,
          );
        const update = await env.DB.prepare(
          "UPDATE sandbox_state SET state = ?, revision = revision + 1 WHERE id = ? AND revision = ?",
        )
          .bind(state, stateId, row.revision)
          .run();
        if (update.meta.changes === 1)
          return json({ result, state: engine.snapshot() });
      }
      return json(
        {
          error: "Concurrent update; retry with the same idempotency key",
          code: "CONFLICT",
        },
        409,
      );
    } catch (error) {
      if (error.code)
        return json(
          { error: error.message, code: error.code },
          error.code === "IDEMPOTENCY_CONFLICT" ? 409 : 400,
        );
      console.error("Sandbox request failed", error.name);
      return json(
        { error: "Sandbox storage unavailable", code: "INTERNAL" },
        503,
      );
    }
  };
}
