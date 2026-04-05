import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  INCOME_CATEGORIES,
  DEDUCTION_CATEGORIES,
  CREDIT_CATEGORIES,
  FILING_STATUSES,
} from "@/lib/tax-helpers";
import { Plus, Trash2, CheckCircle, ClipboardList } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncomeRow {
  id: string;
  category: string;
  source: string;
  amount: string;
  federalWithheld: string;
  stateWithheld: string;
}

interface DeductionRow {
  id: string;
  category: string;
  description: string;
  amount: string;
}

interface CreditRow {
  id: string;
  category: string;
  description: string;
  amount: string;
}

interface DependentRow {
  id: string;
  firstName: string;
  lastName: string;
  ssn: string;
  relationship: string;
  dob: string;
}

interface YearFormState {
  filingStatus: string;
  firstName1: string;
  lastName1: string;
  ssn1: string;
  firstName2: string;
  lastName2: string;
  ssn2: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  filedDate: string;
  confirmationNumber: string;
  notes: string;
  income: IncomeRow[];
  deductions: DeductionRow[];
  credits: CreditRow[];
  dependents: DependentRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

function emptyIncome(): IncomeRow {
  return { id: uid(), category: "w2", source: "", amount: "", federalWithheld: "", stateWithheld: "" };
}
function emptyDeduction(): DeductionRow {
  return { id: uid(), category: "mortgage_interest", description: "", amount: "" };
}
function emptyCredit(): CreditRow {
  return { id: uid(), category: "child_tax_credit", description: "", amount: "" };
}
function emptyDependent(): DependentRow {
  return { id: uid(), firstName: "", lastName: "", ssn: "", relationship: "child", dob: "" };
}

function defaultForm(): YearFormState {
  return {
    filingStatus: "married_filing_jointly",
    firstName1: "", lastName1: "", ssn1: "",
    firstName2: "", lastName2: "", ssn2: "",
    street: "", city: "", state: "TX", zip: "",
    status: "accepted",
    filedDate: "", confirmationNumber: "", notes: "",
    income: [emptyIncome()],
    deductions: [],
    credits: [],
    dependents: [],
  };
}

const PRIOR_YEARS = [2022, 2023, 2024];

const RETURN_STATUSES = [
  { value: "accepted", label: "Accepted by IRS" },
  { value: "filed",    label: "Filed" },
  { value: "in_progress", label: "In Progress" },
  { value: "amended", label: "Amended" },
];

const RELATIONSHIPS = [
  { value: "child",       label: "Child" },
  { value: "stepchild",   label: "Stepchild" },
  { value: "foster_child",label: "Foster Child" },
  { value: "sibling",     label: "Sibling" },
  { value: "parent",      label: "Parent" },
  { value: "other",       label: "Other Relative" },
];

const US_STATES_SHORT = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

// ─── Row editors ──────────────────────────────────────────────────────────────

function IncomeRows({ rows, onChange }: { rows: IncomeRow[]; onChange: (r: IncomeRow[]) => void }) {
  const update = (id: string, field: keyof IncomeRow, value: string) =>
    onChange(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  const remove = (id: string) => onChange(rows.filter(r => r.id !== id));
  const add = () => onChange([...rows, emptyIncome()]);

  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div key={row.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-accent/30 border border-border/50">
          {/* Category */}
          <div className="col-span-3">
            <Label className="text-xs mb-1 block">Type</Label>
            <Select value={row.category} onValueChange={v => update(row.id, "category", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INCOME_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Source */}
          <div className="col-span-3">
            <Label className="text-xs mb-1 block">Payer / Source</Label>
            <Input className="h-8 text-xs" value={row.source} onChange={e => update(row.id, "source", e.target.value)} placeholder="Employer name..." />
          </div>
          {/* Amount */}
          <div className="col-span-2">
            <Label className="text-xs mb-1 block">Amount ($)</Label>
            <Input className="h-8 text-xs" type="number" min="0" step="0.01" value={row.amount} onChange={e => update(row.id, "amount", e.target.value)} placeholder="0.00" />
          </div>
          {/* Federal withheld */}
          <div className="col-span-2">
            <Label className="text-xs mb-1 block">Fed. Withheld ($)</Label>
            <Input className="h-8 text-xs" type="number" min="0" step="0.01" value={row.federalWithheld} onChange={e => update(row.id, "federalWithheld", e.target.value)} placeholder="0.00" />
          </div>
          {/* State withheld */}
          <div className="col-span-1">
            <Label className="text-xs mb-1 block">State ($)</Label>
            <Input className="h-8 text-xs" type="number" min="0" step="0.01" value={row.stateWithheld} onChange={e => update(row.id, "stateWithheld", e.target.value)} placeholder="0" />
          </div>
          {/* Delete */}
          <div className="col-span-1 flex justify-end">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => remove(row.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full gap-2 border-dashed">
        <Plus className="h-3.5 w-3.5" /> Add Income Source
      </Button>
    </div>
  );
}

function DeductionRows({ rows, onChange }: { rows: DeductionRow[]; onChange: (r: DeductionRow[]) => void }) {
  const update = (id: string, field: keyof DeductionRow, value: string) =>
    onChange(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  const remove = (id: string) => onChange(rows.filter(r => r.id !== id));
  const add = () => onChange([...rows, emptyDeduction()]);

  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div key={row.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-accent/30 border border-border/50">
          <div className="col-span-4">
            <Label className="text-xs mb-1 block">Category</Label>
            <Select value={row.category} onValueChange={v => update(row.id, "category", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEDUCTION_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-5">
            <Label className="text-xs mb-1 block">Description (optional)</Label>
            <Input className="h-8 text-xs" value={row.description} onChange={e => update(row.id, "description", e.target.value)} placeholder="Details..." />
          </div>
          <div className="col-span-2">
            <Label className="text-xs mb-1 block">Amount ($)</Label>
            <Input className="h-8 text-xs" type="number" min="0" step="0.01" value={row.amount} onChange={e => update(row.id, "amount", e.target.value)} placeholder="0.00" />
          </div>
          <div className="col-span-1 flex justify-end">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => remove(row.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full gap-2 border-dashed">
        <Plus className="h-3.5 w-3.5" /> Add Deduction
      </Button>
    </div>
  );
}

function CreditRows({ rows, onChange }: { rows: CreditRow[]; onChange: (r: CreditRow[]) => void }) {
  const update = (id: string, field: keyof CreditRow, value: string) =>
    onChange(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  const remove = (id: string) => onChange(rows.filter(r => r.id !== id));
  const add = () => onChange([...rows, emptyCredit()]);

  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div key={row.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-accent/30 border border-border/50">
          <div className="col-span-4">
            <Label className="text-xs mb-1 block">Credit Type</Label>
            <Select value={row.category} onValueChange={v => update(row.id, "category", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CREDIT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-5">
            <Label className="text-xs mb-1 block">Description (optional)</Label>
            <Input className="h-8 text-xs" value={row.description} onChange={e => update(row.id, "description", e.target.value)} placeholder="Details..." />
          </div>
          <div className="col-span-2">
            <Label className="text-xs mb-1 block">Amount ($)</Label>
            <Input className="h-8 text-xs" type="number" min="0" step="0.01" value={row.amount} onChange={e => update(row.id, "amount", e.target.value)} placeholder="0.00" />
          </div>
          <div className="col-span-1 flex justify-end">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => remove(row.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full gap-2 border-dashed">
        <Plus className="h-3.5 w-3.5" /> Add Credit
      </Button>
    </div>
  );
}

function DependentRows({ rows, onChange }: { rows: DependentRow[]; onChange: (r: DependentRow[]) => void }) {
  const update = (id: string, field: keyof DependentRow, value: string) =>
    onChange(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  const remove = (id: string) => onChange(rows.filter(r => r.id !== id));
  const add = () => onChange([...rows, emptyDependent()]);

  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div key={row.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-accent/30 border border-border/50">
          <div className="col-span-2">
            <Label className="text-xs mb-1 block">First Name</Label>
            <Input className="h-8 text-xs" value={row.firstName} onChange={e => update(row.id, "firstName", e.target.value)} placeholder="First" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs mb-1 block">Last Name</Label>
            <Input className="h-8 text-xs" value={row.lastName} onChange={e => update(row.id, "lastName", e.target.value)} placeholder="Last" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs mb-1 block">SSN (last 4 ok)</Label>
            <Input className="h-8 text-xs" value={row.ssn} onChange={e => update(row.id, "ssn", e.target.value)} placeholder="XXX-XX-XXXX" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs mb-1 block">Relationship</Label>
            <Select value={row.relationship} onValueChange={v => update(row.id, "relationship", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3">
            <Label className="text-xs mb-1 block">Date of Birth</Label>
            <Input className="h-8 text-xs" type="date" value={row.dob} onChange={e => update(row.id, "dob", e.target.value)} />
          </div>
          <div className="col-span-1 flex justify-end">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => remove(row.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full gap-2 border-dashed">
        <Plus className="h-3.5 w-3.5" /> Add Dependent
      </Button>
    </div>
  );
}

// ─── Year Tab ─────────────────────────────────────────────────────────────────

function YearTab({
  year,
  form,
  onChange,
  onSave,
  isSaving,
  saved,
}: {
  year: number;
  form: YearFormState;
  onChange: (f: YearFormState) => void;
  onSave: () => void;
  isSaving: boolean;
  saved: boolean;
}) {
  const set = (field: keyof YearFormState, value: any) => onChange({ ...form, [field]: value });

  return (
    <div className="space-y-4">
      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          {year} return saved successfully — it now appears in Tax History.
        </div>
      )}

      <Accordion type="multiple" defaultValue={["filing", "income"]} className="space-y-2">

        {/* Filing Info */}
        <AccordionItem value="filing" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
            Filing Information
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Filing Status</Label>
                <Select value={form.filingStatus} onValueChange={v => set("filingStatus", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FILING_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Return Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RETURN_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Filed Date</Label>
                <Input type="date" className="mt-1" value={form.filedDate} onChange={e => set("filedDate", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">IRS Confirmation / Ack Number</Label>
                <Input className="mt-1" value={form.confirmationNumber} onChange={e => set("confirmationNumber", e.target.value)} placeholder="e.g. 12345678901234" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} className="mt-1" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any notes about this return..." />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Personal Info */}
        <AccordionItem value="personal" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
            Taxpayer &amp; Spouse Information
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <p className="text-xs text-muted-foreground">Taxpayer (Self)</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">First Name</Label>
                <Input className="mt-1" value={form.firstName1} onChange={e => set("firstName1", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Last Name</Label>
                <Input className="mt-1" value={form.lastName1} onChange={e => set("lastName1", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">SSN</Label>
                <Input className="mt-1" value={form.ssn1} onChange={e => set("ssn1", e.target.value)} placeholder="XXX-XX-XXXX" />
              </div>
            </div>
            {form.filingStatus === "married_filing_jointly" && (
              <>
                <p className="text-xs text-muted-foreground">Spouse</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">First Name</Label>
                    <Input className="mt-1" value={form.firstName2} onChange={e => set("firstName2", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Last Name</Label>
                    <Input className="mt-1" value={form.lastName2} onChange={e => set("lastName2", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">SSN</Label>
                    <Input className="mt-1" value={form.ssn2} onChange={e => set("ssn2", e.target.value)} placeholder="XXX-XX-XXXX" />
                  </div>
                </div>
              </>
            )}
            <p className="text-xs text-muted-foreground">Address</p>
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-3">
                <Label className="text-xs">Street</Label>
                <Input className="mt-1" value={form.street} onChange={e => set("street", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">City</Label>
                <Input className="mt-1" value={form.city} onChange={e => set("city", e.target.value)} />
              </div>
              <div className="col-span-1">
                <Label className="text-xs">State</Label>
                <Select value={form.state || "TX"} onValueChange={v => set("state", v)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {US_STATES_SHORT.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">ZIP</Label>
                <Input className="mt-1" value={form.zip} onChange={e => set("zip", e.target.value)} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Income */}
        <AccordionItem value="income" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
            Income <span className="ml-2 text-xs font-normal text-muted-foreground">({form.income.length} source{form.income.length !== 1 ? "s" : ""})</span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <IncomeRows rows={form.income} onChange={rows => set("income", rows)} />
          </AccordionContent>
        </AccordionItem>

        {/* Deductions */}
        <AccordionItem value="deductions" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
            Deductions <span className="ml-2 text-xs font-normal text-muted-foreground">({form.deductions.length} item{form.deductions.length !== 1 ? "s" : ""})</span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <DeductionRows rows={form.deductions} onChange={rows => set("deductions", rows)} />
          </AccordionContent>
        </AccordionItem>

        {/* Credits */}
        <AccordionItem value="credits" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
            Credits <span className="ml-2 text-xs font-normal text-muted-foreground">({form.credits.length} item{form.credits.length !== 1 ? "s" : ""})</span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <CreditRows rows={form.credits} onChange={rows => set("credits", rows)} />
          </AccordionContent>
        </AccordionItem>

        {/* Dependents */}
        <AccordionItem value="dependents" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
            Dependents <span className="ml-2 text-xs font-normal text-muted-foreground">({form.dependents.length} dependent{form.dependents.length !== 1 ? "s" : ""})</span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <DependentRows rows={form.dependents} onChange={rows => set("dependents", rows)} />
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={onSave}
          disabled={isSaving || saved}
          size="lg"
          className="gap-2 min-w-[180px]"
          data-testid={`button-save-backfill-${year}`}
        >
          {isSaving ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : saved ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <ClipboardList className="h-4 w-4" />
          )}
          {isSaving ? "Saving..." : saved ? `${year} Saved` : `Save ${year} Return`}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BackfillWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("2024");

  // One form per year
  const [forms, setForms] = useState<Record<number, YearFormState>>({
    2022: defaultForm(),
    2023: defaultForm(),
    2024: defaultForm(),
  });
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  const setForm = (year: number, f: YearFormState) =>
    setForms(prev => ({ ...prev, [year]: f }));

  const backfillMutation = useMutation({
    mutationFn: async ({ year, form }: { year: number; form: YearFormState }) => {
      const payload = {
        taxYear: year,
        filingStatus: form.filingStatus,
        firstName1: form.firstName1,
        lastName1: form.lastName1,
        ssn1: form.ssn1,
        firstName2: form.firstName2,
        lastName2: form.lastName2,
        ssn2: form.ssn2,
        street: form.street,
        city: form.city,
        state: form.state,
        zip: form.zip,
        status: form.status,
        filedDate: form.filedDate,
        confirmationNumber: form.confirmationNumber,
        notes: form.notes,
        income: form.income.filter(r => r.amount && parseFloat(r.amount) > 0).map(r => ({
          category: r.category,
          source: r.source,
          amount: r.amount,
          federalWithheld: r.federalWithheld || "0",
          stateWithheld: r.stateWithheld || "0",
        })),
        deductions: form.deductions.filter(r => r.amount && parseFloat(r.amount) > 0).map(r => ({
          category: r.category,
          description: r.description,
          amount: r.amount,
        })),
        credits: form.credits.filter(r => r.amount && parseFloat(r.amount) > 0).map(r => ({
          category: r.category,
          description: r.description,
          amount: r.amount,
        })),
        dependents: form.dependents.filter(r => r.firstName).map(r => ({
          firstName: r.firstName,
          lastName: r.lastName,
          ssn: r.ssn,
          relationship: r.relationship,
          dob: r.dob,
        })),
      };

      const res = await apiRequest("POST", "/api/backfill", payload);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: (_, { year }) => {
      setSaved(prev => ({ ...prev, [year]: true }));
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      toast({
        title: `${year} return saved`,
        description: "It now appears in Tax History with full calculations.",
      });
      // Auto-advance to next unsaved year
      const next = PRIOR_YEARS.find(y => y > year && !saved[y]);
      if (next) setActiveTab(String(next));
    },
    onError: (err: any, { year }) => {
      if (err.message?.includes("already exists")) {
        setSaved(prev => ({ ...prev, [year]: true }));
        toast({ title: `${year} already in history`, description: "That year's return already exists.", variant: "default" });
      } else {
        toast({ title: "Save failed", description: err.message, variant: "destructive" });
      }
    },
  });

  const handleSave = (year: number) => {
    backfillMutation.mutate({ year, form: forms[year] });
  };

  const allSaved = PRIOR_YEARS.every(y => saved[y]);

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Add Prior Year Returns
          </DialogTitle>
          <DialogDescription>
            Enter summary data for 2022, 2023, and 2024 to seed your tax history database.
            Each tab saves independently — you can skip years you don't have data for.
          </DialogDescription>
        </DialogHeader>

        {allSaved && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              All 3 prior years have been saved. Your Tax History now shows trends across 2022–2025.
            </div>
            <Button size="sm" onClick={onClose}>Close</Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            {PRIOR_YEARS.map(year => (
              <TabsTrigger
                key={year}
                value={String(year)}
                className="relative"
                data-testid={`tab-backfill-${year}`}
              >
                {year}
                {saved[year] && (
                  <CheckCircle className="h-3 w-3 text-green-500 absolute top-1 right-1.5" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {PRIOR_YEARS.map(year => (
            <TabsContent key={year} value={String(year)} className="mt-4">
              <Card>
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-base">
                    Tax Year {year}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <YearTab
                    year={year}
                    form={forms[year]}
                    onChange={f => setForm(year, f)}
                    onSave={() => handleSave(year)}
                    isSaving={backfillMutation.isPending && backfillMutation.variables?.year === year}
                    saved={!!saved[year]}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
