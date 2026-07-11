// Type declarations for utils/BaseController.js. See BaseService.d.ts for
// why a `.d.ts` sibling is the safe pattern here (no self-import risk).

import { Response, RequestHandler } from "express";
import BaseService from "./BaseService.js";

// Constrained to `BaseService<any>` rather than `BaseService` (which
// defaults its type param to `Document`) — Mongoose's `Model<T>` type is
// invariant enough on statics/`this` typing that `BaseService<IBranch>` is
// not structurally assignable to `BaseService<Document>`, which would make
// every concrete subclass fail this constraint. `any` here only widens the
// constraint check itself; controllers still get the concrete service type
// via `typeof someService`.
export default class BaseController<TService extends BaseService<any> = BaseService<any>> {
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
