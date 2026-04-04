/**
 * Federal Tax Calculation Engine
 * Supports Tax Year 2025 brackets, standard deductions, credits.
 * The tax code reference table allows annual updates.
 */

import { storage } from "./storage";
import type { IncomeEntry, DeductionEntry, CreditEntry, Dependent } from "@shared/schema";

// Default 2025 tax brackets (MFJ)
const DEFAULT_TAX_CODE_2025: Record<string, string> = {
  // Standard Deductions
  "std_deduction_single": "15000",
  "std_deduction_mfj": "30000",
  "std_deduction_mfs": "15000",
  "std_deduction_hoh": "22500",
  // MFJ Tax Brackets
  "bracket_mfj_1_rate": "0.10", "bracket_mfj_1_max": "23850",
  "bracket_mfj_2_rate": "0.12", "bracket_mfj_2_max": "96950",
  "bracket_mfj_3_rate": "0.22", "bracket_mfj_3_max": "206700",
  "bracket_mfj_4_rate": "0.24", "bracket_mfj_4_max": "394600",
  "bracket_mfj_5_rate": "0.32", "bracket_mfj_5_max": "501050",
  "bracket_mfj_6_rate": "0.35", "bracket_mfj_6_max": "751600",
  "bracket_mfj_7_rate": "0.37", "bracket_mfj_7_max": "999999999",
  // Single Tax Brackets
  "bracket_single_1_rate": "0.10", "bracket_single_1_max": "11925",
  "bracket_single_2_rate": "0.12", "bracket_single_2_max": "48475",
  "bracket_single_3_rate": "0.22", "bracket_single_3_max": "103350",
  "bracket_single_4_rate": "0.24", "bracket_single_4_max": "197300",
  "bracket_single_5_rate": "0.32", "bracket_single_5_max": "250525",
  "bracket_single_6_rate": "0.35", "bracket_single_6_max": "626350",
  "bracket_single_7_rate": "0.37", "bracket_single_7_max": "999999999",
  // HOH Tax Brackets
  "bracket_hoh_1_rate": "0.10", "bracket_hoh_1_max": "17000",
  "bracket_hoh_2_rate": "0.12", "bracket_hoh_2_max": "64850",
  "bracket_hoh_3_rate": "0.22", "bracket_hoh_3_max": "103350",
  "bracket_hoh_4_rate": "0.24", "bracket_hoh_4_max": "197300",
  "bracket_hoh_5_rate": "0.32", "bracket_hoh_5_max": "250500",
  "bracket_hoh_6_rate": "0.35", "bracket_hoh_6_max": "626350",
  "bracket_hoh_7_rate": "0.37", "bracket_hoh_7_max": "999999999",
  // Credits
  "child_tax_credit": "2000",
  "child_tax_credit_phaseout_mfj": "400000",
  "child_tax_credit_phaseout_single": "200000",
  "eic_max_0": "649",
  "eic_max_1": "4328",
  "eic_max_2": "7152",
  "eic_max_3": "8046",
  "aotc_max": "2500",
  "llc_max": "2000",
  "saver_credit_max": "2000",
  // SALT Cap
  "salt_cap": "10000",
  // AMT
  "amt_exemption_mfj": "133300",
  "amt_exemption_single": "85700",
  // Social Security
  "ss_max_taxable": "176100",
  "ss_rate": "0.062",
  "medicare_rate": "0.0145",
  // Self-employment
  "se_tax_rate": "0.153",
};

export function initializeTaxCode(year: number) {
  const existing = storage.getTaxCodeByYear(year);
  if (existing.length === 0) {
    const now = new Date().toISOString();
    for (const [key, value] of Object.entries(DEFAULT_TAX_CODE_2025)) {
      storage.upsertTaxCode({ taxYear: year, key, value, description: key.replace(/_/g, " "), lastUpdated: now });
    }
  }
}

function getCode(year: number, key: string): number {
  const val = storage.getTaxCodeValue(year, key);
  if (val) return parseFloat(val);
  return parseFloat(DEFAULT_TAX_CODE_2025[key] || "0");
}

