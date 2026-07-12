// DATABASE_IMPLEMENTATION_PLAN.md DB-010 — unbalanced journal rejection.
// Verifies journalEntryService.createBalancedEntry rejects a set of lines whose total debit does
// not equal total credit, and that nothing is persisted (no JournalEntry, no JournalLine).
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture,
  createAccountFixture,
  createAccountingPeriodFixture,
  cleanupFixture,
  type TestFixture,
} from "./fixtures.js";
import journalEntryService from "../../modules/accounting/journal-entry/journal-entry.service.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";

describe("DB-010: unbalanced journal rejection", () => {
  let fixture: TestFixture;
  let cashAccountId: string;
  let revenueAccountId: string;
  let periodId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("unbalanced-journal");
    const cash = await createAccountFixture(fixture, "CASH-UB", "Asset");
    const revenue = await createAccountFixture(fixture, "REV-UB", "Revenue");
    cashAccountId = String(cash._id);
    revenueAccountId = String(revenue._id);
    const period = await createAccountingPeriodFixture(fixture, "unbalanced");
    periodId = String(period._id);
  });

  afterAll(async () => {
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("rejects an entry whose lines do not balance, and persists nothing", async () => {
    const entryNumber = "JE-UNBALANCED-1";

    await expect(
      journalEntryService.createBalancedEntry({
        brand: fixture.brandId,
        branch: fixture.branchId,
        period: periodId,
        entryNumber,
        description: "Intentionally unbalanced entry",
        createdBy: fixture.userId,
        lines: [
          { account: cashAccountId, description: "Cash in", debit: 100, credit: 0, currency: "USD" },
          { account: revenueAccountId, description: "Revenue", debit: 0, credit: 90, currency: "USD" }, // mismatched
        ],
      }),
    ).rejects.toThrow(/not balanced/i);

    const persistedEntry = await JournalEntryModel.findOne({
      brand: fixture.brandId,
      entryNumber,
    });
    expect(persistedEntry).toBeNull();

    const persistedLines = await JournalLineModel.find({
      brand: new mongoose.Types.ObjectId(fixture.brandId),
      account: { $in: [cashAccountId, revenueAccountId].map((id) => new mongoose.Types.ObjectId(id)) },
    });
    expect(persistedLines).toHaveLength(0);
  });
});
