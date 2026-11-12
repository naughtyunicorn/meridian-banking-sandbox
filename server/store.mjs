import { mkdir, readFile, open, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { createEngine } from "./engine.mjs";
export function assertSandboxMode(mode = "sandbox") {
  if (mode !== "sandbox")
    throw new Error(
      "BANKING_MODE must be sandbox. Live adapters are not configured; refusing live operation.",
    );
}
export async function openStore(file, { mode = "sandbox" } = {}) {
  assertSandboxMode(mode);
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  let saved;
  try {
    saved = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  let engine = createEngine(saved);
  let queue = Promise.resolve();
  const s = engine.snapshot();
  if (
    !s.metrics.ledgerBalanced ||
    !s.metrics.chainValid ||
    !s.metrics.reserveCovered
  )
    throw new Error("Saved state failed financial or chain integrity checks");
  async function persist(data) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    let handle;
    try {
      handle = await open(temporary, "wx", 0o600);
      await handle.writeFile(JSON.stringify(data));
      await handle.sync();
      await handle.close();
      handle = null;
      await rename(temporary, file);
      const directory = await open(dirname(file), "r");
      try {
        await directory.sync();
      } finally {
        await directory.close();
      }
    } catch (error) {
      if (handle) await handle.close();
      await unlink(temporary).catch(() => {});
      throw error;
    }
  }
  return {
    snapshot: () => engine.snapshot(),
    authorizeConsent: (...args) => engine.authorizeConsent(...args),
    command(payload) {
      const work = queue.then(async () => {
        const draft = createEngine(engine.exportState());
        const result = draft.command(payload);
        await persist(draft.exportState());
        engine = draft;
        return result;
      });
      queue = work.catch(() => {});
      return work;
    },
  };
}
