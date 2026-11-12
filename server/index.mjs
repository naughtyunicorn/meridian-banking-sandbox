import { resolve } from "node:path";
import { openStore } from "./store.mjs";
import { createAppServer } from "./http.mjs";
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be 1–65535");
const store = await openStore(
  resolve(
    process.env.SANDBOX_DATA_FILE ||
      resolve(import.meta.dirname, "../.local/state.json"),
  ),
  { mode: process.env.BANKING_MODE || "sandbox" },
);
const server = createAppServer(store, {
  token: process.env.SANDBOX_API_TOKEN || "",
});
const host = process.env.HOST || "127.0.0.1";
server.listen(port, host, () =>
  console.log(`Meridian sandbox: http://${host}:${port}; real money disabled`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
