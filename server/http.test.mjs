import test from "node:test";
import assert from "node:assert/strict";
import { createEngine } from "./engine.mjs";
const module = await import("./http.mjs").catch(() => ({}));
test("HTTP commands require same origin and return durable snapshots", async () => {
  assert.equal(
    typeof module.createAppServer,
    "function",
    "HTTP server must exist",
  );
  const engine = createEngine();
  const server = module.createAppServer(engine, { token: "secret" });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(url + "/api/health");
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      status: "ok",
      mode: "sandbox",
      realMoneyEnabled: false,
    });
    assert.equal((await fetch(url + "/api/snapshot")).status, 401);
    const headers = {
      "content-type": "application/json",
      authorization: "Bearer secret",
    };
    assert.equal(
      (
        await fetch(url + "/api/commands", {
          method: "POST",
          headers: { ...headers, origin: "https://evil.invalid" },
          body: "{}",
        })
      ).status,
      403,
    );
    const response = await fetch(url + "/api/commands", {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "transfer",
        from: "operating-usd",
        to: "customer-usd",
        amount: 100,
        idempotencyKey: "http",
      }),
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.state.transactions.length, 1);
    assert.equal(data.state.metrics.ledgerBalanced, true);
    const denied = await fetch(url + "/api/open-banking/accounts", { headers });
    assert.equal(denied.status, 403);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
test("static module scripts have a JavaScript MIME type", async () => {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "meridian-static-"));
  await writeFile(join(dir, "ui.mjs"), "export const ready=true;");
  const server = module.createAppServer(createEngine(), {
    staticDirectory: dir,
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/ui.mjs`,
    );
    assert.match(response.headers.get("content-type"), /javascript/);
  } finally {
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});
