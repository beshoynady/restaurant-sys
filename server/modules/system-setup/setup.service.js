import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import Brand from "../../modules/organization/brand/brand.model.js";
import Branch from "../../modules/organization/branch/branch.model.js";
import Role, { RESOURCE_ENUM } from "../../modules/iam/role/role.model.js";
import UserAccount from "../../modules/iam/user-account/user-account.model.js";

import generateUniqueSlug from "../../utils/generateUniqueSlug.js";

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
  async initialize(data) {
    const session = await mongoose.startSession();

    try {
      // =============================
      // 🚫 Prevent duplicate setup
      // =============================
      const existingBrand = await Brand.findOne().lean();
      if (existingBrand) {
        throw new Error("System already initialized");
      }

      session.startTransaction();

      // =============================
      // 1. PREPARE DATA (🔥 CLEAN)
      // =============================
      const brandData = {
        ...data.brand,
        slug: await generateUniqueSlug(data.brand.name.EN),
        setupStatus: "basic",
      };

      const branchData = {
        ...data.branch,
        brand: null, // will be set after brand creation
        slug: await generateUniqueSlug(data.branch.name.EN),
        isMainBranch: true,
      };

      // =============================
      // 2. CREATE BRAND
      // =============================
      const [brand] = await Brand.create([brandData], { session });

      // attach brand to branch
      branchData.brand = brand._id;

      // =============================
      // 3. CREATE BRANCH
      // =============================
      const [branch] = await Branch.create([branchData], { session });

      // =============================
      // 4. CREATE OWNER ROLE
      // =============================
      const ownerRoleData = buildOwnerRole(brand._id);

      const [ownerRole] = await Role.create([ownerRoleData], {
        session,
      });

      // =============================
      // 5. CREATE OWNER USER
      // =============================
      const hashedPassword = await bcrypt.hash(
        data.owner.password,
        10
      );

      const userData = {
        ...data.owner,
        brand: brand._id,
        branch: branch._id,
        password: hashedPassword,
        role: ownerRole._id,
      };

      const [user] = await UserAccount.create([userData], {
        session,
      });

      // =============================
      // ✅ FINALIZE SETUP
      // =============================
      brand.setupStatus = "complete";
      await brand.save({ session });

      // =============================
      // ✅ COMMIT
      // =============================
      await session.commitTransaction();

      return {
        brand,
        branch,
        user,
      };
    } catch (error) {
      console.error("SETUP ERROR:", error);
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default new SetupService();