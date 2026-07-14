import throwError from "./throwError.js";

/**
 * SequenceGeneratorService — Supply Chain & Commerce Platform V5.
 *
 * Generalizes the atomic, concurrency-safe numbering pattern already proven in
 * order-settings.service.ts (DB-007) and invoice-settings.service.ts, so every NEW numbered
 * document (PurchaseOrder, GoodsReceiptNote, PurchaseRequest, ...) reuses one implementation
 * instead of each hand-rolling its own `$inc`/reset logic — the exact "Prefer composition over
 * duplication" rule from this platform's engineering constitution.
 *
 * Deliberately does NOT retrofit Order/Invoice's existing numbering to call through this service
 * — that code is live, tested, and already correct; migrating it is a separate, lower-risk-to-defer
 * cleanup, not a prerequisite for anything in this milestone. Every new module built from here
 * forward uses this service directly.
 *
 * Same two-step atomic pattern as the original: (1) if a reset is due, atomically claim the
 * "first number of a new period" slot via a conditional `findOneAndUpdate` that only matches when
 * a reset actually applies — under concurrency at most one caller's filter matches, since the
 * winner immediately changes `lastResetDate`, making every other identical filter stop matching;
 * (2) otherwise, atomically `$inc` the counter and read the PRE-increment value (`{new:false}`) —
 * a single atomic per-document operation, so concurrent callers always get distinct values with no
 * read-then-write race window.
 */
class SequenceGeneratorService {
  /**
   * @param {Object} params
   * @param {import("mongoose").Model} params.Model - the settings model holding the sequence sub-document
   * @param {Object} params.filter - query filter identifying the one settings document (e.g. {brand, branch})
   * @param {string} params.sequenceField - dot-free top-level (or nested, e.g. "purchase.sequence") path to the sequence sub-document
   * @param {Date} [params.now]
   * @returns {Promise<string>} the formatted next number, e.g. "PO-000042"
   */
  async getNext({ Model, filter, sequenceField, now = new Date() }) {
    const doc = await Model.findOne(filter).lean();
    if (!doc) {
      throwError("No sequence configuration found for this document — cannot generate a number.", 422);
    }

    const seq = this._getPath(doc, sequenceField);
    if (!seq) {
      throwError(`Sequence field "${sequenceField}" is not configured on this document.`, 422);
    }

    const prefix = seq.prefix || "";
    const padding = seq.padding || 0;
    const startNumber = seq.startNumber ?? 1;
    const resetPolicy = seq.resetPolicy || "NONE";

    if (resetPolicy !== "NONE") {
      const boundary = this._resetBoundary(resetPolicy, now);
      const resetFilter = {
        ...filter,
        $or: [
          { [`${sequenceField}.lastResetDate`]: null },
          { [`${sequenceField}.lastResetDate`]: { $exists: false } },
          { [`${sequenceField}.lastResetDate`]: { $lt: boundary } },
        ],
      };
      const resetUpdate = {
        $set: {
          [`${sequenceField}.currentNumber`]: startNumber + 1,
          [`${sequenceField}.lastResetDate`]: boundary,
        },
      };
      const resetResult = await Model.findOneAndUpdate(resetFilter, resetUpdate, { new: false });
      if (resetResult) {
        return this._format(prefix, startNumber, padding);
      }
    }

    const incremented = await Model.findOneAndUpdate(
      filter,
      { $inc: { [`${sequenceField}.currentNumber`]: 1 } },
      { new: false }, // return the document as it was BEFORE this increment
    );

    if (!incremented) {
      throwError("No sequence configuration found for this document — cannot generate a number.", 422);
    }

    const preIncrementSeq = this._getPath(incremented, sequenceField);
    const assignedNumber = preIncrementSeq?.currentNumber ?? startNumber;
    return this._format(prefix, assignedNumber, padding);
  }

  _getPath(obj, path) {
    return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  }

  _resetBoundary(resetPolicy, now) {
    switch (resetPolicy) {
      case "DAILY":
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      case "MONTHLY":
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      case "YEARLY":
        return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      default:
        return null;
    }
  }

  _format(prefix, number, padding) {
    const numStr = padding > 0 ? String(number).padStart(padding, "0") : String(number);
    return `${prefix}${numStr}`;
  }
}

export default new SequenceGeneratorService();
