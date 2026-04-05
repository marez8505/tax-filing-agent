import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "./lib/queryClient";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Dashboard from "@/pages/dashboard";
import ProfileSetup from "@/pages/profile-setup";
import Income from "@/pages/income";
import Deductions from "@/pages/deductions";
import CreditsDependents from "@/pages/credits-dependents";
import AIChat from "@/pages/ai-chat";
import ExportEfile from "@/pages/export-efile";
import TaxHistory from "@/pages/tax-history";
import {
  LayoutDashboard, User, DollarSign, Receipt, Shield,
  MessageSquare, FileOutput, History,
  Moon, Sun, ChevronLeft, ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "history",    label: "Tax History",          icon: History },
  { key: "dashboard",  label: "Dashboard",             icon: LayoutDashboard },
  { key: "profile",    label: "Profile",               icon: User },
  { key: "income",     label: "Income",                icon: DollarSign },
  { key: "deductions", label: "Deductions",            icon: Receipt },
  { key: "credits",    label: "Credits & Dependents",  icon: Shield },
  { key: "chat",       label: "AI Assistant",          icon: MessageSquare },
  { key: "export",     label: "Export & E-File",       icon: FileOutput },
];

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  filed:       "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  accepted:    "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  amended:     "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
};
const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress", filed: "Filed", accepted: "Accepted", amended: "Amended",
};

function AppContent() {
  const [activeTab, setActiveTab] = useState("history");
  const [profileId, setProfileId] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Load all profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ["/api/profiles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/profiles");
      return res.json();
    },
  });

  // Auto-select most recent profile once loaded
  useEffect(() => {
    if (profiles.length > 0 && profileId === 0) {
      // Pick the highest taxYear
      const sorted = [...profiles].sort((a: any, b: any) => b.taxYear - a.taxYear);
      setProfileId(sorted[0].id);
    }
  }, [profiles, profileId]);

  // Auto-create 2025 profile if none exist (guard: only run once)
  const [autoCreating, setAutoCreating] = useState(false);
  useEffect(() => {
    if (profiles.length === 0 && profileId === 0 && !autoCreating) {
      setAutoCreating(true);
      apiRequest("POST", "/api/profiles", {
        taxYear: 2025,
        filingStatus: "married_filing_jointly",
        status: "in_progress",
        createdAt: new Date().toISOString(),
      }).then(res => res.json()).then(p => {
        setProfileId(p.id);
        queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
        queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length]);

  const activeProfile = profiles.find((p: any) => p.id === profileId);
  const sortedProfiles = [...profiles].sort((a: any, b: any) => b.taxYear - a.taxYear);
  const statusColor = activeProfile ? (STATUS_COLORS[activeProfile.status || "in_progress"] || STATUS_COLORS.in_progress) : "";
  const statusLabel = activeProfile ? (STATUS_LABELS[activeProfile.status || "in_progress"] || "In Progress") : "";

  const handleSwitchYear = (id: number) => {
    setProfileId(id);
    setActiveTab("dashboard");
    queryClient.invalidateQueries({ queryKey: ["/api/profiles", id] });
    queryClient.invalidateQueries({ queryKey: ["/api/profiles", id, "calculate"] });
  };

  const renderPage = () => {
    if (profileId <= 0) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
    switch (activeTab) {
      case "history":    return <TaxHistory activeProfileId={profileId} onSwitchYear={handleSwitchYear} />;
      case "dashboard":  return <Dashboard profileId={profileId} />;
      case "profile":    return <ProfileSetup profileId={profileId} onProfileCreated={setProfileId} />;
      case "income":     return <Income profileId={profileId} />;
      case "deductions": return <Deductions profileId={profileId} />;
      case "credits":    return <CreditsDependents profileId={profileId} />;
      case "chat":       return <AIChat profileId={profileId} />;
      case "export":     return <ExportEfile profileId={profileId} />;
      default:           return <TaxHistory activeProfileId={profileId} onSwitchYear={handleSwitchYear} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-16" : "w-60"} flex-shrink-0 border-r bg-sidebar transition-all duration-200 flex flex-col`}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b gap-2">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-label="Tax Filing Agent logo">
            <rect x="2" y="4" width="28" height="24" rx="3" stroke="currentColor" strokeWidth="2" className="text-primary" />
            <path d="M8 12h16M8 17h10M8 22h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary" />
            <path d="M22 18l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500" />
          </svg>
          {!collapsed && <span className="font-semibold text-sm tracking-tight">Tax Filing Agent</span>}
        </div>

        {/* Year Switcher */}
        {!collapsed && sortedProfiles.length > 0 && (
          <div className="px-3 pt-3 pb-1">
            <p className="text-xs text-muted-foreground font-medium mb-1.5 uppercase tracking-wide px-1">Tax Year</p>
            <Select
              value={String(profileId)}
              onValueChange={v => handleSwitchYear(parseInt(v))}
            >
              <SelectTrigger className="h-8 text-sm" data-testid="select-year-switcher">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortedProfiles.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.taxYear} — {STATUS_LABELS[p.status || "in_progress"]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-2 space-y-0.5 px-2 mt-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
                data-testid={`nav-${item.key}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t space-y-1">
          <button
            onClick={() => setDark(!dark)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            data-testid="button-theme-toggle"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsed && <span>{dark ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            data-testid="button-collapse-sidebar"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">{NAV_ITEMS.find(n => n.key === activeTab)?.label || "Dashboard"}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Tax Year {activeProfile?.taxYear || 2025} — {(activeProfile?.filingStatus || "married_filing_jointly").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </p>
            </div>
            {activeProfile && activeTab !== "history" && (
              <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border mt-0.5 ${statusColor}`}>
                {statusLabel}
              </span>
            )}
          </div>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
