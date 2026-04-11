import JobTitleModel from "../../../models/employees/jobTitle.model.js";
import DepartmentModel from "../../../models/employees/department.model.js";

/* =====================================================
   DEFAULT JOB TITLES (Restaurant HR Structure)
===================================================== */

const DEFAULT_JOB_TITLES = [
  // ================= MANAGEMENT =================
  {
    name: { en: "Restaurant Manager", ar: "مدير مطعم" },
    description: { en: "Overall restaurant manager", ar: "إدارة المطعم بالكامل" },
    responsibilities: { en: "Manage operations and staff", ar: "إدارة العمليات والموظفين" },
    requirements: { en: "Management experience", ar: "خبرة إدارية" },
    departmentKey: "management",
  },
  {
    name: { en: "Branch Manager", ar: "مدير فرع" },
    description: { en: "Branch supervisor", ar: "مشرف الفرع" },
    responsibilities: { en: "Oversee branch performance", ar: "متابعة أداء الفرع" },
    requirements: { en: "Leadership skills", ar: "مهارات قيادية" },
    departmentKey: "management",
  },

  // ================= SERVICE =================
  {
    name: { en: "Waiter", ar: "ويتر" },
    description: { en: "Customer service staff", ar: "خدمة العملاء" },
    responsibilities: { en: "Take orders and serve customers", ar: "أخذ الطلبات وخدمة العملاء" },
    requirements: { en: "Good communication", ar: "مهارات تواصل" },
    departmentKey: "service",
  },
  {
    name: { en: "Cashier", ar: "كاشير" },
    description: { en: "Handles payments", ar: "إدارة الدفع" },
    responsibilities: { en: "Process payments and orders", ar: "تنفيذ المدفوعات والطلبات" },
    requirements: { en: "Basic accounting", ar: "أساسيات محاسبة" },
    departmentKey: "service",
  },

  // ================= PREPARATION (KITCHEN) =================
  {
    name: { en: "Head Chef", ar: "شيف رئيسي" },
    description: { en: "Kitchen supervisor", ar: "مشرف المطبخ" },
    responsibilities: { en: "Manage kitchen operations", ar: "إدارة المطبخ" },
    requirements: { en: "Cooking experience", ar: "خبرة طبخ" },
    departmentKey: "preparation",
  },
  {
    name: { en: "Cook", ar: "طباخ" },
    description: { en: "Food preparation", ar: "تحضير الطعام" },
    responsibilities: { en: "Prepare dishes", ar: "إعداد الأطعمة" },
    requirements: { en: "Cooking skills", ar: "مهارات طبخ" },
    departmentKey: "preparation",
  },

  // ================= DELIVERY =================
  {
    name: { en: "Delivery Driver", ar: "مندوب توصيل" },
    description: { en: "Delivery staff", ar: "موظف توصيل" },
    responsibilities: { en: "Deliver orders", ar: "توصيل الطلبات" },
    requirements: { en: "Driving license", ar: "رخصة قيادة" },
    departmentKey: "delivery",
  },

  // ================= SUPPORT =================
  {
    name: { en: "Cleaner", ar: "عامل نظافة" },
    description: { en: "Cleaning staff", ar: "النظافة" },
    responsibilities: { en: "Maintain cleanliness", ar: "الحفاظ على النظافة" },
    requirements: { en: "Physical ability", ar: "قدرة بدنية" },
    departmentKey: "support",
  },
];

/* =====================================================
   SERVICE
===================================================== */

class JobTitleSeedService {
  /**
   * Seed job titles for a brand
   * @param {ObjectId} brandId
   * @param {mongoose.ClientSession} session
   */
  async seed(brandId, session) {
    const created = [];

    for (const job of DEFAULT_JOB_TITLES) {
      /**
       * Find related department by classification
       */
      const department = await DepartmentModel.findOne({
        brand: brandId,
        classification: job.departmentKey,
      }).session(session);

      if (!department) continue;

      /**
       * Prevent duplicates
       */
      const exists = await JobTitleModel.findOne({
        brand: brandId,
        department: department._id,
        "name.en": job.name.en,
      }).session(session);

      if (exists) continue;

      /**
       * Create job title (IMPORTANT: match schema required fields)
       */
      const [createdJob] = await JobTitleModel.create(
        [
          {
            brand: brandId,
            department: department._id,
            name: job.name,
            description: job.description,
            responsibilities: job.responsibilities,
            requirements: job.requirements,
            isSystemRole: true,
          },
        ],
        { session }
      );

      created.push(createdJob);
    }

    return created;
  }
}

export default new JobTitleSeedService();