import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/tax-helpers";
import { DollarSign, TrendingUp, TrendingDown, Receipt, CreditCard, Shield, ArrowDown, ArrowUp } from "lucide-react";

export default function Dashboard({ profileId }: { profileId: number }) {
  const { data: calc, isLoading } = useQuery({
    queryKey: ["/api/profiles", profileId, "calculate"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/profiles/${profileId}/calculate`);
      return res.json();
    },
    enabled: profileId > 0,
  });

  const { data: profile } = useQuery({
    queryKey: ["/api/profiles", profileId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/profiles/${profileId}`);
      return res.json();
    },
    enabled: profileId > 0,
  });

  if (isLoading || !calc) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading tax calculation...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Hero: Refund or Owed */}
      <Card className={`border-2 ${calc.isRefund ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                {profile?.taxYear || 2025} Federal Tax {calc.isRefund ? "Refund" : "Amount Owed"}
              </p>
              <p className={`text-3xl font-bold mt-1 ${calc.isRefund ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-refund-amount">
                {formatCurrency(Math.abs(calc.refundOrOwed))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Filing: {(profile?.filingStatus || "").replace(/_/g, " ")}
              </p>
            </div>
            <div className={`p-4 rounded-full ${calc.isRefund ? "bg-green-500/10" : "bg-red-500/10"}`}>
              {calc.isRefund ? <ArrowDown className="h-8 w-8 text-green-600 dark:text-green-400" /> : <ArrowUp className="h-8 w-8 text-red-600 dark:text-red-400" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={<DollarSign className="h-4 w-4" />} label="Gross Income" value={formatCurrency(calc.grossIncome)} />
        <KPICard icon={<TrendingDown className="h-4 w-4" />} label="AGI" value={formatCurrency(calc.agi)} />
        <KPICard icon={<Receipt className="h-4 w-4" />} label="Taxable Income" value={formatCurrency(calc.taxableIncome)} />
        <KPICard icon={<Shield className="h-4 w-4" />} label="Effective Rate" value={formatPercent(calc.effectiveRate)} />
      </div>

      {/* Breakdown Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Income Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Income Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="W-2 Wages" value={calc.totalWages} />
            <Row label="1099 Self-Employment" value={calc.total1099} />
            <Row label="Interest" value={calc.totalInterest} />
            <Row label="Dividends" value={calc.totalDividends} />
            <Row label="Social Security" value={calc.totalSSA} />
            <Row label="Other" value={calc.totalOtherIncome} />
            <div className="border-t pt-2 mt-2">
              <Row label="Gross Income" value={calc.grossIncome} bold />
            </div>
          </CardContent>
        </Card>

        {/* Deduction Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" /> Deductions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="Standard Deduction" value={calc.standardDeduction} />
            <Row label="Total Itemized" value={calc.totalItemized} />
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">Using</span>
                <Badge variant={calc.deductionUsed === "itemized" ? "default" : "secondary"}>
                  {calc.deductionUsed} ({formatCurrency(calc.deductionAmount)})
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Brackets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Tax Brackets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calc.bracketBreakdown && calc.bracketBreakdown.length > 0 ? (
              <div className="space-y-2">
                {calc.bracketBreakdown.map((b: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatPercent(b.rate)} on {formatCurrency(b.income)}
                    </span>
                    <span className="font-medium">{formatCurrency(b.tax)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <Row label="Tax Before Credits" value={calc.taxBeforeCredits} bold />
                  <Row label="Marginal Rate" value={formatPercent(calc.marginalRate)} isText />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No taxable income</p>
            )}
          </CardContent>
        </Card>

        {/* Credits & Payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Credits & Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {calc.creditBreakdown && calc.creditBreakdown.map((c: any, i: number) => (
              <Row key={i} label={c.name} value={c.amount} />
            ))}
            {(!calc.creditBreakdown || calc.creditBreakdown.length === 0) && (
              <p className="text-sm text-muted-foreground">No credits applied</p>
            )}
            <div className="border-t pt-2 mt-2">
              <Row label="Total Credits" value={calc.totalCredits} bold />
              {calc.seTax > 0 && <Row label="SE Tax" value={calc.seTax} />}
              <Row label="Federal Withheld" value={calc.totalFederalWithheld} />
              <Row label="Total Tax" value={calc.totalTax} bold />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, bold, isText }: { label: string; value: any; bold?: boolean; isText?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{isText ? value : typeof value === "number" ? formatCurrency(value) : value}</span>
    </div>
  );
}
