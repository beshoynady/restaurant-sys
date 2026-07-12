import throwError from "../utils/throwError.js";

/**
 * Brand ownership enforcement (Organization Final Audit, C-1/C-2).
 * ===================================================================
 * Every other Organization module (Branch, BranchSettings, BrandSettings,
 * DeliveryArea) is `brandScoped: true`, so BaseRepository automatically
 * injects `{brand: req.user.brandId}` into every query — a tenant's role
 * can hold full CRUD permission on "Branches" and still never see another
 * brand's data, because the repository layer filters it out regardless of
 * what the permission check allowed.
 *
 * Brand itself cannot use that mechanism (it IS the tenant root — there is
 * no higher brand id to scope by), so `authorize("Brands", action)` alone
 * was the only gate: a resource+action check with no concept of *which*
 * brand. Since every tenant's default "Owner" role is granted full "Brands"
 * CRUD by setup.service.js#buildOwnerRole() (so it can manage its own
 * profile), that check passed identically whether the target was the
 * caller's own brand or a different paying customer's — confirmed
 * exploitable end-to-end in the audit.
 *
 * This middleware is the missing ownership-equivalent of brandScoped:true's
 * automatic filter, specifically for Brand. Must run after authenticateToken
 * + authorize("Brands", action).
 *
 * options.requirePlatformAdmin: true for routes with no legitimate
 * "manage my own brand" meaning at all — creating a brand, listing every
 * brand, searching across all brands, bulk operations on multiple brand
 * ids. A normal tenant Owner never has a real reason to call these; only a
 * role explicitly marked `isPlatformAdmin` may.
 */
const authorizeBrandAccess = ({ requirePlatformAdmin = false } = {}) => {
  return (req, res, next) => {
    const isPlatformAdmin = req.user?.role?.isPlatformAdmin === true;

    if (isPlatformAdmin) {
      return next();
    }

    if (requirePlatformAdmin) {
      return next(throwError("Forbidden — platform administrator access required", 403));
    }

    const targetId = req.params.id;

    if (targetId && targetId !== String(req.user.brandId)) {
      return next(throwError("Forbidden — you may only access your own brand", 403));
    }

    next();
  };
};

export default authorizeBrandAccess;
