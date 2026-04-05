import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatPercent } from "@/lib/tax-helpers";
import BackfillWizard from "@/pages/backfill-wizard";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  History, TrendingUp, Plus, ChevronRight, CheckCircle,
  Clock, FileCheck, AlertCircle, PenLine, CalendarDays, RotateCcw, DatabaseBackup
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  in_progress: { label: "In Progress", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20", icon: Clock },
  filed:       { label: "Filed",       color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20", icon: FileCheck },
  accepted:    { label: "Accepted",    color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20", icon: CheckCircle },
  amended:     { label: "Amended",     color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20", icon: AlertCircle },
};

export default function TaxHistory({ activeProfileId, onSwitchYear }: { activeProfileId: number; onSwitchYear: (id: number) => void }) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ status: "in_progress", notes: "", filedDate: "", confirmationNumber: "" });
  const [rolloverTarget, setRolloverTarget] = useState<number | null>(null);
  const [showBackfill, setShowBackfill] = useState(false);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["/api/history"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/history");
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/profiles/${id}/status`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      setEditingId(null);
      toast({ title: "Return updated" });
    },
  });

  const rolloverMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/profiles/${id}/rollover`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      setRolloverTarget(null);
      if (data.profile) {
        onSwitchYear(data.profile.id);
        toast({ title: `${data.profile.taxYear} return started`, description: `Your info and ${data.depsRolledOver} dependent(s) were carried forward.` });
      }
    },
    onError: (err: any) => {
      toast({ title: "Already exists", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (row: any) => {
    setEditForm({ status: row.status, notes: row.notes || "", filedDate: row.filedDate || "", confirmationNumber: row.confirmationNumber || "" });
    setEditingId(row.id);
  };

  // Chart data — oldest first
  const chartData = [...history].reverse().map((h: any) => ({
    year: String(h.taxYear),
    income: Math.round(h.grossIncome),
    agi: Math.round(h.agi),
    tax: Math.round(h.totalTax),
    refund: h.isRefund ? Math.round(Math.abs(h.refundOrOwed)) : 0,
    owed: !h.isRefund ? Math.round(Math.abs(h.refundOrOwed)) : 0,
    effectiveRate: parseFloat((h.effectiveRate * 100).toFixed(1)),
    deductions: Math.round(h.deductionAmount),
  }));

  const mostRecentYear = history.length > 0 ? history[0].taxYear : null;

  const tooltipStyle = {
    contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" },
    labelStyle: { fontWeight: 600, marginBottom: 4 },
  };

  return (
    <div className="space-y-6" data-testid="history-page">
      {/* Start New Year banner */}
      {mostRecentYear && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm">Start {mostRecentYear + 1} Return</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Roll over your personal info, address, and dependents from {mostRecentYear} — just like TurboTax does each year.
                </p>
              </div>
              <Button
                onClick={() => {
                  const src = history.find((h: any) => h.taxYear === mostRecentYear);
                  if (src) setRolloverTarget(src.id);
                }}
                data-testid="button-start-new-year"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" /> Start {mostRecentYear + 1}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backfill Banner — show when fewer than 3 prior years exist */}
      {history.length < 4 && (
        <Card className="border-dashed border-primary/30 bg-primary/[0.03]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm flex items-center gap-2">
                  <DatabaseBackup className="h-4 w-4 text-primary" />
                  Seed Your Tax History (2022 – 2024)
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter summary data for prior years to unlock year-over-year charts and trend analysis — just like TurboTax's history feature.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBackfill(true)}
                data-testid="button-add-prior-years"
                className="shrink-0"
              >
                <DatabaseBackup className="h-4 w-4 mr-1.5" /> Add Prior Years
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Years Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> All Returns
              </CardTitle>
              <CardDescription>Click a year to switch to it, or edit its filing status and notes.</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBackfill(true)}
              data-testid="button-add-prior-years-header"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <DatabaseBackup className="h-3.5 w-3.5" /> Add Prior Years
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No returns yet. Start by entering your 2025 income and deductions.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Gross Income</TableHead>
                  <TableHead className="text-right">AGI</TableHead>
                  <TableHead className="text-right">Total Tax</TableHead>
                  <TableHead className="text-right">Refund / Owed</TableHead>
                  <TableHead className="text-right">Eff. Rate</TableHead>
                  <TableHead className="text-right">Filed Date</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row: any) => {
                  const sc = STATUS_CONFIG[row.status] || STATUS_CONFIG.in_progress;
                  const StatusIcon = sc.icon;
                  const isActive = row.id === activeProfileId;
                  return (
                    <TableRow
                      key={row.id}
                      className={`cursor-pointer ${isActive ? "bg-primary/5" : "hover:bg-accent/50"}`}
                      onClick={() => onSwitchYear(row.id)}
                      data-testid={`row-history-${row.taxYear}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base">{row.taxYear}</span>
                          {isActive && <Badge variant="outline" className="text-xs py-0 px-1.5">Active</Badge>}
                        </div>
                      </TableCell>
                      <TableCell onClick={e => { e.stopPropagation(); openEdit(row); }}>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${sc.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.grossIncome)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.agi)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.totalTax)}</TableCell>
                      <TableCell className={`text-right font-semibold ${row.isRefund ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {row.isRefund ? "+" : "-"}{formatCurrency(Math.abs(row.refundOrOwed))}
                      </TableCell>
                      <TableCell className="text-right">{formatPercent(row.effectiveRate)}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {row.filedDate ? new Date(row.filedDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} title="Edit status" data-testid={`button-edit-status-${row.taxYear}`}>
                            <PenLine className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => onSwitchYear(row.id)} title="Open return" data-testid={`button-open-year-${row.taxYear}`}>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      {chartData.length >= 2 && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Income vs AGI Trend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Income Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="income" name="Gross Income" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="agi" name="AGI" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Refund/Owed Bar Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> Refund vs. Owed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="refund" name="Refund" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="owed" name="Owed" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tax Trend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Total Tax Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} {...tooltipStyle} />
                  <Bar dataKey="tax" name="Total Tax" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Effective Rate Trend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Effective Tax Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} domain={[0, "auto"]} />
                  <Tooltip formatter={(v: any) => `${v}%`} {...tooltipStyle} />
                  <Line type="monotone" dataKey="effectiveRate" name="Eff. Rate %" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {chartData.length < 2 && history.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">Charts appear once you have 2+ years of data</p>
            <p className="text-xs text-muted-foreground mt-1">After you file your first return, start {history[0]?.taxYear + 1} to begin tracking trends.</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Status Dialog */}
      <Dialog open={editingId !== null} onOpenChange={open => !open && setEditingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Return Status</DialogTitle>
            <DialogDescription>Track the current status of this tax year's return.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger data-testid="select-return-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="filed">Filed</SelectItem>
                  <SelectItem value="accepted">Accepted by IRS</SelectItem>
                  <SelectItem value="amended">Amended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(editForm.status === "filed" || editForm.status === "accepted") && (
              <>
                <div>
                  <Label>Filed Date</Label>
                  <Input type="date" value={editForm.filedDate} onChange={e => setEditForm(p => ({ ...p, filedDate: e.target.value }))} data-testid="input-filed-date" />
                </div>
                <div>
                  <Label>Confirmation / Acknowledgement Number</Label>
                  <Input value={editForm.confirmationNumber} onChange={e => setEditForm(p => ({ ...p, confirmationNumber: e.target.value }))} placeholder="IRS e-file confirmation" data-testid="input-confirmation" />
                </div>
              </>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any notes about this return..." data-testid="input-notes" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
              <Button
                onClick={() => statusMutation.mutate({ id: editingId!, data: editForm })}
                disabled={statusMutation.isPending}
                data-testid="button-save-status"
              >
                {statusMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Backfill Wizard */}
      <BackfillWizard open={showBackfill} onClose={() => setShowBackfill(false)} />

      {/* Rollover Confirm Dialog */}
      <Dialog open={rolloverTarget !== null} onOpenChange={open => !open && setRolloverTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Start New Tax Year
            </DialogTitle>
            <DialogDescription>
              {rolloverTarget && (() => {
                const src = history.find((h: any) => h.id === rolloverTarget);
                return src ? `We'll carry forward your personal info, address, bank details, and dependents from ${src.taxYear} — the same way TurboTax does. Income, deductions, and credits start fresh for the new year.` : "";
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setRolloverTarget(null)}>Cancel</Button>
            <Button
              onClick={() => rolloverTarget && rolloverMutation.mutate(rolloverTarget)}
              disabled={rolloverMutation.isPending}
              data-testid="button-confirm-rollover"
            >
              {rolloverMutation.isPending ? "Creating..." : "Start New Year"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
