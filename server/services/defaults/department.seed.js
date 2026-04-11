import DepartmentModel from "../../../models/employees/department.model.js";

/* =====================================================
   DEFAULT DEPARTMENTS CONFIGURATION
===================================================== */

const DEFAULT_DEPARTMENTS = [
  {
    name: { en: "Kitchen", ar: "المطبخ" },
    slug: "kitchen",
    code: "KITCHEN",
    classification: "preparation",
    isSystemRole: true,
  },
  {
    name: { en: "Service", ar: "الخدمة" },
    slug: "service",
    code: "SERVICE",
    classification: "service",
    isSystemRole: true,
  },
  {
    name: { en: "Management", ar: "الإدارة" },
    slug: "management",
    code: "MGMT",
    classification: "management",
    isSystemRole: true,
  },
  {
    name: { en: "Delivery", ar: "التوصيل" },
    slug: "delivery",
    code: "DELIVERY",
    classification: "delivery",
    isSystemRole: true,
  },
  {
    name: { en: "Support", ar: "الدعم", },
    slug: "support",
    code: "SUPPORT",
    classification: "support",
    isSystemRole: true,
  },
];

/* =====================================================
   SERVICE
===================================================== */

class DepartmentSeedService {
  /**
   * Seed default departments for a brand
   * @param {ObjectId} brandId
   * @param {mongoose.ClientSession} session
   */
  async seed(brandId, session) {
    const createdDepartments = [];

    for (const dept of DEFAULT_DEPARTMENTS) {
      /**
       * Prevent duplicates (by slug + brand)
       */
      const exists = await DepartmentModel.findOne({
        brand: brandId,
        slug: dept.slug,
      }).session(session);

      if (exists) continue;

      /**
       * Create department
       */
      const created = await DepartmentModel.create(
        [
          {
            brand: brandId,
            name: dept.name,
            slug: dept.slug,
            code: dept.code,
            classification: dept.classification,
            isSystemRole: true,
          },
        ],
        { session }
      );

      createdDepartments.push(created[0]);
    }

    return createdDepartments;
  }
}

export default new DepartmentSeedService();