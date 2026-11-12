import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "../dist/server/index.js";
const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(new URL("../drizzle/0000_sandbox_state.sql", import.meta.url), "utf8"));
const env = {
  DB: {
    prepare(query) {
      return {
        bind(...args) {
          return {
            async first() {
              return sql.prepare(query).get(...args) || null;
            },
            async run() {
              const result = sql.prepare(query).run(...args);
              return { meta: { changes: Number(result.changes) } };
            },
          };
        },
      };
    },
  },
};
const url = "https://bank.test";
const headers = {
  "oai-authenticated-user-id": "owner",
  origin: url,
  "content-type": "application/json",
};
const snapshot = async () => {
  const r = await app.fetch(new Request(url + "/api/snapshot", { headers }), env);
  assert.equal(r.status, 200);
  return r.json();
};
for (const [i, c] of [
  { type: "mint", from: "operating-usd", amount: 50000 },
  { type: "tokenTransfer", from: "operating-usd", to: "customer-usd", amount: 10000 },
  { type: "burn", to: "customer-usd", amount: 5000 },
].entries()) {
  const r = await app.fetch(
    new Request(url + "/api/commands", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...c, idempotencyKey: "artifact-" + i }),
    }),
    env,
  );
  assert.equal(r.status, 200, await r.text());
}
const s = await snapshot();
assert.equal(s.stablecoin.supply, 45000);
assert.equal(s.stablecoin.reserves, 45000);
assert.equal(s.metrics.chainValid, true);
assert.equal(s.metrics.tokenOwnershipBalanced, true);
for (const file of ["/", "/styles.css", "/app.mjs", "/ui.mjs"]) {
  const r = await app.fetch(new Request(url + file), env);
  assert.equal(r.status, 200);
  assert.ok((await r.text()).length > 0);
}
console.log("Packaged Worker: assets, durable mint/transfer/burn, chain and ownership verified");
