function loanKey(loan) {
  return String(loan?.applicationId || loan?.loanId || loan?.id || "");
}

function approvedAmount(entry) {
  if (String(entry?.approvalStatus || "").toLowerCase() !== "approved") return 0;
  if (entry?.isDeleted === true) return 0;
  return Number(entry?.amount || 0);
}

function earliestLoanId(loans) {
  const sorted = [...(loans || [])].sort((a, b) =>
    String(a.submittedAt || a.loanIssueDate || "").localeCompare(String(b.submittedAt || b.loanIssueDate || ""))
  );
  return loanKey(sorted[0]);
}

/** Payments stored before multi-loan tagging stay on the customer's earliest loan. */
export function entriesForLoan(loan, customerLoans, entries) {
  const id = loanKey(loan);
  const legacyId = earliestLoanId(customerLoans);
  return (entries || []).filter((entry) => {
    if (String(entry?.customerId || "") && loan?.customerId && String(entry.customerId) !== String(loan.customerId)) {
      return false;
    }
    const tagged = String(entry?.applicationId || entry?.loanId || "").trim();
    if (tagged) return tagged === id;
    return id && id === legacyId;
  });
}

export function paidAmountForLoan(loan, customerLoans, entries) {
  return entriesForLoan(loan, customerLoans, entries).reduce((sum, entry) => sum + approvedAmount(entry), 0);
}

/** Per-loan completion. A customer's other loans do not decide this one. */
export function isLoanFullyCompleted(loan, paidAmount) {
  const status = String(loan?.loanStatus || "").trim().toLowerCase();
  if (status === "closed" || status === "completed") return true;
  const payable = Number(loan?.totalPayable || 0);
  if (payable <= 0) return false;
  return Number(paidAmount || 0) >= payable;
}

export function completionDateForLoan(loan, customerLoans, entries) {
  if (loan?.closedAt) return loan.closedAt;
  const paid = entriesForLoan(loan, customerLoans, entries)
    .filter((entry) => approvedAmount(entry) > 0)
    .map((entry) => entry.approvedAt || entry.collectionDate || entry.submittedAt)
    .filter(Boolean)
    .sort();
  return paid[paid.length - 1] || "";
}
