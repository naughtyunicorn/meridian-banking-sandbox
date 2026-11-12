import test from "node:test";
import assert from "node:assert/strict";
let ui;
try {
  ui = await import("./ui.mjs");
} catch {
  ui = {};
}
test("money input preserves exact minor units and rejects extra precision", () => {
  assert.equal(typeof ui.minorUnits, "function");
  assert.equal(ui.minorUnits("12.34"), 1234);
  assert.equal(ui.minorUnits("0.01"), 1);
  assert.throws(() => ui.minorUnits("1.001"));
  assert.throws(() => ui.minorUnits("-1"));
  assert.throws(() => ui.minorUnits("NaN"));
});
test("untrusted ledger labels are escaped", () => {
  assert.equal(typeof ui.escapeHTML, "function");
  assert.equal(
    ui.escapeHTML('<img src=x onerror="x">'),
    "&lt;img src=x onerror=&quot;x&quot;&gt;",
  );
});
