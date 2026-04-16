import express from "express";
import LoyaltyRewardController from "../../controllers/loyalty/loyalty-reward.controller.js";

import authenticateToken from "../../middlewares/authenticate.js";
import { authenticateCustomerToken } from "../../middlewares/authenticate-customer.js";
import authorize from "../../middlewares/authorize.js";
import validate from "../../middlewares/validate.js";

import {
  createLoyaltyRewardSchema,
  updateLoyaltyRewardSchema,
  paramsLoyaltyRewardSchema,
  paramsLoyaltyRewardIdsSchema,
  queryLoyaltyRewardSchema,
} from "../../validation/loyalty/loyalty-reward.validation.js";

const router = express.Router();

/* =====================================================
   🔹 ADMIN ROUTES
===================================================== */
router.use("/admin", authenticateToken);

router
  .route("/admin")
  .post(
    authorize("loyalty.create"),
    validate(createLoyaltyRewardSchema),
    LoyaltyRewardController.create
  )
  .get(
    authorize("loyalty.view"),
    validate(queryLoyaltyRewardSchema),
    LoyaltyRewardController.getAll
  );

router
  .route("/admin/:id")
  .get(
    authorize("loyalty.view"),
    validate(paramsLoyaltyRewardSchema),
    LoyaltyRewardController.getOne
  )
  .put(
    authorize("loyalty.update"),
    validate(updateLoyaltyRewardSchema),
    LoyaltyRewardController.update
  )
  .delete(
    authorize("loyalty.delete"),
    validate(paramsLoyaltyRewardSchema),
    LoyaltyRewardController.hardDelete
  );

router.patch(
  "/admin/soft-delete/:id",
  authorize("loyalty.delete"),
  validate(paramsLoyaltyRewardSchema),
  LoyaltyRewardController.softDelete
);

router.patch(
  "/admin/restore/:id",
  authorize("loyalty.update"),
  validate(paramsLoyaltyRewardSchema),
  LoyaltyRewardController.restore
);

router.delete(
  "/admin/bulk-delete",
  authorize("loyalty.delete"),
  validate(paramsLoyaltyRewardIdsSchema),
  LoyaltyRewardController.bulkHardDelete
);

router.patch(
  "/admin/bulk-soft-delete",
  authorize("loyalty.delete"),
  validate(paramsLoyaltyRewardIdsSchema),
  LoyaltyRewardController.bulkSoftDelete
);

/* =====================================================
   🔹 CUSTOMER ROUTES
===================================================== */
router.get(
  "/active",
  authenticateCustomerToken,
  LoyaltyRewardController.getActive
);

/* =====================================================
   🔹 SYSTEM ROUTES
===================================================== */
router.post(
  "/redeem",
  authenticateToken,
  authorize("order.create"),
  LoyaltyRewardController.redeem
);

export default router;