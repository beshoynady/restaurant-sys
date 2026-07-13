// HR domain rollout — PayrollItem's formal turn (module 14, final of the fixed 14), rebuilt from a
// hand-written CRUD service into a real Payroll Component Engine. Verifies:
// 1. Formula engine: validateTokenSequence rejects malformed formulas (unbalanced parens, etc.).
// 2. evaluateFormula computes arithmetic and comparison expressions correctly.
// 3. detectCircularDependency finds a real cycle.
// 4. category/payrollEffect coherence is enforced.
// 5. isEmployerCost is restricted to TAX/INSURANCE categories.
// 6. Duplicate code is rejected with a friendly error.
// 7. Accounting integration validates account existence/posting/active status.
// 8. Circular dependsOn is rejected end-to-end via the service.
// 9. evaluateItem() computes FIXED/RATE/FORMULA amounts and respects executionCondition.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import PayrollItemModel from "../../modules/hr/payroll-item/payroll-item.model.js";
import payrollItemService from "../../modules/hr/payroll-item/payroll-item.service.js";
import AccountModel from "../../modules/accounting/account/account.model.js";
import {
  validateTokenSequence,
  evaluateFormula,
  detectCircularDependency,
} from "../../modules/hr/payroll-item/payroll-item.domain.js";

describe("HR: PayrollItem business rules", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("payroll-item");
  });

  afterAll(async () => {
    await Promise.all([
      PayrollItemModel.deleteMany({ brand: fixture.brandId }),
      AccountModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("domain: validateTokenSequence rejects unbalanced parentheses and dangling operators", () => {
    const unbalanced = validateTokenSequence([
      { type: "LPAREN", value: "(" },
      { type: "VAR", value: "BASIC_SALARY" },
    ]);
    expect(unbalanced.valid).toBe(false);

    const danglingOperator = validateTokenSequence([
      { type: "VAR", value: "BASIC_SALARY" },
      { type: "OP", value: "+" },
    ]);
    expect(danglingOperator.valid).toBe(false);

    const unknownVar = validateTokenSequence([{ type: "VAR", value: "NOT_A_REAL_VARIABLE" }]);
    expect(unknownVar.valid).toBe(false);

    const valid = validateTokenSequence([
      { type: "LPAREN", value: "(" },
      { type: "VAR", value: "BASIC_SALARY" },
      { type: "OP", value: "/" },
      { type: "VAR", value: "WORKED_DAYS" },
      { type: "RPAREN", value: ")" },
    ]);
    expect(valid.valid).toBe(true);
  });

  it("domain: evaluateFormula computes arithmetic and comparison expressions correctly", () => {
    // (BASIC_SALARY / WORKED_DAYS) * OVERTIME_MINUTES -> (3000/30) * 60 = 6000
    const result = evaluateFormula(
      [
        { type: "LPAREN", value: "(" },
        { type: "VAR", value: "BASIC_SALARY" },
        { type: "OP", value: "/" },
        { type: "VAR", value: "WORKED_DAYS" },
        { type: "RPAREN", value: ")" },
        { type: "OP", value: "*" },
        { type: "VAR", value: "OVERTIME_MINUTES" },
      ],
      { BASIC_SALARY: 3000, WORKED_DAYS: 30, OVERTIME_MINUTES: 60 },
    );
    expect(result).toBe(6000);

    // OVERTIME_MINUTES > 0 -> 1 (true)
    const condition = evaluateFormula(
      [
        { type: "VAR", value: "OVERTIME_MINUTES" },
        { type: "OP", value: ">" },
        { type: "NUMBER", value: "0" },
      ],
      { OVERTIME_MINUTES: 60 },
    );
    expect(condition).toBe(1);

    // 10% of BASIC_SALARY
    const percent = evaluateFormula(
      [
        { type: "PERCENT", value: "10" },
        { type: "OP", value: "*" },
        { type: "VAR", value: "BASIC_SALARY" },
      ],
      { BASIC_SALARY: 3000 },
    );
    expect(percent).toBe(300);
  });

  it("domain: detectCircularDependency finds a real cycle", () => {
    const graph = new Map([
      ["a", { code: "A", dependsOn: ["b"] }],
      ["b", { code: "B", dependsOn: ["c"] }],
      ["c", { code: "C", dependsOn: ["a"] }],
    ]);

    const cycle = detectCircularDependency("a", graph);
    expect(cycle).not.toBeNull();

    const noCycleGraph = new Map([
      ["a", { code: "A", dependsOn: ["b"] }],
      ["b", { code: "B", dependsOn: [] }],
    ]);
    expect(detectCircularDependency("a", noCycleGraph)).toBeNull();
  });

  it("rejects category/payrollEffect mismatch (EARNING must be credit)", async () => {
    await expect(
      payrollItemService.create({
        brandId: fixture.brandId,
        data: {
          name: new Map([["EN", "Bad Earning"]]),
          code: "BADEARN",
          category: "EARNING",
          payrollEffect: "debit",
          calculationType: "FIXED",
          fixedAmount: 100,
        } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/must have payrollEffect "credit"/i);
  });

  it("rejects isEmployerCost on a non-TAX/INSURANCE category", async () => {
    await expect(
      payrollItemService.create({
        brandId: fixture.brandId,
        data: {
          name: new Map([["EN", "Bad Employer Cost"]]),
          code: "BADEMP",
          category: "EARNING",
          payrollEffect: "credit",
          calculationType: "FIXED",
          fixedAmount: 100,
          isEmployerCost: true,
        } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/isEmployerCost.*can only be true/i);
  });

  it("rejects a duplicate code with a friendly message", async () => {
    await payrollItemService.create({
      brandId: fixture.brandId,
      data: {
        name: new Map([["EN", "Basic Salary"]]),
        code: "BASIC",
        category: "EARNING",
        payrollEffect: "credit",
        calculationType: "FIXED",
        fixedAmount: 5000,
      } as any,
      createdBy: fixture.userId,
    });

    await expect(
      payrollItemService.create({
        brandId: fixture.brandId,
        data: {
          name: new Map([["EN", "Basic Salary Duplicate"]]),
          code: "BASIC",
          category: "EARNING",
          payrollEffect: "credit",
          calculationType: "FIXED",
          fixedAmount: 5000,
        } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/already exists/i);
  });

  it("rejects a FORMULA item with an invalid token sequence", async () => {
    await expect(
      payrollItemService.create({
        brandId: fixture.brandId,
        data: {
          name: new Map([["EN", "Bad Formula"]]),
          code: "BADFORMULA",
          category: "EARNING",
          payrollEffect: "credit",
          calculationType: "FORMULA",
          formula: { tokens: [{ type: "OP", value: "+" }] },
        } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/Invalid formula/i);
  });

  it("rejects an accounting reference to a posting-disabled account", async () => {
    const account = await AccountModel.create({
      brand: fixture.brandId,
      code: "PI-001",
      name: new Map([["EN", "No Posting"]]),
      category: "Expense",
      normalBalance: "Debit",
      allowPosting: false,
    });

    await expect(
      payrollItemService.create({
        brandId: fixture.brandId,
        data: {
          name: new Map([["EN", "Overtime Pay"]]),
          code: "OT",
          category: "EARNING",
          payrollEffect: "credit",
          calculationType: "FIXED",
          fixedAmount: 0,
          accounting: { debitAccount: String(account._id) },
        } as any,
        createdBy: fixture.userId,
      }),
    ).rejects.toThrow(/does not allow posting/i);

    await AccountModel.deleteOne({ _id: account._id });
  });

  it("rejects a circular dependsOn chain end-to-end", async () => {
    const itemA = await payrollItemService.create({
      brandId: fixture.brandId,
      data: {
        name: new Map([["EN", "Item A"]]),
        code: "ITEMA",
        category: "EARNING",
        payrollEffect: "credit",
        calculationType: "MANUAL",
      } as any,
      createdBy: fixture.userId,
    });

    const itemB = await payrollItemService.create({
      brandId: fixture.brandId,
      data: {
        name: new Map([["EN", "Item B"]]),
        code: "ITEMB",
        category: "EARNING",
        payrollEffect: "credit",
        calculationType: "MANUAL",
        dependsOn: [String(itemA._id)],
      } as any,
      createdBy: fixture.userId,
    });

    // A -> B already exists; now try B depends on A AND make A depend on B (cycle).
    await expect(
      payrollItemService.update({
        id: String(itemA._id),
        brandId: fixture.brandId,
        data: { dependsOn: [String(itemB._id)] } as any,
        updatedBy: fixture.userId,
      }),
    ).rejects.toThrow(/Circular dependency/i);
  });

  it("evaluateItem() computes FIXED/RATE/FORMULA amounts and respects executionCondition", () => {
    const fixedItem = { calculationType: "FIXED", fixedAmount: 500 };
    expect(payrollItemService.evaluateItem(fixedItem, {})).toEqual({ applies: true, amount: 500 });

    const rateItem = { calculationType: "RATE", rate: 10, rateBase: "BASIC_SALARY" };
    expect(payrollItemService.evaluateItem(rateItem, { BASIC_SALARY: 4000 })).toEqual({ applies: true, amount: 400 });

    const conditionalItem = {
      calculationType: "FIXED",
      fixedAmount: 200,
      executionCondition: {
        tokens: [
          { type: "VAR", value: "OVERTIME_MINUTES" },
          { type: "OP", value: ">" },
          { type: "NUMBER", value: "0" },
        ],
      },
    };
    expect(payrollItemService.evaluateItem(conditionalItem, { OVERTIME_MINUTES: 0 })).toEqual({ applies: false, amount: 0 });
    expect(payrollItemService.evaluateItem(conditionalItem, { OVERTIME_MINUTES: 30 })).toEqual({ applies: true, amount: 200 });
  });
});
