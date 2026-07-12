/* -------------------------------------------------------------------------- */
/*                                BaseService                                 */
/* -------------------------------------------------------------------------- */
/*
 * 2026-07-12: this file's entire implementation moved to utils/BaseRepository.ts
 * as part of adopting the Repository Pattern (BACKEND_FOUNDATION.md §4.3,
 * REPOSITORY_PATTERN_MIGRATION_PLAN.md). `BaseService` is now a thin,
 * behavior-preserving subclass of `BaseRepository` — it exists purely so the
 * ~85 modules not yet migrated to a dedicated `<entity>.repository.ts` keep
 * working completely unchanged via `new BaseService(Model, {...})`.
 *
 * Do not add new methods here. New/migrated modules should extend
 * `BaseRepository` directly in their own `repository.ts` file instead — see
 * modules/accounting/journal-entry/ and modules/accounting/journal-line/ for
 * the reference implementation.
 */

import BaseRepository from "./BaseRepository.js";

class BaseService extends BaseRepository {}

export default BaseService;