function getFilingStatusPrefix(filingStatus: string): string {
  switch (filingStatus) {
    case "married_filing_jointly": return "mfj";
    case "married_filing_separately": return "mfs";
    case "head_of_household": return "hoh";
    default: return "single";
  }
}

function getBracketPrefix(filingStatus: string): string {
  switch (filingStatus) {
    case "married_filing_jointly": return "mfj";
    case "married_filing_separately": return "single"; // same brackets as single
    case "head_of_household": return "hoh";
    default: return "single";
  }
}

export interface TaxCalculation {
  // Income
  totalWages: number;
  totalInterest: number;
  totalDividends: number;
  total1099: number;
  totalSSA: number;
  totalOtherIncome: number;
  grossIncome: number;
  // Above-the-line adjustments
  aboveLineDeductions: number;
  agi: number;
  // Deductions
  totalItemized: number;
  standardDeduction: number;
  deductionUsed: "standard" | "itemized";
  deductionAmount: number;
  // Taxable income
  taxableIncome: number;
  // Tax
  taxBeforeCredits: number;
  bracketBreakdown: { bracket: number; rate: number; tax: number; income: number }[];
  effectiveRate: number;
  marginalRate: number;
  // Credits
  totalCredits: number;
  creditBreakdown: { name: string; amount: number }[];
  // Withholding
  totalFederalWithheld: number;
  totalStateWithheld: number;
  // Self-employment
  seTax: number;
  seDeduction: number;
  // Final
  totalTax: number;
  totalPayments: number;
  refundOrOwed: number;
  isRefund: boolean;
}

