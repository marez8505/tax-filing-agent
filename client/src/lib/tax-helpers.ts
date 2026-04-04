export const INCOME_CATEGORIES = [
  { value: "w2", label: "W-2 Wages" },
  { value: "1099_nec", label: "1099-NEC (Self-Employment)" },
  { value: "1099_int", label: "1099-INT (Interest)" },
  { value: "1099_div", label: "1099-DIV (Dividends)" },
  { value: "1099_r", label: "1099-R (Retirement)" },
  { value: "ssa", label: "Social Security (SSA-1099)" },
  { value: "other", label: "Other Income" },
];

export const DEDUCTION_CATEGORIES = [
  { value: "mortgage_interest", label: "Mortgage Interest" },
  { value: "property_tax", label: "Property Tax" },
  { value: "salt", label: "State & Local Tax (SALT)" },
  { value: "charity", label: "Charitable Donations" },
  { value: "medical", label: "Medical Expenses" },
  { value: "student_loan", label: "Student Loan Interest" },
  { value: "educator", label: "Educator Expenses" },
  { value: "hsa", label: "HSA Contributions" },
  { value: "ira", label: "IRA Contributions" },
  { value: "business", label: "Business Expenses" },
];

export const CREDIT_CATEGORIES = [
  { value: "child_tax_credit", label: "Child Tax Credit" },
  { value: "eic", label: "Earned Income Credit" },
  { value: "aotc", label: "American Opportunity (Education)" },
  { value: "llc", label: "Lifetime Learning Credit" },
  { value: "child_care", label: "Child & Dependent Care" },
  { value: "saver", label: "Saver's Credit" },
  { value: "ev", label: "Electric Vehicle Credit" },
  { value: "energy", label: "Residential Energy Credit" },
];

export const FILING_STATUSES = [
  { value: "married_filing_jointly", label: "Married Filing Jointly" },
  { value: "married_filing_separately", label: "Married Filing Separately" },
  { value: "single", label: "Single" },
  { value: "head_of_household", label: "Head of Household" },
];

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(rate: number): string {
  return (rate * 100).toFixed(1) + "%";
}
