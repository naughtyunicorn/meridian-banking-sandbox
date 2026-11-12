import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { timingSafeEqual } from "node:crypto";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};
export function createAppServer(
  store,
  {
    staticDirectory = resolve(import.meta.dirname, "../public"),
    token = "",
  } = {},
) {
  return createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Frame-Options", "DENY");
    const json = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) {
        if (req.method === "GET" && url.pathname === "/api/health")
          return json(200, {
            status: "ok",
            mode: "sandbox",
            realMoneyEnabled: false,
          });
        if (token) {
          const supplied = Buffer.from(req.headers.authorization || "");
          const expected = Buffer.from(`Bearer ${token}`);
          if (
            supplied.length !== expected.length ||
            !timingSafeEqual(supplied, expected)
          )
            return json(401, {
              error: "Sandbox API token required",
              code: "UNAUTHORIZED",
            });
        }
        if (
          req.method === "GET" &&
          ["/api/snapshot", "/api/state"].includes(url.pathname)
        )
          return json(200, store.snapshot());
        if (
          req.method === "GET" &&
          url.pathname.startsWith("/api/open-banking/")
        ) {
          const resource = url.pathname.split("/").at(-1);
          const scope =
            resource === "accounts"
              ? "accounts:read"
              : resource === "transactions"
                ? "transactions:read"
                : null;
          const consentId = req.headers["x-consent-id"];
          if (!scope || !store.authorizeConsent(consentId, scope))
            return json(403, {
              error: "Active consent with matching scope required",
              code: "CONSENT_REQUIRED",
            });
          const state = store.snapshot();
          return json(200, {
            data:
              resource === "accounts"
                ? state.accounts.filter((a) =>
                    ["operating", "customer"].includes(a.type),
                  )
                : state.transactions,
            mode: "sandbox",
          });
        }
        if (req.method === "POST" && url.pathname === "/api/commands") {
          const origin = req.headers.origin;
          if (
            origin &&
            origin !== `http://${req.headers.host}` &&
            origin !== `https://${req.headers.host}`
          )
            return json(403, {
              error: "Cross-origin commands are not allowed",
              code: "ORIGIN_REJECTED",
            });
          if (!req.headers["content-type"]?.startsWith("application/json"))
            return json(415, {
              error: "Content-Type application/json required",
              code: "CONTENT_TYPE",
            });
          let body = "";
          for await (const chunk of req) {
            body += chunk;
            if (Buffer.byteLength(body) > 65536)
              return json(413, {
                error: "Request too large",
                code: "PAYLOAD_TOO_LARGE",
              });
          }
          let command;
          try {
            command = JSON.parse(body);
          } catch {
            return json(400, { error: "Invalid JSON", code: "INVALID_JSON" });
          }
          const result = await store.command(command);
          return json(200, { result, state: store.snapshot() });
        }
        return json(404, { error: "API route not found", code: "NOT_FOUND" });
      }
      if (!["GET", "HEAD"].includes(req.method))
        return json(405, {
          error: "Method not allowed",
          code: "METHOD_NOT_ALLOWED",
        });
      const base = resolve(staticDirectory),
        path = resolve(
          base,
          "." +
            decodeURIComponent(
              url.pathname === "/" ? "/index.html" : url.pathname,
            ),
        );
      if (path !== base && !path.startsWith(base + sep))
        return json(403, { error: "Forbidden", code: "FORBIDDEN" });
      let content;
      try {
        content = await readFile(path);
      } catch (error) {
        if (error.code === "ENOENT" || error.code === "EISDIR")
          return json(404, { error: "File not found", code: "NOT_FOUND" });
        throw error;
      }
      res.writeHead(200, {
        "Content-Type": mime[extname(path)] || "application/octet-stream",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch (error) {
      const status =
        error.code === "IDEMPOTENCY_CONFLICT"
          ? 409
          : error.code === "INSUFFICIENT_FUNDS"
            ? 422
            : error.code === "VALIDATION"
              ? 400
              : 500;
      json(status, {
        error: status === 500 ? "Internal sandbox error" : error.message,
        code: error.code || "INTERNAL_ERROR",
      });
      if (status === 500)
        console.error("Sandbox request failed:", error.message);
    }
  });
}
