// DATABASE_IMPLEMENTATION_PLAN.md DB-010: adds the `createWithLines` handler exposing
// journalEntryService.createBalancedEntry(). All inherited BaseController methods (create/getAll/
// getOne/update/softDelete/restore/hardDelete/bulk*) are unchanged — the existing
// `POST /journal-entries` header-only create endpoint keeps working exactly as before.
import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import journalEntryService from "./journal-entry.service.js";

class JournalEntryController extends BaseController {
  constructor() {
    super(journalEntryService);
  }

  createWithLines = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;

    const result = await journalEntryService.createBalancedEntry({
      brand: brandId,
      branch: branchId,
      period: req.body.period,
      date: req.body.date ? new Date(req.body.date) : undefined,
      entryNumber: req.body.entryNumber,
      description: req.body.description,
      origin: req.body.origin,
      baseCurrency: req.body.baseCurrency,
      lines: req.body.lines,
      createdBy: userId,
      autoPost: req.body.autoPost,
      postedBy: req.body.autoPost === false ? undefined : userId,
    });

    res.status(201).json({ success: true, data: result });
  });

  // Journal Entry Posting Engine — maker-checker approve/reject, and the reversal correction flow.
  approve = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const updated = await journalEntryService.approveEntry({
      id: req.params.id,
      brand: brandId,
      approvedBy: userId,
    });
    res.json({ success: true, data: updated });
  });

  reject = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const updated = await journalEntryService.rejectEntry({
      id: req.params.id,
      brand: brandId,
      rejectedBy: userId,
      reason: req.body.reason,
    });
    res.json({ success: true, data: updated });
  });

  reverse = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const result = await journalEntryService.reverseEntry({
      id: req.params.id,
      brand: brandId,
      branch: branchId,
      reversedBy: userId,
      reason: req.body.reason,
    });
    res.json({ success: true, data: result });
  });
}

export default new JournalEntryController();
