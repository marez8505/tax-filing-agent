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
import { CREDIT_CATEGORIES, formatCurrency } from "@/lib/tax-helpers";
import { Plus, Trash2, Shield, Users } from "lucide-react";

export default function CreditsDependents({ profileId }: { profileId: number }) {
  const { toast } = useToast();

  // Credits
  const [creditForm, setCreditForm] = useState({ category: "child_tax_credit", description: "", amount: "" });
  const { data: credits = [] } = useQuery({
    queryKey: ["/api/profiles", profileId, "credits"],
    queryFn: async () => { const res = await apiRequest("GET", `/api/profiles/${profileId}/credits`); return res.json(); },
    enabled: profileId > 0,
  });

  const addCreditMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/profiles/${profileId}/credits`, {
      category: creditForm.category, description: creditForm.description, amount: parseFloat(creditForm.amount) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "calculate"] });
      setCreditForm({ category: "child_tax_credit", description: "", amount: "" });
      toast({ title: "Credit added" });
    },
  });

  const deleteCreditMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/credits/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "calculate"] });
    },
  });

  // Dependents
  const [depForm, setDepForm] = useState({ firstName: "", lastName: "", ssn: "", relationship: "child", dob: "", monthsLived: "12" });
  const { data: deps = [] } = useQuery({
    queryKey: ["/api/profiles", profileId, "dependents"],
    queryFn: async () => { const res = await apiRequest("GET", `/api/profiles/${profileId}/dependents`); return res.json(); },
    enabled: profileId > 0,
  });

  const addDepMutation = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/profiles/${profileId}/dependents`, {
      ...depForm, monthsLived: parseInt(depForm.monthsLived) || 12,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "dependents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "calculate"] });
      setDepForm({ firstName: "", lastName: "", ssn: "", relationship: "child", dob: "", monthsLived: "12" });
      toast({ title: "Dependent added" });
    },
  });

  const deleteDepMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/dependents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "dependents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "calculate"] });
    },
  });

  return (
    <div className="space-y-6" data-testid="credits-dependents-page">
      {/* Dependents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Dependents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-6 gap-3">
            <div><Label>First Name</Label><Input data-testid="input-dep-first" value={depForm.firstName} onChange={e => setDepForm(p => ({ ...p, firstName: e.target.value }))} /></div>
            <div><Label>Last Name</Label><Input data-testid="input-dep-last" value={depForm.lastName} onChange={e => setDepForm(p => ({ ...p, lastName: e.target.value }))} /></div>
            <div><Label>SSN</Label><Input data-testid="input-dep-ssn" value={depForm.ssn} onChange={e => setDepForm(p => ({ ...p, ssn: e.target.value }))} placeholder="XXX-XX-XXXX" /></div>
            <div>
              <Label>Relationship</Label>
              <Select value={depForm.relationship} onValueChange={v => setDepForm(p => ({ ...p, relationship: v }))}>
                <SelectTrigger data-testid="select-dep-rel"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="stepchild">Stepchild</SelectItem>
                  <SelectItem value="foster">Foster Child</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date of Birth</Label><Input data-testid="input-dep-dob" type="date" value={depForm.dob} onChange={e => setDepForm(p => ({ ...p, dob: e.target.value }))} /></div>
            <div className="flex items-end">
              <Button onClick={() => addDepMutation.mutate()} disabled={!depForm.firstName} className="w-full" data-testid="button-add-dep">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>
          {deps.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deps.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.firstName} {d.lastName}</TableCell>
                    <TableCell className="capitalize">{d.relationship}</TableCell>
                    <TableCell>{d.dob}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteDepMutation.mutate(d.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Credits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Tax Credits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>Credit Type</Label>
              <Select value={creditForm.category} onValueChange={v => setCreditForm(p => ({ ...p, category: v }))}>
                <SelectTrigger data-testid="select-credit-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CREDIT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input data-testid="input-credit-desc" value={creditForm.description} onChange={e => setCreditForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Amount</Label><Input data-testid="input-credit-amount" type="number" value={creditForm.amount} onChange={e => setCreditForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></div>
            <div className="flex items-end">
              <Button onClick={() => addCreditMutation.mutate()} disabled={!creditForm.amount} className="w-full" data-testid="button-add-credit">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>
          {credits.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credits.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {CREDIT_CATEGORIES.find(cat => cat.value === c.category)?.label || c.category}
                      </span>
                    </TableCell>
                    <TableCell>{c.description}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(c.amount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteCreditMutation.mutate(c.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
