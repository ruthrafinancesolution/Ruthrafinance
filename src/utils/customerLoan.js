/** A customer already has their one original loan when an ID and amounts are stored. */
export function customerHasIssuedLoan(customer) {
  const loanId = String(customer?.applicationId || customer?.loanId || "").trim();
  const amount = Number(customer?.loanAmount || 0);
  const payable = Number(customer?.totalPayable || 0);
  return Boolean(loanId) && amount > 0 && payable > 0;
}

export function viewLoanPath(customerId) {
  return `/dashboard/customer/${encodeURIComponent(customerId)}/profile?view=loan#loan`;
}
