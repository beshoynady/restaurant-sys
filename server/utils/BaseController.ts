import { Request, Response } from "express";
import asyncHandler from "./asyncHandler.js";

/**
 * TS version of server/utils/BaseController.js
 * Generic controller layer for all resources.
 *
 * Note: This class expects `service` to implement the methods used below:
 * - create, getAll/getOne, update, hardDelete, softDelete, restore
 * - bulkHardDelete/bulkSoftDelete/bulkRestore
 * - count
 */
class BaseController {
  // Using `any` to stay compatible until all services are migrated to TS.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(protected service: any) {}

  sendResponse(
    res: Response,
    {
      success = true,
      message = null,
      data = null,
      meta = null,
      statusCode = 200,
    }: {
      success?: boolean;
      message?: string | null;
      data?: unknown;
      meta?: unknown;
      statusCode?: number;
    } = {},
  ) {
    return res.status(statusCode).json({
      success,
      message,
      data,
      meta,
    });
  }

  /* ------------------------------- Create ------------------------------- */
  create = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = (req as any).user;

    const data = await this.service.create({
      brandId: (req as any).user?.brandId,
      data: req.body,
      createdBy: userId,
    });

    return this.sendResponse(res, {
      statusCode: 201,
      message: "Created successfully",
      data,
    });
  });

  /* ----------------------------- Get All ------------------------------ */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { brandId } = (req as any).user;

    const {
      page = 1,
      limit = 10,
      search = "",
      includeDeleted = false,
      sort,
      select,
    } = req.query as any;

    const filters: Record<string, any> = { ...req.query };

    delete filters.page;
    delete filters.limit;
    delete filters.search;
    delete filters.includeDeleted;
    delete filters.sort;
    delete filters.select;

    const result = await this.service.getAll({
      brandId,
      page: Number(page),
      limit: Number(limit),
      search: String(search),
      includeDeleted: Boolean(includeDeleted),
      sort,
      select,
      filters,
    });

    return this.sendResponse(res, {
      data: result,
    });
  });

  /* ------------------------------ Get One ------------------------------ */
  getOne = asyncHandler(async (req: Request, res: Response) => {
    const { brandId } = (req as any).user;

    const data = await this.service.getOne({
      id: req.params.id,
      brandId,
    });

    return this.sendResponse(res, {
      data,
    });
  });

  /* ------------------------------ Update ------------------------------ */
  update = asyncHandler(async (req: Request, res: Response) => {
    const { brandId, userId } = (req as any).user;

    const data = await this.service.update({
      id: req.params.id,
      brandId,
      data: req.body,
      updatedBy: userId,
    });

    return this.sendResponse(res, {
      message: "Updated successfully",
      data,
    });
  });

  /* ------------------------------ Hard Delete ------------------------------ */
  hardDelete = asyncHandler(async (req: Request, res: Response) => {
    await this.service.hardDelete({
      id: req.params.id,
    });

    return this.sendResponse(res, {
      message: "Deleted permanently",
    });
  });

  /* ------------------------------ Soft Delete ------------------------------ */
  softDelete = asyncHandler(async (req: Request, res: Response) => {
    const { brandId, userId } = (req as any).user;

    await this.service.softDelete({
      id: req.params.id,
      brandId,
      deletedBy: userId,
    });

    return this.sendResponse(res, {
      message: "Deleted successfully",
    });
  });

  /* ------------------------------ Restore ------------------------------ */
  restore = asyncHandler(async (req: Request, res: Response) => {
    const { brandId } = (req as any).user;

    await this.service.restore({
      id: req.params.id,
      brandId,
    });

    return this.sendResponse(res, {
      message: "Restored successfully",
    });
  });

  /* --------------------------- Bulk Soft Delete --------------------------- */
  bulkSoftDelete = asyncHandler(async (req: Request, res: Response) => {
    const { brandId, userId } = (req as any).user;

    const { ids = [] } = req.body;

    const result = await this.service.bulkSoftDelete({
      ids,
      brandId,
      deletedBy: userId,
    });

    return this.sendResponse(res, {
      message: "Resources deleted",
      data: result,
    });
  });

  /* --------------------------- Bulk Restore --------------------------- */
  bulkRestore = asyncHandler(async (req: Request, res: Response) => {
    const { brandId } = (req as any).user;

    const { ids = [] } = req.body;

    const result = await this.service.bulkRestore({
      ids,
      brandId,
    });

    return this.sendResponse(res, {
      message: "Resources restored",
      data: result,
    });
  });

  /* --------------------------- Bulk Hard Delete --------------------------- */
  bulkHardDelete = asyncHandler(async (req: Request, res: Response) => {
    const { ids = [] } = req.body;

    const result = await this.service.bulkHardDelete(ids);

    return this.sendResponse(res, {
      message: "Resources deleted permanently",
      data: result,
    });
  });

  /* -------------------------------- Count -------------------------------- */
  count = asyncHandler(async (req: Request, res: Response) => {
    const { brandId } = (req as any).user;

    const total = await this.service.count({
      brandId,
    });

    return this.sendResponse(res, {
      data: { total },
    });
  });
}

export default BaseController;