export function calculateTax(
  profileId: number,
  taxYear: number,
  filingStatus: string,
): TaxCalculation {
  initializeTaxCode(taxYear);

  const income = storage.getIncomeByProfile(profileId);
  const deductions = storage.getDeductionsByProfile(profileId);
  const credits = storage.getCreditsByProfile(profileId);
  const deps = storage.getDependentsByProfile(profileId);

  // --- INCOME ---
  const totalWages = sumByCategory(income, ["w2"]);
  const totalInterest = sumByCategory(income, ["1099_int"]);
  const totalDividends = sumByCategory(income, ["1099_div"]);
  const total1099 = sumByCategory(income, ["1099_nec"]);
  const totalSSA = sumByCategory(income, ["ssa"]);
  const total1099R = sumByCategory(income, ["1099_r"]);
  const totalOtherIncome = sumByCategory(income, ["other"]);
  const grossIncome = totalWages + totalInterest + totalDividends + total1099 + (totalSSA * 0.85) + total1099R + totalOtherIncome;

  // --- SELF-EMPLOYMENT ---
  const seIncome = total1099;
  const seTax = seIncome > 0 ? seIncome * 0.9235 * getCode(taxYear, "se_tax_rate") : 0;
  const seDeduction = seTax / 2;

  // --- ABOVE-THE-LINE DEDUCTIONS ---
  const studentLoan = sumByDeductionCategory(deductions, ["student_loan"]);
  const educator = sumByDeductionCategory(deductions, ["educator"]);
  const hsa = sumByDeductionCategory(deductions, ["hsa"]);
  const ira = sumByDeductionCategory(deductions, ["ira"]);
  const aboveLineDeductions = studentLoan + educator + hsa + ira + seDeduction;
  const agi = Math.max(0, grossIncome - aboveLineDeductions);

  // --- DEDUCTIONS ---
  const prefix = getFilingStatusPrefix(filingStatus);
  const standardDeduction = getCode(taxYear, `std_deduction_${prefix}`);

  const mortgageInterest = sumByDeductionCategory(deductions, ["mortgage_interest"]);
  const propertyTax = sumByDeductionCategory(deductions, ["property_tax"]);
  const stateTax = sumByDeductionCategory(deductions, ["salt"]);
  const saltTotal = Math.min(propertyTax + stateTax, getCode(taxYear, "salt_cap"));
  const charity = sumByDeductionCategory(deductions, ["charity"]);
  const medical = sumByDeductionCategory(deductions, ["medical"]);
  const medicalDeductible = Math.max(0, medical - agi * 0.075);
  const business = sumByDeductionCategory(deductions, ["business"]);

  const totalItemized = mortgageInterest + saltTotal + charity + medicalDeductible + business;
  const deductionUsed: "standard" | "itemized" = totalItemized > standardDeduction ? "itemized" : "standard";
  const deductionAmount = Math.max(totalItemized, standardDeduction);

  // --- TAXABLE INCOME ---
  const taxableIncome = Math.max(0, agi - deductionAmount);

  // --- TAX BRACKETS ---
  const bracketPrefix = getBracketPrefix(filingStatus);
  const bracketBreakdown: { bracket: number; rate: number; tax: number; income: number }[] = [];
  let remainingIncome = taxableIncome;
  let prevMax = 0;
  let taxBeforeCredits = 0;
  let marginalRate = 0.10;

  for (let i = 1; i <= 7; i++) {
    const rate = getCode(taxYear, `bracket_${bracketPrefix}_${i}_rate`);
    const max = getCode(taxYear, `bracket_${bracketPrefix}_${i}_max`);
    const bracketSize = max - prevMax;
    const incomeInBracket = Math.min(remainingIncome, bracketSize);
    const taxInBracket = incomeInBracket * rate;

    if (incomeInBracket > 0) {
      bracketBreakdown.push({ bracket: i, rate, tax: taxInBracket, income: incomeInBracket });
      taxBeforeCredits += taxInBracket;
      marginalRate = rate;
    }
    remainingIncome -= incomeInBracket;
    prevMax = max;
    if (remainingIncome <= 0) break;
  }

  const effectiveRate = taxableIncome > 0 ? taxBeforeCredits / taxableIncome : 0;

  // --- CREDITS ---
  const creditBreakdown: { name: string; amount: number }[] = [];
  let totalCredits = 0;

  // Child Tax Credit
  const qualifyingChildren = deps.filter(d => {
    if (!d.dob) return true;
    const age = taxYear - parseInt(d.dob.split("-")[0] || "2020");
    return age < 17;
  }).length;
  const ctcPhaseout = getCode(taxYear, filingStatus === "married_filing_jointly" ? "child_tax_credit_phaseout_mfj" : "child_tax_credit_phaseout_single");
  let ctcAmount = qualifyingChildren * getCode(taxYear, "child_tax_credit");
  if (agi > ctcPhaseout) {
    ctcAmount = Math.max(0, ctcAmount - Math.floor((agi - ctcPhaseout) / 1000) * 50);
  }
  if (ctcAmount > 0) {
    creditBreakdown.push({ name: "Child Tax Credit", amount: ctcAmount });
    totalCredits += ctcAmount;
  }

  // User-entered credits
  for (const credit of credits) {
    creditBreakdown.push({ name: credit.description || credit.category, amount: credit.amount });
    totalCredits += credit.amount;
  }

  // --- WITHHOLDING ---
  const totalFederalWithheld = income.reduce((s, i) => s + (i.federalWithheld || 0), 0);
  const totalStateWithheld = income.reduce((s, i) => s + (i.stateWithheld || 0), 0);

  // --- FINAL ---
  const totalTax = Math.max(0, taxBeforeCredits + seTax - totalCredits);
  const totalPayments = totalFederalWithheld;
  const refundOrOwed = totalPayments - totalTax;
  const isRefund = refundOrOwed >= 0;

  return {
    totalWages, totalInterest, totalDividends, total1099, totalSSA, totalOtherIncome, grossIncome,
    aboveLineDeductions, agi,
    totalItemized, standardDeduction, deductionUsed, deductionAmount,
    taxableIncome,
    taxBeforeCredits, bracketBreakdown, effectiveRate, marginalRate,
    totalCredits, creditBreakdown,
    totalFederalWithheld, totalStateWithheld,
    seTax, seDeduction,
    totalTax, totalPayments, refundOrOwed, isRefund,
  };
}

function sumByCategory(entries: IncomeEntry[], categories: string[]): number {
  return entries.filter(e => categories.includes(e.category)).reduce((s, e) => s + e.amount, 0);
}

function sumByDeductionCategory(entries: DeductionEntry[], categories: string[]): number {
  return entries.filter(e => categories.includes(e.category) && e.isTaxDeductible).reduce((s, e) => s + e.amount, 0);
}

