import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema;
import journalLineSchema from "./journal-line.model.js";

const journalEntrySchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },
    period: {
      type: ObjectId,
      ref: "AccountingPeriod",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // entry number unique per brand, branch, period
    entryNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: [30, "Entry number cannot exceed 30 characters"],
    },
    // brief description of the journal entry
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    // array of journal lines
    lines: [journalLineSchema],

    /** Status of the journal entry
     * "Pending" - created but not posted yet
     * "Posted" - posted to the ledger
     * "Rejected" - rejected and will not be posted
     */
    status: {
      type: String,
      enum: ["Pending", "Posted", "Rejected"],
      default: "Pending",
    },
    /*
      References to employees for auditing
    */
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    postedBy: { type: ObjectId, ref: "Employee", default: null },
    postedAt: { type: Date, default: null },

    rejectedBy: { type: ObjectId, ref: "Employee", default: null },
    rejectedAt: { type: Date, default: null },

    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },
  },
  { timestamps: true },
);

journalEntrySchema.index(
  { brand: 1, branch: 1, period: 1, entryNumber: 1 },
  { unique: true },
);
const JournalEntry = mongoose.model("JournalEntry", journalEntrySchema);

export JournalEntry;
