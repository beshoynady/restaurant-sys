# Restaurant ERP SaaS — Project Vision & Business Specification

> هذه الوثيقة هي **المرجع المعماري الأساسي** للمشروع. أي عمل تطويري — سواء من مهندس برمجيات أو من Claude Code — يجب أن يتوافق مع المبادئ الموضحة هنا قبل إضافة أي Module جديدة.
>
> لغة التوثيق: العربية. لغة كومنتات الكود: الإنجليزية دائمًا.

---

## 1. Project Vision

المشروع عبارة عن **منصة ERP SaaS متكاملة لإدارة المطاعم وسلاسل المطاعم**.

النظام ليس مجرد POS أو Menu إلكتروني، بل منصة يمكن أن يستخدمها:

- Restaurant
- Cafe
- Bakery
- Fast Food
- Cloud Kitchen
- Meal Prep
- Restaurant Chains

ويستطيع كل Brand الاشتراك داخل المنصة وإدارة فروعه بالكامل.

---

## 2. System Architecture

النظام يتكون من واجهتين رئيسيتين.

### أولاً — Customer Portal

واجهة العميل. يستطيع منها:

- مشاهدة المنيو
- إنشاء حساب
- تسجيل الدخول
- عمل Order
- متابعة الطلب
- الدفع
- مشاهدة الطلبات السابقة
- تقييم المنتجات
- كتابة الشكاوى
- استخدام النقاط
- حجز الطاولات

### ثانياً — Administration Portal

لوحة التحكم، وتدير جميع عمليات المطعم.

---

## 3. النظام SaaS وليس Restaurant واحد

هذه أهم نقطة معمارية في المشروع. النظام لا يعمل على Brand واحد فقط، بل هو SaaS كامل:

```
Platform
  └─ Brand
      └─ Branches
          └─ Departments
              └─ Employees
```

كل Brand مستقل تمامًا. لكل Brand:

- اشتراك (Subscription)
- Modules مختلفة (حسب الخطة)
- عدد فروع
- Owner
- Users
- Settings

**لا يجوز أن يرى Brand بيانات Brand آخر تحت أي ظرف.**

---

## 4. Modular ERP

كل Feature تعتبر Module مستقلة، مثل:

Menu, POS, Inventory, HR, CRM, Accounting, Production, Purchasing, Loyalty, Reports…

كل Module يمكن أن تكون **Enabled** أو **Disabled** حسب اشتراك العميل — أي أن النظام يعمل بأسلوب **Feature Toggle**.

مثال:
- مطعم صغير قد يفعّل: POS + Menu + Orders فقط.
- مطعم كبير يفعّل جميع الوحدات.

---

## 5. Settings Driven Architecture

هذه أهم فكرة تصميمية في المشروع: **كل Module يجب أن يمتلك Settings خاصة به**.

أمثلة:

**POS Settings**: Auto Print, Number of Copies, Cash Drawer, Tax Mode
**Inventory Settings**: Negative Stock, FIFO, Average Cost
**Order Settings**: Auto Accept, Auto Split, Kitchen Flow
**Customer Settings**: Loyalty Enabled, Guest Orders, Review Required

أي Feature داخل النظام لا تعمل مباشرة، بل يجب أن يمر أي Request بالتسلسل التالي:

```
Request
  → Permission Check
    → Module Enabled?
      → Settings Validation
        → Business Logic
          → Database
```

---

## 6. Security Pipeline

أي Request داخل النظام يجب أن يمر بالمراحل التالية بالترتيب، وأي خطوة لا تتحقق توقف التنفيذ فورًا:

```
Authentication
  → Tenant Validation
    → Brand Validation
      → Branch Validation
        → Module Enabled
          → Permission Check
            → Settings Check
              → Business Logic
                → Database
```

---

## 7. أنواع العملاء

### Online Customer
يمتلك Account، ويستطيع: Login, Orders, Points, Reviews, History, Reservations.

### Offline Customer
ليس لديه Account — الكاشير ينشئ له Profile فقط، ويتعامل عبر الهاتف. لكن النظام يحتفظ بـ: الطلبات، النقاط، العنوان، التاريخ.

---

## 8. أنواع إنشاء الطلب

النظام يدعم عدة قنوات لإنشاء الطلب، وكلها تنتهي إلى Order واحد موحّد:

```
QR Order → Customer Order → Waiter Order → Cashier Order → Phone Order
                                    ↓
                              Order (موحّد)
```

---

## 9. دورة حياة الطلب (Order Lifecycle)

```
Customer
  → Create Order
    → Cashier Review
      → Payment Validation (إذا كانت الإعدادات تشترط ذلك)
        → Order Approved
          → Split Order
            → Kitchen Tickets
              → Departments
                → Preparation
                  → Ready
                    → Waiter / Delivery
                      → Completed
                        → Invoice
                          → Accounting
                            → Reports
```

---

## 10. Kitchen Display System (KDS)

كل Product مرتبط بقسم تنفيذ (Preparation Section). مثال:

| Product | Section |
|---|---|
| Burger | Kitchen |
| Coffee | Bar |
| Pizza | Pizza Station |
| Dessert | Dessert Station |

عند اعتماد الطلب:
1. يُقسَّم الـ Order إلى Tickets.
2. كل Ticket يذهب للقسم المختص.
3. كل قسم يحدّث حالة الجزء الخاص به.
4. عند انتهاء جميع التذاكر → ينتقل الطلب إلى **Ready To Serve**.

