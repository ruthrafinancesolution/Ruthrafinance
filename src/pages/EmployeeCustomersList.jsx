import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Search, UsersRound } from "lucide-react";
import EmployeeCustomerEntryModal from "../components/employee/EmployeeCustomerEntryModal";
import { EMPLOYEE_ROOT_DAYS } from "../constants/employeeDays";
import useAuth from "../hooks/useAuth";
import useEmployeeCenterScope from "../hooks/useEmployeeCenterScope";
import { useLoanDataSync } from "../context/LoanDataSyncContext";
import { createCustomerAmountEntry } from "../services/userAuth";
import { buildEmployeeCustomerSummary, getEmployeeCustomerSearchText } from "../utils/employeeCustomerSummary";

const COLLECTION_STATUS_FILTERS = [
  { key: "All", label: "All" },
  { key: "Collected", label: "Collected" },
  { key: "Partial Payment", label: "Partial Payment" },
  { key: "Rescheduled", label: "Rescheduled" },
  { key: "Skipped", label: "Skipped" },
];

function defaultDayLabel(selectedDay) {
  if (selectedDay) return selectedDay;
  return EMPLOYEE_ROOT_DAYS[0].label;
}

function CustomerListField({ label, value, valueClassName = "text-slate-950" }) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[9px]">{label}</p>
      <p className={`mt-0.5 truncate text-[11px] font-semibold sm:text-xs ${valueClassName}`}>{value || "—"}</p>
    </div>
  );
}

function CustomerStatusField({ emoji, label, onCollect, collected }) {
  if (collected) {
    return (
      <div className="min-w-0 shrink-0">
        <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[9px]">Status</p>
        <p className="mt-0.5 text-[9px] font-semibold text-emerald-700 sm:text-[10px]">Collected</p>
      </div>
    );
  }

  const tone =
    label === "Overdue" ? "text-rose-700" : label === "Due Today" ? "text-amber-700" : "text-emerald-700";
  return (
    <div className="min-w-0 shrink-0">
      <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[9px]">Status</p>
      <div className="mt-0.5 flex items-center gap-0.5">
        <p className={`min-w-0 truncate text-[9px] font-semibold leading-tight sm:text-[10px] ${tone}`}>
          {emoji} {label}
        </p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onCollect?.();
          }}
          className="inline-flex h-4 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[7px] font-semibold leading-none text-white transition hover:bg-blue-700 active:scale-[0.98]"
        >
          Collect
        </button>
      </div>
    </div>
  );
}

