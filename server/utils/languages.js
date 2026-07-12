/* -------------------------------------------------------------------------- */
/*                                 Languages                                  */
/* -------------------------------------------------------------------------- */
/*
 * Single source of truth for the dashboard/multilingual language codes the
 * platform supports. Previously duplicated in two places in
 * modules/organization/brand/brand.model.js (`dashboardLanguages` and
 * `defaultDashboardLanguage`) and hardcoded to only ["AR", "EN"] in
 * utils/joiFactory.js's `multiLang` validator — meaning a brand could set
 * `dashboardLanguages` to e.g. "FR", but any Map-typed multilingual field
 * (Brand.name, Branch.name, DeliveryArea.name, ...) would then reject an
 * "FR" key at the validation layer, since the Mongoose schema imposed no
 * such limit but the auto-generated Joi schema did.
 *
 * Import this wherever a language enum is needed instead of re-typing the
 * list, so the two can never drift apart again.
 */

export const SUPPORTED_LANGUAGES = ["EN", "AR", "FR", "ES", "IT", "ZH", "JA", "RU"];

export default SUPPORTED_LANGUAGES;
