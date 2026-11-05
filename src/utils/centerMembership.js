import { DAY_CENTER_LABELS, WEEKDAY_NAMES } from "../constants/dayCenters";

const DAY_BY_TOKEN = {
  monday: "Monday Centre",
  mon: "Monday Centre",
  tuesday: "Tuesday Centre",
  tue: "Tuesday Centre",
  wednesday: "Wednesday Centre",
  wed: "Wednesday Centre",
  thursday: "Thursday Centre",
  thu: "Thursday Centre",
  friday: "Friday Centre",
  fri: "Friday Centre",
  saturday: "Saturday Centre",
  sat: "Saturday Centre",
};

function firstToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)[0] || "";
}

/** Map a stored centre string to a Monday–Saturday centre label when it is one of those days. */
export function canonicalDayLabel(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const exact = DAY_CENTER_LABELS.find((label) => label.toLowerCase() === lower);
  if (exact) return exact;
  const weekday = WEEKDAY_NAMES.find(
    (day) => lower === day.toLowerCase() || lower.startsWith(`${day.toLowerCase()} `)
  );
  if (weekday) return `${weekday} Centre`;
  return DAY_BY_TOKEN[firstToken(raw)] || "";
}

/**
 * Day centre and sub-centre for a customer, using Firestore fields.
 * Sub-centre slugs such as "wed-thattarmadum" stay on their weekday even when
 * that sub-centre is not stored in this browser.
 */
export function customerCenterParts(customer) {
  const selected = String(customer?.selectedDay || "").trim();
  const parent = String(customer?.parentCenterLabel || "").trim();
  const sub = String(customer?.subCenterLabel || "").trim();
  const day =
    canonicalDayLabel(parent) ||
    canonicalDayLabel(selected) ||
    canonicalDayLabel(sub);
  const subLabel = sub || (selected && !canonicalDayLabel(selected) ? selected : "");
  return { day, subLabel };
}

export function customerBelongsToDay(customer, dayLabel) {
  return customerCenterParts(customer).day === dayLabel;
}

export function customerBelongsToSubCenter(customer, subLabel) {
  const wanted = String(subLabel || "").trim().toLowerCase();
  if (!wanted) return false;
  const parts = customerCenterParts(customer);
  return (
    parts.subLabel.trim().toLowerCase() === wanted ||
    String(customer?.selectedDay || "").trim().toLowerCase() === wanted
  );
}

/** Sub-centres already saved locally, plus any named on customer records. Not written back. */
export function mergeDiscoveredSubCenters(storedCenters, customers) {
  const byLabel = new Map();
  for (const center of storedCenters || []) {
    if (!center?.label || !center.parent) continue;
    byLabel.set(center.label.trim().toLowerCase(), center);
  }
  for (const customer of customers || []) {
    const { day, subLabel } = customerCenterParts(customer);
    if (!day || !subLabel) continue;
    const key = subLabel.trim().toLowerCase();
    if (byLabel.has(key)) continue;
    byLabel.set(key, { label: subLabel, parent: day, color: "" });
  }
  return [...byLabel.values()];
}
