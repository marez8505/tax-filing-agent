import {
  type TaxProfile, type InsertTaxProfile, taxProfiles,
  type IncomeEntry, type InsertIncome, incomeEntries,
  type DeductionEntry, type InsertDeduction, deductionEntries,
  type CreditEntry, type InsertCredit, creditEntries,
  type Dependent, type InsertDependent, dependents,
  type TaxCodeRef, type InsertTaxCodeRef, taxCodeRef,
  type ChatMessage, type InsertChatMessage, chatMessages,
  type FpuImport, type InsertFpuImport, fpuImports,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Tax Profiles
  getProfile(id: number): TaxProfile | undefined;
  getProfileByYear(year: number): TaxProfile | undefined;
  getAllProfiles(): TaxProfile[];
  createProfile(data: InsertTaxProfile): TaxProfile;
  updateProfile(id: number, data: Partial<InsertTaxProfile>): TaxProfile | undefined;

  // Income
  getIncomeByProfile(profileId: number): IncomeEntry[];
  createIncome(data: InsertIncome): IncomeEntry;
  updateIncome(id: number, data: Partial<InsertIncome>): IncomeEntry | undefined;
  deleteIncome(id: number): void;

  // Deductions
  getDeductionsByProfile(profileId: number): DeductionEntry[];
  createDeduction(data: InsertDeduction): DeductionEntry;
  updateDeduction(id: number, data: Partial<InsertDeduction>): DeductionEntry | undefined;
  deleteDeduction(id: number): void;

  // Credits
  getCreditsByProfile(profileId: number): CreditEntry[];
  createCredit(data: InsertCredit): CreditEntry;
  updateCredit(id: number, data: Partial<InsertCredit>): CreditEntry | undefined;
  deleteCredit(id: number): void;

  // Dependents
  getDependentsByProfile(profileId: number): Dependent[];
  createDependent(data: InsertDependent): Dependent;
  updateDependent(id: number, data: Partial<InsertDependent>): Dependent | undefined;
  deleteDependent(id: number): void;

  // Tax Code Reference
  getTaxCodeByYear(year: number): TaxCodeRef[];
  getTaxCodeValue(year: number, key: string): string | undefined;
  upsertTaxCode(data: InsertTaxCodeRef): TaxCodeRef;

  // Chat
  getChatByProfile(profileId: number): ChatMessage[];
  addChatMessage(data: InsertChatMessage): ChatMessage;
  clearChat(profileId: number): void;

  // FPU Import
  getFpuImports(profileId: number): FpuImport[];
  createFpuImport(data: InsertFpuImport): FpuImport;
}

export class DatabaseStorage implements IStorage {
  // Tax Profiles
  getProfile(id: number): TaxProfile | undefined {
    return db.select().from(taxProfiles).where(eq(taxProfiles.id, id)).get();
  }
  getProfileByYear(year: number): TaxProfile | undefined {
    return db.select().from(taxProfiles).where(eq(taxProfiles.taxYear, year)).get();
  }
  getAllProfiles(): TaxProfile[] {
    return db.select().from(taxProfiles).all();
  }
  createProfile(data: InsertTaxProfile): TaxProfile {
    return db.insert(taxProfiles).values(data).returning().get();
  }
  updateProfile(id: number, data: Partial<InsertTaxProfile>): TaxProfile | undefined {
    return db.update(taxProfiles).set(data).where(eq(taxProfiles.id, id)).returning().get();
  }

  // Income
  getIncomeByProfile(profileId: number): IncomeEntry[] {
    return db.select().from(incomeEntries).where(eq(incomeEntries.profileId, profileId)).all();
  }
  createIncome(data: InsertIncome): IncomeEntry {
    return db.insert(incomeEntries).values(data).returning().get();
  }
  updateIncome(id: number, data: Partial<InsertIncome>): IncomeEntry | undefined {
    return db.update(incomeEntries).set(data).where(eq(incomeEntries.id, id)).returning().get();
  }
  deleteIncome(id: number): void {
    db.delete(incomeEntries).where(eq(incomeEntries.id, id)).run();
  }

