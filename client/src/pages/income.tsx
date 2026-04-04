import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { INCOME_CATEGORIES, formatCurrency } from "@/lib/tax-helpers";
import { Plus, Trash2, DollarSign } from "lucide-react";

export default function Income({ profileId }: { profileId: number }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ category: "w2", source: "", amount: "", federalWithheld: "", stateWithheld: "", description: "" });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["/api/profiles", profileId, "income"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/profiles/${profileId}/income`);
      return res.json();
    },
    enabled: profileId > 0,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/profiles/${profileId}/income`, {
        category: form.category,
        source: form.source,
        amount: parseFloat(form.amount) || 0,
        federalWithheld: parseFloat(form.federalWithheld) || 0,
        stateWithheld: parseFloat(form.stateWithheld) || 0,
        description: form.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "income"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "calculate"] });
      setForm({ category: "w2", source: "", amount: "", federalWithheld: "", stateWithheld: "", description: "" });
      toast({ title: "Income added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/income/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "income"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "calculate"] });
      toast({ title: "Income removed" });
    },
  });

  const total = entries.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const totalWithheld = entries.reduce((s: number, e: any) => s + (e.federalWithheld || 0), 0);

  return (
    <div className="space-y-6" data-testid="income-page">
      {/* Add Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Add Income
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <Label>Type</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger data-testid="select-income-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCOME_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Employer/Source</Label>
              <Input data-testid="input-income-source" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} placeholder="Company name" />
            </div>
            <div>
              <Label>Amount</Label>
              <Input data-testid="input-income-amount" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label>Fed. Withheld</Label>
              <Input data-testid="input-income-fed-withheld" type="number" value={form.federalWithheld} onChange={e => setForm(p => ({ ...p, federalWithheld: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.amount} className="w-full" data-testid="button-add-income">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Income Entries
            <span className="ml-auto text-sm font-normal text-muted-foreground">{entries.length} items</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No income entries yet. Add your W-2s, 1099s, and other income above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Fed. Withheld</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry: any) => (
                  <TableRow key={entry.id} data-testid={`row-income-${entry.id}`}>
                    <TableCell>
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {INCOME_CATEGORIES.find(c => c.value === entry.category)?.label || entry.category}
                      </span>
                    </TableCell>
                    <TableCell>{entry.source || entry.description}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(entry.amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.federalWithheld || 0)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(entry.id)} data-testid={`button-delete-income-${entry.id}`}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {entries.length > 0 && (
            <div className="flex justify-between mt-4 pt-3 border-t text-sm font-semibold">
              <span>Total</span>
              <div className="flex gap-8">
                <span>{formatCurrency(total)}</span>
                <span className="text-muted-foreground">{formatCurrency(totalWithheld)} withheld</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
