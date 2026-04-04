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
import { DEDUCTION_CATEGORIES, formatCurrency } from "@/lib/tax-helpers";
import { Plus, Trash2, Receipt } from "lucide-react";

export default function Deductions({ profileId }: { profileId: number }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ category: "mortgage_interest", description: "", amount: "" });

  const { data: entries = [] } = useQuery({
    queryKey: ["/api/profiles", profileId, "deductions"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/profiles/${profileId}/deductions`);
      return res.json();
    },
    enabled: profileId > 0,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/profiles/${profileId}/deductions`, {
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount) || 0,
        isTaxDeductible: 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "deductions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "calculate"] });
      setForm({ category: "mortgage_interest", description: "", amount: "" });
      toast({ title: "Deduction added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/deductions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "deductions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "calculate"] });
      toast({ title: "Deduction removed" });
    },
  });

  const total = entries.reduce((s: number, e: any) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-6" data-testid="deductions-page">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Add Deduction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger data-testid="select-deduction-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEDUCTION_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input data-testid="input-deduction-desc" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Details" />
            </div>
            <div>
              <Label>Amount</Label>
              <Input data-testid="input-deduction-amount" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="flex items-end">
              <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.amount} className="w-full" data-testid="button-add-deduction">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> Deduction Entries
            <span className="ml-auto text-sm font-normal text-muted-foreground">{entries.length} items</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No deductions yet. Add mortgage interest, charitable donations, and more above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry: any) => (
                  <TableRow key={entry.id} data-testid={`row-deduction-${entry.id}`}>
                    <TableCell>
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {DEDUCTION_CATEGORIES.find(c => c.value === entry.category)?.label || entry.category}
                      </span>
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(entry.amount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(entry.id)} data-testid={`button-delete-deduction-${entry.id}`}>
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
              <span>Total Itemized Deductions</span>
              <span>{formatCurrency(total)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
