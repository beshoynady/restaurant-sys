import asyncHandler from "../utils/asyncHandler";

class BaseController {
  service;

  constructor(service) {
    this.service = service;
  }

  // --- CREATE ---
  create = asyncHandler(async (req, res, next) => {
    const { brandId } = req.user;

    const data = await this.service.create(
      brandId,
      req.body,
      req.uniqueFields || [],
      req.lang,
      req.fieldsWithLang || [],
    );

    res.status(201).json({
      success: true,
      data,
    });
  });

  // --- GET ALL ---
  findAll = asyncHandler(async (req, res, next) => {
    const { brandId } = req.user;

    const result = await this.service.findAll(brandId, {
      filter: req.query.filter || {},
      page: Number(req.query.page),
      limit: Number(req.query.limit),
      sort: req.query.sort || { createdAt: -1 },
      populate: req.populate || [],
    });

    res.json({
      success: true,
      ...result,
    });
  });

  // --- GET BY ID ---
  findById = asyncHandler(async (req, res, next) => {
    const data = await this.service.findById(req.params.id, req.populate || []);

    res.json({
      success: true,
      data,
    });
  });

  // --- UPDATE ---
  update = asyncHandler(async (req, res, next) => {
    const data = await this.service.update(req.params.id, req.body);

    res.json({
      success: true,
      data,
    });
  });

  // --- DELETE (soft) ---
  softDelete = asyncHandler(async (req, res, next) => {
    const { userId } = req.user;

    const data = await this.service.softDelete(req.params.id, userId);

    res.json({
      success: true,
      data,
    });
  });

  // --- RESTORE ---
  restore = asyncHandler(async (req, res, next) => {
    const data = await this.service.restore(req.params.id);

    res.json({
      success: true,
      data,
    });
  });

  // --- HARD DELETE ---
  delete = asyncHandler(async (req, res, next) => {
    await this.service.delete(req.params.id);

    res.json({
      success: true,
      message: "Deleted successfully",
    });
  });
}

export default BaseController;
