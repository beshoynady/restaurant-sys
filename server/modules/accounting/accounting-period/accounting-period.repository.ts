// New standard (BACKEND_FOUNDATION.md §4.3, decided 2026-07-12): Repository Pattern is now
// mandatory for every module. `AccountingPeriod`'s own service/controller/router are not being
// migrated in this pass (that's tracked in REPOSITORY_PATTERN_MIGRATION_PLAN.md, out of the
// journal-entry/journal-line pilot's scope) — this repository file exists solely so
// `journal-entry.service.ts`'s period-lock check (DB-014) doesn't have to reach into
// `AccountingPeriodModel` directly, which the mandate forbids for services. The model itself stays
// `.js`, untouched; `BaseRepository<any>` widening is the same documented pattern used elsewhere in
// this codebase when a repository/service is TypeScript but its underlying model isn't yet.
import type { ClientSession } from "mongoose";
import BaseRepository from "../../../utils/BaseRepository.js";
import AccountingPeriodModel from "./accounting-period.model.js";

export interface AccountingPeriodLockStatus {
  isLocked: boolean;
}

class AccountingPeriodRepository extends BaseRepository<any> {
  constructor() {
    super(AccountingPeriodModel, {
      brandScoped: true,
    });
  }

  /** Read-only lock-status lookup, used by journal-entry.service.ts's DB-014 enforcement. */
  async findLockStatus(
    periodId: string,
    session?: ClientSession,
  ): Promise<AccountingPeriodLockStatus | null> {
    return this.model.findById(periodId).session(session ?? null).select("isLocked").lean();
  }
}

export default AccountingPeriodRepository;
export const accountingPeriodRepository = new AccountingPeriodRepository();
