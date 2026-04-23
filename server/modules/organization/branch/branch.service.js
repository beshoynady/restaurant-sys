// services/core/branch.service.js

import AdvancedService from "../../utils/AdvancedService.js";
import BranchModel from "./branch.model.js";
import throwError from "../../utils/throwError.js";
import { generateUniqueSlug } from "../../utils/generateUniqueSlug.js";

/**
 * BranchService
 * -------------------------------------------------------
 * Business logic layer for Branch module
 *
 * Extends AdvancedService to reuse:
 * - CRUD operations
 * - Brand scoping
 * - Soft delete
 * - Pagination & filtering
 *
 * Adds:
 * - Unique slug generation
 * - Main branch constraint
 * - Custom actions
 */
class BranchService extends AdvancedService {
  constructor() {
    super(BranchModel, {
      brandScoped: true,
      softDelete: true,

      // 🔹 Populate relations by default
      defaultPopulate: ["brand", "createdBy", "updatedBy", "deletedBy"],

      // 🔹 Enable search
      searchFields: ["name.EN", "name.AR", "slug"],

      // 🔹 Default sorting
      defaultSort: { createdAt: -1 },
    });
  }

  // =====================================================
  // 🔹 CREATE BRANCH
  // =====================================================
  /**
   * Create a new branch
   *
   * Business Rules:
   * - Generate unique slug automatically
   * - Only one main branch per brand
   */
  async create({ brandId, data, createdBy, lang }) {
    // -----------------------------
    // 🔹 Generate unique slug
    // -----------------------------
    data.slug = await generateUniqueSlug({
      name: data.name,
      model: this.model,
      brandId,
    });

    // -----------------------------
    // 🔹 Ensure single main branch
    // -----------------------------
    if (data.isMainBranch) {
      const exists = await this.model.findOne({
        brand: brandId,
        isMainBranch: true,
        isDeleted: false,
      });

      if (exists) {
        throw throwError(
          "Main branch already exists for this brand",
          400
        );
      }
    }

    // -----------------------------
    // 🔹 Call base create
    // -----------------------------
    return super.create({
      brandId,
      data,
      createdBy,
      uniqueFields: ["slug"],
      fieldsWithLang: ["name"],
      lang,
    });
  }

  // =====================================================
  // 🔹 UPDATE BRANCH
  // =====================================================
  /**
   * Update branch
   *
   * Business Rules:
   * - Regenerate slug if name changes
   * - Prevent multiple main branches
   */
  async update({ id, brandId, data, updatedBy }) {
    // -----------------------------
    // 🔹 Regenerate slug if name updated
    // -----------------------------
    if (data.name) {
      data.slug = await generateUniqueSlug({
        name: data.name,
        model: this.model,
        brandId,
        excludeId: id,
      });
    }

    // -----------------------------
    // 🔹 Prevent multiple main branches
    // -----------------------------
    if (data.isMainBranch) {
      const exists = await this.model.findOne({
        brand: brandId,
        isMainBranch: true,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (exists) {
        throw throwError(
          "Another main branch already exists",
          400
        );
      }
    }

    return super.update({
      id,
      brandId,
      data,
      updatedBy,
      uniqueFields: ["slug"],
    });
  }

  // =====================================================
  // 🔹 SET MAIN BRANCH (CUSTOM ACTION)
  // =====================================================
  /**
   * Set a branch as the main branch
   *
   * - Ensures only one main branch per brand
   * - Uses transaction for consistency
   */
  async setMainBranch({ id, brandId, userId }) {
    return this.transaction(async (session) => {
      // -----------------------------
      // 🔹 Reset all branches
      // -----------------------------
      await this.model.updateMany(
        { brand: brandId },
        { isMainBranch: false },
        { session }
      );

      // -----------------------------
      // 🔹 Set selected branch
      // -----------------------------
      const branch = await this.model.findOneAndUpdate(
        {
          _id: id,
          brand: brandId,
        },
        {
          isMainBranch: true,
          updatedBy: userId,
        },
        {
          new: true,
          session,
        }
      );

      if (!branch) {
        throw throwError("Branch not found", 404);
      }

      return branch;
    });
  }
}

// Export singleton instance
export default new BranchService();