// Generate TXF export for TurboTax/H&R Block import
export function generateTXF(profileId: number, taxYear: number, filingStatus: string): string {
  const income = storage.getIncomeByProfile(profileId);
  const deductions = storage.getDeductionsByProfile(profileId);
  const deps = storage.getDependentsByProfile(profileId);

  const lines: string[] = [];
  lines.push("V042"); // TXF version
  lines.push("ATax Filing Agent Export");
  lines.push(`D${String(taxYear).padStart(2, "0")}/01/${taxYear}`);
  lines.push("^");

  // W-2 Wages
  for (const w2 of income.filter(i => i.category === "w2")) {
    lines.push("TD"); lines.push("N1");
    lines.push(`C1`);
    lines.push(`L1`);
    lines.push(`$${w2.amount.toFixed(2)}`);
    lines.push("^");
    if (w2.federalWithheld && w2.federalWithheld > 0) {
      lines.push("TD"); lines.push("N2");
      lines.push("C1"); lines.push("L1");
      lines.push(`$${w2.federalWithheld.toFixed(2)}`);
      lines.push("^");
    }
  }

  // Interest
  for (const int of income.filter(i => i.category === "1099_int")) {
    lines.push("TD"); lines.push("N23");
    lines.push("C1"); lines.push("L1");
    lines.push(`$${int.amount.toFixed(2)}`);
    lines.push("^");
  }

  // Dividends
  for (const div of income.filter(i => i.category === "1099_div")) {
    lines.push("TD"); lines.push("N32");
    lines.push("C1"); lines.push("L1");
    lines.push(`$${div.amount.toFixed(2)}`);
    lines.push("^");
  }

  // Mortgage Interest deduction
  for (const d of deductions.filter(dd => dd.category === "mortgage_interest")) {
    lines.push("TD"); lines.push("N485");
    lines.push("C1"); lines.push("L1");
    lines.push(`$${d.amount.toFixed(2)}`);
    lines.push("^");
  }

  // Charitable donations
  for (const d of deductions.filter(dd => dd.category === "charity")) {
    lines.push("TD"); lines.push("N488");
    lines.push("C1"); lines.push("L1");
    lines.push(`$${d.amount.toFixed(2)}`);
    lines.push("^");
  }

  return lines.join("\n");
}

// Generate CSV export
export function generateCSV(profileId: number, taxYear: number, filingStatus: string): string {
  const calc = calculateTax(profileId, taxYear, filingStatus);
  const profile = storage.getProfile(profileId);
  const income = storage.getIncomeByProfile(profileId);
  const deductions = storage.getDeductionsByProfile(profileId);

  const rows: string[] = [];
  rows.push("Category,Description,Amount");
  rows.push(`Filing Status,"${filingStatus}",`);
  rows.push(`Tax Year,"${taxYear}",`);
  rows.push("");
  rows.push("INCOME,,");
  for (const i of income) {
    rows.push(`"${i.category}","${i.source || i.description}","${i.amount.toFixed(2)}"`);
  }
  rows.push(`"Gross Income",,"${calc.grossIncome.toFixed(2)}"`);
  rows.push("");
  rows.push("DEDUCTIONS,,");
  for (const d of deductions) {
    rows.push(`"${d.category}","${d.description}","${d.amount.toFixed(2)}"`);
  }
  rows.push(`"Deduction Used","${calc.deductionUsed}","${calc.deductionAmount.toFixed(2)}"`);
  rows.push("");
  rows.push("SUMMARY,,");
  rows.push(`"AGI",,"${calc.agi.toFixed(2)}"`);
  rows.push(`"Taxable Income",,"${calc.taxableIncome.toFixed(2)}"`);
  rows.push(`"Tax Before Credits",,"${calc.taxBeforeCredits.toFixed(2)}"`);
  rows.push(`"Total Credits",,"${calc.totalCredits.toFixed(2)}"`);
  rows.push(`"Total Tax",,"${calc.totalTax.toFixed(2)}"`);
  rows.push(`"Federal Withheld",,"${calc.totalFederalWithheld.toFixed(2)}"`);
  rows.push(`"${calc.isRefund ? 'Refund' : 'Amount Owed'}",,"${Math.abs(calc.refundOrOwed).toFixed(2)}"`);

  return rows.join("\n");
}
