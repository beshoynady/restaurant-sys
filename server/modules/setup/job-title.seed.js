import JobTitleModel from "../../../models/employees/jobTitle.model.js";
import DepartmentModel from "../../../models/employees/department.model.js";

/* =====================================================
   DEFAULT JOB TITLES (Restaurant HR Structure)
===================================================== */

const DEFAULT_JOB_TITLES = [
  // ================= MANAGEMENT =================
  {
    name: { EN: "Restaurant Manager", AR: "مدير مطعم" },
    description: { EN: "Overall restaurant manager", AR: "إدارة المطعم بالكامل" },
    responsibilities: { EN: "Manage operations and staff", AR: "إدارة العمليات والموظفين" },
    requirements: { EN: "Management experience", AR: "خبرة إدارية" },
    departmentKey: "management",
  },
  {
    name: { EN: "Branch Manager", AR: "مدير فرع" },
    description: { EN: "Branch supervisor", AR: "مشرف الفرع" },
    responsibilities: { EN: "Oversee branch performance", AR: "متابعة أداء الفرع" },
    requirements: { EN: "Leadership skills", AR: "مهارات قيادية" },
    departmentKey: "management",
  },

  // ================= SERVICE =================
  {
    name: { EN: "Waiter", AR: "ويتر" },
    description: { EN: "Customer service staff", AR: "خدمة العملاء" },
    responsibilities: { EN: "Take orders and serve customers", AR: "أخذ الطلبات وخدمة العملاء" },
    requirements: { EN: "Good communication", AR: "مهارات تواصل" },
    departmentKey: "service",
  },
  {
    name: { EN: "Cashier", AR: "كاشير" },
    description: { EN: "Handles payments", AR: "إدارة الدفع" },
    responsibilities: { EN: "Process payments and orders", AR: "تنفيذ المدفوعات والطلبات" },
    requirements: { EN: "Basic accounting", AR: "أساسيات محاسبة" },
    departmentKey: "service",
  },

  // ================= PREPARATION (KITCHEN) =================
  {
    name: { EN: "Head Chef", AR: "شيف رئيسي" },
    description: { EN: "Kitchen supervisor", AR: "مشرف المطبخ" },
    responsibilities: { EN: "Manage kitchen operations", AR: "إدارة المطبخ" },
    requirements: { EN: "Cooking experience", AR: "خبرة طبخ" },
    departmentKey: "preparation",
  },
  {
    name: { EN: "Cook", AR: "طباخ" },
    description: { EN: "Food preparation", AR: "تحضير الطعام" },
    responsibilities: { EN: "Prepare dishes", AR: "إعداد الأطعمة" },
    requirements: { EN: "Cooking skills", AR: "مهارات طبخ" },
    departmentKey: "preparation",
  },

  // ================= DELIVERY =================
  {
    name: { EN: "Delivery Driver", AR: "مندوب توصيل" },
    description: { EN: "Delivery staff", AR: "موظف توصيل" },
    responsibilities: { EN: "Deliver orders", AR: "توصيل الطلبات" },
    requirements: { EN: "Driving license", AR: "رخصة قيادة" },
    departmentKey: "delivery",
  },

  // ================= SUPPORT =================
  {
    name: { EN: "Cleaner", AR: "عامل نظافة" },
    description: { EN: "Cleaning staff", AR: "النظافة" },
    responsibilities: { EN: "Maintain cleanliness", AR: "الحفاظ على النظافة" },
    requirements: { EN: "Physical ability", AR: "قدرة بدنية" },
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