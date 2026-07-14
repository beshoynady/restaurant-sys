/**
 * Role Template Catalog — DEFAULT_ROLE_ARCHITECTURE.md §6. Eleven platform-owned templates
 * (Owner is not a template — it's auto-created directly by the onboarding engine, see
 * INITIAL_PROVISIONING_ARCHITECTURE.md's DEFAULT_ROLES_CREATED state).
 *
 * `key` is a stable identifier, never reused for a different meaning once shipped.
 */
export const ROLE_TEMPLATE_SEED = [
  {
    key: "administrator",
    name: { EN: "Administrator", AR: "مدير النظام" },
    description: { EN: "Full operational and configuration authority, excluding identity/access management.", AR: "صلاحيات تشغيلية وإعدادية كاملة، باستثناء إدارة الهوية والصلاحيات." },
    category: "Management",
    defaultScope: "ALL_BRANCHES",
    domainGrants: [
      { domain: "ORG_CORE", level: "FULL" },
      { domain: "MENU_SALES", level: "FULL" },
      { domain: "KITCHEN", level: "FULL" },
      { domain: "INVENTORY", level: "FULL" },
      { domain: "CASH_FINANCE", level: "FULL" },
      { domain: "ACCOUNTING", level: "FULL" },
      { domain: "ASSETS", level: "FULL" },
      { domain: "PURCHASING", level: "FULL" },
      { domain: "HR_STAFF", level: "FULL" },
      { domain: "HR_PAYROLL", level: "FULL" },
      { domain: "SYSTEM_CONFIG", level: "FULL" },
      { domain: "REPORTS", level: "FULL" },
      { domain: "CRM", level: "FULL" },
      { domain: "LOYALTY", level: "FULL" },
      { domain: "SEATING", level: "FULL" },
      // Deliberate separation of duties (DEFAULT_ROLE_ARCHITECTURE.md §6) — can see who has what
      // access, cannot create/edit Roles or grant themselves more power.
      { domain: "IAM", level: "READ" },
      { domain: "AUDIT", level: "READ" },
    ],
  },
  {
    key: "branch_manager",
    name: { EN: "Branch Manager", AR: "مدير الفرع" },
    description: { EN: "Runs day-to-day operations for their assigned branch(es).", AR: "يدير العمليات اليومية للفروع المسندة إليه." },
    category: "Management",
    defaultScope: "ASSIGNED_BRANCHES",
    domainGrants: [
      { domain: "MENU_SALES", level: "FULL" },
      { domain: "KITCHEN", level: "FULL" },
      { domain: "SEATING", level: "FULL" },
      { domain: "INVENTORY", level: "OPERATE" },
      { domain: "CASH_FINANCE", level: "OPERATE" },
      { domain: "HR_STAFF", level: "FULL" },
      { domain: "REPORTS", level: "READ" },
    ],
  },
  {
    key: "cashier",
    name: { EN: "Cashier", AR: "الكاشير" },
    description: { EN: "Front-line sales entry and till operation.", AR: "تسجيل المبيعات وتشغيل الدرج." },
    category: "Front of House",
    defaultScope: "ASSIGNED_BRANCHES",
    domainGrants: [
      { domain: "MENU_SALES", level: "OPERATE" },
      { domain: "CASH_FINANCE", level: "OPERATE" },
      { domain: "SEATING", level: "OPERATE" },
    ],
  },
  {
    key: "kitchen",
    name: { EN: "Kitchen", AR: "المطبخ" },
    description: { EN: "Owns preparation ticket lifecycle and stock consumption recording.", AR: "إدارة تذاكر التحضير وتسجيل استهلاك المخزون." },
    category: "Back of House",
    defaultScope: "ASSIGNED_BRANCHES",
    domainGrants: [
      { domain: "KITCHEN", level: "FULL" },
      { domain: "INVENTORY", level: "OPERATE" },
      { domain: "MENU_SALES", level: "READ" },
    ],
  },
  {
    key: "waiter",
    name: { EN: "Waiter", AR: "النادل" },
    description: { EN: "Owns table/reservation assignment and order taking for their section.", AR: "إدارة الطاولات والحجوزات وأخذ الطلبات." },
    category: "Front of House",
    defaultScope: "ASSIGNED_BRANCHES",
    domainGrants: [
      { domain: "SEATING", level: "FULL" },
      { domain: "MENU_SALES", level: "OPERATE" },
      { domain: "KITCHEN", level: "READ" },
    ],
  },
  {
    key: "delivery",
    name: { EN: "Delivery", AR: "التوصيل" },
    description: { EN: "Narrow, delivery-focused order and cash-on-delivery access.", AR: "صلاحيات محدودة لطلبات التوصيل والتحصيل عند الاستلام." },
    category: "Front of House",
    defaultScope: "ASSIGNED_BRANCHES",
    domainGrants: [
      { domain: "MENU_SALES", level: "OPERATE" },
      { domain: "CRM", level: "READ" },
      { domain: "CASH_FINANCE", level: "OPERATE" },
    ],
  },
  {
    key: "accountant",
    name: { EN: "Accountant", AR: "المحاسب" },
    description: { EN: "Owns the ledger, cash reconciliation, and fixed-asset accounting.", AR: "إدارة دفتر الأستاذ والتسويات المحاسبية والأصول الثابتة." },
    category: "Finance",
    defaultScope: "ALL_BRANCHES",
    domainGrants: [
      { domain: "ACCOUNTING", level: "FULL" },
      { domain: "CASH_FINANCE", level: "FULL" },
      { domain: "ASSETS", level: "FULL" },
      { domain: "REPORTS", level: "FULL" },
      // Separation of duties: sees operational documents to reconcile against, doesn't create them.
      { domain: "MENU_SALES", level: "READ" },
      { domain: "PURCHASING", level: "READ" },
    ],
  },
  {
    key: "hr",
    name: { EN: "HR", AR: "الموارد البشرية" },
    description: { EN: "Owns the employee lifecycle and payroll processing.", AR: "إدارة دورة حياة الموظف ومعالجة الرواتب." },
    category: "Management",
    defaultScope: "ALL_BRANCHES",
    domainGrants: [
      { domain: "HR_STAFF", level: "FULL" },
      { domain: "HR_PAYROLL", level: "FULL" },
      { domain: "REPORTS", level: "FULL" },
    ],
    // IAM access is intentionally NOT a blanket domain grant here — HR can onboard a new hire's
    // login and assign an EXISTING role, but must not be able to create/edit Roles themselves
    // (self-escalation risk). Expressed as a narrower, resource-specific override applied at
    // instantiation time by role-template.service.js, not expressible via a single domain level.
  },
  {
    key: "purchasing",
    name: { EN: "Purchasing", AR: "المشتريات" },
    description: { EN: "Owns supplier relationships and purchase documents.", AR: "إدارة الموردين ومستندات الشراء." },
    category: "Back of House",
    defaultScope: "ALL_BRANCHES",
    domainGrants: [
      { domain: "PURCHASING", level: "FULL" },
      { domain: "INVENTORY", level: "OPERATE" },
      { domain: "REPORTS", level: "READ" },
    ],
  },
  {
    key: "inventory",
    name: { EN: "Inventory", AR: "المخازن" },
    description: { EN: "Owns stock records, counts, transfers, and warehouse documents.", AR: "إدارة سجلات المخزون والجرد والتحويلات ومستندات المخازن." },
    category: "Back of House",
    defaultScope: "ALL_BRANCHES",
    domainGrants: [
      { domain: "INVENTORY", level: "FULL" },
      { domain: "PURCHASING", level: "READ" },
      { domain: "MENU_SALES", level: "READ" },
    ],
  },
  {
    key: "customer_support",
    name: { EN: "Customer Support", AR: "خدمة العملاء" },
    description: { EN: "Owns the customer relationship and loyalty program.", AR: "إدارة علاقات العملاء وبرنامج الولاء." },
    category: "Front of House",
    defaultScope: "ALL_BRANCHES",
    domainGrants: [
      { domain: "CRM", level: "FULL" },
      { domain: "LOYALTY", level: "FULL" },
      { domain: "MENU_SALES", level: "READ" },
    ],
  },
];

// HR template's narrower IAM override, applied at instantiation time (see role.model.js's
// existing `permissions` shape — UserAccounts create/read/update but not delete, Roles read-only).
export const HR_TEMPLATE_IAM_OVERRIDE = [
  { resource: "UserAccounts", create: true, read: true, update: true },
  { resource: "Roles", read: true },
];
