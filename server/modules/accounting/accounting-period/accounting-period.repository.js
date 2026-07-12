// Repository Pattern (BACKEND_FOUNDATION.md §4.3): `AccountingPeriod`'s own service/controller/
// router are not migrated in this pass — this repository file exists solely so
// journal-entry.service.js's period-lock check (DB-014) doesn't have to reach into
// AccountingPeriodModel directly, which the mandate forbids for services.
import BaseRepository from "../../../utils/BaseRepository.js";
import AccountingPeriodModel from "./accounting-period.model.js";

class AccountingPeriodRepository extends BaseRepository {
  constructor() {
    super(AccountingPeriodModel, {
      brandScoped: true,
    });
  }

  /** Read-only lock-status lookup, used by journal-entry.service.js's DB-014 enforcement. */
  async findLockStatus(periodId, session) {
    return this.model.findById(periodId).session(session ?? null).select("isLocked").lean();
  }
}

export default AccountingPeriodRepository;
export const accountingPeriodRepository = new AccountingPeriodRepository();
