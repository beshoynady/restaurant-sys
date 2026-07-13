// V4.0 Journal Entry Posting Engine — postFromSource / approve / reject / reverse.
// Verifies: postFromSource auto-posts when AccountingSettings.journalEntry.requireApproval is
// false, and creates a Pending entry when true; approveEntry/rejectEntry only work from Pending;
// reverseEntry creates a balanced offsetting entry and marks the original Reversed, atomically.
//
// Each test uses its OWN brand (a fresh createBaseFixture call) rather than sharing one brand
// across cases: the live `accountingsettings` collection still carries a legacy single-field
// unique index on `brand` alone (superseded in accounting-setting.model.js by a {brand,branch}
// compound index, but never dropped from the database) — see PLATFORM_FINAL_AUDIT.md's V4.0 phase
// notes. That stale index currently limits a brand to exactly one AccountingSettings document
// regardless of branch, contradicting the model's own "optional branch-specific override" design;
// fixing it requires a migration on shared infrastructure, out of scope for this test file to
// perform unilaterally. Per-test brand isolation sidesteps it without masking the finding.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture,
  createAccountFixture,
  createAccountingPeriodFixture,
  createAccountingSettingsFixture,
  cleanupFixture,
  type TestFixture,
} from "./fixtures.js";
import journalEntryService from "../../modules/accounting/journal-entry/journal-entry.service.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";

// Unique per test-process run (not just per-file) — a prior failed run of this suite can leave a
// brand behind if it fails partway through setUpBrand, before a `fixture` exists for the caller's
// try/finally to clean up. Appending a fresh random tag every run means a leftover brand from a
// previous run is simply never looked up again, without deleting anything.
const runTag = Math.random().toString(36).slice(2, 8);

async function setUpBrand(suffix: string, requireApproval: boolean) {
  const tag = `${suffix}-${runTag}`;
  let fixture: TestFixture | undefined;
  try {
    fixture = await createBaseFixture(tag);
    await createAccountingPeriodFixture(fixture, tag, {
      startDate: new Date(Date.UTC(2020, 0, 1)),
      endDate: new Date(Date.UTC(2035, 11, 31)),
    });
    await createAccountingSettingsFixture(fixture, tag, {
      journalEntry: { autoNumber: true, prefix: `JE-${tag.toUpperCase()}`, nextNumber: 1, requireApproval },
    });
    // "T" prefix (TCASH/TREV, not CASH/REV) so these don't collide with the CASH-/REV- accounts
    // createAccountingSettingsFixture creates internally for the same brand+tag.
    const cash = await createAccountFixture(fixture, `TCASH-${tag}`, "Asset");
    const revenue = await createAccountFixture(fixture, `TREV-${tag}`, "Revenue");

    return {
      fixture,
      tag,
      lines: [
        { account: String(cash._id), description: "cash in", debit: 100, credit: 0, currency: "USD" },
        { account: String(revenue._id), description: "revenue", debit: 0, credit: 100, currency: "USD" },
      ],
      cashAccountId: String(cash._id),
    };
  } catch (err) {
    if (fixture) {
      await cleanupFixture(fixture);
    }
    throw err;
  }
}

