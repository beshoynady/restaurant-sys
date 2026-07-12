// Type declarations for utils/BaseController.js. See BaseService.d.ts for
// why a `.d.ts` sibling is the safe pattern here (no self-import risk).

import { Response, RequestHandler } from "express";
import BaseRepository from "./BaseRepository.js";

// 2026-07-12: widened from `BaseService<any>` to `BaseRepository<any>` — the
// true common ancestor after the Repository Pattern split (BaseService now
// extends BaseRepository; new modules' `<entity>.service.ts` extends their
// own `<entity>.repository.ts`, which extends BaseRepository directly, with
// no BaseService in the chain at all). Every existing controller built
// against a BaseService-based service is unaffected — BaseService<T> still
// satisfies BaseRepository<any>, so this is a pure widening, not a breaking
// change. Constrained to `<any>` rather than the bare class (which defaults
// its type param to `Document`) for the same Mongoose `Model<T>` invariance
// reason as before — `any` only widens the constraint check itself;
// controllers still get the concrete service type via `typeof someService`.
export default class BaseController<TService extends BaseRepository<any> = BaseRepository<any>> {
  service: TService;

  constructor(service: TService);

  sendResponse(
    res: Response,
    opts?: {
      success?: boolean;
      message?: string | null;
      data?: unknown;
      meta?: unknown;
      statusCode?: number;
    },
  ): Response;

  create: RequestHandler;
  getAll: RequestHandler;
  getOne: RequestHandler;
  update: RequestHandler;
  softDelete: RequestHandler;
  restore: RequestHandler;
  hardDelete: RequestHandler;
  bulkSoftDelete: RequestHandler;
  bulkRestore: RequestHandler;
  bulkHardDelete: RequestHandler;
  count: RequestHandler;
}
