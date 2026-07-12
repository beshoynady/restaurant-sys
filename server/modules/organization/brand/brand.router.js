import express from "express";

import brandController from "./brand.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import authorizeBrandAccess from "../../../middlewares/authorizeBrandAccess.js";
import validate from "../../../middlewares/validate.js";

import {
  createBrandSchema,
  updateBrandSchema,
  paramsBrandSchema,
  queryBrandSchema,
  changeStatusSchema,
  updateLogoSchema,
  updateBrandSettingsSchema,
  setupProgressSchema,
  transferOwnershipSchema,
  paramsIdsSchema,
} from "./brand.validation.js";

const router = express.Router();

/* CREATE + LIST — platform-admin only: creating a brand or listing every
   brand on the platform is never a normal tenant Owner's job (see
   authorizeBrandAccess.js). */
router
  .route("/")
  .post(
    authenticateToken,
    authorize("Brands", "create"),
    authorizeBrandAccess({ requirePlatformAdmin: true }),
    validate(createBrandSchema),
    brandController.create,
  )
  .get(
    authenticateToken,
    authorize("Brands", "read"),
    authorizeBrandAccess({ requirePlatformAdmin: true }),
    validate(queryBrandSchema, "query"),
    brandController.getAll,
  );

/* SEARCH — platform-admin only: scans every brand on the platform by
   design (Brand is brandScoped:false), so this must never be reachable by
   a normal tenant role. */
router.get(
  "/search",
  authenticateToken,
  authorize("Brands", "read"),
  authorizeBrandAccess({ requirePlatformAdmin: true }),
  brandController.search,
);

/* PUBLIC SLUG LOOKUP — unauthenticated, used by storefront/menu clients to
   resolve a tenant. Must be mounted before /:id so "/slug/x" doesn't get
   swallowed by the :id param route. Returns only public-safe fields — see
   brand.service.js#getPublicBySlug. */
router.get("/slug/:slug", brandController.getBySlug);

/* BULK — platform-admin only: bulk-touching multiple brand ids at once has
   no legitimate "my own brand" meaning (a tenant has exactly one brand). */
router.patch(
  "/bulk/soft-delete",
  authenticateToken,
  authorize("Brands", "delete"),
  authorizeBrandAccess({ requirePlatformAdmin: true }),
  validate(paramsIdsSchema),
  brandController.bulkSoftDelete,
);

router.patch(
  "/bulk/restore",
  authenticateToken,
  authorize("Brands", "update"),
  authorizeBrandAccess({ requirePlatformAdmin: true }),
  validate(paramsIdsSchema),
  brandController.bulkRestore,
);

/* SETUP STATUS */
router.get(
  "/:id/setup",
  authenticateToken,
  authorize("Brands", "read"),
  authorizeBrandAccess(),
  brandController.getSetupStatus,
);

/* SUMMARY */
router.get(
  "/:id/summary",
  authenticateToken,
  authorize("Brands", "read"),
  authorizeBrandAccess(),
  validate(paramsBrandSchema, "params"),
  brandController.getSummary,
);

/* SINGLE — own-brand-only unless platform admin (authorizeBrandAccess). */
router
  .route("/:id")
  .get(
    authenticateToken,
    authorize("Brands", "read"),
    authorizeBrandAccess(),
    validate(paramsBrandSchema, "params"),
    brandController.getOne,
  )
  .put(
    authenticateToken,
    authorize("Brands", "update"),
    authorizeBrandAccess(),
    validate(paramsBrandSchema, "params"),
    validate(updateBrandSchema),
    brandController.update,
  )
  .delete(
    // Soft delete is the default "delete" for the tenant root — see the
    // dedicated /:id/hard route for irreversible platform-admin cleanup.
    authenticateToken,
    authorize("Brands", "delete"),
    authorizeBrandAccess(),
    validate(paramsBrandSchema, "params"),
    brandController.softDelete,
  );

/* HARD DELETE — irreversible, deliberately a separate route from the
   default DELETE above so it can't be triggered by a client that only
   intended a normal (recoverable) delete. */
router.delete(
  "/:id/hard",
  authenticateToken,
  authorize("Brands", "delete"),
  authorizeBrandAccess(),
  validate(paramsBrandSchema, "params"),
  brandController.hardDelete,
);

/* RESTORE */
router.patch(
  "/:id/restore",
  authenticateToken,
  authorize("Brands", "update"),
  authorizeBrandAccess(),
  validate(paramsBrandSchema, "params"),
  brandController.restore,
);

/* STATUS */
router.patch(
  "/:id/status",
  authenticateToken,
  authorize("Brands", "update"),
  authorizeBrandAccess(),
  validate(changeStatusSchema),
  brandController.changeStatus,
);

/* LOGO */
router.patch(
  "/:id/logo",
  authenticateToken,
  authorize("Brands", "update"),
  authorizeBrandAccess(),
  validate(updateLogoSchema),
  brandController.updateLogo,
);

/* SETTINGS */
router.patch(
  "/:id/settings",
  authenticateToken,
  authorize("Brands", "update"),
  authorizeBrandAccess(),
  validate(updateBrandSettingsSchema),
  brandController.updateSettings,
);

/* SETUP PROGRESS */
router.patch(
  "/:id/setup",
  authenticateToken,
  authorize("Brands", "update"),
  authorizeBrandAccess(),
  validate(setupProgressSchema),
  brandController.updateSetup,
);

/* OWNERSHIP TRANSFER */
router.patch(
  "/:id/owner",
  authenticateToken,
  authorize("Brands", "update"),
  authorizeBrandAccess(),
  validate(paramsBrandSchema, "params"),
  validate(transferOwnershipSchema),
  brandController.transferOwnership,
);

export default router;