describe("V4.0: Journal Entry Posting Engine", () => {
  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeAll(async () => {
    await connectTestDb();
  });

  it("auto-posts when requireApproval is false", async () => {
    const { fixture, lines } = await setUpBrand("je-auto", false);
    try {
      const { entry } = await journalEntryService.postFromSource({
        sourceType: "MANUAL_ENTRY",
        brand: fixture.brandId,
        branch: fixture.branchId,
        description: "Auto-post test",
        lines,
        createdBy: fixture.userId,
      });

      expect(entry.status).toBe("Posted");
      expect(entry.postedAt).toBeTruthy();
    } finally {
      await cleanupFixture(fixture);
    }
  });

  it("creates a Pending entry when requireApproval is true, then approve posts it", async () => {
    const { fixture, lines } = await setUpBrand("je-appr", true);
    try {
      const { entry } = await journalEntryService.postFromSource({
        sourceType: "MANUAL_ENTRY",
        brand: fixture.brandId,
        branch: fixture.branchId,
        description: "Pending approval test",
        lines,
        createdBy: fixture.userId,
      });

      expect(entry.status).toBe("Pending");
      expect(entry.postedAt).toBeNull();

      const approved = await journalEntryService.approveEntry({
        id: String(entry._id),
        brand: fixture.brandId,
        approvedBy: fixture.userId,
      });

      expect(approved.status).toBe("Posted");
      expect(approved.approvedBy).toBeTruthy();
      expect(approved.postedAt).toBeTruthy();
    } finally {
      await cleanupFixture(fixture);
    }
  });

  it("rejects a Pending entry, which then can never be approved", async () => {
    const { fixture, lines } = await setUpBrand("je-rej", true);
    try {
      const { entry } = await journalEntryService.postFromSource({
        sourceType: "MANUAL_ENTRY",
        brand: fixture.brandId,
        branch: fixture.branchId,
        description: "Reject test",
        lines,
        createdBy: fixture.userId,
      });

      const rejected = await journalEntryService.rejectEntry({
        id: String(entry._id),
        brand: fixture.brandId,
        rejectedBy: fixture.userId,
        reason: "Wrong accounts",
      });
      expect(rejected.status).toBe("Rejected");

      await expect(
        journalEntryService.approveEntry({
          id: String(entry._id),
          brand: fixture.brandId,
          approvedBy: fixture.userId,
        }),
      ).rejects.toThrow(/not Pending/i);
    } finally {
      await cleanupFixture(fixture);
    }
  });

  it("reverses a Posted entry: creates a balanced offsetting entry and marks the original Reversed", async () => {
    const { fixture, lines, cashAccountId } = await setUpBrand("je-rev", false);
    try {
      const { entry } = await journalEntryService.postFromSource({
        sourceType: "MANUAL_ENTRY",
        brand: fixture.brandId,
        branch: fixture.branchId,
        description: "To be reversed",
        lines,
        createdBy: fixture.userId,
      });

      const { reversalEntry, originalEntry } = await journalEntryService.reverseEntry({
        id: String(entry._id),
        brand: fixture.brandId,
        branch: fixture.branchId,
        reversedBy: fixture.userId,
        reason: "test reversal",
      });

      expect(reversalEntry.status).toBe("Posted");
      expect(reversalEntry.totalDebit).toBe(entry.totalCredit);
      expect(reversalEntry.totalCredit).toBe(entry.totalDebit);
      expect(String(reversalEntry.reversalOf)).toBe(String(entry._id));

      expect(originalEntry.status).toBe("Reversed");
      expect(String(originalEntry.reversedBy)).toBe(String(reversalEntry._id));

      const reversalLines = await JournalLineModel.find({ journalEntry: reversalEntry._id }).lean();
      expect(reversalLines).toHaveLength(2);
      const cashLine = reversalLines.find((l) => String(l.account) === cashAccountId);
      expect(cashLine!.credit).toBe(100);
      expect(cashLine!.debit).toBe(0);

      // Reversing a second time must fail — the original is no longer Posted.
      await expect(
        journalEntryService.reverseEntry({
          id: String(entry._id),
          brand: fixture.brandId,
          branch: fixture.branchId,
          reversedBy: fixture.userId,
        }),
      ).rejects.toThrow(/Only Posted entries can be reversed/i);
    } finally {
      await cleanupFixture(fixture);
    }
  });

  it("rejects an unbalanced set of lines even via postFromSource", async () => {
    const { fixture, tag, cashAccountId } = await setUpBrand("je-unbal", false);
    const revenueAccountId = (await createAccountFixture(fixture, `REV2-${tag}`, "Revenue"))._id;
    try {
      await expect(
        journalEntryService.postFromSource({
          sourceType: "MANUAL_ENTRY",
          brand: fixture.brandId,
          branch: fixture.branchId,
          description: "Unbalanced",
          lines: [
            { account: cashAccountId, description: "cash", debit: 50, credit: 0, currency: "USD" },
            { account: String(revenueAccountId), description: "revenue", debit: 0, credit: 40, currency: "USD" },
          ],
          createdBy: fixture.userId,
        }),
      ).rejects.toThrow(/not balanced/i);

      const persisted = await JournalEntryModel.findOne({ brand: fixture.brandId, description: "Unbalanced" });
      expect(persisted).toBeNull();
    } finally {
      await cleanupFixture(fixture);
    }
  });
});
