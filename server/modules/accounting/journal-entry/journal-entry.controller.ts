// DATABASE_IMPLEMENTATION_PLAN.md DB-010: adds the `createWithLines` handler exposing
// journalEntryService.createBalancedEntry(). All inherited BaseController methods (create/getAll/
// getOne/update/softDelete/restore/hardDelete/bulk*) are unchanged — the existing
// `POST /journal-entries` header-only create endpoint keeps working exactly as before.
import { Request, Response } from "express";
import BaseController from "../../../utils/BaseController.js";
import asyncHandlerJs from "../../../utils/asyncHandler.js";
import journalEntryService from "./journal-entry.service.js";

const asyncHandler = asyncHandlerJs as (
  fn: (req: Request, res: Response) => Promise<void>,
) => (req: Request, res: Response, next: (err?: unknown) => void) => void;

class JournalEntryController extends BaseController<typeof journalEntryService> {
  constructor() {
    super(journalEntryService);
  }

  createWithLines = asyncHandler(async (req: Request, res: Response) => {
    const { brandId, branchId, userId } = (req as unknown as { user: Record<string, string> }).user;

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
