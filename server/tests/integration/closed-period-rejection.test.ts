// DATABASE_IMPLEMENTATION_PLAN.md DB-014 — closed accounting period rejection.
// Verifies journalEntryService.createBalancedEntry rejects a (balanced, otherwise valid) entry
// targeting an AccountingPeriod with isLocked: true, and persists nothing.
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

describe("DB-014: closed accounting period rejection", () => {
  let fixture: TestFixture;
  let cashAccountId: string;
  let revenueAccountId: string;
  let lockedPeriodId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("locked-period");
    const cash = await createAccountFixture(fixture, "CASH-LP", "Asset");
    const revenue = await createAccountFixture(fixture, "REV-LP", "Revenue");
    cashAccountId = String(cash._id);
    revenueAccountId = String(revenue._id);

    const lockedPeriod = await createAccountingPeriodFixture(fixture, "locked", {
      status: "Closed",
      isLocked: true,
    });
    lockedPeriodId = String(lockedPeriod._id);
  });

  afterAll(async () => {
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("rejects a balanced entry targeting a locked period, and persists nothing", async () => {
    const entryNumber = "JE-LOCKED-1";

    await expect(
      journalEntryService.createBalancedEntry({
        brand: fixture.brandId,
        branch: fixture.branchId,
        period: lockedPeriodId,
        entryNumber,
        description: "Attempted write to a locked period",
        createdBy: fixture.userId,
        lines: [
          { account: cashAccountId, description: "Cash in", debit: 50, credit: 0, currency: "USD" },
          { account: revenueAccountId, description: "Revenue", debit: 0, credit: 50, currency: "USD" },
        ],
      }),
    ).rejects.toThrow(/locked accounting period/i);

    const persistedEntry = await JournalEntryModel.findOne({ brand: fixture.brandId, entryNumber });
    expect(persistedEntry).toBeNull();
  });
});