  // Deductions
  getDeductionsByProfile(profileId: number): DeductionEntry[] {
    return db.select().from(deductionEntries).where(eq(deductionEntries.profileId, profileId)).all();
  }
  createDeduction(data: InsertDeduction): DeductionEntry {
    return db.insert(deductionEntries).values(data).returning().get();
  }
  updateDeduction(id: number, data: Partial<InsertDeduction>): DeductionEntry | undefined {
    return db.update(deductionEntries).set(data).where(eq(deductionEntries.id, id)).returning().get();
  }
  deleteDeduction(id: number): void {
    db.delete(deductionEntries).where(eq(deductionEntries.id, id)).run();
  }

  // Credits
  getCreditsByProfile(profileId: number): CreditEntry[] {
    return db.select().from(creditEntries).where(eq(creditEntries.profileId, profileId)).all();
  }
  createCredit(data: InsertCredit): CreditEntry {
    return db.insert(creditEntries).values(data).returning().get();
  }
  updateCredit(id: number, data: Partial<InsertCredit>): CreditEntry | undefined {
    return db.update(creditEntries).set(data).where(eq(creditEntries.id, id)).returning().get();
  }
  deleteCredit(id: number): void {
    db.delete(creditEntries).where(eq(creditEntries.id, id)).run();
  }

  // Dependents
  getDependentsByProfile(profileId: number): Dependent[] {
    return db.select().from(dependents).where(eq(dependents.profileId, profileId)).all();
  }
  createDependent(data: InsertDependent): Dependent {
    return db.insert(dependents).values(data).returning().get();
  }
  updateDependent(id: number, data: Partial<InsertDependent>): Dependent | undefined {
    return db.update(dependents).set(data).where(eq(dependents.id, id)).returning().get();
  }
  deleteDependent(id: number): void {
    db.delete(dependents).where(eq(dependents.id, id)).run();
  }

  // Tax Code Reference
  getTaxCodeByYear(year: number): TaxCodeRef[] {
    return db.select().from(taxCodeRef).where(eq(taxCodeRef.taxYear, year)).all();
  }
  getTaxCodeValue(year: number, key: string): string | undefined {
    const row = db.select().from(taxCodeRef)
      .where(and(eq(taxCodeRef.taxYear, year), eq(taxCodeRef.key, key))).get();
    return row?.value;
  }
  upsertTaxCode(data: InsertTaxCodeRef): TaxCodeRef {
    const existing = db.select().from(taxCodeRef)
      .where(and(eq(taxCodeRef.taxYear, data.taxYear), eq(taxCodeRef.key, data.key))).get();
    if (existing) {
      return db.update(taxCodeRef).set({ value: data.value, description: data.description, lastUpdated: data.lastUpdated })
        .where(eq(taxCodeRef.id, existing.id)).returning().get();
    }
    return db.insert(taxCodeRef).values(data).returning().get();
  }

  // Chat
  getChatByProfile(profileId: number): ChatMessage[] {
    return db.select().from(chatMessages).where(eq(chatMessages.profileId, profileId)).all();
  }
  addChatMessage(data: InsertChatMessage): ChatMessage {
    return db.insert(chatMessages).values(data).returning().get();
  }
  clearChat(profileId: number): void {
    db.delete(chatMessages).where(eq(chatMessages.profileId, profileId)).run();
  }

  // FPU Import
  getFpuImports(profileId: number): FpuImport[] {
    return db.select().from(fpuImports).where(eq(fpuImports.profileId, profileId)).all();
  }
  createFpuImport(data: InsertFpuImport): FpuImport {
    return db.insert(fpuImports).values(data).returning().get();
  }
}

export const storage = new DatabaseStorage();
