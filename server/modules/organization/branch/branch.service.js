import BaseService from "../../../utils/BaseService.js";
import BranchModel from "./branch.model.js";
import throwError from "../../../utils/throwError.js";
import { generateUniqueSlug } from "../../../utils/generateUniqueSlug.js";

class BranchService extends BaseService {
  constructor() {
    super(BranchModel, {
      brandScoped: true,
      softDelete: true,
      defaultPopulate: ["brand", "createdBy", "updatedBy"],
      searchFields: ["name.EN", "name.AR", "slug"],
      defaultSort: { createdAt: -1 },
    });
  }

  /* =========================
     CREATE
  ========================= */
  async create({ brandId, data, createdBy }) {
    data.slug = await generateUniqueSlug({
      name: data.name,
      model: this.model,
      brandId,
    });

    if (data.isMainBranch) {
      const exists = await this.model.findOne({
        brand: brandId,
        isMainBranch: true,
        isDeleted: false,
      });

      if (exists) throw throwError("Main branch exists", 400);
    }

    return this.model.create({
      ...data,
      brand: brandId,
      createdBy,
    });
  }

  /* =========================
     UPDATE
  ========================= */
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
      { new: true }
    );
  }

  /* =========================
     GET ALL (FULL FILTERING)
  ========================= */
  async getAllBranches({ brandId, query }) {
    const {
      page,
      limit,
      search,
      status,
      isMainBranch,
      city,
      country,
      lat,
      lng,
      maxDistance,
      sortBy,
      sortOrder,
    } = query;

    const filter = {
      brand: brandId,
      isDeleted: false,
    };

    if (status) filter.status = status;
    if (typeof isMainBranch !== "undefined")
      filter.isMainBranch = isMainBranch;

    if (city) filter["address.*.city"] = city;
    if (country) filter["address.*.country"] = country;

    /* 🔥 GEO FILTER */
    if (lat && lng) {
      filter.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: maxDistance || 5000,
        },
      };
    }

    if (search) {
      filter.$or = [
        { slug: { $regex: search, $options: "i" } },
        { "name.EN": { $regex: search, $options: "i" } },
        { "name.AR": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const sort = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .populate("brand createdBy updatedBy")
        .sort(sort)
        .skip(skip)
        .limit(limit),

      this.model.countDocuments(filter),
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

  /* =========================
     SET MAIN BRANCH
  ========================= */
  async setMainBranch({ id, brandId, userId }) {
    return this.transaction(async (session) => {
      await this.model.updateMany(
        { brand: brandId },
        { isMainBranch: false },
        { session }
      );

      const branch = await this.model.findOneAndUpdate(
        { _id: id, brand: brandId },
        { isMainBranch: true, updatedBy: userId },
        { new: true, session }
      );

      if (!branch) throw throwError("Branch not found", 404);

      return branch;
    });
  }
}

export default new BranchService();