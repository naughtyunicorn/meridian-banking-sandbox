import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createHandler } from "./handler.mjs";
import { createEngine } from "../server/engine.mjs";
function db() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    "CREATE TABLE sandbox_state (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, state TEXT NOT NULL)",
  );
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              return sqlite.prepare(sql).get(...args) || null;
            },
            async run() {
              const r = sqlite.prepare(sql).run(...args);
              return { meta: { changes: Number(r.changes) } };
            },
          };
        },
      };
    },
  };
}
const req = (body, extra = {}) =>
  new Request("https://bank.test/api/commands", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://bank.test",
      "oai-authenticated-user-id": "owner",
      ...extra,
    },
    body: JSON.stringify(body),
  });
test("anonymous API cannot read or mutate private ledger", async () => {
  const h = createHandler(createEngine, {});
  assert.equal(
    (await h(new Request("https://bank.test/api/snapshot"), { DB: db() }))
      .status,
    401,
  );
});
test("persists commands and idempotency across handler instances", async () => {
  const env = { DB: db() },
    h = createHandler(createEngine, {});
  const c = {
    type: "transfer",
    from: "operating-usd",
    to: "customer-usd",
    amount: 100,
    idempotencyKey: "one",
  };
  assert.equal((await h(req(c), env)).status, 200);
  const second = createHandler(createEngine, {});
  assert.equal((await second(req(c), env)).status, 200);
  const r = await second(
    new Request("https://bank.test/api/snapshot", {
      headers: { "oai-authenticated-user-id": "owner" },
    }),
    env,
  );
  const s = await r.json();
  assert.equal(s.transactions.length, 1);
  assert.equal(
    s.accounts.find((a) => a.id === "operating-usd").balance,
    11999900,
  );
});
test("origin and live mode fail closed", async () => {
  const h = createHandler(createEngine, {}),
    env = { DB: db() };
  assert.equal(
    (await h(req({}, { origin: "https://attacker.test" }), env)).status,
    403,
  );
  assert.equal(
    (await h(req({}), { ...env, BANKING_MODE: "live" })).status,
    503,
  );
});
test("concurrent changes retry CAS without losing balances", async () => {
  const h = createHandler(createEngine, {}),
    env = { DB: db() };
  const rs = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      h(
        req({
          type: "transfer",
          from: "operating-usd",
          to: "customer-usd",
          amount: 100,
          idempotencyKey: "c" + i,
        }),
        env,
      ),
    ),
  );
  assert.ok(rs.every((r) => r.status === 200));
  const s = await (
    await h(
      new Request("https://bank.test/api/snapshot", {
        headers: { "oai-authenticated-user-id": "owner" },
      }),
      env,
    )
  ).json();
  assert.equal(s.transactions.length, 5);
  assert.equal(
    s.accounts.find((a) => a.id === "operating-usd").balance,
    11999500,
  );
});
