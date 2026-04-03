import asyncHandler from "../utils/asyncHandler.js";

class BaseController {
  constructor(service) {
    this.service = service;
  }

  // =========================
  // 🔹 CREATE
  // =========================
  create = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const data = await this.service.create({
      brandId,
      data: req.body,
      createdBy: userId,
      uniqueFields: req.uniqueFields || [],
      lang: req.lang,
      fieldsWithLang: req.fieldsWithLang || [],
    });

    res.status(201).json({
      success: true,
      data,
    });
  });

  // =========================
  // 🔹 GET ALL
  // =========================
  getAll = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const result = await this.service.getAll({
      brandId,
      filter: req.filter || {},
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      sort: req.query.sort,
      search: req.query.search,
      populate: req.populate || [],
      includeDeleted: req.query.includeDeleted === "true",
    });

    res.json({
      success: true,
      ...result,
    });
  });

  // =========================
  // 🔹 GET BY ID
  // =========================
  getOne = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    const data = await this.service.findById({
      id: req.params.id,
      brandId,
      populate: req.populate || [],
      includeDeleted: req.query.includeDeleted === "true",
    });

    res.json({
      success: true,
      data,
    });
  });

  // =========================
  // 🔹 UPDATE
  // =========================
  update = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const data = await this.service.update({
      id: req.params.id,
      brandId,
      data: req.body,
      updatedBy: userId,
      uniqueFields: req.uniqueFields || [],
    });

    res.json({
      success: true,
      data,
    });
  });

  // =========================
  // 🔹 SOFT DELETE
  // =========================
  softDelete = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const data = await this.service.softDelete(req.params.id, brandId, userId);

    res.json({
      success: true,
      data,
    });
  });

  // =========================
  // 🔹 RESTORE
  // =========================
  restore = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const data = await this.service.restore(req.params.id, brandId, userId);

    res.json({
      success: true,
      data,
    });
  });

  // =========================
  // 🔹 HARD DELETE
  // =========================
  hardDelete = asyncHandler(async (req, res) => {
    const { brandId } = req.user;

    await this.service.hardDelete(req.params.id, brandId);

    res.json({
      success: true,
      message: "Deleted successfully",
    });
  });

  // =========================
  // 🔹 BULK SOFT DELETE
  // =========================
  bulkSoftDelete = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const { ids } = req.body;

    const count = await this.service.bulkSoftDelete(ids, brandId, userId);

    res.json({
      success: true,
      message: `${count} records soft deleted`,
    });
  });

  // =========================
  // 🔹 BULK HARD DELETE
  // =========================
  bulkHardDelete = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { ids } = req.body;

    const count = await this.service.bulkHardDelete(ids, brandId);

    res.json({
      success: true,
      message: `${count} records deleted`,
    });
  });
}

export default BaseController;
