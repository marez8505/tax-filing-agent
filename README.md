# Tax Filing Agent

A full-stack AI-powered tax preparation and filing assistant built with React, Express, SQLite, and Claude AI.

## Features

### Tax Preparation
- **Dashboard** — Real-time tax calculation summary with refund/owed amount, income breakdown, deductions comparison (standard vs. itemized), tax bracket visualization, and credits/payments overview
- **Profile Setup** — Taxpayer and spouse information, filing status, address, direct deposit bank details
- **Income Entry** — W-2, 1099-NEC, 1099-INT, 1099-DIV, 1099-R, SSA-1099, and other income with federal/state withholding tracking
- **Deductions** — Mortgage interest, property tax, SALT, charitable donations, medical expenses, student loan interest, HSA/IRA contributions, business expenses
- **Credits & Dependents** — Child Tax Credit (auto-calculated), EIC, AOTC, LLC, child care, saver's credit, EV and energy credits
- **Self-Employment** — Automatic SE tax calculation for 1099 income

### AI Tax Assistant
- **Conversational AI** — Ask questions about your taxes in plain English
- **Context-Aware** — The AI sees your real-time income, deductions, credits, and calculations
- **Suggested Questions** — Pre-built prompts for common tax questions
- **Personalized Advice** — Get recommendations for missed deductions and credits

### E-File & Export
- **TurboTax Export (.TXF)** — Download a TXF file to import directly into TurboTax Desktop or Online
- **H&R Block Export (.CSV)** — Download a CSV summary compatible with H&R Block and spreadsheet tools
- **E-File Links** — Direct links to IRS Free File, IRS Direct File, TurboTax Online, and H&R Block Online

### FPU Situation Desk Integration
- **Import Tax Deductibles** — Pull charitable donations, medical expenses, and other tax-deductible items directly from your FPU Situation Desk data
- **CSV or JSON Format** — Paste data in either format for quick import

### Annual Tax Code Updates
- **Auto-Update** — AI-powered research fetches the latest IRS tax brackets, standard deductions, and thresholds for any tax year
- **Tax Code Reference** — View and manage all stored tax code values
- **Year-Over-Year** — Support for multiple tax years with independent code tables

### Design
- **Dark Mode** — Full light/dark theme support
- **Responsive** — Works on desktop and tablet
- **Collapsible Sidebar** — Maximize workspace when needed

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, shadcn/ui, TanStack React Query, Wouter
- **Backend**: Express.js, Drizzle ORM, better-sqlite3
- **AI**: Anthropic Claude (via API) for tax chat and code updates
- **Database**: SQLite with WAL mode

## Tax Engine

The tax calculation engine supports:
- 2025 federal tax brackets (all filing statuses: MFJ, Single, HOH, MFS)
- Standard deduction vs. itemized comparison with automatic recommendation
- SALT cap ($10,000)
- Medical expense threshold (7.5% AGI)
- Self-employment tax (15.3% with 50% deduction)
- Child Tax Credit with AGI phaseout
- Marginal and effective tax rate calculation
- Bracket-by-bracket tax breakdown

## Getting Started

```bash
git clone https://github.com/marez8505/tax-filing-agent.git
cd tax-filing-agent
npm install
npx drizzle-kit push
npm run dev
```

The app runs at `http://localhost:5000`.

## Filing Status

Default: **Married Filing Jointly** (configurable in Profile tab)

## Disclaimer

This tool is for informational and educational purposes only. It should not be considered professional tax advice. Please consult a qualified tax professional before submitting any tax documents to the IRS.

## License

MIT
