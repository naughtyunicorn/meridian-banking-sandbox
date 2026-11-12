export function minorUnits(input) {
  const s = String(input).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw new Error("Enter a positive amount with up to two decimal places.");
  const [whole, fraction = ""] = s.split(".");
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new Error("Enter a positive amount within the sandbox limit.");
  return n;
}
export function escapeHTML(input) {
  return String(input ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
export function money(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0) / 100);
}
