// Nigerian PAYE + pension estimate, built off a monthly salary
// structure (base salary + named allowances). This is a calculator,
// not tax advice or certified payroll software — the bands and
// pension rate below follow the 2020 Finance Act's standard formula,
// but company-specific reliefs, exemptions, or a different pension
// rate should be confirmed with an accountant before this number is
// treated as final. Every figure it produces stays editable in the
// UI before a payslip is saved.

// Annual PAYE bands (Finance Act 2020). Each tuple is [band width, rate].
// The last band (24%) has no upper bound.
const TAX_BANDS = [
  [300000, 0.07],
  [300000, 0.11],
  [500000, 0.15],
  [500000, 0.19],
  [1600000, 0.21],
];
const TOP_RATE = 0.24;

function annualTaxFor(taxableAnnual) {
  let remaining = Math.max(0, taxableAnnual);
  let tax = 0;

  for (const [width, rate] of TAX_BANDS) {
    const amountInBand = Math.min(remaining, width);
    tax += amountInBand * rate;
    remaining -= amountInBand;
    if (remaining <= 0) return tax;
  }

  // Anything left after all fixed bands is taxed at the top rate.
  tax += remaining * TOP_RATE;
  return tax;
}

export function sumAllowances(allowances) {
  return Object.values(allowances || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
}

// baseSalary/allowances are monthly figures. pensionEmployeeRate is a
// percentage (e.g. 8 for 8%), applied to base salary only — the
// simplest, most common basis; some companies also base it on
// base + housing + transport, which would need a per-company toggle
// this V1 doesn't have yet.
export function computePayslip({ baseSalary, allowances, pensionEmployeeRate }) {
  const base = Number(baseSalary) || 0;
  const allowancesTotal = sumAllowances(allowances);
  const grossPay = base + allowancesTotal;

  const pensionMonthly = base * ((Number(pensionEmployeeRate) || 0) / 100);
  const annualGross = grossPay * 12;
  const annualPension = pensionMonthly * 12;

  // Consolidated Relief Allowance: greater of ₦200,000 or 1% of gross,
  // plus 20% of gross — both taken off before tax bands apply.
  const cra = Math.max(200000, annualGross * 0.01) + annualGross * 0.2;

  const taxableAnnual = Math.max(0, annualGross - annualPension - cra);
  const annualTax = annualTaxFor(taxableAnnual);
  const taxMonthly = annualTax / 12;

  const totalDeductions = pensionMonthly + taxMonthly;
  const netPay = grossPay - totalDeductions;

  return {
    baseSalary: base,
    allowances: allowances || {},
    allowancesTotal,
    grossPay,
    pensionMonthly,
    taxMonthly,
    totalDeductions,
    netPay,
    // Kept for transparency on the payslip/breakdown — not shown by
    // default, but useful if a breakdown view ever needs to explain
    // the annual math behind the monthly tax figure.
    annualGross,
    cra,
    taxableAnnual,
    annualTax,
  };
}
