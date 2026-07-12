// server/middlewares/checkModuleEnabled.js

import brandSettingsService from "../modules/organization/brand-settings/brand-settings.service.js";
import throwError from "../utils/throwError.js";

/**
 * Module-Enabled Middleware (Feature Toggle)
 * ===========================================
 * Usage:
 *   checkModuleEnabled("accounting")
 *
 * Reads BrandSettings.modules.<moduleKey>.enabled for the authenticated
 * request's brand and blocks the request when the brand has explicitly
 * disabled that module.
 *
 * notes:
 * - Must run after authenticateToken (needs req.user.brandId / req.brandId).
 * - Fail-open by design: if the brand has no BrandSettings document yet, or
 *   the module key isn't present in it, the request is allowed. This keeps
 *   every existing brand working exactly as before until they explicitly
 *   configure BrandSettings — the toggle only ever *restricts* once set.
 */
const checkModuleEnabled = (moduleKey) => {
  return async (req, res, next) => {
    try {
      const brandId = req.user?.brandId || req.brandId;

      if (!brandId) {
        return next(throwError("Unauthorized", 401));
      }

      // findByBrand (not getByBrand): getByBrand now throws a 404 when no
      // settings doc exists (brand-settings.service.ts, this session's
      // modernization) — this middleware's fail-open contract (documented
      // above) requires a plain null return instead, which is what the
      // inherited repository-level findByBrand still gives.
      const settings = await brandSettingsService.findByBrand(brandId);

      if (!settings) {
        return next();
      }

      const moduleConfig = settings.modules?.[moduleKey];

      if (moduleConfig && moduleConfig.enabled === false) {
        return next(
          throwError(`Module "${moduleKey}" is disabled for this brand`, 403),
        );
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
};

export default checkModuleEnabled;
