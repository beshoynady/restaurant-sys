// DATABASE_IMPLEMENTATION_PLAN.md DB-009 (DATABASE_ARCHITECTURE_REDESIGN.md, Problem 2):
// pairs with journal-line.model.ts (DB-008). Adds the balance-tracking
// fields computed once at transactional write time (DB-010, service layer,
// not part of this schema pass), reversal-based correction fields (posted
// entries are never edited in place), a maker-checker-capable
// approve/post split, an `origin` classification, a `Reversed` status
// distinct from `Rejected`, and a `baseCurrency` snapshot. The previous
// `lines: [ObjectId]` array is removed — it was a second, independent
// source of the parent/child relationship (alongside JournalLine's new
// `journalEntry` back-reference) with no mechanism keeping the two in
// sync; query `JournalLine.find({ journalEntry: entry._id })` instead.
import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export type JournalEntryStatus = "Pending" | "Posted" | "Rejected" | "Reversed";
export type JournalEntryOrigin = "System" | "Manual" | "Adjusting" | "Closing";

export interface IJournalEntry extends Document {
  brand: Types.ObjectId;
  branch: Types.ObjectId;
  period: Types.ObjectId;
  date: Date;
  entryNumber: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  baseCurrency: string | null;
  origin: JournalEntryOrigin;
  status: JournalEntryStatus;
  reversalOf: Types.ObjectId | null;
  reversedBy: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  approvedBy: Types.ObjectId | null;
  approvedAt: Date | null;
  postedBy: Types.ObjectId | null;
  postedAt: Date | null;
  rejectedBy: Types.ObjectId | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
}

const journalEntrySchema = new Schema<IJournalEntry>(
  {
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    branch: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    period: { type: Schema.Types.ObjectId, ref: "AccountingPeriod", required: true },
    date: { type: Date, required: true, default: Date.now },

    // Entry number unique per brand, branch, period
    entryNumber: { type: String, required: true, trim: true, maxlength: 30 },

    description: { type: String, required: true, trim: true, maxlength: 500 },

    // DB-009: computed once inside the transactional write path (DB-010) before commit; never
    // recalculated afterward — the entry is immutable once posted.
    totalDebit: { type: Number, required: true, default: 0 },
    totalCredit: { type: Number, required: true, default: 0 },
    isBalanced: { type: Boolean, required: true, default: false },

    // Snapshot of the brand's base currency at posting time, protecting historical reports if a
    // brand's base currency is ever reconfigured later. Line-level currency/exchangeRate already
    // exists on JournalLine — this is not a duplicate, it is the entry-level reporting anchor.
    baseCurrency: { type: String, uppercase: true, default: null },

    // Distinguishes system-auto-generated postings (from Invoice/PurchaseInvoice/etc.) from
    // manually-entered journal entries, which generally warrant more audit scrutiny.
    origin: {
      type: String,
      enum: ["System", "Manual", "Adjusting", "Closing"],
      default: "System",
    },

    /** Status of the journal entry
     * "Pending"  - created but not posted yet
     * "Posted"   - posted to the ledger
     * "Rejected" - rejected and will never be posted
     * "Reversed" - was posted, then a correcting reversal entry was created (see reversalOf/reversedBy)
     */
    status: {
      type: String,
      enum: ["Pending", "Posted", "Rejected", "Reversed"],
      default: "Pending",
    },

    // DB-009: corrections to a posted entry happen via a new entry referencing this one, never by
    // editing this one in place.
    reversalOf: { type: Schema.Types.ObjectId, ref: "JournalEntry", default: null },
    reversedBy: { type: Schema.Types.ObjectId, ref: "JournalEntry", default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: "UserAccount", required: true },

    // DB-009: maker-checker-capable — distinct from postedBy/postedAt. Deliberately nullable: a
    // brand that doesn't need a separate approval step before posting simply leaves these unset.
    approvedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
    approvedAt: { type: Date, default: null },

    // DB-009: standardized to UserAccount (was Employee) — posting is a login-identity action,
    // matching the actor-reference convention used by createdBy/updatedBy elsewhere in this schema.
    postedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
    postedAt: { type: Date, default: null },

    rejectedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
    rejectedAt: { type: Date, default: null },

    rejectionReason: { type: String, trim: true, maxlength: 300, default: null },
  },
  { timestamps: true },
);

journalEntrySchema.index({ brand: 1, branch: 1, period: 1, entryNumber: 1 }, { unique: true });

// DB-009: immutability — a Posted entry can never be updated directly; corrections happen only
// via a new reversal entry (reversalOf/reversedBy above). Mirrors the pre-existing correct pattern
// already used elsewhere in this codebase on AssetTransaction.
async function blockPostedEntryMutation(
  this: mongoose.Query<unknown, IJournalEntry>,
  next: (err?: Error) => void,
) {
  const target = await this.model.findOne(this.getQuery()).select("status").lean();
  if (target && (target as { status?: string }).status === "Posted") {
    return next(
      new Error(
        "JournalEntry: Posted entries are immutable. Create a reversal entry (reversalOf) instead of editing.",
      ),
    );
  }
  next();
}

journalEntrySchema.pre("updateOne", { document: false, query: true }, blockPostedEntryMutation);
journalEntrySchema.pre("findOneAndUpdate", { document: false, query: true }, blockPostedEntryMutation);

const JournalEntryModel: Model<IJournalEntry> =
  mongoose.models.JournalEntry || mongoose.model<IJournalEntry>("JournalEntry", journalEntrySchema);

export default JournalEntryModel;
