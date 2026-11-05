import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useLoanDataSync } from "../../context/LoanDataSyncContext";
import { DAY_CENTER_LABELS } from "../../constants/dayCenters";
import { customerCenterParts } from "../../utils/centerMembership";
import { completionDateForLoan, isLoanFullyCompleted, paidAmountForLoan } from "../../utils/loanCompletion";
import { isRecordDeleted } from "../../utils/recordFlags";

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB");
}

function loanRows(customers, applications) {
  const rows = [];
  const seen = new Set();
  for (const application of applications || []) {
    if (isRecordDeleted(application)) continue;
    const customerId = String(application.customerId || "");
    const loanId = String(application.applicationId || application.id || "");
    if (!customerId || !loanId) continue;
    const key = `${customerId}:${loanId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ ...application, customerId, applicationId: loanId });
  }
  for (const customer of customers || []) {
    if (isRecordDeleted(customer)) continue;
    const loanId = String(customer.applicationId || "");
    const customerId = String(customer.customerId || customer.id || "");
    if (!loanId || !customerId || seen.has(`${customerId}:${loanId}`)) continue;
    if (Number(customer.loanAmount || 0) <= 0 && Number(customer.totalPayable || 0) <= 0) continue;
    seen.add(`${customerId}:${loanId}`);
    rows.push({ ...customer, customerId, applicationId: loanId });
  }
  return rows;
}

export default function LoanCompletedPanel() {
  const navigate = useNavigate();
  const { customers, entries, loanApplications, loading, error } = useLoanDataSync();
  const [search, setSearch] = useState("");
  const [center, setCenter] = useState("All");

  const completed = useMemo(() => {
    const customerById = new Map(
      (customers || []).map((customer) => [String(customer.customerId || customer.id || ""), customer])
    );
    const loans = loanRows(customers, loanApplications);
    const byCustomer = new Map();
    for (const loan of loans) {
      const list = byCustomer.get(loan.customerId) || [];
      list.push(loan);
      byCustomer.set(loan.customerId, list);
    }
    return loans
      .map((loan) => {
        const customer = customerById.get(loan.customerId) || loan;
        const siblings = byCustomer.get(loan.customerId) || [loan];
        const paid = paidAmountForLoan(loan, siblings, entries);
        const payable = Number(loan.totalPayable || 0);
        const centre = customerCenterParts(customer);
        return {
          loan,
          customer,
          paid,
          payable,
          centre: centre.day || "—",
          subCentre: centre.subLabel || "—",
          completed: isLoanFullyCompleted(loan, paid),
          completionDate: completionDateForLoan(loan, siblings, entries),
        };
      })
      .filter((row) => row.completed);
  }, [customers, entries, loanApplications]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return completed.filter((row) => {
      if (center !== "All" && row.centre !== center) return false;
      if (!query) return true;
      const loan = row.loan;
      const customer = row.customer;
      return [
        customer.customerName,
        customer.customerId,
        loan.applicationId,
        customer.mobileNumber,
        customer.alternateNumber,
        row.centre,
        row.subCentre,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [completed, search, center]);

  function openLoan(row) {
    const customerId = row.customer.customerId || row.loan.customerId;
    const loanId = row.loan.applicationId;
    navigate(
      `/dashboard/customer/${encodeURIComponent(customerId)}/profile?view=completed&loan=${encodeURIComponent(loanId)}`
    );
  }

  return (
    <section className="min-w-0 rounded-[24px] border border-slate-200/90 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, customer ID, loan ID, mobile"
            className="app-input w-full py-2.5 pl-9 text-sm"
          />
        </div>
        <select value={center} onChange={(event) => setCenter(event.target.value)} className="app-select w-full py-2.5 text-sm sm:w-48">
          <option value="All">All centres</option>
          {DAY_CENTER_LABELS.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading completed loans…</p> : null}
      {!loading && error ? <p className="app-alert-error">{error}</p> : null}
      {!loading && !error && visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-500">
          No completed loans match this search.
        </p>
      ) : null}

      {!loading && visible.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[1100px] w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                {[
                  "Customer",
                  "Customer ID",
                  "Loan ID",
                  "Mobile",
                  "Centre",
                  "Sub-centre",
                  "Loan amount",
                  "Total payable",
                  "Amount paid",
                  "Issue date",
                  "Start date",
                  "End date",
                  "Completed",
                  "Status",
                  "",
                ].map((label) => (
                  <th key={label || "action"} className="whitespace-nowrap px-3 py-2">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((row) => {
                const loan = row.loan;
                const customer = row.customer;
                return (
                  <tr key={`${customer.customerId}-${loan.applicationId}`}>
                    <td className="px-3 py-2 font-medium text-slate-900">{customer.customerName || "—"}</td>
                    <td className="px-3 py-2">{customer.customerId || "—"}</td>
                    <td className="px-3 py-2">{loan.applicationId || "—"}</td>
                    <td className="px-3 py-2">{customer.mobileNumber || customer.alternateNumber || "—"}</td>
                    <td className="px-3 py-2">{row.centre}</td>
                    <td className="px-3 py-2">{row.subCentre}</td>
                    <td className="px-3 py-2">{formatMoney(loan.loanAmount)}</td>
                    <td className="px-3 py-2">{formatMoney(row.payable)}</td>
                    <td className="px-3 py-2">{formatMoney(row.paid)}</td>
                    <td className="px-3 py-2">{formatDate(loan.loanIssueDate)}</td>
                    <td className="px-3 py-2">{formatDate(loan.disbursementDate)}</td>
                    <td className="px-3 py-2">{formatDate(loan.dueDate)}</td>
                    <td className="px-3 py-2">{formatDate(row.completionDate)}</td>
                    <td className="px-3 py-2">Completed</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openLoan(row)}
                        className="app-button-secondary rounded-lg px-2.5 py-1 text-xs font-semibold"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
