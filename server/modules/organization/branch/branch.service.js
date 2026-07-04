// modules/organization/branch/branch.service.js

import BaseService from "../../../utils/BaseService.js";
import BranchModel from "./branch.model.js";
import throwError from "../../../utils/throwError.js";
import generateUniqueSlug from "../../../utils/generateUniqueSlug.js";

class BranchService extends BaseService {
  constructor() {
    super(BranchModel, {
      brandScoped: true,
      softDelete: true,
      defaultPopulate: ["brand", "createdBy", "updatedBy"],
      searchFields: ["name.EN", "name.AR", "slug"],
    });
  }

  // =========================
  // CREATE
  // =========================
  async create({ brandId, data, createdBy }) {
    const slug = await generateUniqueSlug({
      name: data.name,
      model: this.model,
      brandId,
    });

    const isMainExists = await this.model.findOne({
      brand: brandId,
      isMainBranch: true,
      isDeleted: false,
    });

    if (data.isMainBranch && isMainExists) {
      throw throwError("Main branch already exists", 400);
    }

    return this.model.create({
      ...data,
      slug,
      brand: brandId,
      createdBy,
    });
  }

  // =========================
  // UPDATE
  // =========================
  async update({ id, brandId, data, updatedBy }) {
    if (data.name) {
      data.slug = await generateUniqueSlug({
        name: data.name,
        model: this.model,
        brandId,
        excludeId: id,
      });
    }

    if (data.isMainBranch) {
      const exists = await this.model.findOne({
        brand: brandId,
        isMainBranch: true,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (exists) throw throwError("Another main branch exists", 400);
    }

    return this.model.findOneAndUpdate(
      { _id: id, brand: brandId },
      { $set: { ...data, updatedBy } },
      { new: true },
    );
  }

  // =========================
  // GET ALL (FIXED GEO + FILTER)
  // =========================
  async getAllBranches({ brandId, query }) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      isMainBranch,
      city,
      country,
      lat,
      lng,
      maxDistance = 5000,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const filter = {
      brand: brandId,
      isDeleted: false,
    };

    if (status) filter.status = status;
    if (typeof isMainBranch !== "undefined") filter.isMainBranch = isMainBranch;

    // FIXED multilingual search
    if (city) filter["address.city"] = { $exists: true };
    if (country) filter["address.country"] = { $exists: true };

    if (search) {
      filter.$or = [
        { slug: { $regex: search, $options: "i" } },
        { "name.EN": { $regex: search, $options: "i" } },
        { "name.AR": { $regex: search, $options: "i" } },
      ];
    }

    let geoFilter = {};

    if (lat && lng) {
      geoFilter.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: maxDistance,
        },
      };
    }

    const skip = (page - 1) * limit;

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const finalFilter = { ...filter, ...geoFilter };

    const [data, total] = await Promise.all([
      this.model
        .find(finalFilter)
        .populate("brand createdBy updatedBy")
        .sort(sort)
        .skip(skip)
        .limit(limit),

      this.model.countDocuments(finalFilter),
    ]);

    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // =========================
  // MAIN BRANCH
  // =========================
  async setMainBranch({ id, brandId, userId }) {
    return this.transaction(async () => {
      await this.model.updateMany({ brand: brandId }, { isMainBranch: false });

      const branch = await this.model.findOneAndUpdate(
        { _id: id, brand: brandId },
        { isMainBranch: true, updatedBy: userId },
        { new: true },
      );

      if (!branch) throw throwError("Branch not found", 404);

      return branch;
    });
  }

  // =========================
  // BULK SOFT DELETE
  // =========================
  async bulkSoftDelete({ ids, brandId, userId }) {
    return this.model.updateMany(
      { _id: { $in: ids }, brand: brandId },
      { isDeleted: true, deletedBy: userId, deletedAt: new Date() },
    );
  }

  // =========================
  // OVERRIDE BASE METHODS (IF NEEDED)
  // =========================
    async hardDelete({ id, brandId, userId }) { 
    const branch = await this.model.findOneAndDelete({ _id: id, brand: brandId });
    if (!branch) throw throwError("Branch not found", 404);
    return branch;
    };

  async softDelete({ id, brandId, userId }) {
    const branch = await this.model.findOneAndUpdate(
      { _id: id, brand: brandId },
      { isDeleted: true, deletedBy: userId, deletedAt: new Date() },
      { new: true },
    );
    if (!branch) throw throwError("Branch not found", 404);
    return branch;
  }

  async restore({ id, brandId, userId }) {
    const branch = await this.model.findOneAndUpdate(
      { _id: id, brand: brandId },
      { isDeleted: false, deletedBy: null, deletedAt: null },
      { new: true },
    );
    if (!branch) throw throwError("Branch not found", 404);
    return branch;
  }
  
    
}

export default new BranchService();
