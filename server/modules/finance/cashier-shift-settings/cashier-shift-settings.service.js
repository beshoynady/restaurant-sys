// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration only — every database
// operation delegates to a method inherited from (or added on) cashier-shift-settings.repository.js.
import CashierShiftSettingsRepository from "./cashier-shift-settings.repository.js";

class CashierShiftSettingsService extends CashierShiftSettingsRepository {}

export default new CashierShiftSettingsService();
