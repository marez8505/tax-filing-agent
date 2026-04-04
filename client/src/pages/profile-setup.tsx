import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FILING_STATUSES, US_STATES } from "@/lib/tax-helpers";
import { User, Home, Building } from "lucide-react";

export default function ProfileSetup({ profileId, onProfileCreated }: { profileId: number; onProfileCreated?: (id: number) => void }) {
  const { toast } = useToast();

  const { data: profile } = useQuery({
    queryKey: ["/api/profiles", profileId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/profiles/${profileId}`);
      return res.json();
    },
    enabled: profileId > 0,
  });

  const [form, setForm] = useState({
    taxYear: 2025,
    filingStatus: "married_filing_jointly",
    firstName1: "", lastName1: "", ssn1: "", dob1: "", occupation1: "",
    firstName2: "", lastName2: "", ssn2: "", dob2: "", occupation2: "",
    street: "", apt: "", city: "", state: "", zip: "",
    bankRouting: "", bankAccount: "", accountType: "checking",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        taxYear: profile.taxYear || 2025,
        filingStatus: profile.filingStatus || "married_filing_jointly",
        firstName1: profile.firstName1 || "", lastName1: profile.lastName1 || "",
        ssn1: profile.ssn1 || "", dob1: profile.dob1 || "", occupation1: profile.occupation1 || "",
        firstName2: profile.firstName2 || "", lastName2: profile.lastName2 || "",
        ssn2: profile.ssn2 || "", dob2: profile.dob2 || "", occupation2: profile.occupation2 || "",
        street: profile.street || "", apt: profile.apt || "", city: profile.city || "",
        state: profile.state || "", zip: profile.zip || "",
        bankRouting: profile.bankRouting || "", bankAccount: profile.bankAccount || "",
        accountType: profile.accountType || "checking",
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (profileId > 0) {
        return apiRequest("PATCH", `/api/profiles/${profileId}`, form);
      } else {
        const res = await apiRequest("POST", "/api/profiles", { ...form, createdAt: new Date().toISOString() });
        return res.json();
      }
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      if (profileId <= 0 && data?.id) {
        onProfileCreated?.(data.id);
      }
      toast({ title: "Profile saved", description: "Your tax profile has been updated." });
    },
  });

  const update = (key: string, value: string | number) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6" data-testid="profile-setup">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Filing Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" /> Filing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tax Year</Label>
              <Select value={String(form.taxYear)} onValueChange={v => update("taxYear", parseInt(v))}>
                <SelectTrigger data-testid="select-tax-year"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2025, 2024, 2023].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filing Status</Label>
              <Select value={form.filingStatus} onValueChange={v => update("filingStatus", v)}>
                <SelectTrigger data-testid="select-filing-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FILING_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Taxpayer 1 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Taxpayer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name</Label><Input data-testid="input-first-name-1" value={form.firstName1} onChange={e => update("firstName1", e.target.value)} /></div>
              <div><Label>Last Name</Label><Input data-testid="input-last-name-1" value={form.lastName1} onChange={e => update("lastName1", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SSN</Label><Input data-testid="input-ssn-1" value={form.ssn1} onChange={e => update("ssn1", e.target.value)} placeholder="XXX-XX-XXXX" /></div>
              <div><Label>Date of Birth</Label><Input data-testid="input-dob-1" type="date" value={form.dob1} onChange={e => update("dob1", e.target.value)} /></div>
            </div>
            <div><Label>Occupation</Label><Input data-testid="input-occupation-1" value={form.occupation1} onChange={e => update("occupation1", e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Spouse (for MFJ) */}
        {(form.filingStatus === "married_filing_jointly" || form.filingStatus === "married_filing_separately") && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Spouse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name</Label><Input data-testid="input-first-name-2" value={form.firstName2} onChange={e => update("firstName2", e.target.value)} /></div>
                <div><Label>Last Name</Label><Input data-testid="input-last-name-2" value={form.lastName2} onChange={e => update("lastName2", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>SSN</Label><Input data-testid="input-ssn-2" value={form.ssn2} onChange={e => update("ssn2", e.target.value)} placeholder="XXX-XX-XXXX" /></div>
                <div><Label>Date of Birth</Label><Input data-testid="input-dob-2" type="date" value={form.dob2} onChange={e => update("dob2", e.target.value)} /></div>
              </div>
              <div><Label>Occupation</Label><Input data-testid="input-occupation-2" value={form.occupation2} onChange={e => update("occupation2", e.target.value)} /></div>
            </CardContent>
          </Card>
        )}

        {/* Address */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" /> Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Street</Label><Input data-testid="input-street" value={form.street} onChange={e => update("street", e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Apt</Label><Input data-testid="input-apt" value={form.apt} onChange={e => update("apt", e.target.value)} /></div>
              <div><Label>City</Label><Input data-testid="input-city" value={form.city} onChange={e => update("city", e.target.value)} /></div>
              <div>
                <Label>State</Label>
                <Select value={form.state} onValueChange={v => update("state", v)}>
                  <SelectTrigger data-testid="select-state"><SelectValue placeholder="State" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>ZIP</Label><Input data-testid="input-zip" value={form.zip} onChange={e => update("zip", e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Bank Info */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Direct Deposit (for refund)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div><Label>Routing Number</Label><Input data-testid="input-routing" value={form.bankRouting} onChange={e => update("bankRouting", e.target.value)} /></div>
              <div><Label>Account Number</Label><Input data-testid="input-account" value={form.bankAccount} onChange={e => update("bankAccount", e.target.value)} /></div>
              <div>
                <Label>Account Type</Label>
                <Select value={form.accountType} onValueChange={v => update("accountType", v)}>
                  <SelectTrigger data-testid="select-account-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full md:w-auto"
        data-testid="button-save-profile"
      >
        {saveMutation.isPending ? "Saving..." : "Save Profile"}
      </Button>
    </div>
  );
}
