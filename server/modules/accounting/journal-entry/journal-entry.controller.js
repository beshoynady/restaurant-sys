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
}

export default new JournalEntryController();
