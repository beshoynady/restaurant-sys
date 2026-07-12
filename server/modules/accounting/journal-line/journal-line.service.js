// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only. This file contains zero
// direct Mongoose calls — all database access lives in journal-line.repository.js. JournalLine has
// no business rules of its own beyond what the schema/repository already enforce (it is an
// append-only ledger line created exclusively via journal-entry.service.js's transactional path —
// see JournalEntryService.createBalancedEntry) — so this class currently adds nothing on top of
// the repository's CRUD surface. It exists as its own file/class (rather than exporting the
// repository instance directly) so the repository/service separation holds structurally even for
// a module this simple, and so future business methods have an obvious home.
import JournalLineRepository from "./journal-line.repository.js";

class JournalLineService extends JournalLineRepository {}

export default new JournalLineService();
