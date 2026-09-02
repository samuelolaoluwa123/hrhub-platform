import { jsPDF } from "jspdf";

const INK = [19, 4, 34];
const MUTED = [112, 111, 131];
const SURFACE = [251, 249, 253];
const BORDER = [225, 219, 232];
const PRIMARY = [130, 36, 227];
const PRIMARY_TINT = [243, 234, 253];
const GREEN = [26, 156, 95];
const RED = [204, 51, 51];

function naira(n) {
  const v = Number(n) || 0;
  return `₦${v.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Shows only the last 4 digits — a downloadable PDF sits on whatever
// device/inbox the employee saves it to, so the full account number
// has no business being on it even though HR obviously has it on file.
function maskAccount(number) {
  if (!number) return null;
  const digits = String(number).replace(/\s+/g, "");
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

// 11 — a real, professional payslip: company letterhead, employee
// detail, an itemized earnings table (not just one "gross pay" line),
// pension shown both sides (employee deducted, employer disclosed —
// never deducted), the actual monthly/annual PAYE computation, every
// loan repayment that hit this specific payslip, and a reconciled
// deductions total that always adds up to what was actually withheld
// — not a guess. Every figure here is real data already stored on
// this payslip (or its linked loan_repayments/salary_structures), not
// synthesized for the PDF.
export function downloadPayslipPdf({
  companyName,
  companyAddress,
  companyRcNumber,
  employeeName,
  jobTitle,
  department,
  employeeRef,
  bankName,
  bankAccountNumber,
  periodLabel,
  payDate,
  grossPay,
  deductions,
  netPay,
  breakdown,
  loanRepayments = [],
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = 595;
  const pageH = 842;
  const marginX = 46;
  const contentW = pageW - marginX * 2;

  const b = breakdown || {};
  const allowances = b.allowances && typeof b.allowances === "object" ? b.allowances : {};
  const basicSalary = b.base_salary ?? null;
  const pensionEmployeeMonthly = b.pension_monthly ?? null;
  const pensionEmployeeRate = b.pension_employee_rate ?? null;
  const pensionEmployerMonthly = b.pension_employer_monthly ?? null;
  const pensionEmployerRate = b.pension_employer_rate ?? null;
  const taxMonthly = b.tax_monthly ?? null;
  const annualGross = b.annual_gross ?? null;
  const annualPension = b.annual_pension ?? null;
  const annualChargeableIncome = b.annual_chargeable_income ?? null;
  const annualTax = b.annual_tax ?? null;

  const loanTotal = loanRepayments.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  // Whatever's left after pension + PAYE + loans is reconciled here
  // rather than assumed zero — the deductions total on the payslip is
  // ground truth (it's what was actually withheld); pension/tax are
  // the best-effort computed split of it. Any gap is a real manual
  // adjustment HR made when the payslip was created.
  const otherDeductions = Math.max(
    0,
    Number(deductions || 0) - Number(pensionEmployeeMonthly || 0) - Number(taxMonthly || 0) - loanTotal
  );

  let y = 0;

  // ---- Letterhead ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text(companyName || "Company", marginX, 54);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  let addrY = 68;
  if (companyAddress) {
    doc.text(companyAddress, marginX, addrY, { maxWidth: contentW * 0.55 });
    addrY += 12;
  }
  if (companyRcNumber) {
    doc.text(`RC ${companyRcNumber}`, marginX, addrY);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...PRIMARY);
  doc.text("PAYSLIP", pageW - marginX, 54, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(periodLabel, pageW - marginX, 68, { align: "right" });
  if (payDate) doc.text(`Pay date: ${payDate}`, pageW - marginX, 80, { align: "right" });

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(1);
  doc.line(marginX, 96, pageW - marginX, 96);

  // ---- Employee block ----
  y = 118;
  const empColW = contentW / 3;
  const empFields = [
    ["EMPLOYEE", employeeName],
    ["JOB TITLE", jobTitle || "—"],
    ["DEPARTMENT", department || "—"],
  ];
  empFields.forEach(([label, value], i) => {
    const x = marginX + i * empColW;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(String(value), x, y + 15);
  });

  y += 34;
  const empFields2 = [
    ["EMPLOYEE REF", employeeRef || "—"],
    ["PAYMENT METHOD", bankName ? `Bank transfer — ${bankName}` : "—"],
    ["ACCOUNT", maskAccount(bankAccountNumber) || "—"],
  ];
  empFields2.forEach(([label, value], i) => {
    const x = marginX + i * empColW;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(String(value), x, y + 15);
  });

  y += 38;
  doc.setDrawColor(...BORDER);
  doc.line(marginX, y, pageW - marginX, y);
  y += 24;

  // ---- Section helper ----
  function sectionTitle(title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PRIMARY);
    doc.text(title.toUpperCase(), marginX, y);
    y += 14;
  }

  function tableRow(label, value, { bold = false, color = INK, sub = null } = {}) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...(bold ? INK : [70, 68, 82]));
    doc.text(label, marginX + 8, y);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
    doc.text(value, pageW - marginX - 8, y, { align: "right" });
    y += sub ? 12 : 16;
    if (sub) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(sub, marginX + 8, y);
      y += 14;
    }
  }

  // ---- Earnings ----
  sectionTitle("Earnings");
  const earningsTop = y - 12;
  if (basicSalary != null) tableRow("Basic salary", naira(basicSalary));
  Object.entries(allowances).forEach(([name, amount]) => tableRow(name, naira(amount)));
  y += 4;
  doc.setDrawColor(...BORDER);
  doc.line(marginX, y, pageW - marginX, y);
  y += 14;
  tableRow("Gross pay", naira(grossPay), { bold: true, color: GREEN });
  doc.setFillColor(...SURFACE);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(marginX, earningsTop, contentW, y - earningsTop + 6, 6, 6, "S");
  y += 18;

  // ---- Pension ----
  sectionTitle("Pension (Pension Reform Act)");
  const pensionTop = y - 12;
  tableRow(
    `Employee contribution${pensionEmployeeRate != null ? ` (${pensionEmployeeRate}%)` : ""}`,
    pensionEmployeeMonthly != null ? `-${naira(pensionEmployeeMonthly)}` : "—",
    { color: RED }
  );
  tableRow(
    `Employer contribution${pensionEmployerRate != null ? ` (${pensionEmployerRate}%)` : ""}`,
    pensionEmployerMonthly != null ? naira(pensionEmployerMonthly) : "—",
    { sub: "Not deducted from your pay — shown for transparency." }
  );
  doc.setFillColor(...SURFACE);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(marginX, pensionTop, contentW, y - pensionTop, 6, 6, "S");
  y += 14;

  // ---- Tax ----
  sectionTitle("PAYE tax");
  const taxTop = y - 12;
  if (annualGross != null) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const line1 = `Annual gross ${naira(annualGross)}  ·  Annual pension ${naira(annualPension)}  ·  Annual chargeable income ${naira(annualChargeableIncome)}`;
    doc.text(line1, marginX + 8, y, { maxWidth: contentW - 16 });
    y += 16;
  }
  tableRow("Monthly PAYE", taxMonthly != null ? `-${naira(taxMonthly)}` : "—", { color: RED, bold: true });
  if (annualTax != null) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Annual PAYE: ${naira(annualTax)}`, marginX + 8, y);
    y += 14;
  }
  doc.setFillColor(...SURFACE);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(marginX, taxTop, contentW, y - taxTop, 6, 6, "S");
  y += 14;

  // ---- Loans / other deductions ----
  if (loanRepayments.length > 0 || otherDeductions > 0) {
    sectionTitle("Other deductions");
    const otherTop = y - 12;
    loanRepayments.forEach((l) =>
      tableRow(l.label || "Loan/advance repayment", `-${naira(l.amount)}`, { color: RED })
    );
    if (otherDeductions > 0) tableRow("Other", `-${naira(otherDeductions)}`, { color: RED });
    doc.setFillColor(...SURFACE);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(marginX, otherTop, contentW, y - otherTop, 6, 6, "S");
    y += 14;
  }

  // ---- Totals ----
  y += 4;
  tableRow("Total deductions", `-${naira(deductions)}`, { bold: true, color: RED });
  y += 8;

  // ---- Net pay ----
  const netBoxH = 56;
  if (y + netBoxH > pageH - 90) {
    doc.addPage();
    y = 60;
  }
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(marginX, y, contentW, netBoxH, 8, 8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...PRIMARY_TINT);
  doc.text("NET PAY", marginX + 18, y + 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  doc.text(naira(netPay), pageW - marginX - 18, y + 36, { align: "right" });

  // ---- Footer ----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    "This payslip is confidential and generated by HRhub for the named employee only. Figures follow the Finance Act 2020 PAYE bands and the Pension Reform Act — contact your HR administrator with any questions.",
    marginX,
    pageH - 40,
    { maxWidth: contentW }
  );

  const filename = `payslip-${(employeeName || "employee").replace(/\s+/g, "-").toLowerCase()}-${periodLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(filename);
}
