// Domain layer (BACKEND_FOUNDATION.md §4.1): the Formula Engine itself —
// pure functions, no DB access. Previously the token schema existed
// (`formula.tokens`/`executionCondition.tokens`) but was NEVER EVALUATED
// ANYWHERE in this codebase — `payroll-item.service.js` was pure CRUD with
// zero calculation logic. This file is that missing evaluator, not a
// cosmetic redesign of the (already reasonably-shaped) token schema.

// Every VAR token's value must be one of these — resolved from a real
// context object at evaluation time (§ evaluateFormula). Grouped by the
// module each ultimately comes from, so a formula author (and a future
// Payroll calculation engine assembling the context) knows exactly where
// each number must be sourced.
export const VARIABLE_REGISTRY = {
  // EmployeeFinancialProfile (module 9)
  BASIC_SALARY: "compensation.basicSalary",
  DAILY_RATE: "derived: basicSalary / daysInMonth",
  HOURLY_RATE: "derived: dailyRate / scheduledHoursPerDay",
  // Payroll period accumulation (computed by the calling calculation engine)
  GROSS_EARNINGS: "sum of this period's earning items so far",
  NET_SALARY: "gross earnings minus deductions so far",
  // AttendanceRecord (module 7) aggregates for the period
  WORKED_DAYS: "AttendanceRecord: count of PRESENT/PARTIAL/WORK_ON_HOLIDAY days",
  ABSENT_DAYS: "AttendanceRecord: count of ABSENT days",
  WORKED_MINUTES: "AttendanceRecord: sum of totalWorkedMinutes",
  OVERTIME_MINUTES: "AttendanceRecord: sum of overtimeMinutes",
  LATE_MINUTES: "AttendanceRecord: sum of lateMinutes",
  EARLY_MINUTES: "AttendanceRecord: sum of earlyMinutes",
  // LeaveRequest (module 12) aggregates for the period
  UNPAID_LEAVE_DAYS: "LeaveRequest: sum of totalDays where leaveType unpaid, approved this period",
  PAID_LEAVE_DAYS: "LeaveRequest: sum of totalDays where isPaid, approved this period",
  // EmployeeAdvance (module 11)
  ADVANCE_INSTALLMENT_DUE: "EmployeeAdvance#getPayrollDeductionPreview: next installment amount",
  ADVANCE_REMAINING_BALANCE: "EmployeeAdvance: remainingBalance",
  // PayrollSettings (module 13)
  TAX_RATE: "PayrollSettings.taxDefaults.defaultIncomeTaxRatePercentage (or EmployeeFinancialProfile override)",
  INSURANCE_RATE: "PayrollSettings.taxDefaults.defaultSocialInsuranceRatePercentage (or override)",
  EMPLOYER_CONTRIBUTION_RATE: "PayrollSettings.taxDefaults.employerContributionRatePercentage",
  // EmployeeFinancialTransaction (module 10) aggregates for the period
  TIPS_TOTAL: "EmployeeFinancialTransaction: sum of type=tip this period",
  SERVICE_CHARGE_TOTAL: "EmployeeFinancialTransaction: sum of type=service_charge this period",
  SALES_TOTAL: "external POS integration — not built anywhere in this project yet",
};

const COMPARISON_OPS = new Set([">", "<", ">=", "<=", "==", "!="]);
const ARITHMETIC_OPS = new Set(["+", "-", "*", "/"]);
const ALL_OPS = new Set([...COMPARISON_OPS, ...ARITHMETIC_OPS]);

const PRECEDENCE = { "+": 1, "-": 1, "*": 2, "/": 2, ">": 0, "<": 0, ">=": 0, "<=": 0, "==": 0, "!=": 0 };

function isOperandToken(token) {
  return token.type === "VAR" || token.type === "NUMBER" || token.type === "PERCENT";
}

/**
 * Structural validation ("reject impossible formulas") — independent of any
 * runtime context: balanced parentheses, no two operands or two operators
 * adjacent, every VAR references a known variable (or a `ITEM:<code>`
 * dependency reference — validated separately against the brand's actual
 * PayrollItem codes by the service, not here), every NUMBER/PERCENT is
 * numeric.
 */
