import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/tax-helpers";
import { Download, FileText, Upload, RefreshCw, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";

export default function ExportEfile({ profileId }: { profileId: number }) {
  const { toast } = useToast();
  const [fpuData, setFpuData] = useState("");

  const { data: calc } = useQuery({
    queryKey: ["/api/profiles", profileId, "calculate"],
    queryFn: async () => { const res = await apiRequest("GET", `/api/profiles/${profileId}/calculate`); return res.json(); },
    enabled: profileId > 0,
  });

  const { data: profile } = useQuery({
    queryKey: ["/api/profiles", profileId],
    queryFn: async () => { const res = await apiRequest("GET", `/api/profiles/${profileId}`); return res.json(); },
    enabled: profileId > 0,
  });

  const { data: taxCode = [] } = useQuery({
    queryKey: ["/api/taxcode", profile?.taxYear || 2025],
    queryFn: async () => { const res = await apiRequest("GET", `/api/taxcode/${profile?.taxYear || 2025}`); return res.json(); },
    enabled: !!profile,
  });

  // TXF Export
  const downloadTXF = async () => {
    const res = await apiRequest("GET", `/api/profiles/${profileId}/export/txf`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tax-${profile?.taxYear || 2025}.txf`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "TXF Downloaded", description: "Import this file into TurboTax." });
  };

  // CSV Export
  const downloadCSV = async () => {
    const res = await apiRequest("GET", `/api/profiles/${profileId}/export/csv`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tax-${profile?.taxYear || 2025}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV Downloaded", description: "Use this with H&R Block or any spreadsheet." });
  };

  // FPU Import
  const fpuMutation = useMutation({
    mutationFn: async () => {
      let deductibles;
      try {
        deductibles = JSON.parse(fpuData);
      } catch {
        // Try CSV-like parsing
        deductibles = fpuData.split("\n").filter(l => l.trim()).map(line => {
          const parts = line.split(",").map(s => s.trim());
          return { category: parts[0] || "charity", description: parts[1] || "", amount: parts[2] || "0" };
        });
      }
      return apiRequest("POST", `/api/profiles/${profileId}/import-fpu`, { deductibles });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "deductions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "calculate"] });
      setFpuData("");
      toast({ title: "FPU data imported", description: "Tax-deductible items added to your deductions." });
    },
  });

  // Tax Code Update
  const updateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/taxcode/${profile?.taxYear || 2025}/auto-update`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxcode"] });
      toast({ title: data.success ? "Tax code updated" : "Update failed", description: data.message });
    },
  });

  const isComplete = profile?.firstName1 && calc?.grossIncome > 0;

  return (
    <div className="space-y-6" data-testid="export-page">
      {/* Filing Readiness */}
      <Card className={isComplete ? "border-green-500/30" : "border-yellow-500/30"}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            {isComplete ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" /> : <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />}
            <div>
              <h3 className="font-semibold">{isComplete ? "Ready to Export" : "Not Yet Complete"}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isComplete
                  ? `Your ${profile?.taxYear} return shows a ${calc?.isRefund ? "refund" : "balance due"} of ${formatCurrency(Math.abs(calc?.refundOrOwed || 0))}. Export below to file.`
                  : "Complete your profile, income, and deductions before exporting."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* TXF Export */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> TurboTax Export
            </CardTitle>
            <CardDescription>Download a .TXF file to import directly into TurboTax Desktop or Online.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadTXF} disabled={!isComplete} className="w-full" data-testid="button-export-txf">
              <Download className="h-4 w-4 mr-2" /> Download .TXF File
            </Button>
          </CardContent>
        </Card>

        {/* CSV Export */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> H&R Block / CSV Export
            </CardTitle>
            <CardDescription>Download a .CSV summary compatible with H&R Block and spreadsheet tools.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadCSV} disabled={!isComplete} className="w-full" data-testid="button-export-csv">
              <Download className="h-4 w-4 mr-2" /> Download .CSV File
            </Button>
          </CardContent>
        </Card>

        {/* E-File Links */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" /> E-File Options
            </CardTitle>
            <CardDescription>After exporting, use one of these services to e-file:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> IRS Free File (AGI under $84,000)
            </a>
            <a href="https://directfile.irs.gov" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> IRS Direct File
            </a>
            <a href="https://www.turbotax.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> TurboTax Online (import .TXF)
            </a>
            <a href="https://www.hrblock.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> H&R Block Online
            </a>
          </CardContent>
        </Card>

        {/* FPU Import */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" /> FPU Situation Desk Import
            </CardTitle>
            <CardDescription>Paste tax-deductible items from your FPU Situation Desk. Use JSON format or CSV (category,description,amount per line).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              data-testid="input-fpu-data"
              value={fpuData}
              onChange={e => setFpuData(e.target.value)}
              placeholder={`charity,Tithe to Church,5200\ncharity,Goodwill Donations,450\nmedical,Prescriptions,1200`}
              rows={5}
            />
            <Button onClick={() => fpuMutation.mutate()} disabled={!fpuData.trim() || fpuMutation.isPending} className="w-full" data-testid="button-import-fpu">
              <Upload className="h-4 w-4 mr-2" /> Import Deductibles
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tax Code Manager */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" /> Tax Code Reference ({profile?.taxYear || 2025})
          </CardTitle>
          <CardDescription>
            Tax brackets, standard deductions, and thresholds are updated each year. Click below to auto-update using AI research.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => updateCodeMutation.mutate()} disabled={updateCodeMutation.isPending} variant="outline" data-testid="button-update-taxcode">
            <RefreshCw className={`h-4 w-4 mr-2 ${updateCodeMutation.isPending ? "animate-spin" : ""}`} />
            {updateCodeMutation.isPending ? "Updating Tax Code..." : "Auto-Update Tax Code"}
          </Button>
          {taxCode.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-auto">
              {taxCode.slice(0, 24).map((tc: any) => (
                <div key={tc.id} className="text-xs p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">{tc.key.replace(/_/g, " ")}:</span>{" "}
                  <span className="font-medium">{tc.value}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        This tool is for informational purposes only and should not be considered tax advice. Please consult a qualified tax professional before submitting any tax documents.
      </p>
    </div>
  );
}
