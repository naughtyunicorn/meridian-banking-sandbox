import test from "node:test";
import assert from "node:assert/strict";
import { initialState, createEngine } from "../server/engine.mjs";

test("API token unlock uses memory-only bearer headers for reads and commands", async () => {
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id))
      nodes.set(id, {
        innerHTML: "",
        textContent: "",
        value: "",
        disabled: false,
        addEventListener() {},
        classList: { remove() {} },
        close() {},
        querySelector() {
          return node("#submit");
        },
      });
    return nodes.get(id);
  };
  const listeners = {};
  globalThis.document = {
    querySelector: node,
    addEventListener(event, callback) {
      listeners[event] = callback;
    },
    title: "",
  };
  globalThis.location = { hash: "#overview" };
  globalThis.window = { addEventListener() {}, scrollTo() {} };
  globalThis.localStorage = {
    setItem() {
      throw new Error("Token must not be persisted");
    },
    getItem() {
      throw new Error("Token must not be read from storage");
    },
  };
  globalThis.sessionStorage = globalThis.localStorage;
  const snapshot = createEngine(initialState()).snapshot();
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    const accepted = options.headers.Authorization === "Bearer test-session-token";
    return {
      ok: accepted,
      status: accepted ? 200 : 401,
      json: async () => (url === "/api/commands" ? { result: {}, state: snapshot } : snapshot),
    };
  };
  await import("../public/app.mjs?auth-test");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(node("#main").innerHTML, /type="password"/);
  assert.match(node("#main").innerHTML, /page memory/i);
  assert.equal(typeof node("#api-token-form").onsubmit, "function");
  node("#api-token").value = "test-session-token";
  await node("#api-token-form").onsubmit({
    preventDefault() {},
    currentTarget: node("#api-token-form"),
  });
  assert.equal(node("#api-token").value, "");
  assert.match(node("#main").innerHTML, /A clear view of your finances/);
  assert.equal(calls.at(-1).options.headers.Authorization, "Bearer test-session-token");
  assert.ok(!node("#main").innerHTML.includes("test-session-token"));
  await node("#refresh").onclick();
  assert.equal(calls.at(-1).options.headers.Authorization, "Bearer test-session-token");
  listeners.click({
    target: {
      closest: () => ({
        dataset: { action: "freeze", id: "card_atlas", frozen: "true" },
        disabled: false,
      }),
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls.at(-1).url, "/api/commands");
  assert.equal(calls.at(-1).options.headers.Authorization, "Bearer test-session-token");
  assert.equal(JSON.parse(calls.at(-1).options.body).type, "cardFreeze");
  assert.ok(!calls.at(-1).options.body.includes("test-session-token"));
});