export function validateTokenSequence(tokens, { knownItemCodes = [] } = {}) {
  const errors = [];

  if (!tokens || tokens.length === 0) {
    return { valid: true, errors }; // an empty formula is valid — means "not used"
  }

  let depth = 0;
  let expectOperand = true; // formulas start expecting an operand or '('

  tokens.forEach((token, index) => {
    if (token.type === "LPAREN") {
      if (!expectOperand) errors.push(`Unexpected "(" at position ${index}`);
      depth += 1;
      return;
    }
    if (token.type === "RPAREN") {
      if (expectOperand) errors.push(`Unexpected ")" at position ${index}`);
      depth -= 1;
      if (depth < 0) errors.push(`Unbalanced ")" at position ${index}`);
      return;
    }
    if (token.type === "OP") {
      if (!ALL_OPS.has(token.value)) errors.push(`Unknown operator "${token.value}" at position ${index}`);
      if (expectOperand) errors.push(`Unexpected operator "${token.value}" at position ${index}`);
      expectOperand = true;
      return;
    }
    if (isOperandToken(token)) {
      if (!expectOperand) errors.push(`Unexpected value at position ${index} — an operator was expected`);
      if (token.type === "VAR") {
        const isDependency = token.value.startsWith("ITEM:");
        const isKnownVariable = Object.prototype.hasOwnProperty.call(VARIABLE_REGISTRY, token.value);
        const referencesKnownItem = isDependency && knownItemCodes.includes(token.value.slice(5));
        if (!isKnownVariable && !(isDependency && referencesKnownItem)) {
          errors.push(`Unknown variable "${token.value}" at position ${index}`);
        }
      } else if (Number.isNaN(Number(token.value))) {
        errors.push(`"${token.value}" at position ${index} is not a valid number`);
      }
      expectOperand = false;
      return;
    }
    errors.push(`Unrecognized token type "${token.type}" at position ${index}`);
  });

  if (depth !== 0) errors.push("Unbalanced parentheses");
  if (expectOperand && tokens.length > 0) errors.push("Formula cannot end with an operator");

  return { valid: errors.length === 0, errors };
}

/** Infix token list -> Reverse Polish Notation, via the shunting-yard algorithm. */
function toRPN(tokens) {
  const output = [];
  const opStack = [];

  tokens.forEach((token) => {
    if (isOperandToken(token)) {
      output.push(token);
    } else if (token.type === "OP") {
      while (
        opStack.length &&
        opStack[opStack.length - 1].type === "OP" &&
        PRECEDENCE[opStack[opStack.length - 1].value] >= PRECEDENCE[token.value]
      ) {
        output.push(opStack.pop());
      }
      opStack.push(token);
    } else if (token.type === "LPAREN") {
      opStack.push(token);
    } else if (token.type === "RPAREN") {
      while (opStack.length && opStack[opStack.length - 1].type !== "LPAREN") {
        output.push(opStack.pop());
      }
      opStack.pop(); // discard the LPAREN
    }
  });

  while (opStack.length) output.push(opStack.pop());

  return output;
}

function resolveOperand(token, context) {
  if (token.type === "NUMBER") return Number(token.value);
  if (token.type === "PERCENT") return Number(token.value) / 100;

  // VAR
  if (token.value.startsWith("ITEM:")) {
    const code = token.value.slice(5);
    const value = context.dependencyResults?.[code];
    if (value === undefined) throw new Error(`Formula references item "${code}", which has no computed value in this context`);
    return value;
  }

  const value = context[token.value];
  if (value === undefined) throw new Error(`Formula variable "${token.value}" was not provided in the evaluation context`);
  return Number(value);
}

function applyOperator(op, a, b) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/":
      if (b === 0) throw new Error("Division by zero in formula");
      return a / b;
    case ">": return a > b ? 1 : 0;
    case "<": return a < b ? 1 : 0;
    case ">=": return a >= b ? 1 : 0;
    case "<=": return a <= b ? 1 : 0;
    case "==": return a === b ? 1 : 0;
    case "!=": return a !== b ? 1 : 0;
    default: throw new Error(`Unknown operator "${op}"`);
  }
}

/**
 * Evaluates a validated token list against a resolved variable `context`
 * (a flat object of VARIABLE_REGISTRY keys -> numbers, plus an optional
 * `dependencyResults` map for `ITEM:<code>` references). Returns a plain
 * number — for `executionCondition`, the caller treats any nonzero result
 * as "true" (comparison operators already return 1/0).
 */
export function evaluateFormula(tokens, context = {}) {
  if (!tokens || tokens.length === 0) return null;

  const rpn = toRPN(tokens);
  const stack = [];

  rpn.forEach((token) => {
    if (isOperandToken(token)) {
      stack.push(resolveOperand(token, context));
    } else if (token.type === "OP") {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error("Malformed formula — not enough operands");
      stack.push(applyOperator(token.value, a, b));
    }
  });

  if (stack.length !== 1) throw new Error("Malformed formula — evaluation did not reduce to a single value");
  return stack[0];
}

/**
 * "Reject circular dependencies" — DFS cycle detection across a brand's
 * PayrollItem.dependsOn graph. `itemsById` is a Map<itemId, {dependsOn:[id,...]}>.
 * Returns the cycle (array of item ids) if one exists, else null.
 */
export function detectCircularDependency(startId, itemsById) {
  const visiting = new Set();
  const visited = new Set();
  const path = [];

  function visit(id) {
    if (visited.has(id)) return null;
    if (visiting.has(id)) return [...path, id];

    visiting.add(id);
    path.push(id);

    const item = itemsById.get(String(id));
    for (const depId of item?.dependsOn || []) {
      const cycle = visit(String(depId));
      if (cycle) return cycle;
    }

    visiting.delete(id);
    visited.add(id);
    path.pop();
    return null;
  }

  return visit(String(startId));
}

export default { VARIABLE_REGISTRY, validateTokenSequence, evaluateFormula, detectCircularDependency };
