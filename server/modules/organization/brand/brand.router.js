import express from "express";

import brandController from "./brand.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
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

/* CREATE + LIST */
router
  .route("/")
  .post(
    authenticateToken,
    authorize("Brands", "create"),
    validate(createBrandSchema),
    brandController.create,
  )
  .get(
    authenticateToken,
    authorize("Brands", "read"),
    validate(queryBrandSchema, "query"),
    brandController.getAll,
  );

/* SEARCH */
router.get(
  "/search",
  authenticateToken,
  authorize("Brands", "read"),
  brandController.search,
);

/* PUBLIC SLUG LOOKUP — unauthenticated, used by storefront/menu clients to
   resolve a tenant. Must be mounted before /:id so "/slug/x" doesn't get
   swallowed by the :id param route. Returns only public-safe fields — see
   brand.service.js#getPublicBySlug. */
router.get("/slug/:slug", brandController.getBySlug);

/* BULK */
router.patch(
  "/bulk/soft-delete",
  authenticateToken,
  authorize("Brands", "delete"),
  validate(paramsIdsSchema),
  brandController.bulkSoftDelete,
);

router.patch(
  "/bulk/restore",
  authenticateToken,
  authorize("Brands", "update"),
  validate(paramsIdsSchema),
  brandController.bulkRestore,
);

/* SETUP STATUS */
router.get(
  "/:id/setup",
  authenticateToken,
  authorize("Brands", "read"),
  brandController.getSetupStatus,
);

/* SUMMARY */
router.get(
  "/:id/summary",
  authenticateToken,
  authorize("Brands", "read"),
  validate(paramsBrandSchema, "params"),
  brandController.getSummary,
);

/* SINGLE */
router
  .route("/:id")
  .get(
    authenticateToken,
    authorize("Brands", "read"),
    validate(paramsBrandSchema, "params"),
    brandController.getOne,
  )
  .put(
    authenticateToken,
    authorize("Brands", "update"),
    validate(paramsBrandSchema, "params"),
    validate(updateBrandSchema),
    brandController.update,
  )
  .delete(
    // Soft delete is the default "delete" for the tenant root — see the
    // dedicated /:id/hard route for irreversible platform-admin cleanup.
    authenticateToken,
    authorize("Brands", "delete"),
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
  validate(paramsBrandSchema, "params"),
  brandController.hardDelete,
);

/* RESTORE */
router.patch(
  "/:id/restore",
  authenticateToken,
  authorize("Brands", "update"),
  validate(paramsBrandSchema, "params"),
  brandController.restore,
);

/* STATUS */
router.patch(
  "/:id/status",
  authenticateToken,
  authorize("Brands", "update"),
  validate(changeStatusSchema),
  brandController.changeStatus,
);

/* LOGO */
router.patch(
  "/:id/logo",
  authenticateToken,
  authorize("Brands", "update"),
  validate(updateLogoSchema),
  brandController.updateLogo,
);

/* SETTINGS */
router.patch(
  "/:id/settings",
  authenticateToken,
  authorize("Brands", "update"),
  validate(updateBrandSettingsSchema),
  brandController.updateSettings,
);

/* SETUP PROGRESS */
router.patch(
  "/:id/setup",
  authenticateToken,
  authorize("Brands", "update"),
  validate(setupProgressSchema),
  brandController.updateSetup,
);

/* OWNERSHIP TRANSFER */
router.patch(
  "/:id/owner",
  authenticateToken,
  authorize("Brands", "update"),
  validate(paramsBrandSchema, "params"),
  validate(transferOwnershipSchema),
  brandController.transferOwnership,
);

export default router;
