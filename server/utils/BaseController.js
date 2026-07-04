/* -------------------------------------------------------------------------- */
/*                               BaseController                               */
/* -------------------------------------------------------------------------- */
/*
 * Generic controller layer for all resources.
 *
 * Features:
 * - CRUD endpoints
 * - Brand scoped operations
 * - Soft delete support
 * - Bulk operations
 * - Pagination
 * - Search
 * - Filtering
 * - Sorting
 * - Consistent API responses
 * - Async error handling
 */

import asyncHandler from "./asyncHandler.js";

class BaseController {
  constructor(service) {
    this.service = service;
  }

  /* -------------------------------------------------------------------------- */
  /*                                Response Helper                             */
  /* -------------------------------------------------------------------------- */

  sendResponse(
    res,
    {
      success = true,
      message = null,
      data = null,
      meta = null,
      statusCode = 200,
    } = {},
  ) {
    return res.status(statusCode).json({
      success,
      message,
      data,
      meta,
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Create                                   */
  /* -------------------------------------------------------------------------- */

  create = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const data = await this.service.create({
      brandId,
      data: req.body,
      createdBy: userId,
    });

    return this.sendResponse(res, {
      statusCode: 201,
      message: "Created successfully",
      data,
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                                   Get All                                  */
  /* -------------------------------------------------------------------------- */

  getAll = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const {
      page = 1,
      limit = 10,
      search = "",
      includeDeleted = false,
      sort,
      select,
    } = req.query;

    const filters = { ...req.query };

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
      search,
      filters,
      sort,
      select,
      includeDeleted: includeDeleted === "true",
    });

    return this.sendResponse(res, {
      data: result.data,
      meta: result.pagination,
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                                  Get One                                   */
  /* -------------------------------------------------------------------------- */

  getOne = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const data = await this.service.findById({
      id: req.params.id,
      brandId,
    });

    return this.sendResponse(res, {
      data,
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                                   Update                                   */
  /* -------------------------------------------------------------------------- */

  update = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

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

  /* -------------------------------------------------------------------------- */
  /*                                Soft Delete                                 */
  /* -------------------------------------------------------------------------- */

  softDelete = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const data = await this.service.softDelete({
      id: req.params.id,
      brandId,
      deletedBy: userId,
    });

    return this.sendResponse(res, {
      message: "Deleted successfully",
      data,
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                                  Restore                                   */
  /* -------------------------------------------------------------------------- */

  restore = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const data = await this.service.restore({
      id: req.params.id,
      brandId,
    });

    return this.sendResponse(res, {
      message: "Restored successfully",
      data,
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                                Hard Delete                                 */
  /* -------------------------------------------------------------------------- */

  hardDelete = asyncHandler(async (req, res) => {
    await this.service.hardDelete({
      id: req.params.id,
    });

    return this.sendResponse(res, {
      message: "Deleted permanently",
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                             Bulk Soft Delete                               */
  /* -------------------------------------------------------------------------- */

  bulkSoftDelete = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

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

  /* -------------------------------------------------------------------------- */
  /*                               Bulk Restore                                 */
  /* -------------------------------------------------------------------------- */

  bulkRestore = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

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

  /* -------------------------------------------------------------------------- */
  /*                             Bulk Hard Delete                               */
  /* -------------------------------------------------------------------------- */

  bulkHardDelete = asyncHandler(async (req, res) => {
    const { ids = [] } = req.body;

    const result = await this.service.bulkHardDelete(ids);

    return this.sendResponse(res, {
      message: "Resources deleted permanently",
      data: result,
    });
  });

  /* -------------------------------------------------------------------------- */
  /*                                   Count                                    */
  /* -------------------------------------------------------------------------- */

  count = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const total = await this.service.count({
      brandId,
    });

    return this.sendResponse(res, {
      data: { total },
    });
  });
}

export default BaseController;
