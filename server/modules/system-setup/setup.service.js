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
    isSystemRole: true, // system-created role
  };
};

class SetupService {
  async initialize(data) {
    const session = await mongoose.startSession();

    try {
      // =============================
      // 🚫 Prevent duplicate setup
      // =============================
      const existingBrand = await Brand.findOne();
      if (existingBrand) {
        throw new Error("System already initialized");
      }

      session.startTransaction();

      // =============================
      // 1. CREATE BRAND
      // =============================
      const brandSlug = await generateSlug(data.brand.name.EN);

      const [brand] = await Brand.create(
        [
          {
            ...data.brand,
            slug: brandSlug,
            setupStatus: "basic",
          },
        ],
        { session }
      );

      // =============================
      // 2. CREATE MAIN BRANCH
      // =============================
      const branchSlug = await generateSlug(data.branch.name.EN);

      const [branch] = await Branch.create(
        [
          {
            brand: brand._id,
            name: data.branch.name,
            slug: branchSlug,
            address: data.branch.address,
            location: data.branch.location,
            postalCode: data.branch.postalCode,
            taxIdentificationNumber: data.branch.taxIdentificationNumber,
            isMainBranch: true,
          },
        ],
        { session }
      );

      // =============================
      // 3. CREATE OWNER ROLE
      // =============================
      const ownerRoleData = buildOwnerRole(brand._id);

      const [ownerRole] = await Role.create(
        [ownerRoleData],
        { session }
      );

      // =============================
      // 4. CREATE OWNER USER
      // =============================
      const hashedPassword = await bcrypt.hash(
        data.owner.password,
        10
      );

      const [user] = await UserAccount.create(
        [
          {
            brand: brand._id,
            branch: branch._id,
            username: data.owner.username,
            email: data.owner.email,
            phone: data.owner.phone,
            password: hashedPassword,
            role: ownerRole._id,
          },
        ],
        { session }
      );

      // =============================
      // ✅ COMMIT TRANSACTION
      // =============================
      await session.commitTransaction();

      return {
        user,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default new SetupService();