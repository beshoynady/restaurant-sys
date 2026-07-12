import brandSettingsService from "../modules/organization/brand-settings/brand-settings.service.js";
import throwError from "../utils/throwError.js";

/**
 * Public-route variant of checkModuleEnabled.js (Organization Final Audit,
 * H-1). The original middleware reads `req.user.brandId`/`req.brandId`,
 * which simply do not exist on unauthenticated customer-facing routes
 * (delivery-area's public checkout endpoints) — so it could never be
 * dropped onto those routes as-is; confirmed it would always 401 rather
 * than actually check the toggle.
 *
 * This variant takes a `resolveBrandId(req)` function instead of trusting
 * req.user — the caller supplies the same server-side branch->brand
 * resolution the route's own service already performs (e.g.
 * deliveryAreaService.resolveBrandForBranch), so brand is still never taken
 * from client input. Same fail-open contract as the original: no
 * BrandSettings doc, or module key absent, means allowed.
 */
const checkModuleEnabledForBranch = (moduleKey, resolveBrandId) => {
  return async (req, res, next) => {
    try {
      const brandId = await resolveBrandId(req);

      if (!brandId) {
        return next(throwError("Branch not found", 404));
      }

      const settings = await brandSettingsService.findByBrand(brandId);

      if (!settings) {
        return next();
      }

      const moduleConfig = settings.modules?.[moduleKey];

      if (moduleConfig && moduleConfig.enabled === false) {
        return next(throwError(`Module "${moduleKey}" is disabled for this brand`, 403));
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
};

export default checkModuleEnabledForBranch;
