
import { Request, Response, NextFunction } from "express";

class BaseController<T> {
  service: any;

  constructor(service: any) {
    this.service = service;
  }

  // --- CREATE ---
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { brandId } = req.user as any;

      const data = await this.service.create(
        brandId,
        req.body,
        req.uniqueFields || [],
        req.lang,
        req.fieldsWithLang || []
      );

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  // --- GET ALL ---
  findAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { brandId } = req.user as any;

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
    } catch (error) {
      next(error);
    }
  };

  // --- GET BY ID ---
  findById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.findById(req.params.id, req.populate || []);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  // --- UPDATE ---
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.update(req.params.id, req.body);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  // --- DELETE (soft) ---
  softDelete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user as any;

      const data = await this.service.softDelete(req.params.id, userId);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  // --- RESTORE ---
  restore = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.restore(req.params.id);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  // --- HARD DELETE ---
  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.delete(req.params.id);

      res.json({
        success: true,
        message: "Deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  };
}

export default BaseController;