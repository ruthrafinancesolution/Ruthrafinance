/** Approved collection entries for employee-routed customers (any collector, including admin). */

export function isApprovedCollectionEntry(entry) {
  return String(entry?.approvalStatus || "").toLowerCase() === "approved";
}

export function filterScopedApprovedEntries(entries, scopedCustomerIds) {
  const ids =
    scopedCustomerIds instanceof Set ? scopedCustomerIds : new Set(scopedCustomerIds || []);
  return entries.filter(
    (entry) => entry?.customerId && ids.has(entry.customerId) && isApprovedCollectionEntry(entry)
  );
}

export function groupEntriesByCustomerId(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    const customerId = entry.customerId;
    if (!customerId) return;
    if (!map.has(customerId)) map.set(customerId, []);
    map.get(customerId).push(entry);
  });
  return map;
}
