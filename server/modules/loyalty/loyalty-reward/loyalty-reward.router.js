// routes/loyalty/loyalty-reward.routes.js

import express from "express";
import LoyaltyRewardController from "./loyalty/loyalty-reward.controller.js";

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

/* ================= ADMIN ================= */

router.use("/admin", authenticateToken);

router.route("/admin")
  .post(
    authorize("loyalty_reward_create"),
    validate(createLoyaltyRewardSchema),
    LoyaltyRewardController.create
  )
  .get(
    authorize("loyalty_reward_view"),
    validate(queryLoyaltyRewardSchema),
    LoyaltyRewardController.getAll
  );

router.route("/admin/:id")
  .get(
    authorize("loyalty_reward_view"),
    validate(paramsLoyaltyRewardSchema),
    LoyaltyRewardController.getOne
  )
  .put(
    authorize("loyalty_reward_update"),
    validate(updateLoyaltyRewardSchema),
    LoyaltyRewardController.update
  )
  .delete(
    authorize("loyalty_reward_delete"),
    validate(paramsLoyaltyRewardSchema),
    LoyaltyRewardController.hardDelete
  );

/* ================= CUSTOMER ================= */

router.use("/customer", authenticateCustomerToken);

// Active rewards
router.get(
  "/customer",
  LoyaltyRewardController.getAll
);

export default router;