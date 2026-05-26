import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import Brand from "../../modules/organization/brand/brand.model.js";
import Branch from "../../modules/organization/branch/branch.model.js";
import Role, { RESOURCE_ENUM } from "../../modules/iam/role/role.model.js";
import UserAccount from "../../modules/iam/user-account/user-account.model.js";

import generateUniqueSlug from "../../utils/generateUniqueSlug.js";

// 🔐 JWT utilities (Access + Refresh Tokens)
import {
  signAccessToken,
  signRefreshToken,
} from "../../utils/jwt.utils.js";

/**
 * 🔥 Build Owner Role with Full Permissions
 */
const buildOwnerRole = (brandId) => {
  const permissions = RESOURCE_ENUM.map((resource) => ({
    resource,
    create: true,
    read: true,
    update: true,
    delete: true,
    viewReports: true,
    approve: true,
    reject: true,
  }));

  return {
    brand: brandId,
    name: { EN: "Owner", AR: "مالك" },
    description: {
      EN: "Full system access",
      AR: "صلاحيات كاملة على النظام",
    },
    allBranchesAccess: true,
    permissions,
    isSystemRole: true,
  };
};

class SetupService {
  /**
   * ==========================================
   * 🚀 INITIAL SYSTEM SETUP (FIRST INSTALL ONLY)
   * ==========================================
   */
  async initialize(data) {
    console.log("SETUP DATA:", JSON.stringify(data || {}, null, 2));

    try {
      // =============================
      // 🚫 Prevent duplicate setup
      // =============================
      const existingBrand = await Brand.findOne().lean();

      if (existingBrand) {
        throw new Error("System already initialized");
      }

      // =============================
      // 1. BRAND PREPARATION
      // =============================
      const brandData = {
        ...data.brand,
        slug: await generateUniqueSlug({
          name: data.brand.name,
          model: Brand,
        }),
        setupStatus: "basic",
      };

      // =============================
      // 2. BRANCH PREPARATION
      // =============================
      const branchData = {
        ...data.branch,
        brand: null,
        slug: await generateUniqueSlug({
          name: data.branch.name,
          model: Branch,
        }),
        isMainBranch: true,
      };

      // =============================
      // 3. CREATE BRAND
      // =============================
      const brand = await Brand.create(brandData);

      // Attach brand to branch
      branchData.brand = brand._id;

      // =============================
      // 4. CREATE BRANCH
      // =============================
      const branch = await Branch.create(branchData);

      // =============================
      // 5. CREATE OWNER ROLE
      // =============================
      const ownerRoleData = buildOwnerRole(brand._id);
      const ownerRole = await Role.create(ownerRoleData);

      // =============================
      // 6. CREATE OWNER USER
      // =============================
      const hashedPassword = await bcrypt.hash(data.owner.password, 10);

      const userData = {
        ...data.owner,
        brand: brand._id,
        branch: branch._id,
        password: hashedPassword,
        role: ownerRole._id,
      };

      const user = await UserAccount.create(userData);

      // =============================
      // 🔐 GENERATE INITIAL TOKENS
      // =============================
      const accessToken = signAccessToken(user);
      const refreshToken = signRefreshToken(user);

      // =============================
      // ✅ FINALIZE SETUP
      // =============================
      brand.setupStatus = "complete";
      await brand.save();

      // =============================
      // 🚀 RESPONSE
      // =============================
      return {
        brand,
        branch,
        user,
        tokens: {
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      console.error("SETUP ERROR:", error);
      throw error;
    }
  }
}

export default new SetupService();