---

## 11. Inventory

النظام يدعم تعدد مستويات المخازن:

```
Central Warehouse → Branch Warehouse → Department Warehouse
```

كل قسم يمتلك مخزنه الخاص، ويستهلك منه أثناء التنفيذ.

---

## 12. Recipe System

كل Product يمتلك Recipe:

```
Recipe → Ingredients → Quantities → Units → Cost
```

عند انتهاء إعداد الطلب، يتم خصم مكونات الـ Recipe من المخزون تلقائيًا.

---

## 13. Production

ليس كل شيء يباع مباشرة. مثال: إنتاج 100 قطعة برجر:

```
Production → Warehouse → Used Later
```

أي أن الإنتاج يحوّل الخامات إلى منتجات نصف مصنّعة أو جاهزة تُخزَّن لحين الاستخدام.

---

## 14. HR

كل Employee يمتلك: Profile, Attendance, Fingerprint, Shift, Salary, Loans, Bonuses, Penalties, Payroll.

---

## 15. Finance

```
Cash Register → Cashier Shift → Bank Accounts → Transfers → Expenses → Income → Payments
```

---

## 16. Accounting

**اختياري** — يُفعَّل إذا اختاره العميل. عند التفعيل ينشئ النظام تلقائيًا:

```
Chart Of Accounts → Journal → Ledger → Trial Balance → Income Statement → Balance Sheet
```

ويتم ترحيل القيود تلقائيًا من العمليات التشغيلية حسب إعدادات النظام (Accounting Settings).

---

## 17. Permission System

الصلاحيات لا تعتمد فقط على Role، بل هي محصلة تقاطع:

```
User Permission × Role Permission × Branch Scope × Module Enabled × Settings
```

---

## 18. Multi Tenancy

كل Document داخل النظام يجب أن يحتوي على:

- `TenantId`
- `BrandId`
- `BranchId`
- `CreatedBy`
- `UpdatedBy`

**لا يجوز تنفيذ أي Query بدون Scope مناسب** (Brand إلزاميًا، Branch حسب طبيعة الكيان).

---

## 19. Audit System

أي عملية من النوع: Create, Update, Delete, Approve, Cancel, Refund, Transfer — يجب تسجيلها في Audit Log مع:

- User
- Date
- Branch
- Old Values
- New Values
- IP
- Device (إن أمكن)

---

## 20. Design Philosophy

النظام يجب أن يكون:

- Modular
- Extensible
- Event Driven عند الحاجة
- Feature Toggle Based
- Settings Driven
- Multi Tenant
- Enterprise Grade
- Production Ready

---

## 21. مبادئ إضافية مطلوبة (Gaps to close)

هذه المبادئ لازمة لدعم التصميم أعلاه بشكل كامل، ويجب مراعاتها عند بناء أي Module جديدة من الآن:

1. **Workflow Engine** — بدلاً من تثبيت حالات الطلب (Order Status) مباشرة في الكود، يجب أن تكون دورة حياة الطلب قابلة للتخصيص عبر الإعدادات لبعض السيناريوهات (مثل تخطي مرحلة Kitchen للـ Fast Food، أو تخطي Payment Validation المسبق).
2. **Notification Center** — أي حدث مهم (طلب جديد، انتهاء تحضير، موافقة، رفض...) يجب أن يمر عبر مركز إشعارات موحّد، بحيث يسهل توجيهه لاحقًا لأي قناة (In-App, Email, SMS, WhatsApp, Push) دون تعديل منطق الأعمال نفسه.
3. **Background Jobs** — العمليات الثقيلة مثل الترحيل المحاسبي (Posting)، إرسال الإشعارات، وتوليد التقارير الكبيرة يجب أن تُنفَّذ بشكل غير متزامن (Async / Queue) وليس داخل دورة الـ Request مباشرة.
4. **Domain Events** — ربط الوحدات ببعضها عبر أحداث (Events) بدلاً من الاستدعاء المباشر بين Services قدر الإمكان. مثال: عند اكتمال الطلب يصدر حدث `OrderCompleted`، وتستجيب له وحدات المخزون (خصم المكونات)، والمحاسبة (ترحيل القيد)، والولاء (إضافة النقاط) — كلٌ حسب مسؤوليته، دون أن يعرف Order Service أي تفاصيل عنها.

---

## 22. الحالة الحالية للـ Backend مقابل هذه الرؤية (Baseline)

ملخص تقييم أولي (راجع تفاصيله الكاملة في محادثة التحليل المعماري):

- **البنية العامة (Base + Model + Service + Controller + Router + Validation لكل Entity) متوافقة** مع فكرة Modular ERP، ويمكن البناء عليها.
- **غير موجود بعد**: تفعيل RBAC فعليًا على كل الـ Routers، تطبيق `branchScoped` تلقائي، سلسلة Order → Invoice → Accounting → Inventory الفعلية، Workflow Engine، Notification Center، Background Jobs، Domain Events.
- **تم إصلاحه**: استيراد `utils/AdvancedService.js` المعطوب — تم توحيده على `utils/BaseService.js` في كل الملفات.
- **قرارات معمارية معلّقة**: استراتيجية JS↔TS الموحّدة، وحسم الملفات/الأنظمة المكرّرة (setup، audit-log).