export default function EmployeeCustomersList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { customers, entries, loading } = useLoanDataSync();
  const { allCenters, hasAssignedCenter, scopeCustomers } = useEmployeeCenterScope();
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("All");
  const [entryCustomer, setEntryCustomer] = useState(null);

  const entriesByCustomerId = useMemo(() => {
    const map = new Map();
    entries.forEach((entry) => {
      const customerId = entry.customerId;
      if (!customerId) return;
      if (!map.has(customerId)) map.set(customerId, []);
      map.get(customerId).push(entry);
    });
    return map;
  }, [entries]);

  const readyCustomers = useMemo(() => {
    return scopeCustomers(customers).sort((left, right) =>
      String(left.customerName || "").localeCompare(String(right.customerName || ""), undefined, { sensitivity: "base" })
    );
  }, [customers, scopeCustomers]);

  const customerRows = useMemo(() => {
    return readyCustomers.map((customer) => {
      const customerEntries = entriesByCustomerId.get(customer.customerId) || [];
      return {
        customer,
        ...buildEmployeeCustomerSummary(customer, customerEntries, allCenters),
      };
    });
  }, [allCenters, entriesByCustomerId, readyCustomers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customerRows.filter((row) => {
      const matchesSearch = !q || getEmployeeCustomerSearchText(row.customer, row, allCenters).includes(q);
      const matchesCollection = collectionFilter === "All" || row.collectionStatus === collectionFilter;
      return matchesSearch && matchesCollection;
    });
  }, [allCenters, collectionFilter, query, customerRows]);

  const openCustomerDetail = (row) => {
    const day = defaultDayLabel(row.customer.selectedDay);
    navigate(`/employee/customers/${encodeURIComponent(day)}/${encodeURIComponent(row.customer.customerId)}`, {
      state: { customer: row.customer, fromList: true },
    });
  };

  return (
    <div className="mx-auto w-full max-w-lg pb-1">
      <header className="app-panel mb-2.5 flex items-center gap-3 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="app-icon-shell flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/70 sm:h-10 sm:w-10">
          <UsersRound className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="app-eyebrow text-[9px] font-semibold uppercase tracking-[0.2em] sm:text-[10px]">Customers</p>
          <h1 className="text-base font-semibold leading-tight text-slate-950 sm:text-lg">My Customers</h1>
        </div>
      </header>

      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {COLLECTION_STATUS_FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setCollectionFilter(option.key)}
            className={`rounded-2xl border px-2 py-2 text-center text-[10px] font-semibold leading-tight transition sm:text-xs ${
              collectionFilter === option.key
                ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                : "border-slate-200/90 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, phone, ID, place…"
          className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none ring-slate-300/40 placeholder:text-slate-400 focus:border-[var(--app-accent)] focus:ring-2"
        />
      </div>

      {!hasAssignedCenter ? (
        <p className="mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          No centre assigned. Customers will appear here once your administrator assigns a centre.
        </p>
      ) : null}

      <ul className="flex flex-col gap-1.5">
        {filtered.map((row) => (
          <li key={row.customerId}>
            <div className="app-panel-muted flex w-full items-center gap-1.5 rounded-2xl px-3 py-2.5 sm:gap-2 sm:px-3.5 sm:py-3">
              <button
                type="button"
                onClick={() => openCustomerDetail(row)}
                className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.1fr)_minmax(0,0.75fr)_minmax(0,0.95fr)_minmax(0,0.65fr)] items-center gap-1 text-left transition active:scale-[0.99] sm:gap-1.5"
              >
                <CustomerListField
                  label="Name"
                  value={row.customerName || "Unnamed"}
                  valueClassName={row.isCurrentTenureCollected ? "text-emerald-700" : "text-slate-950"}
                />
                <CustomerListField
                  label="Due"
                  value={row.currentDueAmount}
                  valueClassName="tabular-nums text-slate-950"
                />
                <CustomerListField
                  label="Due date"
                  value={row.currentDueDate}
                  valueClassName="tabular-nums text-slate-800"
                />
                <CustomerListField label="Tenure" value={row.currentTenure} valueClassName="text-slate-700" />
              </button>
              <CustomerStatusField
                emoji={row.dueStatusEmoji}
                label={row.dueStatusLabel}
                collected={row.isCurrentTenureCollected}
                onCollect={() => setEntryCustomer(row.customer)}
              />
              <button
                type="button"
                onClick={() => openCustomerDetail(row)}
                className="inline-flex shrink-0 items-center justify-center text-slate-400 transition active:scale-[0.98]"
                aria-label={`View ${row.customerName || "customer"} details`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {entryCustomer ? (
        <EmployeeCustomerEntryModal
          customer={entryCustomer}
          defaultCollectorName={profile?.displayName || ""}
          onClose={() => setEntryCustomer(null)}
          onSave={async ({ amount, note, paymentMethod, collectionStatus, collectionDate, collectorName }) => {
            await createCustomerAmountEntry({
              customerId: entryCustomer.customerId,
              customerName: entryCustomer.customerName,
              amount,
              note,
              createdBy: profile?.uid || "employee",
              paymentMethod,
              collectionStatus,
              collectionDate,
              collectorName,
            });
          }}
        />
      ) : null}

      {!loading && filtered.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-600">
          No customers match your search or collection status.
        </p>
      ) : null}
    </div>
  );
}
