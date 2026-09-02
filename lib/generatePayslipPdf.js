import { jsPDF } from "jspdf";

const INK = [19, 4, 34];
const MUTED = [112, 111, 131];
const SURFACE = [251, 249, 253];
const BORDER = [225, 219, 232];
const PRIMARY = [130, 36, 227];
const PRIMARY_TINT = [243, 234, 253];
const GREEN = [26, 156, 95];
const RED = [204, 51, 51];

// jsPDF's built-in fonts (Helvetica/Times/Courier) use WinAnsiEncoding,
// which has no ₦ glyph at all — trying to print it renders as a broken
// "¦" box, which is what shipped originally. Embedding a Unicode font
// just for one symbol isn't worth the weight, so every real Nigerian
// fintech PDF that hits this same limitation falls back to the "NGN"
// prefix instead — that's the fix here, not a cosmetic choice.
function naira(n) {
  // Round to the kobo first — upstream figures are a computed split of
  // a stored total (pension/tax/loans), and without this a payslip can
  // print a stray "₦0.33" line purely from floating-point drift, not a
  // real deduction.
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return `NGN ${v.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Allowance names are free text HR types into the salary structure
// form (e.g. "housing", "transport") and stored verbatim — correct as
// data, but title-cased here for display only, so the PDF itself
// reads as polished regardless of how it was typed in.
function titleCase(s) {
  return String(s).replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));
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
  const rowPad = 12; // inner left/right padding inside a card

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
  // the best-effort computed split of it. Rounded to the naira and
  // floored at that — a sub-naira gap is float drift, not a real
  // manual adjustment, and isn't worth a line item.
  const otherDeductions = Math.max(
    0,
    Math.round(
      Number(deductions || 0) - Number(pensionEmployeeMonthly || 0) - Number(taxMonthly || 0) - loanTotal
    )
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
  y = 120;
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

  y += 36;
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

  y += 34;
  doc.setDrawColor(...BORDER);
  doc.line(marginX, y, pageW - marginX, y);
  y += 22;

  // ---- Section title: small purple tab + heading, consistent gap to
  // whatever card follows it ----
  function sectionTitle(title) {
    doc.setFillColor(...PRIMARY);
    doc.rect(marginX, y - 8, 3, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PRIMARY);
    doc.text(title.toUpperCase(), marginX + 10, y);
    y += 14;
  }

  // ---- Card renderer: measures every row up front so the box is
  // drawn to fit its content exactly — the old version drew the box
  // around wherever y happened to land, which is what let the PAYE
  // annual-summary line overflow past its own right border. Row
  // kinds: normal (label/value), `small` (muted reference line, e.g.
  // annual figures), `sub` (a note under the row above), `divider`
  // (rule above this row, for a running total like Gross pay). ----
  function rowHeight(r) {
    let h = r.small ? 13 : 17;
    if (r.divider) h += 8;
    if (r.sub) h += 13;
    return h;
  }

  function renderCard(rows) {
    const padTop = 12;
    const padBottom = 10;
    const boxTop = y - 6;
    const contentHeight = rows.reduce((sum, r) => sum + rowHeight(r), 0);
    const boxHeight = padTop + contentHeight + padBottom;

    doc.setFillColor(...SURFACE);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(marginX, boxTop, contentW, boxHeight, 6, 6, "FD");

    let ry = boxTop + padTop + 7;
    rows.forEach((r) => {
      if (r.divider) {
        doc.setDrawColor(...BORDER);
        doc.line(marginX + rowPad, ry - 12, pageW - marginX - rowPad, ry - 12);
        ry += 8;
      }
      const small = !!r.small;
      doc.setFont("helvetica", r.bold ? "bold" : "normal");
      doc.setFontSize(small ? 8 : 9.5);
      doc.setTextColor(...(small ? MUTED : r.bold ? INK : [70, 68, 82]));
      doc.text(r.label, marginX + rowPad, ry);
      doc.setFont("helvetica", r.bold ? "bold" : "normal");
      doc.setTextColor(...(small ? MUTED : r.color || INK));
      doc.text(r.value, pageW - marginX - rowPad, ry, { align: "right" });
      ry += small ? 13 : 17;
      if (r.sub) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...MUTED);
        doc.text(r.sub, marginX + rowPad, ry - 4, { maxWidth: contentW - rowPad * 2 });
        ry += 13;
      }
    });

    y = boxTop + boxHeight + 18;
  }

  // ---- Earnings ----
  sectionTitle("Earnings");
  const earningsRows = [];
  if (basicSalary != null) earningsRows.push({ label: "Basic salary", value: naira(basicSalary) });
  Object.entries(allowances).forEach(([name, amount]) =>
    earningsRows.push({ label: titleCase(name), value: naira(amount) })
  );
  earningsRows.push({ label: "Gross pay", value: naira(grossPay), bold: true, color: GREEN, divider: true });
  renderCard(earningsRows);

  // ---- Pension ----
  sectionTitle("Pension (Pension Reform Act)");
  renderCard([
    {
      label: `Employee contribution${pensionEmployeeRate != null ? ` (${pensionEmployeeRate}%)` : ""}`,
      value: pensionEmployeeMonthly != null ? `-${naira(pensionEmployeeMonthly)}` : "—",
      color: RED,
    },
    {
      label: `Employer contribution${pensionEmployerRate != null ? ` (${pensionEmployerRate}%)` : ""}`,
      value: pensionEmployerMonthly != null ? naira(pensionEmployerMonthly) : "—",
      sub: "Not deducted from your pay — shown for transparency.",
    },
  ]);

  // ---- Tax ----
  sectionTitle("PAYE tax");
  const taxRows = [];
  if (annualGross != null) {
    taxRows.push({ label: "Annual gross", value: naira(annualGross), small: true });
    taxRows.push({ label: "Annual pension", value: naira(annualPension), small: true });
    taxRows.push({ label: "Annual chargeable income", value: naira(annualChargeableIncome), small: true });
  }
  taxRows.push({
    label: "Monthly PAYE",
    value: taxMonthly != null ? `-${naira(taxMonthly)}` : "—",
    color: RED,
    bold: true,
    divider: annualGross != null,
  });
  if (annualTax != null) {
    taxRows.push({ label: "Annual PAYE", value: naira(annualTax), small: true });
  }
  renderCard(taxRows);

  // ---- Loans / other deductions ----
  if (loanRepayments.length > 0 || otherDeductions >= 1) {
    sectionTitle("Other deductions");
    const otherRows = loanRepayments.map((l) => ({
      label: l.label || "Loan/advance repayment",
      value: `-${naira(l.amount)}`,
      color: RED,
    }));
    if (otherDeductions >= 1) otherRows.push({ label: "Other", value: `-${naira(otherDeductions)}`, color: RED });
    renderCard(otherRows);
  }

  // ---- Totals ----
  doc.setDrawColor(...BORDER);
  doc.line(marginX, y - 10, pageW - marginX, y - 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text("Total deductions", marginX, y + 8);
  doc.setTextColor(...RED);
  doc.text(`-${naira(deductions)}`, pageW - marginX, y + 8, { align: "right" });
  y += 24;

  // ---- Net pay ----
  const netBoxH = 56;
  // Keep this on the same page whenever there's genuinely room — only
  // break if it truly won't fit, so a payslip with an average number
  // of allowances/deductions doesn't spill an almost-empty second
  // page just for the net-pay total.
  if (y + netBoxH > pageH - 60) {
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
