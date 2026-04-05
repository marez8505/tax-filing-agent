import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { calculateTax, generateTXF, generateCSV, initializeTaxCode } from "./tax-engine";
import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ========== TAX PROFILES ==========
  app.get("/api/profiles", (_req, res) => {
    const profiles = storage.getAllProfiles();
    res.json(profiles);
  });

  app.get("/api/profiles/:id", (req, res) => {
    const profile = storage.getProfile(parseInt(req.params.id));
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    res.json(profile);
  });

  app.post("/api/profiles", (req, res) => {
    const profile = storage.createProfile(req.body);
    initializeTaxCode(profile.taxYear);
    res.status(201).json(profile);
  });

  app.patch("/api/profiles/:id", (req, res) => {
    const profile = storage.updateProfile(parseInt(req.params.id), req.body);
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    res.json(profile);
  });

  // ========== INCOME ==========
  app.get("/api/profiles/:id/income", (req, res) => {
    res.json(storage.getIncomeByProfile(parseInt(req.params.id)));
  });

  app.post("/api/profiles/:id/income", (req, res) => {
    const data = { ...req.body, profileId: parseInt(req.params.id) };
    res.status(201).json(storage.createIncome(data));
  });

  app.patch("/api/income/:id", (req, res) => {
    const updated = storage.updateIncome(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/income/:id", (req, res) => {
    storage.deleteIncome(parseInt(req.params.id));
    res.json({ deleted: true });
  });

  // ========== DEDUCTIONS ==========
  app.get("/api/profiles/:id/deductions", (req, res) => {
    res.json(storage.getDeductionsByProfile(parseInt(req.params.id)));
  });

  app.post("/api/profiles/:id/deductions", (req, res) => {
    const data = { ...req.body, profileId: parseInt(req.params.id) };
    res.status(201).json(storage.createDeduction(data));
  });

  app.patch("/api/deductions/:id", (req, res) => {
    const updated = storage.updateDeduction(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/deductions/:id", (req, res) => {
    storage.deleteDeduction(parseInt(req.params.id));
    res.json({ deleted: true });
  });

  // ========== CREDITS ==========
  app.get("/api/profiles/:id/credits", (req, res) => {
    res.json(storage.getCreditsByProfile(parseInt(req.params.id)));
  });

  app.post("/api/profiles/:id/credits", (req, res) => {
    const data = { ...req.body, profileId: parseInt(req.params.id) };
    res.status(201).json(storage.createCredit(data));
  });

  app.patch("/api/credits/:id", (req, res) => {
    const updated = storage.updateCredit(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/credits/:id", (req, res) => {
    storage.deleteCredit(parseInt(req.params.id));
    res.json({ deleted: true });
  });

  // ========== DEPENDENTS ==========
  app.get("/api/profiles/:id/dependents", (req, res) => {
    res.json(storage.getDependentsByProfile(parseInt(req.params.id)));
  });

  app.post("/api/profiles/:id/dependents", (req, res) => {
    const data = { ...req.body, profileId: parseInt(req.params.id) };
    res.status(201).json(storage.createDependent(data));
  });

  app.patch("/api/dependents/:id", (req, res) => {
    const updated = storage.updateDependent(parseInt(req.params.id), req.body);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  app.delete("/api/dependents/:id", (req, res) => {
    storage.deleteDependent(parseInt(req.params.id));
    res.json({ deleted: true });
  });

  // ========== BACKFILL PRIOR YEAR (bulk-create a historical return in one shot) ==========
  app.post("/api/backfill", (req, res) => {
    const {
      taxYear, filingStatus,
      firstName1, lastName1, ssn1,
      firstName2, lastName2, ssn2,
      street, city, state, zip,
      status, filedDate, confirmationNumber, notes,
      income,      // [{category, source, amount, federalWithheld, stateWithheld}]
      deductions,  // [{category, description, amount}]
      credits,     // [{category, description, amount}]
      dependents,  // [{firstName, lastName, ssn, relationship, dob}]
    } = req.body;

    if (!taxYear) return res.status(400).json({ error: "taxYear required" });

    const existing = storage.getProfileByYear(taxYear);
    if (existing) return res.status(409).json({ error: `A ${taxYear} return already exists`, profileId: existing.id });

    const profile = storage.createProfile({
      taxYear: parseInt(taxYear),
      filingStatus: filingStatus || "married_filing_jointly",
      firstName1: firstName1 || "", lastName1: lastName1 || "", ssn1: ssn1 || "",
      dob1: "", occupation1: "",
      firstName2: firstName2 || "", lastName2: lastName2 || "", ssn2: ssn2 || "",
      dob2: "", occupation2: "",
      street: street || "", apt: "", city: city || "", state: state || "", zip: zip || "",
      bankRouting: "", bankAccount: "", accountType: "checking",
      status: status || "accepted",
      notes: notes || "",
      filedDate: filedDate || "",
      confirmationNumber: confirmationNumber || "",
      createdAt: new Date().toISOString(),
    });

    initializeTaxCode(parseInt(taxYear));

    // Insert income entries
    if (Array.isArray(income)) {
      for (const item of income) {
        if (item.amount && parseFloat(item.amount) > 0) {
          storage.createIncome({
            profileId: profile.id,
            category: item.category || "w2",
            source: item.source || "",
            amount: parseFloat(item.amount) || 0,
            federalWithheld: parseFloat(item.federalWithheld) || 0,
            stateWithheld: parseFloat(item.stateWithheld) || 0,
            description: item.description || "",
          });
        }
      }
    }

    // Insert deductions
    if (Array.isArray(deductions)) {
      for (const item of deductions) {
        if (item.amount && parseFloat(item.amount) > 0) {
          storage.createDeduction({
            profileId: profile.id,
            category: item.category || "charity",
            description: item.description || "",
            amount: parseFloat(item.amount) || 0,
            isTaxDeductible: 1,
          });
        }
      }
    }

    // Insert credits
    if (Array.isArray(credits)) {
      for (const item of credits) {
        if (item.amount && parseFloat(item.amount) > 0) {
          storage.createCredit({
            profileId: profile.id,
            category: item.category || "child_tax_credit",
            description: item.description || "",
            amount: parseFloat(item.amount) || 0,
            dependentName: "",
          });
        }
      }
    }

    // Insert dependents
    if (Array.isArray(dependents)) {
      for (const dep of dependents) {
        if (dep.firstName) {
          storage.createDependent({
            profileId: profile.id,
            firstName: dep.firstName || "",
            lastName: dep.lastName || "",
            ssn: dep.ssn || "",
            relationship: dep.relationship || "child",
            dob: dep.dob || "",
            monthsLived: 12,
          });
        }
      }
    }

    res.status(201).json({ profileId: profile.id, taxYear: profile.taxYear });
  });

  // ========== YEAR ROLLOVER (start new tax year from prior year) ==========
  app.post("/api/profiles/:id/rollover", (req, res) => {
    const sourceProfile = storage.getProfile(parseInt(req.params.id));
    if (!sourceProfile) return res.status(404).json({ error: "Source profile not found" });

    const newYear = sourceProfile.taxYear + 1;
    const existing = storage.getProfileByYear(newYear);
    if (existing) return res.status(409).json({ error: `A ${newYear} return already exists`, profileId: existing.id });

    // Roll over personal info, address, bank — NOT income/deductions (those are year-specific)
    const newProfile = storage.createProfile({
      taxYear: newYear,
      filingStatus: sourceProfile.filingStatus,
      firstName1: sourceProfile.firstName1,
      lastName1: sourceProfile.lastName1,
      ssn1: sourceProfile.ssn1,
      dob1: sourceProfile.dob1,
      occupation1: sourceProfile.occupation1,
      firstName2: sourceProfile.firstName2,
      lastName2: sourceProfile.lastName2,
      ssn2: sourceProfile.ssn2,
      dob2: sourceProfile.dob2,
      occupation2: sourceProfile.occupation2,
      street: sourceProfile.street,
      apt: sourceProfile.apt,
      city: sourceProfile.city,
      state: sourceProfile.state,
      zip: sourceProfile.zip,
      bankRouting: sourceProfile.bankRouting,
      bankAccount: sourceProfile.bankAccount,
      accountType: sourceProfile.accountType,
      status: "in_progress",
      notes: "",
      filedDate: "",
      confirmationNumber: "",
      createdAt: new Date().toISOString(),
    });

    // Roll over dependents
    const sourceDeps = storage.getDependentsByProfile(sourceProfile.id);
    for (const dep of sourceDeps) {
      storage.createDependent({
        profileId: newProfile.id,
        firstName: dep.firstName,
        lastName: dep.lastName,
        ssn: dep.ssn,
        relationship: dep.relationship,
        dob: dep.dob,
        monthsLived: dep.monthsLived,
      });
    }

    initializeTaxCode(newYear);
    res.status(201).json({ profile: newProfile, depsRolledOver: sourceDeps.length });
  });

  // ========== HISTORY (all years summary) ==========
  app.get("/api/history", (req, res) => {
    const profiles = storage.getAllProfiles();
    const history = profiles.map(p => {
      try {
        const calc = calculateTax(p.id, p.taxYear, p.filingStatus);
        return {
          id: p.id,
          taxYear: p.taxYear,
          filingStatus: p.filingStatus,
          status: p.status || "in_progress",
          notes: p.notes || "",
          filedDate: p.filedDate || "",
          confirmationNumber: p.confirmationNumber || "",
          grossIncome: calc.grossIncome,
          agi: calc.agi,
          taxableIncome: calc.taxableIncome,
          totalTax: calc.totalTax,
          refundOrOwed: calc.refundOrOwed,
          isRefund: calc.isRefund,
          effectiveRate: calc.effectiveRate,
          marginalRate: calc.marginalRate,
          totalFederalWithheld: calc.totalFederalWithheld,
          deductionUsed: calc.deductionUsed,
          deductionAmount: calc.deductionAmount,
          totalCredits: calc.totalCredits,
          firstName1: p.firstName1,
          lastName1: p.lastName1,
        };
      } catch {
        return { id: p.id, taxYear: p.taxYear, filingStatus: p.filingStatus, status: p.status || "in_progress", grossIncome: 0, agi: 0, taxableIncome: 0, totalTax: 0, refundOrOwed: 0, isRefund: true, effectiveRate: 0, marginalRate: 0, totalFederalWithheld: 0, deductionUsed: "standard", deductionAmount: 0, totalCredits: 0, firstName1: p.firstName1, lastName1: p.lastName1 };
      }
    });
    // Sort by year descending
    history.sort((a, b) => b.taxYear - a.taxYear);
    res.json(history);
  });

  // Update return status / notes
  app.patch("/api/profiles/:id/status", (req, res) => {
    const { status, notes, filedDate, confirmationNumber } = req.body;
    const updated = storage.updateProfile(parseInt(req.params.id), { status, notes, filedDate, confirmationNumber });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // ========== TAX CALCULATION ==========
  app.get("/api/profiles/:id/calculate", (req, res) => {
    const profile = storage.getProfile(parseInt(req.params.id));
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    const calc = calculateTax(profile.id, profile.taxYear, profile.filingStatus);
    res.json(calc);
  });

  // ========== TAX CODE REFERENCE ==========
  app.get("/api/taxcode/:year", (req, res) => {
    const year = parseInt(req.params.year);
    initializeTaxCode(year);
    res.json(storage.getTaxCodeByYear(year));
  });

  app.put("/api/taxcode/:year", (req, res) => {
    const year = parseInt(req.params.year);
    const { updates } = req.body; // [{key, value, description}]
    if (!Array.isArray(updates)) return res.status(400).json({ error: "Expected updates array" });
    const now = new Date().toISOString();
    const results = updates.map((u: any) =>
      storage.upsertTaxCode({ taxYear: year, key: u.key, value: u.value, description: u.description || "", lastUpdated: now })
    );
    res.json(results);
  });

  // ========== EXPORT / E-FILE ==========
  app.get("/api/profiles/:id/export/txf", (req, res) => {
    const profile = storage.getProfile(parseInt(req.params.id));
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    const txf = generateTXF(profile.id, profile.taxYear, profile.filingStatus);
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="tax-${profile.taxYear}.txf"`);
    res.send(txf);
  });

  app.get("/api/profiles/:id/export/csv", (req, res) => {
    const profile = storage.getProfile(parseInt(req.params.id));
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    const csv = generateCSV(profile.id, profile.taxYear, profile.filingStatus);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="tax-${profile.taxYear}.csv"`);
    res.send(csv);
  });

  // ========== FPU SITUATION DESK IMPORT ==========
  app.post("/api/profiles/:id/import-fpu", (req, res) => {
    const profileId = parseInt(req.params.id);
    const { deductibles } = req.body;
    // Expected: [{category, description, amount}]
    if (!Array.isArray(deductibles)) return res.status(400).json({ error: "Expected deductibles array" });

    let count = 0;
    for (const item of deductibles) {
      storage.createDeduction({
        profileId,
        category: item.category || "charity",
        description: item.description || "FPU Import",
        amount: parseFloat(item.amount) || 0,
        isTaxDeductible: 1,
      });
      count++;
    }

    const fpuImport = storage.createFpuImport({
      profileId,
      importDate: new Date().toISOString(),
      itemCount: count,
      summary: `Imported ${count} tax-deductible items from FPU Situation Desk`,
    });

    res.json(fpuImport);
  });

  // ========== AI TAX CHAT ==========
  app.get("/api/profiles/:id/chat", (req, res) => {
    res.json(storage.getChatByProfile(parseInt(req.params.id)));
  });

  app.delete("/api/profiles/:id/chat", (req, res) => {
    storage.clearChat(parseInt(req.params.id));
    res.json({ cleared: true });
  });

  app.post("/api/profiles/:id/chat", async (req, res) => {
    const profileId = parseInt(req.params.id);
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    const profile = storage.getProfile(profileId);
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Save user message
    storage.addChatMessage({
      profileId,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Build context from current tax data
    const calc = calculateTax(profileId, profile.taxYear, profile.filingStatus);
    const income = storage.getIncomeByProfile(profileId);
    const deductions = storage.getDeductionsByProfile(profileId);
    const credits = storage.getCreditsByProfile(profileId);
    const deps = storage.getDependentsByProfile(profileId);
    const taxCode = storage.getTaxCodeByYear(profile.taxYear);

    const systemPrompt = `You are a friendly, knowledgeable tax assistant helping a taxpayer prepare their ${profile.taxYear} federal income tax return. You are filing as "${profile.filingStatus.replace(/_/g, " ")}".

CURRENT TAX DATA:
- Gross Income: $${calc.grossIncome.toFixed(2)}
- AGI: $${calc.agi.toFixed(2)}
- Taxable Income: $${calc.taxableIncome.toFixed(2)}
- Standard Deduction: $${calc.standardDeduction.toFixed(2)}
- Total Itemized: $${calc.totalItemized.toFixed(2)}
- Using: ${calc.deductionUsed} deduction ($${calc.deductionAmount.toFixed(2)})
- Tax Before Credits: $${calc.taxBeforeCredits.toFixed(2)}
- Total Credits: $${calc.totalCredits.toFixed(2)}
- Federal Withheld: $${calc.totalFederalWithheld.toFixed(2)}
- ${calc.isRefund ? "Refund" : "Amount Owed"}: $${Math.abs(calc.refundOrOwed).toFixed(2)}
- Effective Tax Rate: ${(calc.effectiveRate * 100).toFixed(1)}%
- Marginal Rate: ${(calc.marginalRate * 100).toFixed(0)}%

INCOME ENTRIES: ${JSON.stringify(income.map(i => ({ category: i.category, source: i.source, amount: i.amount })))}
DEDUCTIONS: ${JSON.stringify(deductions.map(d => ({ category: d.category, description: d.description, amount: d.amount })))}
CREDITS: ${JSON.stringify(credits.map(c => ({ category: c.category, description: c.description, amount: c.amount })))}
DEPENDENTS: ${JSON.stringify(deps.map(d => ({ name: d.firstName + " " + d.lastName, relationship: d.relationship })))}

TAX CODE REFERENCE (${profile.taxYear}):
${taxCode.slice(0, 30).map(tc => `${tc.key}: ${tc.value}`).join("\n")}

GUIDELINES:
- Be conversational and encouraging, like a helpful tax preparer
- Give specific dollar amounts when possible
- Suggest deductions or credits they might be missing
- Explain concepts in plain English
- If they ask about e-filing, explain they can export a TXF file for TurboTax or CSV for H&R Block
- If they ask about the FPU Situation Desk, explain they can import tax-deductible items from it
- Always note this is for informational purposes and not professional tax advice
- Be concise but thorough`;

    // Get chat history
    const history = storage.getChatByProfile(profileId);
    const messages = history.slice(-20).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    try {
      const response = await anthropic.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      });

      const assistantMessage = response.content[0].type === "text" ? response.content[0].text : "I couldn't generate a response.";

      storage.addChatMessage({
        profileId,
        role: "assistant",
        content: assistantMessage,
        timestamp: new Date().toISOString(),
      });

      res.json({ role: "assistant", content: assistantMessage });
    } catch (error: any) {
      console.error("AI chat error:", error);
      const fallback = "I'm having trouble connecting to the AI service right now. Please try again in a moment. In the meantime, you can review your tax summary on the Dashboard tab.";
      storage.addChatMessage({
        profileId,
        role: "assistant",
        content: fallback,
        timestamp: new Date().toISOString(),
      });
      res.json({ role: "assistant", content: fallback });
    }
  });

  // ========== TAX CODE UPDATER ==========
  app.post("/api/taxcode/:year/auto-update", async (req, res) => {
    const year = parseInt(req.params.year);
    initializeTaxCode(year);

    try {
      const currentCode = storage.getTaxCodeByYear(year);
      const prompt = `You are a tax code research assistant. For tax year ${year}, provide the current federal tax brackets, standard deductions, and key thresholds. Return ONLY a JSON array of objects with {key, value, description} format using these exact keys:
std_deduction_single, std_deduction_mfj, std_deduction_mfs, std_deduction_hoh,
bracket_mfj_1_rate through bracket_mfj_7_rate, bracket_mfj_1_max through bracket_mfj_7_max,
bracket_single_1_rate through bracket_single_7_rate, bracket_single_1_max through bracket_single_7_max,
child_tax_credit, salt_cap, eic_max_0 through eic_max_3, aotc_max, llc_max.
Use the most current IRS-published values. Return ONLY valid JSON, no markdown.`;

      const response = await anthropic.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "[]";
      // Try to parse JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const updates = JSON.parse(jsonMatch[0]);
        const now = new Date().toISOString();
        let updatedCount = 0;
        for (const u of updates) {
          if (u.key && u.value !== undefined) {
            storage.upsertTaxCode({
              taxYear: year,
              key: u.key,
              value: String(u.value),
              description: u.description || "",
              lastUpdated: now,
            });
            updatedCount++;
          }
        }
        res.json({ success: true, updated: updatedCount, message: `Updated ${updatedCount} tax code values for ${year}` });
      } else {
        res.json({ success: false, message: "Could not parse tax code updates" });
      }
    } catch (error: any) {
      console.error("Tax code update error:", error);
      res.json({ success: false, message: "Failed to update tax code: " + error.message });
    }
  });

  return httpServer;
}
