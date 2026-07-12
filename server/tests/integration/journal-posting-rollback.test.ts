// DATABASE_IMPLEMENTATION_PLAN.md DB-010 — journal posting rollback.
// Verifies that if line creation fails partway through the transaction (here: a line with a
// malformed `account` reference, which passes the pre-transaction balance check since amounts are
// still equal, but fails Mongoose validation when the JournalLine document is actually written),
// the JournalEntry header that was already created earlier in the SAME transaction is rolled back
// too — no orphaned header-with-no-lines can ever be committed.
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

describe("DB-010: journal posting rollback", () => {
  let fixture: TestFixture;
  let cashAccountId: string;
  let periodId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("posting-rollback");
    const cash = await createAccountFixture(fixture, "CASH-RB", "Asset");
    cashAccountId = String(cash._id);
    const period = await createAccountingPeriodFixture(fixture, "rollback");
    periodId = String(period._id);
  });

  afterAll(async () => {
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("rolls back the JournalEntry header when a line fails to write mid-transaction", async () => {
    const entryNumber = "JE-ROLLBACK-1";

    await expect(
      journalEntryService.createBalancedEntry({
        brand: fixture.brandId,
        branch: fixture.branchId,
        period: periodId,
        entryNumber,
        description: "Entry with one deliberately malformed line",
        createdBy: fixture.userId,
        lines: [
          { account: cashAccountId, description: "Cash in", debit: 100, credit: 0, currency: "USD" },
          {
            // Balanced in amount (satisfies the pre-transaction totalDebit===totalCredit check),
            // but not a valid ObjectId — this line's document write fails inside the transaction,
            // after the JournalEntry header has already been created in the same session.
            account: "not-a-valid-object-id" as unknown as string,
            description: "Malformed line",
            debit: 0,
            credit: 100,
            currency: "USD",
          },
        ],
      }),
    ).rejects.toThrow();

    const persistedEntry = await JournalEntryModel.findOne({ brand: fixture.brandId, entryNumber });
    expect(persistedEntry).toBeNull(); // the header must not survive if its lines failed to write

    const persistedLines = await JournalLineModel.find({
      brand: fixture.brandId,
      description: "Cash in",
      account: cashAccountId,
    });
    expect(persistedLines).toHaveLength(0); // the one line that WOULD have succeeded must not survive either
  });
});
