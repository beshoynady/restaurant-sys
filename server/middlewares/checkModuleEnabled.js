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

      const settings = await brandSettingsService.getByBrand(brandId);

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
