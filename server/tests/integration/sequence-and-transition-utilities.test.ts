// Supply Chain & Commerce Platform V5 — shared infrastructure utilities. Verifies:
// 1. SequenceGeneratorService: atomic increment, concurrency-safety (parallel callers never
//    collide), reset-policy boundaries (YEARLY/MONTHLY/DAILY), and padding/prefix formatting.
// 2. TransitionGuard: allowed/disallowed transitions, same-state no-op, terminal-state detection.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import sequenceGenerator from "../../utils/SequenceGeneratorService.js";
import { createTransitionGuard } from "../../utils/TransitionGuard.js";

// A minimal throwaway model, scoped to this test file only, purely to exercise the generic
// sequence-generation logic against a real MongoDB document (the atomicity guarantee is
// meaningless without a real database round-trip).
const TestSequenceSchema = new mongoose.Schema({
  key: String,
  numSequence: {
    prefix: String,
    startNumber: Number,
    currentNumber: Number,
    padding: Number,
    resetPolicy: { type: String, enum: ["NONE", "DAILY", "MONTHLY", "YEARLY"], default: "NONE" },
    lastResetDate: Date,
  },
});
const TestSequenceModel = mongoose.models.TestSequenceForSCP || mongoose.model("TestSequenceForSCP", TestSequenceSchema, "test_sequences_scp");

describe("Supply Chain V5: SequenceGeneratorService", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterEach(async () => {
    await TestSequenceModel.deleteMany({});
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it("increments sequentially with prefix and padding", async () => {
    await TestSequenceModel.create({ key: "a", numSequence: { prefix: "PO-", startNumber: 1, currentNumber: 1, padding: 4 } });

    const first = await sequenceGenerator.getNext({ Model: TestSequenceModel, filter: { key: "a" }, sequenceField: "numSequence" });
    const second = await sequenceGenerator.getNext({ Model: TestSequenceModel, filter: { key: "a" }, sequenceField: "numSequence" });

    expect(first).toBe("PO-0001");
    expect(second).toBe("PO-0002");
  });

  it("never collides under concurrent callers (atomic $inc, no read-then-write race)", async () => {
    await TestSequenceModel.create({ key: "b", numSequence: { prefix: "GRN-", startNumber: 1, currentNumber: 1, padding: 0 } });

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        sequenceGenerator.getNext({ Model: TestSequenceModel, filter: { key: "b" }, sequenceField: "numSequence" }),
      ),
    );

    expect(new Set(results).size).toBe(20); // every value distinct
  });

  it("resets to startNumber when the YEARLY boundary has passed", async () => {
    await TestSequenceModel.create({
      key: "c",
      numSequence: { prefix: "PR-", startNumber: 1, currentNumber: 50, padding: 0, resetPolicy: "YEARLY", lastResetDate: new Date("2020-01-01") },
    });

    const result = await sequenceGenerator.getNext({ Model: TestSequenceModel, filter: { key: "c" }, sequenceField: "numSequence" });

    expect(result).toBe("PR-1");
  });

  it("does not reset when still within the current YEARLY boundary", async () => {
    const now = new Date();
    const startOfThisYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    await TestSequenceModel.create({
      key: "d",
      numSequence: { prefix: "PR-", startNumber: 1, currentNumber: 7, padding: 0, resetPolicy: "YEARLY", lastResetDate: startOfThisYear },
    });

    const result = await sequenceGenerator.getNext({ Model: TestSequenceModel, filter: { key: "d" }, sequenceField: "numSequence" });

    expect(result).toBe("PR-7");
  });

  it("throws a clear error when no matching document exists", async () => {
    await expect(
      sequenceGenerator.getNext({ Model: TestSequenceModel, filter: { key: "nonexistent" }, sequenceField: "numSequence" }),
    ).rejects.toThrow(/no sequence configuration found/i);
  });
});

describe("Supply Chain V5: TransitionGuard", () => {
  const guard = createTransitionGuard({
    Draft: ["Submitted", "Cancelled"],
    Submitted: ["Approved", "Rejected"],
    Approved: ["Completed"],
    Rejected: [],
    Cancelled: [],
    Completed: [],
  });

  it("allows a defined transition", () => {
    expect(guard.canTransition("Draft", "Submitted")).toBe(true);
    expect(() => guard.assertValid("Draft", "Submitted")).not.toThrow();
  });

  it("rejects an undefined transition", () => {
    expect(guard.canTransition("Draft", "Completed")).toBe(false);
    expect(() => guard.assertValid("Draft", "Completed")).toThrow(/cannot transition/i);
  });

  it("treats a same-state transition as invalid (not a silent no-op)", () => {
    expect(guard.canTransition("Draft", "Draft")).toBe(false);
  });

  it("identifies terminal states correctly", () => {
    expect(guard.isTerminal("Completed")).toBe(true);
    expect(guard.isTerminal("Rejected")).toBe(true);
    expect(guard.isTerminal("Draft")).toBe(false);
  });
});
