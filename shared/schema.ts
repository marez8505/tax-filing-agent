import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tax profiles (one per household per year)
export const taxProfiles = sqliteTable("tax_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taxYear: integer("tax_year").notNull(),
  filingStatus: text("filing_status").notNull().default("married_filing_jointly"),
  // Taxpayer 1
  firstName1: text("first_name_1").default(""),
  lastName1: text("last_name_1").default(""),
  ssn1: text("ssn_1").default(""),
  dob1: text("dob_1").default(""),
  occupation1: text("occupation_1").default(""),
  // Taxpayer 2 (spouse)
  firstName2: text("first_name_2").default(""),
  lastName2: text("last_name_2").default(""),
  ssn2: text("ssn_2").default(""),
  dob2: text("dob_2").default(""),
  occupation2: text("occupation_2").default(""),
  // Address
  street: text("street").default(""),
  apt: text("apt").default(""),
  city: text("city").default(""),
  state: text("state").default(""),
  zip: text("zip").default(""),
  // Bank info for refund direct deposit
  bankRouting: text("bank_routing").default(""),
  bankAccount: text("bank_account").default(""),
  accountType: text("account_type").default("checking"),
  createdAt: text("created_at").default(""),
  // Year-over-year tracking
  status: text("status").default("in_progress"), // in_progress | filed | accepted | amended
  notes: text("notes").default(""),
  filedDate: text("filed_date").default(""),
  confirmationNumber: text("confirmation_number").default(""),
});

// Income entries
export const incomeEntries = sqliteTable("income_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull(),
  category: text("category").notNull(), // w2, 1099_nec, 1099_int, 1099_div, 1099_r, ssa, other
  source: text("source").default(""),
  amount: real("amount").notNull().default(0),
  federalWithheld: real("federal_withheld").default(0),
  stateWithheld: real("state_withheld").default(0),
  description: text("description").default(""),
});

// Deduction entries
export const deductionEntries = sqliteTable("deduction_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull(),
  category: text("category").notNull(), // mortgage_interest, property_tax, charity, medical, salt, student_loan, educator, hsa, ira, business
  description: text("description").default(""),
  amount: real("amount").notNull().default(0),
  isTaxDeductible: integer("is_tax_deductible").default(1),
});

// Credits
export const creditEntries = sqliteTable("credit_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull(),
  category: text("category").notNull(), // child_tax_credit, eic, aotc, llc, child_care, saver, ev, energy
  description: text("description").default(""),
  amount: real("amount").notNull().default(0),
  dependentName: text("dependent_name").default(""),
});

// Dependents
export const dependents = sqliteTable("dependents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  ssn: text("ssn").default(""),
  relationship: text("relationship").default(""),
  dob: text("dob").default(""),
  monthsLived: integer("months_lived").default(12),
});

// Tax code reference (updated annually)
export const taxCodeRef = sqliteTable("tax_code_ref", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taxYear: integer("tax_year").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  description: text("description").default(""),
  lastUpdated: text("last_updated").default(""),
});

// Chat history for AI conversations
export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull(),
  role: text("role").notNull(), // user or assistant
  content: text("content").notNull(),
  timestamp: text("timestamp").default(""),
});

// FPU import log
export const fpuImports = sqliteTable("fpu_imports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull(),
  importDate: text("import_date").default(""),
  itemCount: integer("item_count").default(0),
  summary: text("summary").default(""),
});

// Insert schemas
export const insertTaxProfileSchema = createInsertSchema(taxProfiles).omit({ id: true });
export const insertIncomeSchema = createInsertSchema(incomeEntries).omit({ id: true });
export const insertDeductionSchema = createInsertSchema(deductionEntries).omit({ id: true });
export const insertCreditSchema = createInsertSchema(creditEntries).omit({ id: true });
export const insertDependentSchema = createInsertSchema(dependents).omit({ id: true });
export const insertTaxCodeRefSchema = createInsertSchema(taxCodeRef).omit({ id: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true });
export const insertFpuImportSchema = createInsertSchema(fpuImports).omit({ id: true });

// Types
export type TaxProfile = typeof taxProfiles.$inferSelect;
export type InsertTaxProfile = z.infer<typeof insertTaxProfileSchema>;
export type IncomeEntry = typeof incomeEntries.$inferSelect;
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type DeductionEntry = typeof deductionEntries.$inferSelect;
export type InsertDeduction = z.infer<typeof insertDeductionSchema>;
export type CreditEntry = typeof creditEntries.$inferSelect;
export type InsertCredit = z.infer<typeof insertCreditSchema>;
export type Dependent = typeof dependents.$inferSelect;
export type InsertDependent = z.infer<typeof insertDependentSchema>;
export type TaxCodeRef = typeof taxCodeRef.$inferSelect;
export type InsertTaxCodeRef = z.infer<typeof insertTaxCodeRefSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type FpuImport = typeof fpuImports.$inferSelect;
export type InsertFpuImport = z.infer<typeof insertFpuImportSchema>;
