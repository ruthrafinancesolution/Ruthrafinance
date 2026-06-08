/** Shared Indian Rupee display — use across admin, employee, reports, and PDFs. */
export function formatCurrency(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "₹0";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatCurrencyRounded(value) {
  const amount = Math.round(Number(value ?? 0));
  if (!Number.isFinite(amount)) return "₹0";
  return `₹${amount.toLocaleString("en-IN")}`;
}
